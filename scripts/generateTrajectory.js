/**
 * 预计算轨迹 + 事件系统（纯 Node.js，不依赖 Cesium）
 * 运行: node scripts/generateTrajectory.js
 * 输出: public/trajectory.json
 *
 * 输出结构:
 *   mainTrajectory: [{time, lon, lat, alt, vel, pitch, phaseName}]
 *   satelliteOrbit: [{time, x, y, z}]        — ECEF 坐标
 *   orbitPath: [[x,y,z], ...]                — 完整轨道环（可视化）
 *   events: [{time, type, data}]             — 按时间排序的事件列表
 *     事件类型:
 *       boosterSep   — 助推器分离，data: {fall: [{time,lon,lat,alt}]}
 *       stage1Sep    — 一级分离，data: {fall}
 *       fairingSep   — 整流罩抛离，data: {fall}
 *       stage2Sep    — 二级分离 / 卫星部署
 *       missionEnd   — 任务结束
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ─── 物理常量 ───
const EARTH_RADIUS = 6378137
const GM = 3.986004418e14
const TARGET_ORBIT_ALT = 400000
const ORBITAL_VELOCITY = Math.sqrt(GM / (EARTH_RADIUS + TARGET_ORBIT_ALT))
const LAUNCH_LON = 110.9511
const LAUNCH_LAT = 19.6145

// ─── 飞行阶段（高度边界严格连续）───
const FLIGHT_PHASES = [
  { name: '点火起飞', t0: 0,   t1: 10,  alt0: 40,     alt1: 600,     vel0: 0,    vel1: 150,              pitch0: 90, pitch1: 90 },
  { name: '垂直爬升', t0: 10,  t1: 60,  alt0: 600,    alt1: 25000,   vel0: 150,  vel1: 2500,             pitch0: 90, pitch1: 78 },
  { name: '重力转弯', t0: 60,  t1: 140, alt0: 25000,  alt1: 100000,  vel0: 2500, vel1: 5500,             pitch0: 78, pitch1: 30 },
  { name: '二级推进', t0: 140, t1: 240, alt0: 100000, alt1: 250000,  vel0: 5500, vel1: 6800,             pitch0: 30, pitch1: 10 },
  { name: '三级推进', t0: 240, t1: 280, alt0: 250000, alt1: 400000,  vel0: 6800, vel1: ORBITAL_VELOCITY, pitch0: 10, pitch1: 0  },
  { name: '轨道运行', t0: 280, t1: 560, alt0: 400000, alt1: 400000,  vel0: ORBITAL_VELOCITY, vel1: ORBITAL_VELOCITY, pitch0: 0,  pitch1: 0  },
]

// ─── 事件时间点 ───
const EVENTS = [
  { time: 100, type: 'boosterSep' },
  { time: 120, type: 'stage1Sep' },
  { time: 140, type: 'fairingSep' },
  { time: 160, type: 'stage2Sep' },
  { time: 180, type: 'stage3Sep' },
  { time: 560, type: 'missionEnd' },
]
const TOTAL_FLIGHT_TIME = 560

// ─── 辅助函数 ───
function lerp(a, b, t) { return a + (b - a) * t }
function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2 }
function toRad(deg) { return deg * Math.PI / 180 }
function toDeg(rad) { return rad * 180 / Math.PI }

function findPhase(t) {
  for (const p of FLIGHT_PHASES) {
    if (t >= p.t0 && t <= p.t1) return p
  }
  return FLIGHT_PHASES[FLIGHT_PHASES.length - 1]
}

function computeFlightParams(t) {
  const phase = findPhase(t)
  const frac = (t - phase.t0) / (phase.t1 - phase.t0)
  return {
    alt: lerp(phase.alt0, phase.alt1, easeInOut(frac)),
    vel: lerp(phase.vel0, phase.vel1, frac),
    pitch: lerp(phase.pitch0, phase.pitch1, frac),
    phaseName: phase.name,
  }
}

// ─── 生成主轨迹 ───
function generateMainTrajectory(dt = 1) {
  const points = []
  const orbitOmega = ORBITAL_VELOCITY / (EARTH_RADIUS + TARGET_ORBIT_ALT)
  let cumLon = LAUNCH_LON
  let cumLat = LAUNCH_LAT
  const stage3SepTime = EVENTS.find(e => e.type === 'stage3Sep').time

  for (let t = 0; t <= TOTAL_FLIGHT_TIME; t += dt) {
    const p = computeFlightParams(t)
    const vH = p.vel * Math.cos(toRad(p.pitch))
    const dLon = (vH * dt) / (EARTH_RADIUS * Math.cos(toRad(cumLat))) * toDeg(1)
    cumLon += dLon

    if (t > stage3SepTime) {
      const orbitT = t - stage3SepTime
      cumLat = LAUNCH_LAT * Math.cos(orbitOmega * orbitT)
    }

    points.push({ time: t, lon: cumLon, lat: cumLat, alt: p.alt, vel: p.vel, pitch: p.pitch, phaseName: p.phaseName })
  }
  return points
}

// ─── 生成坠落轨迹（保持惯性速度，缓慢减速，重力下坠）───
// 每个部件有独立的减速系数，模拟不同的气动特性
function generateFallingTrajectory(sepTime, sepLon, sepLat, sepAlt, sepVel, sepPitch, duration = 120, decelFactor = 0.985) {
  const points = []
  const dt = 0.15
  const vH0 = sepVel * Math.cos(toRad(sepPitch))
  const vV0 = sepVel * Math.sin(toRad(sepPitch))

  let lon = sepLon, lat = sepLat, alt = sepAlt
  // 分离瞬间：保持完整惯性速度，无突变
  let vH = vH0
  let vV = vV0

  for (let i = 0; i <= duration; i += dt) {
    points.push({ time: +(sepTime + i).toFixed(2), lon, lat, alt: Math.max(0, alt) })

    // 缓慢减速：前向速度持续衰减（不同部件衰减率不同）
    vH *= decelFactor

    // 重力
    vV -= 9.8 * dt

    // 大气阻力分层
    const altKm = alt / 1000
    let drag
    if (altKm < 30) drag = 0.05
    else if (altKm < 60) drag = 0.03
    else if (altKm < 120) drag = 0.015
    else if (altKm < 200) drag = 0.008
    else drag = 0.003

    vH *= (1 - drag * dt)
    vV *= (1 - drag * 0.3 * dt)

    alt += vV * dt
    lon += (vH * dt) / (EARTH_RADIUS * Math.cos(toRad(lat))) * toDeg(1)

    if (alt <= 0) break
  }
  return points
}

// ─── lonLatAlt → ECEF ───
function lonLatAltToECEF(lon, lat, alt) {
  const lonRad = toRad(lon), latRad = toRad(lat)
  const r = EARTH_RADIUS + alt
  return [
    r * Math.cos(latRad) * Math.cos(lonRad),
    r * Math.cos(latRad) * Math.sin(lonRad),
    r * Math.sin(latRad),
  ]
}

// ─── 向量运算 ───
function vecNormalize(v) {
  const len = Math.sqrt(v[0]**2 + v[1]**2 + v[2]**2) || 1
  return [v[0]/len, v[1]/len, v[2]/len]
}
function vecCross(a, b) {
  return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]
}

// ─── 计算卫星轨道 ECEF ───
function computeOrbitECEF(deployLon, deployLat, deployAlt, duration) {
  const orbitRadius = EARTH_RADIUS + TARGET_ORBIT_ALT
  const omega = ORBITAL_VELOCITY / orbitRadius
  const deployPos = lonLatAltToECEF(deployLon, deployLat, deployAlt)
  const radial = vecNormalize(deployPos)
  const p0 = [radial[0]*orbitRadius, radial[1]*orbitRadius, radial[2]*orbitRadius]
  const lonRad = toRad(deployLon)
  const east = [-Math.sin(lonRad), Math.cos(lonRad), 0]
  const n = vecNormalize(vecCross(p0, east))
  const dotNP = n[0]*p0[0] + n[1]*p0[1] + n[2]*p0[2]

  function rotate(theta) {
    const c = Math.cos(theta), s = Math.sin(theta)
    const crossNV = vecCross(n, p0)
    return [
      p0[0]*c + crossNV[0]*s + n[0]*dotNP*(1-c),
      p0[1]*c + crossNV[1]*s + n[1]*dotNP*(1-c),
      p0[2]*c + crossNV[2]*s + n[2]*dotNP*(1-c),
    ]
  }

  const stage3SepTime = EVENTS.find(e => e.type === 'stage3Sep').time
  const positions = []
  for (let i = 0; i <= duration; i++) {
    const [x, y, z] = rotate(omega * i)
    positions.push({ time: stage3SepTime + i, x, y, z })
  }

  const period = 2 * Math.PI / omega
  const fullPath = []
  for (let i = 0; i <= period; i += 5) {
    fullPath.push(rotate(omega * i))
  }

  return { positions, fullPath }
}

// ─── 构建事件列表（携带坠落轨迹数据）───
function buildEvents(mainTraj) {
  const events = []

  for (const ev of EVENTS) {
    const pt = mainTraj.find(p => Math.abs(p.time - ev.time) <= 1)
    if (!pt) continue

    const eventData = { time: ev.time, type: ev.type }

    if (ev.type === 'boosterSep') {
      eventData.data = { fall: generateFallingTrajectory(ev.time, pt.lon, pt.lat, pt.alt, pt.vel, pt.pitch, 100, 0.978) }
    } else if (ev.type === 'stage1Sep') {
      eventData.data = { fall: generateFallingTrajectory(ev.time, pt.lon, pt.lat, pt.alt, pt.vel, pt.pitch, 130, 0.985) }
    } else if (ev.type === 'fairingSep') {
      eventData.data = { fall: generateFallingTrajectory(ev.time, pt.lon, pt.lat, pt.alt, pt.vel, pt.pitch, 130, 0.97) }
    } else if (ev.type === 'stage2Sep') {
      eventData.data = { fall: generateFallingTrajectory(ev.time, pt.lon, pt.lat, pt.alt, pt.vel, pt.pitch, 150, 0.985) }
    } else if (ev.type === 'stage3Sep') {
      eventData.data = { fall: generateFallingTrajectory(ev.time, pt.lon, pt.lat, pt.alt, pt.vel, pt.pitch, 150, 0.985) }
    }

    events.push(eventData)
  }

  return events
}

// ─── 主函数 ───
function main() {
  console.log('正在预计算轨迹与事件...')

  const mainTraj = generateMainTrajectory(1)
  console.log(`  主轨迹: ${mainTraj.length} 点`)

  const events = buildEvents(mainTraj)
  events.forEach(e => {
    const fallCount = e.data?.fall?.length ?? 0
    console.log(`  事件 T+${e.time} ${e.type} (坠落轨迹 ${fallCount} 点)`)
  })

  const stage3Sep = EVENTS.find(e => e.type === 'stage3Sep')
  const sepPt3 = mainTraj.find(p => Math.abs(p.time - stage3Sep.time) <= 1)
  const orbitDuration = TOTAL_FLIGHT_TIME - stage3Sep.time
  const { positions: satOrbit, fullPath: orbitPath } = computeOrbitECEF(sepPt3.lon, sepPt3.lat, sepPt3.alt, orbitDuration)
  console.log(`  卫星轨道: ${satOrbit.length} 点`)
  console.log(`  轨道路径: ${orbitPath.length} 点`)

  const data = {
    config: {
      launchLon: LAUNCH_LON,
      launchLat: LAUNCH_LAT,
      totalFlightTime: TOTAL_FLIGHT_TIME,
    },
    mainTrajectory: mainTraj,
    events,
    satelliteOrbit: satOrbit,
    orbitPath,
  }

  const outPath = path.resolve(__dirname, '../public/trajectory.json')
  fs.writeFileSync(outPath, JSON.stringify(data))
  const sizeKB = (fs.statSync(outPath).size / 1024).toFixed(1)
  console.log(`\n已生成: ${outPath} (${sizeKB} KB)`)
}

main()
