'use client';

import { useEffect, useRef, useState } from 'react';
import { Muxer as Mp4Muxer, ArrayBufferTarget as Mp4Target } from 'mp4-muxer';
import { Muxer as WebmMuxer, ArrayBufferTarget as WebmTarget } from 'webm-muxer';
import TextGrid from './TextGrid.jsx';
import ShapeGrid from './ShapeGrid.jsx';
import './ExportPanel.css';

const SIZES = [
  { id: 'desktop', label: 'Desktop · 1920×1080', w: 1920, h: 1080 },
  { id: 'hd', label: 'HD · 1280×720', w: 1280, h: 720 },
  { id: 'qhd', label: '2K · 2560×1440', w: 2560, h: 1440 },
  { id: 'uhd', label: '4K · 3840×2160', w: 3840, h: 2160 },
  { id: 'square', label: 'Square · 1080×1080', w: 1080, h: 1080 },
  { id: 'vertical', label: 'Vertical · 1080×1920', w: 1080, h: 1920 }
];

const QUALITY = [
  { id: 'standard', label: 'Standard 标准', bitrate: 6e6 },
  { id: 'high', label: 'High 高', bitrate: 14e6 },
  { id: 'max', label: 'Max 最高', bitrate: 30e6 }
];

const getSources = () => ({
  text: document.querySelector('.text-grid-canvas'),
  grid: document.querySelector('.shape-grid-canvas')
});

function compose(ctx, W, H, cfg, sourcesOverride) {
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#0a0a10';
  ctx.fillRect(0, 0, W, H);
  const { text, grid } = sourcesOverride || getSources();
  if (text) {
    ctx.globalAlpha = Math.min(1, Math.max(0, cfg.textOpacity ?? 1));
    ctx.drawImage(text, 0, 0, W, H);
  }
  if (grid) {
    ctx.globalAlpha = Math.min(1, Math.max(0, cfg.gridOpacity ?? 1));
    ctx.drawImage(grid, 0, 0, W, H);
  }
  ctx.globalAlpha = 1;
}

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function fmtBytes(b) {
  if (b >= 1e9) return `${(b / 1e9).toFixed(1)} GB`;
  if (b >= 1e6) return `${(b / 1e6).toFixed(1)} MB`;
  return `${Math.round(b / 1e3)} KB`;
}

function Seg({ options, value, onChange }) {
  return (
    <div className="exp-seg">
      {options.map(o => (
        <button
          key={o.v}
          className={value === o.v ? 'on' : ''}
          onClick={() => onChange(o.v)}
          type="button"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function ExportPanel({ cfg, onClose }) {
  const [tab, setTab] = useState('video');
  const [sizeId, setSizeId] = useState('desktop');
  const [scale, setScale] = useState(1);
  const [format, setFormat] = useState('mp4');
  const [length, setLength] = useState(60);
  const [fps, setFps] = useState(60);
  const [quality, setQuality] = useState('max');
  const [startAt, setStartAt] = useState(1.5);
  const [seamless, setSeamless] = useState(false);
  const [imgFormat, setImgFormat] = useState('png');
  const [rendering, setRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [note, setNote] = useState('');
  const [copied, setCopied] = useState(false);

  const previewRef = useRef(null);
  const textExportRef = useRef(null);
  const gridExportRef = useRef(null);
  const cfgRef = useRef(cfg);
  cfgRef.current = cfg;

  const size = SIZES.find(s => s.id === sizeId) || SIZES[0];
  const rawW = Math.round(size.w * scale);
  const rawH = Math.round(size.h * scale);
  const cap = 4096;
  const fit = Math.min(1, cap / Math.max(rawW, rawH));
  const W = Math.round(rawW * fit);
  const H = Math.round(rawH * fit);

  const mp4Supported =
    typeof MediaRecorder !== 'undefined' &&
    typeof MediaRecorder.isTypeSupported === 'function' &&
    MediaRecorder.isTypeSupported('video/mp4');
  const webmMime =
    typeof MediaRecorder !== 'undefined' &&
    MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';
  const recMime = format === 'mp4' && mp4Supported ? 'video/mp4' : webmMime;
  const bitrate = (QUALITY.find(q => q.id === quality) || QUALITY[2]).bitrate;

  // 文字纹理一个平铺周期（秒）；无缝循环时把录制时长吸附到整数周期
  const textCycle =
    cfg.textSpeed > 0
      ? (cfg.textFontSize * 5.79 * 2 * cfg.textGap) / (cfg.textSpeed * 60)
      : 0;
  const actualLength =
    seamless && textCycle > 0
      ? Math.max(textCycle, Math.round(length / textCycle) * textCycle)
      : length;
  const estBytes = bitrate * actualLength / 8;

  // 预览：实时合成两层
  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const cv = previewRef.current;
      if (cv) {
        const ctx = cv.getContext('2d');
        compose(ctx, cv.width, cv.height, cfgRef.current);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  const code = `// ===== TextGrid + ShapeGrid 配置导出 =====\nconst config = ${JSON.stringify(cfg, null, 2)};\n\n// ===== 使用方式 =====\n// <TextGrid\n//   solidText="${cfg.solidText}"\n//   outlineText="${cfg.outlineText}"\n//   fontSize={${cfg.textFontSize}}\n//   angle={${cfg.textAngle}}\n//   stagger={${cfg.textStagger}}\n//   gap={${cfg.textGap}}\n//   direction="${cfg.textDirection}"\n//   speed={${cfg.textSpeed}}\n//   solidColor="${cfg.solidColor}"\n//   outlineColor="${cfg.outlineColor}"\n//   outlineWidth={${cfg.outlineWidth}}\n//   scale={${cfg.textScale}}\n// />\n// <ShapeGrid\n//   shape="${cfg.shape}"\n//   cellSize={${cfg.cellSize}}\n//   lineWidth={${cfg.lineWidth}}\n//   direction="${cfg.direction}"\n//   speed={${cfg.speed}}\n//   lineColor="${cfg.lineColor}"\n//   hoverColor="${cfg.hoverColor}"\n//   glow={${cfg.glow}}\n//   trail={${cfg.trail}}\n// />\n`;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setNote('复制失败，请手动选中代码复制。');
    }
  };

  const renderImage = () => {
    setNote('');
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const ctx = cv.getContext('2d');
    compose(ctx, W, H, cfgRef.current);
    const ext = imgFormat === 'jpg' ? 'jpeg' : 'png';
    const mime = `image/${ext}`;
    cv.toBlob(blob => {
      download(blob, `grid-${W}x${H}.${imgFormat}`);
      setNote(`已导出 ${W}×${H} ${imgFormat.toUpperCase()} 图片。`);
    }, mime, imgFormat === 'jpg' ? 0.92 : undefined);
  };

  const renderVideo = async () => {
    if (rendering) return;
    setNote('');

    // WebCodecs 不可用时回退到浏览器实时录制
    if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined') {
      setNote('浏览器不支持 WebCodecs，已回退到实时录制（录制时长 = 视频时长）。');
      renderVideoRecording();
      return;
    }

    const totalFrames = Math.max(2, Math.ceil(actualLength * fps));
    const useMp4 = format === 'mp4';
    const codec = useMp4 ? 'avc1.42002A' : 'vp09.00.10.08';
    const avcOpts = useMp4 ? { avc: { format: 'avc' } } : {};
    let supported = false;
    try {
      const res = await VideoEncoder.isConfigSupported({
        codec, width: W, height: H, bitrate, framerate: fps, ...avcOpts
      });
      supported = !!res.supported;
    } catch {
      supported = false;
    }
    if (!supported) {
      setNote(`${useMp4 ? 'H.264' : 'VP9'} 编码不可用，已回退到实时录制。`);
      renderVideoRecording();
      return;
    }
    if (!textExportRef.current || !gridExportRef.current) {
      setNote('离屏画布尚未就绪，请稍后再点一次。');
      return;
    }

    let muxer;
    try {
      muxer = useMp4
        ? new Mp4Muxer({
            target: new Mp4Target(),
            video: { codec: 'avc', width: W, height: H, frameRate: fps },
            fastStart: 'in-memory'
          })
        : new WebmMuxer({
            target: new WebmTarget(),
            video: { codec: 'V_VP9', width: W, height: H, frameRate: fps }
          });
    } catch (err) {
      setNote(`封装器初始化失败：${err.message}`);
      return;
    }

    let encoder;
    try {
      encoder = new VideoEncoder({
        output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
        error: err => setNote(`编码出错：${err.message}`)
      });
      encoder.configure({ codec, width: W, height: H, bitrate, framerate: fps, ...avcOpts });
    } catch (err) {
      setNote(`视频编码器初始化失败：${err.message}`);
      return;
    }

    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const ctx = cv.getContext('2d');
    const c = cfgRef.current;

    setRendering(true);
    setProgress(0);
    try {
      for (let i = 0; i < totalFrames; i++) {
        const t = startAt + i / fps;
        const tc = textExportRef.current.renderAt(t, W, H);
        const gc = gridExportRef.current.renderAt(t, W, H);
        compose(ctx, W, H, c, { text: tc, grid: gc });
        const frame = new VideoFrame(cv, {
          timestamp: Math.round((i * 1e6) / fps),
          duration: Math.round(1e6 / fps)
        });
        encoder.encode(frame, { keyFrame: i % (fps * 2) === 0 });
        frame.close();
        if (i % 12 === 0) {
          setProgress((i + 1) / totalFrames);
          await new Promise(resolve => setTimeout(resolve, 0));
        }
        if (encoder.encodeQueueSize > 24) await encoder.flush();
      }
      await encoder.flush();
      encoder.close();
      muxer.finalize();
      const blob = new Blob([muxer.target.buffer], {
        type: useMp4 ? 'video/mp4' : 'video/webm'
      });
      download(blob, `grid-${W}x${H}-${(totalFrames / fps).toFixed(1)}s.${useMp4 ? 'mp4' : 'webm'}`);
      setRendering(false);
      setProgress(0);
      setNote(`离线编码完成：${W}×${H} · ${fps}fps · ${(totalFrames / fps).toFixed(1)}s（无需实时等待）`);
    } catch (err) {
      try { encoder.close(); } catch { /* ignore */ }
      setRendering(false);
      setProgress(0);
      setNote(`编码失败：${err.message}`);
    }
  };

  const renderVideoRecording = () => {
    if (rendering) return;
    setNote('');
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const ctx = cv.getContext('2d');
    compose(ctx, W, H, cfgRef.current);

    let stream;
    try {
      stream = cv.captureStream(fps);
    } catch {
      setNote('当前浏览器不支持画布录制，请使用 Chrome / Edge。');
      return;
    }

    let recorder;
    try {
      recorder = MediaRecorder.isTypeSupported(recMime)
        ? new MediaRecorder(stream, { mimeType: recMime, videoBitsPerSecond: bitrate })
        : new MediaRecorder(stream, { videoBitsPerSecond: bitrate });
    } catch {
      setNote('无法创建录制器，请检查浏览器权限。');
      stream.getTracks().forEach(t => t.stop());
      return;
    }
    const finalMime = recorder.mimeType || recMime;
    const ext = finalMime.includes('mp4') ? 'mp4' : 'webm';
    const chunks = [];
    const state = { raf: 0, timer: 0, wait: 0 };

    recorder.ondataavailable = e => {
      if (e.data && e.data.size) chunks.push(e.data);
    };
    recorder.onstop = () => {
      cancelAnimationFrame(state.raf);
      clearTimeout(state.timer);
      stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(chunks, { type: finalMime });
      download(blob, `grid-${W}x${H}-${Math.round(actualLength)}s.${ext}`);
      setRendering(false);
      setProgress(0);
      setNote(
        ext === 'webm' && format === 'mp4'
          ? '当前浏览器不支持 MP4 编码，已导出 WebM。'
          : `实时录制完成：${W}×${H} · ${fps}fps · ${Math.round(actualLength)}s`
      );
    };

    const begin = () => {
      recorder.start(100);
      const t0 = performance.now();
      const tick = () => {
        compose(ctx, W, H, cfgRef.current);
        const p = Math.min(1, (performance.now() - t0) / (actualLength * 1000));
        setProgress(p);
        state.raf = requestAnimationFrame(tick);
      };
      state.raf = requestAnimationFrame(tick);
      state.timer = setTimeout(() => {
        if (recorder.state !== 'inactive') {
          cancelAnimationFrame(state.raf);
          recorder.stop();
        }
      }, actualLength * 1000);
    };

    setRendering(true);
    setProgress(0);
    if (startAt > 0) {
      setNote(`等待 ${startAt}s（跳过开场动画）后开始录制…`);
      state.wait = setTimeout(begin, startAt * 1000);
    } else {
      begin();
    }
  };

  return (
    <div className="exp-mask" onPointerDown={onClose}>
      <div className="exp-panel" onPointerDown={e => e.stopPropagation()}>
        <div className="exp-head">
          <div className="exp-title">Export Grid <span>导出网格</span></div>
          <div className="exp-tabs">
            <button className={tab === 'code' ? 'on' : ''} onClick={() => setTab('code')} type="button">
              <span className="ic">{'</>'}</span> Code <em>代码</em>
            </button>
            <button className={tab === 'image' ? 'on' : ''} onClick={() => setTab('image')} type="button">
              <span className="ic">▧</span> Image <em>图片</em>
            </button>
            <button className={tab === 'video' ? 'on' : ''} onClick={() => setTab('video')} type="button">
              <span className="ic">▶</span> Video <em>视频</em>
            </button>
          </div>
          <button className="exp-close" onClick={onClose} type="button" title="关闭">×</button>
        </div>

        <div className="exp-body">
          <div className="exp-preview">
            <div className="exp-preview-inner">
              <canvas ref={previewRef} width={800} height={450} />
              {rendering && (
                <div className="exp-progress">
                  <div className="exp-progress-bar" style={{ width: `${progress * 100}%` }} />
                  <span>{Math.round(progress * 100)}%</span>
                </div>
              )}
            </div>
            <div className="exp-preview-cap">实时预览 · 导出内容与当前画布一致</div>
          </div>

          <div className="exp-settings">
            {tab === 'video' && (
              <>
                <div className="exp-row">
                  <span className="exp-k">Size 尺寸</span>
                  <select className="exp-v" value={sizeId} onChange={e => setSizeId(e.target.value)}>
                    {SIZES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
                <div className="exp-row">
                  <span className="exp-k">Scale 规模</span>
                  <Seg
                    value={scale}
                    onChange={setScale}
                    options={[1, 2, 3].map(n => ({ v: n, label: `${n}x` }))}
                  />
                </div>
                <div className="exp-row">
                  <span className="exp-k">Format 节目形式</span>
                  <Seg
                    value={format}
                    onChange={setFormat}
                    options={[{ v: 'mp4', label: 'MP4' }, { v: 'webm', label: 'WebM' }]}
                  />
                </div>
                <div className="exp-row">
                  <span className="exp-k">Length 长度</span>
                  <input className="exp-v" type="number" min="2" max="600" value={length} onChange={e => setLength(Math.max(2, Math.min(600, Number(e.target.value) || 2)))} />
                </div>
                <div className="exp-row">
                  <span className="exp-k">Frame rate 帧率</span>
                  <Seg
                    value={fps}
                    onChange={setFps}
                    options={[24, 30, 60].map(n => ({ v: n, label: String(n) }))}
                  />
                </div>
                <div className="exp-row">
                  <span className="exp-k">Standard 标准</span>
                  <Seg
                    value={quality}
                    onChange={setQuality}
                    options={QUALITY.map(q => ({ v: q.id, label: q.label.split(' ')[0] }))}
                  />
                </div>
                <div className="exp-row">
                  <span className="exp-k">Start at 起始于</span>
                  <input className="exp-v" type="number" min="0" max="30" step="0.5" value={startAt} onChange={e => setStartAt(Math.max(0, Number(e.target.value) || 0))} />
                </div>
                <div className="exp-row">
                  <span className="exp-k">Seamless loop 无缝循环</span>
                  <button
                    type="button"
                    className={`exp-switch ${seamless ? 'on' : ''}`}
                    onClick={() => setSeamless(v => !v)}
                  ><span /></button>
                </div>
                {seamless && (
                  <div className="exp-hint">纹理周期约 {textCycle.toFixed(1)}s，时长已自动对齐为 {actualLength.toFixed(1)}s</div>
                )}
              </>
            )}

            {tab === 'image' && (
              <>
                <div className="exp-row">
                  <span className="exp-k">Size 尺寸</span>
                  <select className="exp-v" value={sizeId} onChange={e => setSizeId(e.target.value)}>
                    {SIZES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
                <div className="exp-row">
                  <span className="exp-k">Scale 规模</span>
                  <Seg value={scale} onChange={setScale} options={[1, 2, 3].map(n => ({ v: n, label: `${n}x` }))} />
                </div>
                <div className="exp-row">
                  <span className="exp-k">Format 格式</span>
                  <Seg value={imgFormat} onChange={setImgFormat} options={[{ v: 'png', label: 'PNG' }, { v: 'jpg', label: 'JPG' }]} />
                </div>
                <div className="exp-hint">导出静态帧，包含文字纹理与网格两层，透明层按面板中的透明度合成到深色底。</div>
              </>
            )}

            {tab === 'code' && (
              <>
                <div className="exp-hint">导出当前全部参数，可直接用于 TextGrid / ShapeGrid 组件。</div>
                <pre className="exp-code">{code}</pre>
              </>
            )}
          </div>
        </div>

        <div className="exp-foot">
          {tab !== 'code' && (
            <div className="exp-summary">
              {W} × {H} · {tab === 'video' ? `${fps}fps · ${Math.round(actualLength)}s · ${format.toUpperCase()} · about ${fmtBytes(estBytes)}` : imgFormat.toUpperCase()}
              {note && <div className="exp-note">{note}</div>}
            </div>
          )}
          {tab === 'code' && <div className="exp-summary">{note || '配置代码 · JSON + JSX'}</div>}
          <div className="exp-actions">
            {tab === 'code' ? (
              <>
                <button className="exp-secondary" onClick={copyCode} type="button">{copied ? '已复制 ✓' : '复制代码'}</button>
                <button className="exp-primary" onClick={() => download(new Blob([code], { type: 'text/plain' }), 'grid-config.jsx')} type="button">下载代码</button>
              </>
            ) : (
              <button className="exp-primary" onClick={tab === 'video' ? renderVideo : renderImage} disabled={rendering} type="button">
                {rendering ? `渲染中 ${Math.round(progress * 100)}%` : tab === 'video' ? '▣  Render video 渲染视频' : '▣  Export image 导出图片'}
              </button>
            )}
          </div>
        </div>

        {/* 离屏画布：用纯时间接口按帧重绘，供 WebCodecs 离线编码 */}
        <div className="exp-offstage" aria-hidden="true">
          <div className="exp-offstage-inner" style={{ width: W, height: H }}>
            <TextGrid
              ref={textExportRef}
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
              paused
            />
            <ShapeGrid
              ref={gridExportRef}
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
              clickCascade={false}
              interactive={false}
              intro={cfg.intro && startAt === 0}
              paused
            />
          </div>
        </div>
      </div>
    </div>
  );
}
