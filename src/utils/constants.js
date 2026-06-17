/**
 * constants.js — Shared configuration and pure helper functions.
 *
 * 💡 Svelte comparison: This is like a plain .js helper module — it works
 *    exactly the same in Svelte or React. No framework-specific code here.
 */

// ---------------------------------------------------------------------------
// Resolution Presets (300 PPI print sizes)
// ---------------------------------------------------------------------------
// Each key maps a poster format to its pixel dimensions at 300 dots-per-inch.
export const RESOLUTIONS = {
  '24x36': { width: 7200, height: 10800, label: '24" x 36" (Portrait)' },
  '36x24': { width: 10800, height: 7200, label: '36" x 24" (Landscape)' },
  '24x24': { width: 7200, height: 7200, label: '24" x 24" (Square)' },
};

// ---------------------------------------------------------------------------
// Timestamp Calculator
// ---------------------------------------------------------------------------
/**
 * Given a video's duration and the user's capture settings, returns an array
 * of timestamps (in seconds) where we should grab a still frame.
 *
 * @param {number} duration    — total video length in seconds
 * @param {string} captureMode — 'seconds' or 'frames'
 * @param {number} captureValue — interval value (seconds between stills, or frame count between stills)
 * @param {number} fps         — detected frames-per-second of the video
 * @returns {number[]}         — list of timestamps to extract
 */
export function calculateTimestamps(duration, captureMode, captureValue, fps) {
  if (!duration || duration <= 0) return [];

  const timestamps = [];

  if (captureMode === 'seconds') {
    // Capture a frame every N seconds
    for (let t = 0; t < duration; t += captureValue) {
      timestamps.push(t);
    }
  } else {
    // Capture a frame every N video frames
    const totalVideoFrames = Math.floor(duration * fps);
    for (let f = 0; f < totalVideoFrames; f += captureValue) {
      const t = f / fps;
      if (t < duration) timestamps.push(t);
    }
  }

  // Always include at least one frame
  if (timestamps.length === 0 && duration > 0) {
    timestamps.push(0);
  }

  return timestamps.slice(0, 100); // Safety cap to prevent memory issues
}