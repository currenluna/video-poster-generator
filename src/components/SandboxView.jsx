import { useState, useMemo, useEffect, useRef } from 'react';
import { drawPoster } from '../utils/posterRenderer';
import { RESOLUTIONS } from '../utils/constants';

// SandboxCanvasPreview component to draw poster designs reactively
function SandboxCanvasPreview({ settings, styleModeOverride, onExport }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const mergedSettings = {
      ...settings,
      styleMode: styleModeOverride || settings.styleMode,
    };

    drawPoster(canvas, mergedSettings);
  }, [settings, styleModeOverride]);

  const res = RESOLUTIONS[settings.aspectRatio] || { width: 3, height: 4 };
  const aspectStyle = {
    aspectRatio: `${res.width} / ${res.height}`,
    width: '100%',
    height: 'auto',
    display: 'block',
    boxShadow: '0 12px 32px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)',
    transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    backgroundColor: '#ffffff',
  };

  const handleCardExport = () => {
    if (onExport) {
      onExport(styleModeOverride || settings.styleMode);
    }
  };

  return (
    <div className="sandbox-canvas-wrapper">
      <canvas
        ref={canvasRef}
        className="sandbox-canvas-element"
        style={aspectStyle}
      />
      <div className="sandbox-canvas-overlay">
        <button
          type="button"
          className="sandbox-card-action-btn"
          onClick={handleCardExport}
          title="Export high-res 300 PPI image of this layout"
        >
          EXPORT LAYOUT
        </button>
      </div>
    </div>
  );
}

export default function SandboxView({ creatorFrames = [], creatorVideoName = 'STUDIO_CLIP' }) {
  // Sandbox state variables
  const [sandboxStyleMode, setSandboxStyleMode] = useState('grid-meta');
  const [sandboxColorMode, setSandboxColorMode] = useState('color');
  const [sandboxPaperColor, setSandboxPaperColor] = useState('white');
  const [sandboxMatteMargin, setSandboxMatteMargin] = useState(10);
  const [sandboxGapSize, setSandboxGapSize] = useState(40);
  const [sandboxScaleRandomness, setSandboxScaleRandomness] = useState(0);
  const [sandboxPositionRandomness, setSandboxPositionRandomness] = useState(0);
  const [sandboxRotationRandomness, setSandboxRotationRandomness] = useState(0);
  const [sandboxAlternateMirror, setSandboxAlternateMirror] = useState(false);
  const [sandboxRingRotation, setSandboxRingRotation] = useState(0);
  const [sandboxRingTiltX, setSandboxRingTiltX] = useState(-45);
  const [sandboxRingTiltY, setSandboxRingTiltY] = useState(0);
  const [sandboxZoomFocusIndex, setSandboxZoomFocusIndex] = useState(0);
  const [sandboxZoomLevel, setSandboxZoomLevel] = useState(1.6);
  const [sandboxShowCellMetadata, setSandboxShowCellMetadata] = useState(true);
  const [sandboxShowGridBackground, setSandboxShowGridBackground] = useState(true);
  const [sandboxRandomSeed, setSandboxRandomSeed] = useState(1);
  const [sandboxFrameCount, setSandboxFrameCount] = useState(12);
  const [sandboxUseProgrammatic, setSandboxUseProgrammatic] = useState(true);
  const [sandboxViewMode, setSandboxViewMode] = useState('comparison'); // 'comparison' | 'solo'
  const [sandboxAspectRatio, setSandboxAspectRatio] = useState('27x36');
  const [exportingMessage, setExportingMessage] = useState('');

  // Auto fallback if user selected Loaded Video but none available
  useEffect(() => {
    if (!sandboxUseProgrammatic && creatorFrames.length === 0) {
      setSandboxUseProgrammatic(true);
    }
  }, [creatorFrames.length, sandboxUseProgrammatic]);

  // Programmatically generate stroboscopic chronophotography motion study frames
  const programmaticFrames = useMemo(() => {
    const frames = [];
    const w = 640;
    const h = 480;
    for (let i = 0; i < sandboxFrameCount; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      
      // Dark Braun grid backdrop
      ctx.fillStyle = '#151515';
      ctx.fillRect(0, 0, w, h);
      
      // Draw gridlines
      ctx.strokeStyle = '#222222';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      const t = sandboxFrameCount > 1 ? i / (sandboxFrameCount - 1) : 0.5;

      // Draw axis lines
      ctx.strokeStyle = '#2c2c2c';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();

      // Render stroboscopic chronophotography trails
      for (let j = 0; j <= i; j++) {
        const trailT = sandboxFrameCount > 1 ? j / (sandboxFrameCount - 1) : 0.5;
        const trailX = 100 + trailT * (w - 200);
        const trailY = h / 2 + Math.sin(trailT * Math.PI * 2.5) * 110;
        const radius = 26 + Math.sin(trailT * Math.PI) * 14;

        if (j === i) {
          // Active frame main object
          const hue = Math.round(trailT * 360);
          ctx.beginPath();
          ctx.arc(trailX, trailY, radius, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${hue}, 85%, 55%, 0.95)`;
          ctx.fill();
          
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Orientation markings
          ctx.strokeStyle = '#151515';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(trailX, trailY - radius);
          ctx.lineTo(trailX, trailY + radius);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(trailX - radius, trailY);
          ctx.lineTo(trailX + radius, trailY);
          ctx.stroke();

          // Directional indicator
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.moveTo(trailX + radius - 3, trailY - 4);
          ctx.lineTo(trailX + radius + 5, trailY);
          ctx.lineTo(trailX + radius - 3, trailY + 4);
          ctx.fill();

          // Draw active frame index
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 12px "Space Mono", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(i + 1), trailX, trailY);
        } else {
          // Strobe history elements
          const hue = Math.round(trailT * 360);
          ctx.beginPath();
          ctx.arc(trailX, trailY, radius, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${hue}, 70%, 40%, 0.12)`;
          ctx.fill();
          ctx.strokeStyle = `hsla(${hue}, 70%, 40%, 0.25)`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      // Metadata labels
      ctx.fillStyle = '#777777';
      ctx.font = '10px "Space Mono", monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`CHRONO_REF: MOTO_STUDY_01`, 20, 20);
      ctx.fillText(`FRAME: ${String(i).padStart(3, '0')} / T: ${(t * 4.8).toFixed(2)}S`, 20, 34);
      ctx.fillText(`VELOCITY: ${(15.4 * (1 + Math.cos(t * Math.PI))).toFixed(1)} M/S`, 20, 48);

      // Corner Ticks
      ctx.strokeStyle = '#3a3a3a';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(10, 20); ctx.lineTo(10, 10); ctx.lineTo(20, 10); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w - 20, 10); ctx.lineTo(w - 10, 10); ctx.lineTo(w - 10, 20); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(10, h - 20); ctx.lineTo(10, h - 10); ctx.lineTo(20, h - 10); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w - 20, h - 10); ctx.lineTo(w - 10, h - 10); ctx.lineTo(w - 10, h - 20); ctx.stroke();

      frames.push({
        canvas,
        timestamp: t * 4.8,
        frameIndex: i,
      });
    }
    return frames;
  }, [sandboxFrameCount]);

  // Determine active frames and parameters
  const activeFrames = sandboxUseProgrammatic ? programmaticFrames : creatorFrames;
  const activeVideoName = sandboxUseProgrammatic ? 'MOTO_STUDY' : creatorVideoName;
  const activeVideoWidth = sandboxUseProgrammatic ? 640 : (creatorFrames[0]?.canvas.width || 640);
  const activeVideoHeight = sandboxUseProgrammatic ? 480 : (creatorFrames[0]?.canvas.height || 480);

  // Settings bundle
  const activeSettings = {
    extractedFrames: activeFrames,
    aspectRatio: sandboxAspectRatio,
    matteMargin: sandboxMatteMargin,
    gapSize: sandboxGapSize,
    scaleRandomness: sandboxScaleRandomness,
    positionRandomness: sandboxPositionRandomness,
    rotationRandomness: sandboxRotationRandomness,
    alternateMirror: sandboxAlternateMirror,
    paperColor: sandboxPaperColor,
    layoutMode: 'auto',
    manualColumns: 4,
    colorMode: sandboxColorMode,
    styleMode: sandboxStyleMode,
    ringRotation: sandboxRingRotation,
    ringTiltX: sandboxRingTiltX,
    ringTiltY: sandboxRingTiltY,
    zoomFocusIndex: Math.min(sandboxZoomFocusIndex, activeFrames.length - 1),
    zoomLevel: sandboxZoomLevel,
    showCellMetadata: sandboxShowCellMetadata,
    showGridBackground: sandboxShowGridBackground,
    randomSeed: sandboxRandomSeed,
    videoWidth: activeVideoWidth,
    videoHeight: activeVideoHeight,
    videoDuration: sandboxUseProgrammatic ? 4.8 : (activeFrames[activeFrames.length - 1]?.timestamp || 5),
    captureMode: 'count',
    captureValue: activeFrames.length,
    videoName: activeVideoName,
    videoFps: 30,
    isExport: false,
  };

  // High-quality high-res export trigger for Sandbox
  const handleSandboxExport = (styleModeToExport) => {
    setExportingMessage('PREPARING 300 PPI FILE...');
    setTimeout(() => {
      try {
        const offscreenCanvas = document.createElement('canvas');
        const res = RESOLUTIONS[sandboxAspectRatio];
        offscreenCanvas.width = res.width;
        offscreenCanvas.height = res.height;

        const exportSettings = {
          ...activeSettings,
          styleMode: styleModeToExport,
          isExport: true,
        };

        drawPoster(offscreenCanvas, exportSettings);

        const filename = `chrono_sandbox_${styleModeToExport}_${sandboxAspectRatio}_${res.width}x${res.height}.jpg`;

        offscreenCanvas.toBlob((blob) => {
          if (!blob) {
            setExportingMessage('EXPORT FAILED.');
            setTimeout(() => setExportingMessage(''), 2000);
            return;
          }

          const dlUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.download = filename;
          a.href = dlUrl;
          a.click();

          setTimeout(() => URL.revokeObjectURL(dlUrl), 100);
          setExportingMessage('EXPORT COMPLETED.');
          setTimeout(() => setExportingMessage(''), 2000);
        }, 'image/jpeg', 0.95);
      } catch (err) {
        console.error('Sandbox export failed:', err);
        setExportingMessage(`EXPORT ERROR: ${err.message}`);
        setTimeout(() => setExportingMessage(''), 3000);
      }
    }, 100);
  };

  // Layout Styles metadata mapping
  const styleModesMeta = [
    { id: 'grid-meta', name: 'GRID WITH METADATA', desc: 'Standard chronophotography alignment with individual frame metrics.' },
    { id: 'orbit', name: 'ORBIT RING (3D)', desc: 'Perspective-skewed rings of frames mimicking rotational path cameras.' },
    { id: 'zoom', name: 'ZOOM FOCUS CASCADE', desc: 'Concentrates on a specific keyframe while other cells decrease dynamically.' },
    { id: 'prog-vert', name: 'PROGRESSIVE ROWS', desc: 'Row-by-row layout solver scaling height incrementally.' },
    { id: 'prog-horiz', name: 'PROGRESSIVE COLUMNS', desc: 'Column-by-column layout solver scaling width incrementally.' },
  ];

  return (
    <div className="sandbox-container">
      {/* Sandbox Workspace Area */}
      <div className="sandbox-workspace">
        {/* Sandbox Navigation Sub-Header */}
        <div className="sandbox-view-controls">
          <div className="sandbox-segment">
            <span className="sandbox-segment-label">VIEW MODE:</span>
            <div className="sandbox-segment-buttons">
              <button
                type="button"
                id="sandbox-view-comparison"
                className={`sandbox-segment-btn ${sandboxViewMode === 'comparison' ? 'active' : ''}`}
                onClick={() => setSandboxViewMode('comparison')}
              >
                COMPARISON GRID (ALL MODES)
              </button>
              <button
                type="button"
                id="sandbox-view-solo"
                className={`sandbox-segment-btn ${sandboxViewMode === 'solo' ? 'active' : ''}`}
                onClick={() => setSandboxViewMode('solo')}
              >
                SOLO FOCUS VIEW
              </button>
            </div>
          </div>

          <div className="sandbox-segment">
            <span className="sandbox-segment-label">FRAME SOURCE:</span>
            <div className="sandbox-segment-buttons">
              <button
                type="button"
                id="sandbox-source-prog"
                className={`sandbox-segment-btn ${sandboxUseProgrammatic ? 'active' : ''}`}
                onClick={() => setSandboxUseProgrammatic(true)}
              >
                MOTO STUDY (PROGRAMMATIC)
              </button>
              <button
                type="button"
                id="sandbox-source-video"
                className={`sandbox-segment-btn ${!sandboxUseProgrammatic ? 'active' : ''}`}
                disabled={creatorFrames.length === 0}
                onClick={() => setSandboxUseProgrammatic(false)}
                title={creatorFrames.length === 0 ? 'Upload a video file in creator mode first' : 'Use video stills'}
              >
                VIDEO STILLS {creatorFrames.length > 0 && `(${creatorFrames.length})`}
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Sandbox Layout Canvas Grid */}
        <div className="sandbox-canvas-viewport">
          {sandboxViewMode === 'comparison' ? (
            <div className="sandbox-comparison-grid">
              {styleModesMeta.map((mode) => (
                <div key={mode.id} className="sandbox-card">
                  <div className="sandbox-card-header">
                    <span className="sandbox-card-title">{mode.name}</span>
                    <span className="sandbox-card-tag">{mode.id.toUpperCase()}</span>
                  </div>
                  <div className="sandbox-card-body">
                    <SandboxCanvasPreview
                      settings={activeSettings}
                      styleModeOverride={mode.id}
                      onExport={handleSandboxExport}
                    />
                  </div>
                  <div className="sandbox-card-footer">
                    <p className="sandbox-card-desc">{mode.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="sandbox-solo-viewport">
              <div className="sandbox-solo-card">
                <div className="sandbox-card-header">
                  <span className="sandbox-card-title">
                    {styleModesMeta.find((m) => m.id === sandboxStyleMode)?.name}
                  </span>
                  <span className="sandbox-card-tag">{sandboxStyleMode.toUpperCase()}</span>
                </div>
                <div className="sandbox-card-body-solo">
                  <SandboxCanvasPreview
                    settings={activeSettings}
                    styleModeOverride={sandboxStyleMode}
                    onExport={handleSandboxExport}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sandbox Controls Column */}
      <div className="sidebar sandbox-sidebar">
        <div className="sidebar-header">
          <h1>SANDBOX PARAMETERS</h1>
          <span className="brand-sub">CHRONO-ART DESIGN SYSTEM PLAYGROUND</span>
        </div>

        <div className="control-groups">
          {/* Section 1: Basic Document settings */}
          <section className="control-section">
            <h2>01 / CANVAS LAYOUT</h2>

            <div className="control-row">
              <label htmlFor="sandbox-aspect-ratio">ASPECT RATIO:</label>
              <select
                id="sandbox-aspect-ratio"
                value={sandboxAspectRatio}
                onChange={(e) => setSandboxAspectRatio(e.target.value)}
              >
                <option value="27x36">27" x 36" (PORTRAIT)</option>
                <option value="36x27">36" x 27" (LANDSCAPE)</option>
                <option value="24x24">24" x 24" (SQUARE)</option>
              </select>
            </div>

            <div className="control-row">
              <label htmlFor="sandbox-matte-margin">MATTE MARGIN:</label>
              <div className="slider-container">
                <input
                  type="range"
                  id="sandbox-matte-margin"
                  min="0"
                  max="25"
                  value={sandboxMatteMargin}
                  onChange={(e) => setSandboxMatteMargin(parseInt(e.target.value))}
                />
                <span className="slider-val">{sandboxMatteMargin}%</span>
              </div>
            </div>

            <div className="control-row">
              <label htmlFor="sandbox-frame-count">SAMPLE FRAME COUNT:</label>
              <div className="slider-container">
                <input
                  type="range"
                  id="sandbox-frame-count"
                  min="4"
                  max="120"
                  value={sandboxFrameCount}
                  disabled={!sandboxUseProgrammatic}
                  onChange={(e) => setSandboxFrameCount(parseInt(e.target.value))}
                />
                <span className="slider-val">{activeFrames.length} F</span>
              </div>
            </div>
          </section>

          {/* Section 2: Layout Style Selection (Only active/visible in Solo mode) */}
          {sandboxViewMode === 'solo' && (
            <section className="control-section">
              <h2>02 / CHOSE LAYOUT STYLE</h2>
              <div className="control-row">
                <label htmlFor="sandbox-style-select">LAYOUT MODE:</label>
                <select
                  id="sandbox-style-select"
                  value={sandboxStyleMode}
                  onChange={(e) => setSandboxStyleMode(e.target.value)}
                >
                  <option value="grid-meta">GRID WITH METADATA</option>
                  <option value="orbit">ORBIT RING</option>
                  <option value="zoom">ZOOM FOCUS CASCADE</option>
                  <option value="prog-vert">PROGRESSIVE ROWS</option>
                  <option value="prog-horiz">PROGRESSIVE COLUMNS</option>
                </select>
              </div>
            </section>
          )}

          {/* Section 3: Layout specific details */}
          <section className="control-section">
            <h2>03 / LAYOUT SPECIFIC PARAMETERS</h2>

            {/* Orbit options */}
            {(sandboxViewMode === 'comparison' || sandboxStyleMode === 'orbit') && (
              <fieldset style={{ border: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <legend style={{ fontSize: '9px', color: 'var(--text-muted)', marginBottom: '4px', letterSpacing: '1px' }}>
                  ORBIT STYLE CONTROLS
                </legend>
                <div className="control-row">
                  <label htmlFor="sandbox-orbit-tilt-x">ORBIT TILT X:</label>
                  <div className="slider-container">
                    <input
                      type="range"
                      id="sandbox-orbit-tilt-x"
                      min="-90"
                      max="90"
                      value={sandboxRingTiltX}
                      onChange={(e) => setSandboxRingTiltX(parseInt(e.target.value))}
                    />
                    <span className="slider-val">{sandboxRingTiltX}°</span>
                  </div>
                </div>
                <div className="control-row">
                  <label htmlFor="sandbox-orbit-tilt-y">ORBIT TILT Y:</label>
                  <div className="slider-container">
                    <input
                      type="range"
                      id="sandbox-orbit-tilt-y"
                      min="-90"
                      max="90"
                      value={sandboxRingTiltY}
                      onChange={(e) => setSandboxRingTiltY(parseInt(e.target.value))}
                    />
                    <span className="slider-val">{sandboxRingTiltY}°</span>
                  </div>
                </div>
                <div className="control-row">
                  <label htmlFor="sandbox-orbit-roll">ORBIT ROLL (Z):</label>
                  <div className="slider-container">
                    <input
                      type="range"
                      id="sandbox-orbit-roll"
                      min="0"
                      max="360"
                      value={sandboxRingRotation}
                      onChange={(e) => setSandboxRingRotation(parseInt(e.target.value))}
                    />
                    <span className="slider-val">{sandboxRingRotation}°</span>
                  </div>
                </div>
              </fieldset>
            )}

            {/* Zoom options */}
            {(sandboxViewMode === 'comparison' || sandboxStyleMode === 'zoom') && (
              <fieldset style={{ border: 'none', display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
                <legend style={{ fontSize: '9px', color: 'var(--text-muted)', marginBottom: '4px', letterSpacing: '1px' }}>
                  ZOOM CASCADE CONTROLS
                </legend>
                <div className="control-row">
                  <label htmlFor="sandbox-zoom-focus">FOCUS INDEX:</label>
                  <div className="slider-container">
                    <input
                      type="range"
                      id="sandbox-zoom-focus"
                      min="0"
                      max={Math.max(0, activeFrames.length - 1)}
                      value={sandboxZoomFocusIndex}
                      onChange={(e) => setSandboxZoomFocusIndex(parseInt(e.target.value))}
                    />
                    <span className="slider-val">#{sandboxZoomFocusIndex + 1}</span>
                  </div>
                </div>
                <div className="control-row">
                  <label htmlFor="sandbox-zoom-factor">ZOOM FACTOR:</label>
                  <div className="slider-container">
                    <input
                      type="range"
                      id="sandbox-zoom-factor"
                      min="0.0"
                      max="4.0"
                      step="0.1"
                      value={sandboxZoomLevel}
                      onChange={(e) => setSandboxZoomLevel(parseFloat(e.target.value))}
                    />
                    <span className="slider-val">{sandboxZoomLevel.toFixed(1)}x</span>
                  </div>
                </div>
              </fieldset>
            )}

            {/* Spacing options */}
            <div className="control-row" style={{ marginTop: '8px' }}>
              <label htmlFor="sandbox-gap-size">CELL SPACING:</label>
              <div className="slider-container">
                <input
                  type="range"
                  id="sandbox-gap-size"
                  min="0"
                  max="80"
                  value={sandboxGapSize}
                  onChange={(e) => setSandboxGapSize(parseInt(e.target.value))}
                />
                <span className="slider-val">{sandboxGapSize}px</span>
              </div>
            </div>

            <div className="toggle-row">
              <span className="label-text">CELL METADATA:</span>
              <div className="switch-group">
                <button
                  type="button"
                  id="sandbox-meta-on"
                  className={`switch-btn ${sandboxShowCellMetadata ? 'active' : ''}`}
                  onClick={() => setSandboxShowCellMetadata(true)}
                >
                  ON
                </button>
                <button
                  type="button"
                  id="sandbox-meta-off"
                  className={`switch-btn ${!sandboxShowCellMetadata ? 'active' : ''}`}
                  onClick={() => setSandboxShowCellMetadata(false)}
                >
                  OFF
                </button>
              </div>
            </div>

            <div className="toggle-row">
              <span className="label-text">GRID BACKGROUND:</span>
              <div className="switch-group">
                <button
                  type="button"
                  id="sandbox-grid-bg-on"
                  className={`switch-btn ${sandboxShowGridBackground ? 'active' : ''}`}
                  onClick={() => setSandboxShowGridBackground(true)}
                >
                  ON
                </button>
                <button
                  type="button"
                  id="sandbox-grid-bg-off"
                  className={`switch-btn ${!sandboxShowGridBackground ? 'active' : ''}`}
                  onClick={() => setSandboxShowGridBackground(false)}
                >
                  OFF
                </button>
              </div>
            </div>
          </section>

          {/* Section 4: Randomization parameters */}
          <section className="control-section">
            <h2>04 / DISTORTION & RANDOMNESS</h2>

            <div className="control-row">
              <label htmlFor="sandbox-random-scale">SCALE JITTER:</label>
              <div className="slider-container">
                <input
                  type="range"
                  id="sandbox-random-scale"
                  min="0"
                  max="30"
                  value={sandboxScaleRandomness}
                  onChange={(e) => setSandboxScaleRandomness(parseInt(e.target.value))}
                />
                <span className="slider-val">{sandboxScaleRandomness}%</span>
              </div>
            </div>

            <div className="control-row">
              <label htmlFor="sandbox-random-offset">POSITION OFFSET:</label>
              <div className="slider-container">
                <input
                  type="range"
                  id="sandbox-random-offset"
                  min="0"
                  max="30"
                  value={sandboxPositionRandomness}
                  onChange={(e) => setSandboxPositionRandomness(parseInt(e.target.value))}
                />
                <span className="slider-val">{sandboxPositionRandomness}px</span>
              </div>
            </div>

            <div className="control-row">
              <label htmlFor="sandbox-random-rotate">CELL TILT:</label>
              <div className="slider-container">
                <input
                  type="range"
                  id="sandbox-random-rotate"
                  min="0"
                  max="15"
                  value={sandboxRotationRandomness}
                  onChange={(e) => setSandboxRotationRandomness(parseInt(e.target.value))}
                />
                <span className="slider-val">{sandboxRotationRandomness}°</span>
              </div>
            </div>

            <div className="control-row">
              <label htmlFor="sandbox-random-seed">RANDOM SEED:</label>
              <div className="slider-container">
                <input
                  type="range"
                  id="sandbox-random-seed"
                  min="1"
                  max="100"
                  value={sandboxRandomSeed}
                  onChange={(e) => setSandboxRandomSeed(parseInt(e.target.value))}
                />
                <span className="slider-val">{sandboxRandomSeed}</span>
              </div>
            </div>

            <div className="toggle-row">
              <span className="label-text">MIRROR ALTERNATING:</span>
              <div className="switch-group">
                <button
                  type="button"
                  id="sandbox-mirror-on"
                  className={`switch-btn ${sandboxAlternateMirror ? 'active' : ''}`}
                  onClick={() => setSandboxAlternateMirror(true)}
                >
                  ON
                </button>
                <button
                  type="button"
                  id="sandbox-mirror-off"
                  className={`switch-btn ${!sandboxAlternateMirror ? 'active' : ''}`}
                  onClick={() => setSandboxAlternateMirror(false)}
                >
                  OFF
                </button>
              </div>
            </div>
          </section>

          {/* Section 5: Render & color controls */}
          <section className="control-section">
            <h2>05 / TINT & THEME</h2>

            <div className="control-row">
              <label htmlFor="sandbox-color-mode">COLOR MODE:</label>
              <select
                id="sandbox-color-mode"
                value={sandboxColorMode}
                onChange={(e) => setSandboxColorMode(e.target.value)}
              >
                <option value="color">FULL DYNAMIC COLOR</option>
                <option value="bw">GRAYSCALE STUDY</option>
                <option value="gradient">GRADIENT MULTIPLY</option>
                <option value="pop">POP COMPOSITE DUAL</option>
              </select>
            </div>

            <div className="control-row">
              <label htmlFor="sandbox-paper-color">PAPER THEME:</label>
              <select
                id="sandbox-paper-color"
                value={sandboxPaperColor}
                onChange={(e) => setSandboxPaperColor(e.target.value)}
              >
                <option value="white">STUDIO WHITE</option>
                <option value="cream">BRAUN CREAM</option>
                <option value="gray">SLATE GRAY</option>
                <option value="black">MATTE BLACK</option>
                <option value="olive">SAGE OLIVE</option>
                <option value="terracotta">TERRACOTTA SAND</option>
                <option value="navy">ARCHITECTURAL NAVY</option>
              </select>
            </div>
          </section>
        </div>

        {sandboxViewMode === 'solo' && (
          <div className="sidebar-footer">
            <button
              type="button"
              className="action-btn"
              onClick={() => handleSandboxExport(sandboxStyleMode)}
            >
              EXPORT CURRENT SOLO LAYOUT
            </button>
          </div>
        )}
      </div>

      {/* Dynamic Overlay for Exports */}
      {exportingMessage && (
        <div className="sandbox-toast-overlay">
          <div className="sandbox-toast-box">
            <span className="sandbox-toast-spinner"></span>
            <span className="sandbox-toast-text">{exportingMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}
