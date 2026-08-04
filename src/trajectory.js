/**
 * 航天任务模拟器 - 轨迹计算模块
 * 基于简化物理模型生成发射轨迹
 */

// 物理常量
export const EARTH_RADIUS = 6378137; // WGS84 赤道半径 (m)
export const GM = 3.986004418e14; // 地球引力常数 (m³/s²)
export const TARGET_ORBIT_ALT = 400000; // 目标轨道高度 400km
export const ORBITAL_VELOCITY = Math.sqrt(
  GM / (EARTH_RADIUS + TARGET_ORBIT_ALT),
); // ≈7672 m/s

// 酒泉卫星发射中心
export const LAUNCH_LON = 100.2917;
export const LAUNCH_LAT = 40.9583;

// 飞行阶段定义
export const FLIGHT_PHASES = [
  {
    name: "点火起飞",
    t0: 0,
    t1: 10,
    alt0: 3,
    alt1: 600,
    vel0: 0,
    vel1: 150,
    pitch0: 90,
    pitch1: 90,
  },
  {
    name: "垂直爬升",
    t0: 10,
    t1: 60,
    alt0: 600,
    alt1: 25000,
    vel0: 150,
    vel1: 2500,
    pitch0: 90,
    pitch1: 78,
  },
  {
    name: "重力转弯",
    t0: 60,
    t1: 140,
    alt0: 25000,
    alt1: 100000,
    vel0: 2500,
    vel1: 5500,
    pitch0: 78,
    pitch1: 30,
  },
  {
    name: "二级推进",
    t0: 140,
    t1: 240,
    alt0: 100000,
    alt1: 250000,
    vel0: 5500,
    vel1: 6800,
    pitch0: 30,
    pitch1: 10,
  },
  {
    name: "三级推进",
    t0: 240,
    t1: 280,
    alt0: 250000,
    alt1: 400000,
    vel0: 6800,
    vel1: ORBITAL_VELOCITY,
    pitch0: 10,
    pitch1: 0,
  },
  {
    name: "轨道运行",
    t0: 280,
    t1: 560,
    alt0: 400000,
    alt1: 400000,
    vel0: ORBITAL_VELOCITY,
    vel1: ORBITAL_VELOCITY,
    pitch0: 0,
    pitch1: 0,
  },
];

// 级间分离时间点（秒）
export const BOOSTER_SEP_TIME = 100; // 助推器分离
export const STAGE1_SEP_TIME = 140; // 一级分离
export const FAIRING_JETTISON_TIME = 200; // 整流罩抛离
export const STAGE2_SEP_TIME = 240; // 二级分离
export const STAGE3_SEP_TIME = 280; // 三级分离 / 卫星部署
export const TOTAL_FLIGHT_TIME = 560; // 总飞行时间

// --- 辅助函数 ---
function lerp(a, b, t) {
  return a + (b - a) * t;
}
function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
function toRad(deg) {
  return (deg * Math.PI) / 180;
}
function toDeg(rad) {
  return (rad * 180) / Math.PI;
}

function findPhase(t) {
  for (const p of FLIGHT_PHASES) {
    if (t >= p.t0 && t <= p.t1) return p;
  }
  return FLIGHT_PHASES[FLIGHT_PHASES.length - 1];
}

function computeFlightParams(t) {
  const phase = findPhase(t);
  const frac = (t - phase.t0) / (phase.t1 - phase.t0);
  return {
    alt: lerp(phase.alt0, phase.alt1, easeInOut(frac)),
    vel: lerp(phase.vel0, phase.vel1, frac),
    pitch: lerp(phase.pitch0, phase.pitch1, frac),
    phaseName: phase.name,
  };
}

/**
 * 生成主轨迹（火箭飞行 + 卫星入轨）
 * @param {number} dt 时间步长（秒），默认1秒
 * @returns {Array<{time, lon, lat, alt, vel, pitch, phaseName}>}
 */
export function generateTrajectory(dt = 1) {
  const points = [];
  const orbitOmega = ORBITAL_VELOCITY / (EARTH_RADIUS + TARGET_ORBIT_ALT);

  let cumLon = LAUNCH_LON;
  let cumLat = LAUNCH_LAT;

  for (let t = 0; t <= TOTAL_FLIGHT_TIME; t += dt) {
    const p = computeFlightParams(t);

    // 累计经度变化（基于水平速度分量）
    const vH = p.vel * Math.cos(toRad(p.pitch));
    const dLon =
      ((vH * dt) / (EARTH_RADIUS * Math.cos(toRad(cumLat)))) * toDeg(1);
    cumLon += dLon;

    // 轨道阶段纬度振荡（轨道倾角效应）
    if (t > STAGE3_SEP_TIME) {
      const orbitT = t - STAGE3_SEP_TIME;
      cumLat = LAUNCH_LAT * Math.cos(orbitOmega * orbitT);
    }

    points.push({
      time: t,
      lon: cumLon,
      lat: cumLat,
      alt: p.alt,
      vel: p.vel,
      pitch: p.pitch,
      phaseName: p.phaseName,
    });
  }
  return points;
}

/**
 * 生成分离后的火箭坠落轨迹
 * @param {number} sepTime  分离时刻
 * @param {number} sepLon   分离经度
 * @param {number} sepLat   分离纬度
 * @param {number} sepAlt   分离高度
 * @param {number} sepVel   分离时速度
 * @param {number} sepPitch 分离时俯仰角
 * @param {number} duration 坠落持续时间（秒）
 * @returns {Array<{time, lon, lat, alt}>}
 */
export function generateFallingTrajectory(
  sepTime,
  sepLon,
  sepLat,
  sepAlt,
  sepVel,
  sepPitch,
  duration = 120,
) {
  const points = [];
  const dt = 1;
  const vH0 = sepVel * Math.cos(toRad(sepPitch));
  const vV0 = sepVel * Math.sin(toRad(sepPitch));

  let lon = sepLon;
  let lat = sepLat;
  let alt = sepAlt;
  let vH = vH0;
  let vV = vV0;

  for (let i = 0; i <= duration; i += dt) {
    points.push({ time: sepTime + i, lon, lat, alt: Math.max(0, alt) });

    vV -= 9.8 * dt; // 重力减速
    vH *= 0.99; // 大气阻力
    alt += vV * dt;
    const dLon = ((vH * dt) / (EARTH_RADIUS * Math.cos(toRad(lat)))) * toDeg(1);
    lon += dLon;

    if (alt <= 0) break;
  }
  return points;
}
