/**
 * Sidebar — The left control panel shell (header + scrollable content + footer).
 *
 * 💡 Svelte comparison:
 *    This component uses React's `children` prop, which is like Svelte's <slot>.
 *    In Svelte:
 *        <div class="control-groups"><slot /></div>
 *    In React:
 *        <div className="control-groups">{children}</div>
 *
 *    Both let the parent component inject content into a specific spot.
 *    In App.jsx, we write:
 *        <Sidebar>
 *          <SourceUpload ... />
 *          <FramingControls ... />
 *        </Sidebar>
 *    and those child components appear where {children} is placed below.
 */

export default function Sidebar({ children, onExport, exportDisabled }) {
  return (
    <aside className="sidebar">
      {/* Fixed header */}
      <header className="sidebar-header">
        <h1>POSTER.GEN</h1>
        <p className="brand-sub">CHRONOPHOTOGRAPHIC STUDY / V0.1</p>
      </header>

      {/* Scrollable control sections (filled by parent via children/slot) */}
      <div className="control-groups">
        {children}
      </div>

      {/* Fixed footer with export button */}
      <footer className="sidebar-footer">
        <button
          id="btn-export"
          className="action-btn"
          disabled={exportDisabled}
          onClick={onExport}
        >
          EXPORT PRINT FILE (300 PPI)
        </button>
      </footer>
    </aside>
  );
}
