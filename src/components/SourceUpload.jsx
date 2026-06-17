import { useRef, useState } from 'react';

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
}) {
  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleClick = () => {
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

  return (
    <section className="control-section">
      <h2>01 / SOURCE</h2>

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
        <input
          type="file"
          id="video-input"
          ref={fileInputRef}
          accept="video/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>

      {videoFile && (
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