/**
 * posterRenderer.js — Canvas drawing logic for layout styles.
 */

import { RESOLUTIONS, GRADIENT_TINTS } from './constants';

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

// ---------------------------------------------------------------------------
// 3D Math Helper: Apply Pitch, Yaw, and Roll Rotations to a Point
// ---------------------------------------------------------------------------
function rotate3DPoint(x, y, z, rotX, rotY, rotZ) {
  const cosZ = Math.cos(rotZ);
  const sinZ = Math.sin(rotZ);
  const x1 = x * cosZ - y * sinZ;
  const y1 = x * sinZ + y * cosZ;
  const z1 = z;

  const cosX = Math.cos(rotX);
  const sinX = Math.sin(rotX);
  const x2 = x1;
  const y2 = y1 * cosX - z1 * sinX;
  const z2 = y1 * sinX + z1 * cosX;

  const cosY = Math.cos(rotY);
  const sinY = Math.sin(rotY);
  const x3 = x2 * cosY + z2 * sinY;
  const y3 = y2;
  const z3 = -x2 * sinY + z2 * cosY;

  return { x: x3, y: y3, z: z3 };
}

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

  const dx = (rX - 0.5) * 2 * (positionRandomness * scaleRatio);
  const dy = (rY - 0.5) * 2 * (positionRandomness * scaleRatio);

  const finalX = (x + frameWidth / 2) - w / 2 + dx;
  const finalY = (y + frameHeight / 2) - h / 2 + dy;

  return { x: finalX, y: finalY, w, h };
}

// Draws the filename/frame-index label just outside a frame's corner, in
// plain text (no background box) colored to match whatever sits behind it
// for maximum readability. `anchorX`/`anchorY` is the frame corner the label
// sits just outside of: the frame's top-right corner for 'top-right'
// placement, or its bottom-left corner for 'bottom-left' placement (a
// caption "written on the matte" under the photo, left-aligned to it).
function drawCellMetadataText(ctx, frame, anchorX, anchorY, refSize, textColor, videoName, placement = 'top-right') {
  const frameStr = String(frame.frameIndex || 0).padStart(4, '0');
  const cleanName = videoName.toUpperCase().replace(/\.[^/.]+$/, "");
  const textLines = [
    cleanName,
    `[${frameStr}]`
  ];

  const fontSize = Math.max(6, Math.min(28, Math.round(refSize * 0.035)));
  const fontMono = "'Space Mono', monospace";
  ctx.font = `${fontSize}px ${fontMono}`;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillStyle = textColor;

  const lineSpacing = Math.round(fontSize * 1.2);
  const pad = Math.max(2, Math.round(refSize * 0.01));

  const startX = placement === 'bottom-left' ? anchorX : anchorX + pad;
  const startY = placement === 'bottom-left' ? anchorY + pad : anchorY;

  textLines.forEach((line, idx) => {
    ctx.fillText(line, startX, startY + idx * lineSpacing);
  });
}

// Anchor point for a frame's metadata label, given its axis-aligned bounds.
function getRectMetadataAnchor(x, y, w, h, placement) {
  return placement === 'bottom-left'
    ? { x, y: y + h }
    : { x: x + w, y };
}

// ---------------------------------------------------------------------------
// Helper: get gradient tint RGB values for a given frame index
// ---------------------------------------------------------------------------
function getGradientTintRGB(tintKey, t) {
  const tint = GRADIENT_TINTS[tintKey] || GRADIENT_TINTS['dusk-blue'];
  const r = Math.round(tint.start[0] + (tint.end[0] - tint.start[0]) * t);
  const g = Math.round(tint.start[1] + (tint.end[1] - tint.start[1]) * t);
  const b = Math.round(tint.start[2] + (tint.end[2] - tint.start[2]) * t);
  return { r, g, b };
}

// ---------------------------------------------------------------------------
// Optimal Grid Layout Solver
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
  metadataPosition = 'top-right',
  videoName = 'STUDIO_CLIP',
  videoFps = 30,
  showGridBackground = true,
  randomSeed = 1,
  isExport = false,
  contactSheetBgColor = 'transparent',
  galleryDensity = 50,
  gradientTint = 'dusk-blue',
  triptychTimestamps,
}) {
  const res = RESOLUTIONS[aspectRatio];

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
  // LAYOUT MODE: STILL (SINGLE FRAME)
  // ---------------------------------------------------------------------------
  if (styleMode === 'still') {
    const focus = Math.max(0, Math.min(zoomFocusIndex, N - 1));
    const frame = extractedFrames[focus];
    if (frame) {
      const frameAspect = videoWidth / videoHeight;
      const maxW = printWidth;
      const maxH = printHeight;
      
      let w = maxW;
      let h = maxW / frameAspect;
      if (h > maxH) {
        h = maxH;
        w = maxH * frameAspect;
      }
      
      const x = marginX + (printWidth - w) / 2;
      const y = marginY + (printHeight - h) / 2;
      
      ctx.save();
      ctx.filter = (colorMode === 'bw' || colorMode === 'pop' || colorMode === 'gradient') ? 'grayscale(100%)' : 'none';
      ctx.drawImage(frame.canvas, x, y, w, h);
      
      if (colorMode === 'pop') {
        ctx.filter = 'none';
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = `hsla(180, 85%, 60%, 1)`;
        ctx.fillRect(x, y, w, h);
        
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = `hsla(180, 85%, 25%, 0.45)`;
        ctx.fillRect(x, y, w, h);
      } else if (colorMode === 'gradient') {
        ctx.filter = 'none';
        const { r, g, b } = getGradientTintRGB(gradientTint, 0.5);
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(x, y, w, h);
        
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.25)`;
        ctx.fillRect(x, y, w, h);
      }
      
      ctx.strokeStyle = gridTheme.color;
      ctx.lineWidth = Math.max(1, Math.round(1.0 * scaleRatio));
      ctx.strokeRect(x, y, w, h);
      
      ctx.restore();
      
      if (showCellMetadata) {
        const anchor = getRectMetadataAnchor(x, y, w, h, metadataPosition);
        drawCellMetadataText(ctx, frame, anchor.x, anchor.y, w, gridTheme.textColor, videoName, metadataPosition);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // LAYOUT MODE: CONTACT SHEET
  // ---------------------------------------------------------------------------
  else if (styleMode === 'contact-sheet' || styleMode === 'grid-meta') {
    const layout = solveOptimalLayout(N, videoWidth, videoHeight, printWidth, printHeight, scaledGap, aspectRatio);

    const gridW = layout.columns * layout.frameWidth + (layout.columns - 1) * layout.usedGap;
    const gridH = layout.rows * layout.frameHeight + (layout.rows - 1) * layout.usedGap;
    const gridX = marginX + (printWidth - gridW) / 2;
    const gridY = marginY + (printHeight - gridH) / 2;

    // Use contactSheetBgColor if not 'transparent', otherwise fall back to paper color.
    // Hoisted above the showGridBackground branch since the metadata text color needs
    // to match whatever's actually behind it, whether or not the sheet fill is drawn.
    const bgKey = contactSheetBgColor !== 'transparent' ? contactSheetBgColor : paperColor;
    const bgTheme = GRID_COLORS[bgKey] || gridTheme;
    const metadataTextColor = showGridBackground ? bgTheme.textColor : gridTheme.textColor;

    if (showGridBackground) {
      ctx.fillStyle = bgTheme.color;
      ctx.fillRect(gridX, gridY, gridW, gridH);
      ctx.strokeStyle = bgTheme.color;
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
        const { r, g, b } = getGradientTintRGB(gradientTint, t);
        
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(-placement.w / 2, -placement.h / 2, placement.w, placement.h);

        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.25)`;
        ctx.fillRect(-placement.w / 2, -placement.h / 2, placement.w, placement.h);
      }

      ctx.restore();

      if (showCellMetadata) {
        const anchor = getRectMetadataAnchor(x, y, drawWidth, drawHeight, metadataPosition);
        drawCellMetadataText(ctx, frame, anchor.x, anchor.y, drawWidth, metadataTextColor, videoName, metadataPosition);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // LAYOUT MODE: LOOP (formerly RING) — 3D orbit ring
  // ---------------------------------------------------------------------------
  else if (styleMode === 'loop' || styleMode === 'ring' || styleMode === 'orbit') {
    const cx = marginX + printWidth * 0.5;
    const cy = marginY + printHeight * 0.5;
    const R = printWidth * 0.33;

    const rotX = (ringTiltX * Math.PI) / 180;
    const rotY = (ringTiltY * Math.PI) / 180;
    const rotZ = (ringRotation * Math.PI) / 180;

    const D = printWidth * 1.0;

    const orbitFrames = [];
    for (let i = 0; i < N; i++) {
      const t = i * (2 * Math.PI / N);
      const x = R * Math.cos(t);
      const y = R * Math.sin(t);
      const z = 0;

      const centerRot = rotate3DPoint(x, y, z, rotX, rotY, rotZ);

      const perspectiveFactor = D / (D - centerRot.z);
      const px = cx + centerRot.x * perspectiveFactor;
      const py = cy + centerRot.y * perspectiveFactor;

      const ux = -Math.sin(t);
      const uy = Math.cos(t);
      const uz = 0;

      const vx = 0;
      const vy = 0;
      const vz = -1;

      const baseW = printWidth * 0.15;
      const halfW = baseW / 2;
      const halfH = baseW / 2;

      const rightRot = rotate3DPoint(x + halfW * ux, y + halfW * uy, z + halfW * uz, rotX, rotY, rotZ);
      const rFactor = D / (D - rightRot.z);
      const rpx = cx + rightRot.x * rFactor;
      const rpy = cy + rightRot.y * rFactor;

      const topRot = rotate3DPoint(x + halfH * vx, y + halfH * vy, z + halfH * vz, rotX, rotY, rotZ);
      const tFactor = D / (D - topRot.z);
      const tpx = cx + topRot.x * tFactor;
      const tpy = cy + topRot.y * tFactor;

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
        depth: centerRot.z,
        perspectiveFactor
      });
    }

    orbitFrames.sort((a, b) => a.depth - b.depth);

    orbitFrames.forEach(({ frame, index, px, py, dx, dy, halfW, halfH, baseW, perspectiveFactor }) => {
      const cellCx = px;
      const cellCy = py;

      const tDxX = dx.x;
      const tDxY = dx.y;
      const tDyX = dy.x;
      const tDyY = dy.y;

      ctx.save();
      ctx.translate(cellCx, cellCy);
      
      const a = tDxX / halfW;
      const b = tDxY / halfW;
      const c = tDyX / halfH;
      const d = tDyY / halfH;
      ctx.transform(a, b, c, d, 0, 0);

      ctx.filter = (colorMode === 'bw' || colorMode === 'pop' || colorMode === 'gradient') ? 'grayscale(100%)' : 'none';
      
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
        const { r, g, b } = getGradientTintRGB(gradientTint, t);
        
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(-baseW / 2, -baseW / 2, baseW, baseW);

        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.25)`;
        ctx.fillRect(-baseW / 2, -baseW / 2, baseW, baseW);
      }

      ctx.strokeStyle = gridTheme.color;
      ctx.lineWidth = Math.max(1, Math.round(1.0 * scaleRatio));
      ctx.strokeRect(-baseW / 2, -baseW / 2, baseW, baseW);

      ctx.restore();

      if (showCellMetadata) {
        // The photo itself is drawn through a 3D tilt/perspective transform (skewed,
        // not axis-aligned), so the label can't use a naive square bounding box —
        // that's what made it drift away from the photo. Instead, anchor the label
        // to the photo's *actual* screen-projected corner (derived from the same
        // dx/dy screen-space basis vectors used to draw the tilted quad), but draw
        // the text itself outside that transform so it stays flat and facing the
        // camera instead of skewing with the photo.
        const flatSize = baseW * perspectiveFactor;
        const corner = metadataPosition === 'bottom-left'
          ? { x: cellCx - dx.x + dy.x, y: cellCy - dx.y + dy.y } // photo's bottom-left corner
          : { x: cellCx + dx.x - dy.x, y: cellCy + dx.y - dy.y }; // photo's top-right corner
        drawCellMetadataText(ctx, frame, corner.x, corner.y, flatSize, gridTheme.textColor, videoName, metadataPosition);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // LAYOUT MODE: INFINITE GALLERY (3D PERSPECTIVE SCATTER)
  // ---------------------------------------------------------------------------
  else if (styleMode === 'infinite-gallery' || styleMode === 'zoom') {
    const D = printWidth * 0.7;
    const cx = marginX + printWidth * 0.5;
    const cy = marginY + printHeight * 0.5;
    
    // Density controls card spread: lower density = more spread out
    const spreadFactor = 1.5 - (galleryDensity / 100);
    
    const galleryFrames = [];
    const seedOffset = randomSeed * 7919;
    
    for (let i = 0; i < N; i++) {
      const frame = extractedFrames[i];
      if (!frame) continue;
      
      // Depth spread: Z from 0 (front) to 600 (back)
      const zPct = i / Math.max(1, N - 1);
      const z = zPct * 600;
      
      // Scatter positions scaled by density
      const rx = seedRandom(i + 100 + seedOffset) - 0.5;
      const ry = seedRandom(i + 200 + seedOffset) - 0.5;
      
      const pxRaw = rx * printWidth * 0.85 * spreadFactor;
      const pyRaw = ry * printHeight * 0.85 * spreadFactor;
      
      const scaleFactor = D / (D + z * 2.5);
      const px = cx + pxRaw * scaleFactor;
      const py = cy + pyRaw * scaleFactor;
      
      const baseW = printWidth * 0.16;
      const baseH = baseW / videoAspect;
      const w = baseW * scaleFactor;
      const h = baseH * scaleFactor;
      
      // Opacity lowers as they are smaller or further back in Z space
      const opacity = Math.max(0.08, Math.min(1.0, scaleFactor ** 1.8));
      
      galleryFrames.push({
        frame,
        index: i,
        px,
        py,
        w,
        h,
        z,
        opacity
      });
    }
    
    // Sort by depth (farthest first)
    galleryFrames.sort((a, b) => b.z - a.z);
    
    galleryFrames.forEach(({ frame, index, px, py, w, h, opacity }) => {
      ctx.save();
      
      ctx.globalAlpha = opacity;
      
      ctx.translate(px, py);
      
      ctx.filter = (colorMode === 'bw' || colorMode === 'pop' || colorMode === 'gradient') ? 'grayscale(100%)' : 'none';
      ctx.drawImage(frame.canvas, -w / 2, -h / 2, w, h);
      
      if (colorMode === 'pop') {
        ctx.filter = 'none';
        const hue = Math.round((index * (360 / N)) % 360);
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = `hsla(${hue}, 85%, 60%, 1)`;
        ctx.fillRect(-w / 2, -h / 2, w, h);
        
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = `hsla(${hue}, 85%, 25%, 0.45)`;
        ctx.fillRect(-w / 2, -h / 2, w, h);
      } else if (colorMode === 'gradient') {
        ctx.filter = 'none';
        const t = N > 1 ? index / (N - 1) : 0.5;
        const { r, g, b } = getGradientTintRGB(gradientTint, t);
        
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(-w / 2, -h / 2, w, h);
        
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.25)`;
        ctx.fillRect(-w / 2, -h / 2, w, h);
      }
      
      ctx.strokeStyle = gridTheme.color;
      ctx.lineWidth = Math.max(1, Math.round(1.0 * scaleRatio));
      ctx.strokeRect(-w / 2, -h / 2, w, h);
      
      ctx.restore();
      
      if (showCellMetadata) {
        const anchor = getRectMetadataAnchor(px - w / 2, py - h / 2, w, h, metadataPosition);
        drawCellMetadataText(ctx, frame, anchor.x, anchor.y, w, gridTheme.textColor, videoName, metadataPosition);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // LAYOUT MODE: TRIPTYCH (THREE MOMENTS IN TIME)
  // ---------------------------------------------------------------------------
  else if (styleMode === 'triptych' || styleMode === 'prog-vert' || styleMode === 'prog-horiz') {
    const selectedIndices = [0, Math.floor((N - 1) / 2), N - 1];
    const triptychFrames = [];
    if (N >= 3) {
      triptychFrames.push(extractedFrames[selectedIndices[0]]);
      triptychFrames.push(extractedFrames[selectedIndices[1]]);
      triptychFrames.push(extractedFrames[selectedIndices[2]]);
    } else {
      for (let i = 0; i < 3; i++) {
        triptychFrames.push(extractedFrames[Math.min(i, N - 1)]);
      }
    }
    
    const K = 3;
    let w = (printWidth - (K - 1) * scaledGap) / K;
    let h = w / videoAspect;
    if (h > printHeight) {
      h = printHeight;
      w = h * videoAspect;
    }
    
    const totalW = K * w + (K - 1) * scaledGap;
    const startX = marginX + (printWidth - totalW) / 2;
    const startY = marginY + (printHeight - h) / 2;
    
    triptychFrames.forEach((frame, idx) => {
      if (!frame) return;
      const x = startX + idx * (w + scaledGap);
      const y = startY;
      
      ctx.save();
      ctx.filter = (colorMode === 'bw' || colorMode === 'pop' || colorMode === 'gradient') ? 'grayscale(100%)' : 'none';
      ctx.drawImage(frame.canvas, x, y, w, h);
      
      if (colorMode === 'pop') {
        ctx.filter = 'none';
        const hue = Math.round((idx * (360 / K)) % 360);
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = `hsla(${hue}, 85%, 60%, 1)`;
        ctx.fillRect(x, y, w, h);
        
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = `hsla(${hue}, 85%, 25%, 0.45)`;
        ctx.fillRect(x, y, w, h);
      } else if (colorMode === 'gradient') {
        ctx.filter = 'none';
        const t = idx / (K - 1);
        const { r, g, b } = getGradientTintRGB(gradientTint, t);
        
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(x, y, w, h);
        
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.25)`;
        ctx.fillRect(x, y, w, h);
      }
      
      ctx.strokeStyle = gridTheme.color;
      ctx.lineWidth = Math.max(1, Math.round(1.0 * scaleRatio));
      ctx.strokeRect(x, y, w, h);
      
      ctx.restore();
      
      if (showCellMetadata) {
        const anchor = getRectMetadataAnchor(x, y, w, h, metadataPosition);
        drawCellMetadataText(ctx, frame, anchor.x, anchor.y, w, gridTheme.textColor, videoName, metadataPosition);
      }
    });
  }
}