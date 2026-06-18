import { useEffect, useRef, useState } from 'react';
import { drawPoster } from '../utils/posterRenderer';
import StatusBar from './StatusBar';

/**
 * PosterPreview — Renders the canvas and handles redrawing and zooming.
 *
 * 💡 Svelte comparison:
 *    Side effects on state changes:
 *      In Svelte: $: { if (canvasEl && settings) drawPoster(canvasEl, settings) }
 *      In React: useEffect(() => { drawPoster(canvasRef.current, settings) }, [settings, extractedFrames])
 */
export default function PosterPreview({ settings, statusText, statusType }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  
  const [zoom, setZoom] = useState(1.0);
  const [isFit, setIsFit] = useState(true);

  // Redraw the poster whenever any rendering setting or frames change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    drawPoster(canvas, settings);
  }, [
    settings.extractedFrames,
    settings.aspectRatio,
    settings.matteMargin,
    settings.gapSize,
    settings.layoutMode,
    settings.manualColumns,
    settings.colorMode,
    settings.labelType,
    settings.videoWidth,
    settings.videoHeight,
    settings.videoDuration,
    settings.captureMode,
    settings.captureValue,
    settings.customMeta,
  ]);

  // Keyboard shortcuts listener for Ctrl/Cmd + '-' or '+'
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          setIsFit(false);
          setZoom((prev) => Math.min(prev + 0.1, 3.0));
        } else if (e.key === '-') {
          e.preventDefault();
          setIsFit(false);
          setZoom((prev) => Math.max(prev - 0.1, 0.25));
        } else if (e.key === '0') {
          e.preventDefault();
          setIsFit(true);
          setZoom(1.0);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Zoom via mouse wheel with Ctrl/Cmd key
  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setIsFit(false);
      const zoomStep = 0.05;
      if (e.deltaY < 0) {
        setZoom((prev) => Math.min(prev + zoomStep, 3.0));
      } else {
        setZoom((prev) => Math.max(prev - zoomStep, 0.25));
      }
    }
  };

  const handleZoomChange = (e) => {
    const val = e.target.value;
    if (val === 'fit') {
      setIsFit(true);
      setZoom(1.0);
    } else {
      setIsFit(false);
      setZoom(parseFloat(val));
    }
  };

  const handleZoomIn = () => {
    setIsFit(false);
    setZoom((prev) => Math.min(prev + 0.1, 3.0));
  };

  const handleZoomOut = () => {
    setIsFit(false);
    setZoom((prev) => Math.max(prev - 0.1, 0.25));
  };

  // Determine the display value of the dropdown selector
  const dropdownValue = isFit ? 'fit' : zoom.toFixed(2);

  // Apply style dynamically to scale the canvas
  const canvasStyle = isFit
    ? {}
    : {
        width: `${zoom * 100}%`,
        maxWidth: 'none',
        maxHeight: 'none',
        height: 'auto',
      };

  return (
    <div className="workspace">
      <div 
        className="poster-container" 
        ref={containerRef}
        onWheel={handleWheel}
      >
        <canvas 
          id="poster-canvas" 
          className="poster-canvas-preview" 
          ref={canvasRef} 
          style={canvasStyle}
        />
      </div>

      {/* Floating Zoom Controls Bar */}
      {settings.extractedFrames.length > 0 && (
        <div className="zoom-bar">
          <button 
            type="button" 
            className="zoom-btn" 
            onClick={handleZoomOut} 
            title="Zoom Out (Ctrl + -)"
            disabled={!isFit && zoom <= 0.25}
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
            
            {!isFit && !['0.25', '0.50', '0.75', '1.00', '1.25', '1.50', '2.00', '3.00'].includes(zoom.toFixed(2)) && (
              <option value={zoom.toFixed(2)}>{Math.round(zoom * 100)}%</option>
            )}
          </select>

          <button 
            type="button" 
            className="zoom-btn" 
            onClick={handleZoomIn} 
            title="Zoom In (Ctrl + =)"
            disabled={!isFit && zoom >= 3.0}
          >
            ＋
          </button>
        </div>
      )}

      <StatusBar text={statusText} type={statusType} />
    </div>
  );
}