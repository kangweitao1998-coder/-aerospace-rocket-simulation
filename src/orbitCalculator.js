/**
 * 轨道计算模块 — satellite.js + 六根数
 */
import { satellite } from "satellite.js";

const EARTH_RADIUS = 6378.137; // km
const GM = 398600.4418; // km³/s²

// ─── 度/弧度转换 ───
function rad(d) { return d * Math.PI / 180; }
function deg(r) { return r * 180 / Math.PI; }

// ─── 经纬高 → ECEF (km) ───
function llaToEcef(lon, lat, altKm) {
  const r = EARTH_RADIUS + altKm;
  const clat = Math.cos(rad(lat)), slat = Math.sin(rad(lat));
  const clon = Math.cos(rad(lon)), slon = Math.sin(rad(lon));
  return [r * clat * clon, r * clat * slon, r * slat];
}

// ─── 根据六根数或 TLE 生成完整轨道（ECEF 坐标数组, 米单位） ───
export function generateOrbitPath(config) {
  let satrec;
  const { tleLine1, tleLine2 } = config;

  if (tleLine1 && tleLine2) {
    // 使用 TLE
    satrec = satellite.twoline2satrec(tleLine1, tleLine2);
  } else {
    // 使用六根数
    const {
      altitude = 400,
      eccentricity = 0,
      inclination = 43,
      raan = 0,
      argPerigee = 0,
      trueAnomaly = 0,
    } = config;
    const semiMajor = EARTH_RADIUS + altitude;
    const period = 2 * Math.PI * Math.sqrt(Math.pow(semiMajor, 3) / GM);
    const mm = (86400 / period).toFixed(8);
    const eccStr = String(Math.round(eccentricity * 1e7)).padStart(7, '0');
    const meanAnomaly = trueAnomaly; // 圆轨道时真近点角≈平近点角
    satrec = satellite.twoline2satrec(
      "1 99999U 00000A   24001.00000000  .00000000  00000-0  00000-0 0  0001",
      `2 99999 ${inclination.toFixed(4)} ${raan.toFixed(4)} ${eccStr} ${argPerigee.toFixed(4)} ${meanAnomaly.toFixed(4)} ${mm} 00001`
    );
  }

  const semiMajor = EARTH_RADIUS + (config.altitude || 400);
  const period = 2 * Math.PI * Math.sqrt(Math.pow(semiMajor, 3) / GM);

  const points = [];
  const dt = 0.5;
  for (let t = 0; t <= period; t += dt) {
    try {
      const date = new Date(Date.now() + t * 1000);
      const posVel = satellite.propagate(satrec, date);
      if (!posVel) continue;
      const posEci = posVel.position;
      // 参考 test.html：用 gstime + eciToEcf 转换为地固系
      const gmst = satellite.gstimeFromDate(date);
      const posEcf = satellite.eciToEcf(posEci, gmst);
      const x = posEcf.x * 1000, y = posEcf.y * 1000, z = posEcf.z * 1000;
      if (isNaN(x) || isNaN(y) || isNaN(z)) continue;
      points.push([x, y, z]);
    } catch (e) { continue; }
  }
  return points.filter(p => p.every(v => isFinite(v)));
}

// ─── 计算卫星轨道周期 ───
export function getOrbitPeriod(config) {
  const semiMajor = EARTH_RADIUS + (config.altitude || 400);
  return 2 * Math.PI * Math.sqrt(Math.pow(semiMajor, 3) / GM);
}

// ─── 计算入轨速度 ───
export function getOrbitalVelocity(config) {
  const r = (EARTH_RADIUS + (config.altitude || 400)) * 1000; // m
  return Math.sqrt(3.986004418e14 / r); // m/s
}

// ─── 计算发射方位角（基于轨道倾角和发射场纬度）───
function calculateLaunchAzimuth(inclinationDeg, latDeg) {
  const latRad = rad(latDeg);
  const incRad = rad(inclinationDeg);
  const sinAz = Math.cos(incRad) / Math.cos(latRad);
  if (Math.abs(sinAz) > 1) {
    // 无法从该纬度直接发射到此倾角，使用最佳逼近方位角
    return inclinationDeg > 90 ? 135 : 45;
  }
  let az = Math.asin(sinAz) * 180 / Math.PI;
  // 顺行轨道(i<90°)向东北方向发射，逆行轨道(i>90°)向东南方向发射
  if (inclinationDeg > 90) az = 180 - az;
  return az; // 从正北顺时针的度数
}

// ─── 计算入轨点：SGP4 在上升段结束时刻(t=ascentTime)的位置 ───
function findInsertionPoint(satrec, site, timeRef, ascentTime) {
  if (!satrec || satrec.error) {
    return { lon: site.lon + 15, lat: site.lat * 0.3, alt: 400000, t: ascentTime };
  }
  const baseTime = timeRef || Date.now();
  try {
    const date = new Date(baseTime + ascentTime * 1000);
    const pv = satellite.propagate(satrec, date);
    if (!pv) throw new Error('no pv');
    const gmst = satellite.gstimeFromDate(date);
    const ecf = satellite.eciToEcf(pv.position, gmst);
    const r = Math.sqrt(ecf.x * ecf.x + ecf.y * ecf.y + ecf.z * ecf.z);
    const lat = Math.asin(ecf.z / r) * 180 / Math.PI;
    const lon = Math.atan2(ecf.y, ecf.x) * 180 / Math.PI;
    const altKm = r - EARTH_RADIUS;
    return { lon, lat, alt: altKm * 1000, t: ascentTime };
  } catch (e) {
    return { lon: site.lon + 15, lat: site.lat * 0.3, alt: 400000, t: ascentTime };
  }
}

// ─── 生成从发射场到入轨的飞行轨迹 ───
// 流程：TLE/六根数 → 入轨点(终点) + 发射场(起点) → 速度积分地面轨迹 + 合理级间分离时间
export function generateLaunchTrajectory(config) {
  const site = config.launchSite || { lon: 110.95, lat: 19.61 };
  const targetAlt = (config.altitude || 400) * 1000; // m
  const orbVel = getOrbitalVelocity(config); // m/s

  // 从 TLE 或六根数提取轨道倾角，计算发射方位角
  const satrec = buildSatrec(config);
  let inclination = 43;
  if (satrec && !satrec.error) {
    inclination = satrec.inc * 180 / Math.PI;
  }
  const launchAz = calculateLaunchAzimuth(inclination, site.lat);

  // 时间缩放（基于目标轨道高度）
  const timeScale = Math.sqrt(targetAlt / 400000);

  // 高度/速度缩放因子
  const sAlt = targetAlt / 400000;
  const sVel = orbVel / 7672;

  // ── 飞行阶段时间节点 ──
  const tIgnition     = 10;
  const tVertEnd      = Math.round(60 * timeScale);
  const tBoosterSep   = Math.round(120 * timeScale);  // 助推器分离 = 重力转弯结束
  const tStage1Sep    = Math.round(160 * timeScale);   // 一级分离 = 一级推进结束（在二级点火前）
  const tFairingSep   = Math.round(190 * timeScale);   // 整流罩抛离 = 二级推进中期
  const tStage2Sep    = Math.round(220 * timeScale);   // 二级分离 = 二级推进结束（在三级点火前）
  const tOrbitInsert  = Math.round(280 * timeScale);   // 星箭分离/入轨 = 三级推进结束
  // 入轨后展示半个轨道周期，让用户能明显看到卫星在轨运动
  const orbitPeriod = (satrec && !satrec.error)
    ? Math.round(2 * Math.PI / satrec.no * 60)
    : Math.round(2 * Math.PI * Math.sqrt(Math.pow(EARTH_RADIUS + (config.altitude || 400), 3) / GM));
  const totalTime     = tOrbitInsert + Math.max(600, Math.round(orbitPeriod / 2));

  // ── 7阶段飞行剖面 ──
  // 助推器+一级: 阶段0~2 → 一级单独: 阶段3 → 二级: 阶段4 → 三级: 阶段5 → 轨道: 阶段6
  const phases = [
    { name: "点火起飞", t0: 0,            t1: tIgnition,
      alt0: 40,              alt1: 600,
      vel0: 0,               vel1: 150 * sVel,
      pitch0: 90,            pitch1: 90 },
    { name: "垂直爬升", t0: tIgnition,   t1: tVertEnd,
      alt0: 600,             alt1: 25000 * sAlt,
      vel0: 150 * sVel,      vel1: 2500 * sVel,
      pitch0: 90,            pitch1: 78 },
    { name: "重力转弯", t0: tVertEnd,    t1: tBoosterSep,
      alt0: 25000 * sAlt,    alt1: 70000 * sAlt,
      vel0: 2500 * sVel,     vel1: 4000 * sVel,
      pitch0: 78,             pitch1: 45 },
    { name: "一级推进", t0: tBoosterSep, t1: tStage1Sep,
      alt0: 70000 * sAlt,    alt1: 120000 * sAlt,
      vel0: 4000 * sVel,     vel1: 5500 * sVel,
      pitch0: 45,             pitch1: 25 },
    { name: "二级推进", t0: tStage1Sep,  t1: tStage2Sep,
      alt0: 120000 * sAlt,   alt1: 250000 * sAlt,
      vel0: 5500 * sVel,     vel1: 6800 * sVel,
      pitch0: 25,             pitch1: 10 },
    { name: "三级推进", t0: tStage2Sep,   t1: tOrbitInsert,
      alt0: 250000 * sAlt,   alt1: targetAlt,
      vel0: 6800 * sVel,     vel1: orbVel,
      pitch0: 10,             pitch1: 0 },
    { name: "轨道运行", t0: tOrbitInsert, t1: totalTime,
      alt0: targetAlt,       alt1: targetAlt,
      vel0: orbVel,          vel1: orbVel,
      pitch0: 0,              pitch1: 0 },
  ];

  // ── 计算入轨点 = SGP4 在上升段结束时刻(t=tOrbitInsert)的位置 ──
  const insertionPoint = findInsertionPoint(satrec, site, Date.now(), tOrbitInsert);
  const orbitT0 = insertionPoint.t; // = tOrbitInsert

  // ── 辅助函数 ──
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function findPhase(t) {
    for (const p of phases) {
      if (t >= p.t0 && t <= p.t1) return p;
    }
    return phases[phases.length - 1];
  }

  // ── 预计算入轨后的 SGP4 轨迹点（经纬高），用于轨道运行段 ──
  // 关键：经度连续化，防止 ±180° 跳跃导致 Cartesian3.fromDegrees 闪动
  const orbitPoints = [];
  let prevLon = null;
  let lonOffset = 0;
  if (satrec && !satrec.error) {
    const now = Date.now();
    for (let t = orbitT0; t <= orbitT0 + (totalTime - tOrbitInsert) + 10; t += 1) {
      try {
        const date = new Date(now + t * 1000);
        const pv = satellite.propagate(satrec, date);
        if (!pv) continue;
        const gmst = satellite.gstimeFromDate(date);
        const ecf = satellite.eciToEcf(pv.position, gmst);
        const r = Math.sqrt(ecf.x * ecf.x + ecf.y * ecf.y + ecf.z * ecf.z);
        const lat = Math.asin(ecf.z / r) * 180 / Math.PI;
        let lon = Math.atan2(ecf.y, ecf.x) * 180 / Math.PI;
        // 经度连续化：检测 ±180° 跳变，累加偏移
        if (prevLon !== null) {
          if (lon - prevLon > 180) lonOffset -= 360;
          else if (lon - prevLon < -180) lonOffset += 360;
        }
        lon += lonOffset;
        prevLon = lon;
        const altKm = r - EARTH_RADIUS;
        orbitPoints.push({ t: t - orbitT0, lon, lat, alt: altKm * 1000 });
      } catch (e) { continue; }
    }
  }
  // 回退：如果 SGP4 失败，用静态入轨点
  if (orbitPoints.length === 0) {
    orbitPoints.push({ t: 0, lon: insertionPoint.lon, lat: insertionPoint.lat, alt: insertionPoint.alt });
  }

  // ── 计算每个时刻的飞行参数和累积水平速度 ──
  const dt = 1;
  const stepData = [];
  let cumHorizVel = 0;
  for (let t = 0; t <= totalTime; t += dt) {
    const phase = findPhase(t);
    const frac = (t - phase.t0) / Math.max(1, phase.t1 - phase.t0);
    const vel = lerp(phase.vel0, phase.vel1, frac);
    const pitch = lerp(phase.pitch0, phase.pitch1, frac);
    const vH = vel * Math.cos(rad(pitch));
    if (t <= tOrbitInsert) {
      cumHorizVel += vH * dt;
    }
    stepData.push({ t, phase, frac, vel, pitch, vH, cumHorizVel });
  }
  const totalHorizVel = cumHorizVel;

  // ── 入轨点 = orbitPoints[0]（SGP4 在 tOrbitInsert 时刻的位置）──
  const insLon = orbitPoints[0].lon;
  const insLat = orbitPoints[0].lat;
  const insAlt = orbitPoints[0].alt;

  // ── 发射场到入轨点的经纬度差 ──
  let dLonTotal = insLon - site.lon;
  while (dLonTotal > 180) dLonTotal -= 360;
  while (dLonTotal < -180) dLonTotal += 360;
  const dLatTotal = insLat - site.lat;

  // ── 生成轨迹点 ──
  // 上升段：从发射场按水平速度积分比例插值到入轨点
  // 入轨点处最后 3 秒平滑混合到 SGP4 位置，确保无缝衔接
  // 轨道段：直接使用 SGP4 预计算位置
  const blendDur = 3;
  const points = stepData.map(sd => {
    const alt = lerp(sd.phase.alt0, sd.phase.alt1, easeInOut(sd.frac));

    let lon, lat, finalAlt;
    if (sd.t <= tOrbitInsert) {
      // 上升段
      const distFrac = totalHorizVel > 0 ? sd.cumHorizVel / totalHorizVel : 0;
      lon = site.lon + dLonTotal * distFrac;
      lat = site.lat + dLatTotal * distFrac;
      finalAlt = alt;

      // 入轨前 blendDur 秒：平滑混合到 SGP4 入轨点位置
      if (sd.t >= tOrbitInsert - blendDur) {
        const blendT = (sd.t - (tOrbitInsert - blendDur)) / blendDur; // 0→1
        const easedT = blendT < 0.5 ? 2 * blendT * blendT : 1 - Math.pow(-2 * blendT + 2, 2) / 2;
        lon = lon * (1 - easedT) + insLon * easedT;
        lat = lat * (1 - easedT) + insLat * easedT;
        finalAlt = finalAlt * (1 - easedT) + insAlt * easedT;
      }
    } else {
      // 轨道运行段：使用 SGP4 预计算点（索引直接对应）
      const orbitT = Math.round(sd.t - tOrbitInsert);
      const idx = Math.max(0, Math.min(orbitPoints.length - 1, orbitT));
      lon = orbitPoints[idx].lon;
      lat = orbitPoints[idx].lat;
      finalAlt = orbitPoints[idx].alt;
    }

    return {
      time: sd.t,
      lon,
      lat,
      alt: finalAlt,
      vel: sd.vel,
      pitch: sd.pitch,
      phaseName: sd.phase.name,
    };
  });

  // ── 级间分离事件时间 ──
  // 分离事件在阶段交界处触发，确保分离后再点火下一级
  const eventTimes = {
    boosterSep: tBoosterSep,    // 重力转弯结束 → 助推器分离
    stage1Sep:  tStage1Sep,     // 一级推进结束 → 一级分离（二级点火前）
    fairingSep: tFairingSep,    // 二级推进中期 → 整流罩抛离
    stage2Sep:  tStage2Sep,     // 二级推进结束 → 二级分离（三级点火前）
    stage3Sep:  tOrbitInsert,   // 三级推进结束 → 星箭分离/入轨
  };

  return { points, totalTime, eventTimes };
}

// ─── 生成入轨后卫星位置（用于火箭模型在轨动画）───
export function generateSatelliteOrbit(config, startTime, duration) {
  const points = [];
  const satrec = buildSatrec(config);
  if (!satrec) return points;
  for (let t = 0; t <= duration; t += 0.5) {
    try {
      const date = new Date(2024, 0, 1, 0, 0, t);
      const posVel = satellite.propagate(satrec, date);
      if (!posVel) continue;
      const gmst = satellite.gstimeFromDate(date);
      const ecf = satellite.eciToEcf(posVel.position, gmst);
      // CallbackProperty 需要地固系(ECF)坐标
      const x = ecf.x * 1000, y = ecf.y * 1000, z = ecf.z * 1000;
      if (isNaN(x) || isNaN(y) || isNaN(z)) continue;
      points.push({ time: startTime + t, x, y, z });
    } catch (e) { continue; }
  }
  return points;
}

export function buildSatrec(config) {
  const { tleLine1, tleLine2 } = config;
  if (tleLine1 && tleLine2) {
    const sr = satellite.twoline2satrec(tleLine1, tleLine2);
    if (sr && !sr.error) return sr;
  }
  const {
    altitude = 400,
    eccentricity = 0,
    inclination = 43,
    raan = 0,
    argPerigee = 0,
    trueAnomaly = 0,
  } = config;
  const semiMajor = EARTH_RADIUS + altitude;
  const period = 2 * Math.PI * Math.sqrt(Math.pow(semiMajor, 3) / GM);
  const mm = (86400 / period).toFixed(8);
  const eccStr = String(Math.round(eccentricity * 1e7)).padStart(7, '0');
  const sr = satellite.twoline2satrec(
    "1 99999U 00000A   24001.00000000  .00000000  00000-0  00000-0 0  0001",
    `2 99999 ${inclination.toFixed(4)} ${raan.toFixed(4)} ${eccStr} ${argPerigee.toFixed(4)} ${trueAnomaly.toFixed(4)} ${mm} 00001`
  );
  return sr;
}

// ─── 生成轨道实体（参考 test.html：SampledPositionProperty + path + ECI 坐标）───
export function createOrbitEntity(config, CesiumRef) {
  const satrec = buildSatrec(config || { altitude: 400, eccentricity: 0, inclination: 43, raan: 0, argPerigee: 0, trueAnomaly: 0 });
  const semiMajor = EARTH_RADIUS + ((config && config.altitude) || 400);
  const periodSec = 2 * Math.PI * Math.sqrt(Math.pow(semiMajor, 3) / GM);
  const Cesium = CesiumRef || window.Cesium;

  const now = Date.now();
  const startTime = Cesium.JulianDate.fromDate(new Date(now));
  const endTime = Cesium.JulianDate.addSeconds(startTime, periodSec, new Cesium.JulianDate());

  const positionProperty = new Cesium.SampledPositionProperty();
  // 每1秒一个采样点（密集插值）
  const totalSteps = Math.ceil(periodSec / 0.5);
  for (let i = 0; i <= totalSteps; i++) {
    const date = new Date(now + i * 0.5 * 1000);
    const pv = satellite.propagate(satrec, date);
    if (!pv) continue;
    const pos = pv.position;
    const jd = Cesium.JulianDate.fromDate(date);
    // 使用惯性系(ECI)坐标（参考 test.html 注释）
    positionProperty.addSample(jd, new Cesium.Cartesian3(pos.x * 1000, pos.y * 1000, pos.z * 1000));
  }
  positionProperty.setInterpolationOptions({
    interpolationDegree: 5,
    interpolationAlgorithm: Cesium.LagrangePolynomialApproximation,
  });

  const entity = new Cesium.Entity({
    availability: new Cesium.TimeIntervalCollection([
      new Cesium.TimeInterval({ start: startTime, stop: endTime })
    ]),
    position: positionProperty,
    path: {
      resolution: 60,
      material: new Cesium.PolylineGlowMaterialProperty({
        glowPower: 0.3,
        color: Cesium.Color.fromCssColorString("#00ff88"),
      }),
      width: 3,
      leadTime: periodSec,
      trailTime: 0,
    },
  });
  return entity;
}

// ─── 发射场坐标 ───
export function getSiteCoords(name) {
  const sites = {
    "文昌": { lon: 110.9511, lat: 19.6145 },
    "酒泉": { lon: 100.3167, lat: 40.9667 },
    "西昌": { lon: 102.0277, lat: 28.2460 },
    "太原": { lon: 111.6085, lat: 38.8483 },
    "卡纳维拉尔角": { lon: -80.5772, lat: 28.4716 },
    "拜科努尔": { lon: 63.3426, lat: 45.9646 },
  };
  return sites[name] || sites["文昌"];
}
