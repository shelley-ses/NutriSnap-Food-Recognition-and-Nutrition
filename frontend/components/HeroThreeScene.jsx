import React, { Suspense, useEffect, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF, OrbitControls, Html } from '@react-three/drei'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import * as THREE from 'three'

gsap.registerPlugin(ScrollTrigger)

function Model({ url, modelRef }) {
  const { scene } = useGLTF(url)

  useEffect(() => {
    if (!scene) return
    const box = new THREE.Box3().setFromObject(scene)
    const center = box.getCenter(new THREE.Vector3())
    scene.position.sub(center)
    scene.rotation.x = -Math.PI / 2
    scene.rotation.y = 0
    scene.scale.setScalar(2.2)
  }, [scene])

  return <primitive ref={modelRef} object={scene} />
}

function SceneInner({ modelPath }) {
  const modelRef = useRef()
  const progress = useRef({ value: 0 })
  const { camera } = useThree()
  const initialCam = useRef(new THREE.Vector3(0, 2.6, 1.2))
  const finalCam = useRef(new THREE.Vector3(3.3, 0.3, 1.0))

  useEffect(() => {
    useGLTF.preload(modelPath)
  }, [modelPath])

  useEffect(() => {
    camera.position.copy(initialCam.current)
    camera.lookAt(0, 0, 0)

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: '#hero-story',
        start: 'top top',
        end: '+=100vh',
        scrub: 1,
      },
    })

    // Drive the 3D animation progress
    tl.to(progress.current, { value: 1, ease: 'none' }, 0)

    // Title rises and shrinks
    tl.to('#bg-title', { y: '-18vh', ease: 'none' }, 0)
    tl.to('#bg-title h1', { fontSize: 'clamp(32px, 5vw, 80px)', textShadow: 'none', ease: 'none' }, 0)

    // Tagline fades out early
    tl.to('#tagline', { opacity: 0, ease: 'none' }, 0)

    // CTA fades in at 40% through
    tl.to('#cta-btn', {
      opacity: 1,
      ease: 'none',
      onComplete: () => {
        const btn = document.querySelector('#cta-btn')
        if (btn) btn.style.pointerEvents = 'auto'
      },
    }, 0.4)

    // Side labels fade in at 50% through
    tl.to('#ready-label', { opacity: 1, ease: 'none' }, 0.5)
    tl.to('#left-copy', { opacity: 1, ease: 'none' }, 0.5)

    return () => {
      if (tl.scrollTrigger) tl.scrollTrigger.kill()
      tl.kill()
    }
  }, [])

  useFrame(() => {
    const t = progress.current.value

    if (modelRef.current) {
      const targetPosX = -1.0 * t
      const targetPosY = -0.4 * t
      const targetPosZ = -0.15 * t
      const targetScale = 2.5 + 1.1 * t

      modelRef.current.position.x = THREE.MathUtils.lerp(modelRef.current.position.x, targetPosX, 0.12)
      modelRef.current.position.y = THREE.MathUtils.lerp(modelRef.current.position.y, targetPosY, 0.12)
      modelRef.current.position.z = THREE.MathUtils.lerp(modelRef.current.position.z, targetPosZ, 0.12)
      modelRef.current.scale.setScalar(THREE.MathUtils.lerp(modelRef.current.scale.x, targetScale, 0.12))

      const targetRotY = Math.PI * 1.2 * t
      modelRef.current.rotation.y = THREE.MathUtils.lerp(modelRef.current.rotation.y, targetRotY, 0.12)
      modelRef.current.rotation.x = THREE.MathUtils.lerp(modelRef.current.rotation.x, 0, 0.12)
    }

    const targetCam = new THREE.Vector3()
    targetCam.lerpVectors(initialCam.current, finalCam.current, t)
    camera.position.lerp(targetCam, 0.06)
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
  })

  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <Suspense fallback={<Html center>Loading model…</Html>}>
        <Model url={modelPath} modelRef={modelRef} />
      </Suspense>
    </>
  )
}

export default function HeroThreeScene({ modelPath = '/models/food/fish.glb' }) {
  return (
    <div id="hero" style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas camera={{ position: [0, 0, 2.2], fov: 45 }} style={{ background: 'transparent', position: 'relative', zIndex: 0 }}>
        <SceneInner modelPath={modelPath} />
        <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} />
      </Canvas>
    </div>
  )
}