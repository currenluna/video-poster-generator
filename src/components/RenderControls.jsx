/**
 * RenderControls — Paper color selector and color mode toggles.
 */
export default function RenderControls({
  colorMode, setColorMode,
  paperColor, setPaperColor,
}) {
  return (
    <section className="control-section">
      <h2>05 / RENDER</h2>

      {/* Color mode toggle */}
      <div className="toggle-row">
        <span className="label-text">COLOR MODE:</span>
        <div className="switch-group">
          <button
            className={`switch-btn${colorMode === 'bw' ? ' active' : ''}`}
            onClick={() => setColorMode('bw')}
            title="Grayscale mode"
          >
            GRAYSCALE
          </button>
          <button
            className={`switch-btn${colorMode === 'color' ? ' active' : ''}`}
            onClick={() => setColorMode('color')}
            title="Full color mode"
          >
            COLOR
          </button>
          <button
            className={`switch-btn${colorMode === 'gradient' ? ' active' : ''}`}
            onClick={() => setColorMode('gradient')}
            title="Dark-to-light gradient tint mode"
          >
            GRADIENT TINT
          </button>
        </div>
      </div>

      {/* Paper Color / Grid Theme */}
      <div className="control-row">
        <label htmlFor="paper-color">PAPER COLOR:</label>
        <select
          id="paper-color"
          value={paperColor}
          onChange={(e) => setPaperColor(e.target.value)}
        >
          <option value="white">STUDIO WHITE</option>
          <option value="cream">BRAUN CREAM</option>
          <option value="gray">SLATE GRAY</option>
          <option value="black">MATTE BLACK</option>
          <option value="olive">SAGE OLIVE</option>
          <option value="terracotta">TERRACOTTA SAND</option>
          <option value="navy">ARCHITECTURAL NAVY</option>
        </select>
      </div>
    </section>
  );
}
