<script setup lang="ts">
import {defineProps} from "vue";

const props = defineProps({
  href: {type: String},
})

</script>

<template>
  <a :href="props.href"
     target="_blank"
     class="block w-fit h-fit rounded-50% cursor-pointer b-4 b-solid of-clip linkView"
  >
    <slot />
  </a>
</template>

<style>
.linkView:hover {
  transition: border-color 0.5s;
  border-color: #9fc7f6
}
.linkView {
  transition: border-color 0.5s;
  border-color: #fff
}
</style>