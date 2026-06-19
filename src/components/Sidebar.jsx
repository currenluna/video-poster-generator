/**
 * Sidebar — The left control panel shell (header + scrollable content body).
 */
export default function Sidebar({ children }) {
  return (
    <aside className="sidebar">
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <h1>Design your print</h1>
        <p className="brand-sub">Shape the layout, then fine-tune every detail.</p>
      </div>

      {/* Scrollable control sections (filled by parent via children) */}
      <div className="control-groups">
        {children}
      </div>
    </aside>
  );
}
