<script setup>
import { ref, watch } from "vue";

const props = defineProps({
  title: { type: String, default: "" },
  collapsed: { type: Boolean, default: false },
  fixed: { type: Boolean, default: false },
  draggable: { type: Boolean, default: true },
});
const emit = defineEmits(["update:collapsed", "update:fixed"]);
const root = ref(null);
const isCollapsed = ref(props.collapsed);
const isFixed = ref(props.fixed);
watch(() => props.collapsed, (value) => (isCollapsed.value = value));
watch(() => props.fixed, (value) => (isFixed.value = value));

function toggleCollapsed() {
  isCollapsed.value = !isCollapsed.value;
  emit("update:collapsed", isCollapsed.value);
}
function toggleFixed() {
  isFixed.value = !isFixed.value;
  emit("update:fixed", isFixed.value);
}
function startDrag(event) {
  if (!props.draggable || isFixed.value || event.button !== 0) return;
  if (event.target.closest("button,input,a,select,textarea")) return;
  const element = root.value;
  const parent = element.offsetParent || element.parentElement;
  const rect = element.getBoundingClientRect();
  const parentRect = parent.getBoundingClientRect();
  const offsetX = event.clientX - rect.left;
  const offsetY = event.clientY - rect.top;
  element.style.left = `${rect.left - parentRect.left}px`;
  element.style.top = `${rect.top - parentRect.top}px`;
  element.style.right = "auto";
  element.style.bottom = "auto";
  element.style.transform = "none";
  element.setPointerCapture(event.pointerId);
  const move = (moveEvent) => {
    const maxLeft = Math.max(0, parentRect.width - element.offsetWidth);
    const maxTop = Math.max(0, parentRect.height - element.offsetHeight);
    element.style.left = `${Math.max(0, Math.min(maxLeft, moveEvent.clientX - parentRect.left - offsetX))}px`;
    element.style.top = `${Math.max(0, Math.min(maxTop, moveEvent.clientY - parentRect.top - offsetY))}px`;
  };
  const stop = () => {
    element.removeEventListener("pointermove", move);
    element.removeEventListener("pointerup", stop);
    element.removeEventListener("pointercancel", stop);
  };
  element.addEventListener("pointermove", move);
  element.addEventListener("pointerup", stop);
  element.addEventListener("pointercancel", stop);
}
</script>

<template>
  <section ref="root" class="hud-panel hud-panel-component" :class="{ 'is-collapsed': isCollapsed, 'is-fixed': isFixed }" @pointerdown="startDrag">
    <header class="hud-panel-header">
      <span>{{ title }}</span>
      <div class="hud-panel-actions">
        <button type="button" :title="isFixed ? '解除固定' : '固定面板'" @click="toggleFixed">{{ isFixed ? "◆" : "◇" }}</button>
        <button type="button" :title="isCollapsed ? '展开面板' : '折叠面板'" @click="toggleCollapsed">{{ isCollapsed ? "+" : "−" }}</button>
      </div>
    </header>
    <div v-show="!isCollapsed" class="hud-panel-body"><slot /></div>
  </section>
</template>

<style scoped>
.hud-panel-component {
  position: absolute;
  overflow: hidden;
  padding: 0 !important;
  border-radius: 4px;
}
.hud-panel-component.is-collapsed {
  height: auto !important;
  min-height: 0 !important;
}
.hud-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 25px;
  padding: 7px 7px 6px 9px;
  border-bottom: 1px solid #202522;
  color: #e0a43a;
  font-size: 12px;
  font-weight: 700;
  cursor: move;
  user-select: none;
}
.hud-panel-header:active { cursor: move; }
.hud-panel-body { cursor: default; }
.hud-panel-actions { display: flex; gap: 3px; }
.hud-panel-actions button {
  width: 20px;
  height: 20px;
  padding: 0;
  border: 1px solid #60685d;
  background: #303630;
  color: #e0a43a;
  font: 14px/16px monospace;
  cursor: pointer;
}
.hud-panel-actions button:hover { border-color: #e0a43a; background: #47432e; }
.hud-panel-body {
  min-width: 0;
  padding: 8px;
}
</style>
