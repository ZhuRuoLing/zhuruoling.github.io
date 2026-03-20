<script setup lang="ts">
import PanoramaView from "./components/PanoramaView.vue";
import LinkView from "./components/LinkView.vue";
import {computed, ref, onMounted, onUnmounted} from "vue";

const weights = [3, 4, 5, 1];

const names = [
  "竹猫",
  "竹若泠",
  "TakeNeko"
]

const avatarRef = ref<HTMLImageElement | null>(null);
const cardRef = ref<HTMLDivElement | null>(null);
const currentIndex = ref(0);
const displayText = ref(names[0]);

// 3D tilt effect
const tiltStyle = ref({ transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg)', transition: 'transform 0.1s ease-out' });

function handleMouseMove(e: MouseEvent) {
  if (!cardRef.value) return;
  const rect = cardRef.value.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  
  // Calculate rotation based on mouse position relative to center
  const rotateX = ((y - centerY) / centerY) * -10; // Max 10deg tilt
  const rotateY = ((x - centerX) / centerX) * 10;
  
  tiltStyle.value = {
    transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
    transition: 'transform 0.1s ease-out'
  };
}

function handleMouseLeave() {
  tiltStyle.value = {
    transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg)',
    transition: 'transform 0.3s ease-out'
  };
}

const PI = 3.1415926535897932384626433832795

let onRotation = (rotationY: number) => {
  let value = (rotationY * 180 / PI)
  if (avatarRef.value) {
    avatarRef.value.style.transform = `rotate(${value}deg)`;
  }
}

function getRandomChar() {
  const rand = Math.random();
  if (rand < 0.33) {
    // ASCII printable characters (33-126)
    return String.fromCharCode(33 + Math.floor(Math.random() * 94));
  } else if (rand < 0.66) {
    // Common Chinese characters (CJK Unified Ideographs: 4E00-9FFF)
    return String.fromCharCode(0x4E00 + Math.floor(Math.random() * 0x51FF));
  } else {
    // Hiragana/Katakana (Japanese kana: 3040-309F, 30A0-30FF)
    return String.fromCharCode(0x3040 + Math.floor(Math.random() * 0x60));
  }
}

function animateText(targetName: string) {
  const length = targetName.length;
  const result = new Array(length).fill("");
  const settled = new Array(length).fill(false);
  let frame = 0;

  const interval = setInterval(() => {
    for (let i = 0; i < length; i++) {
      if (settled[i]) {
        result[i] = targetName[i];
      } else {
        // Each character goes through more garbled frames before settling
        const settleFrame = i * 2 + 12;
        if (frame >= settleFrame) {
          settled[i] = true;
          result[i] = targetName[i];
        } else {
          result[i] = getRandomChar();
        }
      }
    }
    displayText.value = result.join("");
    frame++;

    // Check if all characters are settled
    if (settled.every(s => s)) {
      clearInterval(interval);
    }
  }, 30);
}

let timer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  // Start the cycling timer
  timer = setInterval(() => {
    currentIndex.value = (currentIndex.value + 1) % names.length;
    animateText(names[currentIndex.value]);
  }, 10000);
});

onUnmounted(() => {
  if (timer) {
    clearInterval(timer);
  }
});

</script>

<template>
  <div class="flex justify-center content-center min-h-screen items-center of-visible">
    <PanoramaView class="absolute" :rotation-callback="onRotation"/>
    <div ref="cardRef" class="z-1 glass-card text-white flex flex-col of-visible" :style="tiltStyle" @mousemove="handleMouseMove" @mouseleave="handleMouseLeave">
      <img src="../public/icon.png" height="128" width="128" class="rounded-full mb-4 mx-a avatar" alt="avatar" ref="avatarRef"/>

      <div class="mx-a text-center font-bold text-size-2xl mb-4">
        <div class="min-h-2em">{{ displayText }}</div>


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

.avatar {
  transition: filter 300ms;
}
.avatar:hover {
  filter: drop-shadow(0 0 2em #9fc7f6);
}
</style>