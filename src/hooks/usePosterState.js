import { useState, useEffect, useRef } from 'react';

/**
 * usePosterState — Custom hook managing all the reactive state of the app.
 *
 * 💡 Svelte comparison:
 *    In Svelte, this is just a bunch of variables declared with `let` in App.svelte.
 *    In React, we use `useState` for each state variable, and return them from a custom hook.
 */
export default function usePosterState() {
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoWidth, setVideoWidth] = useState(0);
  const [videoHeight, setVideoHeight] = useState(0);
  const [videoFps, setVideoFps] = useState(30);

  const [extractedFrames, setExtractedFrames] = useState([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [useFFmpegFallback, setUseFFmpegFallback] = useState(false);
  
  const [aspectRatio, setAspectRatio] = useState('27x36');
  const [captureMode, setCaptureMode] = useState('count');
  const [captureValue, setCaptureValue] = useState(85);
  const [colorMode, setColorMode] = useState('color');
  const [layoutMode, setLayoutMode] = useState('auto');
  const [manualColumns, setManualColumns] = useState(4);
  const [gapSize, setGapSize] = useState(40);
  const [matteMargin, setMatteMargin] = useState(10);
  const [scaleRandomness, setScaleRandomness] = useState(0); // 0% to 30%
  const [positionRandomness, setPositionRandomness] = useState(0); // 0px to 30px
  const [paperColor, setPaperColor] = useState('white');
  const [clipStart, setClipStart] = useState(0);
  const [clipEnd, setClipEnd] = useState(0);
  const [stillFrameTime, setStillFrameTime] = useState(0); // independent timeline position for Still mode
  const [rotationRandomness, setRotationRandomness] = useState(0); // 0 to 15 degrees
  const [alternateMirror, setAlternateMirror] = useState(false);
  const [styleMode, setStyleMode] = useState('still'); // 'still' | 'contact-sheet' | 'loop' | 'infinite-gallery' | 'triptych'
  const [ringRotation, setRingRotation] = useState(0); // 0 to 360 degrees (Loop spin)
  const [ringTiltX, setRingTiltX] = useState(-45); // -90 to 90 degrees (Loop pitch)
  const [ringTiltY, setRingTiltY] = useState(0); // -90 to 90 degrees (Loop yaw)
  const [zoomFocusIndex, setZoomFocusIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1.6); // Zoom factor multiplier (0.0 to 4.0)
  const [showCellMetadata, setShowCellMetadata] = useState(false);
  const [metadataPosition, setMetadataPosition] = useState('top-right'); // 'top-right' | 'bottom-left'
  const [metadataSize, setMetadataSize] = useState(5); // base font size
  const [videoName, setVideoName] = useState('STUDIO_CLIP');
  const [showGridBackground, setShowGridBackground] = useState(true);
  const [randomSeed, setRandomSeed] = useState(1);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // New global state for mode-specific controls
  const [paperType, setPaperType] = useState('matte'); // 'matte' | 'glossy' | 'luster'
  const [gradientTint, setGradientTint] = useState('dusk-blue'); // curated gradient profile
  const [contactSheetBgColor, setContactSheetBgColor] = useState('transparent'); // contact sheet fill
  const [galleryDensity, setGalleryDensity] = useState(50); // 10–100
  const [triptychTimestamps, setTriptychTimestamps] = useState([0, 0, 0]); // [t1, t2, t3]
  
  const [statusText, setStatusText] = useState('AWAITING VIDEO FILE UPLOAD...');
  const [statusType, setStatusType] = useState('warning'); // 'warning', 'active', 'error'
  
  const [notifications, setNotifications] = useState([]);
  const lastNotificationRef = useRef(null);
  const lastProcessedRef = useRef({ text: null, timestamp: 0 });

  // Monitor status changes and convert them to animated stacked notifications
  useEffect(() => {
    if (!statusText) return;

    // Skip duplicate events that fire within 150ms of each other (prevents StrictMode double-rendering duplicates)
    if (lastProcessedRef.current.text === statusText && Date.now() - lastProcessedRef.current.timestamp < 150) {
      return;
    }
    lastProcessedRef.current = { text: statusText, timestamp: Date.now() };

    // Categorize progress indicators to update in-place instead of flooding the stack
    const isProg = statusText.startsWith('EXTRACTING') || 
                   statusText.startsWith('FFMPEG DECODING') || 
                   statusText.startsWith('LOADING') || 
                   statusText.startsWith('DETECTING') ||
                   statusText.startsWith('PREPARING');

    const lastNotif = lastNotificationRef.current;
    const lastIsProg = lastNotif && (
      lastNotif.text.startsWith('EXTRACTING') || 
      lastNotif.text.startsWith('FFMPEG DECODING') || 
      lastNotif.text.startsWith('LOADING') || 
      lastNotif.text.startsWith('DETECTING') ||
      lastNotif.text.startsWith('PREPARING')
    );

    const id = (isProg && lastIsProg) ? lastNotif.id : Math.random().toString(36).substring(2, 9);
    const timestamp = Date.now();

    lastNotificationRef.current = { id, text: statusText, type: statusType };

    setNotifications((prev) => {
      if (isProg && lastIsProg) {
        const updated = [...prev];
        const idx = updated.findIndex((n) => n.id === id);
        if (idx !== -1) {
          updated[idx] = {
            id,
            text: statusText,
            type: statusType,
            fadeState: 'in',
            timestamp
          };
          return updated;
        }
      }
      return [...prev, { id, text: statusText, type: statusType, fadeState: 'in', timestamp }];
    });

    // Schedule fade out after 4.2 seconds
    setTimeout(() => {
      setNotifications((prev) => {
        const notif = prev.find((n) => n.id === id);
        if (notif && notif.timestamp === timestamp) {
          return prev.map((n) => n.id === id ? { ...n, fadeState: 'out' } : n);
        }
        return prev;
      });
    }, 4200);

    // Schedule complete unmounting after 4.5 seconds (leaving 300ms for exit slide animation)
    setTimeout(() => {
      setNotifications((prev) => {
        const notif = prev.find((n) => n.id === id);
        if (notif && notif.timestamp === timestamp) {
          return prev.filter((n) => n.id !== id);
        }
        return prev;
      });
    }, 4500);

  }, [statusText, statusType]);

  return {
    videoFile, setVideoFile,
    videoUrl, setVideoUrl,
    videoDuration, setVideoDuration,
    videoWidth, setVideoWidth,
    videoHeight, setVideoHeight,
    videoFps, setVideoFps,
    extractedFrames, setExtractedFrames,
    isExtracting, setIsExtracting,
    useFFmpegFallback, setUseFFmpegFallback,
    aspectRatio, setAspectRatio,
    captureMode, setCaptureMode,
    captureValue, setCaptureValue,
    colorMode, setColorMode,
    layoutMode, setLayoutMode,
    manualColumns, setManualColumns,
    gapSize, setGapSize,
    matteMargin, setMatteMargin,
    scaleRandomness, setScaleRandomness,
    positionRandomness, setPositionRandomness,
    paperColor, setPaperColor,
    clipStart, setClipStart,
    clipEnd, setClipEnd,
    stillFrameTime, setStillFrameTime,
    rotationRandomness, setRotationRandomness,
    alternateMirror, setAlternateMirror,
    styleMode, setStyleMode,
    ringRotation, setRingRotation,
    ringTiltX, setRingTiltX,
    ringTiltY, setRingTiltY,
    zoomFocusIndex, setZoomFocusIndex,
    zoomLevel, setZoomLevel,
    showCellMetadata, setShowCellMetadata,
    metadataPosition, setMetadataPosition,
    metadataSize, setMetadataSize,
    videoName, setVideoName,
    showGridBackground, setShowGridBackground,
    randomSeed, setRandomSeed,
    isCheckoutOpen, setIsCheckoutOpen,
    paperType, setPaperType,
    gradientTint, setGradientTint,
    contactSheetBgColor, setContactSheetBgColor,
    galleryDensity, setGalleryDensity,
    triptychTimestamps, setTriptychTimestamps,
    notifications,
    statusText, setStatusText,
    statusType, setStatusType,
  };
}