/**
 * GridControls — Adjusts layout styles and their specific configurations.
 */
export default function GridControls({
  styleMode, setStyleMode,
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
  showCellMetadata, setShowCellMetadata,
  randomSeed, setRandomSeed,
  totalFrames,
}) {
  return (
    <section className="control-section">
      <h2>03 / STYLE</h2>

      {/* Layout Style Selector */}
      <div className="control-row">
        <label htmlFor="style-mode">LAYOUT STYLE:</label>
        <select
          id="style-mode"
          value={styleMode}
          onChange={(e) => setStyleMode(e.target.value)}
        >
          <option value="grid-meta">GRID WITH METADATA</option>
          <option value="orbit">ORBIT RING</option>
          <option value="zoom">ZOOM FOCUS CASCADE</option>
          <option value="prog-vert">PROGRESSIVE ROWS (VERTICAL)</option>
          <option value="prog-horiz">PROGRESSIVE COLUMNS (HORIZONTAL)</option>
        </select>
      </div>

      {/* Custom settings for Grid Style */}
      {styleMode === 'grid-meta' && (
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

          {/* Grid Background Fill */}
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

          {/* Scale Randomness */}
          <div className="control-row">
            <label htmlFor="scale-randomness">SCALE RANDOMNESS:</label>
            <div className="slider-container">
              <input
                type="range"
                id="scale-randomness"
                min="0"
                max="30"
                value={scaleRandomness}
                onChange={(e) => setScaleRandomness(parseInt(e.target.value))}
              />
              <span className="slider-val">{scaleRandomness}%</span>
            </div>
          </div>

          {/* Offset Randomness */}
          <div className="control-row">
            <label htmlFor="position-randomness">OFFSET RANDOMNESS:</label>
            <div className="slider-container">
              <input
                type="range"
                id="position-randomness"
                min="0"
                max="30"
                value={positionRandomness}
                onChange={(e) => setPositionRandomness(parseInt(e.target.value))}
              />
              <span className="slider-val">{positionRandomness}px</span>
            </div>
          </div>

          {/* Cell Rotation */}
          <div className="control-row">
            <label htmlFor="rotation-randomness">CELL ROTATION:</label>
            <div className="slider-container">
              <input
                type="range"
                id="rotation-randomness"
                min="0"
                max="15"
                value={rotationRandomness}
                onChange={(e) => setRotationRandomness(parseInt(e.target.value))}
              />
              <span className="slider-val">{rotationRandomness}°</span>
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

      {/* Custom settings for Orbit Ring Style */}
      {styleMode === 'orbit' && (
        <>
          {/* Tilt X (Pitch) */}
          <div className="control-row">
            <label htmlFor="ring-tilt-x">TILT X (PITCH):</label>
            <div className="slider-container">
              <input
                type="range"
                id="ring-tilt-x"
                min="-90"
                max="90"
                value={ringTiltX}
                onChange={(e) => setRingTiltX(parseInt(e.target.value))}
              />
              <span className="slider-val">{ringTiltX}°</span>
            </div>
          </div>

          {/* Tilt Y (Yaw) */}
          <div className="control-row">
            <label htmlFor="ring-tilt-y">TILT Y (YAW):</label>
            <div className="slider-container">
              <input
                type="range"
                id="ring-tilt-y"
                min="-90"
                max="90"
                value={ringTiltY}
                onChange={(e) => setRingTiltY(parseInt(e.target.value))}
              />
              <span className="slider-val">{ringTiltY}°</span>
            </div>
          </div>

          {/* Rotate Z (Roll / Rotation Offset) */}
          <div className="control-row">
            <label htmlFor="ring-rotation">ROTATE Z (ROLL):</label>
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

          {/* Scale Randomness */}
          <div className="control-row">
            <label htmlFor="scale-randomness">SCALE RANDOMNESS:</label>
            <div className="slider-container">
              <input
                type="range"
                id="scale-randomness"
                min="0"
                max="30"
                value={scaleRandomness}
                onChange={(e) => setScaleRandomness(parseInt(e.target.value))}
              />
              <span className="slider-val">{scaleRandomness}%</span>
            </div>
          </div>

          {/* Offset Randomness */}
          <div className="control-row">
            <label htmlFor="position-randomness">OFFSET RANDOMNESS:</label>
            <div className="slider-container">
              <input
                type="range"
                id="position-randomness"
                min="0"
                max="30"
                value={positionRandomness}
                onChange={(e) => setPositionRandomness(parseInt(e.target.value))}
              />
              <span className="slider-val">{positionRandomness}px</span>
            </div>
          </div>

          {/* Cell Rotation */}
          <div className="control-row">
            <label htmlFor="rotation-randomness">CELL ROTATION:</label>
            <div className="slider-container">
              <input
                type="range"
                id="rotation-randomness"
                min="0"
                max="15"
                value={rotationRandomness}
                onChange={(e) => setRotationRandomness(parseInt(e.target.value))}
              />
              <span className="slider-val">{rotationRandomness}°</span>
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

      {/* Custom settings for Zoom Focus Style */}
      {styleMode === 'zoom' && (
        <>
          <div className="control-row">
            <label htmlFor="zoom-focus">ZOOM FOCUS FRAME:</label>
            <div className="slider-container">
              <input
                type="range"
                id="zoom-focus"
                min="0"
                max={Math.max(0, totalFrames - 1)}
                value={zoomFocusIndex}
                onChange={(e) => setZoomFocusIndex(parseInt(e.target.value))}
                disabled={totalFrames === 0}
              />
              <span className="slider-val">#{totalFrames > 0 ? zoomFocusIndex + 1 : 0}</span>
            </div>
          </div>

          <div className="control-row">
            <label htmlFor="zoom-level">ZOOM FACTOR:</label>
            <div className="slider-container">
              <input
                type="range"
                id="zoom-level"
                min="0.0"
                max="4.0"
                step="0.1"
                value={zoomLevel}
                onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
              />
              <span className="slider-val">{zoomLevel.toFixed(1)}x</span>
            </div>
          </div>
        </>
      )}

      {/* Cell Metadata Toggle */}
      <div className="toggle-row" style={{ marginTop: '1.2rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
        <span className="label-text">CELL METADATA:</span>
        <div className="switch-group">
          <button
            type="button"
            className={`switch-btn${showCellMetadata ? ' active' : ''}`}
            onClick={() => setShowCellMetadata(true)}
          >
            ON
          </button>
          <button
            type="button"
            className={`switch-btn${!showCellMetadata ? ' active' : ''}`}
            onClick={() => setShowCellMetadata(false)}
          >
            OFF
          </button>
        </div>
      </div>
    </section>
  );
}