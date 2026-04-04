import { useRef, useState, useCallback } from 'react'

export function useCamera() {
  const streamRef = useRef(null)

  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [captureStatus, setCaptureStatus] = useState('')

  const openCamera = useCallback(async () => {
    setCaptureStatus('Requesting camera access...')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })

      streamRef.current = stream
      setIsCameraOpen(true)
      setCaptureStatus('Camera ready')
    } catch {
      setCaptureStatus('Camera permission denied')
    }
  }, [])

  const closeCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }

    streamRef.current = null
    setIsCameraOpen(false)
    setCaptureStatus('')
  }, [])

  return {
    streamRef,
    isCameraOpen,
    captureStatus,
    openCamera,
    closeCamera,
  }
}