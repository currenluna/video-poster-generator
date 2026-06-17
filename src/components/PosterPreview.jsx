import { useEffect, useRef } from 'react';
import { drawPoster } from '../utils/posterRenderer';
import StatusBar from './StatusBar';

/**
 * PosterPreview — Renders the canvas and handles redrawing when state changes.
 *
 * 💡 Svelte comparison:
 *    Side effects on state changes:
 *      In Svelte: $: { if (canvasEl && settings) drawPoster(canvasEl, settings) }
 *      In React: useEffect(() => { drawPoster(canvasRef.current, settings) }, [settings, extractedFrames])
 *
 *    Vite dev server requirements:
 *      Vite serves files directly, but we need dynamic rendering and full print quality.
 */
export default function PosterPreview({ settings, statusText, statusType }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Redraw the poster whenever any rendering setting or frames change
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

  return (
    <div className="workspace">
      <div className="poster-container">
        <canvas id="poster-canvas" className="poster-canvas-preview" ref={canvasRef} />
      </div>
      <StatusBar text={statusText} type={statusType} />
    </div>
  );
}