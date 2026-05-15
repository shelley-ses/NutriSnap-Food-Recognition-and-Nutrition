import React from 'react'
import HeroThreeScene from '../components/HeroThreeScene'
import Features from '../components/Features'
import sammichUrl from '../src/components/sammich.glb'
import landingBackground from '../src/assets/landingBackground.png'
import useLenis from '../hooks/useLenis'

export default function LandingPage() {
  useLenis()
  return (
    <div style={{ fontFamily: "'Unbounded', sans-serif", background: '#2d5a27', margin: 0, padding: 0 }}>

      {/* ── HERO STICKY SECTION ── */}
      <div
        id="hero-story"
        style={{
          position: 'relative',
          width: '100%',
          height: '200vh',
        }}
      >
        {/* Sticky container (CSS handles pinning) */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            width: '100%',
            height: '100vh',
            overflow: 'hidden',
            backgroundColor: '#2d5a27',
            backgroundImage: `url(${landingBackground})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          {/* ── NAV ── */}
          <nav
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'center',
              gap: '48px',
              padding: '60px 40px 28px',
              zIndex: 10,
            }}
          >
            {['Features', 'How It Works', 'About Us'].map((item) => (
              <a
                key={item}
                href={item === 'Features' ? '#features' : '#'}
                style={{
                  color: 'rgba(255,255,255,0.85)',
                  textDecoration: 'none',
                  fontSize: '16px',
                  fontWeight: 500,
                  letterSpacing: '0.04em',
                  transition: 'color 0.2s',
                }}
                onMouseOver={e => e.target.style.color = '#fff'}
                onMouseOut={e => e.target.style.color = 'rgba(255,255,255,0.85)'}
              >
                {item}
              </a>
            ))}
          </nav>

          {/* ── NUTRISNAP TITLE + TAGLINE ──
              Initial state: centered horizontally, sitting in the lower-middle.
              On scroll: translates left via GSAP (handled in HeroThreeScene). */}
          <div
            id="bg-title"
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              zIndex: 5,
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            <h1
              style={{
                margin: 0,
                fontSize: 'clamp(44px, 7.6vw, 112px)',
                fontWeight: 900,
                color: '#ffffff',
                lineHeight: 1,
                letterSpacing: '-0.02em',
                textTransform: 'uppercase',
                textShadow: '0 2px 2px rgba(0, 0, 0, 0.45), 0 4px 2px rgba(0, 0, 0, 0.25)',
              }}
            >
              NUTRISNAP
            </h1>
            <p
              id="tagline"
              style={{
                margin: '12px 0 0',
                fontSize: 'clamp(14px, 1.2vw, 18px)',
                fontWeight: 600,
                color: 'rgba(255,255,255,0.8)',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                textAlign: 'center',
              }}
            >
              SEE IT. SNAP IT. KNOW IT.
            </p>
          </div>

          <div
            id="cta-btn"
            style={{
              position: 'absolute',
              left: '50%',
              top: '38%',
              transform: 'translate(-50%, calc(-50% + 0px))',
              zIndex: 6,
              opacity: 0,
              pointerEvents: 'none',
            }}
          >
            <button
              style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #e9ffdf 100%)',
                border: 'none',
                borderRadius: '999px',
                color: '#2f6b16',
                fontSize: '15px',
                fontWeight: 800,
                letterSpacing: '0.1em',
                padding: '12px 36px',
                textTransform: 'uppercase',
                boxShadow: '0 12px 26px rgba(0, 0, 0, 0.28), 0 0 18px rgba(220, 255, 200, 0.8)',
                cursor: 'pointer',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-2px) scale(1.05)'
                e.target.style.boxShadow = '0 16px 36px rgba(0, 0, 0, 0.35), 0 0 26px rgba(220, 255, 200, 0.95)'
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0) scale(1)'
                e.target.style.boxShadow = '0 12px 26px rgba(0, 0, 0, 0.28), 0 0 18px rgba(220, 255, 200, 0.8)'
              }}
            >
              Get Started
            </button>
          </div>

          <div
            id="ready-label"
            style={{
              position: 'absolute',
              right: '10vw',
              top: '70%',
              transform: 'translateY(-50%)',
              zIndex: 6,
              opacity: 0,
              pointerEvents: 'none',
              color: '#ffffff',
              fontSize: 'clamp(16px, 2.2vw, 32px)',
              fontWeight: 400,
              lineHeight: 1.3,
              textAlign: 'right',
            }}
          >
            Are you
            <br />ready?
          </div>

          <div
            id="left-copy"
            style={{
              position: 'absolute',
              left: '10vw',
              top: '70%',
              transform: 'translateY(-50%)',
              zIndex: 6,
              opacity: 0,
              pointerEvents: 'none',
              color: '#ffffff',
              fontSize: 'clamp(16px, 2vw, 28px)',
              fontWeight: 400,
              lineHeight: 1.3,
              textTransform: 'uppercase',
              textAlign: 'left',
            }}
          >
            <div>SEE IT.</div>
            <div>SNAP IT.</div>
            <div>KNOW IT.</div>
          </div>

          {/* ── 3D SANDWICH CANVAS ── */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 1,
            }}
          >
            <HeroThreeScene modelPath={sammichUrl} />
          </div>
        </div>
      </div>

      <section id="features">
        <Features />
      </section>
    </div>
  )
}
