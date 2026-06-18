import { useEffect, useRef, useState } from 'react';
import { drawPoster } from '../utils/posterRenderer';
import { RESOLUTIONS } from '../utils/constants';

/**
 * PosterPreview — Renders the canvas and handles redrawing, infinite-canvas style zooming, panning, and mobile touch gestures.
 */
function FilmstripThumb({ canvas }) {
  const thumbCanvasRef = useRef(null);

  useEffect(() => {
    const destCanvas = thumbCanvasRef.current;
    if (destCanvas && canvas) {
      destCanvas.width = 80;
      destCanvas.height = 60;
      const ctx = destCanvas.getContext('2d');
      ctx.drawImage(canvas, 0, 0, destCanvas.width, destCanvas.height);
    }
  }, [canvas]);

  return <canvas ref={thumbCanvasRef} className="filmstrip-thumb-canvas" />;
}

export default function PosterPreview({
  settings,
  statusText,
  statusType,
  clipStart = 0,
  setClipStart,
  clipEnd = 0,
  setClipEnd,
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
    videoFps,
    randomSeed,
    isExport,
  } = settings;

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const trackRef = useRef(null);
  const draggingRef = useRef(null);

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

    if (draggingRef.current === 'start') {
      setClipStart(Math.max(0, Math.min(newTime, clipEnd - 0.2)));
    } else if (draggingRef.current === 'end') {
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

  const filmstripCount = 12;
  const filmstripFrames = [];
  const N_frames = extractedFrames.length;
  if (N_frames > 0) {
    for (let i = 0; i < filmstripCount; i++) {
      const idx = Math.min(N_frames - 1, Math.floor((i / (filmstripCount - 1)) * (N_frames - 1)));
      filmstripFrames.push(extractedFrames[idx]);
    }
  }

  const leftPct = videoDuration > 0 ? (clipStart / videoDuration) * 100 : 0;
  const rightPct = videoDuration > 0 ? (clipEnd / videoDuration) * 100 : 100;
  const widthPct = rightPct - leftPct;
  
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isFit, setIsFit] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [frameType, setFrameType] = useState('none');
  const dragStartRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  const baseWidth = 800;

  // Use a ref to always access the latest values inside event listeners without rebuilding them
  const stateRef = useRef({ transform, settings, isFit });
  stateRef.current = { transform, settings, isFit };

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

  const zoomToScaleCentered = (targetScale, currentTransform) => {
    if (!containerRef.current) return currentTransform;
    const containerRect = containerRef.current.getBoundingClientRect();
    const mx = containerRect.width / 2;
    const my = containerRect.height / 2;

    const res = RESOLUTIONS[aspectRatio] || { width: 3, height: 4 };
    const baseHeight = (res.height / res.width) * baseWidth;

    const newScale = Math.max(0.15, Math.min(targetScale, 6.0));

    const canvasX = (mx - currentTransform.x) / currentTransform.scale;
    const canvasY = (my - currentTransform.y) / currentTransform.scale;

    let newX = mx - canvasX * newScale;
    let newY = my - canvasY * newScale;

    // Apply bounding limits
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;
    const canvasW = baseWidth * newScale;
    const canvasH = baseHeight * newScale;

    const minOverlap = Math.min(150, Math.min(canvasW, canvasH) * 0.3);
    const minX = minOverlap - canvasW;
    const maxX = containerWidth - minOverlap;
    const minY = minOverlap - canvasH;
    const maxY = containerHeight - minOverlap;

    newX = Math.max(minX, Math.min(newX, maxX));
    newY = Math.max(minY, Math.min(newY, maxY));

    return { x: newX, y: newY, scale: newScale };
  };

  // Recalculate fit when toggled, when aspect ratio changes, or when frames load
  useEffect(() => {
    if (isFit) {
      recalculateFit();
    }
  }, [isFit, aspectRatio, extractedFrames.length]);

  // Handle window resizing
  useEffect(() => {
    const handleResize = () => {
      if (isFit) {
        recalculateFit();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isFit, aspectRatio]);

  // Redraw the poster whenever any rendering setting or frames change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    drawPoster(canvas, settings);
  }, [
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
    videoFps,
    randomSeed,
    isExport,
  ]);

  // Keyboard shortcuts listener for Ctrl/Cmd + '-' or '+'
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          setIsFit(false);
          setTransform((prev) => zoomToScaleCentered(prev.scale + 0.1, prev));
        } else if (e.key === '-') {
          e.preventDefault();
          setIsFit(false);
          setTransform((prev) => zoomToScaleCentered(prev.scale - 0.1, prev));
        } else if (e.key === '0') {
          e.preventDefault();
          setIsFit(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Zoom via mouse wheel directly (without Command/Control requirement)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheelRaw = (e) => {
      e.preventDefault();

      const { transform: currentTransform, settings: currentSettings } = stateRef.current;
      const containerRect = container.getBoundingClientRect();

      const mx = e.clientX - containerRect.left;
      const my = e.clientY - containerRect.top;

      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;

      setTransform((prev) => {
        let newScale = prev.scale * zoomFactor;
        newScale = Math.max(0.15, Math.min(newScale, 6.0));

        const canvasX = (mx - prev.x) / prev.scale;
        const canvasY = (my - prev.y) / prev.scale;

        let newX = mx - canvasX * newScale;
        let newY = my - canvasY * newScale;

        const containerWidth = containerRect.width;
        const containerHeight = containerRect.height;
        const res = RESOLUTIONS[currentSettings.aspectRatio] || { width: 3, height: 4 };
        const baseHeight = (res.height / res.width) * baseWidth;
        const canvasW = baseWidth * newScale;
        const canvasH = baseHeight * newScale;

        const minOverlap = Math.min(150, Math.min(canvasW, canvasH) * 0.3);
        const minX = minOverlap - canvasW;
        const maxX = containerWidth - minOverlap;
        const minY = minOverlap - canvasH;
        const maxY = containerHeight - minOverlap;

        newX = Math.max(minX, Math.min(newX, maxX));
        newY = Math.max(minY, Math.min(newY, maxY));

        return { x: newX, y: newY, scale: newScale };
      });

      setIsFit(false);
    };

    container.addEventListener('wheel', handleWheelRaw, { passive: false });
    return () => container.removeEventListener('wheel', handleWheelRaw);
  }, []);

  // Multi-touch gestures (Pinch-to-zoom & Single-finger pan) for Mobile/Tablets
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isTouchZooming = false;
    let initialTouchDist = 0;
    let initialTouchScale = 1;
    let canvasStartPoints = { x: 0, y: 0 };

    const handleTouchStartRaw = (e) => {
      if (e.touches.length === 1) {
        // Single finger panning
        const touch = e.touches[0];
        setIsDragging(true);
        dragStartRef.current = {
          x: touch.clientX,
          y: touch.clientY,
          tx: stateRef.current.transform.x,
          ty: stateRef.current.transform.y,
        };
        isTouchZooming = false;
      } else if (e.touches.length === 2) {
        // Two-finger pinch zooming
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        initialTouchDist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
        initialTouchScale = stateRef.current.transform.scale;

        const containerRect = container.getBoundingClientRect();
        const mx = ((touch1.clientX + touch2.clientX) / 2) - containerRect.left;
        const my = ((touch1.clientY + touch2.clientY) / 2) - containerRect.top;
        
        canvasStartPoints = {
          x: (mx - stateRef.current.transform.x) / initialTouchScale,
          y: (my - stateRef.current.transform.y) / initialTouchScale,
        };
        
        isTouchZooming = true;
        setIsDragging(false); // Disable panning style offset during zooming
      }
    };

    const handleTouchMoveRaw = (e) => {
      const { settings: currentSettings } = stateRef.current;
      const containerRect = container.getBoundingClientRect();

      if (e.touches.length === 1 && !isTouchZooming) {
        // Handle single finger panning
        const touch = e.touches[0];
        const dx = touch.clientX - dragStartRef.current.x;
        const dy = touch.clientY - dragStartRef.current.y;

        let newX = dragStartRef.current.tx + dx;
        let newY = dragStartRef.current.ty + dy;

        const containerWidth = containerRect.width;
        const containerHeight = containerRect.height;
        const res = RESOLUTIONS[currentSettings.aspectRatio] || { width: 3, height: 4 };
        const baseHeight = (res.height / res.width) * baseWidth;
        const canvasW = baseWidth * stateRef.current.transform.scale;
        const canvasH = baseHeight * stateRef.current.transform.scale;

        const minOverlap = Math.min(150, Math.min(canvasW, canvasH) * 0.3);
        const minX = minOverlap - canvasW;
        const maxX = containerWidth - minOverlap;
        const minY = minOverlap - canvasH;
        const maxY = containerHeight - minOverlap;

        newX = Math.max(minX, Math.min(newX, maxX));
        newY = Math.max(minY, Math.min(newY, maxY));

        setTransform((prev) => ({ ...prev, x: newX, y: newY }));
        setIsFit(false);

        if (e.cancelable) e.preventDefault();
      } else if (e.touches.length === 2 && isTouchZooming) {
        // Handle dual finger pinch zoom
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);

        if (initialTouchDist > 0) {
          const factor = dist / initialTouchDist;
          let newScale = initialTouchScale * factor;
          newScale = Math.max(0.15, Math.min(newScale, 6.0));

          const mx = ((touch1.clientX + touch2.clientX) / 2) - containerRect.left;
          const my = ((touch1.clientY + touch2.clientY) / 2) - containerRect.top;

          let newX = mx - canvasStartPoints.x * newScale;
          let newY = my - canvasStartPoints.y * newScale;

          const containerWidth = containerRect.width;
          const containerHeight = containerRect.height;
          const res = RESOLUTIONS[currentSettings.aspectRatio] || { width: 3, height: 4 };
          const baseHeight = (res.height / res.width) * baseWidth;
          const canvasW = baseWidth * newScale;
          const canvasH = baseHeight * newScale;

          const minOverlap = Math.min(150, Math.min(canvasW, canvasH) * 0.3);
          const minX = minOverlap - canvasW;
          const maxX = containerWidth - minOverlap;
          const minY = minOverlap - canvasH;
          const maxY = containerHeight - minOverlap;

          newX = Math.max(minX, Math.min(newX, maxX));
          newY = Math.max(minY, Math.min(newY, maxY));

          setTransform({ x: newX, y: newY, scale: newScale });
          setIsFit(false);
        }

        if (e.cancelable) e.preventDefault();
      }
    };

    const handleTouchEndRaw = () => {
      setIsDragging(false);
      isTouchZooming = false;
    };

    container.addEventListener('touchstart', handleTouchStartRaw, { passive: false });
    container.addEventListener('touchmove', handleTouchMoveRaw, { passive: false });
    container.addEventListener('touchend', handleTouchEndRaw, { passive: false });
    container.addEventListener('touchcancel', handleTouchEndRaw, { passive: false });

    return () => {
      container.removeEventListener('touchstart', handleTouchStartRaw);
      container.removeEventListener('touchmove', handleTouchMoveRaw);
      container.removeEventListener('touchend', handleTouchEndRaw);
      container.removeEventListener('touchcancel', handleTouchEndRaw);
    };
  }, []);

  const handleMouseDown = (e) => {
    // Support left-click (0) or middle-click (1)
    if (e.button !== 0 && e.button !== 1) return;

    // Prevent default browser autoscroll overlay on middle click
    if (e.button === 1) {
      e.preventDefault();
    }

    if (!containerRef.current) return;

    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      tx: transform.x,
      ty: transform.y,
    };
  };

  // Dragging / Panning effect
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      const { transform: currentTransform, settings: currentSettings } = stateRef.current;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;

      let newX = dragStartRef.current.tx + dx;
      let newY = dragStartRef.current.ty + dy;

      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const containerHeight = containerRect.height;

      const res = RESOLUTIONS[currentSettings.aspectRatio] || { width: 3, height: 4 };
      const baseHeight = (res.height / res.width) * baseWidth;
      const canvasW = baseWidth * currentTransform.scale;
      const canvasH = baseHeight * currentTransform.scale;

      const minOverlap = Math.min(150, Math.min(canvasW, canvasH) * 0.3);
      const minX = minOverlap - canvasW;
      const maxX = containerWidth - minOverlap;
      const minY = minOverlap - canvasH;
      const maxY = containerHeight - minOverlap;

      newX = Math.max(minX, Math.min(newX, maxX));
      newY = Math.max(minY, Math.min(newY, maxY));

      setTransform((prev) => ({ ...prev, x: newX, y: newY }));
      setIsFit(false);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleZoomChange = (e) => {
    const val = e.target.value;
    if (val === 'fit') {
      setIsFit(true);
    } else {
      setIsFit(false);
      const targetScale = parseFloat(val);
      setTransform((prev) => zoomToScaleCentered(targetScale, prev));
    }
  };

  const handleZoomIn = () => {
    setIsFit(false);
    setTransform((prev) => zoomToScaleCentered(prev.scale + 0.1, prev));
  };

  const handleZoomOut = () => {
    setIsFit(false);
    setTransform((prev) => zoomToScaleCentered(prev.scale - 0.1, prev));
  };

  const dropdownValue = isFit ? 'fit' : transform.scale.toFixed(2);

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
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  return (
    <div className="workspace">
      <div 
        className="poster-container" 
        ref={containerRef}
        style={containerStyle}
        onMouseDown={handleMouseDown}
      >
        <canvas 
          id="poster-canvas" 
          className="poster-canvas-preview" 
          ref={canvasRef} 
          style={canvasStyle}
        />
      </div>

      {/* Interactive macOS-style timeline trim view */}
      {settings.extractedFrames.length > 0 && settings.videoDuration > 0 && (
        <div className="timeline-bar">
          <div className="timeline-info">
            <span>TRIM VIDEO: <span className="timeline-info-span">{clipStart.toFixed(1)}s - {clipEnd.toFixed(1)}s</span></span>
            <span>DURATION: <span className="timeline-info-span">{(clipEnd - clipStart).toFixed(1)}s</span></span>
          </div>

          <div className="trim-track-wrapper" ref={trackRef}>
            {/* Filmstrip Background */}
            <div className="trim-filmstrip">
              {filmstripFrames.map((f, index) => (
                <div key={index} className="trim-filmstrip-thumb">
                  <FilmstripThumb canvas={f.canvas} />
                </div>
              ))}
            </div>

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
          </div>
        </div>
      )}

      {/* Floating Zoom Controls Bar */}
      {settings.extractedFrames.length > 0 && (
        <div className="zoom-bar">
          <button 
            type="button" 
            className="zoom-btn" 
            onClick={handleZoomOut} 
            title="Zoom Out (Ctrl + -)"
            disabled={!isFit && transform.scale <= 0.15}
          >
            −
          </button>
          
          <select 
            className="zoom-select" 
            value={dropdownValue} 
            onChange={handleZoomChange}
            aria-label="Select zoom level"
          >
            <option value="fit">Fit</option>
            <option value="0.25">25%</option>
            <option value="0.50">50%</option>
            <option value="0.75">75%</option>
            <option value="1.00">100%</option>
            <option value="1.25">125%</option>
            <option value="1.50">150%</option>
            <option value="2.00">200%</option>
            <option value="3.00">300%</option>
            
            {!isFit && !['0.25', '0.50', '0.75', '1.00', '1.25', '1.50', '2.00', '3.00'].includes(transform.scale.toFixed(2)) && (
              <option value={transform.scale.toFixed(2)}>{Math.round(transform.scale * 100)}%</option>
            )}
          </select>

          <button 
            type="button" 
            className="zoom-btn" 
            onClick={handleZoomIn} 
            title="Zoom In (Ctrl + =)"
            disabled={!isFit && transform.scale >= 6.0}
          >
            ＋
          </button>
        </div>
      )}
    </div>
  );
}