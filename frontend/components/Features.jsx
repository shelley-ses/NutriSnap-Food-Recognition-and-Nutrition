import React, { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const cards = [
  {
    id: 'meal-recognition',
    emoji: '🥗',
    title: 'MEAL\nRECOGNITION',
    description: 'Capture or upload photos of your meals and the system identifies the food items automatically.',
    bg: '#c9943a',
    titleColor: '#3d2200',
    descColor: '#5a3300',
    zIndex: 10,
    shadow: '4px 8px 24px rgba(0,0,0,0.22)',
    border: 'none',
  },
  {
    id: 'nutritional-analysis',
    emoji: '🖥️',
    title: 'NUTRITIONAL\nANALYSIS',
    description: 'Instantly see calories, protein, fat, and carbs for every meal.',
    bg: '#7a9e3a',
    titleColor: '#eaffd6',
    descColor: '#d4f0b8',
    zIndex: 20,
    shadow: '6px 10px 28px rgba(0,0,0,0.25)',
    border: '3px solid #9ecf60',
  },
  {
    id: 'meal-history',
    emoji: '🍱',
    title: 'MEAL HISTORY\nTRACKING',
    description: 'Keep a log of your last meals and nutrition summaries for easy tracking over time.',
    bg: '#2e5c14',
    titleColor: '#d0f0b0',
    descColor: '#9ed87a',
    zIndex: 30,
    shadow: '4px 8px 24px rgba(0,0,0,0.22)',
    border: 'none',
  },
]

const rest = [
  { y: 18,  rotate: -2.5 },
  { y: 6,   rotate:  1.2 },
  { y: 12,  rotate:  3.0 },
]

// Ripple dip amount — how far each card sinks before bouncing up
const RIPPLE_DIP = 28
// Ripple bounce peak — how far above rest position
const RIPPLE_PEAK = -38

export default function Features() {
  const sectionRef = useRef(null)
  const headingRef = useRef(null)
  const cardsRef = useRef([])

  useEffect(() => {
    if (!sectionRef.current) return

    const ctx = gsap.context(() => {

      gsap.set(cardsRef.current, { y: 900, opacity: 0, rotate: 0 })
      gsap.set(headingRef.current, { y: 40, opacity: 0 })

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: '+=500%',
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      })

      // ─────────────────────────────────────────────────────
      // PHASE 1: fly in (0.00 → 0.36)
      // ─────────────────────────────────────────────────────
      tl.to(headingRef.current,
        { y: 0, opacity: 1, duration: 0.05, ease: 'power2.out' }, 0)

      tl.to(cardsRef.current[2], {
        y: rest[2].y, rotate: rest[2].rotate, opacity: 1,
        duration: 0.14, ease: 'power3.out',
      }, 0.04)

      tl.to(cardsRef.current[1], {
        y: rest[1].y, rotate: rest[1].rotate, opacity: 1,
        duration: 0.14, ease: 'power3.out',
      }, 0.11)

      tl.to(cardsRef.current[0], {
        y: rest[0].y, rotate: rest[0].rotate, opacity: 1,
        duration: 0.14, ease: 'power3.out',
      }, 0.18)

      // ─────────────────────────────────────────────────────
      // HOLD (0.36 → 0.44)
      // ─────────────────────────────────────────────────────
      tl.to({}, { duration: 0.08 }, 0.36)

      // ─────────────────────────────────────────────────────
      // PHASE 2: RIPPLE WAVE (0.44 → 0.72)
      // Each card does: dip down → bounce up past rest → settle back to rest
      // The wave travels left-to-right (card[0] first, then [1], then [2])
      // giving a physical "wave passing through the stack" feel.
      //
      // Timeline per card:
      //   dip   (0.04) → peak   (0.05) → settle (0.04)
      // Each card starts 0.07 after the previous — tight overlap = fluid wave
      // ─────────────────────────────────────────────────────

      const rippleStagger = 0.07
      const rippleStart = 0.44

      cardsRef.current.forEach((card, i) => {
        const t = rippleStart + i * rippleStagger
        const r = rest[i]

        // dip
        tl.to(card, {
          y: r.y + RIPPLE_DIP,
          rotate: r.rotate * 1.4,
          duration: 0.04,
          ease: 'power2.in',
        }, t)

        // peak bounce (overshoot above rest)
        tl.to(card, {
          y: r.y + RIPPLE_PEAK,
          rotate: r.rotate * 0.6,
          duration: 0.05,
          ease: 'power3.out',
        }, t + 0.04)

        // settle back to rest
        tl.to(card, {
          y: r.y,
          rotate: r.rotate,
          duration: 0.05,
          ease: 'power2.inOut',
        }, t + 0.09)
      })

      // ─────────────────────────────────────────────────────
      // BRIEF HOLD after ripple settles (0.72 → 0.78)
      // ─────────────────────────────────────────────────────
      tl.to({}, { duration: 0.06 }, 0.72)

      // ─────────────────────────────────────────────────────
      // PHASE 3: FLYOUT — same wave cadence, left-to-right
      // Each card gets a tiny pre-launch dip then shoots out
      // ─────────────────────────────────────────────────────

      const flyStagger = 0.09
      const flyStart = 0.78

      // card[0]
      tl.to(cardsRef.current[0],
        { y: rest[0].y - 20, duration: 0.03, ease: 'power2.out' }, flyStart)
      tl.to(cardsRef.current[0],
        { y: -960, opacity: 0, rotate: -6, duration: 0.10, ease: 'power3.in' }, flyStart + 0.03)

      // heading fades with card[0]
      tl.to(headingRef.current,
        { y: -40, opacity: 0, duration: 0.07, ease: 'power2.in' }, flyStart + 0.02)

      // card[1]
      tl.to(cardsRef.current[1],
        { y: rest[1].y - 20, duration: 0.03, ease: 'power2.out' }, flyStart + flyStagger)
      tl.to(cardsRef.current[1],
        { y: -960, opacity: 0, rotate: 4, duration: 0.10, ease: 'power3.in' }, flyStart + flyStagger + 0.03)

      // card[2]
      tl.to(cardsRef.current[2],
        { y: rest[2].y - 20, duration: 0.03, ease: 'power2.out' }, flyStart + flyStagger * 2)
      tl.to(cardsRef.current[2],
        { y: -960, opacity: 0, rotate: 9, duration: 0.10, ease: 'power3.in' }, flyStart + flyStagger * 2 + 0.03)

    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      style={{
        fontFamily: "'Unbounded', sans-serif",
        width: '100%',
        height: '100vh',
        backgroundColor: '#e8f0e2',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        paddingLeft: 'clamp(24px, 5vw, 64px)',
        paddingRight: 'clamp(24px, 5vw, 64px)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1200px',
          marginLeft: 'auto',
          marginRight: 'auto',
          overflow: 'visible',
        }}
      >
        <h2
          ref={headingRef}
          style={{
            fontSize: 'clamp(44px, 7.5vw, 88px)',
            fontWeight: 900,
            textTransform: 'uppercase',
            lineHeight: 0.92,
            letterSpacing: '-0.02em',
            color: '#1a3d0f',
            marginBottom: 'clamp(16px, 3vh, 28px)',
          }}
        >
          WHAT CAN
          <br />
          IT DO?
        </h2>

        <div
          style={{
            position: 'relative',
            width: '100%',
            height: 'clamp(480px, 62vh, 560px)',
            overflow: 'visible',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              height: '100%',
              overflow: 'visible',
            }}
          >
            {cards.map((card, i) => (
              <div
                key={card.id}
                ref={(el) => { cardsRef.current[i] = el }}
                style={{
                  width: 'clamp(240px, 26vw, 340px)',
                  height: 'clamp(420px, 58vh, 500px)',
                  backgroundColor: card.bg,
                  borderRadius: '20px',
                  border: card.border,
                  boxShadow: card.shadow,
                  zIndex: card.zIndex,
                  padding: '32px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  flexShrink: 0,
                  marginLeft: i === 0 ? '0' : '-40px',
                }}
                onMouseEnter={e => {
                  gsap.to(e.currentTarget, {
                    scale: 1.04,
                    y: rest[i].y - 10,
                    duration: 0.3,
                    ease: 'power2.out',
                    overwrite: 'auto',
                  })
                  e.currentTarget.style.boxShadow = '8px 14px 36px rgba(0,0,0,0.32)'
                }}
                onMouseLeave={e => {
                  gsap.to(e.currentTarget, {
                    scale: 1,
                    y: rest[i].y,
                    duration: 0.3,
                    ease: 'power2.out',
                    overwrite: 'auto',
                  })
                  e.currentTarget.style.boxShadow = card.shadow
                }}
              >
                <div style={{ fontSize: '56px', lineHeight: 1 }}>{card.emoji}</div>

                <div>
                  <div
                    style={{
                      fontWeight: 900,
                      textTransform: 'uppercase',
                      fontSize: '15px',
                      letterSpacing: '0.04em',
                      lineHeight: 1.3,
                      whiteSpace: 'pre-line',
                      color: card.titleColor,
                      marginBottom: '10px',
                    }}
                  >
                    {card.title}
                  </div>
                  <div
                    style={{
                      fontSize: '13px',
                      lineHeight: 1.65,
                      fontWeight: 500,
                      color: card.descColor,
                    }}
                  >
                    {card.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}