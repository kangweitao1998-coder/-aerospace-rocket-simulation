<template>
  <div
    ref="ganttEl"
    class="gantt-timeline"
    @mousedown="onMouseDown"
    @mousemove="onMouseMove"
    @mouseup="onMouseUp"
    @mouseleave="onMouseUp"
    @wheel="onWheel"
  >
    <!-- 时间刻度 -->
    <div ref="trackRef" class="gantt-ticks">
      <span
        v-for="tick in ticks"
        :key="tick.time"
        class="gantt-tick"
        :style="{ left: toLeft(tick.time) + '%' }"
      >{{ tick.label }}</span>
    </div>
    <!-- 甘特图阶段条 -->
    <div class="gantt-rows">
      <div v-for="p in phases" :key="p.label" class="gantt-row">
        <span class="gantt-row-label">{{ p.label }}</span>
        <div class="gantt-row-track">
          <div
            class="gantt-bar"
            :style="{
              left: toLeft(p.start) + '%',
              width: (toLeft(p.end) - toLeft(p.start)) + '%',
              background: p.color,
            }"
          ></div>
        </div>
      </div>
    </div>
    <!-- 事件标注 -->
    <div class="gantt-events">
      <div
        v-for="evt in events"
        :key="evt.type"
        class="gantt-event"
        :class="{ triggered: evt.triggered }"
        :style="{ left: toLeft(evt.time) + '%' }"
        :title="evt.label"
      >
        <span class="gantt-event-diamond"></span>
        <span class="gantt-event-label">{{ evt.label }}</span>
      </div>
    </div>
    <!-- 当前时间指针 -->
    <div class="gantt-needle" :style="{ left: toLeft(currentTime) + '%' }">
      <div class="gantt-needle-head"></div>
      <div class="gantt-needle-line"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted } from "vue";

const props = defineProps({
  totalTime: { type: Number, default: 560 },
  eventTimes: { type: Object, default: () => ({}) },
  currentTime: { type: Number, default: 0 },
});

const emit = defineEmits(["seek"]);

const ganttEl = ref(null);
const trackRef = ref(null);
const viewStart = ref(0);
const viewEnd = ref(560);
const phases = reactive([]);
const events = reactive([]);
const ticks = reactive([]);

let _dragging = false;
let _dragX0 = 0;
let _total = 560;

function toLeft(time) {
  const range = viewEnd.value - viewStart.value;
  if (range <= 0) return 0;
  return ((time - viewStart.value) / range) * 100;
}

function percentToTime(percent) {
  const range = viewEnd.value - viewStart.value;
  return viewStart.value + (percent / 100) * range;
}

function getTrackBounds() {
  if (!trackRef.value) return { left: 0, width: 0 };
  const r = trackRef.value.getBoundingClientRect();
  return { left: r.left, width: r.width };
}

function seekTo(clientX) {
  const { left, width } = getTrackBounds();
  if (width <= 0) return;
  const percent = ((clientX - left) / width) * 100;
  const time = Math.max(0, Math.min(_total, percentToTime(percent)));
  emit("seek", time);
}

function pan(deltaPercent) {
  const range = viewEnd.value - viewStart.value;
  const delta = (deltaPercent / 100) * range;
  let ns = viewStart.value - delta;
  let ne = viewEnd.value - delta;
  if (ns < 0) { ne -= ns; ns = 0; }
  if (ne > _total) { ns -= (ne - _total); ne = _total; }
  if (ns < 0) ns = 0;
  viewStart.value = ns;
  viewEnd.value = Math.max(ns + 10, ne);
  rebuildTicks();
}

function zoom(factor, centerPercent) {
  const centerTime = percentToTime(centerPercent);
  const range = viewEnd.value - viewStart.value;
  const newRange = Math.max(10, Math.min(_total, range * factor));
  let ns = centerTime - newRange * ((centerTime - viewStart.value) / range);
  let ne = ns + newRange;
  if (ns < 0) { ne -= ns; ns = 0; }
  if (ne > _total) { ns -= (ne - _total); ne = _total; }
  if (ns < 0) ns = 0;
  viewStart.value = ns;
  viewEnd.value = Math.max(ns + 10, ne);
  rebuildTicks();
}

function rebuildTicks() {
  const range = viewEnd.value - viewStart.value;
  let step;
  if (range <= 30) step = 5;
  else if (range <= 60) step = 10;
  else if (range <= 180) step = 30;
  else if (range <= 400) step = 60;
  else step = 120;
  ticks.length = 0;
  const start = Math.floor(viewStart.value / step) * step;
  for (let t = start; t <= viewEnd.value + step; t += step) {
    if (t < 0) continue;
    const m = Math.floor(t / 60), s = Math.floor(t % 60);
    ticks.push({
      time: t,
      label: `T+${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`,
    });
  }
}

function buildData() {
  _total = props.totalTime || 560;
  const et = props.eventTimes || {};

  viewStart.value = 0;
  viewEnd.value = _total;

  const phaseDefs = [
    { label: "助推器", start: 0, end: et.boosterSep || 100, color: "linear-gradient(180deg, #ff7722, #cc4400)" },
    { label: "一级", start: et.boosterSep || 100, end: et.stage1Sep || 140, color: "linear-gradient(180deg, #ff5533, #bb2200)" },
    { label: "二级", start: (et.stage1Sep || 140) + 14, end: et.stage2Sep || 240, color: "linear-gradient(180deg, #ee3355, #991133)" },
    { label: "三级", start: (et.stage2Sep || 240) + 14, end: et.stage3Sep || 280, color: "linear-gradient(180deg, #cc2266, #881144)" },
    { label: "轨道运行", start: (et.stage3Sep || 280) + 9, end: _total, color: "linear-gradient(180deg, #2266cc, #113388)" },
  ];
  phases.length = 0;
  phaseDefs.forEach((p) => phases.push({ ...p }));

  const eventDefs = [
    { type: "boosterSep", time: et.boosterSep || 100, label: "助推器分离" },
    { type: "stage1Sep", time: (et.stage1Sep || 140) + 9, label: "一级分离" },
    { type: "fairingSep", time: (et.fairingSep || 200) + 9, label: "整流罩抛离" },
    { type: "stage2Sep", time: et.stage2Sep || 240, label: "二级分离" },
    { type: "stage3Sep", time: (et.stage3Sep || 280) + 9, label: "星箭分离" },
  ];
  events.length = 0;
  eventDefs.forEach((evt) => events.push({ ...evt, triggered: false }));

  rebuildTicks();
}

// 监听 currentTime 更新触发状态
watch(() => props.currentTime, (t) => {
  events.forEach((evt) => {
    if (t >= evt.time && evt.time > 0) evt.triggered = true;
  });
});

// 监听数据变化重建
watch(() => props.totalTime, buildData);
watch(() => props.eventTimes, buildData, { deep: true });

onMounted(buildData);

// 暴露 reset 方法
function reset() {
  viewStart.value = 0;
  viewEnd.value = _total;
  rebuildTicks();
  events.forEach((evt) => (evt.triggered = false));
}
defineExpose({ reset });

// ── 鼠标事件 ──
function onMouseDown(e) {
  if (e.button !== 0) return;
  _dragging = true;
  _dragX0 = e.clientX;
  e.preventDefault();
}
function onMouseMove(e) {
  if (!_dragging) return;
  const { width } = getTrackBounds();
  if (width <= 0) return;
  const dxPercent = ((e.clientX - _dragX0) / width) * 100;
  pan(-dxPercent);
  _dragX0 = e.clientX;
}
function onMouseUp(e) {
  if (!_dragging) return;
  _dragging = false;
  if (Math.abs(e.clientX - _dragX0) < 3) seekTo(e.clientX);
}
function onWheel(e) {
  e.preventDefault();
  const { left, width } = getTrackBounds();
  if (width <= 0) return;
  const centerPercent = ((e.clientX - left) / width) * 100;
  zoom(e.deltaY < 0 ? 0.7 : 1.4, centerPercent);
}
</script>

<style scoped>
.gantt-timeline {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 156px;
  background: rgba(6, 12, 28, 0.94);
  border-top: 2px solid rgba(0, 150, 255, 0.35);
  backdrop-filter: blur(12px);
  z-index: 12;
  padding: 12px 20px 8px;
  box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.6), 0 -1px 8px rgba(0, 120, 255, 0.08);
  cursor: grab;
  user-select: none;
}
.gantt-timeline:active { cursor: grabbing; }
.gantt-timeline::before {
  content: "";
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(0, 180, 255, 0.6), rgba(0, 180, 255, 0.6), transparent);
  filter: blur(1px);
}

.gantt-ticks {
  position: relative;
  height: 22px;
  margin: 0 80px 0 72px;
}
.gantt-tick {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  font-size: 10px;
  color: #4a6a8a;
  font-family: "Consolas", monospace;
}

.gantt-rows {
  position: relative;
  margin: 6px 80px 6px 72px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.gantt-row {
  display: flex;
  align-items: center;
  height: 14px;
}
.gantt-row-label {
  position: absolute;
  left: -68px;
  width: 60px;
  text-align: right;
  font-size: 10px;
  color: #5a7a9a;
  letter-spacing: 1px;
  white-space: nowrap;
  line-height: 14px;
}
.gantt-row-track {
  position: relative;
  flex: 1;
  height: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
  overflow: hidden;
  border: 1px solid rgba(0, 100, 200, 0.08);
}
.gantt-bar {
  position: absolute;
  top: 0;
  height: 100%;
  border-radius: 3px;
  min-width: 2px;
  opacity: 0.85;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
  transition: opacity 0.2s;
}
.gantt-bar:hover { opacity: 1; }

.gantt-events {
  position: relative;
  height: 36px;
  margin: 8px 80px 0 72px;
}
.gantt-event {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  pointer-events: auto;
  cursor: default;
}
.gantt-event-diamond {
  width: 10px; height: 10px;
  background: #4a6080;
  border: 1px solid rgba(0, 150, 255, 0.25);
  transform: rotate(45deg);
  transition: all 0.3s;
}
.gantt-event.triggered .gantt-event-diamond {
  background: #ff6622;
  border-color: rgba(255, 100, 30, 0.6);
  box-shadow: 0 0 10px rgba(255, 80, 0, 0.6);
}
.gantt-event-label {
  font-size: 10px;
  color: #4a6a8a;
  letter-spacing: 1px;
  white-space: nowrap;
  transition: color 0.3s;
}
.gantt-event.triggered .gantt-event-label { color: #ff8844; }

.gantt-needle {
  position: absolute;
  top: 4px; bottom: 2px;
  z-index: 20;
  pointer-events: none;
  transform: translateX(-50%);
}
.gantt-needle-head {
  width: 12px; height: 12px;
  background: #00ccff;
  border-radius: 50%;
  margin-left: -5px;
  box-shadow: 0 0 12px rgba(0, 200, 255, 0.8), 0 0 4px rgba(0, 200, 255, 1);
  position: relative;
  z-index: 2;
}
.gantt-needle-line {
  position: absolute;
  top: 14px; left: 0; bottom: 0;
  width: 2px;
  background: linear-gradient(180deg, #00ccff, rgba(0, 170, 255, 0.4));
  box-shadow: 0 0 6px rgba(0, 180, 255, 0.4);
}
</style>
