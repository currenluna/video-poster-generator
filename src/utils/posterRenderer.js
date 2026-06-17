/**
 * posterRenderer.js — Canvas drawing logic for the poster.
 *
 * 💡 Svelte comparison: Just another plain .js module. The drawPoster function
 *    takes a <canvas> element and draws onto it imperatively — this is the same
 *    in any framework because the Canvas API is always imperative.
 */

import { RESOLUTIONS } from './constants';

// ---------------------------------------------------------------------------
// Optimal Grid Layout Solver
// ---------------------------------------------------------------------------
/**
 * Finds the best column count that maximizes thumbnail size within the
 * target print area. Tests every possible column count from 1 to N.
 *
 * @param {number} N            — total number of frames
 * @param {number} frameWidth   — original video width
 * @param {number} frameHeight  — original video height
 * @param {number} targetWidth  — available grid width in pixels
 * @param {number} targetHeight — available grid height in pixels
 * @param {number} gap          — gap between frames in pixels
 * @returns {{ columns, rows, frameWidth, frameHeight }}
 */
export function solveOptimalLayout(N, frameWidth, frameHeight, targetWidth, targetHeight, gap) {
  const frameAspect = frameWidth / frameHeight;
  let bestColumns = 1;
  let bestScale = 0;

  for (let C = 1; C <= N; C++) {
    const R = Math.ceil(N / C);

    // How wide can each thumbnail be to fit C columns?
    const maxSWidth = (targetWidth - (C - 1) * gap) / C;
    // How wide can each thumbnail be to fit R rows (given aspect ratio)?
    const maxSHeight = ((targetHeight - (R - 1) * gap) * frameAspect) / R;

    const s = Math.min(maxSWidth, maxSHeight);

    if (s > 0 && s > bestScale) {
      bestScale = s;
      bestColumns = C;
    }
  }

  return {
    columns: bestColumns,
    rows: Math.ceil(N / bestColumns),
    frameWidth: bestScale,
    frameHeight: bestScale / frameAspect,
  };
}

// ---------------------------------------------------------------------------
// Poster Drawing
// ---------------------------------------------------------------------------
/**
 * Draws the complete poster onto the given canvas element at full print
 * resolution. This is called every time a setting changes.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {Object} settings — all the values needed to render the poster
 */
export function drawPoster(canvas, {
  extractedFrames, aspectRatio, matteMargin, gapSize,
  layoutMode, manualColumns, colorMode, labelType,
  videoWidth, videoHeight, videoDuration,
  captureMode, captureValue, customMeta,
}) {
  const res = RESOLUTIONS[aspectRatio];

  // Set canvas to full print resolution
  canvas.width = res.width;
  canvas.height = res.height;
  canvas.style.aspectRatio = `${res.width} / ${res.height}`;

  const ctx = canvas.getContext('2d');

  // 1. White background (the "paper")
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, res.width, res.height);

  const N = extractedFrames.length;
  if (N === 0) return;

  // 2. Calculate matte (border) dimensions
  const marginPercent = matteMargin / 100;
  const marginX = res.width * marginPercent;
  const marginY = res.height * marginPercent;
  const printWidth = res.width - 2 * marginX;
  const printHeight = res.height - 2 * marginY;

  // Reserve bottom 5% of printable area for metadata text
  const typoSpaceHeight = printHeight * 0.05;
  const targetGridWidth = printWidth;
  const targetGridHeight = printHeight - typoSpaceHeight;

  // Scale UI gap values to high-res canvas (reference: 800px screen width)
  const scaleRatio = res.width / 800;
  const scaledGap = gapSize * scaleRatio;

  // 3. Compute grid layout
  const videoAspect = videoWidth / videoHeight;
  let layout;

  if (layoutMode === 'auto') {
    layout = solveOptimalLayout(N, videoWidth, videoHeight, targetGridWidth, targetGridHeight, scaledGap);
  } else {
    // Manual column count
    const cols = manualColumns;
    const rows = Math.ceil(N / cols);
    const maxSWidth = (targetGridWidth - (cols - 1) * scaledGap) / cols;
    const maxSHeight = ((targetGridHeight - (rows - 1) * scaledGap) * videoAspect) / rows;
    const s = Math.min(maxSWidth, maxSHeight);
    layout = { columns: cols, rows, frameWidth: s, frameHeight: s / videoAspect };
  }

  // Compute final grid size and position (centered)
  const gridW = layout.columns * layout.frameWidth + (layout.columns - 1) * scaledGap;
  const gridH = layout.rows * layout.frameHeight + (layout.rows - 1) * scaledGap;
  const gridX = marginX + (printWidth - gridW) / 2;
  const gridY = marginY + (targetGridHeight - gridH) / 2;

  // 4. Black grid background
  ctx.fillStyle = '#000000';
  ctx.fillRect(gridX, gridY, gridW, gridH);

  // 5. Draw each frame thumbnail
  ctx.save();
  ctx.filter = colorMode === 'bw' ? 'grayscale(100%)' : 'none';

  for (let i = 0; i < N; i++) {
    const frame = extractedFrames[i];
    const r = Math.floor(i / layout.columns);
    const c = i % layout.columns;
    const x = gridX + c * (layout.frameWidth + scaledGap);
    const y = gridY + r * (layout.frameHeight + scaledGap);
    ctx.drawImage(frame.canvas, x, y, layout.frameWidth, layout.frameHeight);
  }

  ctx.restore();

  // 6. Draw borders (Muybridge chronophotography style)
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = Math.max(3, Math.round(2.5 * scaleRatio));
  ctx.lineJoin = 'miter';
  ctx.strokeRect(gridX, gridY, gridW, gridH);

  ctx.lineWidth = Math.max(1, Math.round(1.0 * scaleRatio));
  const fontMono = "'Space Mono', monospace";

  for (let i = 0; i < N; i++) {
    const frame = extractedFrames[i];
    const r = Math.floor(i / layout.columns);
    const c = i % layout.columns;
    const x = gridX + c * (layout.frameWidth + scaledGap);
    const y = gridY + r * (layout.frameHeight + scaledGap);

    ctx.strokeRect(x, y, layout.frameWidth, layout.frameHeight);

    // Frame label (index number or timestamp)
    if (labelType !== 'none') {
      const text = labelType === 'seq'
        ? `${i + 1}`
        : labelType === 'index'
        ? `${frame.frameIndex}`
        : `${frame.timestamp.toFixed(2)}S`;

      const fontSize = Math.max(9, Math.round(7.5 * scaleRatio));
      ctx.font = `${fontSize}px ${fontMono}`;
      const padding = Math.round(3 * scaleRatio);
      const textW = ctx.measureText(text).width;

      // White label background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fillRect(x + padding, y + padding, textW + padding * 2, fontSize + padding * 2);

      // Label text
      ctx.fillStyle = '#000000';
      ctx.fillText(text, x + padding * 2, y + padding * 2 + fontSize - padding * 0.5);
    }
  }

  // 7. Footer metadata text
  const metaFontSize = Math.round(8 * scaleRatio);
  ctx.font = `normal 400 ${metaFontSize}px ${fontMono}`;
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';

  const typoStartY = marginY + targetGridHeight + typoSpaceHeight * 0.5 + metaFontSize * 0.3;
  const separator = '   |   ';
  const durationText = `DURATION: ${videoDuration.toFixed(1)}S`;
  const rateText = `CAPTURE INTERVAL: ${captureMode === 'seconds' ? captureValue.toFixed(1) + 'S' : captureValue + 'F'}`;
  const sourceText = customMeta ? `SOURCE: ${customMeta}` : '';

  const parts = [durationText, rateText];
  if (sourceText) parts.unshift(sourceText);

  ctx.fillText(parts.join(separator), res.width / 2, typoStartY);
}