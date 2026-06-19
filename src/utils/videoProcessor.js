/**
 * videoProcessor.js — Video loading, FPS detection, and frame extraction.
 *
 * 💡 Svelte comparison: This is another plain .js module — no React or Svelte
 *    code. It exports functions that work with a native <video> element
 *    and communicate results via callbacks. Both frameworks would use it
 *    the same way.
 */

// ---------------------------------------------------------------------------
// 1. Load Video Metadata
// ---------------------------------------------------------------------------
/**
 * Waits for a <video> element to load metadata (duration + dimensions).
 * Returns a Promise that resolves with { duration, width, height }.
 */
export function loadVideoMetadata(video) {
  return new Promise((resolve, reject) => {
    let metadataLoaded = false;

    // Timeout: if the browser can't decode this format at all
    const metadataTimeout = setTimeout(() => {
      if (!metadataLoaded) {
        video.onloadedmetadata = null;
        video.onerror = null;
        reject({ type: 'timeout', message: 'TIMEOUT LOADING VIDEO METADATA (UNSUPPORTED FORMAT/CODEC).' });
      }
    }, 8000);

    video.onloadedmetadata = () => {
      metadataLoaded = true;
      clearTimeout(metadataTimeout);

      const duration = video.duration;
      if (isNaN(duration) || duration <= 0) {
        reject({ type: 'invalid', message: 'INVALID VIDEO DURATION.' });
        return;
      }

      // Some browsers need a moment to populate videoWidth/videoHeight
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        resolve({ duration, width: video.videoWidth, height: video.videoHeight });
        return;
      }

      // Centralized listener cleanup to avoid duplicate code
      const cleanup = () => {
        clearInterval(interval);
        video.removeEventListener('loadeddata', onDataLoaded);
        video.removeEventListener('canplay', onDataLoaded);
      };

      // Poll for dimensions (handles common browser decoder delays)
      let checks = 0;
      const interval = setInterval(() => {
        checks++;
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          cleanup();
          resolve({ duration, width: video.videoWidth, height: video.videoHeight });
        } else if (checks >= 40) {
          cleanup();
          reject({ type: 'unsupported', message: 'NATIVE DECODER TIMEOUT RETRIEVING DIMENSIONS.' });
        }
      }, 50);

      const onDataLoaded = () => {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          cleanup();
          resolve({ duration, width: video.videoWidth, height: video.videoHeight });
        }
      };
      video.addEventListener('loadeddata', onDataLoaded);
      video.addEventListener('canplay', onDataLoaded);
    };

    video.onerror = () => {
      metadataLoaded = true;
      clearTimeout(metadataTimeout);
      reject({ type: 'unsupported', message: 'VIDEO LOAD ERROR.' });
    };
  });
}

// ---------------------------------------------------------------------------
// 2. Detect Frame Rate
// ---------------------------------------------------------------------------
/**
 * Plays the video briefly and uses requestVideoFrameCallback to measure the
 * actual frame rate. Matches to standard rates.
 */
export function detectFrameRate(video) {
  return new Promise((resolve) => {
    const safetyTimeout = setTimeout(() => {
      video.pause();
      resolve(30);
    }, 1500);

    if (!video.requestVideoFrameCallback) {
      clearTimeout(safetyTimeout);
      resolve(30);
      return;
    }

    const frameTimes = [];
    let callbackCount = 0;

    video.muted = true;
    video.play().then(() => {
      const checkFps = (_now, metadata) => {
        callbackCount++;
        if (metadata.mediaTime !== undefined) {
          frameTimes.push(metadata.mediaTime);
        }

        if (callbackCount < 15 && frameTimes.length < 10) {
          video.requestVideoFrameCallback(checkFps);
        } else {
          clearTimeout(safetyTimeout);
          video.pause();
          video.currentTime = 0;

          const diffs = [];
          for (let i = 1; i < frameTimes.length; i++) {
            const diff = frameTimes[i] - frameTimes[i - 1];
            if (diff > 0.005 && diff < 0.1) diffs.push(diff);
          }

          if (diffs.length > 0) {
            const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
            const calculated = 1 / avgDiff;

            const standardRates = [23.976, 24, 25, 29.97, 30, 50, 60];
            let matched = 30;
            let minDiff = Infinity;
            standardRates.forEach((rate) => {
              const d = Math.abs(calculated - rate);
              if (d < minDiff) {
                minDiff = d;
                matched = rate;
              }
            });
            resolve(matched);
          } else {
            resolve(30);
          }
        }
      };
      video.requestVideoFrameCallback(checkFps);
    }).catch(() => {
      clearTimeout(safetyTimeout);
      resolve(30);
    });
  });
}

// ---------------------------------------------------------------------------
// 3. Seek Helper
// ---------------------------------------------------------------------------
function seekVideo(video, time) {
  return new Promise((resolve) => {
    if (Math.abs(video.currentTime - time) < 0.01) {
      resolve();
      return;
    }

    let resolved = false;
    const done = () => {
      if (!resolved) {
        resolved = true;
        video.removeEventListener('seeked', done);
        video.removeEventListener('error', done);
        resolve();
      }
    };

    video.addEventListener('seeked', done);
    video.addEventListener('error', done);
    video.currentTime = time;
    setTimeout(done, 1500); // Safety timeout
  });
}

// ---------------------------------------------------------------------------
// 4. Native Frame Extraction
// ---------------------------------------------------------------------------
export async function extractFramesNative(
  video, timestamps, videoWidth, videoHeight, fps,
  { onProgress, shouldCancel }
) {
  const frames = [];

  for (let i = 0; i < timestamps.length; i++) {
    if (shouldCancel()) return null;

    onProgress(i, timestamps.length);

    try {
      await seekVideo(video, timestamps[i]);
      if (shouldCancel()) return null;

      const canvas = document.createElement('canvas');
      canvas.width = videoWidth;
      canvas.height = videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0, videoWidth, videoHeight);

      frames.push({
        timestamp: timestamps[i],
        canvas,
        frameIndex: Math.floor(timestamps[i] * fps),
      });
    } catch (err) {
      console.warn(`Failed to seek frame at ${timestamps[i]}s`, err);
    }
  }

  return shouldCancel() ? null : frames;
}

// ---------------------------------------------------------------------------
// 5. FFmpeg WebAssembly Fallback
// ---------------------------------------------------------------------------
let ffmpegInstance = null;

async function initFFmpeg(onStatus, onDurationFound, onFpsFound) {
  if (ffmpegInstance) {
    ffmpegInstance._callbacks = { onStatus, onDurationFound, onFpsFound };
    return ffmpegInstance;
  }

  onStatus('LOADING FFMPEG DECODER (25MB)...');
  const { createFFmpeg } = window.FFmpeg;
  ffmpegInstance = createFFmpeg({
    log: true,
    logger: ({ message }) => {
      if (ffmpegInstance._callbacks) {
        const { onDurationFound: durationCallback, onFpsFound: fpsCallback } = ffmpegInstance._callbacks;
        
        const match = message.match(/Duration: (\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
        if (match && durationCallback) {
          const d = parseInt(match[1]) * 3600 + parseInt(match[2]) * 60
                  + parseInt(match[3]) + parseInt(match[4]) / 100;
          if (d > 0) durationCallback(d);
        }

        const fpsMatch = message.match(/,\s*(\d+(?:\.\d+)?)\s*fps/);
        if (fpsMatch && fpsCallback) {
          const fps = parseFloat(fpsMatch[1]);
          if (fps > 0) fpsCallback(fps);
        }
      }
    },
    corePath: 'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js',
  });
  ffmpegInstance._callbacks = { onStatus, onDurationFound, onFpsFound };
  await ffmpegInstance.load();
  return ffmpegInstance;
}

export async function extractFramesFFmpeg(
  videoFile, timestamps, fps,
  { onProgress, shouldCancel, onStatus, onDurationFound, onVideoInfo, onFpsFound }
) {
  const instance = await initFFmpeg(onStatus, onDurationFound, onFpsFound);

  let fileExists = false;
  try {
    instance.FS('stat', 'input.video');
    fileExists = true;
  } catch {}

  if (!fileExists) {
    onStatus('READING VIDEO FILE FOR DECODER...');
    const { fetchFile } = window.FFmpeg;
    instance.FS('writeFile', 'input.video', await fetchFile(videoFile));

    try {
      await instance.run('-i', 'input.video');
    } catch {}
  }

  const frames = [];

  for (let i = 0; i < timestamps.length; i++) {
    if (shouldCancel()) return null;
    onProgress(i, timestamps.length);

    const outName = `out_${i}.png`;
    await instance.run('-ss', timestamps[i].toFixed(3), '-i', 'input.video', '-vframes', '1', outName);

    if (shouldCancel()) {
      try {
        instance.FS('unlink', outName);
      } catch {}
      return null;
    }

    const data = instance.FS('readFile', outName);
    instance.FS('unlink', outName);

    const blob = new Blob([data.buffer], { type: 'image/png' });
    const imgUrl = URL.createObjectURL(blob);

    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('Failed to load extracted frame image.'));
      img.src = imgUrl;
    });

    if (i === 0) {
      onVideoInfo(img.naturalWidth, img.naturalHeight);
    }

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext('2d').drawImage(img, 0, 0);
    URL.revokeObjectURL(imgUrl);

    frames.push({
      timestamp: timestamps[i],
      canvas,
      frameIndex: Math.floor(timestamps[i] * fps),
    });
  }

  return shouldCancel() ? null : frames;
}

// ---------------------------------------------------------------------------
// End of videoProcessor.js
// ---------------------------------------------------------------------------