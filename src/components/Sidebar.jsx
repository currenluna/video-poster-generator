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

export default function Sidebar({ children, onExport, exportDisabled, onBuy }) {
  return (
    <aside className="sidebar">
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <h1>REVIEW DESIGN</h1>
        <p className="brand-sub">CHOOSE LAYOUT, STYLE & OPTIONS</p>
      </div>

      {/* Scrollable control sections (filled by parent via children/slot) */}
      <div className="control-groups">
        {children}
      </div>

      {/* Fixed footer with export and buy buttons */}
      <footer className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          id="btn-export"
          className="action-btn"
          disabled={exportDisabled}
          onClick={onExport}
        >
          EXPORT PRINT FILE (300 PPI)
        </button>
        <button
          id="btn-add-to-cart"
          className="action-btn cart-btn-sidebar"
          disabled={exportDisabled}
          onClick={onBuy}
        >
          BUY
        </button>
      </footer>
    </aside>
  );
}
