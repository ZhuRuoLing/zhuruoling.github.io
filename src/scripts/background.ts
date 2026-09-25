/**
 * 全景背景运行时（零交互版）
 *
 * 设计约束：
 *  - 不接受任何用户输入。canvas 是哑的（pointer-events: none 由 CSS 保证）。
 *  - 不 import 任何项目内模块，不依赖 Vue/React。纯粹的时间驱动。
 *  - 客户端导航保留 canvas 与运行时；destroy() 仅供真正销毁背景时使用。
 *  - 通过 CSS 变量单向读取外部配置，不反向耦合。
 */
import {
  BoxGeometry,
  ImageLoader,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
  Texture,
  WebGLRenderer,
} from 'three';

/** 全景贴图面数 */
const FACE_COUNT = 6;

/**
 * 源图编号 → three BoxGeometry 材质槽序的映射。
 * 直接按 0..5 贴会得到错误的朝向（上下颠倒 / 左右镜像），
 * 这是从原 PanoramaView.vue 保留的既有约定，勿随意改动。
 */
const FACE_ORDER = [1, 3, 4, 5, 0, 2];

interface Options {
  /** 自动旋转角速度，弧度/秒 */
  yawSpeed: number;
  /** 垂直方向极缓慢摆动幅度（弧度），0 表示完全水平旋转 */
  pitchAmplitude: number;
  /** 垂直摆动周期（秒） */
  pitchPeriod: number;
  /** 初始视场角 */
  fov: number;
  /** 贴图长边上限，源图高于此值会被降采样 */
  maxTextureSize: number;
  /** devicePixelRatio 上限，防止高 DPI 屏填充率爆炸 */
  maxPixelRatio: number;
  /** 贴图扩展名 */
  textureExtension: string;
}

/**
 * 默认值。
 *
 * 贴图在构建前已预处理为 1024² WebP（6 张共约 390KB）。
 * 这里仍设 maxTextureSize 作为保险：将来若换回 2048² 源图，
 * 会自动降采样，避免 2048²×6 ≈ 96MB 的显存占用。
 */
const DEFAULTS: Options = {
  yawSpeed: 0.018,
  pitchAmplitude: 0.0,
  pitchPeriod: 60,
  fov: 100,
  maxTextureSize: 1024,
  maxPixelRatio: 2,
  textureExtension: 'webp',
};

export interface BackgroundHandle {
  destroy(): void;
}

function readNumberVar(name: string, fallback: number): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!raw) return fallback;
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : fallback;
}

/**
 * 按路径前缀与扩展名加载 6 张全景分片。
 */
async function loadFaces(
  basePath: string,
  maxSize: number,
  extension: string,
): Promise<Texture[]> {
  const loader = new ImageLoader();
  const raw: Texture[] = [];

  for (let i = 0; i < FACE_COUNT; i++) {
    const image = await loader.loadAsync(`${basePath}_${i}.${extension}`);
    const texture = new Texture();

    // 源图尺寸大于上限时降采样。
    // 全景背景本身是模糊的，降采样肉眼几乎无差别，但显存和采样成本显著下降。
    const sourceSize = image.width;
    const targetSize = Math.min(sourceSize, maxSize);

    if (targetSize !== sourceSize) {
      const canvas = document.createElement('canvas');
      canvas.width = targetSize;
      canvas.height = targetSize;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(image, 0, 0, targetSize, targetSize);
        texture.image = canvas;
      }
    } else {
      texture.image = image;
    }

    texture.needsUpdate = true;
    raw.push(texture);
  }

  // 按既有约定重排面序
  return FACE_ORDER.map((index) => raw[index]!);
}

/**
 * 启动背景。
 *
 * @param canvas 布局输出并在客户端导航中持久化的 canvas 元素
 * @param basePath 全景分片路径前缀，不含 `_0.webp` 后缀
 */
export async function startBackground(
  canvas: HTMLCanvasElement,
  basePath = '/panorama',
): Promise<BackgroundHandle> {
  const options: Options = { ...DEFAULTS };

  // 允许用 CSS 变量微调旋转速度，方便不改代码就调整观感
  options.yawSpeed = readNumberVar('--bg-yaw-speed', options.yawSpeed);

  const renderer = new WebGLRenderer({
    canvas,
    antialias: false, // 全景贴图 + 无几何边缘，抗锯齿无收益
    alpha: false,
    powerPreference: 'low-power',
    failIfMajorPerformanceCaveat: false,
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, options.maxPixelRatio));

  const camera = new PerspectiveCamera(
    options.fov,
    window.innerWidth / window.innerHeight,
    0.1,
    100,
  );
  // 相机放在盒子中心，几何体本身不移动，靠旋转相机环顾四周
  camera.position.z = 0.01;

  const scene = new Scene();

  let faces: Texture[];
  try {
    faces = await loadFaces(basePath, options.maxTextureSize, options.textureExtension);
  } catch (error) {
    // 贴图加载失败不应该拖垮整个页面：留下纯色兜底，静默降级
    console.warn('[bg] 全景贴图加载失败，背景降级为纯色', error);
    renderer.setClearColor(0x1a1a20, 1);
    renderer.setSize(window.innerWidth, window.innerHeight);
    return {
      destroy() {
        renderer.dispose();
      },
    };
  }

  const materials = faces.map((map) => new MeshBasicMaterial({ map }));
  const box = new Mesh(new BoxGeometry(1, 1, 1), materials);
  // 翻转几何体，让贴图朝向内部（相机在盒子里）
  box.geometry.scale(1, 1, -1);
  scene.add(box);

  function resize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, options.maxPixelRatio));
    renderer.setSize(width, height);
  }

  resize();

  let yaw = 0;
  let elapsed = 0;
  let lastTime = performance.now();
  let running = true;
  let pauseReason: 'hidden' | null = null;

  function frame(now: number): void {
    // 夹住 delta，防止标签页切回时出现巨大跳变
    const delta = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;
    elapsed += delta;

    yaw += options.yawSpeed * delta;
    camera.rotation.set(
      options.pitchAmplitude === 0
        ? 0
        : Math.sin((elapsed / options.pitchPeriod) * Math.PI * 2) * options.pitchAmplitude,
      yaw,
      0,
      'YXZ',
    );

    renderer.render(scene, camera);
  }

  renderer.setAnimationLoop(frame);

  function onResize(): void {
    resize();
  }

  function onVisibilityChange(): void {
    if (document.hidden) {
      if (pauseReason === null) {
        pauseReason = 'hidden';
        running = false;
        // 关键：setAnimationLoop(null) 才是真正停掉 RAF。
        // 仅 dispose() 不会停止动画循环。
        renderer.setAnimationLoop(null);
      }
    } else if (pauseReason === 'hidden') {
      pauseReason = null;
      running = true;
      // 重置时间基准，否则恢复瞬间会补算掉暂停期间的 delta
      lastTime = performance.now();
      renderer.setAnimationLoop(frame);
    }
  }

  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVisibilityChange);

  return {
    destroy(): void {
      if (!running) {
        // 已暂停状态，循环本就停了，无需再停
      } else {
        renderer.setAnimationLoop(null);
      }
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibilityChange);

      box.geometry.dispose();
      for (const material of materials) material.dispose();
      for (const texture of faces) texture.dispose();
      renderer.dispose();
    },
  };
}
