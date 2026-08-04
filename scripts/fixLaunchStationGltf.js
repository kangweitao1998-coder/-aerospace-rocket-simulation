import fs from 'node:fs'
import path from 'node:path'

const directory = path.resolve('public/models/slauch_tation')
const inputPath = path.join(directory, 'lauch_station.gltf')
const outputPath = path.join(directory, 'lauch_station_cesium.gltf')
const gltf = JSON.parse(fs.readFileSync(inputPath, 'utf8'))

// 1. Fix materials: set metallicFactor to 0, ensure baseColorFactor exists when no texture
for (const material of gltf.materials || []) {
  const pbr = material.pbrMetallicRoughness
  if (!pbr) continue

  // metallicFactor defaults to 1.0 in glTF spec; without IBL, metallic surfaces appear black
  if (pbr.metallicFactor === undefined) {
    pbr.metallicFactor = 0.0
  }

  // If no texture and no baseColorFactor, set a visible default
  if (!pbr.baseColorTexture && !pbr.baseColorFactor) {
    pbr.baseColorFactor = [0.8, 0.8, 0.8, 1]
  }
}

// 2. Add a default material for primitives that have none
const defaultMaterialIndex = gltf.materials?.length || 0
if (!gltf.materials) gltf.materials = []
gltf.materials.push({
  name: 'Cesium_Default',
  pbrMetallicRoughness: {
    baseColorFactor: [0.8, 0.8, 0.8, 1],
    metallicFactor: 0.0,
    roughnessFactor: 0.7
  }
})

// 3. Assign the default material to primitives missing one
let fixedNoMaterial = 0
for (const mesh of gltf.meshes || []) {
  for (const primitive of mesh.primitives || []) {
    if (primitive.material === undefined) {
      primitive.material = defaultMaterialIndex
      fixedNoMaterial++
    }
  }
}

// 4. Handle primitives with textured materials but no TEXCOORD_0 (original fix script logic)
function removeTextureSlots(value) {
  if (!value || typeof value !== 'object') return
  for (const key of Object.keys(value)) {
    if (/texture$/i.test(key)) delete value[key]
    else removeTextureSlots(value[key])
  }
}

const materialCache = new Map()
let repairedCount = 0

for (const mesh of gltf.meshes || []) {
  for (const primitive of mesh.primitives || []) {
    if (primitive.material === undefined) continue
    const material = gltf.materials?.[primitive.material]
    const usesTexture = JSON.stringify(material).includes('Texture')
    if (!usesTexture || primitive.attributes?.TEXCOORD_0 !== undefined) continue

    if (!materialCache.has(primitive.material)) {
      const compatibleMaterial = structuredClone(material)
      compatibleMaterial.name = `${material.name || 'Material'}_Cesium_NoUV`
      removeTextureSlots(compatibleMaterial)
      if (!compatibleMaterial.pbrMetallicRoughness.baseColorFactor) {
        compatibleMaterial.pbrMetallicRoughness.baseColorFactor = [0.8, 0.8, 0.8, 1]
      }
      materialCache.set(primitive.material, gltf.materials.push(compatibleMaterial) - 1)
    }
    primitive.material = materialCache.get(primitive.material)
    repairedCount += 1
  }
}

fs.writeFileSync(outputPath, JSON.stringify(gltf))
console.log(`Fixed ${fixedNoMaterial} primitives with no material`)
console.log(`Repaired ${repairedCount} primitives with texture-but-no-TEXCOORD_0`)
console.log(`Output: ${outputPath}`)
