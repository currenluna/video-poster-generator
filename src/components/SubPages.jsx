import { useState } from 'react';

export function HowItWorksView({ onStartPrint }) {
  return (
    <div className="subpage-container">
      <section className="editorial-section">
        <span className="subpage-tag">01 / THE SCIENCE OF THE IMAGE</span>
        <h1 className="subpage-title">How It Works</h1>
        <p className="subpage-lead">
          We bridge the gap between dynamic digital cinematography and traditional museum-grade printmaking, transforming your fleeting video moments into physical heirlooms.
        </p>

        <div className="how-it-works-grid">
          <div className="how-card">
            <span className="how-card-num">01 /</span>
            <h3>Extracting the Frames</h3>
            <p>
              When you upload a clip, our system parses its physical frame rate using high-performance browser decoding or WebAssembly. We extract frames at precise timestamps in their original native camera resolution, with support for ProRes, Log, and standard formats.
            </p>
          </div>

          <div className="how-card">
            <span className="how-card-num">02 /</span>
            <h3>Composing the Layout</h3>
            <p>
              Select from five distinct layout solvers. Whether aligning stills in a traditional contact sheet grid, skewing them on a 3D orbit ring, or creating a proportional focus cascade, our custom math engines scale and position frames relative to your exact paper dimensions.
            </p>
          </div>

          <div className="how-card">
            <span className="how-card-num">03 /</span>
            <h3>Archival Printmaking</h3>
            <p>
              Each print is hand-finished in London by theprintspace. We use 100% cotton-rag, acid-free Hanemühle paper and professional pigment-based inks. This museum-quality combination prevents fading and preserves detail for over 100 years.
            </p>
          </div>
        </div>

        <div className="subpage-action-block">
          <h2>Ready to start your chronophotographic study?</h2>
          <button
            type="button"
            className="hero-primary-btn"
            onClick={() => onStartPrint()}
          >
            START A PRINT STUDY
          </button>
        </div>
      </section>
    </div>
  );
}

export function PressView({ onStartPrint }) {
  const PRESS_QUOTES = [
    {
      publication: 'KINFOLK',
      quote: 'AFTERIMAGE elevates simple video clips into striking, tactile physical objects. It is a beautiful celebration of chronophotographic history, turning everyday screen records into fine art.',
      date: 'ISSUE 48'
    },
    {
      publication: 'WALLPAPER*',
      quote: 'The layouts—especially the perspective-skewed 3D spiral and progressive cascades—are masterpieces of minimalist UI design. Fine-art prints at their absolute finest.',
      date: 'SEPTEMBER 2026'
    },
    {
      publication: 'HYPEBEAST',
      quote: 'Turns raw video clips into high-end gallery wall art. Simple, elegant, and intensely cinematic. A must-have for modern directors and archivists.',
      date: 'JUNE 2026'
    },
    {
      publication: 'CEREAL',
      quote: 'An elegant exercise in print formatting. The soft paper tones and space-mono metadata overlays create a perfect balance between technical precision and warm domestic design.',
      date: 'VOLUME 22'
    },
    {
      publication: 'NOWNESS',
      quote: 'Captures the fluid movement of film and halts it on museum-grade cotton rag. AFTERIMAGE is redefining how we keep memories from the moving image.',
      date: 'JULY 2026'
    }
  ];

  return (
    <div className="subpage-container">
      <section className="editorial-section">
        <span className="subpage-tag">02 / EDITORIAL OPINION</span>
        <h1 className="subpage-title">In the Press</h1>
        <p className="subpage-lead">
          Design critics, film directors, and printmakers agree: AFTERIMAGE is bringing the depth of cinematic history into modern living spaces.
        </p>

        <div className="press-quotes-grid">
          {PRESS_QUOTES.map((pq, idx) => (
            <div key={idx} className="press-card">
              <span className="press-pub">{pq.publication}</span>
              <p className="press-quote">“{pq.quote}”</p>
              <span className="press-date">{pq.date}</span>
            </div>
          ))}
        </div>

        <div className="subpage-action-block">
          <h2>Convert your cinematic moments today.</h2>
          <button
            type="button"
            className="hero-primary-btn"
            onClick={() => onStartPrint()}
          >
            UPLOAD A VIDEO CLIP
          </button>
        </div>
      </section>
    </div>
  );
}

export function ContactView() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="subpage-container">
      <section className="editorial-section contact-section-wrapper">
        <span className="subpage-tag">03 / CORRESPONDENCE</span>
        <h1 className="subpage-title">Contact Us</h1>
        <p className="subpage-lead">
          Have questions about sizing, print editions, custom sizing, or bulk shipping? Send us a message and our gallery staff will get back to you.
        </p>

        {submitted ? (
          <div className="contact-success-box">
            <h3>Thank You</h3>
            <p>Your message has been transmitted successfully. We will reply within 24 hours.</p>
          </div>
        ) : (
          <form className="contact-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="contact-name">FULL NAME</label>
              <input type="text" id="contact-name" required placeholder="e.g. Jean-Luc Godard" />
            </div>

            <div className="form-group">
              <label htmlFor="contact-email">EMAIL ADDRESS</label>
              <input type="email" id="contact-email" required placeholder="e.g. director@nouvellevague.fr" />
            </div>

            <div className="form-group">
              <label htmlFor="contact-message">MESSAGE</label>
              <textarea id="contact-message" rows={6} required placeholder="State your inquiry..." />
            </div>

            <button type="submit" className="contact-submit-btn">
              SEND INQUIRY →
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
