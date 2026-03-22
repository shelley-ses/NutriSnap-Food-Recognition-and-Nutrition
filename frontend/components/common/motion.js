import { gsap } from 'gsap'

const NETWORK_COLORS = ['117,177,64', '255,159,69', '255,107,107', '255,217,61']
const FOOD_EMOJIS = ['🍕', '🍔', '🍣', '🥗', '🍜', '🍰', '🥑', '🍓', '🌮', '🥩', '🍇', '🧁', '🥝', '🍊', '🫐']

export function setupCustomCursor({ dotElement, ringElement }) {
  if (!dotElement || !ringElement) {
    return undefined
  }

  const supportsFinePointer = window.matchMedia('(pointer:fine)').matches
  if (!supportsFinePointer) {
    dotElement.style.display = 'none'
    ringElement.style.display = 'none'
    return undefined
  }

  const handleMouseMove = (event) => {
    gsap.to(dotElement, {
      x: event.clientX,
      y: event.clientY,
      duration: 0.1,
      ease: 'none',
    })

    gsap.to(ringElement, {
      x: event.clientX,
      y: event.clientY,
      duration: 0.18,
      ease: 'power2.out',
    })
  }

  const handlePointerOver = (event) => {
    if (!(event.target instanceof Element)) {
      return
    }

    if (event.target.closest('button, .interactive-card')) {
      gsap.to(dotElement, { scale: 2.2, duration: 0.2, ease: 'power2.out' })
      gsap.to(ringElement, { scale: 1.5, opacity: 0.8, duration: 0.2, ease: 'power2.out' })
    }
  }

  const handlePointerOut = (event) => {
    if (!(event.target instanceof Element)) {
      return
    }

    if (event.target.closest('button, .interactive-card')) {
      gsap.to(dotElement, { scale: 1, duration: 0.2, ease: 'power2.out' })
      gsap.to(ringElement, { scale: 1, opacity: 0.5, duration: 0.2, ease: 'power2.out' })
    }
  }

  window.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('pointerover', handlePointerOver)
  document.addEventListener('pointerout', handlePointerOut)

  return () => {
    window.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('pointerover', handlePointerOver)
    document.removeEventListener('pointerout', handlePointerOut)
  }
}

export function setupParticleBackground({ canvas }) {
  const context = canvas?.getContext('2d')
  if (!canvas || !context) {
    return undefined
  }

  let width = 0
  let height = 0
  let animationFrame = 0
  let cameraX = 0
  let cameraY = 0

  const nodes = Array.from({ length: 55 }, (_, index) => ({
    x: Math.random() * 1000,
    y: Math.random() * 1000,
    z: Math.random() * 700 + 100,
    vx: (Math.random() - 0.5) * 0.2,
    vy: (Math.random() - 0.5) * 0.2,
    vz: (Math.random() - 0.5) * 0.32,
    color: NETWORK_COLORS[index % NETWORK_COLORS.length],
  }))

  const resize = () => {
    width = canvas.width = window.innerWidth
    height = canvas.height = window.innerHeight
  }

  const project = (x, y, z) => {
    const focal = 580
    const screenX = ((x - 500 - cameraX) * focal) / (z + focal) + width / 2
    const screenY = ((y - 500 - cameraY) * focal) / (z + focal) + height / 2
    const scale = focal / (z + focal)
    return { screenX, screenY, scale }
  }

  const render = () => {
    context.clearRect(0, 0, width, height)

    for (let nodeIndex = 0; nodeIndex < nodes.length; nodeIndex += 1) {
      const node = nodes[nodeIndex]
      node.x += node.vx
      node.y += node.vy
      node.z += node.vz

      if (node.x < 0 || node.x > 1000) node.vx *= -1
      if (node.y < 0 || node.y > 1000) node.vy *= -1
      if (node.z < 50 || node.z > 850) node.vz *= -1

      for (let nextIndex = nodeIndex + 1; nextIndex < nodes.length; nextIndex += 1) {
        const neighbor = nodes[nextIndex]
        const distance = Math.hypot(node.x - neighbor.x, node.y - neighbor.y, node.z - neighbor.z)
        if (distance > 200) {
          continue
        }

        const from = project(node.x, node.y, node.z)
        const to = project(neighbor.x, neighbor.y, neighbor.z)

        context.beginPath()
        context.moveTo(from.screenX, from.screenY)
        context.lineTo(to.screenX, to.screenY)
        context.strokeStyle = `rgba(${node.color}, ${(1 - distance / 200) * 0.09})`
        context.lineWidth = 0.6
        context.stroke()
      }
    }

    nodes.forEach((node) => {
      const point = project(node.x, node.y, node.z)
      context.beginPath()
      context.arc(point.screenX, point.screenY, Math.max(1, point.scale * 3), 0, Math.PI * 2)
      context.fillStyle = `rgba(${node.color}, ${point.scale * 0.42})`
      context.fill()
    })

    animationFrame = window.requestAnimationFrame(render)
  }

  const handleMouseMove = (event) => {
    cameraX = (event.clientX / width - 0.5) * 50
    cameraY = (event.clientY / height - 0.5) * 50
  }

  resize()
  render()

  window.addEventListener('resize', resize)
  window.addEventListener('mousemove', handleMouseMove)

  return () => {
    window.cancelAnimationFrame(animationFrame)
    window.removeEventListener('resize', resize)
    window.removeEventListener('mousemove', handleMouseMove)
  }
}

export function runCameraPageEntrance({
  scopeElement,
  logoElement,
  subtitleElement,
  dotsRowElement,
  dividerElement,
  footerElement,
}) {

  const context = gsap.context(() => {
    const titleLetters = gsap.utils.toArray('.camera-title-letter')
    const dots = dotsRowElement?.children ? Array.from(dotsRowElement.children) : []
    const cards = gsap.utils.toArray('.card-shell')

    gsap.from(cards, {
      y: 40,
      opacity: 0,
      duration: 0.9,
      stagger: 0.15,
      ease: 'expo.out',
      delay: 0.1,
    })

    if (!logoElement) {
      return
    }

    const introTimeline = gsap.timeline({ defaults: { ease: 'power4.out' }, delay: 0.05 })
    introTimeline
      .set(logoElement, { opacity: 1 })
      .from(
        titleLetters,
        {
          y: 70,
          opacity: 0,
          duration: 0.9,
          stagger: 0.07,
          ease: 'back.out(2)',
        },
        0,
      )

    if (subtitleElement) {
      introTimeline.to(subtitleElement, { opacity: 1, duration: 0.7 }, '-=0.35')
    }

    if (dotsRowElement) {
      introTimeline.to(dotsRowElement, { opacity: 1, duration: 0.4 }, '-=0.25')
    }

    introTimeline.to(
      dots,
      {
        scale: 1.5,
        stagger: 0.09,
        yoyo: true,
        repeat: 1,
        duration: 0.2,
      },
      '-=0.2',
    )

    if (dividerElement) {
      introTimeline.to(dividerElement, { opacity: 1, height: 44, duration: 0.6, ease: 'power2.out' }, '-=0.1')
    }

    if (footerElement) {
      introTimeline.to(footerElement, { opacity: 1, duration: 0.5 }, '-=0.1')
    }

    gsap.to(dots, {
      y: -4,
      duration: 0.75,
      repeat: -1,
      yoyo: true,
      stagger: 0.12,
      ease: 'sine.inOut',
    })

    gsap.to(titleLetters, {
      y: -6,
      duration: 1.1,
      stagger: 0.12,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      delay: 1.8,
    })

    cards.forEach((card, index) => {
      gsap.to(card, {
        y: index === 0 ? -10 : 10,
        duration: index === 0 ? 3.6 : 4.2,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: index === 0 ? 0.3 : 0,
      })
    })
  }, scopeElement)

  return () => context.revert()
}

export function startFloatingFoodParticles({ root = document.body }) {
  let activeCount = 0

  const spawnParticle = () => {
    if (activeCount >= 5) {
      return
    }

    activeCount += 1
    const particle = document.createElement('div')
    particle.className = 'food-particle'
    particle.textContent = FOOD_EMOJIS[Math.floor(Math.random() * FOOD_EMOJIS.length)]
    particle.style.left = `${Math.random() * 100}vw`
    particle.style.bottom = '-36px'
    root.appendChild(particle)

    const duration = 13 + Math.random() * 8
    gsap.to(particle, {
      y: `-${80 + Math.random() * 20}vh`,
      rotation: Math.random() * 200 - 100,
      duration,
      ease: 'none',
      onComplete: () => {
        particle.remove()
        activeCount -= 1
      },
    })

    gsap.to(particle, { opacity: 0.55, duration: 1.6, ease: 'power2.in' })
    gsap.to(particle, { opacity: 0, duration: 2.5, ease: 'power2.in', delay: duration - 2.8 })
  }

  const startTimeout = window.setTimeout(() => {
    spawnParticle()
    spawnParticle()
  }, 2200)

  const intervalId = window.setInterval(spawnParticle, 4000)

  return () => {
    window.clearTimeout(startTimeout)
    window.clearInterval(intervalId)
    root.querySelectorAll('.food-particle').forEach((particle) => particle.remove())
  }
}

export function applySubtleCardTilt({ event, cardElement, glareElement, iconElement, shadowColor }) {
  if (!cardElement) {
    return
  }

  const bounds = cardElement.getBoundingClientRect()
  const xPercent = (event.clientX - bounds.left) / bounds.width - 0.5
  const yPercent = (event.clientY - bounds.top) / bounds.height - 0.5
  const centerDistance = Math.hypot(xPercent, yPercent)
  const maxDistance = Math.hypot(0.5, 0.5)
  const centerDeadZone = 0.02
  const normalizedDistance = Math.min(1, centerDistance / maxDistance)
  const bendStrength =
    normalizedDistance <= centerDeadZone
      ? 0
      : (normalizedDistance - centerDeadZone) / (1 - centerDeadZone)
  const xTiltFactor =
    bendStrength === 0 ? 0 : Math.sign(xPercent) * (Math.abs(xPercent) + 0.18 * bendStrength)
  const yTiltFactor =
    bendStrength === 0 ? 0 : Math.sign(yPercent) * (Math.abs(yPercent) + 0.18 * bendStrength)
  const bendY = xTiltFactor * (12 + bendStrength * 14)
  const bendX = yTiltFactor * -(10 + bendStrength * 12)

  gsap.to(cardElement, {
    rotateY: bendY,
    rotateX: bendX,
    z: 4 + bendStrength * 8,
    scale: 1 + bendStrength * 0.018,
    transformPerspective: 900,
    duration: 0.22,
    ease: 'power2.out',
    overwrite: 'auto',
  })

  if (iconElement) {
    gsap.to(iconElement, {
      x: xPercent * (14 + bendStrength * 18),
      y: yPercent * (14 + bendStrength * 18),
      rotate: xPercent * (5 + bendStrength * 4),
      duration: 0.22,
      ease: 'power2.out',
      overwrite: 'auto',
    })
  }

  if (glareElement) {
    const gx = ((event.clientX - bounds.left) / bounds.width) * 100
    const gy = ((event.clientY - bounds.top) / bounds.height) * 100
    glareElement.style.background = `radial-gradient(circle at ${gx}% ${gy}%, rgba(255,255,255,.92) 0%, rgba(255,255,255,.48) 20%, rgba(255,255,255,.12) 42%, transparent 72%)`
    gsap.to(glareElement, {
      opacity: 1,
      duration: 0.14,
      ease: 'power2.out',
    })
  }

  cardElement.style.boxShadow = `${-xPercent * 8}px ${Math.abs(yPercent) * 10 + 8}px ${18 + bendStrength * 14}px rgba(${shadowColor},0.15), 0 6px 12px rgba(0,0,0,0.05)`
}

export function resetSubtleCardTilt({ cardElement, glareElement, iconElement }) {
  if (!cardElement) {
    return
  }

  gsap.to(cardElement, {
    rotateX: 0,
    rotateY: 0,
    z: 0,
    scale: 1,
    duration: 0.75,
    ease: 'power2.out',
  })

  if (iconElement) {
    gsap.to(iconElement, {
      x: 0,
      y: 0,
      rotate: 0,
      duration: 0.55,
      ease: 'power2.out',
    })
  }

  if (glareElement) {
    gsap.to(glareElement, { opacity: 0, duration: 0.3, ease: 'power2.out' })
  }
}
