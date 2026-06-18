/**
 * posterRenderer.js — Canvas drawing logic for layout styles.
 */

import { RESOLUTIONS } from './constants';

// Curated designer grid color options with readable matching text colors
const GRID_COLORS = {
  white: { color: '#ffffff', textColor: '#121212' },
  cream: { color: '#f5f2eb', textColor: '#5d5a52' },
  gray: { color: '#8e9399', textColor: '#222222' },
  black: { color: '#121212', textColor: '#ffffff' },
  olive: { color: '#4a5340', textColor: '#ffffff' },
  terracotta: { color: '#b06c51', textColor: '#ffffff' },
  navy: { color: '#1a2b3c', textColor: '#ffffff' },
};

// ---------------------------------------------------------------------------
// Seedable Deterministic Pseudo-Random Number Generator (PRNG)
// ---------------------------------------------------------------------------
function seedRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * Calculates randomized translation offset and scaling for a frame cell,
 * keeping the frame centered within the original layout bounds.
 */
function getFramePlacement(i, x, y, frameWidth, frameHeight, scaleRandomness, positionRandomness, scaleRatio, randomSeed = 1) {
  if (scaleRandomness === 0 && positionRandomness === 0) {
    return { x, y, w: frameWidth, h: frameHeight };
  }

  const seedOffset = randomSeed * 7919;
  const rScale = seedRandom(i + seedOffset);
  const rX = seedRandom(i + 100 + seedOffset);
  const rY = seedRandom(i + 200 + seedOffset);

  const scaleMult = 1.0 + (rScale - 0.5) * (scaleRandomness / 100);
  const w = frameWidth * scaleMult;
  const h = frameHeight * scaleMult;

  // Offset randomness is specified in screen px, scale it to print resolution
  const dx = (rX - 0.5) * 2 * (positionRandomness * scaleRatio);
  const dy = (rY - 0.5) * 2 * (positionRandomness * scaleRatio);

  const finalX = (x + frameWidth / 2) - w / 2 + dx;
  const finalY = (y + frameHeight / 2) - h / 2 + dy;

  return { x: finalX, y: finalY, w, h };
}

/**
 * Draws compact metadata label anchored to the top-right of a frame cell.
 * Two lines only: video source name and [frame number].
 * Font size scales relative to the individual frame width, not the global canvas.
 */
function drawCellMetadataText(ctx, frame, x, y, frameWidth, frameHeight, scaleRatio, gridTheme, videoName, drawOnSide) {
  const frameStr = String(frame.frameIndex || 0).padStart(4, '0');
  const cleanName = videoName.toUpperCase().replace(/\.[^/.]+$/, "");
  const textLines = [
    cleanName,
    `[${frameStr}]`
  ];

  // Size text relative to the frame cell (~3.5% of frame width), clamped to a sane range
  const fontSize = Math.max(6, Math.min(28, Math.round(frameWidth * 0.035)));
  const fontMono = "'Space Mono', monospace";
  ctx.font = `${fontSize}px ${fontMono}`;
  ctx.textBaseline = 'top';

  const lineSpacing = Math.round(fontSize * 1.2);
  const pad = Math.max(2, Math.round(frameWidth * 0.01));

  if (drawOnSide) {
    // Draw beside the image (grid-meta style) — anchor top-right of cell area
    ctx.textAlign = 'left';
    ctx.fillStyle = gridTheme.textColor || '#121212';
    const startX = x + frameWidth + pad;
    const startY = y + pad;
    textLines.forEach((line, idx) => {
      ctx.fillText(line, startX, startY + idx * lineSpacing);
    });
  } else {
    // Overlay anchored to top-right corner inside the frame
    ctx.textAlign = 'right';
    const textW = textLines.reduce((max, line) => Math.max(max, ctx.measureText(line).width), 0);
    const startX = x + frameWidth - pad;
    const startY = y + pad;

    // Subtle semi-transparent backing pill
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    const bgW = textW + pad * 2;
    const bgH = textLines.length * lineSpacing + pad * 2;
    ctx.fillRect(startX - textW - pad, startY - pad, bgW, bgH);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    textLines.forEach((line, idx) => {
      ctx.fillText(line, startX, startY + idx * lineSpacing);
    });
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Optimal Grid Layout Solver (Always Auto Columns now)
// ---------------------------------------------------------------------------
export function solveOptimalLayout(N, frameWidth, frameHeight, targetWidth, targetHeight, gap, aspectRatio) {
  const frameAspect = frameWidth / frameHeight;
  let bestColumns = 1;
  let bestScale = 0;
  let bestDiff = Infinity;
  let bestUsedGap = gap;

  let targetAspect = 1.0;
  if (aspectRatio === '27x36') {
    targetAspect = 3 / 4;
  } else if (aspectRatio === '36x27') {
    targetAspect = 4 / 3;
  } else if (aspectRatio === '24x24') {
    targetAspect = 1.0;
  }

  for (let C = 1; C <= N; C++) {
    const R = Math.floor(N / C);
    if (R === 0) continue;

    let localGap = gap;
    if (C > 1 && (C - 1) * localGap > targetWidth * 0.70) {
      localGap = (targetWidth * 0.4) / (C - 1);
    }
    if (R > 1 && (R - 1) * localGap > targetHeight * 0.70) {
      localGap = (targetHeight * 0.4) / (R - 1);
    }

    const maxSWidth = (targetWidth - (C - 1) * localGap) / C;
    const maxSHeight = ((targetHeight - (R - 1) * localGap) * frameAspect) / R;

    const s = Math.min(maxSWidth, maxSHeight);
    if (s <= 0) continue;

    const gridW = C * s + (C - 1) * localGap;
    const gridH = R * (s / frameAspect) + (R - 1) * localGap;
    const gridAspect = gridW / gridH;

    const diff = Math.abs(gridAspect - targetAspect);

    if (diff < bestDiff || (Math.abs(diff - bestDiff) < 0.001 && s > bestScale)) {
      bestDiff = diff;
      bestScale = s;
      bestColumns = C;
      bestUsedGap = localGap;
    }
  }

  const finalRows = Math.floor(N / bestColumns);

  return {
    columns: bestColumns,
    rows: finalRows > 0 ? finalRows : 1,
    frameWidth: bestScale,
    frameHeight: bestScale / frameAspect,
    usedGap: bestUsedGap,
  };
}

// ---------------------------------------------------------------------------
// Poster Drawing Router
// ---------------------------------------------------------------------------
export function drawPoster(canvas, {
  extractedFrames, aspectRatio, matteMargin, gapSize,
  layoutMode = 'auto', manualColumns = 4, colorMode = 'color',
  videoWidth, videoHeight, videoDuration,
  scaleRandomness = 0, positionRandomness = 0,
  rotationRandomness = 0, alternateMirror = false,
  paperColor = 'white',
  styleMode = 'grid-meta',
  ringRotation = 0,
  ringTiltX = -45,
  ringTiltY = 0,
  zoomFocusIndex = 0,
  zoomLevel = 1.6,
  showCellMetadata = true,
  videoName = 'STUDIO_CLIP',
  videoFps = 30,
  showGridBackground = true,
  randomSeed = 1,
  isExport = false,
}) {
  const res = RESOLUTIONS[aspectRatio];

  // Scale down the canvas dimensions for real-time preview performance
  const targetWidth = isExport ? res.width : Math.round(res.width / 5);
  const targetHeight = isExport ? res.height : Math.round(res.height / 5);

  canvas.width = targetWidth;
  canvas.height = targetHeight;
  canvas.style.aspectRatio = `${res.width} / ${res.height}`;

  const ctx = canvas.getContext('2d');
  const gridTheme = GRID_COLORS[paperColor] || GRID_COLORS['white'];

  // Fill background with paper color
  ctx.fillStyle = gridTheme.color;
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  const N = extractedFrames.length;
  if (N === 0) return;

  const scaleRatio = targetWidth / 800;
  const scaledGap = gapSize * scaleRatio;

  const marginPercent = matteMargin / 100;
  const marginX = targetWidth * marginPercent;
  const marginY = targetHeight * marginPercent;
  const printWidth = targetWidth - 2 * marginX;
  const printHeight = targetHeight - 2 * marginY;

  const videoAspect = videoWidth / videoHeight;

  // ---------------------------------------------------------------------------
  // LAYOUT MODE: GRID WITH METADATA NEXT TO CELLS
  // ---------------------------------------------------------------------------
  if (styleMode === 'grid-meta') {
    const layout = solveOptimalLayout(N, videoWidth, videoHeight, printWidth, printHeight, scaledGap, aspectRatio);

    const gridW = layout.columns * layout.frameWidth + (layout.columns - 1) * layout.usedGap;
    const gridH = layout.rows * layout.frameHeight + (layout.rows - 1) * layout.usedGap;
    const gridX = marginX + (printWidth - gridW) / 2;
    const gridY = marginY + (printHeight - gridH) / 2;

    if (showGridBackground) {
      ctx.fillStyle = gridTheme.color;
      ctx.fillRect(gridX, gridY, gridW, gridH);
      ctx.strokeStyle = gridTheme.color;
      ctx.lineWidth = Math.max(3, Math.round(2.5 * scaleRatio));
      ctx.strokeRect(gridX, gridY, gridW, gridH);
    }

    const totalDisplayFrames = layout.columns * layout.rows;
    for (let i = 0; i < totalDisplayFrames; i++) {
      const frame = extractedFrames[i];
      if (!frame) continue;

      const r = Math.floor(i / layout.columns);
      const c = i % layout.columns;
      const x = gridX + c * (layout.frameWidth + layout.usedGap);
      const y = gridY + r * (layout.frameHeight + layout.usedGap);

      // If cell metadata toggle is enabled, reserve 40% of cell width for the metadata text
      // Scale height proportionally to preserve original video aspect ratio
      const drawWidth = showCellMetadata ? layout.frameWidth * 0.6 : layout.frameWidth;
      const drawHeight = showCellMetadata ? drawWidth / videoAspect : layout.frameHeight;

      const placement = getFramePlacement(i, x, y, drawWidth, drawHeight, scaleRandomness, positionRandomness, scaleRatio, randomSeed);
      const cx = placement.x + placement.w / 2;
      const cy = placement.y + placement.h / 2;

      const seedOffset = randomSeed * 7919;
      const rotationRandomVal = seedRandom(i + 500 + seedOffset) - 0.5;
      const angleRad = (rotationRandomVal * 2) * (rotationRandomness * Math.PI / 180);
      const shouldMirror = alternateMirror && (i % 2 === 1);

      ctx.save();
      ctx.translate(cx, cy);
      if (rotationRandomness > 0) ctx.rotate(angleRad);
      if (shouldMirror) ctx.scale(-1, 1);

      ctx.filter = (colorMode === 'bw' || colorMode === 'pop' || colorMode === 'gradient') ? 'grayscale(100%)' : 'none';
      ctx.drawImage(frame.canvas, -placement.w / 2, -placement.h / 2, placement.w, placement.h);

      if (colorMode === 'pop') {
        ctx.filter = 'none';
        const hue = Math.round((i * (360 / totalDisplayFrames)) % 360);
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = `hsla(${hue}, 85%, 60%, 1)`;
        ctx.fillRect(-placement.w / 2, -placement.h / 2, placement.w, placement.h);

        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = `hsla(${hue}, 85%, 25%, 0.45)`;
        ctx.fillRect(-placement.w / 2, -placement.h / 2, placement.w, placement.h);
      } else if (colorMode === 'gradient') {
        ctx.filter = 'none';
        const t = totalDisplayFrames > 1 ? i / (totalDisplayFrames - 1) : 0.5;
        const r = Math.round(20 + (245 - 20) * t);
        const g = Math.round(30 + (240 - 30) * t);
        const b = Math.round(48 + (230 - 48) * t);
        
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(-placement.w / 2, -placement.h / 2, placement.w, placement.h);

        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.25)`;
        ctx.fillRect(-placement.w / 2, -placement.h / 2, placement.w, placement.h);
      }

      // Draw photo border inside rotated context so it tilts together
      ctx.strokeStyle = gridTheme.color;
      ctx.lineWidth = Math.max(1, Math.round(1.0 * scaleRatio));
      ctx.strokeRect(-placement.w / 2, -placement.h / 2, placement.w, placement.h);
      
      ctx.restore();

      if (showCellMetadata) {
        drawCellMetadataText(ctx, frame, x, y, drawWidth, drawHeight, scaleRatio, gridTheme, videoName, true);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // LAYOUT MODE: ORBIT RING WITH 1:1 SQUARE CROPPED PHOTOS
  // ---------------------------------------------------------------------------
  else if (styleMode === 'orbit') {
    const cx = marginX + printWidth * 0.5;
    const cy = marginY + printHeight * 0.5;
    const R = printWidth * 0.33;

    // Convert tilt angles to radians
    const rotX = (ringTiltX * Math.PI) / 180;
    const rotY = (ringTiltY * Math.PI) / 180;
    const rotZ = (ringRotation * Math.PI) / 180;

    const D = printWidth * 1.0; // camera distance / perspective reference depth

    const orbitFrames = [];
    for (let i = 0; i < N; i++) {
      const t = i * (2 * Math.PI / N);
      
      const x = R * Math.cos(t);
      const y = R * Math.sin(t);
      const z = 0;

      // 3D rotations for the center point:
      // 1. Z rotation (roll)
      const cosZ = Math.cos(rotZ);
      const sinZ = Math.sin(rotZ);
      const x1 = x * cosZ - y * sinZ;
      const y1 = x * sinZ + y * cosZ;
      const z1 = z;

      // 2. X rotation (pitch)
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const x2 = x1;
      const y2 = y1 * cosX - z1 * sinX;
      const z2 = y1 * sinX + z1 * cosX;

      // 3. Y rotation (yaw)
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const x3 = x2 * cosY + z2 * sinY;
      const y3 = y2;
      const z3 = -x2 * sinY + z2 * cosY;

      // Project center using perspective
      const perspectiveFactor = D / (D - z3);
      const px = cx + x3 * perspectiveFactor;
      const py = cy + y3 * perspectiveFactor;

      // Local orientation vectors of the photo plane:
      // U: Horizontal axis (along the circle tangent)
      const ux = -Math.sin(t);
      const uy = Math.cos(t);
      const uz = 0;

      // V: Vertical axis (standing vertically along circle's Z axis, pointing down for canvas alignment)
      const vx = 0;
      const vy = 0;
      const vz = -1;

      // Rotate U (tangent) vector:
      const ux1 = ux * cosZ - uy * sinZ;
      const uy1 = ux * sinZ + uy * cosZ;
      const uz1 = uz;

      const ux2 = ux1;
      const uy2 = uy1 * cosX - uz1 * sinX;
      const uz2 = uy1 * sinX + uz1 * cosX;

      const ux3 = ux2 * cosY + uz2 * sinY;
      const uy3 = uy2;
      const uz3 = -ux2 * sinY + uz2 * cosY;

      // Rotate V (vertical) vector:
      const vx1 = vx * cosZ - vy * sinZ;
      const vy1 = vx * sinZ + vy * cosZ;
      const vz1 = vz;

      const vx2 = vx1;
      const vy2 = vy1 * cosX - vz1 * sinX;
      const vz2 = vy1 * sinX + vz1 * cosX;

      const vx3 = vx2 * cosY + vz2 * sinY;
      const vy3 = vy2;
      const vz3 = -vx2 * sinY + vz2 * cosY;

      const baseW = printWidth * 0.15;
      const halfW = baseW / 2;
      const halfH = baseW / 2;

      // Right endpoint point in 3D
      const rx3 = x3 + halfW * ux3;
      const ry3 = y3 + halfW * uy3;
      const rz3 = z3 + halfW * uz3;
      const rFactor = D / (D - rz3);
      const rpx = cx + rx3 * rFactor;
      const rpy = cy + ry3 * rFactor;

      // Top endpoint point in 3D
      const tx3 = x3 + halfH * vx3;
      const ty3 = y3 + halfH * vy3;
      const tz3 = z3 + halfH * vz3;
      const tFactor = D / (D - tz3);
      const tpx = cx + tx3 * tFactor;
      const tpy = cy + ty3 * tFactor;

      // Compute screen vectors relative to the projected center
      const dx = { x: rpx - px, y: rpy - py };
      const dy = { x: tpx - px, y: tpy - py };

      orbitFrames.push({
        frame: extractedFrames[i],
        index: i,
        px,
        py,
        dx,
        dy,
        halfW,
        halfH,
        baseW,
        depth: z3,
        perspectiveFactor
      });
    }

    // Sort by depth (farthest z3 drawn first)
    orbitFrames.sort((a, b) => a.depth - b.depth);

    orbitFrames.forEach(({ frame, index, px, py, dx, dy, halfW, halfH, baseW, perspectiveFactor }) => {
      const seedOffset = randomSeed * 7919;
      // Position offset
      const posXOffset = positionRandomness > 0 ? (seedRandom(index + 100 + seedOffset) - 0.5) * positionRandomness * scaleRatio : 0;
      const posYOffset = positionRandomness > 0 ? (seedRandom(index + 200 + seedOffset) - 0.5) * positionRandomness * scaleRatio : 0;
      
      // Scale multiplier
      const scaleRandomVal = scaleRandomness > 0 ? 1.0 + (seedRandom(index + 300 + seedOffset) - 0.5) * (scaleRandomness / 100) : 1.0;
      
      // Rotation angle
      const rotationRandomVal = seedRandom(index + 500 + seedOffset) - 0.5;
      const angleRad = (rotationRandomVal * 2) * (rotationRandomness * Math.PI / 180);
      const shouldMirror = alternateMirror && (index % 2 === 1);

      const cellCx = px + posXOffset;
      const cellCy = py + posYOffset;

      const tDxX = dx.x * scaleRandomVal;
      const tDxY = dx.y * scaleRandomVal;
      const tDyX = dy.x * scaleRandomVal;
      const tDyY = dy.y * scaleRandomVal;

      ctx.save();
      ctx.translate(cellCx, cellCy);
      
      // Apply the 3D rotation projection transform matrix
      const a = tDxX / halfW;
      const b = tDxY / halfW;
      const c = tDyX / halfH;
      const d = tDyY / halfH;
      ctx.transform(a, b, c, d, 0, 0);

      if (rotationRandomness > 0) ctx.rotate(angleRad);
      if (shouldMirror) ctx.scale(-1, 1);

      ctx.filter = (colorMode === 'bw' || colorMode === 'pop' || colorMode === 'gradient') ? 'grayscale(100%)' : 'none';
      
      // Perform center-cropping to a 1:1 square
      const srcW = frame.canvas.width;
      const srcH = frame.canvas.height;
      const cropSize = Math.min(srcW, srcH);
      const sx = (srcW - cropSize) / 2;
      const sy = (srcH - cropSize) / 2;

      ctx.drawImage(
        frame.canvas,
        sx, sy, cropSize, cropSize,
        -baseW / 2, -baseW / 2, baseW, baseW
      );

      if (colorMode === 'pop') {
        ctx.filter = 'none';
        const hue = Math.round((index * (360 / N)) % 360);
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = `hsla(${hue}, 85%, 60%, 1)`;
        ctx.fillRect(-baseW / 2, -baseW / 2, baseW, baseW);

        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = `hsla(${hue}, 85%, 25%, 0.45)`;
        ctx.fillRect(-baseW / 2, -baseW / 2, baseW, baseW);
      } else if (colorMode === 'gradient') {
        ctx.filter = 'none';
        const t = N > 1 ? index / (N - 1) : 0.5;
        const r = Math.round(20 + (245 - 20) * t);
        const g = Math.round(30 + (240 - 30) * t);
        const b = Math.round(48 + (230 - 48) * t);
        
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(-baseW / 2, -baseW / 2, baseW, baseW);

        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.25)`;
        ctx.fillRect(-baseW / 2, -baseW / 2, baseW, baseW);
      }

      // Draw border inside rotated context
      ctx.strokeStyle = gridTheme.color;
      ctx.lineWidth = Math.max(1, Math.round(1.0 * scaleRatio));
      ctx.strokeRect(-baseW / 2, -baseW / 2, baseW, baseW);

      ctx.restore();

      if (showCellMetadata) {
        const flatW = baseW * perspectiveFactor * scaleRandomVal;
        const flatH = flatW;
        drawCellMetadataText(ctx, frame, cellCx - flatW / 2, cellCy - flatH / 2, flatW, flatH, scaleRatio, gridTheme, videoName, false);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // LAYOUT MODE: ZOOM ON FOCUS FRAME (BLENDER PROPORTIONAL STYLE)
  // ---------------------------------------------------------------------------
  else if (styleMode === 'zoom') {
    // Use a zero-gap grid layout: all cells share edges, no spacing
    const layout = solveOptimalLayout(N, videoWidth, videoHeight, printWidth, printHeight, 0, aspectRatio);

    const gridW = layout.columns * layout.frameWidth;
    const gridH = layout.rows * layout.frameHeight;
    const gridX = marginX + (printWidth - gridW) / 2;
    const gridY = marginY + (printHeight - gridH) / 2;

    const focus = Math.max(0, Math.min(zoomFocusIndex, N - 1));
    const focusCol = focus % layout.columns;
    const focusRow = Math.floor(focus / layout.columns);

    const zoomCells = [];
    const totalDisplayFrames = layout.columns * layout.rows;
    for (let i = 0; i < totalDisplayFrames; i++) {
      const frame = extractedFrames[i];
      if (!frame) continue;

      const r = Math.floor(i / layout.columns);
      const c = i % layout.columns;
      const x = gridX + c * layout.frameWidth;
      const y = gridY + r * layout.frameHeight;

      const dist = Math.sqrt((c - focusCol) ** 2 + (r - focusRow) ** 2);
      
      const sigma = 1.3;
      const falloff = Math.exp(- (dist ** 2) / (2 * (sigma ** 2)));
      const scaleFactor = 1.0 + zoomLevel * falloff;

      const w = layout.frameWidth * scaleFactor;
      const h = layout.frameHeight * scaleFactor;

      const cx = x + layout.frameWidth / 2;
      const cy = y + layout.frameHeight / 2;

      zoomCells.push({
        frame,
        index: i,
        cx,
        cy,
        w,
        h,
        dist,
        scaleFactor
      });
    }

    // Sort farthest first (painter's algorithm)
    zoomCells.sort((a, b) => b.dist - a.dist);

    // Clip all rendering to the grid rectangle so no cell overflows
    ctx.save();
    ctx.beginPath();
    ctx.rect(gridX, gridY, gridW, gridH);
    ctx.clip();

    zoomCells.forEach(({ frame, index, cx, cy, w, h }) => {
      ctx.save();
      ctx.filter = (colorMode === 'bw' || colorMode === 'pop' || colorMode === 'gradient') ? 'grayscale(100%)' : 'none';
      ctx.drawImage(frame.canvas, cx - w / 2, cy - h / 2, w, h);

      if (colorMode === 'pop') {
        ctx.filter = 'none';
        const hue = Math.round((index * (360 / N)) % 360);
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = `hsla(${hue}, 85%, 60%, 1)`;
        ctx.fillRect(cx - w / 2, cy - h / 2, w, h);

        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = `hsla(${hue}, 85%, 25%, 0.45)`;
        ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
      } else if (colorMode === 'gradient') {
        ctx.filter = 'none';
        const t = N > 1 ? index / (N - 1) : 0.5;
        const r = Math.round(20 + (245 - 20) * t);
        const g = Math.round(30 + (240 - 30) * t);
        const b = Math.round(48 + (230 - 48) * t);
        
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(cx - w / 2, cy - h / 2, w, h);

        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.25)`;
        ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
      }
      ctx.restore();
    });

    // Restore clip region
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // LAYOUT MODE: PROGRESSIVE ROW SCALING (VERTICAL) — OPTIMIZED ASPECT RATIO
  // ---------------------------------------------------------------------------
  else if (styleMode === 'prog-vert') {
    const numRows = 4;
    const weights = [2.5, 2.0, 1.5, 1.0]; // Less drastic size difference
    const totalWeight = weights.reduce((a, b) => a + b, 0);

    const rowCounts = weights.map(w => Math.round(N * w / totalWeight));
    const sumCounts = rowCounts.reduce((a, b) => a + b, 0);
    rowCounts[numRows - 1] += (N - sumCounts);

    const rows = [];
    let frameIdx = 0;
    for (let r = 0; r < numRows; r++) {
      const count = rowCounts[r] || 0;
      const rowFrames = [];
      for (let j = 0; j < count; j++) {
        if (frameIdx < N) rowFrames.push(extractedFrames[frameIdx++]);
      }
      if (rowFrames.length > 0) rows.push(rowFrames);
    }

    const rowHeights = rows.map(rowFrames => {
      const K = rowFrames.length;
      const w = printWidth / K;
      return w / videoAspect;
    });
    const totalH = rowHeights.reduce((a, b) => a + b, 0);

    // Solve scaling factor to fit block completely inside margins matching paper shape
    const scaleFactor = Math.min(1.0, printHeight / totalH);
    const scaledWidth = printWidth * scaleFactor;
    const scaledHeight = totalH * scaleFactor;

    const startX = marginX + (printWidth - scaledWidth) / 2;
    const startY = marginY + (printHeight - scaledHeight) / 2;
    let currentY = startY;

    rows.forEach((rowFrames, r) => {
      const h = rowHeights[r] * scaleFactor;
      const K = rowFrames.length;
      const w = scaledWidth / K;

      rowFrames.forEach((frame, idx) => {
        const x = startX + idx * w;
        const y = currentY;

        ctx.save();
        ctx.filter = (colorMode === 'bw' || colorMode === 'pop' || colorMode === 'gradient') ? 'grayscale(100%)' : 'none';
        ctx.drawImage(frame.canvas, x, y, w, h);

        if (colorMode === 'pop') {
          ctx.filter = 'none';
          const globalIdx = extractedFrames.indexOf(frame);
          const hue = Math.round((globalIdx * (360 / N)) % 360);
          ctx.globalCompositeOperation = 'multiply';
          ctx.fillStyle = `hsla(${hue}, 85%, 60%, 1)`;
          ctx.fillRect(x, y, w, h);

          ctx.globalCompositeOperation = 'screen';
          ctx.fillStyle = `hsla(${hue}, 85%, 25%, 0.45)`;
          ctx.fillRect(x, y, w, h);
        } else if (colorMode === 'gradient') {
          ctx.filter = 'none';
          const globalIdx = extractedFrames.indexOf(frame);
          const t = N > 1 ? globalIdx / (N - 1) : 0.5;
          const rVal = Math.round(20 + (245 - 20) * t);
          const gVal = Math.round(30 + (240 - 30) * t);
          const bVal = Math.round(48 + (230 - 48) * t);
          
          ctx.globalCompositeOperation = 'multiply';
          ctx.fillStyle = `rgb(${rVal}, ${gVal}, ${bVal})`;
          ctx.fillRect(x, y, w, h);

          ctx.globalCompositeOperation = 'screen';
          ctx.fillStyle = `rgba(${rVal}, ${gVal}, ${bVal}, 0.25)`;
          ctx.fillRect(x, y, w, h);
        }
        ctx.restore();

        ctx.strokeStyle = gridTheme.color;
        ctx.lineWidth = Math.max(1, Math.round(1 * scaleRatio));
        ctx.strokeRect(x, y, w, h);

        if (showCellMetadata) {
          drawCellMetadataText(ctx, frame, x, y, w, h, scaleRatio, gridTheme, videoName, false);
        }
      });

      currentY += h;
    });
  }

  // ---------------------------------------------------------------------------
  // LAYOUT MODE: PROGRESSIVE COLUMN SCALING (HORIZONTAL) — OPTIMIZED ASPECT RATIO
  // ---------------------------------------------------------------------------
  else if (styleMode === 'prog-horiz') {
    const numCols = 4;
    const weights = [2.5, 2.0, 1.5, 1.0]; // Less drastic size difference
    const totalWeight = weights.reduce((a, b) => a + b, 0);

    const colCounts = weights.map(w => Math.round(N * w / totalWeight));
    const sumCounts = colCounts.reduce((a, b) => a + b, 0);
    colCounts[numCols - 1] += (N - sumCounts);

    const cols = [];
    let frameIdx = 0;
    for (let c = 0; c < numCols; c++) {
      const count = colCounts[c] || 0;
      const colFrames = [];
      for (let j = 0; j < count; j++) {
        if (frameIdx < N) colFrames.push(extractedFrames[frameIdx++]);
      }
      if (colFrames.length > 0) cols.push(colFrames);
    }

    const colWidths = cols.map(colFrames => {
      const K = colFrames.length;
      const h = printHeight / K;
      return h * videoAspect;
    });
    const totalW = colWidths.reduce((a, b) => a + b, 0);

    // Solve scaling factor to fit block completely inside margins matching paper shape
    const scaleFactor = Math.min(1.0, printWidth / totalW);
    const scaledWidth = totalW * scaleFactor;
    const scaledHeight = printHeight * scaleFactor;

    const startX = marginX + (printWidth - scaledWidth) / 2;
    const startY = marginY + (printHeight - scaledHeight) / 2;
    let currentX = startX;

    cols.forEach((colFrames, c) => {
      const w = colWidths[c] * scaleFactor;
      const K = colFrames.length;
      const h = scaledHeight / K;

      colFrames.forEach((frame, idx) => {
        const x = currentX;
        const y = startY + idx * h;

        ctx.save();
        ctx.filter = (colorMode === 'bw' || colorMode === 'pop' || colorMode === 'gradient') ? 'grayscale(100%)' : 'none';
        ctx.drawImage(frame.canvas, x, y, w, h);

        if (colorMode === 'pop') {
          ctx.filter = 'none';
          const globalIdx = extractedFrames.indexOf(frame);
          const hue = Math.round((globalIdx * (360 / N)) % 360);
          ctx.globalCompositeOperation = 'multiply';
          ctx.fillStyle = `hsla(${hue}, 85%, 60%, 1)`;
          ctx.fillRect(x, y, w, h);

          ctx.globalCompositeOperation = 'screen';
          ctx.fillStyle = `hsla(${hue}, 85%, 25%, 0.45)`;
          ctx.fillRect(x, y, w, h);
        } else if (colorMode === 'gradient') {
          ctx.filter = 'none';
          const globalIdx = extractedFrames.indexOf(frame);
          const t = N > 1 ? globalIdx / (N - 1) : 0.5;
          const rVal = Math.round(20 + (245 - 20) * t);
          const gVal = Math.round(30 + (240 - 30) * t);
          const bVal = Math.round(48 + (230 - 48) * t);
          
          ctx.globalCompositeOperation = 'multiply';
          ctx.fillStyle = `rgb(${rVal}, ${gVal}, ${bVal})`;
          ctx.fillRect(x, y, w, h);

          ctx.globalCompositeOperation = 'screen';
          ctx.fillStyle = `rgba(${rVal}, ${gVal}, ${bVal}, 0.25)`;
          ctx.fillRect(x, y, w, h);
        }
        ctx.restore();

        ctx.strokeStyle = gridTheme.color;
        ctx.lineWidth = Math.max(1, Math.round(1 * scaleRatio));
        ctx.strokeRect(x, y, w, h);

        if (showCellMetadata) {
          drawCellMetadataText(ctx, frame, x, y, w, h, scaleRatio, gridTheme, videoName, false);
        }
      });

      currentX += w;
    });
  }
}