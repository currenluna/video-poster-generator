/**
 * StatusBar — Displays the current app status with a colored indicator dot.
 *
 * 💡 Svelte comparison: This is the simplest kind of component.
 *    In Svelte, you'd have:
 *        <script>
 *          export let text;
 *          export let type;
 *        </script>
 *        <div class="status-bar" class:active={type === 'active'} ...>
 *
 *    In React, props are passed as a single object argument.
 *    Instead of Svelte's `class:active={condition}`, we build the className
 *    string with template literals or conditionals.
 */

export default function StatusBar({ text, type }) {
  // Build the CSS class string based on the status type
  // 💡 Svelte would use: class:active={type === 'active'} class:error={type === 'error'}
  const className = `status-bar${type === 'active' ? ' active' : ''}${type === 'error' ? ' error' : ''}`;

  return (
    <div className={className}>
      <span className="status-indicator"></span>
      <span className="status-text">{text}</span>
    </div>
  );
}
