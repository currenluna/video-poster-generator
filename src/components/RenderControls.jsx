/**
 * RenderControls — Color mode toggle (B&W / Color) and label type selector.
 *
 * 💡 Svelte comparison: This is a straightforward component with two controls.
 *    In Svelte, the toggle buttons would use `on:click` and `class:active`.
 *    In React, we use `onClick` and build className strings.
 */

export default function RenderControls({
  colorMode, setColorMode,
  labelType, setLabelType,
}) {
  return (
    <section className="control-section">
      <h2>04 / RENDER</h2>

      {/* Color mode toggle */}
      <div className="toggle-row">
        <span className="label-text">COLOR MODE:</span>
        <div className="switch-group">
          <button
            className={`switch-btn${colorMode === 'bw' ? ' active' : ''}`}
            onClick={() => setColorMode('bw')}
          >
            GRAYSCALE
          </button>
          <button
            className={`switch-btn${colorMode === 'color' ? ' active' : ''}`}
            onClick={() => setColorMode('color')}
          >
            COLOR
          </button>
        </div>
      </div>

      {/* Label type selector */}
      <div className="control-row">
        <label htmlFor="label-type">LABELS:</label>
        <select
          id="label-type"
          value={labelType}
          onChange={(e) => setLabelType(e.target.value)}
        >
          <option value="seq">SEQUENTIAL GRID INDEX (1, 2, 3...)</option>
          <option value="index">ABSOLUTE VIDEO FRAME INDEX (0, 30, 60...)</option>
          <option value="time">TIMESTAMP (0.00S...)</option>
          <option value="none">NO LABEL</option>
        </select>
      </div>
    </section>
  );
}
