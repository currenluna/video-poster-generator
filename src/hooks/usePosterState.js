import { useState } from 'react';

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
  
  const [aspectRatio, setAspectRatio] = useState('24x36');
  const [captureMode, setCaptureMode] = useState('seconds');
  const [captureValue, setCaptureValue] = useState(2);
  const [colorMode, setColorMode] = useState('bw');
  const [layoutMode, setLayoutMode] = useState('auto');
  const [manualColumns, setManualColumns] = useState(4);
  const [gapSize, setGapSize] = useState(10);
  const [matteMargin, setMatteMargin] = useState(12);
  const [labelType, setLabelType] = useState('seq');
  const [customMeta, setCustomMeta] = useState('');
  const [exportFormat, setExportFormat] = useState('jpeg');
  
  const [statusText, setStatusText] = useState('AWAITING VIDEO FILE UPLOAD...');
  const [statusType, setStatusType] = useState('warning'); // 'warning', 'active', 'error'

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
    labelType, setLabelType,
    customMeta, setCustomMeta,
    exportFormat, setExportFormat,
    statusText, setStatusText,
    statusType, setStatusType,
  };
}