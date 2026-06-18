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
  '27x36': { width: 8100, height: 10800, label: '27" x 36" (Portrait)' },
  '36x27': { width: 10800, height: 8100, label: '36" x 27" (Landscape)' },
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
export function calculateTimestamps(duration, captureMode, captureValue, fps, clipStart = 0, clipEnd = duration) {
  if (!duration || duration <= 0) return [];

  const start = Math.max(0, Math.min(clipStart, duration));
  const end = Math.max(start, Math.min(clipEnd || duration, duration));
  const activeDuration = end - start;

  const timestamps = [];

  if (captureMode === 'seconds') {
    // Capture a frame every N seconds starting from clipStart
    for (let t = start; t < end; t += captureValue) {
      timestamps.push(t);
    }
  } else if (captureMode === 'count') {
    // Capture a specific total count of stills, evenly distributed in [start, end]
    const availableFrames = Math.max(1, Math.floor(activeDuration * fps));
    const requestedStills = Math.max(1, Math.round(captureValue));
    
    if (requestedStills >= availableFrames) {
      // If requested stills exceeds or equals available physical frames, sample every physical frame
      for (let i = 0; i < availableFrames; i++) {
        timestamps.push(start + i / fps);
      }
    } else {
      const K = requestedStills;
      if (K === 1) {
        timestamps.push(start);
      } else {
        // Use end - 0.05 to avoid seeking exactly at/past the end of the video
        const endLimit = Math.max(start, end - 0.05);
        const limitDuration = endLimit - start;
        for (let i = 0; i < K; i++) {
          timestamps.push(start + (i / (K - 1)) * limitDuration);
        }
      }
    }
  } else {
    // Capture a frame every N video frames
    const startFrame = Math.floor(start * fps);
    const endFrame = Math.floor(end * fps);
    for (let f = startFrame; f < endFrame; f += captureValue) {
      const t = f / fps;
      if (t < end) timestamps.push(t);
    }
  }

  // Always include at least one frame
  if (timestamps.length === 0 && duration > 0) {
    timestamps.push(start);
  }

  return timestamps.slice(0, 150); // Safety cap to prevent memory issues
}