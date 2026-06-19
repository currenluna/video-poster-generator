import { useState, useRef, useEffect } from 'react';

const SLIDES = [
  {
    id: 'single-still',
    presetStyle: 'still',
    presetCount: 1,
    subtitle: '01 – SINGLE STILL',
    title: 'The one frame.',
    description: 'Pick the single frame that holds it all. Printed full-bleed, clean and quiet.',
    tag: 'SINGLE STILL'
  },
  {
    id: 'contact-sheet',
    presetStyle: 'contact-sheet',
    presetCount: 24,
    subtitle: '02 – CONTACT SHEET',
    title: 'The full sequence.',
    description: 'A structured grid of frames accompanied by camera metrics. The classic chronophotographic study.',
    tag: 'CONTACT SHEET'
  },
  {
    id: 'loop',
    presetStyle: 'loop',
    presetCount: 12,
    subtitle: '03 – LOOP',
    title: 'A rotational path.',
    description: 'A perspective-skewed circle of square-cropped stills mimicking camera rotations in 3D space.',
    tag: 'LOOP'
  },
  {
    id: 'infinite-gallery',
    presetStyle: 'infinite-gallery',
    presetCount: 24,
    subtitle: '04 – INFINITE GALLERY',
    title: 'A focus cascade.',
    description: 'A dynamic composition centering a single key frame while surrounding cells shrink progressively.',
    tag: 'INFINITE GALLERY'
  },
  {
    id: 'triptych',
    presetStyle: 'triptych',
    presetCount: 3,
    subtitle: '05 – TRIPTYCH',
    title: 'Three moments in time.',
    description: 'Three frames side-by-side. Perfect for capturing a brief sequence, a glance, or a transition.',
    tag: 'TRIPTYCH'
  }
];

export default function LandingView({ onFileSelect, onStartPrint, onOpenModal }) {
  const [activeSlide, setActiveSlide] = useState(0);
  const fileInputRef = useRef(null);

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  const handleStartWithPreset = (slide) => {
    onStartPrint(slide.presetStyle, slide.presetCount);
  };

  const nextSlide = () => {
    setActiveSlide((prev) => (prev + 1) % SLIDES.length);
  };

  const prevSlide = () => {
    setActiveSlide((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
  };

  const scrollToSteps = (e) => {
    e.preventDefault();
    const el = document.getElementById('how-it-works-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToFooter = (e) => {
    e.preventDefault();
    const el = document.getElementById('footer-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const currentSlide = SLIDES[activeSlide];

  return (
    <div className="landing-layout">
      {/* Hidden file input for landing upload buttons */}
      <input
        type="file"
        id="landing-video-uploader"
        ref={fileInputRef}
        accept="video/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Hero Section */}
      <section className="landing-hero-section">
        <div className="hero-text-content">
          <span className="hero-tagline">ARCHIVAL PRINTS FROM MOVING IMAGE</span>
          <h1 className="hero-title-serif">
            Every video hides one frame worth keeping <em>forever</em>.
          </h1>
          <p className="hero-subtitle">
            Upload any clip – a wedding, a wrap day, a first trip. We lift the frames and compose them into a museum-grade print, pigment on cotton rag. Five ways to keep the moment.
          </p>
          <div className="hero-actions">
            <button
              type="button"
              className="hero-primary-btn"
              onClick={() => onStartPrint()}
            >
              START A PRINT
            </button>
            <button
              type="button"
              className="hero-secondary-btn"
              style={{ background: 'transparent', border: '1px solid #1c1815', color: '#1c1815', padding: '16px 32px', fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: '800', letterSpacing: '-0.02em', cursor: 'pointer', transition: 'all 0.2s ease' }}
              onClick={() => onOpenModal('how-it-works')}
            >
              HOW IT WORKS →
            </button>
          </div>
        </div>

        <div className="hero-visual-content">
          <div className="hero-photo-wrapper">
            <div className="hero-photo-frame">
              <div className="hero-photo-content">
                {/* Visual Representation of Sunset Frame */}
                <div className="sunset-gradient-bg"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Composition Slider Section */}
      <section className="landing-slider-section">
        <div className="slider-header-block">
          <span className="slider-section-tag">CHOOSE YOUR COMPOSITION</span>
          <h2 className="slider-section-title">
            Five ways to keep <em>the moment</em>.
          </h2>
        </div>

        {/* Tab Selection */}
        <div className="slider-tab-navigation">
          {SLIDES.map((slide, idx) => (
            <button
              key={slide.id}
              type="button"
              className={`slider-tab-btn ${idx === activeSlide ? 'active' : ''}`}
              onClick={() => setActiveSlide(idx)}
            >
              {slide.tag}
            </button>
          ))}
        </div>

        {/* Interactive Slideshow display */}
        <div className="slider-display-area">
          {/* Left Arrow */}
          <button type="button" className="slider-nav-arrow prev" onClick={prevSlide} aria-label="Previous Slide">
            ←
          </button>

          {/* Active framed print preview */}
          <div className="slideshow-stage">
            <div className="slideshow-frame-outer">
              <div className="slideshow-frame-inner">
                {activeSlide === 0 && (
                  /* SINGLE STILL */
                  <div className="mock-layout-still">
                    <div className="mock-stills-frame single-still-content"></div>
                  </div>
                )}
                {activeSlide === 1 && (
                  /* CONTACT SHEET */
                  <div className="mock-layout-contact">
                    {[...Array(12)].map((_, i) => (
                      <div key={i} className="mock-stills-frame contact-cell">
                        <span className="contact-number">{String(i).padStart(3, '0')}</span>
                      </div>
                    ))}
                  </div>
                )}
                {activeSlide === 2 && (
                  /* SPIRAL / RING */
                  <div className="mock-layout-spiral">
                    <div className="spiral-orbit-axis">
                      {[...Array(8)].map((_, i) => {
                        const angle = i * (Math.PI * 2 / 8);
                        const radiusX = 64;
                        const radiusY = 48;
                        const tx = Math.cos(angle) * radiusX;
                        const ty = Math.sin(angle) * radiusY;
                        const depthScale = 1 - (Math.sin(angle) * 0.18);
                        return (
                          <div
                            key={i}
                            className="mock-stills-frame spiral-ring-cell"
                            style={{
                              transform: `translate(${tx}px, ${ty}px) scale(${depthScale})`,
                              zIndex: Math.round((1 - Math.sin(angle)) * 10)
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
                {activeSlide === 3 && (
                  /* INFINITE GALLERY */
                  <div className="mock-layout-gallery">
                    <div className="mock-stills-frame gallery-cell small c1"></div>
                    <div className="mock-stills-frame gallery-cell small c2"></div>
                    <div className="mock-stills-frame gallery-cell large center-cell"></div>
                    <div className="mock-stills-frame gallery-cell small c3"></div>
                    <div className="mock-stills-frame gallery-cell small c4"></div>
                  </div>
                )}
                {activeSlide === 4 && (
                  /* TRIPTYCH */
                  <div className="mock-layout-triptych">
                    <div className="mock-stills-frame triptych-1"></div>
                    <div className="mock-stills-frame triptych-2"></div>
                    <div className="mock-stills-frame triptych-3"></div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Arrow */}
          <button type="button" className="slider-nav-arrow next" onClick={nextSlide} aria-label="Next Slide">
            →
          </button>
        </div>

        {/* Slide text descriptions */}
        <div className="slider-caption-block">
          <span className="slide-meta-subtitle">{currentSlide.subtitle}</span>
          <h3 className="slide-main-title">{currentSlide.title}</h3>
          <p className="slide-description-text">{currentSlide.description}</p>
        </div>

        {/* Indicator dots */}
        <div className="slider-indicator-dots">
          {SLIDES.map((_, idx) => (
            <button
              key={idx}
              type="button"
              className={`indicator-dot-btn ${idx === activeSlide ? 'active' : ''}`}
              onClick={() => setActiveSlide(idx)}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>

        {/* Slide CTA Button */}
        <div className="slider-action-wrapper">
          <button
            type="button"
            className="slider-cta-btn"
            onClick={() => handleStartWithPreset(currentSlide)}
          >
            START WITH THIS STYLE →
          </button>
        </div>
      </section>

      {/* Steps overview */}
      <section id="how-it-works-section" className="landing-steps-section">
        <div className="steps-header-block">
          <span className="steps-section-tag">FROM CLIP TO WALL – IN THREE STEPS</span>
          <h2 className="steps-section-title">Simpler than it sounds.</h2>
        </div>

        <div className="steps-grid-columns">
          <div className="step-column">
            <span className="step-number">01</span>
            <h3 className="step-title">Upload your video</h3>
            <p className="step-text">
              Any clip, any phone. We extract every frame in crisp, full resolution.
            </p>
          </div>
          <div className="step-column">
            <span className="step-number">02</span>
            <h3 className="step-title">Compose your print</h3>
            <p className="step-text">
              Choose a composition, pick your frames, set the size and paper. Preview as you go.
            </p>
          </div>
          <div className="step-column">
            <span className="step-number">03</span>
            <h3 className="step-title">We print & ship it</h3>
            <p className="step-text">
              Hand-finished by theprintspace in London on archival stock, delivered to your door.
            </p>
          </div>
        </div>

        <div className="steps-end-cta">
          <h2 className="steps-cta-headline">
            Start with a video. End with an <em>heirloom</em>.
          </h2>
          <button
            type="button"
            className="steps-cta-btn"
            onClick={() => onStartPrint()}
          >
            START CREATING
          </button>
        </div>
      </section>

      {/* Footer Section */}
      <footer id="footer-section" className="landing-footer">
        <div className="footer-top-grid">
          <div className="footer-brand-column">
            <span className="footer-logo">afterimage</span>
            <p className="footer-brand-desc">
              Fine-art prints made from the moving image. Hand-finished, archival, made to outlast us.
            </p>
          </div>

          <div className="footer-links-column">
            <span className="footer-col-title">EXPLORE</span>
            <button type="button" className="footer-text-btn" style={{ display: 'block', marginBottom: '8px' }} onClick={() => onOpenModal('how-it-works')}>How it works</button>
            <button type="button" className="footer-text-btn" style={{ display: 'block', marginBottom: '8px' }} onClick={() => onOpenModal('press')}>Press</button>
            <button type="button" className="footer-text-btn" style={{ display: 'block', marginBottom: '8px' }} onClick={() => onOpenModal('contact')}>Contact</button>
            <button type="button" className="footer-text-btn" style={{ display: 'block', marginBottom: '8px' }} onClick={() => onStartPrint()}>Start a print</button>
          </div>

          <div className="footer-links-column">
            <span className="footer-col-title">THE PRESS</span>
            <a href="#paper" onClick={(e) => e.preventDefault()}>Paper & pigment</a>
            <a href="#sizes" onClick={(e) => e.preventDefault()}>Editions & sizes</a>
            <a href="#shipping" onClick={(e) => e.preventDefault()}>Shipping & returns</a>
          </div>
        </div>
        <div className="footer-bottom-bar">
          <span className="footer-copyright">© {new Date().getFullYear()} AFTERIMAGE. ALL RIGHTS RESERVED.</span>
        </div>
      </footer>
    </div>
  );
}
