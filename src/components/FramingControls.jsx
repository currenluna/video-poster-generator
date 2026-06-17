/**
 * FramingControls — Sets the frame capture mode and interval.
 *
 * 💡 Svelte comparison:
 *    Conditional rendering:
 *      In Svelte: {#if count < 4 || count > 48}...{/if}
 *      In React: { (count < 4 || count > 48) && <div className="warning">...</div> }
 */
export default function FramingControls({
  captureMode, setCaptureMode,
  captureValue, setCaptureValue,
  estimatedStillsCount,
}) {
  const handleModeChange = (e) => {
    const mode = e.target.value;
    setCaptureMode(mode);
    if (mode === 'seconds') {
      setCaptureValue(2);
    } else {
      setCaptureValue(60);
    }
  };

  const handleValueChange = (e) => {
    const val = parseFloat(e.target.value) || 1;
    setCaptureValue(Math.max(val, captureMode === 'seconds' ? 0.1 : 1));
  };

  const handleStepDown = () => {
    const step = captureMode === 'seconds' ? 0.2 : 5;
    const minVal = captureMode === 'seconds' ? 0.1 : 1;
    setCaptureValue((prev) => {
      const next = prev - step;
      // Precision handling for floating point math
      return parseFloat(Math.max(next, minVal).toFixed(captureMode === 'seconds' ? 1 : 0));
    });
  };

  const handleStepUp = () => {
    const step = captureMode === 'seconds' ? 0.2 : 5;
    setCaptureValue((prev) => {
      return parseFloat((prev + step).toFixed(captureMode === 'seconds' ? 1 : 0));
    });
  };

  // Check if warning is active
  const showWarning = estimatedStillsCount < 4 || estimatedStillsCount > 48;

  // Format value for input box (seconds can have decimals, frames should be integer)
  const inputDisplay = captureMode === 'seconds'
    ? captureValue
    : Math.round(captureValue);

  return (
    <section className="control-section">
      <h2>02 / FRAMING</h2>

      {/* Mode selection */}
      <div className="control-row">
        <label htmlFor="capture-mode">CAPTURE BY:</label>
        <select
          id="capture-mode"
          value={captureMode}
          onChange={handleModeChange}
        >
          <option value="seconds">SECONDS INTERVAL</option>
          <option value="frames">FRAME COUNT INTERVAL</option>
        </select>
      </div>

      {/* Interval value stepper */}
      <div className="control-row">
        <label id="capture-value-label" htmlFor="capture-value">
          {captureMode === 'seconds' ? 'EVERY (SEC):' : 'EVERY (FRAMES):'}
        </label>
        <div className="stepper-input">
          <button id="step-down" className="btn-step" onClick={handleStepDown}>−</button>
          <input
            type="number"
            id="capture-value"
            value={inputDisplay}
            step={captureMode === 'seconds' ? '0.1' : '1'}
            min={captureMode === 'seconds' ? '0.1' : '1'}
            onChange={handleValueChange}
          />
          <button id="step-up" className="btn-step" onClick={handleStepUp}>＋</button>
        </div>
      </div>

      {/* Estimated stills count */}
      <div className="control-row">
        <label>ESTIMATED STILLS:</label>
        <span id="est-stills-count" className="slider-val">{estimatedStillsCount}</span>
      </div>

      {/* Warning message */}
      <div
        id="stills-warning"
        className={`warning-box${showWarning ? '' : ' hidden'}`}
      >
        ⚠️ RECOMMENDED STILLS RANGE IS 4 TO 48 TO MAINTAIN OPTIMAL POSTER COMPOSITION AND PREVENT EXPORT ISSUES.
      </div>
    </section>
  );
}