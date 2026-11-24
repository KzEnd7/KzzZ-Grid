'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

import './TextGrid.css';

const DIRECTIONS = {
  right: [1, 0],
  left: [-1, 0],
  up: [0, -1],
  down: [0, 1],
  diagonal: [Math.SQRT1_2, -Math.SQRT1_2],
  none: [0, 0]
};

// 预渲染一个无缝瓦片：两行、砖墙式错开，每个词独立倾斜
const buildTile = o => {
  const base = o.fontSize * 5.79;                              // gap=1 时的基准半步
  const TW = Math.max(120, Math.round(base * 2 * o.gap));     // 瓦片宽 = 一个词对的跨度，随字距缩放
  const TH = Math.max(40, Math.round(o.fontSize * 3.33));     // 行高固定，不随字距变化
  const tile = document.createElement('canvas');
  tile.width = TW;
  tile.height = TH;
  const c = tile.getContext('2d');
  c.textAlign = 'center';
  c.textBaseline = 'middle';

  const rad = (o.angle * Math.PI) / 180;
  const font = italic => `${italic ? 'italic ' : ''}900 ${o.fontSize}px "Arial Black", "Arial", sans-serif`;

  const place = (text, x, y, filled, italic) => {
    if (!text) return;
    c.save();
    c.translate(x, y);
    c.rotate(rad);
    c.font = font(italic);
    if (filled) {
      c.fillStyle = o.solidColor;
      c.fillText(text, 0, 0);
    } else {
      c.lineWidth = o.outlineWidth;
      c.strokeStyle = o.outlineColor;
      c.strokeText(text, 0, 0);
    }
    c.restore();
  };

  const y1 = TH * 0.25;
  const y2 = TH * 0.75;
  const anchor = TW * 0.25;        // 每行首个词（KzzZ）的锚点
  const step = TW * 0.5;           // KzzZ → AIGC 的中心距（瓦片的一半）
  const shift = step * o.stagger;  // 下一行相对上一行的横向错开
  // 在左右各补一个周期，保证跨边界的词被完整裁切 → 平铺无缝
  for (const ox of [-TW, 0, TW]) {
    place(o.outlineText, ox + anchor, y1, false, true);
    place(o.solidText, ox + anchor + step, y1, true, false);
    place(o.outlineText, ox + anchor + shift, y2, false, true);
    place(o.solidText, ox + anchor + shift + step, y2, true, false);
  }
  return { tile, TW, TH };
};

const TextGrid = forwardRef(function TextGrid({
  solidText = 'AIGC',
  outlineText = 'KzzZ',
  fontSize = 100,
  angle = -8,
  stagger = 0.5,
  gap = 1,
  direction = 'left',
  speed = 0.6,
  solidColor = '#3d3d3d',
  outlineColor = '#3a3a3a',
  outlineWidth = 2,
  scale = 1,
  opacity = 1,
  backgroundColor = 'transparent',
  paused = false,
  className = '',
  style
}, ref) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const settingsRef = useRef(null);
  const tileCacheRef = useRef({ sig: '', tile: null, TW: 1, TH: 1 });
  const outRef = useRef(null);

  settingsRef.current = {
    solidText,
    outlineText,
    fontSize: Math.max(16, fontSize),
    angle,
    stagger,
    gap: Math.max(0.2, Math.min(3, gap)),
    direction: DIRECTIONS[direction] ? direction : 'left',
    speed: Math.max(0, speed),
    solidColor,
    outlineColor,
    outlineWidth: Math.max(0.5, outlineWidth),
    paused
  };

  // 离线导出：按指定时刻重绘到独立画布，不依赖真实时间流逝
  useImperativeHandle(ref, () => ({
    renderAt(timeSec, w, h) {
      const s = settingsRef.current;
      const cache = tileCacheRef.current;
      const sig = [
        s.solidText, s.outlineText, s.fontSize, s.angle, s.stagger, s.gap,
        s.solidColor, s.outlineColor, s.outlineWidth
      ].join('|');
      if (cache.sig !== sig || !cache.tile) {
        const built = buildTile(s);
        cache.tile = built.tile;
        cache.TW = built.TW;
        cache.TH = built.TH;
        cache.sig = sig;
      }
      const cvs = outRef.current || document.createElement('canvas');
      outRef.current = cvs;
      if (cvs.width !== w) cvs.width = w;
      if (cvs.height !== h) cvs.height = h;
      const c = cvs.getContext('2d');
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, w, h);
      const pattern = c.createPattern(cache.tile, 'repeat');
      const [dx, dy] = DIRECTIONS[s.direction];
      const ox = -dx * s.speed * 60 * timeSec;
      const oy = -dy * s.speed * 60 * timeSec;
      if (pattern && typeof pattern.setTransform === 'function') {
        pattern.setTransform(new DOMMatrix().translateSelf(ox % cache.TW, oy % cache.TH));
        c.fillStyle = pattern;
        c.fillRect(0, 0, w, h);
      } else if (pattern) {
        c.save();
        c.translate(ox % cache.TW, oy % cache.TH);
        c.fillStyle = pattern;
        c.fillRect(-cache.TW, -cache.TH, w + cache.TW * 2, h + cache.TH * 2);
        c.restore();
      }
      return cvs;
    }
  }), []);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    let raf = 0;
    let last = 0;
    let width = 1;
    let height = 1;
    let dpr = 1;
    let offsetX = 0;
    let offsetY = 0;
    let pattern = null;
    let TW = 1;
    let TH = 1;
    let signature = '';

    const resize = () => {
      width = Math.max(1, wrap.clientWidth);
      height = Math.max(1, wrap.clientHeight);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const pw = Math.max(1, Math.round(width * dpr));
      const ph = Math.max(1, Math.round(height * dpr));
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw;
        canvas.height = ph;
      }
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };

    const frame = now => {
      const s = settingsRef.current;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      resize();

      const sig = [
        s.solidText, s.outlineText, s.fontSize, s.angle, s.stagger, s.gap,
        s.solidColor, s.outlineColor, s.outlineWidth
      ].join('|');
      if (sig !== signature) {
        const built = buildTile(s);
        pattern = ctx.createPattern(built.tile, 'repeat');
        TW = built.TW;
        TH = built.TH;
        signature = sig;
      }

      if (!s.paused) {
        const [dx, dy] = DIRECTIONS[s.direction];
        offsetX -= dx * s.speed * 60 * dt;
        offsetY -= dy * s.speed * 60 * dt;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      if (pattern) {
        const ox = offsetX % TW;
        const oy = offsetY % TH;
        if (typeof pattern.setTransform === 'function') {
          pattern.setTransform(new DOMMatrix().translateSelf(ox, oy));
          ctx.fillStyle = pattern;
          ctx.fillRect(0, 0, width, height);
        } else {
          ctx.save();
          ctx.translate(ox, oy);
          ctx.fillStyle = pattern;
          ctx.fillRect(-TW, -TH, width + TW * 2, height + TH * 2);
          ctx.restore();
        }
      }
      raf = requestAnimationFrame(frame);
    };

    const observer = new ResizeObserver(() => {
      resize();
    });
    observer.observe(wrap);
    resize();
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className={`text-grid ${className}`.trim()}
      style={{
        opacity: Math.min(1, Math.max(0, opacity)),
        backgroundColor,
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
        ...style
      }}
    >
      <canvas ref={canvasRef} className="text-grid-canvas" />
    </div>
  );
});

export default TextGrid;
