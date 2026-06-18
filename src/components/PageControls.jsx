/**
 * PageControls — Print size aspect ratios and Matte margin slider.
 */
export default function PageControls({
  aspectRatio, setAspectRatio,
  matteMargin, setMatteMargin,
}) {
  return (
    <section className="control-section">
      <h2>01 / FORMAT</h2>

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

      {/* Matte Margin Size */}
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
    </section>
  );
}
