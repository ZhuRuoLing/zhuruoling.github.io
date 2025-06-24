<script setup lang="ts">
import PanoramaView from "./components/PanoramaView.vue";
import LinkView from "./components/LinkView.vue";
import {computed, ref} from "vue";

function weightedRandomChoice<T>(elements: T[], weights: number[]): T {
  const cumulativeWeights = weights.reduce((acc, weight, index) => {
    if (index === 0) {
      acc.push(weight);
    } else {
      acc.push(acc[index - 1] + weight);
    }
    return acc;
  }, [] as number[]);

  const randomNum = Math.random() * cumulativeWeights[cumulativeWeights.length - 1];

  for (let i = 0; i < cumulativeWeights.length; i++) {
    if (randomNum <= cumulativeWeights[i]) {
      return elements[i];
    }
  }
  throw new Error("Failed to select an element."); // 应对未选中元素的情况
}

const weights = [3, 4, 5, 1];

const names = [
  "和楽 小春",
  "竹猫",
  "竹若泠",
  "undefined"
]

let name = computed(() => {
  return weightedRandomChoice(
      names,
      weights
  )
})

let splash = ref(name.value === "undefined")
</script>

<template>
  <div class="flex justify-center content-center min-h-screen items-center of-visible">
    <PanoramaView class="absolute"/>
    <div class="z-1 glass-card text-white flex flex-col of-visible">
      <img src="../public/icon.jpg" height="128" width="128" class="rounded-3xl mb-4 mx-a"/>
      <div v-if="splash" class="splash">
        故意保留一点原味你才知道这里是typescript
      </div>

      <div class="mx-a text-center font-bold text-size-2xl mb-4">
        <div>{{ name }}</div>

        <div class="flex justify-center mt-8">
          <LinkView href="https://x.com/wagakukoharu" class="min-w-40px min-h-40px max-h-40px max-w-40px me-1">
            <img class="m-2" src="../public/x.svg"/>
          </LinkView>
          <LinkView href="https://space.bilibili.com/408091828"
                    class="min-w-40px min-h-40px max-h-40px max-w-40px me-1">
            <img class="m-2" src="../public/bilibili.svg"/>
          </LinkView>
          <LinkView href="https://github.com/ZhuRuoLing" class="min-w-40px min-h-40px max-h-40px max-w-40px me-1">
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
@keyframes splash {
  0% {
    transform: scale(100%) rotate(-30deg);
  }
  50% {
    transform: scale(110%) rotate(-30deg);
  }
  100% {
    transform: scale(100%) rotate(-30deg);
  }
}

.splash {
  position: absolute;
  color: yellow;
  font-size: small;
  transform: rotate(-30deg);
  text-shadow: 1px 1px 1px gray;
  top: 5rem;
  right: -5rem;
  animation: splash 2s infinite ease-in-out;
}
</style>