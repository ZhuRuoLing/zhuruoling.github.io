<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

const dotRef = ref<HTMLDivElement | null>(null)
const ringRef = ref<HTMLDivElement | null>(null)

// 鼠标真实位置（小圆点目标 = 实时位置）
let mouseX = 0
let mouseY = 0
// 大圈当前插值位置
let ringX = 0
let ringY = 0

// 状态
let hovering = false
let visible = false
let pressed = false
let rafId = 0

// 判断是否是可交互元素
function isInteractive(el: Element | null): boolean {
  while (el && el !== document.body) {
    if (el instanceof HTMLElement) {
      const tag = el.tagName
      if (tag === 'A' || tag === 'BUTTON' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'LABEL') {
        return true
      }
      const role = el.getAttribute('role')
      if (role === 'button' || role === 'link') return true
      if (el.dataset.cursorHover === 'true') return true
      const cursor = getComputedStyle(el).cursor
      if (cursor === 'pointer') return true
    }
    el = el.parentElement
  }
  return false
}

function handleMouseMove(e: MouseEvent) {
  mouseX = e.clientX
  mouseY = e.clientY

  if (!visible) {
    // 首次进入：把大圈位置也同步到鼠标，避免从 (0,0) 飞过来
    ringX = mouseX
    ringY = mouseY
    visible = true
    if (dotRef.value) dotRef.value.style.opacity = '1'
    if (ringRef.value) ringRef.value.style.opacity = '1'
  }

  const target = e.target as Element | null
  const nextHovering = isInteractive(target)
  if (nextHovering !== hovering) {
    hovering = nextHovering
    if (ringRef.value) {
      ringRef.value.classList.toggle('cursor-ring--hover', hovering)
    }
    if (dotRef.value) {
      dotRef.value.classList.toggle('cursor-dot--hover', hovering)
    }
  }
}

function handleMouseLeave() {
  visible = false
  if (dotRef.value) dotRef.value.style.opacity = '0'
  if (ringRef.value) ringRef.value.style.opacity = '0'
}

function handleMouseEnter() {
  // 进入窗口后由 mousemove 触发显示
}

function handleMouseDown() {
  pressed = true
  if (ringRef.value) ringRef.value.classList.add('cursor-ring--active')
  if (dotRef.value) dotRef.value.classList.add('cursor-dot--active')
}

function handleMouseUp() {
  pressed = false
  if (ringRef.value) ringRef.value.classList.remove('cursor-ring--active')
  if (dotRef.value) dotRef.value.classList.remove('cursor-dot--active')
}

function tick() {
  if (pressed) {
    // 按住时大圈直接贴合鼠标，不做缓动
    ringX = mouseX
    ringY = mouseY
  } else {
    // 非线性追随：每帧向目标靠近一定比例（指数衰减），值越小越慢
    const ease = 0.1
    ringX += (mouseX - ringX) * ease
    ringY += (mouseY - ringY) * ease
  }

  if (dotRef.value) {
    dotRef.value.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`
  }
  if (ringRef.value) {
    ringRef.value.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`
  }
  rafId = requestAnimationFrame(tick)
}

onMounted(() => {
  // 仅在支持精确指针（鼠标）时启用，触屏设备不显示
  if (!window.matchMedia('(pointer: fine)').matches) return

  document.documentElement.classList.add('has-custom-cursor')
  window.addEventListener('mousemove', handleMouseMove, { passive: true })
  document.addEventListener('mouseleave', handleMouseLeave)
  document.addEventListener('mouseenter', handleMouseEnter)
  window.addEventListener('mousedown', handleMouseDown)
  window.addEventListener('mouseup', handleMouseUp)
  rafId = requestAnimationFrame(tick)
})

onUnmounted(() => {
  document.documentElement.classList.remove('has-custom-cursor')
  window.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseleave', handleMouseLeave)
  document.removeEventListener('mouseenter', handleMouseEnter)
  window.removeEventListener('mousedown', handleMouseDown)
  window.removeEventListener('mouseup', handleMouseUp)
  cancelAnimationFrame(rafId)
})
</script>

<template>
  <div class="cursor-ring" ref="ringRef" aria-hidden="true"></div>
  <div class="cursor-dot" ref="dotRef" aria-hidden="true"></div>
</template>

<style scoped>
.cursor-dot,
.cursor-ring {
  position: fixed;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 9999;
  opacity: 0;
  will-change: transform, width, height, background-color, box-shadow;
}

.cursor-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.25);
  transition: width 0.2s ease, height 0.2s ease, background-color 0.2s ease, opacity 0.2s ease;
}

.cursor-ring {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 0;
  background: rgba(255, 255, 255, 0);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.75);
  transition:
    width 0.25s cubic-bezier(0.25, 1, 0.5, 1),
    height 0.25s cubic-bezier(0.25, 1, 0.5, 1),
    background-color 0.25s ease,
    box-shadow 0.25s ease,
    opacity 0.2s ease;
}

.cursor-ring--hover {
  width: 50px;
  height: 50px;
  background: rgba(255, 255, 255, 0.12);
  box-shadow: inset 0 0 0 2px #ffffff;
}

.cursor-dot--hover {
  background: #ffffff;
}

.cursor-ring--active {
  width: 28px;
  height: 28px;
  background: rgba(255, 255, 255, 0.25);
}

.cursor-dot--active {
  width: 8px;
  height: 8px;
}
</style>
