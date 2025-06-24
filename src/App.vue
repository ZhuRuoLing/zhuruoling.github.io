<script setup lang="ts">
import PanoramaView from "./components/PanoramaView.vue";
import LinkView from "./components/LinkView.vue";
</script>

<template>
  <div class="flex justify-center content-center min-h-screen items-center">
    <PanoramaView class="absolute"/>
    <div class="z-1 glass-card text-white flex flex-col">
      <img src="../public/icon.jpg" height="128" width="128" class="rounded-3xl mb-4 mx-a"/>
      <div class="mx-a text-center font-bold text-size-2xl mb-4">
        <div>竹猫</div>
        <div class="flex justify-center mt-2">
          <LinkView href="https://bing.com" class="min-w-40px min-h-40px max-h-40px max-w-40px me-1">
            <img class="m-2" src="../public/x.svg"/>
          </LinkView>
          <LinkView href="https://bing.com" class="min-w-40px min-h-40px max-h-40px max-w-40px me-1">
            <img class="m-2" src="../public/bilibili.svg"/>
          </LinkView>
          <LinkView href="https://bing.com" class="min-w-40px min-h-40px max-h-40px max-w-40px me-1">
            <img class="m-2" src="../public/github.svg"/>
          </LinkView>
          <LinkView href="https://t.me/i_need_more_cats" class="min-w-40px min-h-40px max-h-40px max-w-40px">
            <img class="m-2" src="../public/tg.svg"/>
          </LinkView>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>

</style>