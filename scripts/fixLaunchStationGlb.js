import fs from 'node:fs'
import path from 'node:path'

const inputPath = path.resolve('public/models/lauch_station.glb')
const outputPath = path.resolve('public/models/lauch_station_cesium.glb')
const source = fs.readFileSync(inputPath)

if (source.toString('ascii', 0, 4) !== 'glTF') {
  throw new Error('Input file is not a binary glTF')
}

const jsonLength = source.readUInt32LE(12)
const jsonType = source.readUInt32LE(16)
const json = JSON.parse(source.subarray(20, 20 + jsonLength).toString('utf8'))
const remainingChunks = source.subarray(20 + jsonLength)

// 1. Fix materials: set metallicFactor to 0, ensure baseColorFactor exists when no texture
for (const material of json.materials || []) {
  const pbr = material.pbrMetallicRoughness
  if (!pbr) continue
  if (pbr.metallicFactor === undefined) {
    pbr.metallicFactor = 0.0
  }
  if (!pbr.baseColorTexture && !pbr.baseColorFactor) {
    pbr.baseColorFactor = [0.8, 0.8, 0.8, 1]
  }
}

// 2. Add a default material for primitives that have none
const defaultMaterialIndex = json.materials?.length || 0
if (!json.materials) json.materials = []
json.materials.push({
  name: 'Cesium_Default',
  pbrMetallicRoughness: {
    baseColorFactor: [0.8, 0.8, 0.8, 1],
    metallicFactor: 0.0,
    roughnessFactor: 0.7
  }
})

let fixedNoMaterial = 0
for (const mesh of json.meshes || []) {
  for (const primitive of mesh.primitives || []) {
    if (primitive.material === undefined) {
      primitive.material = defaultMaterialIndex
      fixedNoMaterial++
    }
  }
}

// 3. Handle primitives with textured materials but no TEXCOORD_0
function removeTextureSlots(value) {
  if (!value || typeof value !== 'object') return
  for (const key of Object.keys(value)) {
    if (/texture$/i.test(key)) delete value[key]
    else removeTextureSlots(value[key])
  }
}

const materialCache = new Map()
let repairedCount = 0

for (const mesh of json.meshes || []) {
  for (const primitive of mesh.primitives || []) {
    if (primitive.material === undefined) continue
    const material = json.materials?.[primitive.material]
    const usesTexture = JSON.stringify(material).includes('Texture')
    const hasTexCoord0 = primitive.attributes?.TEXCOORD_0 !== undefined
    if (!usesTexture || hasTexCoord0) continue

    if (!materialCache.has(primitive.material)) {
      const compatibleMaterial = structuredClone(material)
      compatibleMaterial.name = `${material.name || 'Material'}_Cesium_NoUV`
      removeTextureSlots(compatibleMaterial)
      if (!compatibleMaterial.pbrMetallicRoughness.baseColorFactor) {
        compatibleMaterial.pbrMetallicRoughness.baseColorFactor = [0.8, 0.8, 0.8, 1]
      }
      materialCache.set(primitive.material, json.materials.push(compatibleMaterial) - 1)
    }
    primitive.material = materialCache.get(primitive.material)
    repairedCount++
  }
}

console.log(`Fixed ${fixedNoMaterial} primitives with no material`)
console.log(`Repaired ${repairedCount} primitives with texture-but-no-TEXCOORD_0`)

const jsonPayload = Buffer.from(JSON.stringify(json), 'utf8')
const paddedLength = Math.ceil(jsonPayload.length / 4) * 4
const paddedJson = Buffer.alloc(paddedLength, 0x20)
jsonPayload.copy(paddedJson)

const header = Buffer.alloc(12)
header.write('glTF', 0, 'ascii')
header.writeUInt32LE(source.readUInt32LE(4), 4)
header.writeUInt32LE(12 + 8 + paddedJson.length + remainingChunks.length, 8)

const jsonHeader = Buffer.alloc(8)
jsonHeader.writeUInt32LE(paddedJson.length, 0)
jsonHeader.writeUInt32LE(jsonType, 4)

fs.writeFileSync(outputPath, Buffer.concat([header, jsonHeader, paddedJson, remainingChunks]))
console.log(`Output: ${outputPath}`)
