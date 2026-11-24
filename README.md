# KzzZ-Grid

程序化生成的网格背景演示：`TextGrid` 文字纹理 + `ShapeGrid` 交互网格，带实时参数面板和**离线视频导出**（WebCodecs + mp4-muxer / webm-muxer，无需实时录制等待）。

## 预览

```bash
npm install
npm run dev
```

打开 http://localhost:5173/ 。右上角「⇩ 导出」打开导出面板。

## 功能

- **TextGrid**：KzzZ（描边斜体）+ AIGC（实心）双行砖墙式平铺，可调字号、倾角、错开、字距、方向、速度、颜色
- **ShapeGrid**：8 种格子形状、滚动、鼠标点亮、点击涟漪、3D 倾斜、彩虹、拖尾、发光、边缘淡出
- **导出面板**（仿参考图设计）：
  - Code：导出当前参数为 JSON + JSX
  - Image：导出当前帧 PNG / JPG
  - Video：离线逐帧编码为 MP4 (H.264) 或 WebM (VP9)，支持尺寸/倍率/帧率/码率/无缝循环，速度远快于实时录制
- **鼠标隔离**：导出面板打开时切断背后网格的指针交互，避免导出画面混入不想要的高亮

## 构建

```bash
npm run build
npm run preview
```

## 技术栈

Vite 5 + React 18 + WebCodecs + mp4-muxer + webm-muxer
