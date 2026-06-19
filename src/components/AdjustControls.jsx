import { useRef, useCallback } from 'react';

/**
 * AdjustControls — Layout-specific configurations (03 / ADJUST).
 * Restructured per-mode: Still, Contact Sheet, Loop, Infinite Gallery, Triptych.
 */
export default function AdjustControls({
  styleMode,
  gapSize, setGapSize,
  showGridBackground, setShowGridBackground,
  ringRotation, setRingRotation,
  ringTiltX, setRingTiltX,
  ringTiltY, setRingTiltY,
  zoomFocusIndex, setZoomFocusIndex,
  zoomLevel, setZoomLevel,
  scaleRandomness, setScaleRandomness,
  positionRandomness, setPositionRandomness,
  rotationRandomness, setRotationRandomness,
  alternateMirror, setAlternateMirror,
  randomSeed, setRandomSeed,
  totalFrames,
  matteMargin, setMatteMargin,
  contactSheetBgColor, setContactSheetBgColor,
  galleryDensity, setGalleryDensity,
}) {
  // ---------------------------------------------------------------------------
  // Loop Joystick Pad — 2D drag to control Pitch (Y) and Yaw (X)
  // ---------------------------------------------------------------------------
  const padRef = useRef(null);
  const isDraggingPad = useRef(false);

  const updatePadFromMouse = useCallback((clientX, clientY) => {
    if (!padRef.current) return;
    const rect = padRef.current.getBoundingClientRect();
    // Map horizontal position to Yaw (–90 to 90)
    const pctX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const yaw = Math.round(-90 + pctX * 180);
    // Map vertical position to Pitch (90 to –90, top = positive)
    const pctY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    const pitch = Math.round(90 - pctY * 180);
    setRingTiltY(yaw);
    setRingTiltX(pitch);
  }, [setRingTiltX, setRingTiltY]);

  const handlePadPointerDown = (e) => {
    e.preventDefault();
    isDraggingPad.current = true;
    updatePadFromMouse(e.clientX, e.clientY);
    document.addEventListener('pointermove', handlePadPointerMove);
    document.addEventListener('pointerup', handlePadPointerUp);
  };

  const handlePadPointerMove = (e) => {
    if (!isDraggingPad.current) return;
    updatePadFromMouse(e.clientX, e.clientY);
  };

  const handlePadPointerUp = () => {
    isDraggingPad.current = false;
    document.removeEventListener('pointermove', handlePadPointerMove);
    document.removeEventListener('pointerup', handlePadPointerUp);
  };

  // Convert tilt values to percentage position within pad
  const dotX = ((ringTiltY + 90) / 180) * 100;
  const dotY = ((90 - ringTiltX) / 180) * 100;

  return (
    <section className="control-section">
      <h2>03 / ADJUST</h2>

      {/* Matte Margin Size - Universal adjustment parameter */}
      <div className="control-row">
        <label htmlFor="matte-margin">MATTE MARGIN:</label>
        <div className="slider-container">
          <input
            type="range"
            id="matte-margin"
            min="4"
            max="24"
            value={matteMargin}
            onChange={(e) => setMatteMargin(parseInt(e.target.value))}
          />
          <span id="matte-margin-val" className="slider-val">{matteMargin}%</span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* STILL MODE — single frame selected via timeline              */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {styleMode === 'still' && (
        <div className="adjust-mode-notice">
          <p>Select a frame using the single point on the timeline below the preview.</p>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* CONTACT SHEET MODE                                            */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {(styleMode === 'contact-sheet' || styleMode === 'grid-meta') && (
        <>
          {/* Grid Spacing */}
          <div className="control-row">
            <label htmlFor="gap-size">GRID SPACING:</label>
            <div className="slider-container">
              <input
                type="range"
                id="gap-size"
                min="0"
                max="80"
                value={gapSize}
                onChange={(e) => setGapSize(parseInt(e.target.value))}
              />
              <span className="slider-val">{gapSize}px</span>
            </div>
          </div>

          {/* Grid Background Fill Toggle */}
          <div className="toggle-row">
            <span className="label-text">GRID BACKGROUND:</span>
            <div className="switch-group">
              <button
                type="button"
                className={`switch-btn${showGridBackground ? ' active' : ''}`}
                onClick={() => setShowGridBackground(true)}
              >
                ON
              </button>
              <button
                type="button"
                className={`switch-btn${!showGridBackground ? ' active' : ''}`}
                onClick={() => setShowGridBackground(false)}
              >
                OFF
              </button>
            </div>
          </div>

          {/* Contact Sheet Background Color — separate from paper color */}
          <div className="control-row">
            <label htmlFor="cs-bg-color">SHEET BACKGROUND:</label>
            <select
              id="cs-bg-color"
              value={contactSheetBgColor}
              onChange={(e) => setContactSheetBgColor(e.target.value)}
            >
              <option value="transparent">SAME AS PAPER</option>
              <option value="white">STUDIO WHITE</option>
              <option value="cream">BRAUN CREAM</option>
              <option value="gray">SLATE GRAY</option>
              <option value="black">MATTE BLACK</option>
              <option value="olive">SAGE OLIVE</option>
              <option value="terracotta">TERRACOTTA SAND</option>
              <option value="navy">ARCHITECTURAL NAVY</option>
            </select>
          </div>

          {/* Alternate Mirroring */}
          <div className="toggle-row">
            <span className="label-text">MIRROR ALTERNATING:</span>
            <div className="switch-group">
              <button
                type="button"
                className={`switch-btn${alternateMirror ? ' active' : ''}`}
                onClick={() => setAlternateMirror(true)}
              >
                ON
              </button>
              <button
                type="button"
                className={`switch-btn${!alternateMirror ? ' active' : ''}`}
                onClick={() => setAlternateMirror(false)}
              >
                OFF
              </button>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* LOOP MODE (formerly Ring) — Joystick pad + Roll slider        */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {(styleMode === 'loop' || styleMode === 'ring' || styleMode === 'orbit') && (
        <>
          {/* 2D Tilt Joystick Pad — inline with its label like every other control */}
          <div className="control-row" style={{ alignItems: 'flex-start' }}>
            <label>TILT (DRAG TO ADJUST):</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '180px', flexShrink: 0 }}>
              <div
                ref={padRef}
                className="joystick-pad"
                onPointerDown={handlePadPointerDown}
              >
                {/* Crosshairs */}
                <div className="joystick-crosshair-h" />
                <div className="joystick-crosshair-v" />
                {/* Pointer dot */}
                <div
                  className="joystick-dot"
                  style={{ left: `${dotX}%`, top: `${dotY}%` }}
                />
                {/* Axis labels */}
                <span className="joystick-label-x left">−90°</span>
                <span className="joystick-label-x right">90°</span>
                <span className="joystick-label-y top">90°</span>
                <span className="joystick-label-y bottom">−90°</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-muted)', fontFamily: "'Space Mono', monospace" }}>
                <span>PITCH: {ringTiltX}°</span>
                <span>YAW: {ringTiltY}°</span>
              </div>
            </div>
          </div>

          {/* Roll / Spin slider */}
          <div className="control-row">
            <label htmlFor="ring-rotation">LOOP SPIN (ROLL):</label>
            <div className="slider-container">
              <input
                type="range"
                id="ring-rotation"
                min="0"
                max="360"
                value={ringRotation}
                onChange={(e) => setRingRotation(parseInt(e.target.value))}
              />
              <span className="slider-val">{ringRotation}°</span>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* INFINITE GALLERY MODE — density + zoom level                 */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {styleMode === 'infinite-gallery' && (
        <>
          {/* Gallery Density */}
          <div className="control-row">
            <label htmlFor="gallery-density">GALLERY DENSITY:</label>
            <div className="slider-container">
              <input
                type="range"
                id="gallery-density"
                min="10"
                max="100"
                value={galleryDensity}
                onChange={(e) => setGalleryDensity(parseInt(e.target.value))}
              />
              <span className="slider-val">{galleryDensity}%</span>
            </div>
          </div>

          {/* Zoom / Scale Level */}
          <div className="control-row">
            <label htmlFor="zoom-level">ZOOM / SCALE:</label>
            <div className="slider-container">
              <input
                type="range"
                id="zoom-level"
                min="0.4"
                max="4.0"
                step="0.1"
                value={zoomLevel}
                onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
              />
              <span className="slider-val">{zoomLevel.toFixed(1)}×</span>
            </div>
          </div>

          {/* Random Seed */}
          <div className="control-row">
            <label htmlFor="random-seed">RANDOM SEED:</label>
            <div className="slider-container">
              <input
                type="range"
                id="random-seed"
                min="1"
                max="100"
                value={randomSeed}
                onChange={(e) => setRandomSeed(parseInt(e.target.value))}
              />
              <span className="slider-val">{randomSeed}</span>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* TRIPTYCH MODE — frames positioned on timeline                */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {styleMode === 'triptych' && (
        <>
          {/* Grid Spacing */}
          <div className="control-row">
            <label htmlFor="gap-size">PANEL SPACING:</label>
            <div className="slider-container">
              <input
                type="range"
                id="gap-size"
                min="0"
                max="80"
                value={gapSize}
                onChange={(e) => setGapSize(parseInt(e.target.value))}
              />
              <span className="slider-val">{gapSize}px</span>
            </div>
          </div>

          <div className="adjust-mode-notice">
            <p>Position the 3 frame selectors on the timeline below the preview.</p>
          </div>
        </>
      )}
    </section>
  );
}
