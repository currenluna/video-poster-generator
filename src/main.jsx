/**
 * main.jsx — The entry point of the React app.
 *
 * 💡 Svelte comparison:
 *    In SvelteKit, the entry point is handled by the framework automatically.
 *    In plain Svelte, it's:
 *        new App({ target: document.getElementById('root') })
 *
 *    In React, we use createRoot to mount the <App /> component into the DOM.
 *    StrictMode is a development helper that warns about common mistakes —
 *    it doesn't affect production builds.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './App.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
