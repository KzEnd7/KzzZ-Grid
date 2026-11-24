import { useEffect, useState } from 'react';
import ShapeGrid from './ShapeGrid.jsx';
import TextGrid from './TextGrid.jsx';
import ExportPanel from './ExportPanel.jsx';

const SHAPES = ['square', 'tile', 'hexagon', 'triangle', 'diamond', 'circle', 'cross', 'dot'];
const DIRECTIONS = ['diagonal', 'right', 'left', 'up', 'down', 'none'];

const DEFAULTS = {
  // 字幕纹理
  solidText: 'AIGC',
  outlineText: 'KzzZ',
  textFontSize: 100,
  textAngle: -8,
  textStagger: 0.5,
  textGap: 1,
  textDirection: 'left',
  textSpeed: 0.6,
  solidColor: '#3d3d3d',
  outlineColor: '#3a3a3a',
  outlineWidth: 2,
  textScale: 1,
  textOpacity: 1,
  // 网格
  gridOpacity: 0.55,
  shape: 'square',
  cellSize: 46,
  lineWidth: 1,
  direction: 'diagonal',
  speed: 0.5,
  lineColor: '#2a2734',
  hoverColor: '#8b5cf6',
  hoverFillColor: '#4c3a80',
  fillOpacity: 0.18,
  rainbow: false,
  tiltX: 0,
  tiltY: 0,
  radius: 1.6,
  trail: 0.65,
  glow: 0.45,
  twinkle: 0,
  fade: 1,
  clickCascade: true,
  intro: true,
  paused: false
};

const STORAGE_KEY = 'shape-grid-overlay-config-v3';

const loadConfig = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const saved = JSON.parse(raw);
    // 像素版 textGap(40~2400) 换回倍数，避免间距爆炸
    if (typeof saved.textGap === 'number' && saved.textGap > 3) {
      saved.textGap = Math.max(0.2, Math.min(3, saved.textGap / 579));
    }
    return { ...DEFAULTS, ...saved };
  } catch {
    return DEFAULTS;
  }
};

function Slider({ label, value, min, max, step = 1, onChange, format }) {
  return (
    <label className="field">
      <span className="field-head">
        <span>{label}</span>
        <b>{format ? format(value) : value}</b>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={event => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} />
      <span className="track"><span className="thumb" /></span>
      <span>{label}</span>
    </label>
  );
}

function TextInput({ label, value, onChange }) {
  return (
    <label className="field">
      <span className="field-head"><span>{label}</span></span>
      <input
        className="text-input"
        type="text"
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder="留空则不显示"
      />
    </label>
  );
}

export default function App() {
  const [cfg, setCfg] = useState(loadConfig);
  const [open, setOpen] = useState(true);
  const [exportOpen, setExportOpen] = useState(
    () => typeof window !== 'undefined' && /(?:^|[?&])export=1(?:&|$)/.test(window.location.search)
  );
  const set = (key, value) => setCfg(current => ({ ...current, [key]: value }));

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  }, [cfg]);

  return (
    <div className="stage">
      <div className="canvas-wrap">
        <div className="text-layer" style={{ opacity: cfg.textOpacity }}>
          <TextGrid
            solidText={cfg.solidText}
            outlineText={cfg.outlineText}
            fontSize={cfg.textFontSize}
            angle={cfg.textAngle}
            stagger={cfg.textStagger}
            gap={cfg.textGap}
            direction={cfg.textDirection}
            speed={cfg.textSpeed}
            solidColor={cfg.solidColor}
            outlineColor={cfg.outlineColor}
            outlineWidth={cfg.outlineWidth}
            scale={cfg.textScale}
            backgroundColor="transparent"
          />
        </div>
        <div className="grid-layer" style={{ opacity: cfg.gridOpacity }}>
          <ShapeGrid
            shape={cfg.shape}
            cellSize={cfg.cellSize}
            lineWidth={cfg.lineWidth}
            direction={cfg.direction}
            speed={cfg.speed}
            lineColor={cfg.lineColor}
            hoverColor={cfg.hoverColor}
            hoverFillColor={cfg.hoverFillColor}
            fillOpacity={cfg.fillOpacity}
            rainbow={cfg.rainbow}
            tiltX={cfg.tiltX}
            tiltY={cfg.tiltY}
            radius={cfg.radius}
            trail={cfg.trail}
            glow={cfg.glow}
            twinkle={cfg.twinkle}
            fade={cfg.fade}
            clickCascade={cfg.clickCascade}
            interactive={!exportOpen}
            intro={cfg.intro}
            paused={cfg.paused}
            backgroundColor="transparent"
          />
        </div>
      </div>

      <div className="hero">
        <div className="tag">CANVAS BACKGROUND · LIVE PREVIEW</div>
        <h1>TextGrid + ShapeGrid</h1>
        <p>文字纹理与网格均由代码程序化生成 · 右侧面板实时调参</p>
      </div>

      <button className="panel-toggle" onClick={() => setOpen(value => !value)}>
        {open ? '收起面板' : '参数面板'}
      </button>

      <button className="export-toggle" onClick={() => setExportOpen(true)}>
        ⇩ 导出
      </button>

      {open && (
        <aside className="panel" onPointerDown={event => event.stopPropagation()}>
          <div className="panel-title">参数调节</div>

          <div className="section-label">字幕纹理（程序化生成）</div>
          <div className="overlay-controls">
            <TextInput label="实心文字 solidText" value={cfg.solidText} onChange={v => set('solidText', v)} />
            <TextInput label="描边文字 outlineText" value={cfg.outlineText} onChange={v => set('outlineText', v)} />
            <label className="field">
              <span className="field-head"><span>滚动方向 direction</span></span>
              <select value={cfg.textDirection} onChange={event => set('textDirection', event.target.value)}>
                {DIRECTIONS.map(direction => <option key={direction} value={direction}>{direction}</option>)}
              </select>
            </label>
            <Slider label="字号 fontSize" value={cfg.textFontSize} min={30} max={260} onChange={v => set('textFontSize', v)} />
            <Slider label="倾斜 angle" value={cfg.textAngle} min={-30} max={30} onChange={v => set('textAngle', v)} />
            <Slider label="错开 stagger" value={cfg.textStagger} min={0} max={1} step={0.05} onChange={v => set('textStagger', v)} format={v => v.toFixed(2)} />
            <Slider label="字距 gap" value={cfg.textGap} min={0.2} max={3} step={0.05} onChange={v => set('textGap', v)} format={v => v.toFixed(2)} />
            <Slider label="滚动速度 speed" value={cfg.textSpeed} min={0} max={4} step={0.05} onChange={v => set('textSpeed', v)} format={v => v.toFixed(2)} />
            <Slider label="缩放 scale" value={cfg.textScale} min={0.5} max={2} step={0.01} onChange={v => set('textScale', v)} format={v => v.toFixed(2)} />
            <Slider label="字幕透明度" value={cfg.textOpacity} min={0} max={1} step={0.01} onChange={v => set('textOpacity', v)} format={v => v.toFixed(2)} />
            <Slider label="描边宽度" value={cfg.outlineWidth} min={0.5} max={6} step={0.5} onChange={v => set('outlineWidth', v)} />
            <div className="colors">
              <label className="color-field">
                <span>实心色</span>
                <input type="color" value={cfg.solidColor} onChange={event => set('solidColor', event.target.value)} />
              </label>
              <label className="color-field">
                <span>描边色</span>
                <input type="color" value={cfg.outlineColor} onChange={event => set('outlineColor', event.target.value)} />
              </label>
            </div>
          </div>

          <div className="section-label">网格样式</div>
          <label className="field">
            <span className="field-head"><span>形状 shape</span></span>
            <select value={cfg.shape} onChange={event => set('shape', event.target.value)}>
              {SHAPES.map(shape => <option key={shape} value={shape}>{shape}</option>)}
            </select>
          </label>
          <label className="field">
            <span className="field-head"><span>运动方向 direction</span></span>
            <select value={cfg.direction} onChange={event => set('direction', event.target.value)}>
              {DIRECTIONS.map(direction => <option key={direction} value={direction}>{direction}</option>)}
            </select>
          </label>
          <Slider label="网格透明度" value={cfg.gridOpacity} min={0} max={1} step={0.01} onChange={v => set('gridOpacity', v)} format={v => v.toFixed(2)} />
          <Slider label="格子大小 cellSize" value={cfg.cellSize} min={16} max={120} onChange={v => set('cellSize', v)} />
          <Slider label="速度 speed" value={cfg.speed} min={0} max={3} step={0.1} onChange={v => set('speed', v)} format={v => v.toFixed(1)} />
          <Slider label="线宽 lineWidth" value={cfg.lineWidth} min={0.5} max={4} step={0.1} onChange={v => set('lineWidth', v)} format={v => v.toFixed(1)} />
          <Slider label="感应半径 radius" value={cfg.radius} min={0} max={4} step={0.1} onChange={v => set('radius', v)} format={v => v.toFixed(1)} />
          <Slider label="拖尾 trail" value={cfg.trail} min={0.05} max={2} step={0.05} onChange={v => set('trail', v)} format={v => v.toFixed(2)} />
          <Slider label="发光 glow" value={cfg.glow} min={0} max={1} step={0.05} onChange={v => set('glow', v)} format={v => v.toFixed(2)} />
          <Slider label="闪烁 twinkle" value={cfg.twinkle} min={0} max={1} step={0.05} onChange={v => set('twinkle', v)} format={v => v.toFixed(2)} />
          <Slider label="填充透明度 fillOpacity" value={cfg.fillOpacity} min={0} max={1} step={0.01} onChange={v => set('fillOpacity', v)} format={v => v.toFixed(2)} />
          <Slider label="倾斜 X tiltX" value={cfg.tiltX} min={-50} max={50} onChange={v => set('tiltX', v)} />
          <Slider label="倾斜 Y tiltY" value={cfg.tiltY} min={-50} max={50} onChange={v => set('tiltY', v)} />
          <Slider label="边缘淡出 fade" value={cfg.fade} min={0} max={1} step={0.05} onChange={v => set('fade', v)} format={v => v.toFixed(2)} />
          <div className="colors">
            <label className="color-field">
              <span>线条颜色</span>
              <input type="color" value={cfg.lineColor} onChange={event => set('lineColor', event.target.value)} />
            </label>
            <label className="color-field">
              <span>高亮颜色</span>
              <input type="color" value={cfg.hoverColor} onChange={event => set('hoverColor', event.target.value)} />
            </label>
            <label className="color-field">
              <span>填充颜色</span>
              <input type="color" value={cfg.hoverFillColor} onChange={event => set('hoverFillColor', event.target.value)} />
            </label>
          </div>
          <div className="toggles">
            <Toggle label="彩虹 rainbow" checked={cfg.rainbow} onChange={v => set('rainbow', v)} />
            <Toggle label="点击涟漪" checked={cfg.clickCascade} onChange={v => set('clickCascade', v)} />
            <Toggle label="开场动画" checked={cfg.intro} onChange={v => set('intro', v)} />
            <Toggle label="暂停网格" checked={cfg.paused} onChange={v => set('paused', v)} />
          </div>

          <button
            className="reset"
            onClick={() => {
              window.localStorage.removeItem(STORAGE_KEY);
              setCfg(DEFAULTS);
            }}
          >
            恢复默认
          </button>
        </aside>
      )}

      {exportOpen && <ExportPanel cfg={cfg} onClose={() => setExportOpen(false)} />}
    </div>
  );
}
