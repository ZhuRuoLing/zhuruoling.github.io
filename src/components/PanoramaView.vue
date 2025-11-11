<script setup lang="ts">
import * as THREE from "three";
import {PerspectiveCamera, Quaternion, Scene, WebGLRenderer} from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import {onMounted, ref} from "vue";
import {clamp, useEventListener} from "@vueuse/core";

const background = ref();
const props = withDefaults(
  defineProps<{
    rotationCallback?: (rotationY: number) => void
  }>(),
  {}
)
let camera: PerspectiveCamera;
let renderer: WebGLRenderer;
let controls: OrbitControls;
let scene: Scene;

useEventListener(window, "resize", onResize);
useEventListener(window, 'wheel', onWheel, {passive: true})

let targetFov = 100;  // 目标FOV
const fovDampingFactor = 0.1;  // 阻尼系数 (0-1, 值越小阻尼越强)

onMounted(async () => {

  camera = new THREE.PerspectiveCamera(100, window.innerWidth / window.innerHeight, 0.1, 100);
  renderer = new THREE.WebGLRenderer();
  controls = new OrbitControls(camera, renderer.domElement);
  scene = new THREE.Scene();

  camera.position.z = 0.01;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  controls.enableZoom = false;
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.rotateSpeed = -0.25;
  controls.autoRotate = true;
  controls.autoRotateSpeed = Math.random() > 0.5 ? 0.2 : -0.2;

  background.value.appendChild(renderer.domElement);

  let textures = await getTexturesFromAtlasFile("/panorama");
  let materials = [];
  for (let i = 0; i < 6; i++) {
    materials.push(new THREE.MeshBasicMaterial({map: textures[i]}));
  }

  // sky box
  let skyBox = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), materials);
  skyBox.geometry.scale(1, 1, -1);
  scene.add(skyBox);
  scene.fog = null
  renderer.setAnimationLoop(animate)
});

async function getTexturesFromAtlasFile(atlasImgUrl: string) {
  let textures = [];

  for (let i = 0; i < 6; i++) {
    textures[i] = new THREE.Texture();
  }

  for (let i = 0; i < 6; i++) {
    let image = await new THREE.ImageLoader().loadAsync(atlasImgUrl + "_" + i + ".jpeg");
    let tileSize = image.width;
    let canvas = document.createElement("canvas") as HTMLCanvasElement;
    canvas.height = tileSize;
    canvas.width = tileSize;
    canvas.getContext("2d")!.drawImage(
      image,
      0, 0,
      tileSize, tileSize,
      0, 0,
      tileSize, tileSize
    );
    textures[i].image = canvas;
    textures[i].needsUpdate = true;
  }

  let result = []
  result[0] = textures[1];
  result[1] = textures[3];
  result[2] = textures[4];
  result[3] = textures[5];
  result[4] = textures[0];
  result[5] = textures[2];

  return result;
}

const lastDeltaPx = ref(0)          // last wheel delta in pixels
const lastRawDelta = ref(0)        // raw deltaY from event
const lastDeltaMode = ref(0)       // event.deltaMode

function wheelDeltaToPixels(e: WheelEvent) {
  lastRawDelta.value = e.deltaY
  lastDeltaMode.value = e.deltaMode

  switch (e.deltaMode) {
    case 0: // DOM_DELTA_PIXEL
      return e.deltaY
    case 1: { // DOM_DELTA_LINE — estimate lines as 16px (adjust if needed)
      const lineHeight = 16
      return e.deltaY * lineHeight
    }
    case 2: { // DOM_DELTA_PAGE — convert to pixels by viewport height
      return e.deltaY * window.innerHeight
    }
    default:
      return e.deltaY
  }
}

function onWheel(e: WheelEvent) {
  const px = wheelDeltaToPixels(e)
  lastDeltaPx.value = px
  let fovDelta = px < 0 ? -5 : 5
  targetFov = clamp(targetFov + fovDelta, 45, 130)
  controls.update()
}

function animate() {
  controls.update();
  camera.fov += (targetFov - camera.fov) * fovDampingFactor;
  camera.updateProjectionMatrix();
  if (props.rotationCallback) {
    props.rotationCallback(new THREE.Euler().setFromQuaternion(camera.getWorldQuaternion(new Quaternion()), "YXZ").y)
  }
  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}
</script>

<template>
  <div ref="background"/>
</template>

<style scoped>

</style>