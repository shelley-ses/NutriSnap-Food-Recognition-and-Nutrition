import { useCallback, useEffect, useRef, useState } from 'react'

export function useCamera() {
	const streamRef = useRef(null)
	const fileInputRef = useRef(null)

	const [isCameraOpen, setIsCameraOpen] = useState(false)
	const [captureStatus, setCaptureStatus] = useState('')
	const [uploadStatus, setUploadStatus] = useState('')
	const [preview, setPreview] = useState(null)

	const closeCamera = useCallback((resetStatus = true) => {
		if (streamRef.current) {
			streamRef.current.getTracks().forEach((track) => track.stop())
			streamRef.current = null
		}

		setIsCameraOpen(false)
		if (resetStatus) {
			setCaptureStatus('')
		}
	}, [])

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

	const capturePhoto = useCallback(
		(videoElement) => {
			if (!videoElement || !videoElement.videoWidth || !videoElement.videoHeight) {
				setCaptureStatus('Camera is still loading')
				return
			}

			const canvas = document.createElement('canvas')
			canvas.width = videoElement.videoWidth
			canvas.height = videoElement.videoHeight
			canvas.getContext('2d').drawImage(videoElement, 0, 0)

			const imageSource = canvas.toDataURL('image/jpeg', 0.92)
			setPreview({
				src: imageSource,
				title: 'Photo Captured',
				description: 'Ready for AI analysis.',
			})

			closeCamera(false)
			setCaptureStatus('Photo captured')
		},
		[closeCamera],
	)

	const openFilePicker = useCallback(() => {
		fileInputRef.current?.click()
	}, [])

	const handleFileChange = useCallback((event) => {
		const selectedFile = event.target.files?.[0]

		if (!selectedFile) {
			return
		}

		setUploadStatus('Analyzing image...')

		const reader = new FileReader()
		reader.onload = async (loadEvent) => {
			const imageBase64 = loadEvent.target?.result
			
			try {
				const formData = new FormData()
				formData.append('file', selectedFile)
				formData.append('use_gemini', 'true')
				
				const response = await fetch('http://localhost:8000/camera/analyze', {
					method: 'POST',
					body: formData,
				})
				
				if (!response.ok) {
					setUploadStatus('Analysis failed')
					return
				}
				
				const analysisResult = await response.json()

				const geminiInsights = analysisResult.gemini?.insights
				let geminiText = null
				if (geminiInsights !== null && geminiInsights !== undefined) {
					if (typeof geminiInsights === 'string') {
						geminiText = geminiInsights
					} else {
						geminiText = JSON.stringify(geminiInsights, null, 2)
					}
				}

				let clarifaiText = null
				if (Array.isArray(analysisResult.foods) && analysisResult.foods.length > 0) {
					const formattedFoods = analysisResult.foods
						.map((food) => {
							if (!food || typeof food !== 'object') {
								return null
							}

							const foodName = typeof food.name === 'string' && food.name.trim().length > 0 ? food.name : 'Unknown'
							const confidenceValue = Number(food.confidence)

							if (Number.isFinite(confidenceValue)) {
								return `${foodName} (${(confidenceValue * 100).toFixed(1)}%)`
							}

							return foodName
						})
						.filter(Boolean)

					const modelUrlText =
						typeof analysisResult.clarifai_model_url === 'string' && analysisResult.clarifai_model_url.trim().length > 0
							? `Model: ${analysisResult.clarifai_model_url}`
							: null

					clarifaiText = [
						modelUrlText,
						`Detected foods: ${formattedFoods.join(', ')}`,
					]
						.filter(Boolean)
						.join('\n')
				} else if (typeof analysisResult.clarifai_error === 'string' && analysisResult.clarifai_error.trim().length > 0) {
					clarifaiText = `Clarifai error: ${analysisResult.clarifai_error}`
				} else {
					clarifaiText = 'No Clarifai foods detected for this image.'
				}
				
				setPreview({
					src: imageBase64,
					title: 'AI Analysis Complete',
					description: `${selectedFile.name}`,
					gemini: geminiText,
					clarifai: clarifaiText,
				})
				setUploadStatus('Analysis complete')
			} catch (error) {
				console.error('Analysis error:', error)
				setUploadStatus('Unable to analyze image')
			}
		}

		reader.onerror = () => {
			setUploadStatus('Unable to read this file')
		}

		reader.readAsDataURL(selectedFile)
		event.target.value = ''
	}, [])

	const clearPreview = useCallback(() => {
		setPreview(null)
	}, [])

	useEffect(() => {
		return () => {
			closeCamera()
		}
	}, [closeCamera])

	return {
		isCameraOpen,
		captureStatus,
		uploadStatus,
		preview,
		streamRef,
		fileInputRef,
		openCamera,
		closeCamera,
		capturePhoto,
		openFilePicker,
		handleFileChange,
		clearPreview,
	}
}

