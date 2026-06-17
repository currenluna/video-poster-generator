/**
 * GridControls — Adjusts layout modes, columns, margins, and gaps.
 *
 * 💡 Svelte comparison:
 *    Active buttons:
 *      In Svelte: class:active={layoutMode === 'auto'}
 *      In React: className={`switch-btn${layoutMode === 'auto' ? ' active' : ''}`}
 *
 *    Conditional sections:
 *      In Svelte: {#if layoutMode === 'manual'}
 *      In React: { layoutMode === 'manual' && ( ... ) }
 */
export default function GridControls({
  layoutMode, setLayoutMode,
  manualColumns, setManualColumns,
  gapSize, setGapSize,
  matteMargin, setMatteMargin,
}) {
  return (
    <section className="control-section">
      <h2>03 / GRID</h2>

      {/* Auto / Manual Mode Toggle */}
      <div className="toggle-row">
        <span className="label-text">COLUMNS:</span>
        <div className="switch-group">
          <button
            id="btn-layout-auto"
            className={`switch-btn${layoutMode === 'auto' ? ' active' : ''}`}
            onClick={() => setLayoutMode('auto')}
          >
            AUTO
          </button>
          <button
            id="btn-layout-manual"
            className={`switch-btn${layoutMode === 'manual' ? ' active' : ''}`}
            onClick={() => setLayoutMode('manual')}
          >
            MANUAL
          </button>
        </div>
      </div>

      {/* Manual Columns (Hidden in Auto Mode) */}
      <div
        id="manual-columns-row"
        className={`control-row${layoutMode === 'manual' ? '' : ' hidden'}`}
      >
        <label htmlFor="column-count">COLUMN COUNT:</label>
        <div className="slider-container">
          <input
            type="range"
            id="column-count"
            min="1"
            max="12"
            value={manualColumns}
            onChange={(e) => setManualColumns(parseInt(e.target.value))}
          />
          <span id="column-count-val" className="slider-val">{manualColumns}</span>
        </div>
      </div>

      {/* Grid Gap Size */}
      <div className="control-row">
        <label htmlFor="gap-size">GRID GAP:</label>
        <div className="slider-container">
          <input
            type="range"
            id="gap-size"
            min="0"
            max="40"
            value={gapSize}
            onChange={(e) => setGapSize(parseInt(e.target.value))}
          />
          <span id="gap-size-val" className="slider-val">{gapSize}px</span>
        </div>
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