---
title: WebGL 背景与内容的解耦
description: 记录把全景天空盒从 Vue 组件改造成独立运行时层的思路
date: 2026-09-25
tags:
  - astro
  - webgl
  - three.js
---

这是一篇用来验证代码块高亮的测试文章，内容本身也是这个项目正在做的事。

## 背景层为什么不能是组件

组件模型假设「挂载 / 卸载」，但 Astro 的多页导航本质是整页刷新，
每进入一个新页面，全景贴图会重新下载、WebGL context 会重新创建。

```ts
// 自包含的运行时：只依赖一个已经存在的 canvas
export async function startBackground(
    canvas: HTMLCanvasElement,
    basePath = '/panorama',
): Promise<BackgroundHandle> {
    const renderer = new WebGLRenderer({canvas, alpha: false});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    // ...
}
```

## 唯一的通信通道

内容层不 import 背景代码，只通过 CSS 变量单向传递参数。

```css
:root {
    --bg-yaw-speed: 0.018;
}
```

JavaScript 侧读取：

```js
const raw = getComputedStyle(document.documentElement)
    .getPropertyValue('--bg-yaw-speed')
    .trim();
```

## 相机逻辑的全部

零交互之后，相机只是一个时间驱动的函数：

```js
function frame(now) {
    const delta = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;
    yaw += options.yawSpeed * delta;
    camera.rotation.set(0, yaw, 0, 'YXZ');
    renderer.render(scene, camera);
}
```

行内代码测试：`setAnimationLoop(null)` 才是真正停掉 RAF 的调用，
`renderer.dispose()` 不会。

## 一段较长的代码，测试横向滚动

```rust
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct PanoramaFrame {
    faces: [u32; 6],
    yaw: f32,
}

impl PanoramaFrame {
    pub fn new(order: &[usize; 6]) -> Self {
        let mut faces = [0u32; 6];
        for (slot, &src) in order.iter().enumerate() {
            faces[slot] = src as u32;
        }
        Self { faces, yaw: 0.0 }
    }

    pub fn advance(&mut self, delta: f32, speed: f32) {
        self.yaw = (self.yaw + speed * delta) % std::f32::consts::TAU;
    }
}
```
