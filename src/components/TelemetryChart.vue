<template>
  <div ref="chartEl" class="chart-container"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import * as echarts from "echarts";

const props = defineProps({
  trajectory: { type: Array, default: () => [] },
  totalTime: { type: Number, default: 560 },
  currentTime: { type: Number, default: 0 },
});

const chartEl = ref(null);
let chart = null;

function getAltAtTime(t) {
  const pt = props.trajectory.find(p => Math.abs(p.time - Math.round(t)) <= 1);
  return pt ? +(pt.alt / 1000).toFixed(2) : 0;
}

function initChart() {
  if (!chartEl.value) return;
  chart = echarts.init(chartEl.value, null, { renderer: "canvas" });

  const altData = props.trajectory.map((p) => [p.time, +(p.alt / 1000).toFixed(2)]);

  chart.setOption({
    animation: false,
    backgroundColor: "transparent",
    grid: { top: 10, right: 20, bottom: 26, left: 44 },
    dataZoom: [{ type: "inside", xAxisIndex: 0, zoomOnMouseWheel: true, moveOnMouseMove: true }],
    xAxis: {
      type: "value", min: 0, max: props.totalTime,
      axisLine: { lineStyle: { color: "rgba(0,120,255,0.2)" } },
      axisTick: { show: false },
      axisLabel: {
        color: "#5a7090", fontSize: 8,
        formatter: (v) => { const m = Math.floor(v / 60), s = Math.floor(v % 60); return `T+${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`; },
      },
      splitLine: { lineStyle: { color: "rgba(0,80,160,0.08)" } },
    },
    yAxis: {
      type: "value", name: "高度(km)",
      nameTextStyle: { color: "#5a7090", fontSize: 9 },
      axisLabel: { color: "#5a7090", fontSize: 8 },
      axisLine: { lineStyle: { color: "rgba(0,120,255,0.2)" } },
      splitLine: { lineStyle: { color: "rgba(0,80,160,0.08)" } },
    },
    series: [{
      type: "line", data: altData, smooth: true, symbol: "none",
      lineStyle: { color: "#00ccff", width: 1.5 },
      areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: "rgba(0,180,255,0.18)" }, { offset: 1, color: "rgba(0,100,200,0.02)" }]) },
      markPoint: {
        silent: true, symbol: "circle", symbolSize: 10,
        data: [{ coord: [0, 0] }],
        itemStyle: { color: "#00ccff", borderColor: "#fff", borderWidth: 2, shadowBlur: 10, shadowColor: "rgba(0,200,255,0.8)" },
        label: { show: false },
      },
    }],
    tooltip: {
      trigger: "axis", backgroundColor: "rgba(5,10,25,0.92)", borderColor: "rgba(0,120,255,0.3)", textStyle: { color: "#c0d0e0", fontSize: 11 },
      formatter: (p) => { const t = p[0].data[0]; const m = Math.floor(t / 60), s = Math.floor(t % 60); return `T+${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}<br/>高度: ${p[0].data[1]} km`; },
    },
  });
}

function updateTimeLine(t) {
  if (!chart) return;
  if (t <= 0) {
    chart.setOption({ series: [{ markPoint: { data: [{ coord: [0, 0] }] } }] });
    return;
  }
  const alt = getAltAtTime(t);
  chart.setOption({ series: [{ markPoint: { data: [{ coord: [t, alt] }] } }] });
}

watch(() => props.currentTime, updateTimeLine);

onMounted(() => {
  initChart();
});

onBeforeUnmount(() => {
  chart?.dispose();
  chart = null;
});

defineExpose({ updateTimeLine, resize: () => chart?.resize() });
</script>

<style scoped>
.chart-container {
  width: 100%;
  height: 240px;
}
</style>
