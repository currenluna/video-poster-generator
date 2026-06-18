/**
 * FramingControls — Sets the total stills count, capped to physical frames.
 */
export default function FramingControls({
  captureValue, setCaptureValue,
  availableFrames,
}) {
  const maxStills = Math.min(120, availableFrames);

  const handleSliderChange = (e) => {
    setCaptureValue(parseInt(e.target.value) || 1);
  };

  const handleStepDown = () => {
    setCaptureValue((prev) => Math.max(1, prev - 5));
  };

  const handleStepUp = () => {
    setCaptureValue((prev) => Math.min(maxStills, prev + 5));
  };

  return (
    <section className="control-section">
      <h2>04 / TIMING</h2>

      {/* Total stills count slider and stepper */}
      <div className="control-row">
        <label htmlFor="capture-value">TOTAL STILLS:</label>
        <div className="slider-container" style={{ flex: 1, gap: '0.8rem' }}>
          <input
            type="range"
            id="capture-value-slider"
            min="1"
            max={maxStills}
            value={Math.min(captureValue, maxStills)}
            onChange={handleSliderChange}
            style={{ flex: 1 }}
          />
          <div className="stepper-input" style={{ width: '80px', flexShrink: 0 }}>
            <button type="button" className="btn-step" onClick={handleStepDown}>−</button>
            <span style={{ fontSize: '11px', fontFamily: "'Space Mono', monospace", fontWeight: '700', textAlign: 'center', minWidth: '24px' }}>
              {Math.min(captureValue, maxStills)}
            </span>
            <button type="button" className="btn-step" onClick={handleStepUp}>＋</button>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '0.5rem', fontSize: '9px', color: 'var(--text-muted)', fontFamily: "'Space Mono', monospace" }}>
        AVAILABLE PHYSICAL STILLS: {availableFrames}
      </div>
    </section>
  );
}