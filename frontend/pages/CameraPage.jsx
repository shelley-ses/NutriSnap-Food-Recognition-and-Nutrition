import { useEffect, useRef } from 'react'
import CaptureFood from '../components/camera/CaptureFood'
import UploadImage from '../components/camera/UploadImage'
import ImageAnalysis from '../components/camera/ImageAnalysis'
import ValidationErrorModal from '../components/camera/ValidationErrorModal'
import PreviewModal from '../components/camera/PreviewModal'
import AnalyzingModal from '../components/camera/AnalyzingModal'
import { useCamera } from '../hooks/useCamera'
import { useUploadFlow } from '../hooks/useUploadFlow'
import {
  runCameraPageEntrance,
  setupCustomCursor,
  setupParticleBackground,
  startFloatingFoodParticles,
} from '../components/common/motion'

export default function CameraPage() {
  const pageRef = useRef(null)
  const canvasRef = useRef(null)
  const cursorDotRef = useRef(null)
  const cursorRingRef = useRef(null)
  const logoRef = useRef(null)
  const subtitleRef = useRef(null)
  const dotsRowRef = useRef(null)
  const dividerRef = useRef(null)
  const footerRef = useRef(null)

  const {
    isCameraOpen,
    captureStatus,
    preview,
    streamRef,
    openCamera,
    closeCamera,
    capturePhoto,
    clearPreview,
  } = useCamera()

  const {
    fileInputRef,
    validationError,
    previewData,
    isAnalyzing,
    analysisResult,
    handleFileChange,
    handleRetake,
    handleSubmit,
    openFilePicker,
    setValidationError,
    setAnalysisResult,
    reset,
  } = useUploadFlow()

  useEffect(() => {
    return setupCustomCursor({
      dotElement: cursorDotRef.current,
      ringElement: cursorRingRef.current,
    })
  }, [])

  useEffect(() => {
    return setupParticleBackground({ canvas: canvasRef.current })
  }, [])

  useEffect(() => {
    return runCameraPageEntrance({
      scopeElement: pageRef.current,
      logoElement: logoRef.current,
      subtitleElement: subtitleRef.current,
      dotsRowElement: dotsRowRef.current,
      dividerElement: dividerRef.current,
      footerElement: footerRef.current,
    })
  }, [])

  useEffect(() => {
    return startFloatingFoodParticles({ root: document.body })
  }, [])

  return (
    <main ref={pageRef} className="relative min-h-screen overflow-hidden bg-[var(--surface-bg)]">
      <canvas ref={canvasRef} className="page-bg-canvas" />
      <div className="dot-grid" />

      <div ref={cursorDotRef} className="cursor-dot" />
      <div ref={cursorRingRef} className="cursor-ring" />

      <div className="relative z-[2] flex min-h-screen flex-col items-center justify-center px-5 py-8">
        <h1
          ref={logoRef}
          className="camera-main-title text-center text-[clamp(44px,7vw,90px)] leading-[0.9] tracking-[0.04em] font-[var(--font-heading)] opacity-0"
        >
          <span className="camera-title-letter inline-block text-[var(--brand-primary)]">F</span>
          <span className="camera-title-letter inline-block text-[var(--brand-secondary)]">o</span>
          <span className="camera-title-letter inline-block text-[var(--brand-danger)]">o</span>
          <span className="camera-title-letter inline-block text-[var(--brand-highlight)]">d</span>
          <span className="camera-title-letter inline-block text-[var(--text-main)]">Lens</span>
        </h1>

        <p
          ref={subtitleRef}
          className="mt-2 text-center text-xs uppercase tracking-[0.32em] text-[#aaaaaa] opacity-0"
        >
          AI-Powered Food Recognition
        </p>

        <div ref={dotsRowRef} className="mt-[13px] flex gap-[7px] opacity-0">
          <span className="h-2 w-2 rounded-full bg-[var(--brand-primary)]" />
          <span className="h-2 w-2 rounded-full bg-[var(--brand-secondary)]" />
          <span className="h-2 w-2 rounded-full bg-[var(--brand-danger)]" />
          <span className="h-2 w-2 rounded-full bg-[var(--brand-highlight)]" />
        </div>

        <div
          ref={dividerRef}
          className="mx-auto mt-[22px] h-0 w-px bg-gradient-to-b from-transparent via-[var(--brand-primary)] to-transparent opacity-0"
        />

        <div className="mt-7 flex flex-wrap justify-center gap-5 [perspective:1200px]">
          <div className="card-shell w-[min(34vw,320px)] min-w-[240px]">
            <CaptureFood
              status={captureStatus}
              isCameraOpen={isCameraOpen}
              streamRef={streamRef}
              onOpenCamera={openCamera}
              onCloseCamera={closeCamera}
              onCapturePhoto={capturePhoto}
            />
          </div>

          <div className="card-shell w-[min(34vw,320px)] min-w-[240px]">
            <UploadImage
              fileInputRef={fileInputRef}
              onTriggerUpload={openFilePicker}
              onFileChange={handleFileChange}
            />
          </div>
        </div>

        <p
          ref={footerRef}
          className="mt-9 text-center text-[11px] uppercase tracking-[0.28em] text-[#cccccc] opacity-0"
        >
          Powered by Computer Vision · Zero Data Stored
        </p>
      </div>

      {/* Camera Preview Modal (from capture) */}
      <ImageAnalysis preview={preview} onClose={clearPreview} />

      {/* File Upload Modals */}
      <ValidationErrorModal error={validationError} onClose={() => setValidationError(null)} />
      <PreviewModal preview={previewData} onRetake={handleRetake} onSubmit={handleSubmit} isSubmitting={isAnalyzing} />
      <AnalyzingModal isOpen={isAnalyzing} />
      <ImageAnalysis preview={analysisResult} onClose={() => setAnalysisResult(null)} />
    </main>
  )
}
