<script setup lang="ts">
import {defineProps, ref} from "vue";

const props = defineProps({
  href: {type: String},
})

const view = ref()

const onMouseOver = () => {
  view.value.classList.add('linkView')
}

const onClick = () => {
  if (props.href) {
    window.open(props.href)
  }
}

</script>

<template>
  <div ref="view"
       @click="onClick"
       @mouseover="onMouseOver"
       class="w-fit h-fit rounded-50% cursor-pointer b-4 b-solid of-clip"
  >
    <slot />
  </div>
</template>

<style>
html {
  --link-border-color: #fff;
  --link-border-hover-color: #9fc7f6;
}
@keyframes on-hover {
  0% { border-color: var(--link-border-color) }
  100% { border-color: var(--link-border-hover-color) }
}
@keyframes off-hover {
  0% { border-color: var(--link-border-hover-color) }
  100% { border-color: var(--link-border-color) }
}

.linkView:hover {
  animation: on-hover 0.3s;
  border-color: var(--link-border-hover-color)
}
.linkView {
  animation: off-hover 0.3s;
  border-color: var(--link-border-color)
}
</style>