import { useCallback, useRef, useState } from 'react'
import { analyzeImage } from '../services/api'

const ALLOWED_TYPES = ['image/png', 'image/jpeg']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

{/*VALIDATION RULES	
	- Is the file selected?
	- Is the file type allowed?
	- Is the file size under 10mb?	
*/}

export function useUploadFlow() {
	const fileInputRef = useRef(null)

	const [validationError, setValidationError] = useState(null)
	const [previewData, setPreviewData] = useState(null)
	const [isAnalyzing, setIsAnalyzing] = useState(false)
	const [analysisResult, setAnalysisResult] = useState(null)

	// Validate file before showing preview
	const validateFile = useCallback((file) => {
		if (!file) {
			return { valid: false, error: 'No file selected' }
		}

		// Check file type
		if (!ALLOWED_TYPES.includes(file.type)) {
			return {
				valid: false,
				error: `Invalid file type. Only PNG and JPEG are allowed. You uploaded: ${file.type || 'unknown'}`,
			}
		}

		// Check file size
		if (file.size > MAX_FILE_SIZE) {
			const sizeMB = (file.size / (1024 * 1024)).toFixed(2)
			return {
				valid: false,
				error: `File is too large (${sizeMB} MB). Maximum size is 10 MB.`,
			}
		}

		return { valid: true }
	}, [])

	const processFile = useCallback(
		(file) => {
			if (!file) {
				return
			}

			setValidationError(null)
			setAnalysisResult(null)
			const validation = validateFile(file)
			if (!validation.valid) {
				setPreviewData(null)
				setValidationError(validation.error)
				return
			}

			// Convert the file into a previewable format
			const reader = new FileReader()
			reader.onload = (loadEvent) => {
				setPreviewData({
					src: loadEvent.target?.result,
					fileName: file.name,
					file: file,
				})
			}

			reader.onerror = () => {
				setPreviewData(null)
				setValidationError('Unable to read this file')
			}

			reader.readAsDataURL(file)
		},
		[validateFile],
	)

	// Handle file selection and passes it to the processFile
	const handleFileChange = useCallback(
		(event) => {
			const file = event.target.files?.[0]
			if (!file) {
				return
			}

			processFile(file)
			event.target.value = ''
		},
		[processFile],
	)

	// Handle retake - clear preview and allow re-picking
	const handleRetake = useCallback(() => {
		setPreviewData(null)
		setValidationError(null)
		if (fileInputRef.current) {
			fileInputRef.current.value = ''
		}
	}, [])

	// Handle submit - send to backend for analysis
	const handleSubmit = useCallback(async () => {
		if (!previewData?.file) {
			setValidationError('No file to submit')
			return
		}

		const validation = validateFile(previewData.file)
		if (!validation.valid) {
			setPreviewData(null)
			setValidationError(validation.error)
			return
		}

		setIsAnalyzing(true)
		setValidationError(null)

		try {
			const analysisResponse = await analyzeImage(previewData.file, {
				useGemini: true,
			})

			if (!analysisResponse.ok) {
				setValidationError(analysisResponse.error)
				return
			}

			const analysisResult = analysisResponse.data

			// Parse Gemini insights
			const geminiInsights = analysisResult.gemini?.insights
			let geminiText = null
			if (geminiInsights !== null && geminiInsights !== undefined) {
				if (typeof geminiInsights === 'string') {
					geminiText = geminiInsights
				} else {
					geminiText = JSON.stringify(geminiInsights, null, 2)
				}
			}

			// Parse Clarifai data
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

			setAnalysisResult({
				type: 'success',
				src: previewData.src,
				title: 'AI Analysis Complete',
				description: previewData.fileName,
				gemini: geminiText,
				clarifai: clarifaiText,
			})
			setPreviewData(null)
		} catch (error) {
			console.error('Analysis error:', error)
			setValidationError('Unable to connect to the backend. Please make sure the API is running and try again.')
		} finally {
			setIsAnalyzing(false)
		}
	}, [previewData, validateFile])

	// Clear all states
	const reset = useCallback(() => {
		setValidationError(null)
		setPreviewData(null)
		setIsAnalyzing(false)
		setAnalysisResult(null)
		if (fileInputRef.current) {
			fileInputRef.current.value = ''
		}
	}, [])

	const openFilePicker = useCallback(() => {
		fileInputRef.current?.click()
	}, [])

	return {
		fileInputRef,
		validationError,
		previewData,
		isAnalyzing,
		analysisResult,
		handleFileChange,
		handleRetake,
		handleSubmit,
		openFilePicker,
		processFile,
		setValidationError,
		setAnalysisResult,
		reset,
	}
}
