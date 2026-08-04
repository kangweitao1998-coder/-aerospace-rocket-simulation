<template>
  <div class="app">
    <div id="cesiumContainer"></div>

    <!-- 加载�?-->
    <div v-if="!initialized" class="loading">
      <div class="loading-spinner"></div>
      <div class="loading-text">正在加载场景资源...</div>
    </div>

    <!-- UI 覆盖�?-->
    <div v-if="initialized" class="overlay">
      <!-- 顶部标题�?-->
      <div class="top-bar">
        <div class="top-bar-left">
          <span
            class="status-dot"
            :class="{ active: simState.isRunning }"
          ></span>
          <span class="status-text">{{
            simState.isRunning ? "任务进行�? : "待命"
          }}</span>
        </div>
        <div class="top-bar-center">
          <span class="mission-title">航天发射任务控制中心</span>
        </div>
        <div class="top-bar-right">
          <button class="btn-config" @click="showConfig = !showConfig" title="系统配置">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="2.5" width="13" height="11" rx="1.5" stroke="currentColor" stroke-width="1.2"/><line x1="1.5" y1="5.5" x2="14.5" y2="5.5" stroke="currentColor" stroke-width="1"/><circle cx="5" cy="8" r="1.2" fill="currentColor"/><circle cx="9" cy="8" r="1.2" fill="currentColor"/><circle cx="13" cy="8" r="1.2" fill="currentColor"/></svg> 系统配置
          </button>
          <span class="fps-text">{{ fpsCounter }} FPS</span>
          <span class="time-text"
            >T+{{ formatTime(simState.currentTime) }}</span
          >
        </div>
      </div>

      <!-- 配置面板 -->
      <div v-if="showConfig" class="config-overlay" @click.self="showConfig = false">
        <div class="config-panel">
          <div class="config-header">
            <span class="config-title">🛰 轨道配置</span>
            <button class="config-close" @click="showConfig = false">�?/button>
          </div>
          <div class="config-body">
            <!-- 发射场选择 -->
            <div class="config-section">
              <div class="config-label">发射�?/div>
              <select v-model="orbitConfig.launchSite" class="config-select">
                <option v-for="s in launchSites" :key="s.name" :value="s.name">{{ s.name }}</option>
              </select>
            </div>
            <!-- TLE 两行输入 -->
            <div class="config-section">
              <div class="config-label">TLE 两行轨道参数</div>
              <textarea v-model="tleLine1" class="config-tle-input" placeholder="1 25544U 98067A   19156.50900463  .00003075  00000-0  59442-4 0  9992" rows="2"></textarea>
              <textarea v-model="tleLine2" class="config-tle-input" placeholder="2 25544  51.6433  59.2583 0008217  16.4489 347.6017 15.51174618173442" rows="2"></textarea>
            </div>
            <button class="btn-apply" @click="applyOrbitConfig">应用配置</button>
          </div>
        </div>
      </div>

      <!-- 左侧遥测面板 -->
      <div class="panel panel-left-top">
        <div class="panel-header">
          <span class="panel-icon"><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/></svg></span>
          <span class="panel-title">飞行遥测</span>
        </div>
        <div class="panel-body">
          <div class="data-row">
            <span class="data-label">阶段</span>
            <span class="data-value phase-tag">{{ simState.phaseName }}</span>
          </div>
          <div class="data-row">
            <span class="data-label">高度</span>
            <span class="data-value"
              >{{ (simState.altitude / 1000).toFixed(2) }}
              <span class="unit">km</span></span
            >
          </div>
          <div class="data-row">
            <span class="data-label">速度</span>
            <span class="data-value"
              >{{ (simState.velocity / 1000).toFixed(3) }}
              <span class="unit">km/s</span></span
            >
          </div>
          <div class="data-row">
            <span class="data-label">俯仰�?/span>
            <span class="data-value">{{ simState.pitch.toFixed(1) }}°</span>
          </div>
          <div class="data-row" v-if="simState.periapsis > 0">
            <span class="data-label">近地�?/span>
            <span class="data-value"
              >{{ simState.periapsis }} <span class="unit">km</span></span
            >
          </div>
          <div class="data-row" v-if="simState.apoapsis > 0">
            <span class="data-label">远地�?/span>
            <span class="data-value"
              >{{ simState.apoapsis }} <span class="unit">km</span></span
            >
          </div>
        </div>
      </div>

      <!-- 左侧火箭状态面�?-->
      <div class="panel panel-left-bottom">
        <div class="panel-header">
          <span class="panel-icon"><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 1.5 L6.5 6 L6.5 10 L8 14.5 L9.5 10 L9.5 6 Z" stroke="currentColor" stroke-width="1.2"/><rect x="7" y="10" width="2" height="2.5" rx="0.5" fill="currentColor" opacity="0.5"/></svg></span>
          <span class="panel-title">火箭状�?/span>
        </div>
        <div class="panel-body">
          <div class="stage-item" :class="stageClass('booster')">
            <span class="stage-icon"><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 1.5 L6.5 6 L6.5 10 L8 14.5 L9.5 10 L9.5 6 Z" stroke="currentColor" stroke-width="1.2"/><rect x="7" y="10" width="2" height="2.5" rx="0.5" fill="currentColor" opacity="0.5"/></svg></span>
            <span class="stage-name">助推�?/span>
            <span class="stage-status">{{ stageStatus("booster") }}</span>
          </div>
          <div class="stage-item" :class="stageClass('stage1')">
            <span class="stage-icon stage-icon-num">1</span>
            <span class="stage-name">一级火�?/span>
            <span class="stage-status">{{ stageStatus("stage1") }}</span>
          </div>
          <div class="stage-item" :class="stageClass('fairing')">
            <span class="stage-icon"><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 1.5 L2.5 4 L2.5 9 C2.5 12 5 14 8 15 C11 14 13 12 13 9 L13 4 Z" stroke="currentColor" stroke-width="1.2"/></svg></span>
            <span class="stage-name">整流�?/span>
            <span class="stage-status">{{ stageStatus("fairing") }}</span>
          </div>
          <div class="stage-item" :class="stageClass('stage2')">
            <span class="stage-icon stage-icon-num">2</span>
            <span class="stage-name">二级火箭</span>
            <span class="stage-status">{{ stageStatus("stage2") }}</span>
          </div>
          <div class="stage-item" :class="stageClass('stage3')">
            <span class="stage-icon stage-icon-num">3</span>
            <span class="stage-name">三级火箭</span>
            <span class="stage-status">{{ stageStatus("stage3") }}</span>
          </div>
          <div class="stage-item" :class="stageClass('sat')">
            <span class="stage-icon"><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.2"/><line x1="5.5" y1="2" x2="5.5" y2="14" stroke="currentColor" stroke-width="0.8" opacity="0.4"/><line x1="10.5" y1="2" x2="10.5" y2="14" stroke="currentColor" stroke-width="0.8" opacity="0.4"/></svg></span>
            <span class="stage-name">卫星载荷</span>
            <span class="stage-status">{{ stageStatus("sat") }}</span>
          </div>
        </div>
      </div>

      <!-- 右侧相机面板 -->
      <div class="panel panel-right-top">
        <div class="panel-header">
          <span class="panel-icon"><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="4" width="13" height="9" rx="2" stroke="currentColor" stroke-width="1.2"/><circle cx="8" cy="8.5" r="3" stroke="currentColor" stroke-width="1.2"/><circle cx="8" cy="8.5" r="1" fill="currentColor"/></svg></span>
          <span class="panel-title">相机视角</span>
        </div>
        <div class="panel-body">
          <div class="cam-row">
            <span class="cam-label">前后</span>
            <input
              type="range"
              min="-500"
              max="500"
              step="5"
              v-model.number="camParams.x"
              @input="updateViewFrom"
            />
            <span class="cam-value">{{ camParams.x }}</span>
          </div>
          <div class="cam-row">
            <span class="cam-label">左右</span>
            <input
              type="range"
              min="-500"
              max="500"
              step="5"
              v-model.number="camParams.y"
              @input="updateViewFrom"
            />
            <span class="cam-value">{{ camParams.y }}</span>
          </div>
          <div class="cam-row">
            <span class="cam-label">上下</span>
            <input
              type="range"
              min="-500"
              max="500"
              step="5"
              v-model.number="camParams.z"
              @input="updateViewFrom"
            />
            <span class="cam-value">{{ camParams.z }}</span>
          </div>
        </div>
      </div>

      <!-- 右侧轨道参数面板 -->
      <div class="panel panel-right-mid">
        <div class="panel-header">
          <span class="panel-icon"><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><ellipse cx="8" cy="8" rx="6.5" ry="3.5" stroke="currentColor" stroke-width="1.2" transform="rotate(-20,8,8)"/><circle cx="10" cy="5.7" r="1.8" stroke="currentColor" stroke-width="1" fill="none"/></svg></span>
          <span class="panel-title">轨道参数</span>
        </div>
        <div class="panel-body">
          <div class="data-row" v-if="simState.periapsis > 0">
            <span class="data-label">近地�?/span>
            <span class="data-value">{{ simState.periapsis }} <span class="unit">km</span></span>
          </div>
          <div class="data-row" v-if="simState.apoapsis > 0">
            <span class="data-label">远地�?/span>
            <span class="data-value">{{ simState.apoapsis }} <span class="unit">km</span></span>
          </div>
          <div class="data-row" v-if="simState.periapsis > 0">
            <span class="data-label">类型</span>
            <span class="data-value phase-tag">{{ orbitType }}</span>
          </div>
          <div class="data-row" v-if="simState.satDeployed">
            <span class="data-label">状�?/span>
            <span class="data-value" style="color:#00ff88">在轨运行</span>
          </div>
          <div class="data-row" v-if="simState.periapsis <= 0">
            <span class="data-label">提示</span>
            <span class="data-value" style="color:#4a6a8a;font-size:11px">入轨后显�?/span>
          </div>
        </div>
      </div>

      <!-- 右侧遥测图表面板 -->
      <div class="panel panel-right-bottom">
        <div class="panel-header">
          <span class="panel-icon"><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><polyline points="2,13 6,8 10,5 14,2" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="6" cy="8" r="1.2" fill="currentColor"/><circle cx="10" cy="5" r="1.2" fill="currentColor"/></svg></span>
          <span class="panel-title">飞行曲线</span>
        </div>
        <div class="panel-body chart-panel-body">
          <TelemetryChart
            ref="chartCompRef"
            :trajectory="trajectory"
            :total-time="rocketGroups.totalFlightTime || 560"
            :current-time="simState.currentTime"
          />
        </div>
      </div>

      <div class="bottom-bar">
        <button
          class="btn btn-launch"
          @click="startLaunch"
          :disabled="simState.isRunning || simState.finished"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" class="btn-icon"><path d="M8 14 C8 14 3.5 10 3.5 7 C3.5 4 5.5 2 8 0.5 C10.5 2 12.5 4 12.5 7 C12.5 10 8 14 8 14 Z" fill="currentColor"/><path d="M8 11 C8 11 6 9 6 7.5 C6 6 7 5 8 4 C9 5 10 6 10 7.5 C10 9 8 11 8 11 Z" fill="#ffcc00" opacity="0.6"/></svg> 点火发射
        </button>
        <button
          class="btn btn-reset"
          @click="resetSimulation"
          :disabled="simState.isRunning && !simState.finished"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" class="btn-icon"><path d="M2.5 8 C2.5 4.5 5 2.5 8 2.5 C11 2.5 13.5 4.5 13.5 8 C13.5 11 11 13.5 8 13.5" stroke="currentColor" stroke-width="1.3"/><polyline points="6.5,13 8,10 11,10" stroke="currentColor" stroke-width="1.3"/></svg> 重置
        </button>
        <button
          class="btn btn-track"
          :class="{ active: trackingEnabled }"
          @click="toggleTracking"
          :disabled="!simState.hasStarted"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" class="btn-icon"><circle cx="8" cy="8" r="5.5" stroke="currentColor" stroke-width="1.2" fill="none"/><circle cx="8" cy="8" r="2" fill="currentColor" opacity="0.6"/></svg> 跟踪
        </button>
        <div class="speed-control">
          <button
            class="btn-ctrl"
            :class="{ active: simState.isRunning && simState.playDirection === -1 }"
            @click="playBackward"
            :disabled="!simState.hasStarted"
            title="后退播放"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" class="btn-ctrl-icon"><polygon points="13,2 3,8 13,14" fill="currentColor"/></svg>
          </button>
          <button
            class="btn-ctrl"
            @click="togglePlay"
            :disabled="!simState.hasStarted"
            :title="simState.isRunning ? '暂停' : '播放'"
          >
            <svg v-if="simState.isRunning" width="14" height="14" viewBox="0 0 16 16" class="btn-ctrl-icon"><rect x="3" y="2" width="3.5" height="12" rx="1" fill="currentColor"/><rect x="9.5" y="2" width="3.5" height="12" rx="1" fill="currentColor"/></svg>
            <svg v-else width="14" height="14" viewBox="0 0 16 16" class="btn-ctrl-icon"><rect x="3" y="2" width="3.5" height="12" rx="1" fill="currentColor"/><rect x="9.5" y="2" width="3.5" height="12" rx="1" fill="currentColor"/></svg>
          </button>
          <button
            class="btn-ctrl"
            :class="{ active: simState.isRunning && simState.playDirection === 1 }"
            @click="playForward"
            :disabled="!simState.hasStarted"
            title="前进播放"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" class="btn-ctrl-icon"><polygon points="3,2 13,8 3,14" fill="currentColor"/></svg>
          </button>
          <span class="speed-label">倍�?/span>
          <button
            v-for="s in [1, 2, 5, 10]"
            :key="s"
            @click="setSpeed(s)"
            :class="['btn-speed', { active: simState.multiplier === s }]"
          >
            {{ s }}x
          </button>
        </div>
      </div>

      <!-- Toast 消息容器 -->
      <div class="toast-container">
        <TransitionGroup name="toast">
          <div
            v-for="msg in messages"
            :key="msg.id"
            :class="['toast-msg', msg.type]"
          >
            <span class="toast-icon">
              <svg v-if="msg.icon === 'rocket'" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1.5 L6.5 6 L6.5 10 L8 14.5 L9.5 10 L9.5 6 Z" stroke="currentColor" stroke-width="1.2"/><rect x="7" y="10" width="2" height="2.5" rx="0.5" fill="currentColor" opacity="0.5"/></svg>
              <svg v-else-if="msg.icon === 'shield'" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1.5 L2.5 4 L2.5 9 C2.5 12 5 14 8 15 C11 14 13 12 13 9 L13 4 Z" stroke="currentColor" stroke-width="1.2"/></svg>
              <svg v-else-if="msg.icon === 'satellite'" width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.2"/><line x1="5.5" y1="2" x2="5.5" y2="14" stroke="currentColor" stroke-width="0.8" opacity="0.4"/><line x1="10.5" y1="2" x2="10.5" y2="14" stroke="currentColor" stroke-width="0.8" opacity="0.4"/></svg>
              <svg v-else-if="msg.icon === 'signal'" width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/></svg>
            </span>
            <span class="toast-text">{{ msg.text }}</span>
          </div>
        </TransitionGroup>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from "vue";
import { createRocketOrientationProperty } from "../rocketModelGLB.js";
import { satellite } from "satellite.js";
import GPUParticlePrimitive from "../GPUParticles.js";
import TelemetryChart from "../components/TelemetryChart.vue";
import { generateOrbitPath, generateLaunchTrajectory, buildSatrec, getSiteCoords } from "../orbitCalculator.js";

const Cesium = window.Cesium;

// --- 响应式状�?---
const initialized = ref(false);
const simState = reactive({
  isRunning: false,
  finished: false,
  missionSuccess: false,
  missionFailed: false,
  currentTime: 0,
  altitude: 0,
  velocity: 0,
  pitch: 90,
  phaseName: "待命",
  multiplier: 1,
  playDirection: 1, // 1 = 前进, -1 = 后退
  hasStarted: false,
  stage1Active: false,
  stage1Separated: false,
  fairingJettisoned: false,
  stage2Active: false,
  stage2Separated: false,
  stage3Active: false,
  stage3Separated: false,
  satDeployed: false,
  boosterSeparated: false,
  periapsis: 0,
  apoapsis: 0,
});

// ── FPS 计数�?──
const fpsCounter = ref(0);
let _fpsFrames = 0;
let _fpsLastTime = performance.now();
function updateFPS() {
  _fpsFrames++;
  const now = performance.now();
  if (now - _fpsLastTime >= 1000) {
    fpsCounter.value = _fpsFrames;
    _fpsFrames = 0;
    _fpsLastTime = now;
  }
  requestAnimationFrame(updateFPS);
}
requestAnimationFrame(updateFPS);

const camParams = reactive({ x: 0, y: -120, z: 0 });
const trackingEnabled = ref(false);

// ── 轨道配置 ──
const showConfig = ref(false);
const launchSites = [
  { name: "文昌", lon: 110.95, lat: 19.61 },
  { name: "酒泉", lon: 100.28, lat: 40.96 },
  { name: "西昌", lon: 102.03, lat: 28.25 },
  { name: "太原", lon: 111.61, lat: 38.85 },
  { name: "卡纳维拉尔角", lon: -80.58, lat: 28.47 },
  { name: "拜科努尔", lon: 63.34, lat: 45.96 },
];
const tleLine1 = ref("1 25544U 98067A   19156.50900463  .00003075  00000-0  59442-4 0  9992");
const tleLine2 = ref("2 25544  51.6433  59.2583 0008217  16.4489 347.6017 15.51174618173442");

const orbitConfig = reactive({
  launchSite: "文昌",
  altitude: 400,
  eccentricity: 0,
  inclination: 43,
  raan: 0,
  argPerigee: 0,
  trueAnomaly: 0,
  tleLine1: "1 25544U 98067A   19156.50900463  .00003075  00000-0  59442-4 0  9992",
  tleLine2: "2 25544  51.6433  59.2583 0008217  16.4489 347.6017 15.51174618173442",
});

function applyOrbitConfig() {
  showConfig.value = false;
  orbitConfig.tleLine1 = tleLine1.value;
  orbitConfig.tleLine2 = tleLine2.value;
  resetSimulation();
  reloadTrajectory();
}

function reloadTrajectory() {
  let targetAlt = orbitConfig.altitude || 400;
  if (orbitConfig.tleLine1 && orbitConfig.tleLine2) {
    try {
      const testSr = satellite.twoline2satrec(orbitConfig.tleLine1, orbitConfig.tleLine2);
      if (!testSr.error) targetAlt = Math.round(testSr.a * 6378.137 - 6378.137);
    } catch(e) {}
  }
  const site = getSiteCoords(orbitConfig.launchSite);
  const config = { ...orbitConfig, altitude: targetAlt, launchSite: site };
  const { points, totalTime, eventTimes } = generateLaunchTrajectory(config);
  trajectory = points;
  rocketGroups.eventTimes = eventTimes;
  rocketGroups.totalFlightTime = totalTime;

  // 更新时钟
  if (viewer) {
    clockStart = Cesium.JulianDate.now();
    viewer.clock.startTime = clockStart.clone();
    viewer.clock.stopTime = Cesium.JulianDate.addSeconds(clockStart, totalTime, new Cesium.JulianDate());
    viewer.clock.currentTime = clockStart.clone();
  }

  // 重建火箭位置属�?  rebuildRocketPositions();

  // 重建轨道�?  if (rocketGroups.orbitEntities) {
    rocketGroups.orbitEntities.forEach((e) => viewer.entities.remove(e));
  }
  const orbitPtsRaw = generateOrbitPath(orbitConfig);
  if (orbitPtsRaw.length > 1) {
    const pts = orbitPtsRaw.map((p) => new Cesium.Cartesian3(p[0], p[1], p[2]));
    const newOrbitEntity = viewer.entities.add({
      polyline: { positions: pts, width: 3, material: Cesium.Color.fromCssColorString("#00ff88").withAlpha(0.9) },
    });
    rocketGroups.orbitEntities = [newOrbitEntity];
  }

  // 更新粒子发射位置到新发射�?  const siteMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(
    Cesium.Cartesian3.fromDegrees(site.lon, site.lat, 35)
  );
  [flameParticles1, flameParticles2, flameParticles3, smokeParticles].forEach((p) => {
    if (p) p.modelMatrix = siteMatrix;
  });
  boosterFlameParticles.forEach((p) => { if (p) p.modelMatrix = siteMatrix; });

  // 更新相机到新发射�?  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(site.lon, site.lat - 0.001, 40),
    orientation: { heading: 0, pitch: Cesium.Math.toRadians(-10), roll: 0 },
  });
}

function rebuildRocketPositions() {
  const et = rocketGroups.eventTimes;
  const interpOpts = {
    interpolationDegree: 1,
    interpolationAlgorithm: Cesium.LinearApproximation,
  };

  // 统一位置属性：trajectory 已包含全段（上升�?+ SGP4 轨道段）
  const mainPos = new Cesium.SampledPositionProperty();
  trajectory.forEach((pt) => {
    if (isFinite(pt.lon) && isFinite(pt.lat) && isFinite(pt.alt)) {
      const time = Cesium.JulianDate.addSeconds(clockStart, pt.time, new Cesium.JulianDate());
      mainPos.addSample(time, Cesium.Cartesian3.fromDegrees(pt.lon, pt.lat, pt.alt));
    }
  });
  mainPos.setInterpolationOptions(interpOpts);

  // satOrbitPos 备用
  const satOrbitPos = new Cesium.SampledPositionProperty();
  const sr = buildSatrec(orbitConfig);
  if (sr && !sr.error) {
    const tIns = et.stage3Sep || 280;
    const period = 2 * Math.PI / sr.no * 60;
    for (let t = 0; t <= period; t += 1) {
      const elapsedFromStart = tIns + t;
      const jd = Cesium.JulianDate.addSeconds(clockStart, elapsedFromStart, new Cesium.JulianDate());
      const date = Cesium.JulianDate.toDate(jd);
      const pv = satellite.propagate(sr, date);
      if (!pv) continue;
      const gmst = satellite.gstimeFromDate(date);
      const ecf = satellite.eciToEcf(pv.position, gmst);
      satOrbitPos.addSample(jd, new Cesium.Cartesian3(ecf.x * 1000, ecf.y * 1000, ecf.z * 1000));
    }
  }
  satOrbitPos.setInterpolationOptions(interpOpts);

  const fallbackPos = Cesium.Cartesian3.fromDegrees(getSiteCoords(orbitConfig.launchSite).lon, getSiteCoords(orbitConfig.launchSite).lat, 40);

  const rocketPosition = new Cesium.CallbackProperty((time) => {
    return mainPos.getValue(time) || fallbackPos;
  }, false);

  if (rocketGroups.rocketEntity) {
    rocketGroups.rocketEntity.position = rocketPosition;
    const newOrientation = createRocketOrientationProperty(
      new Cesium.CallbackProperty((time) => {
        return mainPos.getValue(time);
      }, false),
    );
    rocketGroups.rocketEntity.orientation = newOrientation;
    rocketGroups.rocketOrientation = newOrientation;
  }

  rocketGroups.mainPos = mainPos;
  rocketGroups.satOrbitPos = satOrbitPos;

  viewer.scene.requestRender();
}

// ── 图表组件引用 ──
const chartCompRef = ref(null);

// ── Toast 消息系统 ──
const messages = ref([]);
let _msgId = 0;
function pushMessage(icon, text, type = "info") {
  const id = ++_msgId;
  messages.value.push({ id, icon, text, type });
  if (messages.value.length > 3) messages.value.shift();
  setTimeout(() => {
    const idx = messages.value.findIndex((m) => m.id === id);
    if (idx > -1) messages.value.splice(idx, 1);
  }, 4000);
}
function updateViewFrom() {
  if (rocketGroups.trackPoint) {
    rocketGroups.trackPoint.viewFrom = new Cesium.Cartesian3(
      camParams.x,
      camParams.y,
      camParams.z,
    );
    if (viewer && viewer.trackedEntity) {
      const ent = viewer.trackedEntity;
      viewer.trackedEntity = undefined;
      viewer.trackedEntity = ent;
    }
  }
}

// --- Cesium 变量 ---
let viewer = null;
let clockStart = null;
let trajectory = [];
let precomputedData = null;
let rocketGroups = {};
let flameParticles1 = null;
let flameParticles2 = null;
let flameParticles3 = null;
let boosterFlameParticles = [];
let smokeParticles = null;
let tickHandler = null;
let preRenderHandler = null;

// GLB 火箭模型
let rocketModelObj = null;
let _animIndexMap = null;
let _modelReady = false;

// 部件→节点名称前缀映射
const COMPONENT_NODES = {
  stage1: ["S1_", "S1S2_", "Stage1"],
  stage2: ["S2_", "S2S3_", "Stage2"],
  stage3: ["S3_", "Stage3"],
  booster_f: ["BF_", "Booster_F"],
  booster_r: ["BR_", "Booster_R"],
  booster_a: ["BA_", "Booster_A"],
  booster_l: ["BL_", "Booster_L"],
  fairing_l: ["Fairing_L", "Fairing_L_Parent"],
  fairing_r: ["Fairing_R", "Fairing_R_Parent"],
  satellite: ["Sat_", "Satellite"],
};

// 事件→动画名映射
const SEPARATION_ANIM_MAP = {
  boosterSep: [
    "Booster_F_Separation",
    "Booster_R_Separation",
    "Booster_A_Separation",
    "Booster_L_Separation",
  ],
  stage1Sep: ["Stage1_Ascend_and_Separation"],
  fairingSep: ["Fairing_L_Jettison", "Fairing_R_Jettison"],
  stage2Sep: ["Stage2_Ascend_and_Separation"],
  stage3Sep: ["Stage3_Final_Burn_and_Separation"],
  panelDeploy: [
    "SolarArray_L_Boom_Extend",
    "SolarArray_R_Boom_Extend",
    "SolarArray_L_Panel0_FanDeploy",
    "SolarArray_L_Panel1_FanDeploy",
    "SolarArray_L_Panel2_FanDeploy",
    "SolarArray_R_Panel0_FanDeploy",
    "SolarArray_R_Panel1_FanDeploy",
    "SolarArray_R_Panel2_FanDeploy",
  ],
};

const _triggeredAnims = new Set();
const _pendingAnims = []; // 模型未就绪时排队等待的动�?const SEPARATION_ANIM_DURATION = 9; // 动画�?70�?�?9�?
function fillPositionSamples(posProp, points, startT = 0, endT = 99999) {
  points.forEach((pt) => {
    if (pt.time >= startT && pt.time <= endT) {
      const time = Cesium.JulianDate.addSeconds(
        clockStart,
        pt.time,
        new Cesium.JulianDate(),
      );
      posProp.addSample(
        time,
        Cesium.Cartesian3.fromDegrees(pt.lon, pt.lat, pt.alt),
      );
    }
  });
}

function createPitchGetter(maxTime) {
  return (time) => {
    const elapsed = Cesium.JulianDate.secondsDifference(time, clockStart);
    if (elapsed > maxTime) return undefined;
    const pt = trajectory.find(
      (p) => Math.abs(p.time - Math.round(elapsed)) <= 1,
    );
    return pt?.pitch;
  };
}

async function createRocketAssembly() {
  const interpOpts = {
    interpolationDegree: 1,
    interpolationAlgorithm: Cesium.LinearApproximation,
  };

  const et = rocketGroups.eventTimes;
  const site = getSiteCoords(orbitConfig.launchSite);
  const fallbackPos = Cesium.Cartesian3.fromDegrees(site.lon, site.lat, 40);

  // ── 统一位置属性：trajectory 已包含全段（上升�?+ SGP4 轨道段）──
  // 不需要两�?Property 混合，直接用一�?SampledPositionProperty
  const mainPos = new Cesium.SampledPositionProperty();
  trajectory.forEach((pt) => {
    if (isFinite(pt.lon) && isFinite(pt.lat) && isFinite(pt.alt)) {
      const time = Cesium.JulianDate.addSeconds(clockStart, pt.time, new Cesium.JulianDate());
      mainPos.addSample(time, Cesium.Cartesian3.fromDegrees(pt.lon, pt.lat, pt.alt));
    }
  });
  mainPos.setInterpolationOptions(interpOpts);

  // satOrbitPos 备用（入轨后 ECF 精确位置�?  const satOrbitPos = new Cesium.SampledPositionProperty();
  const satrec = buildSatrec(orbitConfig);
  if (satrec && !satrec.error) {
    const tIns = et.stage3Sep || 280;
    const period = 2 * Math.PI / satrec.no * 60;
    for (let t = 0; t <= period; t += 1) {
      const elapsedFromStart = tIns + t;
      const jd = Cesium.JulianDate.addSeconds(clockStart, elapsedFromStart, new Cesium.JulianDate());
      const date = Cesium.JulianDate.toDate(jd);
      const pv = satellite.propagate(satrec, date);
      if (!pv) continue;
      const gmst = satellite.gstimeFromDate(date);
      const ecf = satellite.eciToEcf(pv.position, gmst);
      satOrbitPos.addSample(jd, new Cesium.Cartesian3(ecf.x * 1000, ecf.y * 1000, ecf.z * 1000));
    }
  }
  satOrbitPos.setInterpolationOptions(interpOpts);

  // ── 位置：直接用 mainPos（全段统一）──
  const rocketPosition = new Cesium.CallbackProperty((time) => {
    return mainPos.getValue(time) || fallbackPos;
  }, false);

  // ── 朝向属�?──
  const rocketOrientation = createRocketOrientationProperty(
    new Cesium.CallbackProperty((time) => {
      return mainPos.getValue(time);
    }, false),
  );

  // ── 单个 entity：point（不�?model，model �?primitive）──
  rocketGroups.rocketEntity = viewer.entities.add({
    position: rocketPosition,
    orientation: rocketOrientation,
    viewFrom: new Cesium.Cartesian3(camParams.x, camParams.y, camParams.z),
    point: {
      pixelSize: 6,
      color: Cesium.Color.fromCssColorString("#00ff88").withAlpha(0.95),
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 1,
      scaleByDistance: new Cesium.NearFarScalar(3000, 0.3, 500000, 1.0),
      distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, Number.MAX_VALUE),
    },
  });

  // ── Model �?primitive 加载 ──
  const modelReady = new Promise((resolve) => {
    Cesium.Model.fromGltfAsync({
      url: "./models/rocket_model.glb",
      modelMatrix: Cesium.Matrix4.IDENTITY.clone(),
      scale: 1.0,
      show: true,
      forwardAxis: Cesium.Axis.Y,
    })
      .then((model) => {
        rocketModelObj = model;
        viewer.scene.primitives.add(model);
        console.log("[Rocket] Model loaded");

        // fromGltfAsync resolve 时模型已就绪，直接初始化动画映射
        const setupAnims = () => {
          // 尝试从模型动态获取动画列表（更可靠）
          const animList = model.animations || [];
          console.log("[Rocket] Animations available:", animList.length,
            animList.map((a, i) => `[${i}] ${a.name}`).join(", "));

          _animIndexMap = {};
          // 优先用模型自带的动画名→索引映射
          for (let i = 0; i < animList.length; i++) {
            _animIndexMap[animList[i].name] = i;
          }

          // 如果动态映射为空，回退到硬编码
          if (Object.keys(_animIndexMap).length === 0) {
            console.warn("[Rocket] No animations found in model, using hardcoded map");
            _animIndexMap = {
              Stage1_Ascend_and_Separation: 0,
              Stage2_Ascend_and_Separation: 1,
              Stage3_Final_Burn_and_Separation: 2,
              Booster_F_Separation: 3,
              Booster_R_Separation: 4,
              Booster_A_Separation: 5,
              Booster_L_Separation: 6,
              Fairing_L_Jettison: 7,
              Fairing_R_Jettison: 8,
              Satellite_Orbit_Attitude: 9,
              SolarArray_L_Boom_Extend: 10,
              SolarArray_R_Boom_Extend: 11,
              SolarArray_L_Panel0_FanDeploy: 12,
              SolarArray_L_Panel1_FanDeploy: 13,
              SolarArray_L_Panel2_FanDeploy: 14,
              SolarArray_R_Panel0_FanDeploy: 15,
              SolarArray_R_Panel1_FanDeploy: 16,
              SolarArray_R_Panel2_FanDeploy: 17,
            };
          }
          _modelReady = true;
          console.log("[Rocket] Animations mapped:", Object.keys(_animIndexMap).length);

          // 回放排队等待的动�?          while (_pendingAnims.length > 0) {
            const pending = _pendingAnims.shift();
            console.log("[Rocket] Playing queued anim:", pending.animNames.join(","));
            playAnimAtTime(pending.animNames, pending.startTime);
          }

          resolve();
        };

        // fromGltfAsync �?Promise resolve 时模型应该已就绪
        // 但保险起见，检�?model.ready 并处�?readyEvent
        if (model.ready) {
          setupAnims();
        } else {
          // 模型尚未就绪，等�?readyEvent
          const handler = model.readyEvent.addEventListener(() => {
            model.readyEvent.removeEventListener(handler);
            setupAnims();
          });
        }
      })
      .catch((err) => {
        console.error("[Rocket] Model load error:", err);
        resolve(); // 即使失败也继�?      });
  });

  rocketGroups._modelReady = modelReady;

  rocketGroups.mainPos = mainPos;
  rocketGroups.satOrbitPos = satOrbitPos;
  rocketGroups.rocketOrientation = rocketOrientation;
  rocketGroups.trackPoint = rocketGroups.rocketEntity;
}

function createGPUParticles() {
  const launchSite = getSiteCoords(orbitConfig.launchSite);
  // 喷管底部位置（卫星载荷中心在 Z=0，火箭向下延伸）
  const exhaust1Z = -37.725;
  const exhaust2Z = -14.775;
  const exhaust3Z = -5.775;
  const boosterExhaustZ = -36.825;
  const boosterR = 2.2;

  flameParticles1 = new GPUParticlePrimitive({
    particleCount: 2000,
    emitterPosition: [0, 0, exhaust1Z],
    emitterRadius: 2.5,
    direction: [0, 0, -1],
    speed: 70,
    speedVariance: 25,
    spreadAngle: 6,
    minLife: 0.25,
    maxLife: 0.7,
    minSize: 3,
    maxSize: 10,
    sizeGrowth: 2.5,
    startColor: [1.0, 1.0, 0.95],
    mid1Color: [1.0, 0.85, 0.3],
    mid2Color: [1.0, 0.4, 0.05],
    endColor: [0.3, 0.05, 0.0],
    gravity: [0, 0, 0],
    drag: 1.8,
    turbulence: 0.15,
    additive: true,
    show: false,
  });
  flameParticles2 = new GPUParticlePrimitive({
    particleCount: 1200,
    emitterPosition: [0, 0, exhaust2Z],
    emitterRadius: 1.5,
    direction: [0, 0, -1],
    speed: 50,
    speedVariance: 18,
    spreadAngle: 6,
    minLife: 0.2,
    maxLife: 0.5,
    minSize: 2.5,
    maxSize: 8,
    sizeGrowth: 2.5,
    startColor: [1.0, 1.0, 0.95],
    mid1Color: [1.0, 0.8, 0.3],
    mid2Color: [0.95, 0.35, 0.05],
    endColor: [0.25, 0.05, 0.0],
    gravity: [0, 0, 0],
    drag: 1.8,
    turbulence: 0.12,
    additive: true,
    show: false,
  });
  flameParticles3 = new GPUParticlePrimitive({
    particleCount: 800,
    emitterPosition: [0, 0, exhaust3Z],
    emitterRadius: 1.0,
    direction: [0, 0, -1],
    speed: 40,
    speedVariance: 15,
    spreadAngle: 6,
    minLife: 0.2,
    maxLife: 0.4,
    minSize: 2,
    maxSize: 6,
    sizeGrowth: 2.5,
    startColor: [1.0, 1.0, 0.95],
    mid1Color: [1.0, 0.8, 0.3],
    mid2Color: [0.95, 0.35, 0.05],
    endColor: [0.25, 0.05, 0.0],
    gravity: [0, 0, 0],
    drag: 1.8,
    turbulence: 0.12,
    additive: true,
    show: false,
  });
  smokeParticles = new GPUParticlePrimitive({
    particleCount: 800,
    emitterPosition: [0, 0, -20],
    emitterRadius: 60,
    direction: [0, -1, 0],
    speed: 40,
    speedVariance: 15,
    spreadAngle: 360,
    minLife: 0.5,
    maxLife: 1.5,
    minSize: 10,
    maxSize: 28,
    sizeGrowth: 10.0,
    startColor: [1.0, 1.0, 1.0],
    mid1Color: [0.98, 0.98, 0.98],
    mid2Color: [0.92, 0.92, 0.94],
    endColor: [0.85, 0.85, 0.88],
    gravity: [0, 0, 3.0],
    drag: 0.6,
    turbulence: 0.3,
    additive: true,
    smokeMode: true,
    show: false,
    modelMatrix: Cesium.Transforms.eastNorthUpToFixedFrame(
      Cesium.Cartesian3.fromDegrees(launchSite.lon, launchSite.lat, 35),
    ),
  });
  viewer.scene.primitives.add(flameParticles1);
  viewer.scene.primitives.add(flameParticles2);
  viewer.scene.primitives.add(flameParticles3);
  viewer.scene.primitives.add(smokeParticles);

  boosterFlameParticles = [];
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    const sideX = Math.cos(angle) * boosterR;
    const sideY = Math.sin(angle) * boosterR;
    const particles = new GPUParticlePrimitive({
      particleCount: 800,
      emitterPosition: [sideX, sideY, boosterExhaustZ],
      emitterRadius: 1.2,
      direction: [0, 0, -1],
      speed: 60,
      speedVariance: 20,
      spreadAngle: 6,
      minLife: 0.2,
      maxLife: 0.5,
      minSize: 2,
      maxSize: 7,
      sizeGrowth: 2.5,
      startColor: [1.0, 1.0, 0.95],
      mid1Color: [1.0, 0.8, 0.3],
      mid2Color: [0.95, 0.35, 0.05],
      endColor: [0.25, 0.05, 0.0],
      gravity: [0, 0, 0],
      drag: 1.8,
      turbulence: 0.12,
      additive: true,
      show: false,
    });
    viewer.scene.primitives.add(particles);
    boosterFlameParticles.push(particles);
  }
}

async function initViewer() {
  Cesium.Ion.defaultAccessToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJhMmM4NmI5Ny05YjBhLTQxMWItOTUxMS04M2M5ZjkxZWU3N2MiLCJpZCI6MTkxNTg0LCJzdWIiOiJrYW5nd2VpdGFvIiwiaXNzIjoiaHR0cHM6Ly9hcGkuY2VzaXVtLmNvbSIsImF1ZCI6IlVudGl0bGVkIiwiaWF0IjoxNzgzNTYwNzM1fQ.-OXlagy019nDeftM3SBWSq9Tse3I9V8Yc9KqCVOBiBc";

  viewer = new Cesium.Viewer("cesiumContainer", {
    timeline: true,
    animation: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    fullscreenButton: false,
    baseLayerPicker: false,
  });

  viewer._cesiumWidget._creditContainer.style.display = "none";
  viewer.scene.globe.depthTestAgainstTerrain = true;
  viewer.scene.postProcessStages.fxaa.enabled = true;
  viewer.resolutionScale = window.devicePixelRatio;
  viewer.scene.globe.enableLighting = true;
  viewer.scene.sun.glowFactor = 10;
  viewer.scene.terrainProvider = new Cesium.EllipsoidTerrainProvider();
  viewer.scene.globe.showGroundAtmosphere = true;
  viewer.scene.skyAtmosphere.show = true;
  viewer.scene.backgroundColor = Cesium.Color.BLACK;
  viewer.scene.skyBox.show = false;

  // �?TLE 提取轨道高度
  let targetAlt = orbitConfig.altitude || 400;
  if (orbitConfig.tleLine1 && orbitConfig.tleLine2) {
    try {
      const testSr = satellite.twoline2satrec(orbitConfig.tleLine1, orbitConfig.tleLine2);
      if (!testSr.error) {
        const aKm = testSr.a * 6378.137; // a 是地球半径的倍数
        targetAlt = Math.round(aKm - 6378.137);
      }
    } catch(e) {}
  }

  const site = getSiteCoords(orbitConfig.launchSite);
  const trajResult = generateLaunchTrajectory({ ...orbitConfig, altitude: targetAlt, launchSite: site });
  trajectory = trajResult.points;
  precomputedData = { config: { totalFlightTime: trajResult.totalTime } };

  const eventTimes = trajResult.eventTimes || {};
  if (!eventTimes.stage3Sep) {
    eventTimes.stage3Sep = eventTimes.stage2Sep || 280;
    eventTimes.stage2Sep = 240;
  }

  const TOTAL_FLIGHT_TIME = trajResult.totalTime || 560;
  rocketGroups.eventTimes = eventTimes;
  rocketGroups.totalFlightTime = TOTAL_FLIGHT_TIME;

  clockStart = Cesium.JulianDate.now();
  viewer.clock.startTime = clockStart.clone();
  viewer.clock.stopTime = Cesium.JulianDate.addSeconds(
    clockStart,
    TOTAL_FLIGHT_TIME,
    new Cesium.JulianDate(),
  );
  viewer.clock.currentTime = clockStart.clone();
  viewer.clock.clockRange = Cesium.ClockRange.CLAMPED;
  viewer.clock.multiplier = 1;
  viewer.clock.shouldAnimate = false;

  await createRocketAssembly();
  createGPUParticles();

  tickHandler = viewer.clock.onTick.addEventListener(onClockTick);
  preRenderHandler = viewer.scene.preRender.addEventListener(onPreRender);

  // 初始不跟踪，从远处俯瞰发射场
  const initSite = getSiteCoords(orbitConfig.launchSite);
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(initSite.lon, initSite.lat - 0.001, 40),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-10),
      roll: 0,
    },
  });

  // ── 绘制卫星轨道线（ECF 坐标，polyline）───
  let orbitPathData = [];
  try { orbitPathData = generateOrbitPath(orbitConfig); } catch (e) { console.warn(e); }
  orbitPathData = orbitPathData.filter(p => p.every(v => isFinite(v)));
  if (orbitPathData.length > 1) {
    const orbitPts = orbitPathData.map((pt) => new Cesium.Cartesian3(pt[0], pt[1], pt[2]));
    const orbitEntity = viewer.entities.add({
      polyline: {
        positions: orbitPts,
        width: 3,
        material: Cesium.Color.fromCssColorString("#00ff88").withAlpha(0.9),
      },
    });
    rocketGroups.orbitEntities = [orbitEntity];
  }

  // 等待模型加载完成后再展示界面，确保分离动画可�?  if (rocketGroups._modelReady) await rocketGroups._modelReady;
  initialized.value = true;
}

// ── 部件显隐控制 ──
function hideComponent(compName) {
  const model = rocketModelObj;
  if (!model) return;
  _applyNodeVisibility(model, COMPONENT_NODES[compName] || [], false);
}

function showComponent(compName) {
  const model = rocketModelObj;
  if (!model) return;
  _applyNodeVisibility(model, COMPONENT_NODES[compName] || [], true);
}

function _applyNodeVisibility(model, prefixes, visible) {
  const matchName = (name) =>
    prefixes.some((p) => name.startsWith(p) || name === p);
  const allNodes = model.nodes || (model.scene && model.scene.nodes) || [];
  const traverse = (nodes) => {
    for (const node of nodes) {
      const name = node.name || "";
      if (matchName(name)) {
        node.show = visible;
        if (node.children) {
          const applyChildren = (children) => {
            for (const child of children) {
              child.show = visible;
              if (child.children) applyChildren(child.children);
            }
          };
          applyChildren(node.children);
        }
      }
      if (node.children && node.children.length > 0) {
        traverse(node.children);
      }
    }
  };
  traverse(allNodes);
}

// ── 分离事件：播�?GLB 动画 + 延迟隐藏 ──
function playAnimAtTime(animNames, startTime) {
  if (!rocketModelObj || !rocketModelObj.activeAnimations || !_animIndexMap) {
    console.warn("[Rocket] Cannot play anim, model/animMap not ready");
    return;
  }
  for (const name of animNames) {
    const idx = _animIndexMap[name];
    if (idx === undefined) {
      console.warn(`[Rocket] Animation not found: ${name}`);
      continue;
    }
    rocketModelObj.activeAnimations.add({
      index: idx,
      loop: Cesium.ModelAnimationLoop.NONE,
      multiplier: 1.0,
      start: startTime,
    });
    console.log(`[Rocket] Playing: ${name} (idx=${idx})`);
  }
}

function triggerSeparation(eventType, componentsToHide) {
  if (_triggeredAnims.has(eventType)) return;
  _triggeredAnims.add(eventType);

  const animNames = SEPARATION_ANIM_MAP[eventType] || [];
  const startTime = viewer.clock.currentTime.clone();

  if (!_modelReady) {
    // 模型未就绪，排队等待
    console.log("[Rocket] Model not ready, queuing anim:", eventType);
    _pendingAnims.push({ animNames, startTime });
  } else {
    playAnimAtTime(animNames, startTime);
  }

  const multiplier = viewer.clock.multiplier || 1;
  const waitMs = (SEPARATION_ANIM_DURATION / multiplier) * 1000;
  setTimeout(() => {
    componentsToHide.forEach((c) => hideComponent(c));
  }, waitMs);
}

function triggerPanelDeploy() {
  if (_triggeredAnims.has("panelDeploy")) return;
  _triggeredAnims.add("panelDeploy");
  const startTime = viewer.clock.currentTime.clone();
  if (!_modelReady) {
    _pendingAnims.push({ animNames: SEPARATION_ANIM_MAP.panelDeploy, startTime });
  } else {
    playAnimAtTime(SEPARATION_ANIM_MAP.panelDeploy, startTime);
  }
}

const GM_EARTH = 3.986004418e14;
const EARTH_RADIUS = 6378137;

function computeOrbitParams(alt, vel) {
  const r = EARTH_RADIUS + alt;
  const v = vel;
  const energy = (v * v) / 2 - GM_EARTH / r;
  const a = -GM_EARTH / (2 * energy);
  const h = r * v;
  const e = Math.sqrt(
    Math.max(0, 1 + (2 * energy * h * h) / (GM_EARTH * GM_EARTH)),
  );
  const pe = a * (1 - e) - EARTH_RADIUS;
  const ap = a * (1 + e) - EARTH_RADIUS;
  return { pe: Math.round(pe / 1000), ap: Math.round(ap / 1000) };
}

function onClockTick(clock) {
  const et = rocketGroups.eventTimes;
  const TOTAL = rocketGroups.totalFlightTime;
  const elapsed = Cesium.JulianDate.secondsDifference(
    clock.currentTime,
    clockStart,
  );
  simState.currentTime = Math.max(0, Math.min(elapsed, TOTAL));
  const pt = trajectory.find(
    (p) => Math.abs(p.time - Math.floor(simState.currentTime)) <= 1,
  );
  if (pt) {
    simState.altitude = pt.alt;
    simState.velocity = pt.vel;
    simState.pitch = pt.pitch;
    simState.phaseName = pt.phaseName;
  }

  const t = simState.currentTime;

  // ── 事件驱动分离逻辑 ──
  if (t >= et.boosterSep && !simState.boosterSeparated) {
    triggerSeparation("boosterSep", [
      "booster_f",
      "booster_r",
      "booster_a",
      "booster_l",
    ]);
    simState.boosterSeparated = true;
    // pushMessage("rocket", "助推器分离完�?, "separation");
  } else if (t < et.boosterSep && simState.boosterSeparated) {
    showComponent("booster_f");
    showComponent("booster_r");
    showComponent("booster_a");
    showComponent("booster_l");
    simState.boosterSeparated = false;
  }
  const stage1SepDelayed = et.stage1Sep + 9;
  if (t >= stage1SepDelayed && !simState.stage1Separated) {
    triggerSeparation("stage1Sep", ["stage1"]);
    simState.stage1Separated = true;
    simState.stage1Active = false;
    // pushMessage("rocket", "一级火箭分离完�?, "separation");
  } else if (t < stage1SepDelayed && simState.stage1Separated) {
    showComponent("stage1");
    simState.stage1Separated = false;
    simState.stage1Active = true;
  }
  const fairingSepDelayed = et.fairingSep + 9;
  if (t >= fairingSepDelayed && !simState.fairingJettisoned) {
    triggerSeparation("fairingSep", ["fairing_l", "fairing_r"]);
    simState.fairingJettisoned = true;
    // pushMessage("shield", "整流罩抛离完�?, "fairing");
  } else if (t < fairingSepDelayed && simState.fairingJettisoned) {
    showComponent("fairing_l");
    showComponent("fairing_r");
    simState.fairingJettisoned = false;
  }
  if (t >= et.stage2Sep && !simState.stage2Separated) {
    triggerSeparation("stage2Sep", ["stage2"]);
    simState.stage2Separated = true;
    simState.stage2Active = false;
    // pushMessage("rocket", "二级火箭分离完成", "separation");
  } else if (t < et.stage2Sep && simState.stage2Separated) {
    showComponent("stage2");
    simState.stage2Separated = false;
    simState.stage2Active = true;
  }
  const stage3SepDelayed = (et.stage3Sep || 280) + 9;
  if (t >= stage3SepDelayed && !simState.stage3Separated) {
    triggerSeparation("stage3Sep", ["stage3"]);
    simState.stage3Separated = true;
    simState.stage3Active = false;
    // pushMessage("rocket", "三级火箭分离完成", "separation");
  } else if (t < stage3SepDelayed && simState.stage3Separated) {
    showComponent("stage3");
    simState.stage3Separated = false;
    simState.stage3Active = true;
  }

  // ── 火箭工作状�?& 火焰 ──
  const stage2SepDelayed = et.stage2Sep + 9;
  const boosterActive = !simState.boosterSeparated;
  const stage1Active = !simState.stage1Separated;
  const stage2Active =
    !simState.stage2Separated &&
    t >= stage1SepDelayed + 5 &&
    t < stage2SepDelayed;
  const stage3Active = !simState.stage3Separated && t >= stage2SepDelayed + 5;

  simState.stage1Active = stage1Active;
  simState.stage2Active = stage2Active;
  simState.stage3Active = stage3Active;

  if (boosterActive) {
    boosterFlameParticles.forEach((fp) => {
      fp.show = simState.isRunning;
      fp.time = elapsed;
    });
  } else {
    boosterFlameParticles.forEach((fp) => (fp.show = false));
  }

  if (stage1Active) {
    flameParticles1.show = simState.isRunning;
    flameParticles2.show = false;
    flameParticles3.show = false;
    smokeParticles.show = simState.isRunning;
  } else if (stage2Active) {
    flameParticles1.show = false;
    flameParticles2.show = simState.isRunning;
    flameParticles3.show = false;
    smokeParticles.show = false;
  } else if (stage3Active) {
    flameParticles1.show = false;
    flameParticles2.show = false;
    flameParticles3.show = simState.isRunning;
    smokeParticles.show = false;
  } else {
    flameParticles1.show = false;
    flameParticles2.show = false;
    flameParticles3.show = false;
    smokeParticles.show = false;
  }

  // ── 卫星太阳能板展开 ──
  const stage3SepTime = et.stage3Sep || 280;
  const panelDeployTime = stage3SepTime + 9;
  if (t >= panelDeployTime) {
    if (!simState.satDeployed) {
      simState.satDeployed = true;
      triggerPanelDeploy();
      // pushMessage("satellite", "卫星太阳翼展开完成", "deploy");
    }
  } else {
    simState.satDeployed = false;
  }

  // ── 轨道参数 ──
  if (simState.altitude > 1000) {
    const { pe, ap } = computeOrbitParams(simState.altitude, simState.velocity);
    simState.periapsis = pe;
    simState.apoapsis = ap;
  }

  // ── 更新图表 ──
  chartCompRef.value?.updateTimeLine(t);

  // ── 边界检测：前进到终点或后退到起点时停止 ──
  if (simState.playDirection === 1 && simState.currentTime >= TOTAL - 0.5) {
    simState.finished = true;
    simState.isRunning = false;
    viewer.clock.shouldAnimate = false;
  } else if (simState.playDirection === -1 && simState.currentTime <= 0.5) {
    simState.isRunning = false;
    viewer.clock.shouldAnimate = false;
    viewer.clock.currentTime = clockStart.clone();
    simState.currentTime = 0;
  }
}

function onPreRender(scene, time) {
  const et = rocketGroups.eventTimes;
  const elapsed = Cesium.JulianDate.secondsDifference(time, clockStart);
  flameParticles1.time = elapsed;
  flameParticles2.time = elapsed;
  flameParticles3.time = elapsed;
  smokeParticles.time = elapsed;
  smokeParticles.globalOpacity = Math.max(0, 1 - elapsed / 8);

  const ent = rocketGroups.rocketEntity;
  if (ent) {
    const pos = ent.position?.getValue(time);
    const orient = ent.orientation?.getValue(time);
    if (pos && orient) {
      const rotMat = Cesium.Matrix3.fromQuaternion(
        orient,
        new Cesium.Matrix3(),
      );
      const mat = Cesium.Matrix4.fromRotationTranslation(
        rotMat,
        pos,
        new Cesium.Matrix4(),
      );

      if (rocketModelObj) {
        rocketModelObj.modelMatrix = mat;
      }

      const stage1Active = !simState.stage1Separated;
      const stage2Active =
        elapsed >= et.stage1Sep + 9 + 5 && elapsed < et.stage2Sep + 9;
      const stage3Active =
        elapsed >= et.stage2Sep + 9 + 5 && elapsed < (et.stage3Sep || 280) + 9;
      if (stage1Active) flameParticles1.modelMatrix = mat;
      else if (stage2Active) flameParticles2.modelMatrix = mat;
      else if (stage3Active) flameParticles3.modelMatrix = mat;

      if (elapsed < et.boosterSep) {
        boosterFlameParticles.forEach((fp) => {
          fp.modelMatrix = mat;
        });
      }
    }
  }
}

async function startLaunch() {
  // 确保模型已就�?  if (rocketGroups._modelReady) {
    await rocketGroups._modelReady;
  }
  simState.isRunning = true;
  simState.finished = false;
  simState.missionSuccess = false;
  simState.missionFailed = false;
  simState.hasStarted = true;
  viewer.clock.shouldAnimate = true;
  viewer.clock.multiplier = simState.multiplier;
  viewer.clock.currentTime = clockStart.clone();
  // 点火后开始跟踪火�?  viewer.trackedEntity = rocketGroups.rocketEntity;
  rocketGroups.trackPoint.viewFrom = new Cesium.Cartesian3(-300, 0, 0);
  const ent = viewer.trackedEntity;
  viewer.trackedEntity = undefined;
  viewer.trackedEntity = ent;
  flameParticles1.show = true;
  smokeParticles.show = true;
  boosterFlameParticles.forEach((fp) => (fp.show = true));
}

function toggleTracking() {
  trackingEnabled.value = !trackingEnabled.value;
  if (trackingEnabled.value) {
    viewer.trackedEntity = rocketGroups.rocketEntity;
    const ent = viewer.trackedEntity;
    viewer.trackedEntity = undefined;
    viewer.trackedEntity = ent;
  } else {
    viewer.trackedEntity = undefined;
  }
}

function resetSimulation() {
  viewer.clock.shouldAnimate = false;
  viewer.clock.currentTime = clockStart.clone();
  if (rocketModelObj && rocketModelObj.activeAnimations)
    rocketModelObj.activeAnimations.removeAll();
  _triggeredAnims.clear();
  _pendingAnims.length = 0;
  showComponent("stage1");
  showComponent("stage2");
  showComponent("stage3");
  showComponent("booster_f");
  showComponent("booster_r");
  showComponent("booster_a");
  showComponent("booster_l");
  showComponent("fairing_l");
  showComponent("fairing_r");
  flameParticles1.show = false;
  flameParticles2.show = false;
  flameParticles3.show = false;
  smokeParticles.show = false;
  boosterFlameParticles.forEach((fp) => (fp.show = false));
  simState.isRunning = false;
  simState.finished = false;
  simState.missionSuccess = false;
  simState.missionFailed = false;
  simState.hasStarted = false;
  simState.playDirection = 1;
  simState.currentTime = 0;
  simState.altitude = 0;
  simState.velocity = 0;
  simState.pitch = 90;
  simState.phaseName = "待命";
  simState.stage1Active = false;
  simState.stage1Separated = false;
  simState.fairingJettisoned = false;
  simState.stage2Active = false;
  simState.stage2Separated = false;
  simState.stage3Active = false;
  simState.stage3Separated = false;
  simState.satDeployed = false;
  simState.boosterSeparated = false;
  simState.periapsis = 0;
  simState.apoapsis = 0;
  // 重置消息 & 图表
  messages.value = [];
  chartCompRef.value?.updateTimeLine(0);
  trackingEnabled.value = false;
  // 重置：取消跟踪，恢复地面仰望视角
  viewer.trackedEntity = undefined;
  const site = getSiteCoords(orbitConfig.launchSite);
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(site.lon, site.lat - 0.001, 40),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-10),
      roll: 0,
    },
  });
}

function setSpeed(s) {
  simState.multiplier = s;
  if (viewer) viewer.clock.multiplier = s * simState.playDirection;
}
function playForward() {
  if (!simState.hasStarted) return;
  simState.playDirection = 1;
  simState.isRunning = true;
  simState.finished = false;
  viewer.clock.multiplier = simState.multiplier;
  viewer.clock.shouldAnimate = true;
}
function playBackward() {
  if (!simState.hasStarted) return;
  simState.playDirection = -1;
  simState.isRunning = true;
  viewer.clock.multiplier = -simState.multiplier;
  viewer.clock.shouldAnimate = true;
}
function togglePlay() {
  if (!simState.hasStarted) return;
  simState.isRunning = !simState.isRunning;
  viewer.clock.shouldAnimate = simState.isRunning;
}
function skipTime(seconds) {
  if (!simState.hasStarted) return;
  const newTime = Cesium.JulianDate.addSeconds(
    viewer.clock.currentTime,
    seconds,
    new Cesium.JulianDate(),
  );
  if (Cesium.JulianDate.lessThan(newTime, viewer.clock.startTime))
    viewer.clock.currentTime = viewer.clock.startTime.clone();
  else if (Cesium.JulianDate.greaterThan(newTime, viewer.clock.stopTime))
    viewer.clock.currentTime = viewer.clock.stopTime.clone();
  else viewer.clock.currentTime = newTime;
}

const orbitType = computed(() => {
  const pe = simState.periapsis;
  if (pe <= 0) return "--";
  if (pe < 100) return "亚轨�?;
  if (pe < 2000) return "LEO 近地";
  if (pe < 35786) return "MEO 中地";
  return "GEO 同步";
});

function formatTime(sec) {
  const m = Math.floor(sec / 60),
    s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
function stageClass(stage) {
  if (stage === "booster")
    return {
      active: !simState.boosterSeparated,
      separated: simState.boosterSeparated,
    };
  if (stage === "stage1")
    return {
      active: simState.stage1Active,
      separated: simState.stage1Separated,
    };
  if (stage === "fairing")
    return {
      active: !simState.fairingJettisoned,
      separated: simState.fairingJettisoned,
    };
  if (stage === "stage2")
    return {
      active: simState.stage2Active,
      separated: simState.stage2Separated,
    };
  if (stage === "stage3")
    return {
      active: simState.stage3Active,
      separated: simState.stage3Separated,
    };
  if (stage === "sat") return { active: simState.satDeployed };
}
function stageStatus(stage) {
  if (stage === "booster")
    return simState.boosterSeparated ? "已分�? : "工作�?;
  if (stage === "stage1")
    return simState.stage1Separated
      ? "已分�?
      : simState.stage1Active
        ? "工作�?
        : "待命";
  if (stage === "fairing")
    return simState.fairingJettisoned ? "已抛�? : "就位";
  if (stage === "stage2")
    return simState.stage2Separated
      ? "已分�?
      : simState.stage2Active
        ? "工作�?
        : "待命";
  if (stage === "stage3")
    return simState.stage3Separated
      ? "已分�?
      : simState.stage3Active
        ? "工作�?
        : "待命";
  if (stage === "sat") return simState.satDeployed ? "已部�? : "待命";
}

onMounted(() => {
  initViewer();
});
onBeforeUnmount(() => {
  if (tickHandler) viewer.clock.onTick.removeEventListener(tickHandler);
  if (preRenderHandler)
    viewer.scene.preRender.removeEventListener(preRenderHandler);
  if (viewer) viewer.destroy();
});
</script>

<style scoped>
.app {
  width: 100%;
  height: 100vh;
  position: relative;
  overflow: hidden;
}
#cesiumContainer {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
}

/* 加载�?*/
.loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #050810;
  z-index: 1000;
}
.loading-spinner {
  width: 48px;
  height: 48px;
  border: 3px solid rgba(0, 150, 255, 0.15);
  border-top-color: #00aaff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.loading-text {
  margin-top: 16px;
  color: #4a7da8;
  font-size: 13px;
  letter-spacing: 2px;
}

/* 覆盖�?*/
.overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 10;
}
.overlay > * {
  pointer-events: auto;
}

/* ── 顶部标题�?── */
.top-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(
    180deg,
    rgba(5, 10, 25, 0.95) 0%,
    rgba(5, 10, 25, 0.6) 100%
  );
  border-bottom: 1px solid rgba(0, 120, 255, 0.15);
  padding: 0 20px;
  backdrop-filter: blur(12px);
}
.top-bar-left,
.top-bar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 200px;
}
.top-bar-right {
  justify-content: flex-end;
}
.top-bar-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #4a6080;
  transition: all 0.3s;
}
.status-dot.active {
  background: #00ff88;
  box-shadow: 0 0 8px rgba(0, 255, 136, 0.6);
  animation: pulse 1.5s ease-in-out infinite;
}
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
.status-text {
  font-size: 12px;
  color: #6080a0;
  letter-spacing: 1px;
}
.mission-title {
  font-size: 17px;
  font-weight: bold;
  color: #e0eaff;
  letter-spacing: 3px;
  text-shadow: 0 0 10px rgba(0, 120, 255, 0.3);
}
.mission-sub {
  font-size: 10px;
  color: #4a6a8a;
  letter-spacing: 2px;
}
.fps-text {
  font-family: "Consolas", monospace;
  font-size: 11px;
  color: #4a7a5a;
  margin-right: 16px;
}
.time-text {
  font-family: "Consolas", monospace;
  font-size: 18px;
  font-weight: bold;
  color: #00aaff;
  text-shadow: 0 0 8px rgba(0, 170, 255, 0.3);
}

/* ── 通用面板 ── */
.panel {
  position: absolute;
  background: rgba(5, 10, 25, 0.82);
  border: 1px solid rgba(0, 120, 255, 0.12);
  border-radius: 6px;
  backdrop-filter: blur(10px);
  color: #c0d0e0;
  font-size: 13px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
}
.panel::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(0, 170, 255, 0.5),
    transparent
  );
  border-radius: 6px 6px 0 0;
}
.panel-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-bottom: 1px solid rgba(0, 120, 255, 0.08);
}
.panel-icon {
  display: flex;
  align-items: center;
  color: #5a8ab0;
}
.panel-icon svg {
  flex-shrink: 0;
}
.panel-title {
  font-size: 12px;
  color: #5a8ab0;
  letter-spacing: 2px;
  text-transform: uppercase;
}
.panel-body {
  padding: 10px 14px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}
.panel {
  display: flex;
  flex-direction: column;
}

/* ── 左侧面板位置 ── */
.panel-left-top,
.panel-right-top {
  width: 280px;
  height: 234px;
}
.panel-left-bottom {
  width: 280px;
  height: 290px;
}
.panel-right-mid {
  width: 280px;
  height: 150px;
}
.panel-right-bottom {
  width: 560px;
  height: 290px;
}
.panel-left-top   { top: 72px;  left: 16px; }
.panel-left-bottom  { top: 322px; left: 16px; }
.panel-right-top    { top: 72px;  right: 16px; height: 132px; }
.panel-right-top .panel-body,
.panel-right-mid .panel-body { overflow-y: visible; }
.panel-right-mid    { top: 220px; right: 16px; }
.panel-right-bottom { top: 386px; right: 16px; }
/* ── 数据�?── */
.data-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 7px 0;
}
.data-label {
  font-size: 11px;
  color: #5a7090;
  letter-spacing: 1px;
}
.data-value {
  font-family: "Consolas", monospace;
  font-weight: bold;
  color: #e0f0ff;
  font-size: 13px;
}
.unit {
  font-size: 10px;
  color: #4a6a8a;
  font-weight: normal;
}
.phase-tag {
  color: #ffaa44;
  text-shadow: 0 0 6px rgba(255, 170, 68, 0.2);
}

/* ── 火箭状态项 ── */
.stage-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 5px 0;
  padding: 5px 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.02);
  border-left: 2px solid transparent;
  transition: all 0.3s;
}
.stage-item.active {
  background: rgba(0, 255, 136, 0.06);
  border-left-color: #00ff88;
}
.stage-item.separated {
  opacity: 0.4;
  border-left-color: #ff4444;
}
.stage-icon {
  display: flex;
  align-items: center;
  width: 18px;
  justify-content: center;
  color: #5a7a9a;
}
.stage-icon svg {
  flex-shrink: 0;
}
.stage-icon-num {
  font-size: 11px;
  font-weight: bold;
  font-family: "Consolas", monospace;
  color: #5a8ab0;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1px solid rgba(0, 120, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}
.stage-name {
  flex: 1;
  color: #aab8c8;
  font-size: 12px;
}
.stage-status {
  font-size: 10px;
  color: #5a6a7a;
}
.stage-item.active .stage-status {
  color: #00ff88;
}
.stage-item.separated .stage-status {
  color: #ff4444;
}

/* ── 相机面板 ── */
.cam-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 8px 0;
}
.cam-label {
  font-size: 10px;
  color: #5a7090;
  width: 36px;
  flex-shrink: 0;
}
.cam-row input[type="range"] {
  flex: 1;
  height: 3px;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(0, 120, 255, 0.1);
  border-radius: 2px;
  outline: none;
}
.cam-row input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #00aaff;
  cursor: pointer;
  box-shadow: 0 0 6px rgba(0, 170, 255, 0.4);
}
.cam-row input[type="range"]::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #00aaff;
  cursor: pointer;
  border: none;
}
.cam-value {
  font-size: 10px;
  color: #80a0c0;
  font-family: "Consolas", monospace;
  width: 32px;
  text-align: right;
  flex-shrink: 0;
}

/* ── 底部控制�?── */
.bottom-bar {
  position: absolute;
  bottom: 50px;
  right: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  background: rgba(5, 10, 25, 0.85);
  border: 1px solid rgba(0, 120, 255, 0.12);
  border-radius: 8px;
  backdrop-filter: blur(12px);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
}
.bottom-bar::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(0, 170, 255, 0.4),
    transparent
  );
  border-radius: 8px 8px 0 0;
}
.btn {
  padding: 9px 18px;
  border: none;
  border-radius: 5px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: bold;
  letter-spacing: 1px;
}
.btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.btn-launch {
  background: linear-gradient(135deg, #ff5500, #cc2200);
  color: #fff;
  box-shadow: 0 0 12px rgba(255, 80, 0, 0.3);
}
.btn-launch:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 0 20px rgba(255, 80, 0, 0.5);
}
.btn-reset {
  background: rgba(0, 120, 255, 0.15);
  color: #80b0e0;
  border: 1px solid rgba(0, 120, 255, 0.2);
}
.btn-reset:not(:disabled):hover {
  background: rgba(0, 120, 255, 0.25);
}
.btn-track {
  background: rgba(0, 120, 255, 0.1);
  color: #6080a0;
  border: 1px solid rgba(0, 120, 255, 0.15);
  font-size: 12px;
  padding: 6px 12px;
  border-radius: 5px;
  cursor: pointer;
  letter-spacing: 1px;
  display: flex;
  align-items: center;
  gap: 4px;
}
.btn-track:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.btn-track:not(:disabled):hover {
  background: rgba(0, 120, 255, 0.2);
}
.btn-track.active {
  background: rgba(0, 200, 255, 0.2);
  color: #00ccff;
  border-color: rgba(0, 200, 255, 0.4);
  box-shadow: 0 0 8px rgba(0, 170, 255, 0.2);
}

/* ── 配置按钮 ── */
.btn-config {
  background: none;
  border: 1px solid rgba(0, 120, 255, 0.15);
  border-radius: 5px;
  color: #5a80a0;
  padding: 4px 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  margin-right: 10px;
  transition: all 0.2s;
}
.btn-config:hover {
  background: rgba(0, 120, 255, 0.1);
  color: #80b0d0;
}

/* ── 配置面板 ── */
.config-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}
.config-panel {
  background: rgba(8, 15, 30, 0.95);
  border: 1px solid rgba(0, 150, 255, 0.2);
  border-radius: 10px;
  width: 560px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.6);
}
.config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid rgba(0, 120, 255, 0.1);
}
.config-title {
  font-size: 15px;
  font-weight: bold;
  color: #c0d8f0;
  letter-spacing: 2px;
}
.config-close {
  background: none;
  border: none;
  color: #5a7090;
  font-size: 18px;
  cursor: pointer;
  padding: 4px 8px;
}
.config-close:hover { color: #a0b8d0; }
.config-body {
  padding: 20px 24px;
}
.config-section {
  margin-bottom: 14px;
}
.config-label {
  font-size: 11px;
  color: #5a80a0;
  letter-spacing: 2px;
  margin-bottom: 8px;
  text-transform: uppercase;
}
.config-select {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 10px;
  background: rgba(0, 20, 40, 0.6);
  border: 1px solid rgba(0, 120, 255, 0.2);
  border-radius: 5px;
  color: #c0d0e0;
  font-size: 13px;
  outline: none;
}
.config-tle-input {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 10px;
  background: rgba(0, 20, 40, 0.6);
  border: 1px solid rgba(0, 120, 255, 0.2);
  border-radius: 4px;
  color: #c0d0e0;
  font-size: 11px;
  font-family: "Consolas", monospace;
  resize: vertical;
  outline: none;
  margin-bottom: 6px;
}
.config-tle-input:focus { border-color: rgba(0, 170, 255, 0.4); }
.config-tle-input::placeholder { color: #3a5070; }
.config-select:focus { border-color: rgba(0, 170, 255, 0.4); }
.config-select option {
  background: #0a1525;
  color: #c0d0e0;
}
.config-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.config-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.config-row span {
  font-size: 12px;
  color: #7a90a8;
}
.config-row input {
  width: 120px;
  padding: 5px 8px;
  background: rgba(0, 20, 40, 0.6);
  border: 1px solid rgba(0, 120, 255, 0.2);
  border-radius: 4px;
  color: #c0d0e0;
  font-size: 12px;
  font-family: "Consolas", monospace;
  text-align: right;
  outline: none;
}
.config-row input:focus { border-color: rgba(0, 170, 255, 0.4); }
.btn-apply {
  width: 100%;
  padding: 10px;
  margin-top: 8px;
  background: linear-gradient(135deg, rgba(0, 150, 255, 0.3), rgba(0, 100, 200, 0.2));
  border: 1px solid rgba(0, 170, 255, 0.3);
  border-radius: 6px;
  color: #80c8f0;
  font-size: 14px;
  font-weight: bold;
  letter-spacing: 2px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-apply:hover {
  background: linear-gradient(135deg, rgba(0, 170, 255, 0.4), rgba(0, 120, 220, 0.3));
  border-color: rgba(0, 200, 255, 0.5);
  box-shadow: 0 0 12px rgba(0, 150, 255, 0.2);
}

.speed-control {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 6px;
}
.speed-label {
  font-size: 11px;
  color: #5a7090;
  margin: 0 2px;
}
.btn-ctrl {
  padding: 5px 9px;
  background: rgba(0, 120, 255, 0.1);
  border: 1px solid rgba(0, 120, 255, 0.15);
  border-radius: 4px;
  color: #80b0e0;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-ctrl:hover {
  background: rgba(0, 120, 255, 0.2);
}
.btn-ctrl:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.btn-icon {
  vertical-align: middle;
  margin-right: 2px;
}
.btn-ctrl-icon {
  vertical-align: middle;
  display: block;
}
.btn-speed {
  padding: 4px 9px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 4px;
  color: #8090a0;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-speed:hover {
  background: rgba(0, 120, 255, 0.1);
}
.btn-speed.active {
  background: rgba(0, 170, 255, 0.2);
  color: #00aaff;
  border-color: rgba(0, 170, 255, 0.4);
  box-shadow: 0 0 8px rgba(0, 170, 255, 0.2);
}

/* ── 遥测图表面板 ── */
.chart-panel-body {
  padding: 2px 4px;
  overflow: hidden;
  flex: 1;
  min-height: 0;
}
.chart-container {
  width: 100%;
  height: 240px;
}

/* ── Toast 消息 ── */
.toast-container {
  position: absolute;
  bottom: 60px;
  left: 16px;
  z-index: 100;
  display: flex;
  flex-direction: column-reverse;
  gap: 6px;
  pointer-events: none;
}
.toast-msg {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 6px;
  backdrop-filter: blur(12px);
  font-size: 13px;
  font-weight: bold;
  letter-spacing: 1px;
  animation: toastSlideIn 0.35s ease;
  pointer-events: auto;
}
.toast-msg.separation {
  background: rgba(255, 120, 0, 0.15);
  border: 1px solid rgba(255, 120, 0, 0.3);
  color: #ffaa66;
  box-shadow: 0 0 16px rgba(255, 100, 20, 0.15);
}
.toast-msg.fairing {
  background: rgba(0, 180, 255, 0.12);
  border: 1px solid rgba(0, 180, 255, 0.25);
  color: #66ccff;
  box-shadow: 0 0 16px rgba(0, 160, 255, 0.12);
}
.toast-msg.deploy {
  background: rgba(0, 255, 136, 0.1);
  border: 1px solid rgba(0, 255, 136, 0.25);
  color: #66ffaa;
  box-shadow: 0 0 16px rgba(0, 255, 136, 0.1);
}
.toast-msg.info {
  background: rgba(0, 170, 255, 0.12);
  border: 1px solid rgba(0, 170, 255, 0.25);
  color: #66bbff;
  box-shadow: 0 0 16px rgba(0, 170, 255, 0.1);
}
.toast-icon {
  font-size: 16px;
}
.toast-text {
  white-space: nowrap;
}
.toast-enter-active {
  animation: toastSlideIn 0.35s ease;
}
.toast-leave-active {
  animation: toastSlideOut 0.3s ease;
}
@keyframes toastSlideIn {
  from { opacity: 0; transform: translateX(-40px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes toastSlideOut {
  from { opacity: 1; transform: translateX(0); }
  to   { opacity: 0; transform: translateX(-40px); }
}

</style>

<style>
/* Cesium 时间�?*/
.cesium-viewer-timelineContainer {
  background: rgba(5, 10, 25, 0.9) !important;
  border-top: 1px solid rgba(0, 120, 255, 0.12) !important;
  height: 36px !important;
}
.cesium-timeline-bar {
  background: rgba(10, 18, 35, 0.9) !important;
  height: 28px !important;
}
.cesium-timeline-ticLabel { color: #5a7090 !important; font-size: 10px !important; }
.cesium-timeline-ticMain { background-color: rgba(0, 120, 255, 0.2) !important; }
.cesium-timeline-icon16 { display: none !important; }
.cesium-timeline-needle {
  background-color: #00aaff !important;
  width: 2px !important;
  box-shadow: 0 0 6px rgba(0, 170, 255, 0.4);
}
</style>
