import { GRADIENT_TINTS } from '../utils/constants';

/**
 * RenderControls — Paper color, paper finish, color mode toggles, and gradient tint selector.
 */
export default function RenderControls({
  colorMode, setColorMode,
  paperColor, setPaperColor,
  paperType, setPaperType,
  gradientTint, setGradientTint,
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
            title="Black & white mode"
          >
            B&W
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
            title="Dark-to-light tint mode"
          >
            TINT
          </button>
        </div>
      </div>

      {/* Curated Tint Selector — only visible in tint color mode */}
      {colorMode === 'gradient' && (
        <div className="control-row">
          <label htmlFor="gradient-tint">TINT PRESET:</label>
          <select
            id="gradient-tint"
            value={gradientTint}
            onChange={(e) => setGradientTint(e.target.value)}
          >
            {Object.entries(GRADIENT_TINTS).map(([key, tint]) => (
              <option key={key} value={key}>{tint.label.toUpperCase()}</option>
            ))}
          </select>
        </div>
      )}

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

      {/* Paper Finish Selection */}
      <div className="control-row">
        <label htmlFor="paper-type">PAPER FINISH:</label>
        <select
          id="paper-type"
          value={paperType}
          onChange={(e) => setPaperType(e.target.value)}
        >
          <option value="matte">FINE ART MATTE (200GSM)</option>
          <option value="glossy">SATIN SEMI-GLOSS (240GSM)</option>
          <option value="luster">ARCHIVAL LUSTER (260GSM)</option>
        </select>
      </div>
    </section>
  );
}
