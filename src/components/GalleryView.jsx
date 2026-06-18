import { RESOLUTIONS } from '../utils/constants';

const MOCK_CREATIONS = [
  {
    id: 'study-01',
    title: 'RUNNING HORSE STUDY',
    videoName: 'MUYBRIDGE_HORSE.MP4',
    date: '2026-06-12',
    aspectRatio: '36x27',
    stillsCount: 85,
    colorMode: 'bw',
    matteMargin: 10,
    gapSize: 40,
    thumbGradient: 'linear-gradient(135deg, #2a2a2a 25%, transparent 25%) -50px 0, linear-gradient(225deg, #2a2a2a 25%, transparent 25%) -50px 0, linear-gradient(315deg, #2a2a2a 25%, transparent 25%), linear-gradient(45deg, #2a2a2a 25%, transparent 25%)',
  },
  {
    id: 'study-02',
    title: 'BALLERINA PIROUETTE',
    videoName: 'DANCE_STUDIO_04.MOV',
    date: '2026-06-15',
    aspectRatio: '27x36',
    stillsCount: 60,
    colorMode: 'color',
    matteMargin: 12,
    gapSize: 20,
    thumbGradient: 'radial-gradient(circle, #333 10%, transparent 11%), radial-gradient(circle, #333 10%, transparent 11%)',
  },
  {
    id: 'study-03',
    title: 'OCEAN WAVE CRASH',
    videoName: 'MAUI_DRONE_WAVE.MP4',
    date: '2026-06-17',
    aspectRatio: '24x24',
    stillsCount: 100,
    colorMode: 'color',
    matteMargin: 8,
    gapSize: 30,
    thumbGradient: 'linear-gradient(45deg, #222 25%, transparent 25%), linear-gradient(-45deg, #222 25%, transparent 25%), linear-gradient(135deg, #222 25%, transparent 25%), linear-gradient(-135deg, #222 25%, transparent 25%)',
  },
];

export default function GalleryView({ state }) {
  const handleLoadMock = (creation) => {
    // Apply layout preferences of this past creation
    state.setAspectRatio(creation.aspectRatio);
    state.setCaptureValue(creation.stillsCount);
    state.setColorMode(creation.colorMode);
    state.setMatteMargin(creation.matteMargin);
    state.setGapSize(creation.gapSize);
    state.setCustomMeta(creation.title);
    
    // Switch to create mode
    state.setActiveTab('create');
    
    state.setStatusText(`LOADED PAST STUDY: ${creation.title}`);
    state.setStatusType('active');
  };

  return (
    <div className="gallery-view-container">
      <div className="gallery-header">
        <h2>PAST CREATIONS</h2>
        <p>RE-OPEN OR EXPORT PREVIOUS MOTION STUDIES</p>
      </div>

      <div className="gallery-grid">
        {MOCK_CREATIONS.map((c) => {
          const res = RESOLUTIONS[c.aspectRatio];
          const isLandscape = c.aspectRatio.startsWith('36');
          const isSquare = c.aspectRatio === '24x24';
          
          return (
            <div key={c.id} className="creation-card">
              <div className="creation-thumb-container">
                <div 
                  className={`creation-thumb-mock ${isLandscape ? 'landscape' : isSquare ? 'square' : 'portrait'}`}
                  style={{
                    background: '#1a1a1a',
                    backgroundImage: c.thumbGradient,
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 0 0, 10px 10px, 10px 10px',
                    border: '8px solid #ffffff',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  }}
                >
                  {/* Stylized grid pattern representation */}
                  <div className="thumb-label">STUDY</div>
                </div>
              </div>

              <div className="creation-details">
                <h3>{c.title}</h3>
                <p className="creation-meta">
                  {c.videoName} • {c.stillsCount} STILLS
                </p>
                <p className="creation-size">
                  SIZE: {res ? res.label.split(' (')[0] : 'Custom'}
                </p>
                
                <button 
                  type="button" 
                  className="load-btn" 
                  onClick={() => handleLoadMock(c)}
                >
                  LOAD IN BUILDER
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
