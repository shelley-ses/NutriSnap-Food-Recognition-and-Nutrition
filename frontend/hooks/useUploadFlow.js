import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { analyzeImage } from '../services/api'
import { compressImage } from '../utils/imageQuality'
import { scanBarcodeFromImage, getNutritionByBarcode } from '../utils/barcodeScanner'

const ALLOWED_TYPES = ['image/png', 'image/jpeg']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

{/*VALIDATION RULES	
	- Is the file selected?
	- Is the file type allowed?
	- Is the file size under 10mb?	
*/}

export function useUploadFlow() {
	const fileInputRef = useRef(null)
	const navigate = useNavigate()

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
		async (file) => {
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

			let fileToProcess = file
			try {
				fileToProcess = await compressImage(file, 1024, 1024, 0.75)
			} catch (compressErr) {
				console.error('Compression failed, using original file:', compressErr)
			}

			// Convert the file into a previewable format
			const reader = new FileReader()
			reader.onload = (loadEvent) => {
				setPreviewData({
					src: loadEvent.target?.result,
					fileName: fileToProcess.name,
					file: fileToProcess,
				})
			}

			reader.onerror = () => {
				setPreviewData(null)
				setValidationError('Unable to read this file')
			}

			reader.readAsDataURL(fileToProcess)
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
			// Scan for barcode first
			const barcode = await scanBarcodeFromImage(previewData.src)
			if (barcode) {
				const product = await getNutritionByBarcode(barcode)
				if (product) {
					// Map Open Food Facts data to standard format expected by Analysis Page
					const mockResult = {
						filename: previewData.fileName,
						analysis_provider: "barcode+openfoodfacts",
						top_prediction: product.name,
						final_food_label: product.name,
						ingredients: (product.ingredients || []).map(name => ({
							name: name,
							amount: 100,
							unit: 'g',
							calories: 0,
							protein: 0,
							carbs: 0,
							fat: 0,
							fiber: 0,
							resolved: false,
							source: 'pending'
						})),
						gemini: JSON.stringify({
							dish_guess: product.name,
							identified_foods: [{ name: product.name, confidence: "high" }],
							nutrition_estimate: {
								calories_kcal: product.calories,
								protein_g: product.protein,
								carbs_g: product.carbs,
								fat_g: product.fat
							},
							portion_size: { text: product.serving_size, grams: 100 }
						}, null, 2),
						geminiNutrition: `Calories: ${product.calories} kcal\nProtein: ${product.protein} g\nCarbs: ${product.carbs} g\nFat: ${product.fat} g`
					}

					setAnalysisResult({
						type: 'success',
						src: previewData.src,
						title: 'Barcode Scan Complete',
						description: `${product.brand} - ${product.name}`,
						gemini: mockResult.gemini,
						geminiNutrition: mockResult.geminiNutrition,
						clarifai: `Product brand: ${product.brand}\nServing size: ${product.serving_size}\nSodium: ${product.sodium} mg\nSugar: ${product.sugar} g`,
					})

					navigate('/analysis', {
						state: {
							analysisData: mockResult,
							previewSrc: previewData.src,
							fileName: previewData.fileName,
						},
					})
					setPreviewData(null)
					setIsAnalyzing(false)
					return
				}
			}

			// Navigate to analysis page immediately to render the skeleton loader
			navigate('/analysis', {
				state: {
					isAnalyzing: true,
					previewSrc: previewData.src,
					fileName: previewData.fileName,
					rawFile: previewData.file,
				},
			})
			setPreviewData(null)
		} catch (error) {
			console.error('Analysis error:', error)
			setValidationError('Unable to connect to the backend. Please make sure the API is running and try again.')
		} finally {
			setIsAnalyzing(false)
		}
	}, [navigate, previewData, validateFile])

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
