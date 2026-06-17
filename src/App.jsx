import { useEffect, useRef } from 'react';
import usePosterState from './hooks/usePosterState';
import Sidebar from './components/Sidebar';
import StatusBar from './components/StatusBar';
import SourceUpload from './components/SourceUpload';
import FramingControls from './components/FramingControls';
import GridControls from './components/GridControls';
import RenderControls from './components/RenderControls';
import EditionControls from './components/EditionControls';
import PosterPreview from './components/PosterPreview';
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
    state.videoFps
  );

  // 2. Perform Frame Extraction
  const performExtraction = async (tsList) => {
    if (!state.videoFile) return;

    const extractionId = Symbol('extractionId');
    currentExtractionIdRef.current = extractionId;
    
    state.setIsExtracting(true);
    state.setExtractedFrames([]);
    state.setStatusText('EXTRACTING... ');
    state.setStatusType('warning');

    const shouldCancel = () => currentExtractionIdRef.current !== extractionId;

    if (state.useFFmpegFallback) {
      await runFFmpegExtraction(tsList, shouldCancel);
      return;
    }

    // Attempt Native Decoder
    try {
      const video = hiddenVideoRef.current;
      const frames = await extractFramesNative(
        video,
        tsList,
        state.videoWidth,
        state.videoHeight,
        state.videoFps,
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
      await runFFmpegExtraction(tsList, shouldCancel);
    }
  };

  const runFFmpegExtraction = async (tsList, shouldCancel) => {
    try {
      const frames = await extractFramesFFmpeg(
        state.videoFile,
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

      // Default the metadata footer title to uppercase filename
      const title = file.name.substring(0, 30).toUpperCase();
      state.setCustomMeta(title);

      state.setStatusText('DETECTING VIDEO FRAME RATE...');
      const detectedFps = await detectFrameRate(video);
      state.setVideoFps(detectedFps);

      // Trigger extraction with the newly found meta/fps
      const initialTimestamps = calculateTimestamps(
        meta.duration,
        state.captureMode,
        state.captureValue,
        detectedFps
      );
      performExtraction(initialTimestamps);
    } catch (err) {
      console.error('Failed to load video natively:', err);
      state.setUseFFmpegFallback(true);
      state.setStatusText('NATIVE LOAD FAILED. INITIATING FFMPEG DECODER...');
      state.setStatusType('warning');
      // FFmpeg will extract dimensions on-the-fly, so trigger now
      const initialTimestamps = calculateTimestamps(
        state.videoDuration || 10,
        state.captureMode,
        state.captureValue,
        state.videoFps
      );
      performExtraction(initialTimestamps);
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
  }, [state.captureMode, state.captureValue]);

  // Redraw poster on simple aesthetic option changes (without re-extracting frames)
  useEffect(() => {
    if (state.extractedFrames.length > 0) {
      state.setStatusText('POSTER UPDATED.');
      state.setStatusType('active');
    }
  }, [
    state.aspectRatio,
    state.matteMargin,
    state.gapSize,
    state.layoutMode,
    state.manualColumns,
    state.colorMode,
    state.labelType,
    state.customMeta,
  ]);

  // 4. Handle Export
  const handleExport = () => {
    if (state.extractedFrames.length === 0) return;

    state.setStatusText('PREPARING 300 PPI FILE...');
    state.setStatusType('warning');

    setTimeout(() => {
      try {
        const canvas = document.getElementById('poster-canvas');
        if (!canvas) throw new Error('Canvas element not found.');

        const format = state.exportFormat === 'png' ? 'image/png' : 'image/jpeg';
        const ext = state.exportFormat === 'png' ? 'png' : 'jpg';
        const res = RESOLUTIONS[state.aspectRatio];
        const filename = `motion_study_${state.aspectRatio}_${res.width}x${res.height}.${ext}`;

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
        }, format, 0.95);
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
    layoutMode: state.layoutMode,
    manualColumns: state.manualColumns,
    colorMode: state.colorMode,
    labelType: state.labelType,
    videoWidth: state.videoWidth,
    videoHeight: state.videoHeight,
    videoDuration: state.videoDuration,
    captureMode: state.captureMode,
    captureValue: state.captureValue,
    customMeta: state.customMeta,
  };

  return (
    <div className="app-container">
      {/* Sidebar Control Panel */}
      <Sidebar onExport={handleExport} exportDisabled={state.extractedFrames.length === 0}>
        
        <SourceUpload
          videoFile={state.videoFile}
          videoDuration={state.videoDuration}
          videoFps={state.videoFps}
          videoWidth={state.videoWidth}
          videoHeight={state.videoHeight}
          onFileSelect={handleFileSelect}
        />

        <FramingControls
          captureMode={state.captureMode}
          setCaptureMode={state.setCaptureMode}
          captureValue={state.captureValue}
          setCaptureValue={state.setCaptureValue}
          estimatedStillsCount={timestamps.length}
        />

        <GridControls
          layoutMode={state.layoutMode}
          setLayoutMode={state.setLayoutMode}
          manualColumns={state.manualColumns}
          setManualColumns={state.setManualColumns}
          gapSize={state.gapSize}
          setGapSize={state.setGapSize}
          matteMargin={state.matteMargin}
          setMatteMargin={state.setMatteMargin}
        />

        <RenderControls
          colorMode={state.colorMode}
          setColorMode={state.setColorMode}
          labelType={state.labelType}
          setLabelType={state.setLabelType}
        />

        <EditionControls
          aspectRatio={state.aspectRatio}
          setAspectRatio={state.setAspectRatio}
          customMeta={state.customMeta}
          setCustomMeta={state.setCustomMeta}
        />
      </Sidebar>

      {/* Right Canvas Preview Area */}
      <PosterPreview
        settings={settings}
        statusText={state.statusText}
        statusType={state.statusType}
      />

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