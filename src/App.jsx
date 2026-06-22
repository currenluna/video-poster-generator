import { useEffect, useRef, useState } from 'react';
import usePosterState from './hooks/usePosterState';
import Sidebar from './components/Sidebar';
import SourceUpload from './components/SourceUpload';
import PageControls from './components/PageControls';
import AdjustControls from './components/AdjustControls';
import RenderControls from './components/RenderControls';
import PosterPreview from './components/PosterPreview';
import CartView from './components/CartView';
import LandingView from './components/LandingView';
import { HowItWorksView, PressView, ContactView } from './components/SubPages';
import { drawPoster } from './utils/posterRenderer';
import { calculateTimestamps, RESOLUTIONS } from './utils/constants';
import {
  loadVideoMetadata,
  detectFrameRate,
  extractFramesNative,
  extractFramesFFmpeg,
  cleanupFFmpeg,
} from './utils/videoProcessor';

/**
 * App — The root application shell.
 */
export default function App() {
  const state = usePosterState();
  const [currentView, setCurrentView] = useState('landing');
  const [activeModal, setActiveModal] = useState(null);
  const hiddenVideoRef = useRef(null);

  // Ref to store the latest extraction ID for cancellation check
  const currentExtractionIdRef = useRef(null);

  // Ref to hold the debounce timeout id
  const debounceTimeoutRef = useRef(null);

  // 1. Calculate Timestamps
  // For triptych mode, use the triptych timestamps directly.
  // For still mode, there's only ever one frame to grab — the one the
  // timeline pointer is parked on — so skip the full-clip calculation.
  const timestamps = state.styleMode === 'triptych'
    ? state.triptychTimestamps
    : state.styleMode === 'still'
    ? [state.stillFrameTime]
    : calculateTimestamps(
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

    // Calculate memory-safe maximum dimension for frames based on styleMode and frame count
    const totalFrames = finalTsList.length;
    let maxFrameDimension = 1024; // Default safe size for large layouts
    if (state.styleMode === 'still' || totalFrames <= 3) {
      maxFrameDimension = 3840; // Full resolution (up to 4K) for single frame or triptych
    } else if (totalFrames <= 12) {
      maxFrameDimension = 2048; // 2K resolution for small layouts
    } else if (totalFrames <= 48) {
      maxFrameDimension = 1280; // HD resolution for medium layouts
    }

    const extractionId = Symbol('extractionId');
    currentExtractionIdRef.current = extractionId;

    // Note: we deliberately don't clear extractedFrames here. Doing so would
    // unmount the timeline bar / thumbnail / stills slider the instant a
    // re-extraction starts (e.g. while scrubbing the timeline), causing the
    // whole layout to jump. The old frames stay on screen until the new
    // ones are ready, then setExtractedFrames below swaps them atomically.
    state.setIsExtracting(true);
    state.setStatusText('EXTRACTING... ');
    state.setStatusType('warning');

    const shouldCancel = () => currentExtractionIdRef.current !== extractionId;

    if (forceFFmpeg) {
      await runFFmpegExtraction(file, finalTsList, shouldCancel, maxFrameDimension);
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
          maxFrameDimension,
        }
      );

      if (shouldCancel()) return;

      if (frames) {
        // Force garbage collection of old canvases
        state.extractedFrames.forEach((f) => {
          if (f.canvas) {
            f.canvas.width = 0;
            f.canvas.height = 0;
          }
        });
        state.setExtractedFrames(frames);
        state.setIsExtracting(false);
        state.setStatusText('STILLS EXTRACTED. GENERATING POSTER...');
        state.setStatusType('active');
      }
    } catch (err) {
      console.warn('Native video seek/extraction failed. Initiating FFmpeg WASM fallback...', err);
      state.setUseFFmpegFallback(true);
      await runFFmpegExtraction(file, finalTsList, shouldCancel, maxFrameDimension);
    }
  };

  const runFFmpegExtraction = async (file, tsList, shouldCancel, maxFrameDimension) => {
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
          maxFrameDimension,
        }
      );

      if (shouldCancel()) return;

      if (frames) {
        // Force garbage collection of old canvases
        state.extractedFrames.forEach((f) => {
          if (f.canvas) {
            f.canvas.width = 0;
            f.canvas.height = 0;
          }
        });
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

  const handleLandingFileSelect = (file) => {
    handleFileSelect(file);
    setCurrentView('creator');
  };

  const handleStartPrint = (presetStyle, presetCount) => {
    if (presetStyle) {
      state.setStyleMode(presetStyle);
    }
    if (presetCount) {
      state.setCaptureValue(presetCount);
      state.setCaptureMode('count');
    }
    setCurrentView('creator');
  };

  // 3. Handle File Selection
  const handleFileSelect = async (file) => {
    // Reset state for new video
    currentExtractionIdRef.current = null;
    state.setUseFFmpegFallback(false);
    state.setVideoFile(file);
    state.setVideoName(file.name.replace(/\.[^/.]+$/, "").toUpperCase());

    // Force garbage collection of old canvases
    state.extractedFrames.forEach((f) => {
      if (f.canvas) {
        f.canvas.width = 0;
        f.canvas.height = 0;
      }
    });

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

      // Initialize clip range (trim-based modes) and still-frame pointer
      // (Still mode) independently — switching modes must never let one
      // mode's timeline collapse another mode's saved range/position.
      state.setClipStart(0);
      state.setClipEnd(meta.duration);
      state.setStillFrameTime(0);

      // Initialize triptych timestamps at 25%, 50%, 75%
      state.setTriptychTimestamps([
        meta.duration * 0.25,
        meta.duration * 0.5,
        meta.duration * 0.75,
      ]);

      // Trigger extraction with the newly found meta/fps
      const initialTimestamps = state.styleMode === 'triptych'
        ? [meta.duration * 0.25, meta.duration * 0.5, meta.duration * 0.75]
        : state.styleMode === 'still'
        ? [0]
        : calculateTimestamps(
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
      state.setStillFrameTime(0);
      state.setTriptychTimestamps([
        fallbackDuration * 0.25,
        fallbackDuration * 0.5,
        fallbackDuration * 0.75,
      ]);

      const initialTimestamps = state.styleMode === 'still'
        ? [0]
        : calculateTimestamps(
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

  // 3a. Auto-load video from URL query parameter (?video=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const videoUrlParam = params.get('video');
    if (videoUrlParam) {
      setCurrentView('creator');
      state.setStatusText('FETCHING VIDEO...');
      state.setStatusType('warning');

      // Resolve URL relative to the window location if needed
      const resolvedUrl = videoUrlParam.startsWith('http://') || videoUrlParam.startsWith('https://')
        ? videoUrlParam
        : new URL(videoUrlParam, window.location.origin).href;

      fetch(resolvedUrl)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          return res.blob();
        })
        .then((blob) => {
          let filename = 'video.mp4';
          try {
            const urlObj = new URL(resolvedUrl);
            const pathParts = urlObj.pathname.split('/');
            filename = pathParts[pathParts.length - 1] || 'video.mp4';
          } catch {
            const pathParts = resolvedUrl.split('/');
            filename = pathParts[pathParts.length - 1] || 'video.mp4';
          }
          // Clean filename from url query params if any
          filename = filename.split('?')[0];
          const file = new File([blob], filename, { type: blob.type || 'video/mp4' });
          handleFileSelect(file);
        })
        .catch((err) => {
          console.error('Failed to auto-load video from URL:', err);
          state.setStatusText(`FAILED TO AUTO-LOAD VIDEO: ${err.message}`);
          state.setStatusType('error');
        });
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Debounced Re-extraction on Interval / Trim Change
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!state.videoFile) return;

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Cancel any active running extraction process by resetting its Symbol ID.
    currentExtractionIdRef.current = null;

    debounceTimeoutRef.current = setTimeout(() => {
      performExtraction(timestamps);
    }, 400);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [state.captureMode, state.captureValue, state.clipStart, state.clipEnd, state.stillFrameTime, state.triptychTimestamps, state.styleMode]);

  // Calculate maximum available physical frames in the trimmed range
  const activeDuration = state.clipEnd - state.clipStart;
  const availableFrames = state.videoDuration > 0 
    ? Math.max(1, Math.floor(activeDuration * state.videoFps)) 
    : 200;

  // Automatically clamp captureValue to available frames based on video clip trim selection
  useEffect(() => {
    const maxStills = Math.min(200, availableFrames);
    const minStills = Math.min(10, availableFrames);
    if (state.videoFile && state.clipEnd > state.clipStart && state.captureValue > maxStills) {
      state.setCaptureValue(maxStills);
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

        // Use toDataURL to bypass COEP require-corp download restrictions on blob URLs
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        
        const a = document.createElement('a');
        a.style.display = 'none';
        a.download = filename;
        a.href = dataUrl;
        
        // Append to DOM to ensure browser respects the download filename attribute
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        state.setStatusText('EXPORT COMPLETED.');
        state.setStatusType('active');

        // Restore normal scaled-down resolution preview
        drawPoster(canvas, { ...settings, isExport: false });
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
    metadataPosition: state.metadataPosition,
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
    // New settings
    contactSheetBgColor: state.contactSheetBgColor,
    galleryDensity: state.galleryDensity,
    gradientTint: state.gradientTint,
    triptychTimestamps: state.triptychTimestamps,
    metadataSize: state.metadataSize,
  };

  return (
    <div className="app-container">
      {/* Centered Logo Header Navbar */}
      <header className="app-header">
        {/* Left: Navigation links */}
        <nav className="header-nav-left">
          {currentView === 'creator' && (
            <button
              type="button"
              className="nav-back-home-btn"
              onClick={() => setCurrentView('landing')}
            >
              ← HOME
            </button>
          )}
          {currentView === 'checkout' && (
            <button
              type="button"
              className="nav-back-home-btn"
              onClick={() => setCurrentView('creator')}
            >
              ← BUILDER
            </button>
          )}
          {currentView === 'landing' && (
            <>
              <button
                type="button"
                className={`nav-link-marketing${activeModal === 'press' ? ' active' : ''}`}
                onClick={() => setActiveModal('press')}
              >
                PRESS
              </button>
              <button
                type="button"
                className={`nav-link-marketing${activeModal === 'how-it-works' ? ' active' : ''}`}
                onClick={() => setActiveModal('how-it-works')}
              >
                HOW IT WORKS
              </button>
            </>
          )}
        </nav>

        {/* Center: Brand Logo */}
        <div className="header-brand-center" onClick={() => setCurrentView('landing')} style={{ cursor: 'pointer' }}>
          <span className="brand-logo-centered">afterimage</span>
        </div>

        {/* Right: Actions */}
        <div className="header-nav-right">
          <button
            type="button"
            className={`nav-link-marketing${activeModal === 'contact' ? ' active' : ''}`}
            onClick={() => setActiveModal('contact')}
            style={{ marginRight: '16px' }}
          >
            CONTACT
          </button>
          {currentView === 'landing' && (
            <button
              type="button"
              className="landing-header-btn"
              onClick={() => handleStartPrint()}
            >
              START A PRINT
            </button>
          )}
        </div>
      </header>

      {/* Main Content Body Transition Viewport Container */}
      <div className={`app-body-container view-viewport-wrapper view-${currentView}`}>
        {/* Landing View Pane */}
        <div className={`view-pane pane-landing ${currentView === 'landing' ? 'active' : 'inactive'}`}>
          <LandingView
            onFileSelect={handleLandingFileSelect}
            onStartPrint={handleStartPrint}
            onOpenModal={(modalName) => setActiveModal(modalName)}
          />
        </div>

        {/* Creator Workspace View Pane */}
        <div className={`view-pane pane-creator ${currentView === 'creator' ? 'active' : 'inactive'}`}>
          <div className="app-body">
            {/* Left/Top Workspace Area */}
            <PosterPreview
              settings={settings}
              statusText={state.statusText}
              statusType={state.statusType}
              clipStart={state.clipStart}
              setClipStart={state.setClipStart}
              clipEnd={state.clipEnd}
              setClipEnd={state.setClipEnd}
              stillFrameTime={state.stillFrameTime}
              setStillFrameTime={state.setStillFrameTime}
              triptychTimestamps={state.triptychTimestamps}
              setTriptychTimestamps={state.setTriptychTimestamps}
              videoFps={state.videoFps}
              notifications={state.notifications}
            />

            {/* Right/Bottom Sidebar Control Panel */}
            <Sidebar>
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

                  // Force garbage collection of old canvases
                  state.extractedFrames.forEach((f) => {
                    if (f.canvas) {
                      f.canvas.width = 0;
                      f.canvas.height = 0;
                    }
                  });

                  state.setExtractedFrames([]);
                  state.setVideoWidth(0);
                  state.setVideoHeight(0);
                  state.setVideoDuration(0);
                  state.setVideoFps(30);
                  state.setVideoName('STUDIO_CLIP');
                  state.setStatusText('AWAITING VIDEO FILE UPLOAD...');
                  state.setStatusType('warning');

                  // Free cached video memory from FFmpeg virtual filesystem
                  cleanupFFmpeg();
                }}
              />

              <PageControls
                aspectRatio={state.aspectRatio}
                setAspectRatio={state.setAspectRatio}
                styleMode={state.styleMode}
                setStyleMode={state.setStyleMode}
                showCellMetadata={state.showCellMetadata}
                setShowCellMetadata={state.setShowCellMetadata}
                metadataPosition={state.metadataPosition}
                setMetadataPosition={state.setMetadataPosition}
                metadataSize={state.metadataSize}
                setMetadataSize={state.setMetadataSize}
                videoFile={state.videoFile}
                captureValue={state.captureValue}
                setCaptureValue={state.setCaptureValue}
                availableFrames={availableFrames}
              />

              <AdjustControls
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
                randomSeed={state.randomSeed}
                setRandomSeed={state.setRandomSeed}
                totalFrames={state.extractedFrames.length}
                matteMargin={state.matteMargin}
                setMatteMargin={state.setMatteMargin}
                contactSheetBgColor={state.contactSheetBgColor}
                setContactSheetBgColor={state.setContactSheetBgColor}
                galleryDensity={state.galleryDensity}
                setGalleryDensity={state.setGalleryDensity}
              />

              <RenderControls
                colorMode={state.colorMode}
                setColorMode={state.setColorMode}
                paperColor={state.paperColor}
                setPaperColor={state.setPaperColor}
                paperType={state.paperType}
                setPaperType={state.setPaperType}
                gradientTint={state.gradientTint}
                setGradientTint={state.setGradientTint}
              />

              {/* Actions Block inside scrollable panel */}
              <div className="control-section sidebar-actions-block" style={{ marginTop: '36px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  id="btn-export"
                  className="action-btn"
                  disabled={state.extractedFrames.length === 0}
                  onClick={handleExport}
                >
                  EXPORT PRINT FILE (300 PPI)
                </button>
                <button
                  id="btn-add-to-cart"
                  className="action-btn cart-btn-sidebar"
                  disabled={state.extractedFrames.length === 0}
                  onClick={() => setCurrentView('checkout')}
                >
                  BUY
                </button>
              </div>
            </Sidebar>
          </div>
        </div>

        {/* Checkout View Pane */}
        <div className={`view-pane pane-checkout ${currentView === 'checkout' ? 'active' : 'inactive'}`}>
          <div className="app-body">
            <CartView
              state={state}
              settings={settings}
              onBackToCreate={() => setCurrentView('creator')}
            />
          </div>
        </div>
      </div>

      {/* Blurred Overlay Marketing Modals */}
      {activeModal && (
        <div className="editorial-modal-overlay" onClick={() => setActiveModal(null)}>
          <button type="button" className="modal-close-x" onClick={() => setActiveModal(null)}>CLOSE ✕</button>
          <div className="editorial-modal-content" onClick={(e) => e.stopPropagation()}>
            {activeModal === 'how-it-works' && <HowItWorksView onStartPrint={() => { setActiveModal(null); handleStartPrint(); }} />}
            {activeModal === 'press' && <PressView onStartPrint={() => { setActiveModal(null); handleStartPrint(); }} />}
            {activeModal === 'contact' && <ContactView />}
          </div>
        </div>
      )}

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