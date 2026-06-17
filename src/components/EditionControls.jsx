/**
 * EditionControls — Poster size selector and footer text input.
 *
 * 💡 Svelte comparison:
 *    Text inputs in Svelte: <input bind:value={customMeta}>
 *    In React: <input value={customMeta} onChange={(e) => setCustomMeta(e.target.value)}>
 *    Same pattern as selects — value flows down, onChange flows up.
 */

export default function EditionControls({
  aspectRatio, setAspectRatio,
  customMeta, setCustomMeta,
}) {
  return (
    <section className="control-section">
      <h2>05 / EDITIONS</h2>

      {/* Print size selector */}
      <div className="control-row">
        <label htmlFor="poster-size">PRINT SIZE (300 PPI):</label>
        <select
          id="poster-size"
          value={aspectRatio}
          onChange={(e) => setAspectRatio(e.target.value)}
        >
          <option value="24x36">24&quot; X 36&quot; (7200 X 10800 PX)</option>
          <option value="36x24">36&quot; X 24&quot; (10800 X 7200 PX)</option>
          <option value="24x24">24&quot; X 24&quot; (7200 X 7200 PX)</option>
        </select>
      </div>

      {/* Footer text */}
      <div className="control-row">
        <label htmlFor="poster-meta">FOOTER NOTE:</label>
        <input
          type="text"
          id="poster-meta"
          placeholder="Auto-generated metadata"
          value={customMeta}
          onChange={(e) => setCustomMeta(e.target.value.toUpperCase())}
        />
      </div>
    </section>
  );
}
