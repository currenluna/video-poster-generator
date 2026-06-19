import { useEffect, useRef, useState } from 'react';
import { drawPoster } from '../utils/posterRenderer';
import { RESOLUTIONS } from '../utils/constants';

/**
 * PosterPreview — Renders the canvas and handles redrawing, auto-fitting, 
 * timeline trimming, and visualizer full-screen overlay tabs.
 *
 * Timeline modes:
 * - Still: single draggable pointer, backed by its own stillFrameTime state
 * - Triptych: three draggable pointers (sets triptychTimestamps)
 * - Other: standard start/end trim range window (clipStart/clipEnd)
 *
 * Still, Triptych, and the trim-range modes each keep their own timeline
 * state so switching styleMode never collapses one mode's saved position
 * into another's.
 */
export default function PosterPreview({
  settings,
  statusText,
  statusType,
  clipStart = 0,
  setClipStart,
  clipEnd = 0,
  setClipEnd,
  stillFrameTime = 0,
  setStillFrameTime,
  triptychTimestamps,
  setTriptychTimestamps,
  videoFps,
  notifications = [],
}) {
  const {
    extractedFrames,
    aspectRatio,
    matteMargin,
    gapSize,
    scaleRandomness,
    positionRandomness,
    rotationRandomness,
    alternateMirror,
    paperColor,
    layoutMode,
    manualColumns,
    colorMode,
    styleMode,
    ringRotation,
    ringTiltX,
    ringTiltY,
    zoomFocusIndex,
    zoomLevel,
    showCellMetadata,
    showGridBackground,
    videoWidth,
    videoHeight,
    videoDuration,
    captureMode,
    captureValue,
    videoName,
    videoFps: settingsVideoFps,
    randomSeed,
    isExport,
  } = settings;

  const fps = videoFps || settingsVideoFps || 30;

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const trackRef = useRef(null);
  const draggingRef = useRef(null);

  // Fullscreen study overlay: a single true-fullscreen zoom/pan viewport, no nav/tabs.
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [studyView, setStudyView] = useState({ scale: 1, x: 0, y: 0 });
  const studyCanvasRef = useRef(null);
  const fullscreenViewportRef = useRef(null);
  const activePointersRef = useRef(new Map()); // pointerId -> {x, y}
  const pinchStateRef = useRef(null); // { startDist, startScale }
  const panStateRef = useRef(null); // { startX, startY, originX, originY }

  // ---------------------------------------------------------------------------
  // Standard start/end trim dragging
  // ---------------------------------------------------------------------------
  const handleDragStart = (e, type) => {
    e.preventDefault();
    draggingRef.current = type;
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleDragEnd);
  };

  const updateClipTime = (clientX) => {
    if (!trackRef.current || !draggingRef.current || videoDuration <= 0) return;
    const rect = trackRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const newTime = pct * videoDuration;
    const type = draggingRef.current;

    // Still mode — single pointer, kept entirely separate from the trim range
    if (styleMode === 'still') {
      const t = Math.max(0, Math.min(newTime, videoDuration));
      setStillFrameTime(t);
      return;
    }

    // Triptych mode — drag pointers p1, p2, p3
    if (type === 'p1' || type === 'p2' || type === 'p3') {
      if (!triptychTimestamps || !setTriptychTimestamps) return;
      const ts = [...triptychTimestamps];
      if (type === 'p1') ts[0] = Math.max(0, Math.min(newTime, ts[1] - 0.1));
      if (type === 'p2') ts[1] = Math.max(ts[0] + 0.1, Math.min(newTime, ts[2] - 0.1));
      if (type === 'p3') ts[2] = Math.max(ts[1] + 0.1, Math.min(newTime, videoDuration));
      setTriptychTimestamps(ts);
      return;
    }

    // Default start/end trim
    if (type === 'start') {
      setClipStart(Math.max(0, Math.min(newTime, clipEnd - 0.2)));
    } else if (type === 'end') {
      setClipEnd(Math.max(clipStart + 0.2, Math.min(newTime, videoDuration)));
    }
  };

  const handleDragMove = (e) => {
    updateClipTime(e.clientX);
  };

  const handleTouchMove = (e) => {
    if (e.cancelable) e.preventDefault();
    updateClipTime(e.touches[0].clientX);
  };

  const handleDragEnd = () => {
    draggingRef.current = null;
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleDragEnd);
  };

  const leftPct = videoDuration > 0 ? (clipStart / videoDuration) * 100 : 0;
  const rightPct = videoDuration > 0 ? (clipEnd / videoDuration) * 100 : 100;
  const widthPct = rightPct - leftPct;
  const stillPct = videoDuration > 0 ? (stillFrameTime / videoDuration) * 100 : 0;
  
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const baseWidth = 800;

  const recalculateFit = () => {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;

    const res = RESOLUTIONS[aspectRatio] || { width: 3, height: 4 };
    const aspect = res.width / res.height;

    const padding = extractedFrames.length > 0 ? 24 : 48;
    const maxW = containerWidth - padding * 2;
    const maxH = containerHeight - padding * 2;

    let targetW = maxW;
    let targetH = maxW / aspect;

    if (targetH > maxH) {
      targetH = maxH;
      targetW = maxH * aspect;
    }

    const scale = targetW / baseWidth;
    const x = (containerWidth - targetW) / 2;
    const y = (containerHeight - targetH) / 2;

    setTransform({ x, y, scale });
  };

  // Recalculate fit automatically on workspace resize or changes
  useEffect(() => {
    recalculateFit();
  }, [aspectRatio, extractedFrames.length]);

  useEffect(() => {
    const handleResize = () => {
      recalculateFit();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [aspectRatio]);

  // Redraw the poster whenever rendering settings or frames change
  useEffect(() => {
    if (canvasRef.current) {
      drawPoster(canvasRef.current, settings);
    }
  }, [settings, extractedFrames]);

  // Redraw the fullscreen study canvas whenever it's open or settings change
  useEffect(() => {
    if (isFullscreenOpen && studyCanvasRef.current) {
      drawPoster(studyCanvasRef.current, settings);
    }
  }, [isFullscreenOpen, settings, extractedFrames]);

  // Delegated wheel scrolling on preview panel to sidebar settings scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheelRaw = (e) => {
      const controlGroups = document.querySelector('.control-groups');
      if (controlGroups) {
        controlGroups.scrollTop += e.deltaY;
      }
    };

    container.addEventListener('wheel', handleWheelRaw, { passive: true });
    return () => container.removeEventListener('wheel', handleWheelRaw);
  }, []);

  // ---------------------------------------------------------------------------
  // Fullscreen study: zoom (wheel / pinch) + pan (drag), bounded so the paper
  // can't be moved past its own edges relative to the center of the screen.
  // ---------------------------------------------------------------------------
  const clampStudyPan = (x, y, scale) => {
    const vp = fullscreenViewportRef.current;
    if (!vp) return { x, y };
    const w = baseWidth * scale;
    const h = baseHeight * scale;
    const maxX = Math.max(0, (w - vp.clientWidth) / 2);
    const maxY = Math.max(0, (h - vp.clientHeight) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  };

  const handleFullscreenWheel = (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    setStudyView((prev) => {
      const scale = Math.max(0.4, Math.min(prev.scale * factor, 4.0));
      const { x, y } = clampStudyPan(prev.x, prev.y, scale);
      return { scale, x, y };
    });
  };

  const handleStudyPointerDown = (e) => {
    fullscreenViewportRef.current?.setPointerCapture(e.pointerId);
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointersRef.current.size === 2) {
      const pts = [...activePointersRef.current.values()];
      pinchStateRef.current = {
        startDist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
        startScale: studyView.scale,
      };
      panStateRef.current = null;
    } else if (activePointersRef.current.size === 1) {
      panStateRef.current = { startX: e.clientX, startY: e.clientY, originX: studyView.x, originY: studyView.y };
    }
  };

  const handleStudyPointerMove = (e) => {
    if (!activePointersRef.current.has(e.pointerId)) return;
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointersRef.current.size === 2 && pinchStateRef.current) {
      const pts = [...activePointersRef.current.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const scale = Math.max(0.4, Math.min((dist / pinchStateRef.current.startDist) * pinchStateRef.current.startScale, 4.0));
      setStudyView((prev) => {
        const { x, y } = clampStudyPan(prev.x, prev.y, scale);
        return { scale, x, y };
      });
    } else if (activePointersRef.current.size === 1 && panStateRef.current) {
      const dx = e.clientX - panStateRef.current.startX;
      const dy = e.clientY - panStateRef.current.startY;
      setStudyView((prev) => {
        const { x, y } = clampStudyPan(panStateRef.current.originX + dx, panStateRef.current.originY + dy, prev.scale);
        return { ...prev, x, y };
      });
    }
  };

  const handleStudyPointerUp = (e) => {
    activePointersRef.current.delete(e.pointerId);
    pinchStateRef.current = null;
    if (activePointersRef.current.size === 1) {
      const [[, pt]] = activePointersRef.current;
      panStateRef.current = { startX: pt.x, startY: pt.y, originX: studyView.x, originY: studyView.y };
    } else {
      panStateRef.current = null;
    }
  };

  const res = RESOLUTIONS[settings.aspectRatio] || { width: 3, height: 4 };
  const baseHeight = (res.height / res.width) * baseWidth;

  const canvasStyle = {
    position: 'absolute',
    left: 0,
    top: 0,
    width: `${baseWidth}px`,
    height: `${baseHeight}px`,
    maxWidth: 'none',
    maxHeight: 'none',
    transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
    transformOrigin: 'top left',
    transition: 'none',
    boxShadow: `
      0 1px 3px rgba(0,0,0,0.05),
      0 20px 40px rgba(0,0,0,0.08), 
      0 0 0 1px rgba(0,0,0,0.05)
    `,
    background: '#ffffff',
  };

  const containerStyle = {
    position: 'relative',
    overflow: 'hidden',
    cursor: 'default',
  };

  // Format frame number from time
  const timeToFrame = (t) => Math.round(t * fps);

  return (
    <div className="workspace">
      <div 
        className="poster-container" 
        ref={containerRef}
        style={containerStyle}
      >
        <canvas
          id="poster-canvas"
          className="poster-canvas-preview"
          ref={canvasRef}
          style={canvasStyle}
        />

        {/* Floating Expand button to access visualizer mockup modal */}
        {settings.extractedFrames.length > 0 && (
          <button
            type="button"
            className="btn-expand-preview"
            onClick={() => {
              setIsFullscreenOpen(true);
              setStudyView({ scale: 1, x: 0, y: 0 });
            }}
            title="Expand Fullscreen Print Study Mockup"
            aria-label="View print study"
          >
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2H2v4" />
              <path d="M10 14h4v-4" />
              <path d="M14 2 9 7" />
              <path d="M2 14l5-5" />
            </svg>
          </button>
        )}

        {/* Floating status notification stack — top-right of the canvas, newest on top */}
        {notifications.length > 0 && (
          <div className="notifications-container">
            {[...notifications].reverse().map((n) => (
              <div key={n.id} className={`status-notification ${n.type}${n.fadeState === 'out' ? ' fade-out' : ''}`}>
                <span className="status-indicator"></span>
                <span className="status-text">{n.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Timeline bar — adapts to mode */}
      {settings.extractedFrames.length > 0 && settings.videoDuration > 0 && (
        <div className="timeline-bar">
          <div className="timeline-info">
            {styleMode === 'still' ? (
              <>
                <span>FRAME SELECT: <span className="timeline-info-span">#{timeToFrame(stillFrameTime)}</span></span>
                <span>DURATION: <span className="timeline-info-span">{videoDuration.toFixed(1)}s</span></span>
              </>
            ) : styleMode === 'triptych' && triptychTimestamps ? (
              <>
                <span>TRIPTYCH: <span className="timeline-info-span">#{timeToFrame(triptychTimestamps[0])} / #{timeToFrame(triptychTimestamps[1])} / #{timeToFrame(triptychTimestamps[2])}</span></span>
                <span>DURATION: <span className="timeline-info-span">{videoDuration.toFixed(1)}s</span></span>
              </>
            ) : (
              <>
                <span>TRIM: <span className="timeline-info-span">F{timeToFrame(clipStart)} – F{timeToFrame(clipEnd)}</span></span>
                <span>DURATION: <span className="timeline-info-span">{(clipEnd - clipStart).toFixed(1)}s</span></span>
              </>
            )}
          </div>

          <div className="trim-track-wrapper" ref={trackRef}>
            {/* ——— STILL MODE: single pointer ——— */}
            {styleMode === 'still' ? (
              <>
                <div
                  className="timeline-single-pointer"
                  style={{ left: `${stillPct}%` }}
                  onMouseDown={(e) => handleDragStart(e, 'start')}
                  onTouchStart={(e) => handleDragStart(e, 'start')}
                  title="Drag to select frame"
                >
                  <span className="pointer-label">▼</span>
                </div>
                {/* Still frame ticks */}
                {settings.extractedFrames.map((frame, index) => {
                  const tickPct = (frame.timestamp / settings.videoDuration) * 100;
                  return (
                    <div 
                      key={index} 
                      className="trim-marker-tick" 
                      style={{ left: `${tickPct}%` }}
                    />
                  );
                })}
              </>
            ) : styleMode === 'triptych' && triptychTimestamps ? (
              /* ——— TRIPTYCH MODE: three pointers ——— */
              <>
                {triptychTimestamps.map((ts, idx) => {
                  const pct = videoDuration > 0 ? (ts / videoDuration) * 100 : 0;
                  const labels = ['1', '2', '3'];
                  const handleId = `p${idx + 1}`;
                  return (
                    <div
                      key={handleId}
                      className={`timeline-triptych-pointer pointer-${idx}`}
                      style={{ left: `${pct}%` }}
                      onMouseDown={(e) => handleDragStart(e, handleId)}
                      onTouchStart={(e) => handleDragStart(e, handleId)}
                      title={`Drag to select frame ${idx + 1}`}
                    >
                      <span className="pointer-label">{labels[idx]}</span>
                    </div>
                  );
                })}
                {/* Frame ticks */}
                {settings.extractedFrames.map((frame, index) => {
                  const tickPct = (frame.timestamp / settings.videoDuration) * 100;
                  return (
                    <div 
                      key={index} 
                      className="trim-marker-tick" 
                      style={{ left: `${tickPct}%` }}
                    />
                  );
                })}
              </>
            ) : (
              /* ——— DEFAULT: start/end trim range ——— */
              <>
                {/* Dark Overlay (Left of trim range) */}
                <div className="trim-dim-overlay left" style={{ width: `${leftPct}%` }} />

                {/* Dark Overlay (Right of trim range) */}
                <div className="trim-dim-overlay right" style={{ width: `${100 - rightPct}%` }} />

                {/* Yellow Trim Selection Window */}
                <div 
                  className="trim-selection-frame" 
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                >
                  {/* Left drag handle */}
                  <div 
                    className="trim-handle left" 
                    onMouseDown={(e) => handleDragStart(e, 'start')}
                    onTouchStart={(e) => handleDragStart(e, 'start')}
                    title="Drag to trim start time"
                  />

                  {/* Right drag handle */}
                  <div 
                    className="trim-handle right" 
                    onMouseDown={(e) => handleDragStart(e, 'end')}
                    onTouchStart={(e) => handleDragStart(e, 'end')}
                    title="Drag to trim end time"
                  />
                </div>

                {/* Render capture ticks of all currently extracted stills */}
                {settings.extractedFrames.map((frame, index) => {
                  const tickPct = (frame.timestamp / settings.videoDuration) * 100;
                  return (
                    <div 
                      key={index} 
                      className="trim-marker-tick" 
                      style={{ left: `${tickPct}%` }}
                    />
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}

      {/* Fullscreen print study — true fullscreen, no nav chrome. Scroll/pinch to
          zoom, drag to pan, bounded to the edges of the paper around center. */}
      {isFullscreenOpen && (
        <div className="fullscreen-overlay-bare">
          <button
            type="button"
            className="fullscreen-close-btn-float"
            onClick={() => setIsFullscreenOpen(false)}
            aria-label="Close fullscreen print study"
          >
            <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
              <path d="M3 3l10 10M13 3 3 13" />
            </svg>
          </button>

          <div
            className="fullscreen-study-viewport"
            ref={fullscreenViewportRef}
            onWheel={handleFullscreenWheel}
            onPointerDown={handleStudyPointerDown}
            onPointerMove={handleStudyPointerMove}
            onPointerUp={handleStudyPointerUp}
            onPointerCancel={handleStudyPointerUp}
          >
            <div
              className="zoom-wrapper"
              style={{
                transform: `translate(${studyView.x}px, ${studyView.y}px) scale(${studyView.scale})`,
                transformOrigin: 'center center',
              }}
            >
              <canvas
                ref={studyCanvasRef}
                className="fullscreen-canvas study"
                style={{
                  width: `${baseWidth}px`,
                  height: `${baseHeight}px`,
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}