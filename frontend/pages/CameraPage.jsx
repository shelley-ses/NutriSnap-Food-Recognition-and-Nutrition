import { useCallback, useEffect, useRef } from 'react'
import CaptureFood from '../components/camera/CaptureFood'
import UploadImage from '../components/camera/UploadImage'
import CameraModal from '../components/camera/CameraModal'
import PreviewModal from '../components/camera/PreviewModal'
import ValidationModals from '../components/camera/ValidationModals'
import AnalysisResultModal from '../components/camera/AnalysisResultModal'
import AnalyzingScreen from '../components/camera/AnalyzingScreen'

import { useCamera } from '../hooks/useCamera'
import { useUploadFlow } from '../hooks/useUploadFlow'

export default function CameraPage ()
{
  const videoRef = useRef (null) // live camera for the capture food
  const {streamRef, isCameraOpen, openCamera, closeCamera}= useCamera ()
  const {
    fileInputRef,
    previewData,
    validationError,
    isAnalyzing,
    analysisResult,
    handleFileChange,
    handleRetake,
    handleSubmit,
    processFile,
    reset,
    setValidationError,
  } = useUploadFlow()

  const handleCameraCapture = useCallback(() => {
    const videoElement = videoRef.current

    if (!videoElement || videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
      setValidationError('Camera is not ready yet. Please wait a moment and try again.')
      return
    }

    const canvas = document.createElement('canvas')
    canvas.width = videoElement.videoWidth
    canvas.height = videoElement.videoHeight

    const context = canvas.getContext('2d')
    if (!context) {
      setValidationError('Unable to capture the camera image.')
      return
    }

    context.drawImage(videoElement, 0, 0, canvas.width, canvas.height)

    canvas.toBlob((blob) => {
      if (!blob) {
        setValidationError('Unable to capture the camera image.')
        return
      }

      const capturedFile = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' })
      processFile(capturedFile)
      closeCamera()
    }, 'image/jpeg', 0.92)
  }, [closeCamera, processFile, setValidationError])

  const handleValidationClose = useCallback(() => {
    setValidationError(null)
  }, [setValidationError])

  const handleAnalysisClose = useCallback(() => {
    reset()
  }, [reset])

  const handleAnalyzeAnother = useCallback(() => {
    reset()
    fileInputRef.current?.click()
  }, [fileInputRef, reset])


  // Display the camera
  useEffect (() => {
    if (videoRef.current && streamRef.current){
        videoRef.current.srcObject = streamRef.current
    }}, [isCameraOpen, streamRef])

    if (isAnalyzing){
        return <AnalyzingScreen />
      }

  return (
    <>
      <div className="background2 w-full flex flex-col justify-center items-center px-4">
        <div className="w-full max-w-275 flex flex-col items-center">
          <div className="text-center">
            <h1 className="primary-text font-aclonica text-5xl">Snap your Meal</h1>
            <p className="text-xl">Get instant nutrition info for every meal</p>
          </div>

          <div className="pt-15 w-full flex flex-wrap justify-center gap-6">
            <CaptureFood onOpenCamera = {openCamera} />
            <UploadImage fileInputRef={fileInputRef} onFileChange={handleFileChange} />
          </div>
        </div> 
      </div>

      {/*Open Camera Modal*/} 
      {isCameraOpen && (
        <CameraModal
          videoRef={videoRef}
          onClose={closeCamera}
          onConfirm={handleCameraCapture}
        />
      )}

      <PreviewModal
        preview={previewData}
        onRetake={handleRetake}
        onSubmit={handleSubmit}
        isSubmitting={isAnalyzing}
        onValidationFailed={setValidationError}
      />

      <ValidationModals
        error={validationError}
        onClose={handleValidationClose}
      />


      <AnalysisResultModal
        result={analysisResult}
        onAnalyzeAnother={handleAnalyzeAnother}
        onClose={handleAnalysisClose}
      />
      
    </>
  );
}