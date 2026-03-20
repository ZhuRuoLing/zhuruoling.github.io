<script setup lang="ts">
const props = defineProps({
  href: {type: String},
})

</script>

<template>
  <a :href="props.href"
     target="_blank"
     class="block w-fit h-fit rounded-50% cursor-pointer of-clip linkView"
  >
    <slot />
  </a>
</template>

<style scoped>
.linkView {
  position: relative;
  background: rgba(200, 200, 200, 0.15);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 
    0 4px 16px 0 rgba(31, 38, 135, 0.3),
    0 0 0 1px rgba(255, 255, 255, 0.15) inset;
  transition: all 0.3s ease;
  overflow: hidden;
}

.linkView:hover {
  background: rgba(200, 200, 200, 0.25);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  box-shadow: 
    0 6px 24px 0 rgba(31, 38, 135, 0.4),
    0 0 0 1px rgba(159, 199, 246, 0.3) inset;
  transform: translateY(-2px);
}

.linkView:active {
  transform: translateY(0);
  box-shadow: 
    0 2px 8px 0 rgba(31, 38, 135, 0.25),
    0 0 0 1px rgba(255, 255, 255, 0.1) inset;
}
</style>