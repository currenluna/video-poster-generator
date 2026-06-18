import { useRef, useState, useEffect } from 'react';

/**
 * ThumbnailPreview — Renders the first frame canvas to a small canvas.
 */
function ThumbnailPreview({ canvas }) {
  const thumbnailCanvasRef = useRef(null);

  useEffect(() => {
    const destCanvas = thumbnailCanvasRef.current;
    if (destCanvas && canvas) {
      destCanvas.width = canvas.width;
      destCanvas.height = canvas.height;
      const ctx = destCanvas.getContext('2d');
      ctx.drawImage(canvas, 0, 0);
    }
  }, [canvas]);

  return <canvas ref={thumbnailCanvasRef} className="thumbnail-canvas" />;
}

/**
 * SourceUpload — Drag-and-drop upload zone and video info display.
 *
 * 💡 Svelte comparison:
 *    Ref binding:
 *      In Svelte: <input bind:this={inputEl} />
 *      In React: const inputEl = useRef(null); <input ref={inputEl} />
 *
 *    Dragover classes:
 *      In Svelte: class:dragover={isDragOver}
 *      In React: className={`drop-zone${isDragOver ? ' dragover' : ''}`}
 */
export default function SourceUpload({
  videoFile,
  videoDuration,
  videoFps,
  videoWidth,
  videoHeight,
  onFileSelect,
  isExtracting,
  extractedFrames,
  onDelete,
}) {
  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleClick = () => {
    fileInputRef.current.click();
  };

  const handleReplaceClick = (e) => {
    e.stopPropagation();
    fileInputRef.current.click();
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  // Truncate filename for display
  const displayName = videoFile
    ? videoFile.name.length > 16
      ? videoFile.name.substring(0, 16) + '...'
      : videoFile.name
    : '';

  const showThumbnail = videoFile && extractedFrames && extractedFrames.length > 0;

  return (
    <section className="control-section">
      <h2>01 / SOURCE</h2>

      <input
        type="file"
        id="video-input"
        ref={fileInputRef}
        accept="video/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {isExtracting ? (
        <div className="upload-zone loading-zone">
          <div className="spinner"></div>
          <p className="upload-text">PROCESSING VIDEO...</p>
          <p className="upload-sub">EXTRACTING STILL FRAMES</p>
        </div>
      ) : showThumbnail ? (
        <div className="thumbnail-zone">
          <ThumbnailPreview canvas={extractedFrames[0].canvas} />
          <div className="thumbnail-overlay">
            <div className="thumbnail-header">
              <button
                type="button"
                className="btn-delete"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                title="Delete Video"
              >
                ✕
              </button>
            </div>
            <div className="thumbnail-footer">
              <span className="thumbnail-filename" title={videoFile.name}>{displayName}</span>
              <button
                type="button"
                className="btn-replace"
                onClick={handleReplaceClick}
              >
                Replace
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          id="drop-zone"
          className={`upload-zone${isDragOver ? ' dragover' : ''}`}
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <span className="upload-icon">＋</span>
          <p className="upload-text">DRAG VIDEO FILE HERE OR CLICK TO BROWSE</p>
          <p className="upload-sub">SUPPORTED FORMATS: MP4, MOV, WEBM, MKV (MAX 500MB)</p>
        </div>
      )}

      {videoFile && !isExtracting && (
        <div id="video-info" className="video-info-box">
          <div className="info-row">
            <span className="info-label">FILE:</span>
            <span id="info-filename" className="info-value">{displayName}</span>
          </div>
          <div className="info-row">
            <span className="info-label">DURATION:</span>
            <span id="info-duration" className="info-value">{videoDuration.toFixed(1)}S</span>
          </div>
          <div className="info-row">
            <span className="info-label">FPS:</span>
            <span id="info-fps" className="info-value">{Math.round(videoFps)} FPS</span>
          </div>
          {videoWidth > 0 && videoHeight > 0 && (
            <div className="info-row">
              <span className="info-label">RESOLUTION:</span>
              <span className="info-value">{videoWidth}x{videoHeight}</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}