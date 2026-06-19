/**
 * PageControls — Print size aspect ratios and layout style modes (02 / STYLE).
 */
export default function PageControls({
  aspectRatio, setAspectRatio,
  styleMode, setStyleMode,
  showCellMetadata, setShowCellMetadata,
  metadataPosition, setMetadataPosition,
  videoFile,
  captureValue, setCaptureValue,
  availableFrames,
}) {
  // The total stills count only applies to modes that render a variable
  // number of frames — Still and Triptych always use a fixed frame count.
  const showStillsSlider = styleMode !== 'still' && styleMode !== 'triptych';

  const minStills = Math.min(10, availableFrames);
  const maxStills = Math.min(200, availableFrames);

  return (
    <section className="control-section">
      <h2>02 / STYLE</h2>

      {/* Layout Style Selector */}
      <div className="control-row">
        <label htmlFor="style-mode">LAYOUT STYLE:</label>
        <select
          id="style-mode"
          value={styleMode}
          onChange={(e) => setStyleMode(e.target.value)}
        >
          <option value="still">STILL</option>
          <option value="contact-sheet">CONTACT SHEET</option>
          <option value="loop">LOOP</option>
          <option value="infinite-gallery">INFINITE GALLERY</option>
          <option value="triptych">TRIPTYCH</option>
        </select>
      </div>

      {/* Total stills count slider — only shown for modes that use a variable frame count.
          Stays mounted during background re-extraction (e.g. while scrubbing the timeline)
          so the layout doesn't jump. Inline like every other slider control. */}
      {videoFile && showStillsSlider && (
        <>
          <div className="control-row">
            <label htmlFor="capture-value-slider">TOTAL STILLS:</label>
            <div className="slider-container">
              <input
                type="range"
                id="capture-value-slider"
                min={minStills}
                max={maxStills}
                value={Math.min(captureValue, maxStills)}
                onChange={(e) => setCaptureValue(parseInt(e.target.value) || minStills)}
              />
              <span className="slider-val">{Math.min(captureValue, maxStills)}</span>
            </div>
          </div>
          <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: "'Space Mono', monospace", textAlign: 'right' }}>
            AVAILABLE PHYSICAL FRAMES: {availableFrames}
          </div>
        </>
      )}

      {/* Print size selector */}
      <div className="control-row">
        <label htmlFor="poster-size">PRINT SIZE:</label>
        <select
          id="poster-size"
          value={aspectRatio}
          onChange={(e) => setAspectRatio(e.target.value)}
        >
          <option value="27x36">27" X 36"</option>
          <option value="36x27">36" X 27"</option>
          <option value="24x24">24" X 24"</option>
        </select>
      </div>

      {/* Cell Metadata Toggle — OFF on left, ON on right, defaults OFF */}
      <div className="toggle-row" style={{ marginTop: '1.2rem', paddingTop: '1rem', borderTop: '1px solid var(--border-muted)' }}>
        <span className="label-text">CELL METADATA:</span>
        <div className="switch-group">
          <button
            type="button"
            className={`switch-btn${!showCellMetadata ? ' active' : ''}`}
            onClick={() => setShowCellMetadata(false)}
          >
            OFF
          </button>
          <button
            type="button"
            className={`switch-btn${showCellMetadata ? ' active' : ''}`}
            onClick={() => setShowCellMetadata(true)}
          >
            ON
          </button>
        </div>
      </div>

      {/* Metadata placement — only matters once metadata is actually showing */}
      {showCellMetadata && (
        <div className="toggle-row">
          <span className="label-text">METADATA POSITION:</span>
          <div className="switch-group">
            <button
              type="button"
              className={`switch-btn${metadataPosition === 'top-right' ? ' active' : ''}`}
              onClick={() => setMetadataPosition('top-right')}
            >
              TOP RIGHT
            </button>
            <button
              type="button"
              className={`switch-btn${metadataPosition === 'bottom-left' ? ' active' : ''}`}
              onClick={() => setMetadataPosition('bottom-left')}
            >
              BOTTOM LEFT
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
