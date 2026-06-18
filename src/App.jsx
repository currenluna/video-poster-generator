import { useEffect, useRef, useState } from 'react';
import usePosterState from './hooks/usePosterState';
import Sidebar from './components/Sidebar';
import SourceUpload from './components/SourceUpload';
import FramingControls from './components/FramingControls';
import GridControls from './components/GridControls';
import RenderControls from './components/RenderControls';
import PageControls from './components/PageControls';
import PosterPreview from './components/PosterPreview';
import CartView from './components/CartView';
import { drawPoster } from './utils/posterRenderer';
import { calculateTimestamps, RESOLUTIONS } from './utils/constants';
import {
  loadVideoMetadata,
  detectFrameRate,
  extractFramesNative,
  extractFramesFFmpeg,
} from './utils/videoProcessor';

/**
 * App — The root application shell.
 *
 * 💡 Svelte comparison:
 *    Instead of having everything in one file, we import modular components.
 *    In Svelte, you'd mount the app inside a script block. Here we export the
 *    App function.
 *
 *    Debounce effects:
 *      In Svelte: $: { debounce(captureValue, captureMode) }
 *      In React: useEffect with setTimeout and a cleanup function.
 */
export default function App() {
  const state = usePosterState();
  const hiddenVideoRef = useRef(null);


  // Ref to store the latest extraction ID for cancellation check
  const currentExtractionIdRef = useRef(null);

  // Ref to hold the debounce timeout id
  const debounceTimeoutRef = useRef(null);

  // 1. Calculate Timestamps
  const timestamps = calculateTimestamps(
    state.videoDuration,
    state.captureMode,
    state.captureValue,
    state.videoFps,
    state.clipStart,
    state.clipEnd
  );

  // 2. Perform Frame Extraction
  const performExtraction = async (
    tsList,
    file = state.videoFile,
    forceFFmpeg = state.useFFmpegFallback,
    width = state.videoWidth,
    height = state.videoHeight,
    fps = state.videoFps
  ) => {
    if (!file) return;

    const finalTsList = tsList;

    const extractionId = Symbol('extractionId');
    currentExtractionIdRef.current = extractionId;

    state.setIsExtracting(true);
    state.setExtractedFrames([]);
    state.setStatusText('EXTRACTING... ');
    state.setStatusType('warning');

    const shouldCancel = () => currentExtractionIdRef.current !== extractionId;

    if (forceFFmpeg) {
      await runFFmpegExtraction(file, finalTsList, shouldCancel);
      return;
    }

    // Attempt Native Decoder
    try {
      const video = hiddenVideoRef.current;
      const frames = await extractFramesNative(
        video,
        finalTsList,
        width,
        height,
        fps,
        {
          onProgress: (index, total) => {
            if (shouldCancel()) return;
            state.setStatusText(`EXTRACTING FRAME ${index + 1} OF ${total}...`);
          },
          shouldCancel,
        }
      );

      if (shouldCancel()) return;

      if (frames) {
        state.setExtractedFrames(frames);
        state.setIsExtracting(false);
        state.setStatusText('STILLS EXTRACTED. GENERATING POSTER...');
        state.setStatusType('active');
      }
    } catch (err) {
      console.warn('Native video seek/extraction failed. Initiating FFmpeg WASM fallback...', err);
      state.setUseFFmpegFallback(true);
      await runFFmpegExtraction(file, finalTsList, shouldCancel);
    }
  };

  const runFFmpegExtraction = async (file, tsList, shouldCancel) => {
    try {
      const frames = await extractFramesFFmpeg(
        file,
        tsList,
        state.videoFps,
        {
          onProgress: (index, total) => {
            if (shouldCancel()) return;
            state.setStatusText(`FFMPEG DECODING FRAME ${index + 1} OF ${total}...`);
          },
          shouldCancel,
          onStatus: (text) => {
            if (shouldCancel()) return;
            state.setStatusText(text);
          },
          onDurationFound: (duration) => {
            if (shouldCancel()) return;
            state.setVideoDuration(duration);
          },
          onVideoInfo: (w, h) => {
            if (shouldCancel()) return;
            state.setVideoWidth(w);
            state.setVideoHeight(h);
          },
          onFpsFound: (fps) => {
            if (shouldCancel()) return;
            state.setVideoFps(fps);
          },
        }
      );

      if (shouldCancel()) return;

      if (frames) {
        state.setExtractedFrames(frames);
        state.setIsExtracting(false);
        state.setStatusText('STILLS EXTRACTED WITH FFMPEG. GENERATING POSTER...');
        state.setStatusType('active');
      }
    } catch (err) {
      console.error('FFmpeg fallback extraction failed:', err);
      state.setIsExtracting(false);
      state.setStatusText(`FFMPEG DECODER ERROR: ${err.message}`);
      state.setStatusType('error');
    }
  };

  // 3. Handle File Selection
  const handleFileSelect = async (file) => {
    // Reset state for new video
    currentExtractionIdRef.current = null;
    state.setUseFFmpegFallback(false);
    state.setVideoFile(file);
    state.setVideoName(file.name.replace(/\.[^/.]+$/, "").toUpperCase());
    state.setExtractedFrames([]);
    state.setVideoWidth(0);
    state.setVideoHeight(0);

    // Revoke old URL if it exists
    if (state.videoUrl) {
      URL.revokeObjectURL(state.videoUrl);
    }

    const url = URL.createObjectURL(file);
    state.setVideoUrl(url);
    state.setStatusText('LOADING VIDEO...');
    state.setStatusType('warning');

    const video = hiddenVideoRef.current;
    video.src = url;
    video.load();

    try {
      const meta = await loadVideoMetadata(video);
      state.setVideoDuration(meta.duration);
      state.setVideoWidth(meta.width);
      state.setVideoHeight(meta.height);

      state.setStatusText('DETECTING VIDEO FRAME RATE...');
      const detectedFps = await detectFrameRate(video);
      state.setVideoFps(detectedFps);

      // Initialize clip range
      state.setClipStart(0);
      state.setClipEnd(meta.duration);

      // Trigger extraction with the newly found meta/fps
      const initialTimestamps = calculateTimestamps(
        meta.duration,
        state.captureMode,
        state.captureValue,
        detectedFps,
        0,
        meta.duration
      );
      performExtraction(initialTimestamps, file, false, meta.width, meta.height, detectedFps);
    } catch (err) {
      console.error('Failed to load video natively:', err);
      state.setUseFFmpegFallback(true);
      state.setStatusText('NATIVE LOAD FAILED. INITIATING FFMPEG DECODER...');
      state.setStatusType('warning');
      
      const fallbackDuration = state.videoDuration || 10;
      state.setClipStart(0);
      state.setClipEnd(fallbackDuration);

      // FFmpeg will extract dimensions on-the-fly, so trigger now
      const initialTimestamps = calculateTimestamps(
        fallbackDuration,
        state.captureMode,
        state.captureValue,
        state.videoFps,
        0,
        fallbackDuration
      );
      performExtraction(initialTimestamps, file, true);
    }
  };

  // Debounced Re-extraction on Interval Change
  useEffect(() => {
    if (!state.videoFile) return;

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Cancel any active extraction immediately
    currentExtractionIdRef.current = null;

    debounceTimeoutRef.current = setTimeout(() => {
      performExtraction(timestamps);
    }, 400);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [state.captureMode, state.captureValue, state.clipStart, state.clipEnd]);

  // Calculate maximum available physical frames in the trimmed range
  const activeDuration = state.clipEnd - state.clipStart;
  const availableFrames = state.videoDuration > 0 
    ? Math.max(1, Math.floor(activeDuration * state.videoFps)) 
    : 120;

  // Automatically clamp captureValue to available frames based on video clip trim selection
  // Guard: only clamp when clip bounds are valid (clipEnd > clipStart) to avoid race condition
  // during initial video load where videoFile is set before clipEnd is updated from 0.
  useEffect(() => {
    if (state.videoFile && state.clipEnd > state.clipStart && state.captureValue > availableFrames) {
      state.setCaptureValue(availableFrames);
    }
  }, [availableFrames, state.captureValue, state.videoFile, state.clipEnd, state.clipStart]);

  // 4. Handle Export
  const handleExport = () => {
    if (state.extractedFrames.length === 0) return;

    state.setStatusText('PREPARING 300 PPI FILE...');
    state.setStatusType('warning');

    setTimeout(() => {
      try {
        const canvas = document.getElementById('poster-canvas');
        if (!canvas) throw new Error('Canvas element not found.');

        // Re-draw canvas at full resolution for high-quality export
        const exportSettings = { ...settings, isExport: true };
        drawPoster(canvas, exportSettings);

        const res = RESOLUTIONS[state.aspectRatio];
        const filename = `motion_study_${state.aspectRatio}_${res.width}x${res.height}.jpg`;

        canvas.toBlob((blob) => {
          if (!blob) {
            state.setStatusText('EXPORT FAILED.');
            state.setStatusType('error');
            return;
          }

          const dlUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.download = filename;
          a.href = dlUrl;
          a.click();

          setTimeout(() => URL.revokeObjectURL(dlUrl), 100);
          state.setStatusText('EXPORT COMPLETED.');
          state.setStatusType('active');

          // Restore normal scaled-down resolution preview
          drawPoster(canvas, { ...settings, isExport: false });
        }, 'image/jpeg', 0.95);
      } catch (err) {
        console.error('Export failed:', err);
        state.setStatusText(`EXPORT ERROR: ${err.message}`);
        state.setStatusType('error');
      }
    }, 100);
  };

  // Build settings object for PosterPreview
  const settings = {
    extractedFrames: state.extractedFrames,
    aspectRatio: state.aspectRatio,
    matteMargin: state.matteMargin,
    gapSize: state.gapSize,
    scaleRandomness: state.scaleRandomness,
    positionRandomness: state.positionRandomness,
    rotationRandomness: state.rotationRandomness,
    alternateMirror: state.alternateMirror,
    paperColor: state.paperColor,
    layoutMode: state.layoutMode,
    manualColumns: state.manualColumns,
    colorMode: state.colorMode,
    styleMode: state.styleMode,
    ringRotation: state.ringRotation,
    ringTiltX: state.ringTiltX,
    ringTiltY: state.ringTiltY,
    zoomFocusIndex: state.zoomFocusIndex,
    zoomLevel: state.zoomLevel,
    showCellMetadata: state.showCellMetadata,
    showGridBackground: state.showGridBackground,
    randomSeed: state.randomSeed,
    videoWidth: state.videoWidth,
    videoHeight: state.videoHeight,
    videoDuration: state.videoDuration,
    captureMode: state.captureMode,
    captureValue: state.captureValue,
    videoName: state.videoName,
    videoFps: state.videoFps,
    isExport: false,
  };



  return (
    <div className="app-container">
      {/* Top Header Navbar */}
      <header className="app-header">
        <div className="header-brand">
          <span className="brand-title">CPG PRINTER</span>
          <span className="brand-dot">•</span>
          <span className="brand-subtitle">CHRONOPHOTOGRAPHIC STUDY</span>
        </div>
      </header>

      {/* Main Content Body */}
      <div className="app-body">
        {!state.isCheckoutOpen ? (
          <>
            {/* Left/Top Workspace Area */}
            <PosterPreview
              settings={settings}
              statusText={state.statusText}
              statusType={state.statusType}
              clipStart={state.clipStart}
              setClipStart={state.setClipStart}
              clipEnd={state.clipEnd}
              setClipEnd={state.setClipEnd}
            />

            {/* Right/Bottom Sidebar Control Panel */}
            <Sidebar
              onExport={handleExport}
              exportDisabled={state.extractedFrames.length === 0}
              onBuy={() => {
                state.setIsCheckoutOpen(true);
              }}
            >
              <PageControls
                aspectRatio={state.aspectRatio}
                setAspectRatio={state.setAspectRatio}
                matteMargin={state.matteMargin}
                setMatteMargin={state.setMatteMargin}
              />

              <SourceUpload
                videoFile={state.videoFile}
                videoDuration={state.videoDuration}
                videoFps={state.videoFps}
                videoWidth={state.videoWidth}
                videoHeight={state.videoHeight}
                onFileSelect={handleFileSelect}
                isExtracting={state.isExtracting}
                extractedFrames={state.extractedFrames}
                onDelete={() => {
                  if (state.videoUrl) {
                    URL.revokeObjectURL(state.videoUrl);
                  }
                  state.setVideoFile(null);
                  state.setVideoUrl(null);
                  state.setExtractedFrames([]);
                  state.setVideoWidth(0);
                  state.setVideoHeight(0);
                  state.setVideoDuration(0);
                  state.setVideoFps(30);
                  state.setVideoName('STUDIO_CLIP');
                  state.setStatusText('AWAITING VIDEO FILE UPLOAD...');
                  state.setStatusType('warning');
                }}
                videoName={state.videoName}
                setVideoName={state.setVideoName}
              />

              <GridControls
                styleMode={state.styleMode}
                setStyleMode={state.setStyleMode}
                gapSize={state.gapSize}
                setGapSize={state.setGapSize}
                showGridBackground={state.showGridBackground}
                setShowGridBackground={state.setShowGridBackground}
                ringRotation={state.ringRotation}
                setRingRotation={state.setRingRotation}
                ringTiltX={state.ringTiltX}
                setRingTiltX={state.setRingTiltX}
                ringTiltY={state.ringTiltY}
                setRingTiltY={state.setRingTiltY}
                zoomFocusIndex={state.zoomFocusIndex}
                setZoomFocusIndex={state.setZoomFocusIndex}
                zoomLevel={state.zoomLevel}
                setZoomLevel={state.setZoomLevel}
                scaleRandomness={state.scaleRandomness}
                setScaleRandomness={state.setScaleRandomness}
                positionRandomness={state.positionRandomness}
                setPositionRandomness={state.setPositionRandomness}
                rotationRandomness={state.rotationRandomness}
                setRotationRandomness={state.setRotationRandomness}
                alternateMirror={state.alternateMirror}
                setAlternateMirror={state.setAlternateMirror}
                showCellMetadata={state.showCellMetadata}
                setShowCellMetadata={state.setShowCellMetadata}
                randomSeed={state.randomSeed}
                setRandomSeed={state.setRandomSeed}
                totalFrames={state.extractedFrames.length}
              />

              <FramingControls
                captureValue={state.captureValue}
                setCaptureValue={state.setCaptureValue}
                availableFrames={availableFrames}
              />

              <RenderControls
                colorMode={state.colorMode}
                setColorMode={state.setColorMode}
                paperColor={state.paperColor}
                setPaperColor={state.setPaperColor}
              />
            </Sidebar>
          </>
        ) : (
          <div className="workspace-checkout">
            <CartView
              state={state}
              settings={settings}
              onBackToCreate={() => state.setIsCheckoutOpen(false)}
            />
          </div>
        )}
      </div>

      {/* Global Floating Status Notifications (macOS style stacking toasts) */}
      <div className="notifications-container">
        {state.notifications.map((n) => (
          <div key={n.id} className={`status-notification ${n.type}${n.fadeState === 'out' ? ' fade-out' : ''}`}>
            <span className="status-indicator"></span>
            <span className="status-text">{n.text}</span>
          </div>
        ))}
      </div>

      {/* Hidden Video element for native decoding (opacity 0.001 trick) */}
      <video
        ref={hiddenVideoRef}
        id="hidden-video"
        crossOrigin="anonymous"
        playsInline
        webkit-playsinline="true"
        preload="auto"
        style={{
          position: 'absolute',
          opacity: 0.001,
          pointerEvents: 'none',
          zIndex: -1,
        }}
      />
    </div>
  );
}