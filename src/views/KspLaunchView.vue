<template>
  <main
    class="game-shell"
    :class="{ ready: initialized }"
    :style="zoomCompensationStyle"
  >
    <div id="kerbin-scene" ref="sceneEl"></div>

    <div v-if="initialized && gameEntered" class="audio-control hud-panel">
      <button
        @click="toggleMusic"
        :class="{ active: musicEnabled }"
        :title="musicEnabled ? '关闭背景音乐' : '开启背景音乐'"
      >
        ♪
      </button>
      <input
        v-model.number="musicVolume"
        @input="updateMusicVolume"
        type="range"
        min="0"
        max="0.8"
        step="0.01"
        title="背景音乐音量"
      />
    </div>

    <div v-if="!initialized" class="loading-screen">
      <div class="loading-track">
        <i :style="{ width: `${resourceProgress}%` }"></i>
      </div>
      <p>正在装载场景资源 {{ resourceProgress }}%</p>
    </div>

    <section
      v-else-if="!gameEntered"
      class="main-menu"
      @click="startMusicOnFirstInteraction"
    >
      <header class="home-topbar">
        <div class="home-title"><b>SIM</b><span>航天任务模拟器</span></div>
        <div class="home-toolbar">
          <div class="home-status">
            <i></i><span>系统在线</span><em>版本 1.0</em>
          </div>
          <button
            class="btn-control"
            @click="
              settingsVisible = !settingsVisible;
              if (settingsVisible) musicMenuVisible = false;
            "
            title="系统设置"
          >
            <span class="toolbar-icon">⚙</span>设置
          </button>
          <button
            @click="
              musicMenuVisible = !musicMenuVisible;
              if (musicMenuVisible) settingsVisible = false;
            "
          >
            <span class="toolbar-icon">♫</span>音乐
          </button>
        </div>
      </header>
      <div v-if="musicMenuVisible" class="home-popover music-popover hud-panel">
        <button
          v-for="preset in MUSIC_PRESETS"
          :key="preset.id"
          :class="{ active: selectedMusic === preset.id }"
          @click="selectMusic(preset.id)"
        >
          <b>{{ preset.name }}</b
          ><small>{{ preset.description }}</small>
        </button>
        <div class="music-volume">
          <span>音量</span
          ><input
            v-model.number="musicVolume"
            @input="updateMusicVolume"
            type="range"
            min="0"
            max="0.8"
            step="0.01"
          />
        </div>
        <button class="music-toggle" @click="toggleMusic">
          {{ musicEnabled ? "关闭音乐" : "开启音乐" }}
        </button>
      </div>
      <div
        v-if="settingsVisible"
        class="home-popover settings-popover hud-panel"
      >
        <section class="settings-dialog">
          <header>
            <div><span>系统设置</span><small>SCENE CONFIGURATION</small></div>
          </header>
          <div class="settings-body">
            <label class="settings-token">
              <span>Cesium Access Token</span>
              <input
                v-model.trim="sceneSettings.token"
                type="password"
                autocomplete="off"
                placeholder="可选，留空使用当前 Token"
              />
            </label>
            <div class="settings-grid">
              <label
                v-for="item in sceneSettingOptions"
                :key="item.key"
                class="settings-option"
              >
                <span
                  ><b>{{ item.label }}</b
                  ><small>{{ item.description }}</small></span
                >
                <input v-model="sceneSettings[item.key]" type="checkbox" />
              </label>
            </div>
            <div class="settings-tuning">
              <h3>图形质量</h3>
              <label
                ><span
                  >渲染倍率
                  <b>{{ sceneSettings.resolutionScale.toFixed(2) }}x</b></span
                ><input
                  v-model.number="sceneSettings.resolutionScale"
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.25"
              /></label>
              <label
                ><span
                  >大气强度
                  <b>{{
                    sceneSettings.atmosphereIntensity.toFixed(0)
                  }}</b></span
                ><input
                  v-model.number="sceneSettings.atmosphereIntensity"
                  type="range"
                  min="0"
                  max="30"
                  step="1"
              /></label>
              <label
                ><span
                  >雾密度 <b>{{ sceneSettings.fogDensity.toFixed(5) }}</b></span
                ><input
                  v-model.number="sceneSettings.fogDensity"
                  type="range"
                  min="0"
                  max="0.001"
                  step="0.00005"
              /></label>
              <label
                ><span
                  >阴影深度
                  <b>{{ sceneSettings.shadowDarkness.toFixed(2) }}</b></span
                ><input
                  v-model.number="sceneSettings.shadowDarkness"
                  type="range"
                  min="0.3"
                  max="0.9"
                  step="0.05"
              /></label>
              <h3>景深参数</h3>
              <label
                ><span
                  >焦点距离
                  <b>{{ sceneSettings.dofDistance.toFixed(0) }}</b></span
                ><input
                  v-model.number="sceneSettings.dofDistance"
                  type="range"
                  min="50"
                  max="5000"
                  step="50"
              /></label>
              <label
                ><span
                  >清晰范围 <b>{{ sceneSettings.dofRange.toFixed(0) }}</b></span
                ><input
                  v-model.number="sceneSettings.dofRange"
                  type="range"
                  min="100"
                  max="5000"
                  step="100"
              /></label>
              <label
                ><span
                  >模糊强度 <b>{{ sceneSettings.dofBlur.toFixed(1) }}</b></span
                ><input
                  v-model.number="sceneSettings.dofBlur"
                  type="range"
                  min="1"
                  max="12"
                  step="0.5"
              /></label>
            </div>
          </div>
          <footer>
            <button @click="resetSceneSettings">恢复默认</button>
            <button class="settings-apply" @click="saveSceneSettings">
              应用设置
            </button>
          </footer>
        </section>
      </div>
      <div class="menu-orbit-visual" aria-hidden="true">
        <div class="menu-planet">
          <div class="planet-surface"></div>
          <div class="planet-shade"></div>
        </div>
        <div class="menu-orbit-ring"><i></i></div>
        <div class="menu-orbit-ring ring-secondary"><i></i></div>
        <div class="menu-orbit-ring orbit-front"><i></i></div>
        <div class="menu-orbit-ring ring-secondary orbit-front"><i></i></div>
      </div>
      <div class="menu-brand">
        <span>SPACE FLIGHT SIMULATOR</span>
        <h1>航天任务模拟器</h1>
        <p>酒泉发射中心 · 近地轨道任务</p>
      </div>
      <div class="menu-actions hud-panel">
        <button
          class="menu-primary"
          @click="enterGame"
          :disabled="enteringGame"
        >
          <strong>{{ enteringGame ? "正在锁定火箭视角…" : "开始任务" }}</strong>
          <small>{{
            enteringGame
              ? "相机准备完成后自动进入"
              : "执行火箭点火、分级与入轨操作"
          }}</small>
        </button>
        <div class="menu-status"><i></i> 场景资源已就绪</div>
      </div>
      <div class="menu-version">
        FLIGHT BUILD 1.0 · WENCHANG · EARTH IMAGERY NASA/GSFC · © 2024-2026
        康伟涛 (kangweitao) · kangweitao1998@163.com · All Rights Reserved
      </div>
      <div class="menu-disclaimer">
        【本游戏所有内容纯属虚构，如有雷同，纯属巧合】
      </div>
    </section>

    <template v-else>
      <header class="top-hud hud-panel">
        <div class="mission-name">
          <span>航天任务模拟器</span>
          <strong>近地轨道任务</strong>
        </div>
        <div class="altimeter">
          <small>高度计</small>
          <div class="digits">{{ altitudeDigits }}</div>
          <b>m</b>
        </div>
        <div class="vertical-speed">
          <small>垂直速度</small>
          <strong>{{ signed(flight.verticalSpeed) }}</strong
          ><b> m/s</b>
        </div>
        <div class="mission-clock">
          <small>任务经过时间</small>
          <strong>{{ missionTime }}</strong>
        </div>
      </header>

      <HudPanel
        v-model:collapsed="collapsedHud.stage"
        :title="`STAGE · ${currentStage}`"
        class="stage-stack"
      >
        <button
          v-for="stage in stages"
          :key="stage.id"
          class="stage-row"
          :class="{ active: stage.id === activeStageId, spent: stage.spent }"
          :disabled="stage.spent || stage.id !== activeStageId"
          @click="activateStage"
        >
          <span class="engine-symbol">◉</span>
          <span
            ><b>{{ stage.label }}</b
            ><small>{{ stageStatusText(stage) }}</small></span
          >
          <i :style="{ '--fuel': `${stage.fuel}%` }"></i>
        </button>
        <button
          class="stage-trigger"
          @click="activateStage"
          :disabled="
            flight.crashed || flight.orbitAchieved || launchCountdown !== null
          "
        >
          <span>{{
            launchCountdown !== null
              ? `倒计时 ${launchCountdown}`
              : flight.started
                ? "分级"
                : "点火"
          }}</span
          ><kbd>SPACE</kbd>
        </button>
      </HudPanel>

      <!-- 时间滑块按钮 + 面板 -->
      <div v-if="false" class="time-slider-wrapper">
        <button
          class="time-slider-toggle-btn"
          :class="{ on: timeSliderOpen }"
          @click="timeSliderOpen = !timeSliderOpen"
          :title="timeSliderOpen ? '收起时间轴' : '展开时间轴'"
        >
          <span class="time-slider-toggle-icon">🕐</span>
        </button>
        <div v-if="timeSliderOpen" class="time-slider-panel hud-panel">
          <div class="time-slider-value">{{ timeSliderTimeText }}</div>
          <div
            class="time-slider-track"
            ref="timeSliderTrackEl"
            @pointerdown="onTimeSliderPointerDown"
          >
            <div class="time-slider-ticks">
              <span>24</span><span>18</span><span>12</span><span>6</span><span>0</span>
            </div>
            <div class="time-slider-fill" :style="{ height: (timeSliderHour / 24 * 100) + '%' }"></div>
            <div class="time-slider-thumb" :style="{ bottom: (timeSliderHour / 24 * 100) + '%' }"></div>
          </div>
          <div class="time-slider-label">北京时间</div>
        </div>
      </div>

      <HudPanel
        v-model:collapsed="collapsedHud.resources"
        title="资源信息"
        class="resources"
      >
        <div class="resource-row">
          <span>液体燃料</span><i><b :style="{ width: `${totalFuel}%` }"></b></i
          ><em>{{ totalFuel.toFixed(0) }}%</em>
        </div>
        <div class="resource-row">
          <span>氧化剂</span><i><b :style="{ width: `${totalFuel}%` }"></b></i
          ><em>{{ totalFuel.toFixed(0) }}%</em>
        </div>
        <div class="resource-row">
          <span>电量</span
          ><i class="electric"
            ><b :style="{ width: `${flight.battery}%` }"></b></i
          ><em>{{ flight.battery.toFixed(0) }}%</em>
        </div>
        <div class="orbit-readout">
          <div>
            <span>远拱点 AP</span><b>{{ orbit.ap }}</b
            ><small> km</small>
          </div>
          <div>
            <span>近拱点 PE</span><b>{{ orbit.pe }}</b
            ><small> km</small>
          </div>
          <div>
            <span>轨道速度</span><b>{{ flight.horizontalSpeed.toFixed(0) }}</b
            ><small> m/s</small>
          </div>
        </div>
      </HudPanel>

      <HudPanel
        v-if="flight.orbitAchieved"
        v-model:collapsed="collapsedHud.maneuver"
        title="轨道机动"
        class="maneuver-panel"
      >
        <div class="maneuver-title">
          <span>机动推进剂</span><b>{{ maneuverFuel.toFixed(0) }}%</b>
        </div>
        <div class="maneuver-fuel">
          <i><b :style="{ width: `${maneuverFuel}%` }"></b></i>
        </div>
        <div class="maneuver-directions">
          <button
            :class="{ active: maneuverDirection === 'prograde' }"
            :disabled="maneuverPlan.active"
            title="沿速度方向施加速度增量，抬高轨道另一侧"
            @click="maneuverDirection = 'prograde'"
          >
            轨道加速
          </button>
          <button
            :class="{ active: maneuverDirection === 'retrograde' }"
            :disabled="maneuverPlan.active"
            title="沿速度反方向施加速度增量，降低轨道另一侧"
            @click="maneuverDirection = 'retrograde'"
          >
            轨道减速
          </button>
          <button
            :class="{ active: maneuverDirection === 'normal' }"
            :disabled="maneuverPlan.active"
            @click="maneuverDirection = 'normal'"
          >
            左变轨
          </button>
          <button
            :class="{ active: maneuverDirection === 'antinormal' }"
            :disabled="maneuverPlan.active"
            @click="maneuverDirection = 'antinormal'"
          >
            右变轨
          </button>
        </div>
        <label class="maneuver-dv">
          <span>速度增量 Δv</span><b>{{ maneuverDeltaV }} m/s</b>
          <input
            v-model.number="maneuverDeltaV"
            type="range"
            min="10"
            max="400"
            step="10"
            :disabled="maneuverPlan.active"
          />
        </label>
        <div class="maneuver-orbit-data">
          <span
            >预测 AP <b>{{ plannedOrbitReadout.ap }}</b> km</span
          >
          <span
            >预测 PE <b>{{ plannedOrbitReadout.pe }}</b> km</span
          >
          <span
            >机动方向 <b>{{ maneuverDirectionLabel }}</b></span
          >
          <span
            >预计消耗 <b>{{ maneuverFuelCost.toFixed(1) }}%</b></span
          >
        </div>
        <div v-if="maneuverPlan.active" class="maneuver-node-time">
          <span>节点倒计时</span><b>T- {{ maneuverCountdownText }}</b>
        </div>
        <div class="maneuver-actions">
          <button v-if="!maneuverPlan.active" @click="createManeuverPlan">
            创建节点
          </button>
          <button
            v-else
            :class="{ armed: maneuverPlan.armed }"
            @click="armManeuver"
          >
            {{ maneuverPlan.armed ? "等待执行" : "执行机动" }}
          </button>
          <button
            v-if="maneuverPlan.active"
            class="secondary"
            @click="cancelManeuverPlan"
          >
            取消
          </button>
        </div>
        <p v-if="maneuverPlan.message">{{ maneuverPlan.message }}</p>
        <div class="orbit-legend">
          <b>图例</b>
          <span
            ><img :src="createMapIcon('satellite', '#83c95a', 48)" />卫星</span
          >
          <span
            ><img
              :src="createMapIcon('maneuver', '#e6534f', 48)"
            />机动节点</span
          >
          <span><img :src="createMapIcon('ap', '#e0a33b', 48)" />当前 AP</span>
          <span><img :src="createMapIcon('pe', '#e0a33b', 48)" />当前 PE</span>
          <span><img :src="createMapIcon('ap', '#73d7df', 48)" />预测 AP</span>
          <span><img :src="createMapIcon('pe', '#73d7df', 48)" />预测 PE</span>
        </div>
      </HudPanel>

      <section class="flight-status">
        <div class="situation">{{ situation }}</div>
        <div class="speed-mode">
          <span>{{ speedMode }}</span
          ><strong>{{ speedDisplay }}</strong
          ><small>m/s</small>
        </div>
      </section>

      <section class="nav-cluster">
        <div class="navball" :style="navballStyle">
          <div class="nav-grid"><i class="grid-horizon"></i></div>
          <div class="nav-center-mark"><i></i><b></b><i></i></div>
          <div class="nav-degree-ring">
            <b
              v-for="degree in [
                0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330,
              ]"
              :key="degree"
              :style="{
                transform: `rotate(${degree}deg) translateY(-72px) rotate(-${degree}deg)`,
              }"
              >{{ degree }}</b
            >
          </div>
          <span class="heading north">N</span><span class="heading east">E</span
          ><span class="heading south">S</span
          ><span class="heading west">W</span>
          <div class="nav-target target-prograde">⊙<small>PRO</small></div>
          <div class="nav-target target-retrograde">⊗<small>RET</small></div>
          <div class="nav-target target-normal">✦</div>
          <div class="nav-target target-radial">◆</div>
        </div>
        <div class="heading-tape">
          <div class="tape-ticks"><i v-for="tick in 9" :key="tick"></i></div>
          <b>{{ headingText }}</b>
        </div>
      </section>

      <section class="sas-controls hud-panel">
        <button
          :class="{ on: controls.sas }"
          :aria-pressed="controls.sas"
          @mouseenter="hoveredControl = 'sas'"
          @mouseleave="hoveredControl = null"
          @click="toggleSas"
        >
          SAS
        </button>
        <button
          :class="{ on: controls.rcs }"
          :aria-pressed="controls.rcs"
          @mouseenter="hoveredControl = 'rcs'"
          @mouseleave="hoveredControl = null"
          @click="toggleRcs"
        >
          RCS
        </button>
        <div v-if="hoveredControl" class="control-tooltip">
          {{
            hoveredControl === "sas"
              ? "稳定辅助系统：自动保持火箭姿态与重力转弯"
              : "反作用控制系统：使用姿态推进器进行精细调整"
          }}
        </div>
      </section>

      <HudPanel
        v-model:collapsed="collapsedHud.throttle"
        title="油门控制"
        class="throttle-control"
      >
        <span style="padding-left: 8px"
          >油门 {{ Math.round(controls.throttle * 100) }}%</span
        >
        <div class="throttle-track" @pointerdown="onThrottleTrackDown">
          <div
            class="throttle-fill"
            :style="{ height: `${controls.throttle * 100}%` }"
          ></div>
          <div
            class="throttle-handle"
            :style="{ bottom: `calc(${controls.throttle * 100}% - 6px)` }"
          ></div>
        </div>
        <div class="throttle-buttons">
          <button @click="setThrottle(1)">全开</button
          ><button @click="setThrottle(0)">关闭</button
          ><button @click="setThrottle(Math.min(1, controls.throttle + 0.1))">
            ＋</button
          ><button @click="setThrottle(Math.max(0, controls.throttle - 0.1))">
            −
          </button>
        </div>
      </HudPanel>

      <section class="time-controls hud-panel">
        <button @click="skipMissionTime(-10)" title="后退十秒">◀◀</button>
        <button
          @click="toggleTimePause"
          :class="{ active: timePaused }"
          :title="timePaused ? '继续运行' : '暂停运行'"
          :aria-label="timePaused ? '继续运行' : '暂停运行'"
        >
          <i class="time-state-icon" :class="{ play: timePaused }"></i>
        </button>
        <button @click="skipMissionTime(10)" title="前进十秒">▶▶</button>
        <span>时间倍率</span>
        <button
          v-for="rate in [1, 2, 5, 10]"
          :key="rate"
          @click="timeWarp = rate"
          :class="{ active: timeWarp === rate }"
        >
          {{ rate }}×
        </button>
      </section>

      <section class="camera-tools hud-panel">
        <button
          @click="setCamera('chase')"
          :class="{ active: cameraMode === 'chase' }"
          title="追踪视角"
        >
          追踪
        </button>
        <button
          @click="setCamera('orbit')"
          :class="{ active: cameraMode === 'orbit' }"
          title="自由视角"
        >
          自由
        </button>
        <button
          v-if="cameraMode === 'orbit'"
          @click="setGlobalView"
          title="全球视角"
        >
          全球
        </button>
        <span v-if="cameraMode === 'orbit'" class="camera-distance">
          距地 {{ cameraDistanceText }}
        </span>
        <button class="home-button" @click="exitToHome" title="返回首页">
          首页
        </button>
        <button @click="resetMission" title="重新开始">重置</button>
      </section>

      <section
        v-if="!flight.started && briefingVisible"
        class="briefing hud-panel"
      >
        <button
          class="briefing-close"
          @click="briefingVisible = false"
          title="关闭任务提示"
        >
          ×
        </button>
        <span class="badge">⚠ 任务提示</span>
        <h1>把卫星载荷送入稳定轨道</h1>
        <p>
          升空后开启 SAS 自动重力转弯，在燃料耗尽时按空格分级。近拱点超过 70 km
          即完成入轨。
        </p>
        <div class="key-guide">
          <span><kbd>SPACE</kbd> 点火/分级</span><span><kbd>W S</kbd> 俯仰</span
          ><span><kbd>A D</kbd> 偏航</span
          ><span><kbd>SHIFT CTRL</kbd> 油门</span><span><kbd>T</kbd> SAS</span>
        </div>
      </section>

      <section v-if="crashDialogVisible" class="result-modal hud-panel">
        <h2>火箭坠毁</h2>
        <button @click="resetMission">重新开始</button>
      </section>
      <div
        v-if="flight.orbitAchieved && !flight.crashed"
        class="orbit-toast hud-panel"
      >
        <i></i><span>卫星已入轨 · 帆板已展开</span>
      </div>
      <HudPanel
        v-model:collapsed="missionTasksCollapsed"
        title="任务列表"
        class="mission-tasks"
      >
        <div class="mission-task-list">
          <div v-for="task in missionTasks" :key="task.id" :class="task.status">
            <i>{{
              task.status === "completed"
                ? "✓"
                : task.status === "active"
                  ? "▶"
                  : "·"
            }}</i>
            <span
              ><b>{{ task.title }}</b
              ><small>{{ task.detail }}</small></span
            >
          </div>
        </div>
      </HudPanel>
      <HudPanel
        v-if="flight.orbitAchieved && !flight.crashed"
        v-model:collapsed="collapsedHud.photo"
        title="卫星相机"
        class="satellite-camera"
      >
        <div class="satellite-camera-workspace">
          <div class="satellite-camera-side">
            <div class="satellite-camera-actions">
              <button @click="toggleSatelliteCamera">
                {{ satelliteCameraOpen ? "关闭相机" : "开启相机" }}
              </button>
              <button
                v-if="satelliteCameraOpen"
                @click="takeSatellitePhoto"
                :disabled="photoCapturing"
              >
                拍照
              </button>
            </div>
            <div
              class="ground-link-status"
              :class="{ active: groundLinkActive }"
            >
              <i></i
              >{{
                groundLinkActive
                  ? `测控链路：${groundLinkName}`
                  : "暂无测控链路"
              }}
            </div>
            <div v-if="satelliteCameraOpen" class="satellite-camera-controls">
              <b class="camera-controls-title">光学载荷参数</b>
              <label
                >视场
                <input
                  v-model.number="satelliteCamera.fov"
                  type="range"
                  min="0.1"
                  max="90"
                  step="0.1"
                />
                {{ satelliteCamera.fov }}°</label
              >
              <label
                >俯仰
                <input
                  v-model.number="satelliteCamera.pitch"
                  type="range"
                  min="-90"
                  max="90"
                  step="0.1"
                />
                {{ satelliteCamera.pitch }}°</label
              >
              <label
                >方位
                <input
                  v-model.number="satelliteCamera.heading"
                  type="range"
                  min="-180"
                  max="180"
                />
                {{ satelliteCamera.heading }}°</label
              >
              <label
                >横滚
                <input
                  v-model.number="satelliteCamera.roll"
                  type="range"
                  min="-180"
                  max="180"
                />
                {{ satelliteCamera.roll }}°</label
              >
              <label
                >画幅
                <input
                  v-model.number="satelliteCamera.aspectRatio"
                  type="range"
                  min="0.5"
                  max="4"
                  step="0.01"
                />
                {{ satelliteCamera.aspectRatio.toFixed(2) }}</label
              >
              <label
                >变焦
                <input
                  v-model.number="satelliteCamera.zoom"
                  type="range"
                  min="1"
                  :max="satelliteCameraMaxZoom"
                  step="1"
                />
                {{ satelliteCamera.zoom.toFixed(0) }}</label
              >
            </div>
          </div>
          <div
            v-show="satelliteCameraOpen"
            ref="satelliteCameraEl"
            class="satellite-camera-view"
          ></div>
        </div>
        <div class="photo-strip" :class="{ empty: !photos.length }">
          <span v-if="!photos.length" class="photo-strip-empty">暂无照片</span>
          <article v-for="photo in photos" :key="photo.id" class="photo-thumb">
            <img :src="photo.url" alt="卫星照片" @click="previewPhoto(photo)" />
            <div class="photo-thumb-actions">
              <button class="btn-view" @click="previewPhoto(photo)">
                查看
              </button>
              <button class="btn-delete" @click="deletePhoto(photo)">
                删除
              </button>
              <button
                class="btn-downlink"
                :disabled="!groundLinkActive"
                @click="downlinkPhoto(photo)"
              >
                下传
              </button>
            </div>
          </article>
        </div>
      </HudPanel>
      <div
        v-if="previewedPhoto"
        class="photo-preview"
        @click.self="previewedPhoto = null"
      >
        <button class="photo-preview-close" @click="previewedPhoto = null">
          ×
        </button>
        <div class="photo-preview-toolbar">
          <button @click="zoomPreview(-0.2)" title="缩小">−</button>
          <button @click="zoomPreview(0.2)" title="放大">＋</button>
          <button @click="rotatePreview(-90)" title="向左旋转">↶</button>
          <button @click="rotatePreview(90)" title="向右旋转">↷</button>
          <button @click="resetPhotoPreview" title="复位">复位</button>
        </div>
        <div
          class="photo-preview-stage"
          :class="{ dragging: photoPreview.dragging }"
          @pointerdown="startPhotoPreviewDrag"
          @wheel.prevent="onPhotoPreviewWheel"
        >
          <img
            :src="previewedPhoto.url"
            alt="卫星对地照片预览"
            :style="{
              transform: `translate(${photoPreview.x}px, ${photoPreview.y}px) scale(${photoPreview.scale}) rotate(${photoPreview.rotation}deg)`,
            }"
          />
        </div>
        <button
          :disabled="!groundLinkActive"
          @click="downlinkPhoto(previewedPhoto)"
        >
          下传照片
        </button>
      </div>
      <div
        v-if="systemMessage.text"
        class="system-message hud-panel"
        :class="systemMessage.type"
      >
        {{ systemMessage.text }}
      </div>
      <div v-if="launchCountdown !== null" class="launch-countdown">
        <small>发射倒计时</small><b>{{ launchCountdown }}</b>
      </div>

      <div class="control-hint">
        鼠标拖动观察 · 滚轮缩放 · <kbd>F</kbd> 切换视角
      </div>
    </template>
  </main>
</template>

<script setup>
const B = import.meta.env.BASE_URL;
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
} from "vue";
import GPUParticlePrimitive from "../GPUParticles.js";
import HtmlPopupPro from "../tools/HtmlPopupPro.js";
import SensorPyramidPrimitive from "../tools/SensorPyramidPrimitive.js";
import SensorTaperedPrimitive from "../tools/SensorTaperedPrimitive.js";
import HudPanel from "../components/HudPanel.vue";
import PolylineFlowHorizontalMaterialProperty from "../tools/PolylineFlowHorizontalMaterialProperty.js";

const Cesium = window.Cesium;
const sceneEl = ref(null);
const initialDevicePixelRatio = window.devicePixelRatio || 1;
const browserZoom = ref(1);
const initialized = ref(false);
const gameEntered = ref(false);
const enteringGame = ref(false);
const loadedResourceCount = ref(0);
const cameraMode = ref("chase");
const globalViewActive = ref(false);
const timeSliderHour = ref(new Date().getHours() + new Date().getMinutes() / 60);
const timeSliderOpen = ref(false);
const timeSliderTimeText = computed(() => {
  const hour = Math.floor(timeSliderHour.value);
  const minute = Math.floor((timeSliderHour.value - hour) * 60);
  const second = Math.floor((timeSliderHour.value * 3600) % 60);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`;
});
const timeSliderTrackEl = ref(null);
let timeSliderDragging = false;
const cameraHeight = ref(0);
const photoCapturing = ref(false);
const photos = ref([]);
const previewedPhoto = ref(null);
const photoPreview = reactive({
  scale: 1.25,
  rotation: 0,
  x: 0,
  y: 0,
  dragging: false,
});
const satelliteCameraOpen = ref(false);
const satelliteCameraEl = ref(null);
const satelliteCamera = reactive({
  fov: 12,
  pitch: 0,
  heading: 0,
  roll: 0,
  aspectRatio: 1.5,
  zoom: 1,
});
const satelliteCameraMaxZoom = computed(() => 1000);
const missionTasksCollapsed = ref(false);
const collapsedHud = reactive({
  stage: false,
  resources: false,
  maneuver: false,
  throttle: false,
  photo: false,
});
const missionState = reactive({
  launched: false,
  orbit: false,
  maneuverCount: 0,
  photosTaken: 0,
  downlinked: 0,
});
const missionTasks = computed(() => {
  const launched = missionState.launched;
  const orbit = missionState.orbit;
  const maneuver = missionState.maneuverCount > 0;
  const photoTaken = missionState.photosTaken >= 1;
  const photoDownlinked = missionState.downlinked >= 1;
  return [
    {
      id: 1,
      title: "发射火箭",
      status: launched ? "completed" : "active",
      detail: launched ? "点火完成" : "等待点火",
    },
    {
      id: 2,
      title: "卫星入轨",
      status: orbit ? "completed" : launched ? "active" : "locked",
      detail: orbit ? "帆板已展开" : "等待入轨",
    },
    {
      id: 3,
      title: "卫星变轨",
      status: maneuver ? "completed" : orbit ? "active" : "locked",
      detail: maneuver
        ? `已执行 ${missionState.maneuverCount} 次`
        : "至少执行一次变轨",
    },
    {
      id: 4,
      title: "执行任务",
      status: photoDownlinked
        ? "completed"
        : photoTaken
          ? "active"
          : maneuver
            ? "active"
            : "locked",
      detail: photoDownlinked
        ? "照片已下传"
        : photoTaken
          ? "已拍摄，等待下传"
          : "拍摄照片并下传给测控站",
    },
  ];
});
const completedMissionCount = computed(
  () => missionTasks.value.filter((task) => task.status === "completed").length,
);
let satelliteCameraViewer;
let satelliteFrustumPrimitive;
let dofStage;
const distantMarkersVisible = ref(false);
const maneuverDirection = ref("prograde");
const maneuverDeltaV = ref(100);
const maneuverFuel = ref(100);
const cameraDistanceText = computed(() => {
  const kilometers = cameraHeight.value / 1000;
  return kilometers >= 10000
    ? `${(kilometers / 10000).toFixed(1)} 万 km`
    : `${Math.round(kilometers).toLocaleString()} km`;
});
const maneuverPlan = reactive({
  active: false,
  armed: false,
  countdown: 0,
  nodeAngle: 0,
  plannedState: null,
  message: "",
});
const briefingVisible = ref(true);
const musicEnabled = ref(false);
let musicStarted = false;

function startMusicOnFirstInteraction() {
  if (musicStarted) return;
  musicStarted = true;
  if (!musicEnabled.value) toggleMusic();
}
const musicVolume = ref(0.42);
const musicMenuVisible = ref(false);
const settingsVisible = ref(false);
const DEFAULT_SCENE_SETTINGS = {
  token: "",
  atmosphere: true,
  depthOfField: false,
  fog: true,
  shadows: false,
  antialiasing: true,
  hdr: false,
  sun: true,
  moon: false,
  showFps: false,
  resolutionScale: 1,
  atmosphereIntensity: 12,
  fogDensity: 0.00015,
  shadowDarkness: 0.6,
  dofDistance: 800,
  dofRange: 500,
  dofBlur: 2,
};
const storedSceneSettings = (() => {
  try {
    return JSON.parse(localStorage.getItem("rocket-scene-settings") || "{}");
  } catch {
    return {};
  }
})();
const sceneSettings = reactive({
  ...DEFAULT_SCENE_SETTINGS,
  ...storedSceneSettings,
});
const sceneSettingOptions = [
  { key: "atmosphere", label: "大气效果", description: "地表大气层与天空散射" },
  { key: "depthOfField", label: "景深", description: "远距离场景焦外模糊" },
  { key: "fog", label: "雾效", description: "地平线及远景雾化" },
  { key: "shadows", label: "动态阴影", description: "模型及地表实时阴影" },
  { key: "antialiasing", label: "抗锯齿", description: "平滑模型和轨道边缘" },
  { key: "hdr", label: "高动态范围", description: "提升明暗层次和光照细节" },
  { key: "sun", label: "太阳光源", description: "启用太阳方向光照" },
  { key: "showFps", label: "显示帧率", description: "显示 Cesium 性能监视器" },
];
const selectedMusic = ref("vastness");
const MUSIC_PRESETS = [
  {
    id: "feedback-dreams",
    name: "Feedback Dreams",
    description: "背景音乐",
    src: B + "musics/bg/Feedback-Dreams.mp3",
  },
  {
    id: "opalescent",
    name: "Opalescent",
    description: "背景音乐",
    src: B + "musics/bg/Opalescent.mp3",
  },
  {
    id: "vastness",
    name: "Vastness",
    description: "背景音乐",
    src: B + "musics/bg/Vastness.mp3",
  },
  {
    id: "voxscape",
    name: "Voxscape",
    description: "背景音乐",
    src: B + "musics/bg/Voxscape.mp3",
  },
  {
    id: "xanthos",
    name: "Xanthos",
    description: "背景音乐",
    src: B + "musics/bg/Xanthos.mp3",
  },
];
const timeWarp = ref(1);
const timePaused = ref(false);
const hoveredControl = ref(null);
const crashDialogVisible = ref(false);
const launchCountdown = ref(null);
const systemMessage = reactive({ text: "", type: "info" });
let systemMessageTimer;
const RESOURCE_COUNT = 26;
const SKYBOX_SOURCES = {
  positiveX: B + "images/3/tycho2t3_80_px.jpg",
  negativeX: B + "images/3/tycho2t3_80_mx.jpg",
  positiveY: B + "images/3/tycho2t3_80_py.jpg",
  negativeY: B + "images/3/tycho2t3_80_my.jpg",
  positiveZ: B + "images/3/tycho2t3_80_pz.jpg",
  negativeZ: B + "images/3/tycho2t3_80_mz.jpg",
};
const GROUND_SKYBOX_SOURCES = {
  day: {
    positiveX: B + "images/skyBox_in/1/Right.png",
    negativeX: B + "images/skyBox_in/1/Left.png",
    positiveY: B + "images/skyBox_in/1/Back.png",
    negativeY: B + "images/skyBox_in/1/Front.png",
    positiveZ: B + "images/skyBox_in/1/Up.png",
    negativeZ: B + "images/skyBox_in/1/Down.png",
  },
  sunset: {
    positiveX: B + "images/skyBox_in/2/Right.png",
    negativeX: B + "images/skyBox_in/2/Left.png",
    positiveY: B + "images/skyBox_in/2/Back.png",
    negativeY: B + "images/skyBox_in/2/Front.png",
    positiveZ: B + "images/skyBox_in/2/Up.png",
    negativeZ: B + "images/skyBox_in/2/Down.png",
  },
  night: {
    positiveX: B + "images/skyBox_in/3/Right.png",
    negativeX: B + "images/skyBox_in/3/Left.png",
    positiveY: B + "images/skyBox_in/3/Back.png",
    negativeY: B + "images/skyBox_in/3/Front.png",
    positiveZ: B + "images/skyBox_in/3/Up.png",
    negativeZ: B + "images/skyBox_in/3/Down.png",
  },
};
const SKYBOX_SWITCH_HEIGHT = 10000;
let viewer;
let rocket;
let rocketModel;
let rocketHighlightModel;
let skyBox;
let currentSkyKey = "far";
const blendState = {
  active: false,
  startTime: null,
  pending: null,
  duration: 2000,
};
let lastBlendCompleteTime = 0;
let forceFarSkybox = false;
let trail;
let orbitRing;
let maneuverPreviewRing;
let maneuverNodeEntity;
const orbitApsisEntities = [];
const previewApsisEntities = [];
let orbitalState;
let smokeParticles;
const engineParticles = [];
const componentPoints = new Map();
const separationStates = new Map();
const ignitionSchedule = new Map();
let componentPickHandler;
const componentPopups = new Map();
let followTargetId = null;
let backgroundAudio;
let explosionEntity;
let explosionTimer;
let launchCountdownTimer;
let explosionStartedAt = 0;
const explosionParticles = [];
let engineLoopAudio;
let engineIgnitionAudio;
let explosionAudio;
let engineWasOn = false;
const ENGINE_LOOP_START = 0.35;
const ENGINE_LOOP_END_PADDING = 0.4;
let animationFrame;
let lastFrame = 0;
let lastTrailSample = 0;

const KERBIN_RADIUS = 600000;
const KERBIN_MU = 3.5316e12;
const DISPLAY_RADIUS = 6378137;
const LAUNCH_LON = 100.290703;
const LAUNCH_LAT = 40.958235;
const ROCKET_GROUND_OFFSET = 50;
const CAMERA_MIN_DISTANCE = 70;
const CAMERA_MAX_DISTANCE = 900;
const DISTANT_MARKER_DISTANCE = 1800;
const STATION_SCALE = 0.65;
const STATION_GROUND_OFFSET = 0;

const STATION_LON = 100.2908;
const STATION_LAT = 40.9581;
const STATION_HEADING = -132.1;
const STATION_HEIGHT = 0;
let stationModelRef = null;
const TRACKING_STATION_MODEL_DISTANCE = 250000;
const trackingStationEntities = [];
const GROUND_LINK_MAX_RANGE = 3200000;
const GROUND_LINK_MAX_ZENITH_ANGLE = Cesium.Math.toRadians(60);
let groundLinkEntity;
let selectedRadarStation;
let selectedRadarPrimitive;
let groundLinkStation;
const groundLinkActive = ref(false);
const groundLinkName = ref("");
const trackingStationSeed = [
  { name: "模拟测控站-01", lon: 128.4, lat: 45.6, heading: 18 },
  { name: "模拟测控站-02", lon: 78.2, lat: 38.1, heading: -22 },
  { name: "模拟测控站-03", lon: 111.8, lat: 20.4, heading: 35 },
  { name: "模拟测控站-04", lon: 106.7, lat: 33.6, heading: 8 },
  { name: "模拟测控站-05", lon: 118.6, lat: 41.2, heading: -15 },
  { name: "模拟测控站-06", lon: 122.1, lat: 35.2, heading: 26 },
  { name: "模拟测控站-07", lon: 108.2, lat: 31.8, heading: 9 },
  { name: "模拟测控站-08", lon: 99.4, lat: 26.7, heading: -18 },
  { name: "模拟测控站-09", lon: 116.9, lat: 25.1, heading: 14 },
  { name: "模拟测控站-10", lon: 114.8, lat: 27.4, heading: 24 },
  { name: "模拟测控站-11", lon: 113.2, lat: 23.8, heading: -8 },
  { name: "模拟测控站-12", lon: 97.1, lat: 41.8, heading: 12 },
  { name: "模拟测控站-13", lon: 109.8, lat: 19.1, heading: -12 },
  { name: "模拟测控站-14", lon: 110.2, lat: 36.4, heading: 17 },
  { name: "模拟测控站-15", lon: 92.7, lat: 30.5, heading: -20 },
  { name: "模拟测控站-16", lon: 103.4, lat: 35.8, heading: 7 },
  { name: "模拟测控站-17", lon: 88.9, lat: 42.6, heading: 22 },
  { name: "模拟测控站-18", lon: 105.6, lat: 29.8, heading: -14 },
  { name: "模拟测控站-19", lon: 107.2, lat: 23.5, heading: 11 },
  { name: "模拟测控站-20", lon: 124.9, lat: 46.2, heading: -9 },
  {
    name: "模拟境外站-A",
    lon: 68.5,
    lat: 26.2,
    heading: 15,
    category: "overseas",
  },
  {
    name: "模拟境外站-B",
    lon: 42.3,
    lat: -4.1,
    heading: -18,
    category: "overseas",
  },
  {
    name: "模拟境外站-C",
    lon: 16.8,
    lat: -24.4,
    heading: 16,
    category: "overseas",
  },
  {
    name: "模拟境外站-D",
    lon: -68.2,
    lat: -31.6,
    heading: 8,
    category: "overseas",
  },
  {
    name: "模拟境外站-E",
    lon: -66.8,
    lat: -36.4,
    heading: -12,
    category: "overseas",
  },
  { name: "模拟海基平台-01", lon: 151, lat: 9, heading: 20, category: "sea" },
  { name: "模拟海基平台-02", lon: 164, lat: -6, heading: -16, category: "sea" },
  { name: "模拟海基平台-03", lon: -154, lat: 3, heading: 12, category: "sea" },
  {
    name: "模拟海基平台-04",
    lon: 126,
    lat: -19,
    heading: -22,
    category: "sea",
  },
];
const trackingStations = Array.from({ length: 36 }, (_, index) => {
  const angle = index * 2.417 + 0.73;
  const longitude = ((Math.sin(angle) * 180 + 540) % 360) - 180;
  const latitude = Math.sin(angle * 1.71) * 68;
  const prefix = ["A", "B", "C"][index % 3];
  return {
    name: `${prefix}${String(index + 1).padStart(2, "0")}测站`,
    lon: Number(longitude.toFixed(3)),
    lat: Number(latitude.toFixed(3)),
    heading: Math.round((Math.sin(angle * 0.61) * 180) % 180),
  };
});

const controls = reactive({
  throttle: 1,
  pitch: 90,
  heading: 90,
  sas: true,
  rcs: false,
});
const flight = reactive({
  started: false,
  crashed: false,
  orbitAchieved: false,
  panelsDeployed: false,
  time: 0,
  altitude: 3,
  verticalSpeed: 0,
  horizontalSpeed: 0,
  longitude: LAUNCH_LON,
  latitude: LAUNCH_LAT,
  mass: 192000,
  thrust: 0,
  battery: 100,
});
const stages = reactive([
  {
    id: 5,
    label: "三级火箭",
    fuel: 100,
    dryMass: 5000,
    fuelMass: 15000,
    thrust: 430000,
    isp: 345,
    spent: false,
    propulsion: true,
  },
  {
    id: 4,
    label: "整流罩",
    fuel: 0,
    dryMass: 3000,
    fuelMass: 0,
    thrust: 0,
    isp: 1,
    spent: false,
    propulsion: false,
  },
  {
    id: 3,
    label: "二级火箭",
    fuel: 100,
    dryMass: 9000,
    fuelMass: 30000,
    thrust: 960000,
    isp: 330,
    spent: false,
    propulsion: true,
  },
  {
    id: 2,
    label: "一级火箭",
    fuel: 100,
    dryMass: 18000,
    fuelMass: 55000,
    thrust: 2300000,
    isp: 305,
    spent: false,
    propulsion: true,
  },
  {
    id: 1,
    label: "助推器",
    fuel: 100,
    dryMass: 12000,
    fuelMass: 40000,
    thrust: 3800000,
    isp: 275,
    spent: false,
    propulsion: true,
  },
]);
const activeStageId = ref(null);
const trailPositions = [];
const animationIndex = {
  stage1: 0,
  stage2: 1,
  stage3: 2,
  boosterFront: 3,
  boosterRear: 4,
  boosterAft: 5,
  boosterLeft: 6,
  fairingLeft: 7,
  fairingRight: 8,
  panelLeftBoom: 10,
  panelRightBoom: 11,
  panelLeft0: 12,
  panelLeft1: 13,
  panelLeft2: 14,
  panelRight0: 15,
  panelRight1: 16,
  panelRight2: 17,
};
const animatedModelNodeNames = [
  "Stage1",
  "Stage2",
  "Stage3",
  "Booster_F",
  "Booster_R",
  "Booster_A",
  "Booster_L",
  "Fairing_L_Parent",
  "Fairing_R_Parent",
  "Satellite",
  "Sat_Arm_L",
  "Sat_Arm_R",
  "Sat_Panel_L_0",
  "Sat_Panel_L_1",
  "Sat_Panel_L_2",
  "Sat_Panel_R_0",
  "Sat_Panel_R_1",
  "Sat_Panel_R_2",
];
const initialModelNodeMatrices = new Map();
const initialHighlightNodeMatrices = new Map();
const componentModelNodes = {
  1: ["Booster_F", "Booster_R", "Booster_A", "Booster_L"],
  2: ["Stage1"],
  3: ["Stage2"],
  4: ["Fairing_L_Parent", "Fairing_R_Parent"],
  5: ["Stage3"],
  6: ["Satellite"],
};
const mapIconCache = new Map();

function createMapIcon(type, color, size = 48) {
  const key = `${type}-${color}-${size}`;
  if (mapIconCache.has(key)) return mapIconCache.get(key);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  const center = size / 2;
  context.clearRect(0, 0, size, size);
  context.fillStyle = "#151a17";
  context.strokeStyle = "#080a08";
  context.lineWidth = 5;
  context.fillRect(3, 3, size - 6, size - 6);
  context.strokeRect(3, 3, size - 6, size - 6);
  context.strokeStyle = color;
  context.lineWidth = 3;
  context.strokeRect(7, 7, size - 14, size - 14);
  context.lineJoin = "round";
  context.lineCap = "round";
  context.fillStyle = color;

  if (type === "vehicle" || type === "satellite") {
    if (type === "vehicle") {
      context.beginPath();
      context.moveTo(center, 12);
      context.lineTo(center + 8, 24);
      context.lineTo(center + 7, 36);
      context.lineTo(center - 7, 36);
      context.lineTo(center - 8, 24);
      context.closePath();
      context.fill();
      context.strokeStyle = "#080a08";
      context.lineWidth = 2;
      context.stroke();
      context.fillStyle = "#080a08";
      context.fillRect(center - 3, 17, 6, 8);
      context.beginPath();
      context.moveTo(center - 8, 29);
      context.lineTo(center - 14, 36);
      context.moveTo(center + 8, 29);
      context.lineTo(center + 14, 36);
      context.stroke();
    } else {
      context.fillRect(center - 8, center - 6, 16, 12);
      context.strokeStyle = "#080a08";
      context.lineWidth = 2;
      context.strokeRect(center - 8, center - 6, 16, 12);
      context.fillStyle = color;
      context.fillRect(8, center - 7, 10, 14);
      context.fillRect(size - 18, center - 7, 10, 14);
      context.strokeStyle = color;
      context.beginPath();
      context.moveTo(center - 8, center);
      context.lineTo(18, center);
      context.moveTo(center + 8, center);
      context.lineTo(size - 18, center);
      context.stroke();
    }
  } else if (type === "station") {
    context.strokeStyle = color;
    context.lineWidth = 3;
    context.beginPath();
    context.arc(center, center - 2, 10, Math.PI * 0.15, Math.PI * 1.15);
    context.stroke();
    context.beginPath();
    context.moveTo(center - 8, center - 8);
    context.lineTo(center + 2, center + 2);
    context.lineTo(center - 6, center + 12);
    context.moveTo(center - 12, center + 12);
    context.lineTo(center + 7, center + 12);
    context.stroke();
  } else if (type === "maneuver") {
    context.strokeStyle = color;
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(14, center);
    context.lineTo(size - 14, center);
    context.moveTo(center, 14);
    context.lineTo(center, size - 14);
    context.stroke();
    context.fillStyle = color;
    context.font = "bold 11px Arial";
    context.textAlign = "center";
    context.fillText("DV", center, center + 4);
  } else {
    const upward = type === "ap";
    context.strokeStyle = color;
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(13, upward ? 31 : 17);
    context.lineTo(center, upward ? 17 : 31);
    context.lineTo(size - 13, upward ? 31 : 17);
    context.stroke();
    context.fillStyle = color;
    context.font = "bold 11px Arial";
    context.textAlign = "center";
    context.fillText(type.toUpperCase(), center, upward ? 39 : 14);
  }
  const image = canvas.toDataURL("image/png");
  mapIconCache.set(key, image);
  return image;
}
const componentDefinitions = [
  { id: 1, name: "助推器", offset: [0, 0, -31], drift: [5.5, 0, -1.5] },
  { id: 2, name: "一级火箭", offset: [0, 0, -28], drift: [-2.2, 0, -2.2] },
  { id: 3, name: "二级火箭", offset: [0, 0, -14], drift: [1.8, 0, -1.7] },
  { id: 4, name: "整流罩", offset: [0, 0, -2], drift: [3.8, 0, -1.2] },
  { id: 5, name: "三级火箭", offset: [0, 0, -5], drift: [-1.4, 0, -1.2] },
  { id: 6, name: "卫星", offset: [0, 0, 0], drift: [0, 0, 0] },
];
const boosterDefinitions = [
  {
    id: 1,
    popupId: "booster-1",
    boosterNumber: 1,
    name: "1号助推器",
    modelNodes: ["Booster_F"],
  },
  {
    id: 1,
    popupId: "booster-2",
    boosterNumber: 2,
    name: "2号助推器",
    modelNodes: ["Booster_R"],
  },
  {
    id: 1,
    popupId: "booster-3",
    boosterNumber: 3,
    name: "3号助推器",
    modelNodes: ["Booster_A"],
  },
  {
    id: 1,
    popupId: "booster-4",
    boosterNumber: 4,
    name: "4号助推器",
    modelNodes: ["Booster_L"],
  },
];
const componentCenterOffsets = {
  1: new Cesium.Cartesian3(0, 0, -30.6),
  2: new Cesium.Cartesian3(0, 0, -30.6),
  3: new Cesium.Cartesian3(0, 0, -11.76),
  4: new Cesium.Cartesian3(0, 0, 0.06),
  5: new Cesium.Cartesian3(0, 0, -4.14),
  6: new Cesium.Cartesian3(0, 0, 0.1),
  "booster-1": new Cesium.Cartesian3(2.64, 0, -30.66),
  "booster-2": new Cesium.Cartesian3(0, 2.64, -30.66),
  "booster-3": new Cesium.Cartesian3(-2.64, 0, -30.66),
  "booster-4": new Cesium.Cartesian3(0, -2.64, -30.66),
};
const componentColors = {
  booster: "#56b9e9",
  stage1: "#f0a24a",
  stage2: "#b48bea",
  fairing: "#c9d0d2",
  stage3: "#ef6262",
  satellite: "#83c95a",
};

function componentColor(definition) {
  return componentColors.satellite;
}

const activeStage = computed(() =>
  stages.find((s) => s.id === activeStageId.value),
);
const zoomCompensationStyle = computed(() => ({
  width: `${browserZoom.value * 100}%`,
  height: `${browserZoom.value * 100}%`,
  transform: `scale(${1 / browserZoom.value})`,
  transformOrigin: "0 0",
}));
const resourceProgress = computed(() =>
  Math.round((loadedResourceCount.value / RESOURCE_COUNT) * 100),
);
const currentStage = computed(() => activeStageId.value ?? 0);
const totalFuel = computed(() => {
  const propulsionStages = stages.filter((s) => s.propulsion);
  return (
    propulsionStages.reduce((sum, s) => sum + (s.spent ? 0 : s.fuel), 0) /
    propulsionStages.length
  );
});
const altitudeDigits = computed(() =>
  Math.max(0, Math.round(flight.altitude)).toString().padStart(6, "0"),
);
const missionTime = computed(() => {
  const m = Math.floor(flight.time / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(flight.time % 60)
    .toString()
    .padStart(2, "0");
  return `T+ ${m}:${s}`;
});
const situation = computed(() =>
  flight.orbitAchieved
    ? "轨道运行"
    : flight.altitude > 70000
      ? "太空飞行"
      : flight.started
        ? "上升中"
        : "发射台",
);
const speedMode = computed(() =>
  flight.altitude > 35000 ? "轨道速度" : "地表速度",
);
const speedDisplay = computed(() =>
  Math.hypot(flight.verticalSpeed, flight.horizontalSpeed).toFixed(1),
);
const headingText = computed(() =>
  Math.round(controls.heading).toString().padStart(3, "0"),
);
const maneuverCountdownText = computed(() => {
  const seconds = Math.max(0, Math.round(maneuverPlan.countdown));
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${(seconds % 60).toString().padStart(2, "0")}`;
});
const maneuverFuelCost = computed(() => maneuverDeltaV.value / 8);
const maneuverDirectionLabel = computed(
  () =>
    ({
      prograde: "轨道加速",
      retrograde: "轨道减速",
      normal: "左变轨",
      antinormal: "右变轨",
    })[maneuverDirection.value],
);
const plannedOrbitReadout = computed(() => {
  const state = maneuverPlan.plannedState;
  if (!state) return { ap: "---", pe: "---" };
  return {
    ap: (
      (state.semiMajorAxis * (1 + state.eccentricity) - KERBIN_RADIUS) /
      1000
    ).toFixed(0),
    pe: (
      (state.semiMajorAxis * (1 - state.eccentricity) - KERBIN_RADIUS) /
      1000
    ).toFixed(0),
  };
});
const navballStyle = computed(() => ({
  "--pitch": `${(controls.pitch - 45) * 1.25}px`,
  "--roll": `${90 - controls.heading}deg`,
}));

const orbit = computed(() => {
  if (flight.orbitAchieved && orbitalState?.semiMajorAxis) {
    return {
      ap: (
        (orbitalState.semiMajorAxis * (1 + orbitalState.eccentricity) -
          KERBIN_RADIUS) /
        1000
      ).toFixed(0),
      pe: (
        (orbitalState.semiMajorAxis * (1 - orbitalState.eccentricity) -
          KERBIN_RADIUS) /
        1000
      ).toFixed(0),
    };
  }
  if (flight.altitude < 100 || flight.horizontalSpeed < 50)
    return { ap: "---", pe: "---" };
  const r = KERBIN_RADIUS + flight.altitude;
  const v2 = flight.verticalSpeed ** 2 + flight.horizontalSpeed ** 2;
  const energy = v2 / 2 - KERBIN_MU / r;
  if (energy >= 0)
    return {
      ap: "逃逸",
      pe: Math.max(-600, flight.altitude / 1000).toFixed(0),
    };
  const a = -KERBIN_MU / (2 * energy);
  const h = r * flight.horizontalSpeed;
  const e = Math.sqrt(Math.max(0, 1 - (h * h) / (KERBIN_MU * a)));
  return {
    ap: ((a * (1 + e) - KERBIN_RADIUS) / 1000).toFixed(0),
    pe: ((a * (1 - e) - KERBIN_RADIUS) / 1000).toFixed(0),
  };
});

function signed(value) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}`;
}
function updateBrowserZoom() {
  const desktopZoom = (window.devicePixelRatio || 1) / initialDevicePixelRatio;
  const viewportZoom = window.visualViewport?.scale || 1;
  browserZoom.value = Math.max(0.5, Math.min(5, desktopZoom * viewportZoom));
}
function setThrottle(value) {
  controls.throttle = Math.max(0, Math.min(1, value));
}
function toggleSas() {
  controls.sas = !controls.sas;
  if (controls.sas) controls.rcs = false;
}
function toggleRcs() {
  controls.rcs = !controls.rcs;
  if (controls.rcs) controls.sas = false;
}

function onThrottleTrackDown(e) {
  const track = e.currentTarget;
  const update = (clientY) => {
    const rect = track.getBoundingClientRect();
    const ratio = 1 - (clientY - rect.top) / rect.height;
    setThrottle(ratio);
  };
  update(e.clientY);
  const onMove = (ev) => update(ev.clientY);
  const onUp = () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
  };
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
}
function toggleTimePause() {
  timePaused.value = !timePaused.value;
  if (timePaused.value) {
    engineLoopAudio?.pause();
    engineIgnitionAudio?.pause();
    explosionAudio?.pause();
    return;
  }
  if (
    engineIgnitionAudio &&
    engineIgnitionAudio.currentTime > 0 &&
    engineIgnitionAudio.currentTime < engineIgnitionAudio.duration
  ) {
    engineIgnitionAudio.play().catch(() => {});
  }
  if (
    explosionAudio &&
    flight.crashed &&
    explosionAudio.currentTime > 0 &&
    explosionAudio.currentTime < explosionAudio.duration
  ) {
    explosionAudio.play().catch(() => {});
  }
}
function skipMissionTime(seconds) {
  flight.time = Math.max(0, flight.time + seconds);
}
async function enterGame() {
  if (enteringGame.value || gameEntered.value) return;
  enteringGame.value = true;
  briefingVisible.value = true;
  setCamera("chase");
  await waitForCameraLock();
  gameEntered.value = true;
  await nextTick();
  enteringGame.value = false;
}
function waitForCameraLock() {
  return new Promise((resolve) => {
    let renderedFrames = 0;
    let stableFrames = 0;
    const removeListener = viewer.scene.postRender.addEventListener(() => {
      renderedFrames += 1;
      const height = viewer.camera.positionCartographic?.height ?? -1;
      if (viewer.trackedEntity && height > 10) stableFrames += 1;
      else stableFrames = 0;
      if (stableFrames < 4 && renderedFrames < 90) return;
      removeListener();
      resolve();
    });
  });
}
function setLaunchOverviewCamera() {
  if (!viewer) return;
  cameraMode.value = "overview";
  viewer.trackedEntity = undefined;
  const pos = Cesium.Cartesian3.fromDegrees(LAUNCH_LON - 0.006, LAUNCH_LAT, 1);
  viewer.camera.setView({
    destination: pos,
    orientation: {
      heading: Cesium.Math.toRadians(90),
      pitch: Cesium.Math.toRadians(25),
      roll: 0,
    },
  });
}
function ensureBackgroundAudio() {
  const preset =
    MUSIC_PRESETS.find((item) => item.id === selectedMusic.value) ||
    MUSIC_PRESETS[0];
  if (!backgroundAudio) {
    backgroundAudio = new Audio(preset.src);
    backgroundAudio.loop = true;
    backgroundAudio.preload = "auto";
  }
  if (!backgroundAudio.src.endsWith(preset.src))
    backgroundAudio.src = preset.src;
  backgroundAudio.volume = musicVolume.value;
}
async function toggleMusic() {
  ensureBackgroundAudio();
  musicEnabled.value = !musicEnabled.value;
  if (musicEnabled.value) {
    try {
      await backgroundAudio.play();
    } catch (error) {
      musicEnabled.value = false;
      console.warn("背景音乐播放失败", error);
    }
  } else {
    backgroundAudio.pause();
  }
}
function updateMusicVolume() {
  if (backgroundAudio) backgroundAudio.volume = musicVolume.value;
}
async function selectMusic(presetId) {
  selectedMusic.value = presetId;
  const preset = MUSIC_PRESETS.find((item) => item.id === presetId);
  if (!backgroundAudio) backgroundAudio = new Audio();
  backgroundAudio.pause();
  backgroundAudio.src = preset.src;
  backgroundAudio.loop = true;
  backgroundAudio.volume = musicVolume.value;
  musicEnabled.value = true;
  try {
    await backgroundAudio.play();
  } catch (error) {
    musicEnabled.value = false;
    console.warn("背景音乐播放失败", error);
  }
}
function applySceneSettings() {
  if (sceneSettings.token) Cesium.Ion.defaultAccessToken = sceneSettings.token;
  if (!viewer || viewer.isDestroyed()) return;
  const scene = viewer.scene;
  scene.globe.showGroundAtmosphere = sceneSettings.atmosphere;
  scene.skyAtmosphere.show = sceneSettings.atmosphere;
  scene.skyAtmosphere.perFragmentAtmosphere = true;
  scene.skyAtmosphere.brightnessShift = 0.03;
  scene.skyAtmosphere.saturationShift = 0.04;
  scene.skyAtmosphere.atmosphereLightIntensity =
    sceneSettings.atmosphereIntensity;
  scene.skyAtmosphere.atmosphereRayleighCoefficient = new Cesium.Cartesian3(
    5.5e-6,
    13.0e-6,
    28.4e-6,
  );
  scene.skyAtmosphere.atmosphereMieCoefficient = new Cesium.Cartesian3(
    21e-6,
    21e-6,
    21e-6,
  );
  scene.fog.enabled = sceneSettings.fog;
  scene.fog.density = sceneSettings.fogDensity;
  scene.fog.screenSpaceErrorFactor = 4;
  scene.globe.enableLighting = true;
  scene.globe.dynamicAtmosphereLighting = true;
  scene.globe.dynamicAtmosphereLightingFromSun = true;
  scene.globe.lightingFadeOutDistance = 1.0e9;
  scene.globe.lightingFadeInDistance = 1.1e9;
  scene.globe.nightFadeOutDistance = 1.0e9;
  scene.globe.nightFadeInDistance = 1.1e9;
  scene.globe.atmosphereLightIntensity = sceneSettings.atmosphereIntensity;
  scene.highDynamicRange = sceneSettings.hdr;
  scene.sun.show = sceneSettings.sun;
  scene.moon.show = false;
  scene.debugShowFramesPerSecond = sceneSettings.showFps;
  viewer.resolutionScale = sceneSettings.resolutionScale;
  for (let index = 0; index < viewer.imageryLayers.length; index += 1) {
    const layer = viewer.imageryLayers.get(index);
    layer.dayAlpha = 1;
    layer.nightAlpha = 0.06;
  }
  scene.globe.maximumScreenSpaceError =
    sceneSettings.resolutionScale > 1 ? 1.8 : 2.5;
  viewer.shadows = sceneSettings.shadows;
  const shadowMode = sceneSettings.shadows
    ? Cesium.ShadowMode.ENABLED
    : Cesium.ShadowMode.DISABLED;
  scene.globe.shadows = shadowMode;
  scene.shadowMap.enabled = sceneSettings.shadows;
  scene.shadowMap.softShadows = sceneSettings.shadows;
  scene.shadowMap.darkness = sceneSettings.shadowDarkness;
  if (rocketModel) rocketModel.shadows = shadowMode;
  if (rocketHighlightModel) rocketHighlightModel.shadows = shadowMode;
  if (stationModelRef) stationModelRef.shadows = shadowMode;
  trackingStationEntities.forEach((entity) => {
    if (entity.model) entity.model.shadows = shadowMode;
  });
  if (dofStage) dofStage.enabled = sceneSettings.depthOfField;
  scene.postProcessStages.bloom.enabled = false;
  scene.postProcessStages.fxaa.enabled = sceneSettings.antialiasing;
}
function saveSceneSettings() {
  applySceneSettings();
  localStorage.setItem("rocket-scene-settings", JSON.stringify(sceneSettings));
  settingsVisible.value = false;
}
function resetSceneSettings() {
  Object.assign(sceneSettings, DEFAULT_SCENE_SETTINGS);
  applySceneSettings();
  localStorage.removeItem("rocket-scene-settings");
}
function exitToHome() {
  resetMission();
  gameEntered.value = false;
}

function stageStatusText(stage) {
  if (stage.spent) return stage.id === 4 ? "已抛离" : "已分离";
  if (stage.id !== activeStageId.value) return "待命";
  if (
    ignitionSchedule.has(stage.id) &&
    flight.time < ignitionSchedule.get(stage.id)
  )
    return "等待点火";
  return stage.propulsion ? "点火中" : "准备抛离";
}

function activateStage() {
  if (!gameEntered.value) return;
  if (flight.crashed || flight.orbitAchieved) return;
  ensureEngineAudio();
  if (!flight.started) {
    startLaunchCountdown();
    return;
  }
  const current = activeStage.value;
  if (current && !current.spent) {
    playStageSeparation(current.id);
    separationStates.set(current.id, { time: performance.now() });
    current.spent = true;
    flight.mass -= current.dryMass + (current.fuelMass * current.fuel) / 100;
  }
  const next = stages
    .filter((s) => !s.spent && s.id > (activeStageId.value || 0))
    .sort((a, b) => a.id - b.id)[0];
  activeStageId.value = next?.id ?? null;
  if (next?.propulsion) ignitionSchedule.set(next.id, flight.time + 2.2);
  followComponent(next?.id ?? 6);
}

function speakCountdown(text) {
  if (!("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "zh-CN";
  utterance.rate = 0.82;
  utterance.pitch = 0.9;
  utterance.volume = 1;
  window.speechSynthesis.speak(utterance);
}

function startLaunchCountdown() {
  if (launchCountdown.value !== null) return;
  launchCountdown.value = 3;
  speakCountdown("三");
  launchCountdownTimer = window.setInterval(() => {
    if (launchCountdown.value > 1) {
      launchCountdown.value -= 1;
      speakCountdown(launchCountdown.value === 2 ? "二" : "一");
      return;
    }
    window.clearInterval(launchCountdownTimer);
    launchCountdownTimer = null;
    launchCountdown.value = null;
    speakCountdown("点火");
    igniteLaunch();
  }, 1000);
}

function igniteLaunch() {
  missionState.launched = true;
  flight.started = true;
  activeStageId.value = 1;
  controls.throttle = 1;
  engineIgnitionAudio.currentTime = 0;
  engineIgnitionAudio.volume = 0.72;
  engineIgnitionAudio.play().catch(() => {});
  engineLoopAudio.currentTime = ENGINE_LOOP_START;
  engineLoopAudio.volume = 0.68;
  engineLoopAudio.play().catch(() => {});
  engineWasOn = true;
  setCamera("chase");
}

function ensureEngineAudio() {
  if (engineLoopAudio) return;
  engineLoopAudio = new Audio(B + "sounds/rocket-engine.mp3");
  engineLoopAudio.preload = "auto";
  engineLoopAudio.loop = false;
  engineIgnitionAudio = new Audio(B + "sounds/rocket-ignition.mp3");
  engineIgnitionAudio.preload = "auto";
  explosionAudio = new Audio(B + "sounds/rocket-explosion.mp3");
  explosionAudio.preload = "auto";
}

function updateEngineSound() {
  if (!engineLoopAudio || !engineIgnitionAudio) return;
  if (timePaused.value) {
    engineLoopAudio.pause();
    engineIgnitionAudio.pause();
    return;
  }
  const engineOn =
    flight.started &&
    !flight.crashed &&
    !flight.orbitAchieved &&
    flight.thrust > 0;
  engineLoopAudio.volume = Math.min(0.72, controls.throttle * 0.68);
  engineLoopAudio.playbackRate = 0.88 + controls.throttle * 0.18;
  if (
    engineOn &&
    Number.isFinite(engineLoopAudio.duration) &&
    engineLoopAudio.currentTime >=
      engineLoopAudio.duration - ENGINE_LOOP_END_PADDING
  ) {
    engineLoopAudio.currentTime = ENGINE_LOOP_START;
  }
  if (engineOn && engineLoopAudio.paused && engineWasOn)
    engineLoopAudio.play().catch(() => {});
  if (engineOn && !engineWasOn) {
    engineIgnitionAudio.currentTime = 0;
    engineIgnitionAudio.volume = 0.72;
    engineIgnitionAudio.play().catch(() => {});
    engineLoopAudio.currentTime = ENGINE_LOOP_START;
    engineLoopAudio.play().catch(() => {});
  } else if (!engineOn && engineWasOn) {
    engineLoopAudio.pause();
  }
  engineWasOn = engineOn;
}

function resetMission() {
  closeComponentPopup();
  Object.assign(missionState, {
    launched: false,
    orbit: false,
    maneuverCount: 0,
    photosTaken: 0,
    downlinked: 0,
  });
  missionTasksCollapsed.value = false;
  Object.keys(collapsedHud).forEach((key) => {
    collapsedHud[key] = false;
  });
  satelliteCameraOpen.value = false;
  destroySatelliteCamera();
  photos.value = [];
  previewedPhoto.value = null;
  groundLinkActive.value = false;
  groundLinkStation = null;
  if (groundLinkEntity) groundLinkEntity.show = false;
  if (selectedRadarPrimitive && viewer)
    viewer.scene.primitives.remove(selectedRadarPrimitive);
  selectedRadarPrimitive = null;
  selectedRadarStation = null;
  if (systemMessageTimer) window.clearTimeout(systemMessageTimer);
  systemMessageTimer = null;
  systemMessage.text = "";
  if (launchCountdownTimer) window.clearInterval(launchCountdownTimer);
  launchCountdownTimer = null;
  launchCountdown.value = null;
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  Object.assign(flight, {
    started: false,
    crashed: false,
    orbitAchieved: false,
    panelsDeployed: false,
    time: 0,
    altitude: 3,
    verticalSpeed: 0,
    horizontalSpeed: 0,
    longitude: LAUNCH_LON,
    latitude: LAUNCH_LAT,
    mass: 192000,
    thrust: 0,
    battery: 100,
  });
  Object.assign(controls, {
    throttle: 1,
    pitch: 90,
    heading: 90,
    sas: true,
    rcs: false,
  });
  timeWarp.value = 1;
  timePaused.value = false;
  maneuverDirection.value = "prograde";
  maneuverDeltaV.value = 100;
  maneuverFuel.value = 100;
  cancelManeuverPlan();
  hoveredControl.value = null;
  distantMarkersVisible.value = false;
  stages.forEach((s) => {
    s.fuel = 100;
    s.spent = false;
  });
  separationStates.clear();
  ignitionSchedule.clear();
  restoreRocketModelState();
  restoreHighlightModelState();
  clearExplosion();
  crashDialogVisible.value = false;
  engineWasOn = false;
  if (engineIgnitionAudio) {
    engineIgnitionAudio.pause();
    engineIgnitionAudio.currentTime = 0;
  }
  if (engineLoopAudio) {
    engineLoopAudio.pause();
    engineLoopAudio.currentTime = ENGINE_LOOP_START;
  }
  if (explosionAudio) {
    explosionAudio.pause();
    explosionAudio.currentTime = 0;
  }
  activeStageId.value = null;
  briefingVisible.value = true;
  trailPositions.length = 0;
  lastTrailSample = 0;
  if (trail)
    trail.polyline.positions = new Cesium.CallbackProperty(
      () => trailPositions,
      false,
    );
  if (orbitRing) {
    viewer?.entities.remove(orbitRing);
    orbitRing = null;
  }
  clearApsisMarkers(orbitApsisEntities);
  orbitalState = null;
  engineParticles.forEach((particles) => {
    particles.show = false;
    particles.time = 0;
  });
  if (smokeParticles) {
    smokeParticles.show = false;
    smokeParticles.time = 0;
  }
  if (viewer) {
    viewer.selectedEntity = undefined;
    viewer.trackedEntity = undefined;
  }
  setCamera("chase");
}

function captureRocketModelState() {
  if (!rocketModel?.getNode || initialModelNodeMatrices.size > 0) return;
  animatedModelNodeNames.forEach((name) => {
    const node = rocketModel.getNode(name);
    if (node?.matrix) {
      initialModelNodeMatrices.set(name, Cesium.Matrix4.clone(node.matrix));
    }
  });
}

function restoreRocketModelState() {
  if (!rocketModel) return;
  rocketModel.activeAnimations?.removeAll();
  animatedModelNodeNames.forEach((name) => {
    const node = rocketModel.getNode?.(name);
    if (!node) return;
    node.show = true;
    const initialMatrix = initialModelNodeMatrices.get(name);
    if (initialMatrix) node.matrix = Cesium.Matrix4.clone(initialMatrix);
  });
  rocketModel.modelMatrix = rocketModelMatrix();
  rocketModel.show = true;
}

function playAnimations(indices) {
  if (!rocketModel?.activeAnimations) return;
  const start = viewer.clock.currentTime.clone();
  [rocketModel, rocketHighlightModel].forEach((model) => {
    if (!model?.activeAnimations) return;
    indices.forEach((index) => {
      model.activeAnimations.add({
        index,
        loop: Cesium.ModelAnimationLoop.NONE,
        multiplier: 1.35,
        start,
      });
    });
  });
}

function playStageSeparation(stageId) {
  if (stageId === 1) {
    playAnimations([
      animationIndex.boosterFront,
      animationIndex.boosterRear,
      animationIndex.boosterAft,
      animationIndex.boosterLeft,
    ]);
  } else if (stageId === 2) {
    playAnimations([animationIndex.stage1]);
  } else if (stageId === 3) {
    playAnimations([animationIndex.stage2]);
  } else if (stageId === 4) {
    playAnimations([animationIndex.fairingLeft, animationIndex.fairingRight]);
  } else if (stageId === 5) {
    playAnimations([animationIndex.stage3]);
  }
}

function deploySolarPanels() {
  if (!flight.started || flight.crashed || flight.panelsDeployed) return;
  flight.panelsDeployed = true;
  playAnimations([
    animationIndex.panelLeftBoom,
    animationIndex.panelRightBoom,
    animationIndex.panelLeft0,
    animationIndex.panelLeft1,
    animationIndex.panelLeft2,
    animationIndex.panelRight0,
    animationIndex.panelRight1,
    animationIndex.panelRight2,
  ]);
}

function updateBattery(dt) {
  const baseLoad = 0.012;
  const sasLoad = controls.sas ? 0.008 : 0;
  const rcsLoad = controls.rcs ? 0.02 : 0;
  const flightLoad = flight.thrust > 0 ? 0.004 * controls.throttle : 0;
  const sunlight = Math.max(
    0,
    Math.sin(Cesium.Math.toRadians(flight.longitude + 20)),
  );
  const solarCharge = flight.panelsDeployed ? 0.055 * sunlight : 0;
  flight.battery = Math.max(
    0,
    Math.min(
      100,
      flight.battery +
        (solarCharge - baseLoad - sasLoad - rcsLoad - flightLoad) * dt,
    ),
  );
}

function updatePhysics(dt) {
  if (!flight.started || flight.crashed || timePaused.value) return;
  dt = Math.min(dt * timeWarp.value, 0.2);
  flight.time += dt;
  updateBattery(dt);

  if (flight.orbitAchieved) {
    if (orbitalState) {
      const trueAnomaly = orbitalState.angle - orbitalState.argumentOfPeriapsis;
      let physicalRadius =
        orbitalState.semiLatusRectum /
        (1 + orbitalState.eccentricity * Math.cos(trueAnomaly));
      orbitalState.angle +=
        (orbitalState.angularMomentum / (physicalRadius * physicalRadius)) * dt;
      const updatedAnomaly =
        orbitalState.angle - orbitalState.argumentOfPeriapsis;
      physicalRadius =
        orbitalState.semiLatusRectum /
        (1 + orbitalState.eccentricity * Math.cos(updatedAnomaly));
      const position = getOrbitalCartesian(orbitalState, orbitalState.angle);
      const cartographic = Cesium.Cartographic.fromCartesian(position);
      flight.longitude = Cesium.Math.toDegrees(cartographic.longitude);
      flight.latitude = Cesium.Math.toDegrees(cartographic.latitude);
      flight.altitude = Math.max(10000, physicalRadius - KERBIN_RADIUS);
      flight.horizontalSpeed = Math.sqrt(
        KERBIN_MU * (2 / physicalRadius - 1 / orbitalState.semiMajorAxis),
      );
      flight.verticalSpeed = 0;
      updateManeuverPlan();
    }
    flight.thrust = 0;
    return;
  }

  if (controls.sas) {
    const targetPitch =
      flight.altitude < 1000
        ? 90
        : Math.max(2, 90 - (flight.altitude - 1000) / 950);
    controls.pitch += (targetPitch - controls.pitch) * Math.min(1, dt * 0.7);
    controls.heading += (90 - controls.heading) * Math.min(1, dt * 0.8);
  }

  const stage = activeStage.value;
  let thrust = 0;
  const ignitionReady =
    !stage ||
    !ignitionSchedule.has(stage.id) ||
    flight.time >= ignitionSchedule.get(stage.id);
  if (stage && ignitionReady && stage.fuel > 0 && controls.throttle > 0) {
    thrust = stage.thrust * controls.throttle;
    const burn = (thrust / (stage.isp * 9.80665)) * dt;
    const fuelUsedPercent = (burn / stage.fuelMass) * 100;
    stage.fuel = Math.max(0, stage.fuel - fuelUsedPercent);
    flight.mass = Math.max(7000, flight.mass - burn);
    if (stage.fuel <= 0) controls.throttle = Math.max(controls.throttle, 0.01);
  }
  flight.thrust = thrust;

  const pitch = Cesium.Math.toRadians(controls.pitch);
  const radius = KERBIN_RADIUS + flight.altitude;
  const gravity = KERBIN_MU / (radius * radius);
  const density =
    Math.exp(-Math.max(0, flight.altitude) / 6500) *
    Math.max(0, 1 - flight.altitude / 70000);
  const speed = Math.hypot(flight.verticalSpeed, flight.horizontalSpeed);
  const drag =
    (0.5 * density * speed * speed * 0.28 * 8) / Math.max(1, flight.mass);
  const thrustAccel = thrust / Math.max(1, flight.mass);
  flight.verticalSpeed +=
    (thrustAccel * Math.sin(pitch) -
      gravity +
      flight.horizontalSpeed ** 2 / radius -
      drag * (speed ? flight.verticalSpeed / speed : 0)) *
    dt;
  flight.horizontalSpeed +=
    (thrustAccel * Math.cos(pitch) -
      drag * (speed ? flight.horizontalSpeed / speed : 0)) *
    dt;
  flight.altitude += flight.verticalSpeed * dt;
  flight.longitude += Cesium.Math.toDegrees(
    (flight.horizontalSpeed / (DISPLAY_RADIUS + flight.altitude)) * dt,
  );

  if (flight.altitude <= 0 && flight.time > 2) {
    flight.altitude = 0;
    flight.crashed = true;
    flight.thrust = 0;
    triggerCrashExplosion();
  }
  const thirdStageSeparated = stages.find((stage) => stage.id === 5)?.spent;
  if (
    thirdStageSeparated &&
    flight.altitude > 70000 &&
    flight.horizontalSpeed > 100
  ) {
    flight.orbitAchieved = true;
    missionState.orbit = true;
    flight.thrust = 0;
    deploySolarPanels();
    createOrbitRing();
  }
}

function createOrbitRing() {
  if (!viewer || orbitRing) return;
  const currentPosition = rocketPosition();
  const radial = Cesium.Cartesian3.normalize(
    currentPosition,
    new Cesium.Cartesian3(),
  );
  const heading = Cesium.Math.toRadians(controls.heading);
  const localTangent = new Cesium.Cartesian3(
    Math.sin(heading),
    Math.cos(heading),
    0,
  );
  const tangent = Cesium.Cartesian3.normalize(
    Cesium.Matrix4.multiplyByPointAsVector(
      Cesium.Transforms.eastNorthUpToFixedFrame(currentPosition),
      localTangent,
      new Cesium.Cartesian3(),
    ),
    new Cesium.Cartesian3(),
  );
  const physicalRadius = KERBIN_RADIUS + flight.altitude;
  orbitalState = {
    radial: Cesium.Cartesian3.clone(radial),
    tangent: Cesium.Cartesian3.clone(tangent),
    angle: 0,
    argumentOfPeriapsis: 0,
    eccentricity: 0,
    semiMajorAxis: physicalRadius,
    semiLatusRectum: physicalRadius,
    angularMomentum: Math.sqrt(KERBIN_MU * physicalRadius),
  };
  orbitRing = createOrbitPolyline(orbitalState, "#d89a35", 0.9, 2.5);
  createApsisMarkers(orbitalState, false);
}

function getOrbitalCartesian(state, angle) {
  const trueAnomaly = angle - state.argumentOfPeriapsis;
  const physicalRadius =
    state.semiLatusRectum / (1 + state.eccentricity * Math.cos(trueAnomaly));
  const displayRadius =
    DISPLAY_RADIUS + (physicalRadius - KERBIN_RADIUS) + ROCKET_GROUND_OFFSET;
  const direction = Cesium.Cartesian3.add(
    Cesium.Cartesian3.multiplyByScalar(
      state.radial,
      Math.cos(angle),
      new Cesium.Cartesian3(),
    ),
    Cesium.Cartesian3.multiplyByScalar(
      state.tangent,
      Math.sin(angle),
      new Cesium.Cartesian3(),
    ),
    new Cesium.Cartesian3(),
  );
  const rawPosition = Cesium.Cartesian3.multiplyByScalar(
    direction,
    displayRadius,
    new Cesium.Cartesian3(),
  );
  const cartographic = Cesium.Cartographic.fromCartesian(rawPosition);
  return Cesium.Cartesian3.fromRadians(
    cartographic.longitude,
    cartographic.latitude,
    physicalRadius - KERBIN_RADIUS + ROCKET_GROUND_OFFSET,
  );
}

function createOrbitPolyline(state, color, alpha, width, dashed = false) {
  const positions = [];
  const segments = 256;
  for (let index = 0; index <= segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2;
    positions.push(getOrbitalCartesian(state, angle));
  }
  return viewer.entities.add({
    name: dashed ? "预测轨道" : "卫星轨道",
    show: cameraMode.value === "orbit",
    polyline: {
      positions,
      width,
      material: dashed
        ? new Cesium.PolylineDashMaterialProperty({
            color: Cesium.Color.fromCssColorString(color).withAlpha(alpha),
            dashLength: 14,
          })
        : new Cesium.ColorMaterialProperty(
            Cesium.Color.fromCssColorString(color).withAlpha(alpha),
          ),
    },
  });
}

function createApsisMarkers(state, preview) {
  const target = preview ? previewApsisEntities : orbitApsisEntities;
  clearApsisMarkers(target);
  const colorCss = preview ? "#73d7df" : "#e0a33b";
  const color = Cesium.Color.fromCssColorString(colorCss);
  const apsides = [
    {
      type: "PE",
      angle: state.argumentOfPeriapsis,
      radius: state.semiMajorAxis * (1 - state.eccentricity),
    },
    {
      type: "AP",
      angle: state.argumentOfPeriapsis + Math.PI,
      radius: state.semiMajorAxis * (1 + state.eccentricity),
    },
  ];
  apsides.forEach((apsis) => {
    const altitude = (apsis.radius - KERBIN_RADIUS) / 1000;
    target.push(
      viewer.entities.add({
        name: `${preview ? "预测" : ""}${apsis.type}`,
        show: cameraMode.value === "orbit",
        position: getOrbitalCartesian(state, apsis.angle),
        billboard: {
          image: createMapIcon(apsis.type.toLowerCase(), colorCss, 48),
          width: preview ? 24 : 30,
          height: preview ? 24 : 30,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          disableDepthTestDistance: TRACKING_STATION_MODEL_DISTANCE,
        },
        label: {
          text: `${preview ? "预测 " : ""}${apsis.type}  ${altitude.toFixed(0)} km`,
          font: preview ? "10px Microsoft YaHei" : "bold 11px Microsoft YaHei",
          fillColor: color,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 3,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          disableDepthTestDistance: TRACKING_STATION_MODEL_DISTANCE,
          pixelOffset: new Cesium.Cartesian2(0, preview ? -32 : -38),
        },
      }),
    );
  });
}

function clearApsisMarkers(collection) {
  if (viewer) {
    collection.forEach((entity) => viewer.entities.remove(entity));
  }
  collection.length = 0;
}

function normalizeAngle(angle) {
  const fullTurn = Math.PI * 2;
  return ((angle % fullTurn) + fullTurn) % fullTurn;
}

function showSystemMessage(text, type = "info") {
  systemMessage.text = text;
  systemMessage.type = type;
  if (systemMessageTimer) window.clearTimeout(systemMessageTimer);
  systemMessageTimer = window.setTimeout(() => {
    systemMessage.text = "";
    systemMessageTimer = null;
  }, 3200);
}

function rejectManeuver(message) {
  maneuverPlan.message = message;
  showSystemMessage(message, "error");
}

function createManeuverPlan() {
  if (!flight.orbitAchieved) {
    rejectManeuver("卫星尚未入轨，无法创建变轨节点");
    return;
  }
  if (!orbitalState) {
    rejectManeuver("轨道状态尚未初始化，请稍后重试");
    return;
  }
  if (maneuverPlan.active) {
    rejectManeuver("已有机动节点，请先执行或取消");
    return;
  }
  if (!Number.isFinite(maneuverDeltaV.value) || maneuverDeltaV.value <= 0) {
    rejectManeuver("速度增量必须大于 0 m/s");
    return;
  }
  if (maneuverFuel.value <= 0) {
    rejectManeuver("机动推进剂已耗尽");
    return;
  }
  if (maneuverDeltaV.value / 8 > maneuverFuel.value) {
    rejectManeuver("机动推进剂不足，请降低速度增量");
    return;
  }
  cancelManeuverPlan();
  const nodeAngle = orbitalState.angle + Cesium.Math.toRadians(20);
  const nodeAnomaly = nodeAngle - orbitalState.argumentOfPeriapsis;
  const burnRadius =
    orbitalState.semiLatusRectum /
    (1 + orbitalState.eccentricity * Math.cos(nodeAnomaly));
  const currentSpeed = Math.sqrt(
    KERBIN_MU * (2 / burnRadius - 1 / orbitalState.semiMajorAxis),
  );
  const planeChange = ["normal", "antinormal"].includes(
    maneuverDirection.value,
  );
  let plannedState;
  if (planeChange) {
    const positionDirection = Cesium.Cartesian3.normalize(
      Cesium.Cartesian3.add(
        Cesium.Cartesian3.multiplyByScalar(
          orbitalState.radial,
          Math.cos(nodeAngle),
          new Cesium.Cartesian3(),
        ),
        Cesium.Cartesian3.multiplyByScalar(
          orbitalState.tangent,
          Math.sin(nodeAngle),
          new Cesium.Cartesian3(),
        ),
        new Cesium.Cartesian3(),
      ),
      new Cesium.Cartesian3(),
    );
    const velocityDirection = Cesium.Cartesian3.normalize(
      Cesium.Cartesian3.add(
        Cesium.Cartesian3.multiplyByScalar(
          orbitalState.radial,
          -Math.sin(nodeAngle),
          new Cesium.Cartesian3(),
        ),
        Cesium.Cartesian3.multiplyByScalar(
          orbitalState.tangent,
          Math.cos(nodeAngle),
          new Cesium.Cartesian3(),
        ),
        new Cesium.Cartesian3(),
      ),
      new Cesium.Cartesian3(),
    );
    const orbitNormal = Cesium.Cartesian3.normalize(
      Cesium.Cartesian3.cross(
        positionDirection,
        velocityDirection,
        new Cesium.Cartesian3(),
      ),
      new Cesium.Cartesian3(),
    );
    const changeAngle =
      2 *
      Math.asin(Math.min(0.95, maneuverDeltaV.value / (2 * currentSpeed))) *
      (maneuverDirection.value === "normal" ? 1 : -1);
    const rotatedVelocity = Cesium.Cartesian3.normalize(
      Cesium.Cartesian3.add(
        Cesium.Cartesian3.multiplyByScalar(
          velocityDirection,
          Math.cos(changeAngle),
          new Cesium.Cartesian3(),
        ),
        Cesium.Cartesian3.multiplyByScalar(
          orbitNormal,
          Math.sin(changeAngle),
          new Cesium.Cartesian3(),
        ),
        new Cesium.Cartesian3(),
      ),
      new Cesium.Cartesian3(),
    );
    const radial = Cesium.Cartesian3.normalize(
      Cesium.Cartesian3.add(
        Cesium.Cartesian3.multiplyByScalar(
          positionDirection,
          Math.cos(nodeAngle),
          new Cesium.Cartesian3(),
        ),
        Cesium.Cartesian3.multiplyByScalar(
          rotatedVelocity,
          -Math.sin(nodeAngle),
          new Cesium.Cartesian3(),
        ),
        new Cesium.Cartesian3(),
      ),
      new Cesium.Cartesian3(),
    );
    const tangent = Cesium.Cartesian3.normalize(
      Cesium.Cartesian3.add(
        Cesium.Cartesian3.multiplyByScalar(
          positionDirection,
          Math.sin(nodeAngle),
          new Cesium.Cartesian3(),
        ),
        Cesium.Cartesian3.multiplyByScalar(
          rotatedVelocity,
          Math.cos(nodeAngle),
          new Cesium.Cartesian3(),
        ),
        new Cesium.Cartesian3(),
      ),
      new Cesium.Cartesian3(),
    );
    plannedState = {
      ...orbitalState,
      radial,
      tangent,
      angle: nodeAngle,
    };
  } else {
    const signedDeltaV =
      (maneuverDirection.value === "prograde" ? 1 : -1) * maneuverDeltaV.value;
    const burnSpeed = currentSpeed + signedDeltaV;
    const energy = burnSpeed * burnSpeed * 0.5 - KERBIN_MU / burnRadius;
    if (burnSpeed <= 0 || energy >= 0) {
      rejectManeuver("该速度增量将导致轨道逃逸，无法创建节点");
      return;
    }
    const semiMajorAxis = -KERBIN_MU / (2 * energy);
    const oppositeRadius = semiMajorAxis * 2 - burnRadius;
    if (oppositeRadius <= KERBIN_RADIUS + 10000) {
      rejectManeuver("预测近拱点低于 10 km 安全高度");
      return;
    }
    const periapsis = Math.min(burnRadius, oppositeRadius);
    const apoapsis = Math.max(burnRadius, oppositeRadius);
    const eccentricity = (apoapsis - periapsis) / (apoapsis + periapsis);
    const burnAtPeriapsis = burnRadius <= oppositeRadius;
    plannedState = {
      radial: Cesium.Cartesian3.clone(orbitalState.radial),
      tangent: Cesium.Cartesian3.clone(orbitalState.tangent),
      angle: nodeAngle,
      argumentOfPeriapsis: burnAtPeriapsis ? nodeAngle : nodeAngle - Math.PI,
      eccentricity,
      semiMajorAxis,
      semiLatusRectum: semiMajorAxis * (1 - eccentricity * eccentricity),
      angularMomentum: burnRadius * burnSpeed,
    };
  }
  maneuverPlan.active = true;
  maneuverPlan.armed = false;
  maneuverPlan.nodeAngle = nodeAngle;
  maneuverPlan.plannedState = plannedState;
  maneuverPlan.message = "机动节点已创建";
  showSystemMessage("机动节点创建成功", "success");
  maneuverPreviewRing = createOrbitPolyline(
    plannedState,
    "#73d7df",
    0.9,
    2.5,
    true,
  );
  createApsisMarkers(plannedState, true);
  maneuverNodeEntity = viewer.entities.add({
    name: "机动节点",
    show: cameraMode.value === "orbit",
    position: getOrbitalCartesian(orbitalState, nodeAngle),
    billboard: {
      image: createMapIcon("maneuver", "#e6534f", 48),
      width: 30,
      height: 30,
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      verticalOrigin: Cesium.VerticalOrigin.CENTER,
      disableDepthTestDistance: TRACKING_STATION_MODEL_DISTANCE,
    },
    label: {
      text: "机动节点",
      font: "11px Microsoft YaHei",
      fillColor: Cesium.Color.fromCssColorString("#e6534f"),
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 3,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -38),
      disableDepthTestDistance: TRACKING_STATION_MODEL_DISTANCE,
    },
  });
  updateManeuverPlan();
}

function armManeuver() {
  if (!maneuverPlan.active) return;
  maneuverPlan.armed = true;
  maneuverPlan.message = "等待到达机动节点";
}

function updateManeuverPlan() {
  if (!maneuverPlan.active || !orbitalState) return;
  const remainingAngle = normalizeAngle(
    maneuverPlan.nodeAngle - orbitalState.angle,
  );
  const anomaly = orbitalState.angle - orbitalState.argumentOfPeriapsis;
  const radius =
    orbitalState.semiLatusRectum /
    (1 + orbitalState.eccentricity * Math.cos(anomaly));
  const angularRate = orbitalState.angularMomentum / (radius * radius);
  maneuverPlan.countdown = remainingAngle / Math.max(1e-8, angularRate);
  if (maneuverPlan.armed && maneuverPlan.countdown <= 0.3) {
    executeManeuver();
  }
}

function executeManeuver() {
  if (!maneuverPlan.plannedState) return;
  const currentAngle = orbitalState.angle;
  orbitalState = {
    ...maneuverPlan.plannedState,
    radial: Cesium.Cartesian3.clone(maneuverPlan.plannedState.radial),
    tangent: Cesium.Cartesian3.clone(maneuverPlan.plannedState.tangent),
    angle: currentAngle,
  };
  maneuverFuel.value = Math.max(
    0,
    maneuverFuel.value - maneuverDeltaV.value / 8,
  );
  missionState.maneuverCount += 1;
  if (orbitRing) viewer.entities.remove(orbitRing);
  orbitRing = createOrbitPolyline(orbitalState, "#d89a35", 0.9, 2.5);
  createApsisMarkers(orbitalState, false);
  clearManeuverEntities();
  maneuverPlan.active = false;
  maneuverPlan.armed = false;
  maneuverPlan.plannedState = null;
  maneuverPlan.message = "变轨完成";
  showSystemMessage("变轨执行完成，卫星已进入新轨道", "success");
}

function clearManeuverEntities() {
  if (maneuverPreviewRing && viewer)
    viewer.entities.remove(maneuverPreviewRing);
  if (maneuverNodeEntity && viewer) viewer.entities.remove(maneuverNodeEntity);
  maneuverPreviewRing = null;
  maneuverNodeEntity = null;
  clearApsisMarkers(previewApsisEntities);
}

function cancelManeuverPlan() {
  clearManeuverEntities();
  maneuverPlan.active = false;
  maneuverPlan.armed = false;
  maneuverPlan.countdown = 0;
  maneuverPlan.plannedState = null;
  maneuverPlan.message = "";
}

function triggerCrashExplosion() {
  if (explosionEntity || !viewer) return;
  if (engineLoopAudio) engineLoopAudio.pause();
  engineWasOn = false;
  if (!explosionAudio) {
    explosionAudio = new Audio(B + "sounds/rocket-explosion.mp3");
    explosionAudio.preload = "auto";
  }
  explosionAudio.currentTime = 0;
  explosionAudio.volume = 0.9;
  explosionAudio.play().catch(() => {});
  if (rocketModel) rocketModel.show = false;
  const tileSize = 200;
  const tilesPerRow = 6;
  let frame = 0;
  explosionEntity = viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(
      flight.longitude,
      flight.latitude,
      24,
    ),
    billboard: {
      image: B + "images/boom.png",
      width: 960,
      height: 960,
      imageSubRegion: new Cesium.BoundingRectangle(0, 1000, tileSize, tileSize),
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      verticalOrigin: Cesium.VerticalOrigin.CENTER,
      scaleByDistance: new Cesium.NearFarScalar(50, 0.65, 1200, 0.1),
      disableDepthTestDistance: TRACKING_STATION_MODEL_DISTANCE,
    },
  });
  createExplosionParticles();
  explosionStartedAt = performance.now();
  explosionTimer = window.setInterval(() => {
    if (!explosionEntity || frame >= tilesPerRow * tilesPerRow) {
      clearExplosion();
      if (flight.crashed) crashDialogVisible.value = true;
      return;
    }
    const tileX = (frame % tilesPerRow) * tileSize;
    const tileY = 1200 - (Math.floor(frame / tilesPerRow) + 1) * tileSize;
    explosionEntity.billboard.imageSubRegion = new Cesium.BoundingRectangle(
      tileX,
      tileY,
      tileSize,
      tileSize,
    );
    frame += 1;
  }, 50);
}

function clearExplosion() {
  if (explosionTimer) window.clearInterval(explosionTimer);
  explosionTimer = null;
  if (explosionEntity && viewer && !viewer.isDestroyed())
    viewer.entities.remove(explosionEntity);
  explosionEntity = null;
  if (viewer && !viewer.isDestroyed()) {
    for (const particles of explosionParticles.splice(0))
      viewer.scene.primitives.remove(particles);
  }
  explosionStartedAt = 0;
}

function createExplosionParticles() {
  const matrix = Cesium.Transforms.eastNorthUpToFixedFrame(
    Cesium.Cartesian3.fromDegrees(flight.longitude, flight.latitude, 24),
  );
  const fire = new GPUParticlePrimitive({
    particleCount: 1100,
    emitterPosition: [0, 0, 0],
    emitterRadius: 2,
    direction: [0, 0, 1],
    speed: 76,
    speedVariance: 52,
    spreadAngle: 165,
    minLife: 0.28,
    maxLife: 0.95,
    minSize: 3,
    maxSize: 10,
    sizeGrowth: 2.2,
    startColor: [1, 1, 0.75],
    mid1Color: [1, 0.58, 0.08],
    mid2Color: [0.95, 0.12, 0.01],
    endColor: [0.15, 0.01, 0],
    gravity: [0, 0, -22],
    drag: 0.55,
    turbulence: 0.3,
    additive: true,
    modelMatrix: matrix,
    show: true,
  });
  const smoke = new GPUParticlePrimitive({
    particleCount: 750,
    emitterPosition: [0, 0, 0],
    emitterRadius: 4,
    direction: [0, 0, 1],
    speed: 23,
    speedVariance: 15,
    spreadAngle: 140,
    minLife: 0.75,
    maxLife: 1.8,
    minSize: 8,
    maxSize: 22,
    sizeGrowth: 7,
    startColor: [0.35, 0.32, 0.28],
    mid1Color: [0.24, 0.22, 0.21],
    mid2Color: [0.14, 0.14, 0.15],
    endColor: [0.04, 0.04, 0.05],
    gravity: [0, 0, 4],
    drag: 0.62,
    turbulence: 0.42,
    additive: false,
    smokeMode: true,
    modelMatrix: matrix,
    show: true,
  });
  fire.explosionKind = "fire";
  smoke.explosionKind = "smoke";
  explosionParticles.push(fire, smoke);
  viewer.scene.primitives.add(fire);
  viewer.scene.primitives.add(smoke);
}

function rocketPosition() {
  return Cesium.Cartesian3.fromDegrees(
    flight.longitude,
    flight.latitude,
    Math.max(0, flight.altitude) + ROCKET_GROUND_OFFSET,
  );
}

function rocketOrientation() {
  const position = rocketPosition();
  const hpr = new Cesium.HeadingPitchRoll(
    Cesium.Math.toRadians(90 - controls.heading),
    Cesium.Math.toRadians(controls.pitch - 90),
    0,
  );
  return Cesium.Transforms.headingPitchRollQuaternion(position, hpr);
}

function rocketModelMatrix() {
  const rotation = Cesium.Matrix3.fromQuaternion(
    rocketOrientation(),
    new Cesium.Matrix3(),
  );
  return Cesium.Matrix4.fromRotationTranslation(
    rotation,
    rocketPosition(),
    new Cesium.Matrix4(),
  );
}

function componentPointPosition(definition) {
  const separation = separationStates.get(definition.id);
  let x = definition.offset[0];
  let y = definition.offset[1];
  let z = definition.offset[2];
  if (separation) {
    const elapsed = Math.min(45, Math.max(0, (performance.now() - separation.time) / 1000));
    x += definition.drift[0] * elapsed;
    y += definition.drift[1] * elapsed;
    z += definition.drift[2] * elapsed - 0.18 * elapsed * elapsed;
  }
  return Cesium.Matrix4.multiplyByPoint(
    rocketModelMatrix(),
    new Cesium.Cartesian3(x, y, z),
    new Cesium.Cartesian3(),
  );
}

function captureHighlightModelState() {
  if (!rocketHighlightModel?.getNode || initialHighlightNodeMatrices.size > 0)
    return;
  animatedModelNodeNames.forEach((name) => {
    const node = rocketHighlightModel.getNode(name);
    if (node?.matrix) {
      initialHighlightNodeMatrices.set(name, Cesium.Matrix4.clone(node.matrix));
    }
  });
}

async function initializeHighlightModel() {
  if (!viewer || rocketHighlightModel) return;
  rocketHighlightModel = await Cesium.Model.fromGltfAsync({
    url: B + "models/rocket_model.glb",
    modelMatrix: Cesium.Matrix4.IDENTITY.clone(),
    scale: 1.2,
    minimumPixelSize: 0,
    forwardAxis: Cesium.Axis.Z,
    allowPicking: false,
    shadows: Cesium.ShadowMode.ENABLED,
  });
  rocketHighlightModel.show = false;
  rocketHighlightModel.color = Cesium.Color.WHITE;
  rocketHighlightModel.colorBlendMode = Cesium.ColorBlendMode.MIX;
  rocketHighlightModel.colorBlendAmount = 0;
  rocketHighlightModel.silhouetteColor =
    Cesium.Color.fromCssColorString("#83c95a");
  rocketHighlightModel.silhouetteSize = 0;
  viewer.scene.primitives.add(rocketHighlightModel);
  if (rocketHighlightModel.ready) captureHighlightModelState();
  else
    rocketHighlightModel.readyEvent.addEventListener(
      captureHighlightModelState,
    );
}

function updateComponentHighlights() {
  if (!rocketHighlightModel) return;
  const activeEntry = [...componentPopups.values()].at(-1);
  const activeColor = activeEntry
    ? componentColor(activeEntry.definition)
    : componentColors.satellite;
  rocketHighlightModel.color = Cesium.Color.WHITE;
  rocketHighlightModel.colorBlendMode = Cesium.ColorBlendMode.MIX;
  rocketHighlightModel.colorBlendAmount = 0;
  rocketHighlightModel.silhouetteColor =
    Cesium.Color.fromCssColorString(activeColor);
  rocketHighlightModel.silhouetteSize = 3;
  const visibleNodes = new Set(
    [...componentPopups.values()].flatMap(
      (entry) =>
        entry.definition.highlightNodes ||
        entry.definition.modelNodes ||
        componentModelNodes[entry.definition.id] ||
        [],
    ),
  );
  animatedModelNodeNames.forEach((name) => {
    const node = rocketHighlightModel.getNode?.(name);
    if (node) node.show = visibleNodes.has(name);
  });
  rocketHighlightModel.show = visibleNodes.size > 0;
}

function clearComponentHighlight() {
  if (!rocketHighlightModel) return;
  rocketHighlightModel.show = false;
}

function restoreHighlightModelState() {
  if (!rocketHighlightModel) return;
  animatedModelNodeNames.forEach((name) => {
    const node = rocketHighlightModel.getNode?.(name);
    const initialMatrix = initialHighlightNodeMatrices.get(name);
    if (node) {
      node.show = true;
      if (initialMatrix) node.matrix = Cesium.Matrix4.clone(initialMatrix);
    }
  });
  rocketHighlightModel.activeAnimations?.removeAll();
  rocketHighlightModel.show = false;
}

function componentFromPickedModel(picked, worldPosition) {
  const nodeName =
    picked?.detail?.node?.name ||
    picked?.detail?.node?._runtimeNode?.node?.name ||
    picked?.node?.name ||
    "";
  const nodeMappings = [
    [/^(Booster_F|BF_)/, "Booster_F"],
    [/^(Booster_R|BR_)/, "Booster_R"],
    [/^(Booster_A|BA_)/, "Booster_A"],
    [/^(Booster_L|BL_)/, "Booster_L"],
    [/^(Stage1|S1_)/, 2],
    [/^(Stage2|S2_)/, 3],
    [/^Fairing_/, 4],
    [/^(Stage3|Stage_?3|S3[_-]?)/i, 5],
    [/^(Satellite|Sat_)/, 6],
  ];
  const nodeMatch = nodeMappings.find(([pattern]) => pattern.test(nodeName));
  if (nodeMatch) {
    if (typeof nodeMatch[1] === "string") {
      return {
        ...componentDefinitions.find((item) => item.id === 1),
        highlightNodes: componentModelNodes[1],
      };
    }
    return componentDefinitions.find((item) => item.id === nodeMatch[1]);
  }
  if (!worldPosition) {
    return componentDefinitions.find(
      (item) =>
        item.id === (activeStageId.value || (flight.panelsDeployed ? 6 : 1)),
    );
  }
  const inverse = Cesium.Matrix4.inverseTransformation(
    rocketModelMatrix(),
    new Cesium.Matrix4(),
  );
  const local = Cesium.Matrix4.multiplyByPoint(
    inverse,
    worldPosition,
    new Cesium.Cartesian3(),
  );
  const axisIsY = Math.abs(local.y) >= Math.abs(local.z);
  const axial = axisIsY ? local.y : local.z;
  const lateral = axisIsY ? local.z : local.y;
  const radial = Math.hypot(local.x, lateral);
  let id;
  if (axial > -1.2) id = radial > 1.45 ? 4 : 6;
  else if (axial > -6.2) id = radial > 1.65 ? 4 : 5;
  else if (axial > -15.5) id = 3;
  else if (radial > 2.05) {
    if (Math.abs(local.x) >= Math.abs(lateral)) {
      return {
        ...componentDefinitions.find((item) => item.id === 1),
        centerKey: local.x >= 0 ? "booster-1" : "booster-3",
        highlightNodes: componentModelNodes[1],
      };
    }
    return {
      ...componentDefinitions.find((item) => item.id === 1),
      centerKey: lateral < 0 ? "booster-2" : "booster-4",
      highlightNodes: componentModelNodes[1],
    };
  } else id = 2;
  return componentDefinitions.find((item) => item.id === id);
}

function componentPopupHtml(definition) {
  const stage = stages.find((item) => item.id === definition.id);
  const speed = Math.hypot(
    flight.verticalSpeed,
    flight.horizontalSpeed,
  ).toFixed(1);
  const separated = definition.id !== 6 && separationStates.has(definition.id);
  const status =
    definition.id === 6
      ? flight.orbitAchieved
        ? "轨道运行"
        : "载荷待命"
      : separated
        ? "已分离"
        : stageStatusText(stage);
  const fuel = stage?.propulsion
    ? stage.fuel
    : definition.id === 6
      ? maneuverFuel.value
      : 0;
  const thrust = stage?.id === activeStageId.value ? flight.thrust : 0;
  const color = componentColor(definition);
  return `
    <article class="rocket-component-popup" style="--component-color:${color}">
      <header><span>部件实时信息</span><button data-popup-close title="关闭">×</button></header>
      <h3>${definition.name}</h3>
      <div class="component-popup-status"><i></i><b>${status}</b></div>
      <dl>
        <div><dt>高度</dt><dd>${Math.round(flight.altitude).toLocaleString()} m</dd></div>
        <div><dt>速度</dt><dd>${speed} m/s</dd></div>
        <div><dt>推力</dt><dd>${(thrust / 1000).toFixed(0)} kN</dd></div>
        <div><dt>任务时间</dt><dd>${missionTime.value.replace("T+ ", "")}</dd></div>
        <div><dt>部件质量</dt><dd>${stage ? Math.round(stage.dryMass + (stage.fuelMass * stage.fuel) / 100).toLocaleString() : "—"} kg</dd></div>
        <div><dt>部件编号</dt><dd>${definition.id === 6 ? "PAYLOAD" : definition.id === 1 ? "BOOSTER" : `STAGE ${definition.id}`}</dd></div>
      </dl>
      <div class="component-popup-fuel"><span>${stage?.propulsion ? "剩余燃料" : definition.id === 6 ? "变轨能量" : "无推进剂"}</span><b>${fuel.toFixed(0)}%</b><i><em style="width:${fuel}%"></em></i></div>
    </article>`;
}

function componentCenterPosition(definition) {
  const key = definition.centerKey || definition.popupId || definition.id;
  const offset =
    componentCenterOffsets[key] || componentCenterOffsets[definition.id];
  return Cesium.Matrix4.multiplyByPoint(
    rocketModelMatrix(),
    offset || Cesium.Cartesian3.ZERO,
    new Cesium.Cartesian3(),
  );
}

function findComponentNearScreen(screenPosition) {
  if (!viewer || !screenPosition) return null;
  const candidates = [
    ...["booster-1", "booster-2", "booster-3", "booster-4"].map(
      (centerKey) => ({
        ...componentDefinitions.find((item) => item.id === 1),
        centerKey,
        highlightNodes: componentModelNodes[1],
      }),
    ),
    ...componentDefinitions.filter((item) => item.id !== 1),
  ].filter(
    (definition) => definition.id === 6 || !separationStates.has(definition.id),
  );
  const projection = candidates
    .map((definition) => {
      const windowPosition = Cesium.SceneTransforms.worldToWindowCoordinates(
        viewer.scene,
        componentCenterPosition(definition),
      );
      if (!windowPosition) return null;
      return {
        definition,
        distance: Math.hypot(
          windowPosition.x - screenPosition.x,
          windowPosition.y - screenPosition.y,
        ),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.distance - b.distance)[0];
  const hitRadius = cameraMode.value === "chase" ? 72 : 42;
  return projection && projection.distance <= hitRadius
    ? projection.definition
    : null;
}

function openComponentPopup(definition, worldPosition) {
  if (!definition || !viewer) return;
  const popupKey = definition.popupId || definition.id;
  if (definition.id !== 6 && separationStates.has(definition.id)) {
    closeComponentPopup(popupKey);
    return;
  }
  if (componentPopups.size && !componentPopups.has(popupKey)) {
    closeComponentPopup();
  }
  worldPosition = componentCenterPosition(definition);
  const color = componentColor(definition);
  const inverse = Cesium.Matrix4.inverseTransformation(
    rocketModelMatrix(),
    new Cesium.Matrix4(),
  );
  const localPosition = Cesium.Matrix4.multiplyByPoint(
    inverse,
    worldPosition,
    new Cesium.Cartesian3(),
  );
  let entry = componentPopups.get(popupKey);
  if (!entry) {
    const popup = new HtmlPopupPro({
      viewer,
      parentDom: sceneEl.value?.parentElement || document.body,
      popupColor: color,
      position: worldPosition,
      popupHtml: componentPopupHtml(definition),
      distanceXY: { x: 125, y: 55 },
      avoidInsets: { top: 110, right: 270, bottom: 230, left: 370 },
      onClose: () => {
        componentPopups.delete(popupKey);
        updateComponentHighlights();
      },
    });
    entry = { popup, definition, localPosition };
    componentPopups.set(popupKey, entry);
  } else {
    entry.localPosition = localPosition;
    entry.definition = definition;
    entry.popup.popupColor = color;
  }
  entry.popup.position = worldPosition;
  entry.popup.popupHtml = componentPopupHtml(definition);
  entry.popup.open();
  updateComponentHighlights();
}

function updateComponentPopup() {
  componentPopups.forEach((entry, popupKey) => {
    if (
      entry.definition.id !== 6 &&
      separationStates.has(entry.definition.id)
    ) {
      closeComponentPopup(popupKey);
      return;
    }
    entry.popup.position = Cesium.Matrix4.multiplyByPoint(
      rocketModelMatrix(),
      entry.localPosition,
      new Cesium.Cartesian3(),
    );
    entry.popup.popupHtml = componentPopupHtml(entry.definition);
  });
}

function closeComponentPopup(componentId) {
  if (componentId === undefined) {
    [...componentPopups.values()].forEach((entry) => entry.popup.close());
    componentPopups.clear();
  } else {
    const entry = componentPopups.get(componentId);
    entry?.popup.close();
    componentPopups.delete(componentId);
  }
  if (componentPopups.size) updateComponentHighlights();
  else clearComponentHighlight();
}

function createComponentPoints() {
  componentDefinitions.forEach((definition) => {
    const entity = viewer.entities.add({
      name: definition.name,
      position: new Cesium.CallbackProperty(
        () => componentPointPosition(definition),
        false,
      ),
      orientation: new Cesium.CallbackProperty(rocketOrientation, false),
      viewFrom: new Cesium.Cartesian3(-190, -55, 18),
      point: {
        show: true,
        pixelSize: 0,
        color: Cesium.Color.TRANSPARENT,
        outlineWidth: 0,
      },
    });
    entity.componentId = definition.id;
    componentPoints.set(definition.id, entity);
  });

  componentPickHandler = new Cesium.ScreenSpaceEventHandler(
    viewer.scene.canvas,
  );
  componentPickHandler.setInputAction((click) => {
    const picked = viewer.scene.pick(click.position);
    const entity = picked?.id;
    let popupOpened = false;
    if (entity?.isTrackingStation) {
      toggleStationRadar(entity);
      return;
    }
    let worldPosition;
    if (viewer.scene.pickPositionSupported && picked) {
      worldPosition = viewer.scene.pickPosition(click.position);
    }
    if (entity?.componentId) {
      const definition = componentDefinitions.find(
        (item) => item.id === entity.componentId,
      );
      if (definition)
        openComponentPopup(
          definition,
          worldPosition || componentPointPosition(definition),
        );
      popupOpened = Boolean(definition);
      return;
    }
    const drilledModelPick = viewer.scene
      .drillPick(click.position, 24)
      ?.find((item) => item?.primitive === rocketModel);
    if (drilledModelPick || entity === rocket) {
      const definition = componentFromPickedModel(
        drilledModelPick || picked,
        worldPosition,
      );
      if (definition) {
        const trackingDefinition = componentDefinitions.find(
          (item) => item.id === definition.id,
        );
        openComponentPopup(
          definition,
          worldPosition || componentPointPosition(trackingDefinition),
        );
        popupOpened = true;
      }
    }
    if (popupOpened) return;
    const definition = findComponentNearScreen(click.position);
    if (definition) {
      openComponentPopup(definition);
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
}

function followComponent(componentId) {
  if (!viewer || cameraMode.value !== "chase") return;
  const resolvedId = componentPoints.has(componentId)
    ? componentId
    : activeStageId.value || 1;
  const target = componentPoints.get(resolvedId);
  if (!target) return;
  followTargetId = resolvedId;
  target.viewFrom = new Cesium.ConstantProperty(
    resolvedId === 6
      ? new Cesium.Cartesian3(-42, -16, 8)
      : new Cesium.Cartesian3(-190, -55, 18),
  );
  viewer.trackedEntity = target;
}

async function initializeScene() {
  Cesium.Ion.defaultAccessToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJhMmM4NmI5Ny05YjBhLTQxMWItOTUxMS04M2M5ZjkxZWU3N2MiLCJpZCI6MTkxNTg0LCJzdWIiOiJrYW5nd2VpdGFvIiwiaXNzIjoiaHR0cHM6Ly9hcGkuY2VzaXVtLmNvbSIsImF1ZCI6IlVudGl0bGVkIiwiaWF0IjoxNzgzNTYwNzM1fQ.-OXlagy019nDeftM3SBWSq9Tse3I9V8Yc9KqCVOBiBc";
  viewer = new Cesium.Viewer(sceneEl.value, {
    animation: false,
    timeline: false,
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    fullscreenButton: false,
    infoBox: false,
    selectionIndicator: false,
    terrainProvider: new Cesium.EllipsoidTerrainProvider(),
    requestRenderMode: false,
    shadows: false,
  });
  viewer.screenSpaceEventHandler.removeInputAction(
    Cesium.ScreenSpaceEventType.LEFT_CLICK,
  );
  viewer.screenSpaceEventHandler.removeInputAction(
    Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK,
  );
  viewer._cesiumWidget._creditContainer.style.display = "none";

  viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString("#07120c");
  viewer.scene.globe.enableLighting = true;
  viewer.scene.globe.showGroundAtmosphere = true;
  viewer.scene.globe.depthTestAgainstTerrain = true;
  viewer.scene.globe.atmosphereLightIntensity = 20.0;
  viewer.scene.globe.atmosphereMieAnisotropy = 0.91;
  viewer.scene.skyAtmosphere.show = true;
  viewer.scene.skyAtmosphere.perFragmentAtmosphere = true;
  viewer.scene.skyAtmosphere.brightnessShift = 0.03;
  viewer.scene.skyAtmosphere.saturationShift = 0.04;
  skyBox = new Cesium.GroundSkyBox({
    sources: SKYBOX_SOURCES,
  });
  viewer.scene.skyBox = skyBox;

  const BLEND_DURATION = 3000;
  const FAR_BLEND_DURATION = 6000;
  let lastCameraHeight = null;
  const BLEND_COOLDOWN = 4000; // 渐变完成后冷却期，防止频繁切换闪烁

  // 迟滞阈值：白天→夜晚需要太阳明显落下去，夜晚→白天需要太阳明显升起来
  const SKYBOX_THRESHOLDS = { dayDown: -0.05, nightUp: 0.05 };
  // 远近切换迟滞：进入近景 < low，回到远景 > high
  const NEAR_LOW = 1500;
  const NEAR_HIGH = 15000;
  currentSkyKey = "far";

  viewer.scene.preUpdate.addEventListener(() => {
    const cameraHeight = viewer.camera.positionCartographic.height;
    const time = viewer.clock.currentTime;

    const sunPosECI =
      Cesium.Simon1994PlanetaryPositions.computeSunPositionInEarthInertialFrame(
        time,
        new Cesium.Cartesian3(),
      );
    const temeToFixed = Cesium.Transforms.computeTemeToPseudoFixedMatrix(
      time,
      new Cesium.Matrix3(),
    );
    const sunPosECEF = Cesium.Matrix3.multiplyByVector(
      temeToFixed,
      sunPosECI,
      new Cesium.Cartesian3(),
    );
    const sunDir = Cesium.Cartesian3.normalize(
      sunPosECEF,
      new Cesium.Cartesian3(),
    );
    const localNormal = Cesium.Cartesian3.normalize(
      Cesium.Cartesian3.fromDegrees(LAUNCH_LON, LAUNCH_LAT, 0),
      new Cesium.Cartesian3(),
    );
    const sunHeight = Cesium.Cartesian3.dot(sunDir, localNormal);

    // 远近切换迟滞
    const isFar = currentSkyKey === "far";
    const shouldBeFar = isFar
      ? cameraHeight > NEAR_LOW
      : cameraHeight > NEAR_HIGH;

    // 用迟滞逻辑决定目标天空盒 key（白天/夜晚）
    let targetKey;
    if (forceFarSkybox) {
      targetKey = "far";
      // 相机飞到足够高后自动解除强制远景
      if (cameraHeight > SKYBOX_SWITCH_HEIGHT) forceFarSkybox = false;
    } else if (shouldBeFar) {
      targetKey = "far";
    } else {
      switch (currentSkyKey) {
        case "day":
          targetKey = sunHeight < SKYBOX_THRESHOLDS.dayDown ? "night" : "day";
          break;
        case "night":
          targetKey = sunHeight > SKYBOX_THRESHOLDS.nightUp ? "day" : "night";
          break;
        default:
          targetKey = sunHeight > SKYBOX_THRESHOLDS.nightUp ? "day" : "night";
      }
    }

    const targetSourcesMap = {
      far: SKYBOX_SOURCES,
      day: GROUND_SKYBOX_SOURCES.day,
      night: GROUND_SKYBOX_SOURCES.night,
    };
    const targetSources = targetSourcesMap[targetKey];

    // 天空盒绕天顶轴随时间旋转（一天转一圈）
    const dayStart = Cesium.JulianDate.fromDate(
      new Date(Cesium.JulianDate.toDate(time).setHours(0, 0, 0, 0)),
    );
    const secondsOfDay = Cesium.JulianDate.secondsDifference(time, dayStart);
    skyBox.timeAngle = (secondsOfDay / 86400) * Cesium.Math.TWO_PI;

    // UE风格大气散射：近景启用，远景关闭
    skyBox.sunHeight = sunHeight;
    skyBox.atmosphereIntensity = targetKey === "far" ? 0 : 0.45;

    // 大气层和雾：远景正常，近景关闭
    if (targetKey === "far") {
      viewer.scene.skyAtmosphere.show = true;
      viewer.scene.fog.enabled = true;
    } else {
      viewer.scene.skyAtmosphere.show = false;
      viewer.scene.fog.enabled = false;
    }

    // 仅当 key 变化时才发起渐变
    if (!blendState.active && targetKey !== currentSkyKey && performance.now() - lastBlendCompleteTime > BLEND_COOLDOWN) {
      currentSkyKey = targetKey;
      const isFarSwitch = targetKey === "far" || currentSkyKey === "far";
      blendState.duration = isFarSwitch ? FAR_BLEND_DURATION : BLEND_DURATION;
      blendState.active = true;
      blendState.startTime = null;
      blendState.pending = targetSources;
      skyBox.sources2 = targetSources;
      skyBox.blendFactor = 0;
    }
    lastCameraHeight = cameraHeight;

    // 推进渐变
    if (blendState.active) {
      if (skyBox._cubeMap2) {
        if (blendState.startTime === null) {
          blendState.startTime = performance.now();
        }
        const elapsed = performance.now() - blendState.startTime;
        const t = Math.min(elapsed / blendState.duration, 1.0);
        // smoothstep 缓动，避免线性渐变的生硬感
        skyBox.blendFactor = t * t * (3 - 2 * t);
        if (skyBox.blendFactor >= 1.0) {
          // 销毁旧 cubeMap，替换为新 cubeMap
          if (skyBox._cubeMap) skyBox._cubeMap.destroy();
          skyBox._cubeMap = skyBox._cubeMap2;
          skyBox._cubeMap2 = undefined;
          skyBox._sources = blendState.pending;
          skyBox.sources = blendState.pending;
          skyBox._sources2 = null;
          skyBox.sources2 = null;
          skyBox.blendFactor = 0;
          blendState.active = false;
          blendState.startTime = null;
          blendState.pending = null;
          lastBlendCompleteTime = performance.now();
        }
      } else {
        // GroundSkyBox 不支持 sources2 渐变，直接切换 sources
        // 只设置 sources，不设置 _sources，让 update 检测到变化并重新加载 cubeMap
        skyBox.sources = blendState.pending;
        skyBox.blendFactor = 0;
        blendState.active = false;
        blendState.startTime = null;
        blendState.pending = null;
        lastBlendCompleteTime = performance.now();
      }
    }

    if (viewer.scene.skyBox !== skyBox) {
      viewer.scene.skyBox = skyBox;
    }
  });
  viewer.scene.backgroundColor = Cesium.Color.BLACK;
  viewer.scene.sun.show = true;
  viewer.scene.moon.show = false;
  viewer.scene.fog.enabled = true;
  viewer.scene.fog.density = 1.5e-4;
  viewer.scene.fog.minimumBrightness = 0.03;
  viewer.scene.highDynamicRange = sceneSettings.hdr;
  viewer.scene.postProcessStages.fxaa.enabled = true;
  viewer.scene.postProcessStages.bloom.enabled = false;
  if (Cesium.PostProcessStageLibrary?.createDepthOfFieldStage) {
    dofStage = viewer.scene.postProcessStages.add(
      Cesium.PostProcessStageLibrary.createDepthOfFieldStage(),
    );
    dofStage.enabled = sceneSettings.depthOfField;
    if (dofStage.uniforms) {
      dofStage.uniforms.focalDistance = 800.0;
      dofStage.uniforms.focalRange = 500.0;
      dofStage.uniforms.blurSigma = 6.0;
    }
  }
  viewer.scene.globe.shadows = Cesium.ShadowMode.ENABLED;
  viewer.scene.shadowMap.enabled = true;
  viewer.scene.shadowMap.softShadows = true;
  viewer.scene.shadowMap.darkness = 0.6;
  viewer.scene.shadowMap.maximumDistance = 30000.0;
  viewer.scene.sun.glowFactor = 2.0;
  viewer.clock.currentTime = Cesium.JulianDate.now();
  viewer.clock.multiplier = 1;
  viewer.clock.shouldAnimate = true;
  applySceneSettings();

  rocket = viewer.entities.add({
    position: new Cesium.CallbackProperty(rocketPosition, false),
    orientation: new Cesium.CallbackProperty(rocketOrientation, false),
    viewFrom: new Cesium.Cartesian3(-190, -55, 18),
    billboard: {
      image: new Cesium.CallbackProperty(
        () =>
          createMapIcon(
            flight.orbitAchieved && flight.panelsDeployed
              ? "satellite"
              : "vehicle",
            "#83c95a",
            48,
          ),
        false,
      ),
      show: new Cesium.CallbackProperty(
        () => distantMarkersVisible.value,
        false,
      ),
      width: 32,
      height: 32,
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      verticalOrigin: Cesium.VerticalOrigin.CENTER,
      disableDepthTestDistance: TRACKING_STATION_MODEL_DISTANCE,
    },
    label: {
      text: new Cesium.CallbackProperty(
        () => (flight.orbitAchieved && flight.panelsDeployed ? "卫星" : "火箭"),
        false,
      ),
      show: new Cesium.CallbackProperty(
        () => distantMarkersVisible.value,
        false,
      ),
      font: "bold 12px Microsoft YaHei",
      fillColor: Cesium.Color.fromCssColorString("#83c95a"),
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 3,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -40),
      disableDepthTestDistance: TRACKING_STATION_MODEL_DISTANCE,
    },
  });
  createComponentPoints();
  const rocketModelPromise = Cesium.Model.fromGltfAsync({
    url: B + "models/rocket_model.glb",
    modelMatrix: Cesium.Matrix4.IDENTITY.clone(),
    scale: 1.2,
    minimumPixelSize: 48,
    forwardAxis: Cesium.Axis.Z,
    shadows: Cesium.ShadowMode.ENABLED,
  }).then((model) => {
    rocketModel = model;
    viewer.scene.primitives.add(model);
    return new Promise((resolve) => {
      if (model.ready) {
        captureRocketModelState();
        loadedResourceCount.value += 1;
        resolve();
        return;
      }
      model.readyEvent.addEventListener(() => {
        captureRocketModelState();
        loadedResourceCount.value += 1;
        resolve();
      });
    });
  });
  const stationModelPromise = loadLaunchStation();
  createTrackingStations();
  createParticleEffects();
  trail = viewer.entities.add({
    show: false,
    polyline: {
      positions: new Cesium.CallbackProperty(() => trailPositions, false),
      width: 3,
      material: new Cesium.ColorMaterialProperty(
        Cesium.Color.fromCssColorString("#ffb347").withAlpha(0.9),
      ),
    },
  });
  setCamera("chase");
  const timeout = (p, ms, fallback) =>
    Promise.race([
      p,
      new Promise((resolve) => setTimeout(() => resolve(fallback), ms)),
    ]);
  await Promise.all([
    timeout(rocketModelPromise, 30000, null),
    timeout(stationModelPromise, 30000, null),
    timeout(preloadSkyboxImages(), 30000, null),
  ]);
  await initializeHighlightModel();
  initialized.value = true;
}

function createTrackingStations() {
  const nearRange = new Cesium.DistanceDisplayCondition(
    0,
    TRACKING_STATION_MODEL_DISTANCE,
  );
  const farRange = new Cesium.DistanceDisplayCondition(
    TRACKING_STATION_MODEL_DISTANCE,
    Number.MAX_VALUE,
  );
  trackingStations.forEach((station) => {
    const markerColor = "#56b9e9";
    const position = Cesium.Cartesian3.fromDegrees(station.lon, station.lat, 0);
    const orientation = Cesium.Transforms.headingPitchRollQuaternion(
      position,
      new Cesium.HeadingPitchRoll(Cesium.Math.toRadians(station.heading), 0, 0),
    );
    const entity = viewer.entities.add({
      name: station.name,
      position,
      orientation,
      model: {
        uri: B + "models/leida.glb",
        scale: 5,
        distanceDisplayCondition: nearRange,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        color: Cesium.Color.WHITE,
        colorBlendMode: Cesium.ColorBlendMode.HIGHLIGHT,
        colorBlendAmount: 0.08,
        shadows: Cesium.ShadowMode.ENABLED,
      },
      billboard: {
        image: createMapIcon("station", markerColor, 48),
        width: 30,
        height: 30,
        distanceDisplayCondition: farRange,
        disableDepthTestDistance: TRACKING_STATION_MODEL_DISTANCE,
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
      },
      label: {
        text: station.name,
        font: "bold 13px Microsoft YaHei",
        fillColor: Cesium.Color.fromCssColorString("#8ed9f3"),
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 4,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -34),
        distanceDisplayCondition: farRange,
        disableDepthTestDistance: TRACKING_STATION_MODEL_DISTANCE,
      },
    });
    entity.isTrackingStation = true;
    trackingStationEntities.push(entity);
  });
}

function toggleStationRadar(station) {
  if (selectedRadarPrimitive && viewer) {
    viewer.scene.primitives.remove(selectedRadarPrimitive);
    selectedRadarPrimitive = null;
  }
  if (selectedRadarStation === station) {
    selectedRadarStation = null;
    return;
  }
  selectedRadarStation = station;
  const position = station.position.getValue(viewer.clock.currentTime);
  const randomHeading = Cesium.Math.toRadians(Math.random() * 360);
  const randomPitch =
    Cesium.Math.PI + Cesium.Math.toRadians((Math.random() - 0.5) * 40);
  const orientation = Cesium.Transforms.headingPitchRollQuaternion(
    position,
    new Cesium.HeadingPitchRoll(randomHeading, randomPitch, 0),
  );
  selectedRadarPrimitive = viewer.scene.primitives.add(
    new SensorTaperedPrimitive({
      name: `${station.name}测控范围`,
      position,
      orientation,
      color: Cesium.Color.fromCssColorString("#2d7cee").withAlpha(0.16),
      length: Math.min(GROUND_LINK_MAX_RANGE, 1200000),
      rHalfAngle: Cesium.Math.toDegrees(GROUND_LINK_MAX_ZENITH_ANGLE),
      outline: true,
      outlineColor: Cesium.Color.fromCssColorString("#2d7cee").withAlpha(0.9),
      animation: true,
    }),
  );
}

function loadLaunchStation() {
  const origin = Cesium.Cartesian3.fromDegrees(
    STATION_LON,
    STATION_LAT,
    STATION_HEIGHT,
  );
  const modelMatrix = Cesium.Transforms.headingPitchRollToFixedFrame(
    origin,
    new Cesium.HeadingPitchRoll(Cesium.Math.toRadians(STATION_HEADING), 0, 0),
  );
  return Cesium.Model.fromGltfAsync({
    url: B + "models/lauch_station.glb",
    modelMatrix,
    scale: STATION_SCALE,
    maximumScale: STATION_SCALE,
    allowPicking: false,
    show: true,
    shadows: Cesium.ShadowMode.ENABLED,
  }).then(
    (model) =>
      new Promise((resolve) => {
        stationModelRef = model;
        viewer.scene.primitives.add(model);
        model.color = Cesium.Color.WHITE;
        model.colorBlendMode = Cesium.ColorBlendMode.HIGHLIGHT;
        model.colorBlendAmount = 0.12;
        if (model.imageBasedLighting) {
          model.imageBasedLighting.imageBasedLightingFactor =
            new Cesium.Cartesian2(1.0, 1.0);
        }
        if (model.ready) {
          loadedResourceCount.value += 1;
          resolve();
          return;
        }
        model.readyEvent.addEventListener(() => {
          loadedResourceCount.value += 1;
          resolve();
        });
      }),
  );
}

function preloadSkyboxImages() {
  const allSources = [
    ...Object.values(SKYBOX_SOURCES),
    ...Object.values(GROUND_SKYBOX_SOURCES.day),
    ...Object.values(GROUND_SKYBOX_SOURCES.sunset),
    ...Object.values(GROUND_SKYBOX_SOURCES.night),
  ];
  return Promise.all(
    allSources.map(
      (source) =>
        new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => {
            loadedResourceCount.value += 1;
            resolve();
          };
          image.onerror = () =>
            reject(new Error(`天空盒图片加载失败: ${source}`));
          image.src = source;
        }),
    ),
  );
}

function createParticleEffects() {
  const configurations = [
    {
      stage: 1,
      position: [2.3, 0, -45.5],
      count: 650,
      radius: 1.05,
      speed: 84,
      life: [0.25, 0.72],
      size: [3, 10],
    },
    {
      stage: 1,
      position: [-2.3, 0, -45.5],
      count: 650,
      radius: 1.05,
      speed: 84,
      life: [0.25, 0.72],
      size: [3, 10],
    },
    {
      stage: 1,
      position: [0, 2.3, -45.5],
      count: 650,
      radius: 1.05,
      speed: 84,
      life: [0.25, 0.72],
      size: [3, 10],
    },
    {
      stage: 1,
      position: [0, -2.3, -45.5],
      count: 650,
      radius: 1.05,
      speed: 84,
      life: [0.25, 0.72],
      size: [3, 10],
    },
    {
      stage: 2,
      position: [0, 0, -46.0],
      count: 2200,
      radius: 2.5,
      speed: 76,
      life: [0.24, 0.68],
      size: [3, 11],
    },
    {
      stage: 3,
      position: [0, 0, -18.0],
      count: 1500,
      radius: 1.5,
      speed: 62,
      life: [0.22, 0.58],
      size: [2.5, 8],
    },
    {
      stage: 5,
      position: [0, 0, -7.5],
      count: 1000,
      radius: 1.0,
      speed: 48,
      life: [0.2, 0.48],
      size: [2, 6],
    },
  ];
  configurations.forEach((config) => {
    const particles = new GPUParticlePrimitive({
      particleCount: config.count,
      emitterPosition: config.position,
      emitterRadius: config.radius,
      direction: [0, 0, -1],
      speed: config.speed,
      speedVariance: config.speed * 0.25,
      spreadAngle: 5,
      minLife: config.life[0],
      maxLife: config.life[1],
      minSize: config.size[0],
      maxSize: config.size[1],
      sizeGrowth: 3.5,
      startColor: [0.95, 0.92, 0.85],
      mid1Color: [1.0, 0.65, 0.15],
      mid2Color: [0.85, 0.22, 0.03],
      endColor: [0.18, 0.03, 0.0],
      drag: 1.2,
      turbulence: 0.1,
      additive: true,
      show: false,
    });
    particles.stage = config.stage;
    engineParticles.push(particles);
    viewer.scene.primitives.add(particles);
  });

  smokeParticles = new GPUParticlePrimitive({
    particleCount: 1800,
    emitterPosition: [0, 0, 0],
    emitterRadius: 18,
    direction: [0, 0, 0.1],
    speed: 55,
    speedVariance: 35,
    spreadAngle: 89,
    minLife: 1.5,
    maxLife: 4.0,
    minSize: 8,
    maxSize: 22,
    sizeGrowth: 8,
    startColor: [1.0, 1.0, 1.0],
    mid1Color: [1.0, 1.0, 1.0],
    mid2Color: [1.0, 1.0, 1.0],
    endColor: [1.0, 1.0, 1.0],
    gravity: [0, 0, -3],
    drag: 0.65,
    turbulence: 0.5,
    additive: false,
    smokeMode: true,
    show: false,
    modelMatrix: Cesium.Transforms.eastNorthUpToFixedFrame(
      Cesium.Cartesian3.fromDegrees(LAUNCH_LON, LAUNCH_LAT, 0),
    ),
  });
  viewer.scene.primitives.add(smokeParticles);
}

function updateParticleEffects(modelMatrix) {
  const engineOn =
    flight.started &&
    !flight.crashed &&
    !flight.orbitAchieved &&
    flight.thrust > 0;
  engineParticles.forEach((particles) => {
    particles.modelMatrix = modelMatrix;
    particles.time = flight.time;
    particles.globalOpacity = Math.max(0.18, controls.throttle);
    particles.show =
      !distantMarkersVisible.value &&
      engineOn &&
      particles.stage === activeStageId.value;
  });
  if (smokeParticles) {
    smokeParticles.time = flight.time;
    smokeParticles.globalOpacity = Math.min(1, controls.throttle * 1.2);
    smokeParticles.show =
      !distantMarkersVisible.value &&
      engineOn &&
      flight.altitude < 1200 &&
      flight.time < 40;
  }
}

function setCamera(mode) {
  const modeChanged = cameraMode.value !== mode;
  if (modeChanged && componentPopups.size) closeComponentPopup();
  cameraMode.value = mode;
  globalViewActive.value = false;
  if (!viewer || !rocket) return;
  if (mode === "chase") {
    viewer.scene.screenSpaceCameraController.enableZoom = true;
    viewer.trackedEntity = undefined;
    viewer.camera.lookAt(
      rocketPosition(),
      new Cesium.HeadingPitchRange(
        Cesium.Math.toRadians(15),
        Cesium.Math.toRadians(-10),
        210,
      ),
    );
    viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
    followComponent(activeStageId.value || (flight.panelsDeployed ? 6 : 1));
  } else {
    viewer.scene.screenSpaceCameraController.enableZoom = true;
    viewer.trackedEntity = undefined;
    viewer.camera.lookAt(
      rocketPosition(),
      new Cesium.HeadingPitchRange(
        0,
        Cesium.Math.toRadians(-18),
        Math.max(350, flight.altitude * 0.8),
      ),
    );
    viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
  }
  updateDistanceVisuals();
}

function setTimeFromSlider(hour) {
  timeSliderHour.value = hour;
  if (!viewer) return;
  viewer.clock.shouldAnimate = false;
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  date.setHours(Math.floor(hour), Math.round((hour % 1) * 60));
  viewer.clock.currentTime = Cesium.JulianDate.fromDate(date);
}

function onTimeSliderPointerDown(e) {
  timeSliderDragging = true;
  updateTimeSlider(e);
  window.addEventListener("pointermove", onTimeSliderPointerMove);
  window.addEventListener("pointerup", onTimeSliderPointerUp);
}

function onTimeSliderPointerMove(e) {
  if (timeSliderDragging) updateTimeSlider(e);
}

function onTimeSliderPointerUp() {
  timeSliderDragging = false;
  window.removeEventListener("pointermove", onTimeSliderPointerMove);
  window.removeEventListener("pointerup", onTimeSliderPointerUp);
}

function updateTimeSlider(e) {
  const track = timeSliderTrackEl.value;
  if (!track) return;
  const rect = track.getBoundingClientRect();
  let ratio = 1 - (e.clientY - rect.top) / rect.height;
  ratio = Math.max(0, Math.min(1, ratio));
  setTimeFromSlider(ratio * 24);
}

function setGlobalView() {
  if (!viewer || cameraMode.value !== "orbit") return;
  globalViewActive.value = true;
  // 强制远景天空盒，避免相机飞行过程中触发渐变
  forceFarSkybox = true;
  // 立即切换到远景天空盒
  currentSkyKey = "far";
  blendState.active = false;
  blendState.startTime = null;
  blendState.pending = null;
  skyBox.sources = SKYBOX_SOURCES;
  lastBlendCompleteTime = 0;
  skyBox._sources2 = null;
  skyBox.sources2 = null;
  skyBox._cubeMap2 = undefined;
  skyBox.blendFactor = 0;
  skyBox.atmosphereIntensity = 0;
  viewer.scene.skyAtmosphere.show = true;
  viewer.scene.fog.enabled = true;
  viewer.trackedEntity = undefined;
  viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(105, 30, 26000000),
    orientation: {
      heading: 0,
      pitch: Cesium.Math.toRadians(-90),
      roll: 0,
    },
    duration: 1.2,
  });
}

async function toggleSatelliteCamera() {
  satelliteCameraOpen.value = !satelliteCameraOpen.value;
  if (!satelliteCameraOpen.value) {
    destroySatelliteCamera();
    return;
  }
  await nextTick();
  satelliteCameraViewer = new Cesium.Viewer(satelliteCameraEl.value, {
    animation: false,
    timeline: false,
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    fullscreenButton: false,
    infoBox: false,
    selectionIndicator: false,
    terrainProvider: new Cesium.EllipsoidTerrainProvider(),
    contextOptions: { webgl: { preserveDrawingBuffer: true } },
    useDefaultRenderLoop: false,
  });
  satelliteCameraViewer._cesiumWidget._creditContainer.style.display = "none";
  satelliteCameraViewer.scene.globe.baseColor = viewer.scene.globe.baseColor;
  satelliteCameraViewer.scene.skyBox.show = false;
  satelliteCameraViewer.scene.skyAtmosphere.show = false;
  satelliteCameraViewer.scene.fog.enabled = false;
  satelliteCameraViewer.scene.screenSpaceCameraController.enableInputs = false;
  updateSatelliteCameraView();
}

function destroySatelliteCamera() {
  if (satelliteFrustumPrimitive && viewer) {
    viewer.scene.primitives.remove(satelliteFrustumPrimitive);
    satelliteFrustumPrimitive = null;
  }
  if (satelliteCameraViewer && !satelliteCameraViewer.isDestroyed()) {
    satelliteCameraViewer.destroy();
  }
  satelliteCameraViewer = null;
}

function updateSatelliteCameraView() {
  if (!satelliteCameraViewer || satelliteCameraViewer.isDestroyed()) return;
  const position = rocketPosition();
  const orientation = Cesium.Transforms.headingPitchRollQuaternion(
    position,
    new Cesium.HeadingPitchRoll(
      Cesium.Math.toRadians(satelliteCamera.heading),
      Cesium.Math.toRadians(satelliteCamera.pitch),
      Cesium.Math.toRadians(satelliteCamera.roll),
    ),
  );
  const rotation = Cesium.Matrix3.fromQuaternion(
    orientation,
    new Cesium.Matrix3(),
  );
  const direction = Cesium.Cartesian3.normalize(
    Cesium.Matrix3.multiplyByVector(
      rotation,
      new Cesium.Cartesian3(0, 0, -1),
      new Cesium.Cartesian3(),
    ),
    new Cesium.Cartesian3(),
  );
  const cameraUp = Cesium.Cartesian3.normalize(
    Cesium.Matrix3.multiplyByVector(
      rotation,
      Cesium.Cartesian3.UNIT_Y,
      new Cesium.Cartesian3(),
    ),
    new Cesium.Cartesian3(),
  );
  const cameraAltitude = Math.max(
    1,
    flight.altitude * Math.pow(0.1, (satelliteCamera.zoom - 1) / 100),
  );
  const cameraPosition = Cesium.Cartesian3.add(
    position,
    Cesium.Cartesian3.multiplyByScalar(
      direction,
      flight.altitude - cameraAltitude,
      new Cesium.Cartesian3(),
    ),
    new Cesium.Cartesian3(),
  );
  satelliteCameraViewer.camera.setView({
    destination: cameraPosition,
    orientation: { direction, up: cameraUp },
  });
  satelliteCameraViewer.camera.frustum.fov = Cesium.Math.toRadians(
    satelliteCamera.fov,
  );
  satelliteCameraViewer.camera.frustum.aspectRatio =
    satelliteCamera.aspectRatio;
  const surfaceIntersection = Cesium.IntersectionTests.rayEllipsoid(
    new Cesium.Ray(position, direction),
    viewer.scene.globe.ellipsoid,
  );
  const frustumLength = Math.max(
    1,
    surfaceIntersection?.start ?? flight.altitude,
  );
  const fovRadians = Cesium.Math.toRadians(satelliteCamera.fov);
  const xHalfAngle = Cesium.Math.toDegrees(
    Math.atan(Math.tan(fovRadians / 2) * satelliteCamera.aspectRatio),
  );
  if (!satelliteFrustumPrimitive) {
    satelliteFrustumPrimitive = viewer.scene.primitives.add(
      new SensorPyramidPrimitive({
        position,
        orientation,
        length: frustumLength,
        xHalfAngle,
        yHalfAngle: satelliteCamera.fov / 2,
        color: Cesium.Color.fromCssColorString("#55ff55").withAlpha(0.15),
        outline: true,
        outlineColor: Cesium.Color.fromCssColorString("#55ff55").withAlpha(0.9),
        animation: false,
      }),
    );
  } else {
    satelliteFrustumPrimitive.position = position;
    satelliteFrustumPrimitive.orientation = orientation;
    if (Math.abs(satelliteFrustumPrimitive.length - frustumLength) > 100) {
      satelliteFrustumPrimitive.length = frustumLength;
    }
    if (Math.abs(satelliteFrustumPrimitive.xHalfAngle - xHalfAngle) > 0.01) {
      satelliteFrustumPrimitive.xHalfAngle = xHalfAngle;
    }
    if (
      Math.abs(satelliteFrustumPrimitive.yHalfAngle - satelliteCamera.fov / 2) >
      0.01
    ) {
      satelliteFrustumPrimitive.yHalfAngle = satelliteCamera.fov / 2;
    }
  }
  satelliteCameraViewer.render();
}

async function takeSatellitePhoto() {
  if (!viewer || !flight.orbitAchieved || photoCapturing.value) return;
  if (photos.value.length >= 8) {
    showSystemMessage("相册已满，最多保存 8 张照片，请先删除照片", "error");
    return;
  }
  if (satelliteCameraViewer && !satelliteCameraViewer.isDestroyed()) {
    photoCapturing.value = true;
    try {
      satelliteCameraViewer.scene.render();
      const url = satelliteCameraViewer.scene.canvas.toDataURL("image/png");
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const photo = { id: stamp, name: `satellite-photo-${stamp}.png`, url };
      photos.value.unshift(photo);
      missionState.photosTaken += 1;
      previewPhoto(photo);
      showSystemMessage(
        photos.value.length >= 3
          ? "全部任务已完成"
          : `拍摄进度：${photos.value.length}/3`,
        "success",
      );
    } finally {
      photoCapturing.value = false;
    }
    return;
  }
  photoCapturing.value = true;
  const container = document.createElement("div");
  container.className = "satellite-capture-canvas";
  document.body.appendChild(container);
  let captureViewer;
  try {
    captureViewer = new Cesium.Viewer(container, {
      animation: false,
      timeline: false,
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      fullscreenButton: false,
      infoBox: false,
      selectionIndicator: false,
      terrainProvider: new Cesium.EllipsoidTerrainProvider(),
      contextOptions: { webgl: { preserveDrawingBuffer: true } },
    });
    captureViewer._cesiumWidget._creditContainer.style.display = "none";
    captureViewer.scene.globe.baseColor = viewer.scene.globe.baseColor;
    captureViewer.scene.globe.enableLighting =
      viewer.scene.globe.enableLighting;
    captureViewer.scene.skyBox.show = false;
    captureViewer.scene.skyAtmosphere.show = false;
    captureViewer.scene.fog.enabled = false;
    const satellitePosition = rocketPosition();
    const direction = Cesium.Cartesian3.normalize(
      Cesium.Cartesian3.negate(satellitePosition, new Cesium.Cartesian3()),
      new Cesium.Cartesian3(),
    );
    const up = Cesium.Cartesian3.normalize(
      Cesium.Cartesian3.cross(
        direction,
        Cesium.Cartesian3.UNIT_Z,
        new Cesium.Cartesian3(),
      ),
      new Cesium.Cartesian3(),
    );
    captureViewer.camera.setView({
      destination: satellitePosition,
      orientation: { direction, up },
    });
    captureViewer.camera.frustum.fov = Cesium.Math.toRadians(32);
    await new Promise((resolve) => {
      const remove = captureViewer.scene.postRender.addEventListener(() => {
        remove();
        resolve();
      });
      captureViewer.scene.requestRender();
    });
    const url = captureViewer.scene.canvas.toDataURL("image/png");
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const photo = {
      id: `${stamp}-${photos.value.length}`,
      name: `satellite-photo-${stamp}.png`,
      url,
    };
    photos.value.unshift(photo);
    missionState.photosTaken += 1;
    previewPhoto(photo);
    showSystemMessage(
      photos.value.length >= 3
        ? "全部任务已完成"
        : `拍摄进度：${photos.value.length}/3`,
      "success",
    );
  } catch (error) {
    showSystemMessage("对地拍照失败，请稍后重试", "error");
  } finally {
    if (captureViewer && !captureViewer.isDestroyed()) captureViewer.destroy();
    container.remove();
    photoCapturing.value = false;
  }
}

function previewPhoto(photo) {
  previewedPhoto.value = photo;
  resetPhotoPreview();
}

function resetPhotoPreview() {
  Object.assign(photoPreview, {
    scale: 1.25,
    rotation: 0,
    x: 0,
    y: 0,
    dragging: false,
  });
}

function zoomPreview(delta) {
  photoPreview.scale = Math.max(0.2, Math.min(8, photoPreview.scale + delta));
}

function rotatePreview(degrees) {
  photoPreview.rotation = (photoPreview.rotation + degrees) % 360;
}

function onPhotoPreviewWheel(event) {
  zoomPreview(event.deltaY < 0 ? 0.15 : -0.15);
}

function startPhotoPreviewDrag(event) {
  if (event.button !== 0) return;
  const startX = event.clientX - photoPreview.x;
  const startY = event.clientY - photoPreview.y;
  const target = event.currentTarget;
  photoPreview.dragging = true;
  target.setPointerCapture(event.pointerId);
  const move = (moveEvent) => {
    photoPreview.x = moveEvent.clientX - startX;
    photoPreview.y = moveEvent.clientY - startY;
  };
  const stop = () => {
    photoPreview.dragging = false;
    target.removeEventListener("pointermove", move);
    target.removeEventListener("pointerup", stop);
    target.removeEventListener("pointercancel", stop);
  };
  target.addEventListener("pointermove", move);
  target.addEventListener("pointerup", stop);
  target.addEventListener("pointercancel", stop);
}

function deletePhoto(photo) {
  photos.value = photos.value.filter((item) => item.id !== photo.id);
  if (previewedPhoto.value?.id === photo.id) previewedPhoto.value = null;
}

function downlinkPhoto(photo) {
  if (!groundLinkActive.value || !photo || photo.downlinked) return;
  const lon = flight.longitude.toFixed(4);
  const lat = flight.latitude.toFixed(4);
  const alt = Math.round(flight.altitude);
  const station = groundLinkName.value.replace(/\s+/g, "");
  const dotIndex = photo.name.lastIndexOf(".");
  const baseName =
    dotIndex > 0 ? photo.name.substring(0, dotIndex) : photo.name;
  const ext = dotIndex > 0 ? photo.name.substring(dotIndex) : "";
  const anchor = document.createElement("a");
  anchor.href = photo.url;
  anchor.download = `${baseName}_sat(${lon}_${lat}_${alt}m)_via_${station}${ext}`;
  anchor.click();
  photo.downlinked = true;
  missionState.downlinked += 1;
  showSystemMessage(`照片已通过 ${groundLinkName.value} 下传`, "success");
}

function frame(now) {
  const dt = lastFrame ? (now - lastFrame) / 1000 : 0;
  lastFrame = now;
  updatePhysics(dt);
  updateEngineSound();
  clampCameraDistance();
  updateFollowCamera();
  updateTrajectory();
  updateDistanceVisuals();
  updateGroundStationLink();
  updateGlobalCameraDistance();
  if (dofStage?.enabled && viewer) {
    const focusDistance = Cesium.Cartesian3.distance(
      viewer.camera.positionWC,
      rocketPosition(),
    );
    if (dofStage.uniforms) {
      dofStage.uniforms.focalDistance = focusDistance;
      dofStage.uniforms.focalRange = Math.max(
        sceneSettings.dofRange,
        focusDistance * 0.8,
      );
      dofStage.uniforms.blurSigma = Math.min(3, sceneSettings.dofBlur);
    }
  }
  if (satelliteCameraOpen.value) updateSatelliteCameraView();
  if (explosionStartedAt) {
    const explosionTime = (now - explosionStartedAt) / 1000;
    explosionParticles.forEach((particles) => {
      particles.time = explosionTime;
      particles.globalOpacity =
        particles.explosionKind === "fire"
          ? Math.max(0, 1 - explosionTime / 1.05)
          : Math.max(
              0,
              Math.min(1, explosionTime * 2.5) * (1 - explosionTime / 1.9),
            );
    });
  }
  let modelMatrix;
  if (rocketModel) {
    modelMatrix = rocketModelMatrix();
    rocketModel.modelMatrix = modelMatrix;
    if (rocketHighlightModel) rocketHighlightModel.modelMatrix = modelMatrix;
  }
  if (modelMatrix) updateParticleEffects(modelMatrix);
  updateComponentPopup();
  animationFrame = requestAnimationFrame(frame);
}

function updateGlobalCameraDistance() {
  if (!viewer) return;
  const cartographic = viewer.camera.positionCartographic;
  cameraHeight.value = Math.max(0, cartographic?.height || 0);
}

function updateFollowCamera() {
  if (
    !viewer ||
    cameraMode.value !== "chase" ||
    followTargetId === null ||
    viewer.trackedEntity
  ) {
    return;
  }
  const target = componentPoints.get(followTargetId) || rocket;
  if (!target) return;
  const targetPosition =
    followTargetId === 6
      ? componentCenterPosition(
          componentDefinitions.find((item) => item.id === 6),
        )
      : componentPointPosition(
          componentDefinitions.find((item) => item.id === followTargetId) ||
            componentDefinitions[0],
        );
  const offset =
    followTargetId === 6
      ? new Cesium.Cartesian3(-42, -16, 8)
      : new Cesium.Cartesian3(-190, -55, 18);
  viewer.camera.lookAt(
    targetPosition,
    new Cesium.HeadingPitchRange(0, -0.18, Cesium.Cartesian3.magnitude(offset)),
  );
  viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
}

function clampCameraDistance() {
  if (!viewer || !gameEntered.value || cameraMode.value !== "chase") return;
  const trackedComponent = viewer.trackedEntity?.componentId;
  if (viewer.trackedEntity && trackedComponent) {
    const localPosition = viewer.camera.position;
    const distance = Cesium.Cartesian3.magnitude(localPosition);
    const minDistance = trackedComponent === 6 ? 12 : CAMERA_MIN_DISTANCE;
    const maxDistance = trackedComponent === 6 ? 420 : CAMERA_MAX_DISTANCE;
    const clampedDistance = Math.max(
      minDistance,
      Math.min(maxDistance, distance),
    );
    if (Math.abs(distance - clampedDistance) >= 0.1) {
      const direction = Cesium.Cartesian3.normalize(
        localPosition,
        new Cesium.Cartesian3(),
      );
      viewer.camera.position = Cesium.Cartesian3.multiplyByScalar(
        direction,
        clampedDistance,
        new Cesium.Cartesian3(),
      );
    }
    const viewDirection = Cesium.Cartesian3.normalize(
      Cesium.Cartesian3.negate(viewer.camera.position, new Cesium.Cartesian3()),
      new Cesium.Cartesian3(),
    );
    const right = Cesium.Cartesian3.normalize(
      Cesium.Cartesian3.cross(
        viewDirection,
        viewer.camera.up,
        new Cesium.Cartesian3(),
      ),
      new Cesium.Cartesian3(),
    );
    viewer.camera.direction = viewDirection;
    viewer.camera.up = Cesium.Cartesian3.normalize(
      Cesium.Cartesian3.cross(right, viewDirection, new Cesium.Cartesian3()),
      new Cesium.Cartesian3(),
    );
    return;
  }
  const target = rocketPosition();
  const cameraWorld = viewer.camera.positionWC;
  const offset = Cesium.Cartesian3.subtract(
    cameraWorld,
    target,
    new Cesium.Cartesian3(),
  );
  const distance = Cesium.Cartesian3.magnitude(offset);
  if (!distance) return;
  const clampedDistance = Math.min(CAMERA_MAX_DISTANCE, distance);
  if (Math.abs(distance - clampedDistance) < 0.5) return;
  const direction = Cesium.Cartesian3.normalize(
    offset,
    new Cesium.Cartesian3(),
  );
  const clampedWorld = Cesium.Cartesian3.add(
    target,
    Cesium.Cartesian3.multiplyByScalar(
      direction,
      clampedDistance,
      new Cesium.Cartesian3(),
    ),
    new Cesium.Cartesian3(),
  );
  const inverseTransform = Cesium.Matrix4.inverseTransformation(
    viewer.camera.transform,
    new Cesium.Matrix4(),
  );
  viewer.camera.position = Cesium.Matrix4.multiplyByPoint(
    inverseTransform,
    clampedWorld,
    new Cesium.Cartesian3(),
  );
}

function updateTrajectory() {
  if (!flight.started || flight.crashed || flight.orbitAchieved) return;
  if (flight.time < lastTrailSample) lastTrailSample = flight.time;
  if (flight.time - lastTrailSample < 0.5) return;
  lastTrailSample = flight.time;
  trailPositions.push(Cesium.Cartesian3.clone(rocketPosition()));
  if (trailPositions.length > 4000) trailPositions.shift();
}

function updateDistanceVisuals() {
  if (!viewer || !gameEntered.value) return;
  const distance = Cesium.Cartesian3.distance(
    viewer.camera.positionWC,
    rocketPosition(),
  );
  const visible =
    cameraMode.value === "orbit" && distance >= DISTANT_MARKER_DISTANCE;
  distantMarkersVisible.value = visible;
  if (trail)
    trail.show = visible && !flight.orbitAchieved && trailPositions.length > 1;
  if (orbitRing) orbitRing.show = cameraMode.value === "orbit";
  if (maneuverPreviewRing)
    maneuverPreviewRing.show = cameraMode.value === "orbit";
  if (maneuverNodeEntity)
    maneuverNodeEntity.show = cameraMode.value === "orbit";
  orbitApsisEntities.forEach((entity) => {
    entity.show = cameraMode.value === "orbit";
  });
  previewApsisEntities.forEach((entity) => {
    entity.show = cameraMode.value === "orbit";
  });
  if (rocketModel) rocketModel.show = !visible && !flight.crashed;
  if (rocketHighlightModel)
    rocketHighlightModel.show =
      componentPopups.size > 0 && !visible && !flight.crashed;
}

function updateGroundStationLink() {
  if (!viewer || !flight.orbitAchieved || flight.crashed) {
    if (groundLinkEntity) groundLinkEntity.show = false;
    groundLinkActive.value = false;
    groundLinkStation = null;
    return;
  }
  const satellitePosition = rocketPosition();
  let nearest = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  trackingStationEntities.forEach((station) => {
    const stationPosition = station.position.getValue(viewer.clock.currentTime);
    const toSatellite = Cesium.Cartesian3.subtract(
      satellitePosition,
      stationPosition,
      new Cesium.Cartesian3(),
    );
    const distance = Cesium.Cartesian3.magnitude(toSatellite);
    const stationNormal = Cesium.Cartesian3.normalize(
      stationPosition,
      new Cesium.Cartesian3(),
    );
    const linkDirection = Cesium.Cartesian3.normalize(
      toSatellite,
      new Cesium.Cartesian3(),
    );
    const insideTrackingCone =
      Cesium.Cartesian3.dot(linkDirection, stationNormal) >=
      Math.cos(GROUND_LINK_MAX_ZENITH_ANGLE);
    if (
      insideTrackingCone &&
      distance <= GROUND_LINK_MAX_RANGE &&
      distance < nearestDistance
    ) {
      nearest = station;
      nearestDistance = distance;
    }
  });
  if (!nearest) {
    if (groundLinkActive.value) showSystemMessage("测控链路已断开", "error");
    if (groundLinkEntity) groundLinkEntity.show = false;
    groundLinkActive.value = false;
    groundLinkStation = null;
    return;
  }
  if (!groundLinkEntity) {
    groundLinkEntity = viewer.entities.add({
      name: "卫星测控链路",
      show: true,
      polyline: {
        positions: new Cesium.CallbackProperty(
          () =>
            groundLinkStation
              ? [
                  rocketPosition(),
                  groundLinkStation.position.getValue(viewer.clock.currentTime),
                ]
              : [],
          false,
        ),
        width: 5,
        material: new PolylineFlowHorizontalMaterialProperty({
          color: Cesium.Color.fromCssColorString("#33ff33").withAlpha(1),
          speed: 20,
          count: 8,
        }),
        arcType: Cesium.ArcType.NONE,
        depthFailMaterial: new Cesium.ColorMaterialProperty(
          Cesium.Color.fromCssColorString("#33ff33").withAlpha(0.25),
        ),
      },
    });
  }
  groundLinkStation = nearest;
  groundLinkEntity.show = true;
  if (!groundLinkActive.value)
    showSystemMessage(`测控链路已连接：${nearest.name}`, "success");
  groundLinkActive.value = true;
  groundLinkName.value = nearest.name;
}

function onKeyDown(event) {
  if (!gameEntered.value) return;
  if (
    [
      "Space",
      "KeyW",
      "KeyS",
      "KeyA",
      "KeyD",
      "ShiftLeft",
      "ControlLeft",
    ].includes(event.code)
  )
    event.preventDefault();
  if (event.repeat && ["Space", "KeyT", "KeyF"].includes(event.code)) return;
  if (event.code === "Space") activateStage();
  if (event.code === "KeyT") toggleSas();
  if (event.code === "KeyF")
    setCamera(cameraMode.value === "chase" ? "orbit" : "chase");
  if (event.code === "ShiftLeft")
    controls.throttle = Math.min(1, controls.throttle + 0.1);
  if (event.code === "ControlLeft")
    controls.throttle = Math.max(0, controls.throttle - 0.1);
  if (!controls.rcs) return;
  if (event.code === "KeyW") {
    controls.pitch = Math.min(90, controls.pitch + 2);
  }
  if (event.code === "KeyS") {
    controls.pitch = Math.max(-10, controls.pitch - 2);
  }
  if (event.code === "KeyA") {
    controls.heading = (controls.heading - 2 + 360) % 360;
  }
  if (event.code === "KeyD") {
    controls.heading = (controls.heading + 2) % 360;
  }
}

onMounted(async () => {
  updateBrowserZoom();
  window.addEventListener("resize", updateBrowserZoom);
  window.visualViewport?.addEventListener("resize", updateBrowserZoom);
  window.addEventListener("keydown", onKeyDown);
  animationFrame = requestAnimationFrame(frame);

  try {
    await initializeScene();
    // 首页首次真实交互时自动播放音乐
    const startMusic = () => {
      startMusicOnFirstInteraction();
      document.removeEventListener("pointerdown", startMusic);
      document.removeEventListener("mousemove", startMusic);
      document.removeEventListener("keydown", startMusic);
      document.removeEventListener("touchstart", startMusic);
    };
    document.addEventListener("pointerdown", startMusic);
    document.addEventListener("mousemove", startMusic);
    document.addEventListener("keydown", startMusic);
    document.addEventListener("touchstart", startMusic);
    if (new URLSearchParams(window.location.search).has("launch")) {
      await enterGame();
      activateStage();
    }
  } catch (error) {
    console.error("场景资源加载失败", error);
  }
});

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrame);
  window.removeEventListener("resize", updateBrowserZoom);
  window.visualViewport?.removeEventListener("resize", updateBrowserZoom);
  if (launchCountdownTimer) window.clearInterval(launchCountdownTimer);
  if (systemMessageTimer) window.clearTimeout(systemMessageTimer);
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  window.removeEventListener("keydown", onKeyDown);
  clearExplosion();
  if (componentPickHandler && !componentPickHandler.isDestroyed())
    componentPickHandler.destroy();
  componentPopups.forEach((entry) => entry.popup.destroy());
  componentPopups.clear();
  if (viewer && !viewer.isDestroyed()) viewer.destroy();
  if (backgroundAudio) {
    backgroundAudio.pause();
    backgroundAudio.src = "";
  }
  if (engineIgnitionAudio) {
    engineIgnitionAudio.pause();
    engineIgnitionAudio.src = "";
  }
  if (engineLoopAudio) {
    engineLoopAudio.pause();
    engineLoopAudio.src = "";
  }
  if (explosionAudio) {
    explosionAudio.pause();
    explosionAudio.src = "";
  }
});
</script>

<style scoped>
* {
  box-sizing: border-box;
}
.game-shell {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: #020509;
  color: #e7eadf;
  user-select: none;
  letter-spacing: 0;
}
#kerbin-scene {
  position: absolute;
  inset: 0;
}
.game-shell::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  box-shadow: inset 0 0 110px rgba(0, 0, 0, 0.65);
  background: linear-gradient(
    180deg,
    rgba(2, 7, 9, 0.22),
    transparent 25%,
    transparent 70%,
    rgba(0, 0, 0, 0.2)
  );
}
button {
  font: inherit;
  color: inherit;
  cursor: default;
}
button:hover {
  cursor: pointer;
}
.hud-panel {
  background: linear-gradient(#4c514d, #292d2b);
  border: 2px solid #111513;
  box-shadow:
    inset 0 1px #747a74,
    0 2px 8px #0009;
}
.hud-panel h2,
.stage-title,
.maneuver-title,
.camera-controls-title,
.mission-tasks header > span {
  color: #e0a43a;
}
.hud-panel > h2,
.stage-title,
.maneuver-title,
.mission-tasks > header,
.satellite-camera > .camera-panel-header {
  min-height: 24px;
  margin: -2px 0 8px;
  padding: 0 28px 6px 2px;
  border-bottom: 1px solid #202522;
  color: #e0a43a;
  font-size: 12px;
  line-height: 18px;
}
.stage-title,
.maneuver-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.hud-panel > h2 {
  font-weight: 700;
}
.collapsible-hud {
  position: relative;
  transition: min-height 0.18s ease;
}
.hud-collapse {
  position: absolute;
  z-index: 4;
  top: 6px;
  right: 6px;
  width: 20px;
  height: 20px;
  border: 1px solid #60685d;
  background: #303630;
  color: #e0a43a;
  font: 15px/16px monospace;
}
.hud-collapse:hover {
  border-color: #e0a43a;
  background: #47432e;
}
.collapsible-hud.is-collapsed {
  min-height: 32px;
  height: 32px;
  overflow: hidden;
}
.collapsible-hud.is-collapsed
  > :not(.hud-collapse):not(.stage-title):not(.maneuver-title):not(h2) {
  visibility: hidden;
}
.loading-screen {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: grid;
  place-content: center;
  justify-items: center;
  background: #101613;
}
.ksp-mark {
  font: 900 58px/1 Arial;
  color: #eae9d2;
  text-shadow: 3px 3px #bc302c;
  transform: skew(-7deg);
}
.loading-track {
  width: 280px;
  height: 10px;
  margin: 25px 0 6px;
  background: #070907;
  border: 1px solid #7d8279;
}
.loading-track i {
  display: block;
  height: 100%;
  background: #e9a932;
  transition: width 0.25s ease;
}
.loading-screen p {
  color: #afb6a9;
  font-size: 13px;
}

.main-menu {
  position: absolute;
  inset: 0;
  z-index: 8;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  padding-left: max(7vw, 48px);
  background:
    linear-gradient(
      90deg,
      rgba(4, 8, 7, 0.94) 0,
      rgba(4, 8, 7, 0.76) 48%,
      rgba(4, 8, 7, 0.5) 100%
    ),
    url("/images/3/tycho2t3_80_pz.jpg") center/cover no-repeat #050807;
}
.home-topbar {
  position: absolute;
  z-index: 2;
  top: 0;
  left: 0;
  right: 0;
  height: 58px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 max(4vw, 32px);
  border-bottom: 1px solid #aeb8ae2b;
  background: #080d0bbd;
}
.home-title {
  display: flex;
  align-items: center;
  gap: 11px;
}
.home-title b {
  padding: 5px 7px;
  background: #d8932e;
  color: #141714;
  font: 900 15px Arial;
  transform: skew(-7deg);
}
.home-title span {
  color: #e0e5d9;
  font:
    italic 700 13px "Arial Black",
    "Impact",
    sans-serif;
  letter-spacing: 1px;
}
.home-status {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #bdc5bb;
  font-size: 10px;
}
.home-status i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #85bb4c;
  box-shadow: 0 0 7px #85bb4c;
}
.home-status em {
  margin-left: 15px;
  color: #858e84;
  font-style: normal;
}
.home-toolbar {
  position: absolute;
  right: max(4vw, 32px);
  top: 0;
  height: 58px;
  display: flex;
  align-items: center;
  gap: 7px;
}
.home-toolbar > button.btn-control {
  margin-left: 12px;
}
.home-toolbar > button {
  height: 30px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  border: 1px solid #252a27;
  background: #171c19;
  color: #cbd2c7;
  font-size: 10px;
}
.home-toolbar > button:hover:not(:disabled) {
  color: #e6aa38;
  background: #242a26;
}
.home-toolbar > button:disabled {
  cursor: default;
  opacity: 0.45;
}
.toolbar-icon {
  width: 14px;
  color: #d79b32;
  text-align: center;
  font-size: 14px;
}
.home-popover {
  position: absolute;
  z-index: 9;
  top: 66px;
  right: max(4vw, 32px);
  width: 220px;
  padding: 9px;
  border-radius: 4px;
}
.music-popover {
  display: grid;
  gap: 5px;
}
.music-popover > button {
  min-height: 50px;
  padding: 8px 10px;
  text-align: left;
  border: 1px solid #151815;
  background: #242925;
}
.music-popover > button.active {
  border-color: #d79b32;
  box-shadow: inset 3px 0 #d79b32;
}
.music-popover b,
.music-popover small {
  display: block;
}
.music-popover b {
  font-size: 11px;
}
.music-popover small {
  margin-top: 4px;
  color: #929b91;
  font-size: 8px;
}
.music-volume {
  display: grid;
  grid-template-columns: 35px 1fr;
  align-items: center;
  gap: 7px;
  margin-top: 5px;
  padding: 8px 5px;
  border-top: 1px solid #171a18;
  color: #aeb7ac;
  font-size: 9px;
}
.music-volume input {
  width: 100%;
  accent-color: #d99a31;
}
.music-popover > button.music-toggle {
  min-height: 32px;
  text-align: center;
  background: #b87627;
  color: #171917;
  font-weight: 800;
}
.audio-control {
  position: fixed;
  z-index: 12;
  top: 16px;
  right: 94px;
  height: 34px;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 2px 7px;
  border-radius: 3px;
}
.audio-control button {
  width: 28px;
  height: 28px;
  border: 1px solid #111;
  background: #242925;
  color: #aeb8ad;
  font: 18px/20px Arial;
}
.audio-control button.active {
  color: #e4ad39;
  background: #3d3b2a;
}
.audio-control input {
  width: 72px;
  accent-color: #d99a31;
}
.menu-orbit-visual {
  position: absolute;
  z-index: 0;
  left: 66%;
  top: 50%;
  width: min(46vw, 590px);
  aspect-ratio: 1;
  transform: translate(-50%, -50%);
}
.menu-planet {
  position: absolute;
  z-index: 2;
  inset: 14%;
  overflow: hidden;
  border-radius: 50%;
  background: #061423;
  box-shadow:
    0 0 0 1px #a8c9df88,
    0 0 18px #6497ba55,
    0 0 70px #15364a99;
  animation: planet-drift 7s ease-in-out infinite alternate;
}
.planet-surface {
  position: absolute;
  inset: 0;
  width: 200%;
  background-image: url("/images/earth-equirectangular.jpg");
  background-repeat: repeat-x;
  background-size: 50% 100%;
  filter: saturate(0.72) contrast(1.08) brightness(0.68) sepia(0.08)
    hue-rotate(8deg);
  animation: planet-surface-rotate 44s linear infinite;
}
.planet-shade {
  position: absolute;
  z-index: 1;
  inset: 0;
  border-radius: 50%;
  box-shadow:
    inset 38px 10px 48px #b9e7ff1c,
    inset -72px -12px 80px #000e,
    inset 0 0 10px 3px #b9e5ff55;
  pointer-events: none;
}
.menu-planet::after {
  content: "";
  position: absolute;
  z-index: 3;
  inset: -2px;
  border: 2px solid #b5dded55;
  border-radius: 50%;
  box-shadow: 0 0 12px 4px #8ccce733;
  filter: blur(2px);
  pointer-events: none;
}
.menu-orbit-ring {
  position: absolute;
  z-index: 1;
  inset: 5%;
  border: 1px solid #d7e5e966;
  border-radius: 50%;
  transform: rotateX(67deg) rotateZ(-18deg);
  animation: orbit-precession 18s ease-in-out infinite alternate;
}
.menu-orbit-ring i {
  position: absolute;
  top: 50%;
  left: -4px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #e8ad37;
  box-shadow: 0 0 9px #f1ba4c;
  animation: satellite-pulse 1.4s ease-in-out infinite alternate;
}
.menu-orbit-ring.ring-secondary {
  inset: 1%;
  border-color: #9fb9c33d;
  transform: rotateX(72deg) rotateZ(34deg);
  animation-duration: 25s;
}
.menu-orbit-ring.ring-secondary i {
  top: 18%;
  left: 78%;
  width: 6px;
  height: 6px;
  background: #d7e7e9;
  box-shadow: 0 0 7px #d7e7e9;
  animation-delay: 0.7s;
}
.menu-orbit-ring.orbit-front {
  z-index: 4;
  clip-path: inset(50% -10% -10% -10%);
  pointer-events: none;
}
.menu-orbit-ring.orbit-front i {
  display: none;
}
@keyframes planet-surface-rotate {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-50%);
  }
}
@keyframes planet-drift {
  to {
    transform: translateY(-8px) scale(1.015);
  }
}
@keyframes orbit-precession {
  to {
    transform: rotateX(67deg) rotateZ(3deg);
  }
}
@keyframes satellite-pulse {
  to {
    opacity: 0.45;
    transform: scale(0.75);
  }
}
.menu-brand {
  position: relative;
  z-index: 1;
  width: min(520px, calc(100vw - 40px));
  text-shadow: 0 2px 6px #000;
}
.menu-brand > span {
  color: #edaa32;
  font: bold 12px Arial;
}
.menu-brand h1 {
  margin: 9px 0 8px;
  color: #f1f1df;
  font:
    italic 900 42px/1.12 "Arial Black",
    "Impact",
    "Noto Sans SC", "Microsoft YaHei", sans-serif,
    sans-serif;
  letter-spacing: 2px;
  transform: skew(-6deg);
  text-shadow:
    2px 2px 0 #d8932e,
    0 0 20px #d8932e44;
}
.menu-brand p {
  margin: 0;
  color: #c1c8be;
  font-size: 14px;
}
.menu-actions {
  position: relative;
  z-index: 1;
  width: min(390px, calc(100vw - 40px));
  margin-top: 32px;
  padding: 8px;
  border-radius: 4px;
}
.menu-primary {
  width: 100%;
  min-height: 72px;
  padding: 13px 18px;
  text-align: left;
  border: 1px solid #111;
  background: #b87524;
  box-shadow: inset 0 1px #e8ae54;
  color: #151714;
}
.menu-primary:hover {
  background: #d28a29;
}
.menu-primary strong,
.menu-primary small {
  display: block;
}
.menu-primary strong {
  font-size: 17px;
}
.menu-primary small {
  margin-top: 6px;
  font-size: 10px;
  opacity: 0.75;
}
.menu-status {
  padding: 12px 8px 4px;
  color: #bdc5b9;
  font-size: 10px;
}
.menu-status i {
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-right: 6px;
  border-radius: 50%;
  background: #8fbd4c;
  box-shadow: 0 0 6px #8fbd4c;
}
.menu-version {
  position: absolute;
  left: max(7vw, 48px);
  bottom: 22px;
  color: #c5ccc0;
  font: bold 12px Arial;
  text-shadow: 1px 1px 2px #000;
}

.menu-disclaimer {
  position: absolute;
  right: max(7vw, 48px);
  bottom: 22px;
  color: #e0a33b;
  font: 12px "Microsoft YaHei", "Noto Sans SC", sans-serif;
  text-shadow: 1px 1px 2px #000;
  opacity: 0.75;
}

.top-hud {
  position: absolute;
  z-index: 3;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: min(760px, 80vw);
  height: 70px;
  display: grid;
  grid-template-columns: 1.25fr 1.2fr 1fr 1fr;
  border-radius: 0 0 5px 5px;
}
.top-hud > div {
  padding: 9px 14px;
  border-right: 1px solid #181b19;
}
.top-hud > div:last-child {
  border: 0;
}
.top-hud small {
  display: block;
  color: #bec5b7;
  font-size: 10px;
  text-transform: uppercase;
}
.mission-name span {
  display: block;
  color: #f0b53e;
  font: bold 10px Arial;
}
.mission-name strong {
  display: block;
  margin-top: 8px;
  font-size: 15px;
}
.digits {
  display: inline-block;
  margin-top: 4px;
  padding: 4px 6px;
  background: #0b0d0c;
  border: 1px solid #777d72;
  color: #f2f0d2;
  font: 22px/1 monospace;
  letter-spacing: 2px;
}
.altimeter b,
.vertical-speed b {
  color: #bac1b5;
  font-size: 10px;
}
.vertical-speed strong,
.mission-clock strong {
  display: inline-block;
  margin-top: 9px;
  color: #e7eacb;
  font: 18px monospace;
}

.stage-stack {
  position: absolute;
  z-index: 3;
  left: 12px;
  bottom: 28px;
  width: 220px;
  border-radius: 4px;
  overflow: hidden;
}
.stage-title {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  background: #1d211f;
  color: #f0b33b;
  font: 11px Arial;
}
.stage-title b {
  font-size: 24px;
}
.stage-row {
  position: relative;
  width: 100%;
  height: 58px;
  display: grid;
  grid-template-columns: 30px 1fr;
  align-items: center;
  text-align: left;
  border: 0;
  border-top: 1px solid #161917;
  background: #353a37;
  opacity: 0.55;
}
.stage-row.active {
  opacity: 1;
  background: #5b5538;
  box-shadow: inset 4px 0 #f2a922;
}
.stage-row.spent {
  opacity: 0.25;
  filter: grayscale(1);
}
.stage-row .engine-symbol {
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  color: #151815;
  background: #d5a33c;
  border: 2px solid #171a18;
  border-radius: 50%;
}
.stage-row b,
.stage-row small {
  display: block;
  font-size: 11px;
}
.stage-row small {
  margin-top: 3px;
  color: #bec4ba;
}
.stage-row i {
  position: absolute;
  left: 35px;
  right: 7px;
  bottom: 5px;
  height: 3px;
  background: linear-gradient(90deg, #7aa342 var(--fuel), #141714 var(--fuel));
}
.stage-trigger {
  width: 100%;
  height: 48px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 0;
  border-top: 2px solid #151815;
  padding: 0 12px;
  background: #b37424;
  font-weight: 800;
}
kbd {
  padding: 2px 5px;
  border: 1px solid #747a71;
  border-bottom-width: 2px;
  border-radius: 2px;
  background: #262a27;
  color: #e4e8df;
  font: 10px monospace;
}

.resources {
  position: absolute;
  z-index: 3;
  right: 12px;
  top: 88px;
  width: 225px;
  padding: 10px;
  border-radius: 4px;
}
.resources h2 {
  margin: 0 0 9px;
  color: #e9b03c;
  font-size: 12px;
  text-transform: uppercase;
}
.resource-row {
  display: grid;
  grid-template-columns: 78px 1fr 34px;
  gap: 6px;
  align-items: center;
  margin: 7px 0;
  font-size: 10px;
}
.resource-row > i {
  height: 8px;
  background: #121512;
  border: 1px solid #0b0c0b;
}
.resource-row > i b {
  display: block;
  height: 100%;
  background: #7eaa42;
}
.resource-row > i.electric b {
  background: #e2b83e;
}
.resource-row em {
  color: #cbd1c6;
  font-style: normal;
  text-align: right;
}
.orbit-readout {
  margin-top: 11px;
  padding-top: 7px;
  border-top: 1px solid #161916;
}
.orbit-readout div {
  display: grid;
  grid-template-columns: 1fr 45px 32px;
  margin: 5px 0;
  font-size: 10px;
}
.orbit-readout b {
  color: #f0b43a;
  text-align: right;
  font: 12px monospace;
}
.orbit-readout small {
  color: #bfc4b9;
  text-align: right;
}
.maneuver-panel {
  position: absolute;
  z-index: 3;
  top: 320px;
  right: 12px;
  width: 225px;
  padding: 10px;
  border-radius: 4px;
}
.maneuver-title,
.maneuver-node-time {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.maneuver-title {
  margin-bottom: 8px;
  color: #e9b03c;
  font-size: 11px;
}
.maneuver-title b,
.maneuver-node-time b {
  color: #eef0df;
  font: 12px monospace;
}
.maneuver-fuel {
  margin: -3px 0 8px;
}
.maneuver-fuel i {
  display: block;
  height: 6px;
  overflow: hidden;
  border: 1px solid #101310;
  background: #151815;
}
.maneuver-fuel b {
  display: block;
  height: 100%;
  background: #8daa43;
  transition: width 0.2s ease;
}
.maneuver-directions,
.maneuver-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px;
}
.maneuver-directions button,
.maneuver-actions button {
  height: 29px;
  padding: 0 8px;
  border: 1px solid #111411;
  background: #282d29;
  color: #cbd1c7;
  font-size: 10px;
}
.maneuver-directions button.active {
  border-color: #d59b35;
  background: #4a422c;
  color: #f0b43a;
}
.maneuver-directions button:disabled {
  opacity: 0.55;
}
.maneuver-dv {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 6px;
  margin-top: 9px;
  color: #bfc6bc;
  font-size: 9px;
}
.maneuver-dv b {
  color: #e7eadf;
  font: 11px monospace;
}
.maneuver-dv input {
  grid-column: 1 / -1;
  width: 100%;
  accent-color: #d89a35;
}
.maneuver-orbit-data {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px;
  margin: 8px 0;
  color: #aeb6ac;
  font-size: 8px;
}
.maneuver-orbit-data span {
  padding: 5px;
  background: #161a17;
}
.maneuver-orbit-data b {
  color: #76dbe1;
  font: 10px monospace;
}
.maneuver-node-time {
  margin: 7px 0;
  padding: 6px;
  border: 1px solid #4e452d;
  color: #c5cbc1;
  font-size: 9px;
}
.maneuver-actions button:first-child {
  grid-column: 1 / -1;
  background: #a96e26;
  color: #171a17;
  font-weight: 800;
}
.maneuver-actions button.armed {
  background: #4d5432;
  color: #dce8b8;
}
.maneuver-actions button.secondary {
  grid-column: 1 / -1;
  background: #282d29;
  color: #c7cdc3;
}
.maneuver-panel p {
  margin: 7px 0 0;
  color: #e0c485;
  font-size: 9px;
  white-space: nowrap;
}
.orbit-legend {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px 7px;
  margin-top: 9px;
  padding-top: 8px;
  border-top: 1px solid #171b18;
}
.orbit-legend > b {
  grid-column: 1 / -1;
  color: #aeb6ac;
  font-size: 9px;
}
.orbit-legend span {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  color: #c6ccc2;
  font-size: 8px;
  white-space: nowrap;
}
.orbit-legend img {
  width: 22px;
  height: 22px;
  image-rendering: auto;
}

.flight-status {
  position: absolute;
  z-index: 3;
  bottom: 232px;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
}
.situation {
  display: inline-block;
  margin-bottom: 5px;
  padding: 3px 14px;
  background: #242825dd;
  border: 1px solid #070907;
  color: #eab43f;
  font-size: 11px;
}
.speed-mode {
  min-width: 154px;
  padding: 5px 12px;
  border-radius: 4px;
  background: #151917e8;
  border: 2px solid #60655f;
}
.speed-mode span {
  display: block;
  color: #acb3a8;
  font-size: 9px;
}
.speed-mode strong {
  font: 22px monospace;
}
.speed-mode small {
  margin-left: 4px;
}

.nav-cluster {
  position: absolute;
  z-index: 3;
  left: 50%;
  bottom: -42px;
  transform: translateX(-50%);
  width: 250px;
  height: 270px;
}
.navball {
  position: absolute;
  left: 25px;
  top: 0;
  width: 200px;
  height: 200px;
  overflow: hidden;
  border: 0;
  outline: 9px solid #393d3a;
  border-radius: 50%;
  box-shadow:
    0 0 0 3px #111,
    inset 0 0 30px #0008,
    0 4px 14px #000c;
  background: linear-gradient(to bottom, #4f87ae 0 50%, #8a5937 50% 100%);
}
.nav-grid {
  position: absolute;
  inset: -100px;
  transform: translateY(var(--pitch)) rotate(var(--roll));
  background:
    repeating-linear-gradient(0deg, transparent 0 19px, #e9eee966 20px 21px),
    repeating-linear-gradient(90deg, transparent 0 19px, #e9eee955 20px 21px);
}
.nav-grid::before,
.nav-grid::after {
  content: "";
  position: absolute;
  background: #f5eed3aa;
}
.nav-grid::before {
  left: 50%;
  top: 0;
  bottom: 0;
  width: 2px;
}
.nav-grid::after {
  top: 50%;
  left: 0;
  right: 0;
  height: 2px;
}
.grid-horizon {
  position: absolute;
  z-index: 1;
  left: 0;
  right: 0;
  top: 50%;
  height: 3px;
  background: #e8ebd7;
  box-shadow: 0 2px 0 #382b21;
}
.heading {
  position: absolute;
  z-index: 4;
  color: #fff;
  font: bold 11px Arial;
  text-shadow: 1px 1px #000;
}
.north {
  top: 7px;
  left: 94px;
}
.east {
  right: 7px;
  top: 94px;
}
.south {
  bottom: 7px;
  left: 92px;
}
.west {
  left: 7px;
  top: 94px;
}
.nav-degree-ring {
  position: absolute;
  z-index: 5;
  inset: 0;
  pointer-events: none;
}
.nav-degree-ring b {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 26px;
  height: 15px;
  margin: -8px -13px;
  color: #d9e1d7;
  text-align: center;
  font: 8px/15px monospace;
  text-shadow: 1px 1px #000;
  transform-origin: 13px 8px;
}
.nav-center-mark {
  position: absolute;
  z-index: 7;
  left: calc(50% + 1px);
  top: 50%;
  width: 112px;
  height: 3px;
  transform: translate(-50%, -50%);
  pointer-events: none;
}
.nav-center-mark i {
  position: absolute;
  top: 0;
  width: 34px;
  height: 3px;
  background: #f4d73e;
  box-shadow: 0 1px #000;
}
.nav-center-mark i:first-child {
  left: 0;
}
.nav-center-mark i:last-child {
  right: 0;
}
.nav-center-mark b {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 12px;
  height: 12px;
  transform: translate(-50%, -50%) rotate(45deg);
  border: 2px solid #f4d73e;
  background: transparent;
}
.nav-target {
  position: absolute;
  z-index: 6;
  text-shadow: 0 0 3px #000;
  font-family: Arial;
  font-weight: bold;
  margin-left: 2px;
}
.nav-target small {
  display: block;
  margin-top: -5px;
  font: 7px monospace;
}
.target-prograde {
  left: 50%;
  top: 38px;
  width: 32px;
  transform: translateX(-50%);
  text-align: center;
  color: #9cff5d;
  font-size: 28px;
}
.target-retrograde {
  left: 50%;
  bottom: 36px;
  width: 32px;
  transform: translateX(-50%);
  text-align: center;
  color: #ff75a7;
  font-size: 25px;
}
.target-normal {
  left: calc(50% + 45px);
  top: 78px;
  color: #c28cff;
  font-size: 20px;
}
.target-radial {
  left: calc(50% - 61px);
  top: 78px;
  color: #ffbb58;
  font-size: 17px;
}
.level-mark {
  position: absolute;
  z-index: 5;
  top: 88px;
  left: 50%;
  transform: translateX(-50%);
  width: 120px;
  display: flex;
  align-items: center;
  color: #f4d73e;
}
.level-mark i {
  flex: 1;
  height: 3px;
  background: #f4d73e;
  box-shadow: 0 1px #000;
}
.level-mark b {
  font-size: 24px;
}
.heading-tape {
  position: absolute;
  left: 77px;
  top: 188px;
  width: 96px;
  height: 30px;
  text-align: center;
  background: #171a18;
  border: 2px solid #61665f;
  clip-path: polygon(8% 0, 92% 0, 100% 100%, 0 100%);
}
.tape-ticks {
  position: absolute;
  top: 3px;
  left: 8px;
  right: 8px;
  display: flex;
  justify-content: space-between;
}
.tape-ticks i {
  width: 1px;
  height: 5px;
  background: #bec8bc;
}
.tape-ticks i:nth-child(2n) {
  height: 3px;
  opacity: 0.65;
}
.heading-tape b {
  position: relative;
  top: 8px;
  color: #e9e8d0;
  font: 16px monospace;
}
.sas-controls {
  position: absolute;
  z-index: 3;
  left: calc(50% + 132px);
  bottom: 28px;
  width: 106px;
  height: 42px;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  gap: 6px;
  padding: 5px 6px;
  border-radius: 4px;
}
.sas-controls button {
  position: relative;
  width: 42px;
  height: 29px;
  border: 1px solid #111;
  background: #242825;
  color: #aeb6aa;
  font: bold 10px Arial;
  transition:
    background 0.16s,
    color 0.16s,
    box-shadow 0.16s,
    transform 0.12s;
}
.sas-controls button.on {
  color: #161816;
  background: #d9a934;
  box-shadow:
    inset 0 1px #f2c45f,
    0 0 7px #e5a82b;
  transform: translateY(1px);
}
.sas-controls button::after {
  content: attr(data-tooltip);
  position: absolute;
  z-index: 20;
  left: 50%;
  bottom: calc(100% + 10px);
  width: 210px;
  padding: 7px 9px;
  transform: translateX(-50%) translateY(3px);
  border: 1px solid #151815;
  border-radius: 3px;
  background: #202522f2;
  box-shadow: 0 3px 10px #0009;
  color: #d8ded3;
  font:
    10px/1.5 "Microsoft YaHei",
    sans-serif;
  text-align: left;
  white-space: normal;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition:
    opacity 0.14s,
    transform 0.14s;
}
.sas-controls button:hover::after {
  opacity: 1;
  visibility: visible;
  transform: translateX(-50%) translateY(0);
}
.sas-controls button::after {
  display: none;
}
.control-tooltip {
  position: absolute;
  z-index: 20;
  left: calc(100% + 10px);
  top: 50%;
  width: max-content;
  padding: 8px 11px;
  transform: translateY(-50%);
  border: 1px solid #d39a36;
  border-radius: 3px;
  background: #171c19f7;
  box-shadow:
    0 3px 12px #000c,
    0 0 6px #d39a3633;
  color: #f0f2e8;
  font:
    11px/1.4 "Microsoft YaHei",
    sans-serif;
  text-align: left;
  white-space: nowrap;
  pointer-events: none;
}

.throttle-control {
  position: absolute;
  z-index: 3;
  left: 260px;
  bottom: 28px;
  width: 128px;
  height: 205px;
  border-radius: 4px;
  text-align: center;
}
.throttle-control :deep(.hud-panel-body) {
  position: relative;
  height: 170px;
}
.throttle-control :deep(.hud-panel-body) > span {
  display: block;
  color: #d0d5ca;
  font: bold 10px Arial;
  text-align: right;
  padding-right: 4px;
}
.throttle-track {
  position: absolute;
  left: 14px;
  bottom: 36px;
  width: 14px;
  height: 112px;
  background: linear-gradient(#0c0e0d, #181b1a);
  border: 2px solid #111513;
  box-shadow: inset 0 1px #2a2e2b;
  border-radius: 2px;
  cursor: pointer;
  touch-action: none;
}
.throttle-fill {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(#e3a92f, #6fa339);
  border-radius: 1px;
}
.throttle-handle {
  position: absolute;
  left: -3px;
  width: 20px;
  height: 10px;
  background: linear-gradient(#f0c14a, #c98e1e);
  border: 1px solid #6a4e0a;
  box-shadow:
    inset 0 1px #ffe082,
    0 1px 3px #0008;
  border-radius: 2px;
  cursor: grab;
  pointer-events: none;
}
.throttle-buttons {
  position: absolute;
  right: 8px;
  bottom: 40px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  width: 72px;
}
.throttle-buttons button {
  width: 100%;
  height: 26px;
  padding: 0;
  border: 1px solid #111;
  background: #222623;
  font: bold 9px Arial;
}
.throttle-buttons button:nth-child(1),
.throttle-buttons button:nth-child(2) {
  grid-column: span 2;
}
.time-controls {
  position: absolute;
  z-index: 3;
  left: calc(50% - 132px);
  transform: translateX(-100%);
  bottom: 28px;
  height: 48px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 7px;
  border-radius: 4px;
}
.time-controls button {
  min-width: 30px;
  height: 30px;
  padding: 0 6px;
  border: 1px solid #111;
  background: #242925;
  color: #cbd2c6;
  font-size: 10px;
}
.time-controls button.active {
  background: #d79b32;
  color: #171917;
}
.time-controls button:active {
  transform: none;
}
.time-controls button:focus-visible {
  outline: 2px solid #d79b32;
  outline-offset: -2px;
}
.time-state-icon {
  position: relative;
  display: inline-block;
  width: 13px;
  height: 15px;
  vertical-align: middle;
}
.time-state-icon::before,
.time-state-icon::after {
  content: "";
  position: absolute;
  top: 1px;
  bottom: 1px;
  width: 4px;
  background: currentColor;
}
.time-state-icon::before {
  left: 1px;
}
.time-state-icon::after {
  right: 1px;
}
.time-state-icon.play {
  width: 0;
  height: 0;
  border-top: 8px solid transparent;
  border-bottom: 8px solid transparent;
  border-left: 12px solid currentColor;
}
.time-state-icon.play::before,
.time-state-icon.play::after {
  display: none;
}
.time-controls span {
  margin: 0 4px 0 7px;
  color: #9da79b;
  font-size: 9px;
}

.camera-tools {
  position: absolute;
  z-index: 3;
  right: 12px;
  bottom: 18px;
  display: flex;
  border-radius: 4px;
  overflow: hidden;
  background: linear-gradient(#4c514d, #292d2b);
  border: 2px solid #111513;
  box-shadow:
    inset 0 1px #747a74,
    0 2px 8px #0009;
}
.camera-tools button {
  height: 34px;
  border: 0;
  border-right: 1px solid #111513;
  background: transparent;
  padding: 0 12px;
  font-size: 11px;
  color: #cbd2c6;
}
.camera-tools button:hover {
  background: #1e221f;
}
.camera-tools button.active {
  color: #f1b43a;
  background: #1e221f;
}
.camera-distance {
  display: inline-flex;
  align-items: center;
  height: 34px;
  padding: 0 9px;
  border-right: 1px solid #111;
  color: #9fb8a2;
  font: 10px monospace;
  white-space: nowrap;
}
.settings-popover {
  width: min(420px, calc(100vw - 32px));
  padding: 0;
  border-radius: 4px;
}
.settings-dialog {
  box-shadow: inset 0 1px #7c8479;
}
.settings-dialog > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 13px 9px;
  border-bottom: 1px solid #202522;
}
.settings-dialog > header span {
  display: block;
  color: #e0a43a;
  font-size: 14px;
  font-weight: 700;
}
.settings-dialog > header small {
  display: block;
  margin-top: 3px;
  color: #8f9a8d;
  font: 9px monospace;
}
.settings-dialog > header button {
  width: 26px;
  height: 26px;
  border: 1px solid #60685d;
  background: #303630;
  color: #d8ddd3;
  font-size: 18px;
}
.settings-body {
  padding: 13px;
}
.settings-token {
  display: grid;
  gap: 6px;
  color: #c7cec3;
  font-size: 11px;
}
.settings-token input {
  width: 100%;
  box-sizing: border-box;
  height: 32px;
  border: 1px solid #4a554a;
  background: #171c19;
  color: #e4eadc;
  padding: 0 9px;
  outline: none;
}
.settings-token input:focus {
  border-color: #d59b35;
}
.settings-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7px;
  margin-top: 12px;
}
.settings-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 46px;
  padding: 7px 9px;
  border: 1px solid #343d35;
  background: #252a27;
}
.settings-option b,
.settings-option small {
  display: block;
}
.settings-option b {
  color: #d6ddd2;
  font-size: 11px;
}
.settings-option small {
  margin-top: 3px;
  color: #8e998d;
  font-size: 9px;
}
.settings-option input {
  width: 17px;
  height: 17px;
  accent-color: #d59b35;
}
.settings-tuning {
  display: grid;
  gap: 7px;
  margin-top: 13px;
  padding-top: 10px;
  border-top: 1px solid #202522;
}
.settings-tuning h3 {
  margin: 0 0 1px;
  color: #e0a43a;
  font-size: 11px;
  font-weight: 700;
}
.settings-tuning label {
  display: grid;
  gap: 4px;
  color: #bfc8bc;
  font-size: 10px;
}
.settings-tuning label span {
  display: flex;
  justify-content: space-between;
}
.settings-tuning label b {
  color: #e0a43a;
  font: 10px monospace;
}
.settings-tuning input[type="range"] {
  width: 100%;
  accent-color: #d59b35;
}
.settings-dialog > footer {
  display: flex;
  justify-content: flex-end;
  gap: 7px;
  padding: 10px 13px;
  border-top: 1px solid #202522;
}
.settings-dialog > footer button {
  height: 30px;
  padding: 0 13px;
  border: 1px solid #505950;
  background: #303630;
  color: #d4dbcf;
}
.settings-dialog > footer .settings-apply {
  border-color: #a8732b;
  background: #8c5c22;
  color: #fff0c8;
}
.satellite-camera {
  position: absolute;
  z-index: 12;
  top: 182px;
  right: auto;
  left: 50%;
  transform: translateX(-50%);
  width: 610px;
  max-height: none;
  padding: 8px;
  border-radius: 4px;
  border: 2px solid #111513;
  background: linear-gradient(#4c514d, #292d2b);
  box-shadow:
    inset 0 1px #7c8479,
    0 3px 10px #0009;
  overflow: hidden;
}
.satellite-camera-workspace {
  display: grid;
  grid-template-columns: 190px 375px;
  gap: 10px;
  align-items: start;
}
.satellite-camera-side {
  min-width: 0;
}
.satellite-camera-actions {
  display: flex;
  gap: 5px;
  min-height: 28px;
}
.ground-link-status {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 28px;
  margin-top: 6px;
  padding: 4px 8px;
  border: 1px solid #303832;
  background: #202522;
  color: #8f998f;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ground-link-status i {
  width: 8px;
  height: 8px;
  flex: 0 0 8px;
  border-radius: 50%;
  background: #636b64;
}
.ground-link-status.active {
  border-color: #33ff33;
  color: #33ff33;
  background: #1a2e1a;
  animation: link-pulse 1.5s ease-in-out infinite;
}
.ground-link-status.active i {
  background: #33ff33;
  box-shadow: 0 0 8px #33ff33;
}
@keyframes link-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(51, 255, 51, 0.4);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(51, 255, 51, 0);
  }
}
.mission-tasks {
  position: absolute;
  z-index: 5;
  top: 16px;
  left: 12px;
  width: 220px;
  padding: 8px;
  border-radius: 4px;
}
.mission-tasks header {
  display: grid;
  grid-template-columns: 1fr auto 24px;
  align-items: center;
  gap: 7px;
  color: #d8ddd3;
  font-size: 12px;
}
.mission-tasks header b {
  color: #d59b35;
  font: 11px monospace;
}
.mission-tasks header button {
  width: 22px;
  height: 22px;
  border: 1px solid #596256;
  background: #303630;
  color: #d8ddd3;
}
.mission-task-list {
  display: grid;
  gap: 4px;
  margin-top: 7px;
  padding-top: 6px;
}
.mission-task-list > div {
  display: grid;
  grid-template-columns: 20px 1fr;
  gap: 6px;
  align-items: center;
  padding: 5px;
  border-left: 2px solid #555b54;
  background: #252a27;
}
.mission-task-list i {
  color: #929b90;
  font-style: normal;
  text-align: center;
}
.mission-task-list b,
.mission-task-list small {
  display: block;
}
.mission-task-list b {
  color: #c5ccc0;
  font-size: 11px;
}
.mission-task-list small {
  margin-top: 2px;
  color: #8f9a8d;
  font-size: 9px;
}
.mission-task-list .active {
  border-left-color: #d59b35;
}
.mission-task-list .active i {
  color: #d59b35;
}
.mission-task-list .completed {
  border-left-color: #83c95a;
}
.mission-task-list .completed i {
  color: #83c95a;
}
.mission-task-list .locked {
  opacity: 0.55;
}
.satellite-camera > button {
  height: 28px;
  margin-right: 5px;
  padding: 0 10px;
  border: 1px solid #111513;
  border-radius: 2px;
  background: #373c38;
  color: #d9ddd5;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.3px;
}
.satellite-camera :deep(.hud-panel-body) > button {
  height: 28px;
  margin-right: 5px;
  padding: 0 10px;
  border: 1px solid #111513;
  border-radius: 2px;
  background: #373c38;
  color: #d9ddd5;
  font-size: 10px;
  font-weight: 700;
}
.satellite-camera :deep(.hud-panel-body) > button:hover {
  border-color: #d59b35;
  color: #f1bd55;
  background: #3b3a29;
}
.satellite-camera > button:hover {
  border-color: #d59b35;
  color: #f1bd55;
  background: #3b3a29;
}
.satellite-camera > button:disabled {
  opacity: 0.6;
}
.satellite-camera-controls {
  display: grid;
  gap: 4px;
  margin-top: 6px;
  width: 100%;
  padding-top: 6px;
  border-top: 1px solid #171b18;
  color: #c0c6bc;
  font-size: 10px;
}
.camera-controls-title {
  padding: 2px 0 6px;
  color: #d59b35;
  font-size: 10px;
  letter-spacing: 1px;
}
.satellite-camera-controls label {
  display: grid;
  grid-template-columns: 34px 1fr 44px;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  padding: 3px 4px;
  border: 1px solid #202522;
  border-left: 2px solid #d59b35;
  background: #252a27;
}
.satellite-camera-controls input[type="range"] {
  width: 100%;
  height: 3px;
  accent-color: #d59b35;
}
.satellite-camera-controls label::first-letter {
  color: #d59b35;
}
.satellite-camera-view {
  position: relative;
  width: 375px;
  height: 230px;
  margin: 0;
  border: 2px solid #2c7090;
  background: #020505;
}
.satellite-camera-actions button {
  height: 28px;
  padding: 0 10px;
  border: 1px solid #111513;
  border-radius: 2px;
  background: #373c38;
  color: #d9ddd5;
  font-size: 10px;
  font-weight: 700;
}
.photo-strip {
  grid-column: 1 / -1;
  display: flex;
  gap: 6px;
  margin-top: 5px;
  width: 100%;
  max-width: none;
  overflow-x: auto;
  padding: 8px;
  min-height: 76px;
  box-sizing: border-box;
  border: 1px solid #3c5147;
  background: #161c18;
  scrollbar-width: thin;
  scrollbar-color: #d59b35 #202522;
}
.photo-strip::-webkit-scrollbar {
  height: 6px;
}
.photo-strip::-webkit-scrollbar-track {
  border-radius: 4px;
  background: #202522;
}
.photo-strip::-webkit-scrollbar-thumb {
  border: 1px solid #202522;
  border-radius: 4px;
  background: linear-gradient(90deg, #a46d2a, #e0a43a);
}
.photo-strip::-webkit-scrollbar-thumb:hover {
  background: #f0b64a;
}
.photo-thumb {
  position: relative;
  flex: 0 0 112px;
  width: 112px;
  height: 72px;
  padding: 0;
  border: 1px solid #2c7090;
  background: #0b1111;
  overflow: hidden;
}
.photo-strip-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  color: #7f8c80;
  font-size: 10px;
}
.photo-thumb img {
  width: 100%;
  height: 52px;
  object-fit: cover;
  cursor: pointer;
}
.photo-thumb-actions {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  height: 19px;
  background: #111613dd;
}
.photo-thumb-actions button,
.photo-thumb-actions a {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px 4px;
  border: 1px solid #4a5548;
  background: #2a2f2c;
  color: #d4dbc9;
  font-size: 9px;
  text-decoration: none;
}
.photo-thumb-actions button:hover {
  background: #3d482f;
  color: #e0a43a;
}
.photo-thumb-actions button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.photo-thumb-actions .btn-view {
  border-color: #2d7cee;
  color: #2d7cee;
  font-weight: 700;
}
.photo-thumb-actions .btn-view:hover {
  background: #1a2a4a;
  color: #5599ff;
}
.photo-thumb-actions .btn-delete {
  border-color: #e03030;
  color: #e03030;
  font-weight: 700;
}
.photo-thumb-actions .btn-delete:hover {
  background: #3a1a1a;
  color: #ff5555;
}
.photo-thumb-actions .btn-downlink {
  background: #1a3d1a;
  border-color: #33ff33;
  color: #33ff33;
  font-weight: 700;
}
.photo-thumb-actions .btn-downlink:hover {
  background: #2a5a2a;
  color: #66ff66;
}
.photo-thumb-actions .btn-downlink:disabled {
  opacity: 0.35;
  border-color: #334433;
  color: #446644;
}
.photo-preview-toolbar button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.photo-preview {
  position: fixed;
  z-index: 2147483647;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  background: #020505dd;
}
.photo-preview-stage {
  position: absolute;
  inset: 64px 30px 70px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  cursor: grab;
  touch-action: none;
}
.photo-preview-stage.dragging {
  cursor: grabbing;
}
.photo-preview-stage img {
  max-width: min(88vw, 1100px);
  max-height: 78vh;
  border: 2px solid #4ca7c7;
  transform-origin: center;
  user-select: none;
  pointer-events: none;
  will-change: transform;
}
.photo-preview a,
.photo-preview-close {
  position: absolute;
  color: #dff8ff;
  background: #123745;
  border: 1px solid #4ca7c7;
  padding: 7px 12px;
}
.photo-preview-toolbar {
  position: absolute;
  z-index: 2;
  top: 18px;
  left: 50%;
  display: flex;
  gap: 6px;
  transform: translateX(-50%);
}
.photo-preview-toolbar button {
  min-width: 36px;
  height: 34px;
  border: 1px solid #4ca7c7;
  background: #123745;
  color: #dff8ff;
}
.photo-preview-toolbar button:hover {
  background: #245a6e;
}
.photo-preview a {
  bottom: 24px;
  text-decoration: none;
  font-size: 12px;
}
.photo-preview-close {
  top: 18px;
  right: 24px;
  font-size: 24px;
}
.satellite-capture-canvas {
  position: fixed;
  left: -10000px;
  top: -10000px;
  width: 960px;
  height: 540px;
  pointer-events: none;
}
* {
  scrollbar-width: thin;
  scrollbar-color: #a9752e #1b201d;
}
*::-webkit-scrollbar {
  width: 7px;
  height: 7px;
}
*::-webkit-scrollbar-track {
  background: #1b201d;
}
*::-webkit-scrollbar-thumb {
  border: 1px solid #1b201d;
  border-radius: 5px;
  background: linear-gradient(180deg, #c58a34, #775323);
}
*::-webkit-scrollbar-thumb:hover {
  background: #e0a43a;
}
.camera-tools .home-button {
  position: fixed;
  z-index: 5;
  top: 16px;
  right: 16px;
  width: 64px;
  height: 34px;
  border: 2px solid #111513;
  border-radius: 3px;
  background: #3b423d;
  box-shadow:
    inset 0 1px #7c8479,
    0 2px 7px #0009;
  color: #e3e7db;
}
.camera-tools .home-button:hover {
  color: #171917;
  background: #d38a2b;
}
.briefing,
.result-modal {
  position: absolute;
  z-index: 6;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(520px, calc(100vw - 32px));
  padding: 28px;
  border-radius: 5px;
  text-align: center;
}
.briefing {
  top: 29%;
}
.briefing-close {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid #141714;
  background: #252925;
  color: #d5dbd0;
  font: 20px/24px Arial;
}
.briefing-close:hover {
  color: #171917;
  background: #d69831;
}
.briefing .badge {
  display: inline-block;
  padding: 4px 9px;
  background: #d18a2b;
  color: #111;
  font: bold 14px Arial;
}
.briefing h1,
.result-modal h2 {
  margin: 14px 0 9px;
  font-size: 25px;
}
.briefing p,
.result-modal p {
  margin: 0 auto 18px;
  max-width: 430px;
  color: #c4cbc0;
  line-height: 1.7;
  font-size: 13px;
}
.key-guide {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px 14px;
  margin: 18px 0;
  font-size: 10px;
  color: #c7cdc3;
}
.result-modal button {
  min-width: 150px;
  height: 42px;
  border: 2px solid #171917;
  background: #ce8127;
  box-shadow: inset 0 1px #f6bd5a;
  color: #161716;
  font-weight: 900;
}
.result-modal > span {
  color: #efae36;
  font: bold 12px Arial;
}
.result-modal.success {
  border-color: #6d943b;
}
.result-modal.success > span {
  color: #98c955;
}
.orbit-toast {
  position: absolute;
  z-index: 4;
  top: 86px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 13px;
  border-radius: 3px;
  color: #cdd6c6;
  font-size: 10px;
}
.orbit-toast i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #91c452;
  box-shadow: 0 0 7px #91c452;
}
.system-message {
  position: absolute;
  z-index: 9;
  top: 132px;
  left: 50%;
  min-width: 260px;
  max-width: min(520px, calc(100vw - 32px));
  padding: 10px 16px;
  transform: translateX(-50%);
  border-radius: 3px;
  color: #edf1e8;
  font-size: 12px;
  text-align: center;
  pointer-events: none;
}
.system-message.error {
  border-color: #a7433f;
  background: #472927f2;
  color: #ffd5d1;
}
.system-message.success {
  border-color: #668d45;
  background: #293b27f2;
  color: #d9efc9;
}
.launch-countdown {
  position: absolute;
  z-index: 8;
  left: 50%;
  top: 38%;
  width: 150px;
  height: 150px;
  display: grid;
  place-content: center;
  justify-items: center;
  transform: translate(-50%, -50%);
  border: 2px solid #d99a32;
  border-radius: 50%;
  background: #171c19df;
  box-shadow:
    0 0 0 6px #171c1988,
    0 0 28px #d99a3255;
}
.launch-countdown small {
  color: #cbd2c7;
  font-size: 10px;
}
.launch-countdown b {
  margin-top: 4px;
  color: #f2b13d;
  font: 700 68px/1 monospace;
}
.control-hint {
  position: absolute;
  z-index: 3;
  right: 12px;
  bottom: 82px;
  padding: 5px 8px;
  border: 1px solid #171b18;
  border-radius: 3px;
  background: #171c19d9;
  color: #abb1a8;
  font-size: 10px;
  text-shadow: 1px 1px #000;
  white-space: nowrap;
}

.game-shell :deep(.rocket-component-popup) {
  width: 250px;
  overflow: hidden;
  border: 2px solid #111513;
  border-radius: 4px;
  background: linear-gradient(#444a46, #242825);
  box-shadow:
    inset 0 1px #697069,
    0 5px 18px #000c;
  color: #e7eadf;
  font-family: "Microsoft YaHei", Arial, sans-serif;
  cursor: move;
}
.game-shell :deep(.rocket-component-popup header) {
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-left: 10px;
  border-bottom: 1px solid #171a18;
  background: #1c211e;
  color: var(--component-color, #83c95a);
  font-size: 11px;
}
.game-shell :deep(.rocket-component-popup header button) {
  width: 32px;
  height: 30px;
  padding: 0;
  border: 0;
  border-left: 1px solid #101310;
  background: #292e2a;
  color: #d9dfd5;
  font: 20px/1 Arial;
  cursor: pointer;
}
.game-shell :deep(.rocket-component-popup h3) {
  margin: 10px 10px 5px;
  color: #f0f2e8;
  font-size: 15px;
}
.game-shell :deep(.component-popup-status) {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0 10px 8px;
  color: #cbd2c8;
  font-size: 11px;
}
.game-shell :deep(.component-popup-status i) {
  width: 7px;
  height: 7px;
  background: var(--component-color, #83c95a);
  box-shadow: 0 0 6px var(--component-color, #83c95a);
}
.game-shell :deep(.rocket-component-popup dl) {
  margin: 0;
  padding: 7px 10px;
  border-top: 1px solid #1a1e1b;
  border-bottom: 1px solid #1a1e1b;
  background: #202522aa;
}
.game-shell :deep(.rocket-component-popup dl div) {
  display: grid;
  grid-template-columns: 82px 1fr;
  margin: 5px 0;
  font-size: 10px;
}
.game-shell :deep(.rocket-component-popup dt) {
  color: #aeb7ad;
}
.game-shell :deep(.rocket-component-popup dd) {
  margin: 0;
  color: #eef0e5;
  text-align: right;
  font-family: monospace;
}
.game-shell :deep(.component-popup-fuel) {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 5px;
  padding: 9px 10px 11px;
  color: #bfc7bc;
  font-size: 10px;
}
.game-shell :deep(.component-popup-fuel > b) {
  color: #dfe5d9;
  font-family: monospace;
}
.game-shell :deep(.component-popup-fuel > i) {
  grid-column: 1 / -1;
  height: 7px;
  overflow: hidden;
  border: 1px solid #101310;
  background: #111411;
}
.game-shell :deep(.component-popup-fuel em) {
  display: block;
  height: 100%;
  background: var(--component-color, #83c95a);
}

.game-shell {
  font-family: "Microsoft YaHei", Arial, sans-serif;
  font-size: 13px;
}
.home-status,
.home-toolbar > button,
.menu-primary small,
.menu-status,
.top-hud small,
.altimeter b,
.vertical-speed b,
.resource-row,
.orbit-readout div,
.maneuver-directions button,
.maneuver-actions button,
.briefing li,
.orbit-toast,
.launch-countdown small,
.control-hint {
  font-size: 12px;
}
.music-popover b,
.stage-row b,
.stage-row small,
.maneuver-title,
.situation,
.camera-tools button,
.home-title span {
  font-size: 13px;
}
.music-popover small,
.maneuver-orbit-data,
.orbit-legend span {
  font-size: 10px;
}
.music-volume,
.maneuver-dv,
.maneuver-node-time,
.maneuver-panel p,
.orbit-legend > b,
.speed-mode span,
.time-controls span {
  font-size: 11px;
}

@media (max-width: 760px) {
  .main-menu {
    justify-content: flex-end;
    padding: 0 20px 72px;
    background:
      linear-gradient(0deg, rgba(4, 8, 7, 0.96), rgba(4, 8, 7, 0.48) 100%),
      url("/images/3/tycho2t3_80_pz.jpg") center/cover no-repeat #050807;
  }
  .home-topbar {
    height: 50px;
    padding: 0 16px;
  }
  .home-title span {
    font-size: 11px;
  }
  .home-status em {
    display: none;
  }
  .home-status span {
    display: none;
  }
  .home-toolbar {
    gap: 4px;
  }
  .home-toolbar > button {
    padding: 0 8px;
  }
  .home-popover {
    top: 57px;
    right: 10px;
  }
  .menu-orbit-visual {
    left: 50%;
    top: 28%;
    width: min(78vw, 420px);
  }
  .menu-brand h1 {
    font-size: 31px;
  }
  .menu-actions {
    margin-top: 22px;
  }
  .menu-version {
    left: 20px;
    bottom: 18px;
  }
  .top-hud {
    width: 100%;
    grid-template-columns: 1fr 1.15fr 1fr;
  }
  .mission-name {
    display: none;
  }
  .top-hud > div {
    padding: 8px;
  }
  .resources {
    top: 78px;
    right: 6px;
    width: 180px;
  }
  .maneuver-panel {
    top: 306px;
    right: 6px;
    width: 180px;
  }
  .stage-stack {
    left: 6px;
    bottom: 74px;
    width: 155px;
  }
  .stage-row {
    height: 49px;
  }
  .stage-row span:nth-child(2) b {
    font-size: 9px;
  }
  .throttle-control,
  .time-controls {
    display: none;
  }
  .camera-tools {
    right: 6px;
    bottom: 6px;
  }
  .nav-cluster {
    left: 50%;
    transform: translateX(-50%) scale(0.78);
    transform-origin: bottom center;
  }
  .sas-controls {
    left: auto;
    right: 6px;
    bottom: 52px;
    transform: scale(0.85);
    transform-origin: right bottom;
  }
  .flight-status {
    bottom: 180px;
  }
  .control-hint {
    display: none;
  }
  .briefing {
    padding: 20px 16px;
  }
}
@media (min-width: 761px) and (max-width: 1100px) {
  .stage-stack {
    transform: scale(0.9);
    transform-origin: left bottom;
  }
  .throttle-control {
    left: 190px;
    transform: scale(0.9);
    transform-origin: left bottom;
  }
  .time-controls {
    left: 12px;
    bottom: 282px;
    transform: scale(0.9);
    transform-origin: left bottom;
  }
  .resources {
    width: 190px;
  }
  .maneuver-panel {
    width: 190px;
  }
  .top-hud {
    width: 690px;
  }
}
</style>

<style>
.time-slider-wrapper {
  position: absolute;
  top: 16px;
  right: 260px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.time-slider-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 2px solid #111513;
  border-radius: 6px;
  background: linear-gradient(#4c514d, #292d2b);
  box-shadow: inset 0 1px #747a74, 0 2px 8px #0009;
  color: #e0a43a;
  cursor: pointer;
  font: 13px "Orbitron", "Consolas", monospace;
  transition: background 0.16s, border-color 0.16s;
}
.time-slider-toggle-btn:hover {
  background: linear-gradient(#5a5f5b, #3a3e3b);
  border-color: #e0a43a;
}
.time-slider-toggle-btn.on {
  color: #161816;
  background: #d9a934;
  box-shadow:
    inset 0 1px #f2c45f,
    0 0 7px #e5a82b;
}
.time-slider-toggle-icon {
  font-size: 16px;
  line-height: 1;
}
.time-slider-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 10px 6px;
  border-radius: 6px;
  background: linear-gradient(#4c514d, #292d2b);
  border: 2px solid #111513;
  box-shadow: inset 0 1px #747a74, 0 2px 8px #0009;
  width: 80px;
  box-sizing: border-box;
}
.time-slider-value {
  color: #e0a43a;
  font: bold 13px "Orbitron", "Consolas", monospace;
  text-shadow: 0 0 6px #e0a43a33;
  white-space: nowrap;
}
.time-slider-label {
  color: #a8c9df;
  font: 11px "Orbitron", "Consolas", "Noto Sans SC", sans-serif;
  white-space: nowrap;
}
.time-slider-track {
  position: relative;
  width: 24px;
  height: 200px;
  background: #0a1520;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid #a8c9df22;
}
.time-slider-fill {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 8px;
  background: linear-gradient(to top, #8a6a20, #c0a030, #e0c050);
  opacity: 0.8;
}
.time-slider-thumb {
  position: absolute;
  left: -6px;
  width: 36px;
  height: 10px;
  border-radius: 5px;
  background: #e0a43a;
  border: 1px solid #e0a43a;
  box-shadow: 0 0 10px #e0a43a88;
  transform: translateY(50%);
  cursor: grab;
}
.time-slider-thumb:active {
  cursor: grabbing;
}
.time-slider-ticks {
  position: absolute;
  left: -16px;
  top: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  font: 8px monospace;
  color: #3a5a70;
}
</style>
