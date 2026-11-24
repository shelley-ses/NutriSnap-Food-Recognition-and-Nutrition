import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { getMeals, saveMeal, deleteMeal, analyzeImage, getCalorieGoal, saveCalorieGoal, updateCalorieGoalManual, guessNutritionWithSpoonacular } from '../services/api'
import { useCamera } from '../hooks/useCamera'
import CameraModal from '../components/camera/CameraModal'
import { scanBarcodeFromImage, getNutritionByBarcode } from '../utils/barcodeScanner'
import MealDetailModal from '../components/common/MealDetailModal'
import { compressImage } from '../utils/imageQuality'

const CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Snacks']

// Format date nicely for display, e.g. "Monday, June 8, 2026"
const formatDateLabel = (date) => {
	return new Intl.DateTimeFormat('en-US', {
		weekday: 'long',
		month: 'long',
		day: 'numeric',
		year: 'numeric',
	}).format(date)
}

const isSameDay = (d1, d2) => {
	return d1.getFullYear() === d2.getFullYear() &&
		d1.getMonth() === d2.getMonth() &&
		d1.getDate() === d2.getDate()
}

export default function DailyLogPage() {
	const [selectedDate, setSelectedDate] = useState(new Date())
	const navigate = useNavigate()
	const [meals, setMeals] = useState([])
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState('')
	const [deleteConfirmMealId, setDeleteConfirmMealId] = useState(null)
	const [selectedMeal, setSelectedMeal] = useState(null)
	const [searchQuery, setSearchQuery] = useState('')
	const [searchLoading, setSearchLoading] = useState(false)
	const [searchResult, setSearchResult] = useState(null)
	const [searchError, setSearchError] = useState('')

	// Modal state for adding food
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [activeCategory, setActiveCategory] = useState('Breakfast')
	const [modalTab, setModalTab] = useState('saved') // 'saved' or 'quick'
	const [servingMultiplier, setServingMultiplier] = useState(1)

	// Dropdown state for Add Food
	const [addFoodDropdown, setAddFoodDropdown] = useState(null) // category name or null

	// Barcode/scan modal state
	const [isScanModalOpen, setIsScanModalOpen] = useState(false)
	const [scanPreview, setScanPreview] = useState(null)
	const [isScanning, setIsScanning] = useState(false)
	const [scanError, setScanError] = useState('')
	const barcodeFileRef = useRef(null)

	// Camera states and refs
	const videoRef = useRef(null)
	const { streamRef, isCameraOpen, openCamera, closeCamera } = useCamera()

	// Quick Add form state
	const [quickAddName, setQuickAddName] = useState('')
	const [quickAddServing, setQuickAddServing] = useState('1 serving')
	const [quickAddCalories, setQuickAddCalories] = useState('')
	const [quickAddCarbs, setQuickAddCarbs] = useState('')
	const [quickAddFat, setQuickAddFat] = useState('')
	const [quickAddProtein, setQuickAddProtein] = useState('')
	const [quickAddSodium, setQuickAddSodium] = useState('')
	const [quickAddSugar, setQuickAddSugar] = useState('')

	// Goals state stored in localStorage
	const [goals, setGoals] = useState(() => {
		const saved = localStorage.getItem('nutrisnap_daily_goals')
		if (saved) {
			try { return JSON.parse(saved) } catch { /* ignore */ }
		}
		return {
			calories: 2040,
			carbs: 255,
			fat: 68,
			protein: 102,
			sodium: 2300,
			sugar: 76
		}
	})

	const [userName, setUserName] = useState(() => {
		return localStorage.getItem('nutrisnap_user_name') || ''
	})

	const [isEditingGoals, setIsEditingGoals] = useState(false)
	const [editedGoals, setEditedGoals] = useState({ ...goals })

	const [rawGoalConfig, setRawGoalConfig] = useState(null)
	const [isNameModalOpen, setIsNameModalOpen] = useState(false)
	const [tempName, setTempName] = useState('')
	const [isSavingName, setIsSavingName] = useState(false)
	const [nameError, setNameError] = useState('')

	const loadData = async () => {
		setIsLoading(true)
		setError('')
		try {
			const [mealsRes, goalsRes] = await Promise.all([
				getMeals(),
				getCalorieGoal()
			])

			if (mealsRes.ok) {
				setMeals(Array.isArray(mealsRes.data) ? mealsRes.data : [])
			} else {
				setError(mealsRes.error || 'Failed to load meals.')
			}

			if (goalsRes.ok && goalsRes.data) {
				const goalData = {
					calories: goalsRes.data.daily_calorie_goal,
					carbs: goalsRes.data.daily_carbs_goal,
					fat: goalsRes.data.daily_fat_goal,
					protein: goalsRes.data.daily_protein_goal,
					sodium: goalsRes.data.daily_sodium_goal,
					sugar: goalsRes.data.daily_sugar_goal
				}
				setGoals(goalData)
				setEditedGoals(goalData)
				localStorage.setItem('nutrisnap_daily_goals', JSON.stringify(goalData))
				setRawGoalConfig(goalsRes.data)
				if (goalsRes.data.name) {
					setUserName(goalsRes.data.name)
					localStorage.setItem('nutrisnap_user_name', goalsRes.data.name)
				}
			}
		} catch (err) {
			console.error(err)
			setError(err.message || 'Error loading diary data.')
		} finally {
			setIsLoading(false)
		}
	}

	useEffect(() => {
		loadData()
	}, [])

	useEffect(() => {
		if (videoRef.current && streamRef.current) {
			videoRef.current.srcObject = streamRef.current
		}
	}, [isCameraOpen, streamRef])

	const handleCameraCapture = useCallback(() => {
		const videoElement = videoRef.current

		if (!videoElement || videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
			setScanError('Camera is not ready yet. Please wait a moment and try again.')
			return
		}

		const canvas = document.createElement('canvas')
		canvas.width = videoElement.videoWidth
		canvas.height = videoElement.videoHeight

		const context = canvas.getContext('2d')
		if (!context) {
			setScanError('Unable to capture the camera image.')
			return
		}

		context.drawImage(videoElement, 0, 0, canvas.width, canvas.height)

		canvas.toBlob(async (blob) => {
			if (!blob) {
				setScanError('Unable to capture the camera image.')
				return
			}

			let capturedFile = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' })
			try {
				capturedFile = await compressImage(capturedFile, 1024, 1024, 0.75)
			} catch (e) {
				console.error('Compression error:', e)
			}
			const reader = new FileReader()
			reader.onload = () => setScanPreview({ file: capturedFile, url: reader.result })
			reader.readAsDataURL(capturedFile)
			
			closeCamera()
		}, 'image/jpeg', 0.92)
	}, [closeCamera])

	// Filter logged meals for selected date
	const loggedMeals = useMemo(() => {
		return meals.filter((meal) => {
			if (meal.source !== 'log') return false
			const mealDate = new Date(meal.created_at)
			return isSameDay(mealDate, selectedDate)
		})
	}, [meals, selectedDate])

	// Filter templates/saved meals to show in the "Saved Meals" browse tab
	const savedMealsTemplates = useMemo(() => {
		return meals.filter(meal => meal.source !== 'log')
	}, [meals])

	// Compute if selected meal is already in templates
	const isAlreadySaved = useMemo(() => {
		if (!selectedMeal) return false
		return meals.some(t => 
			t.source !== 'log' &&
			t.name === selectedMeal.name &&
			t.category === selectedMeal.category &&
			Math.round(t.calories) === Math.round(selectedMeal.calories) &&
			Math.round(t.protein) === Math.round(selectedMeal.protein) &&
			Math.round(t.carbs) === Math.round(selectedMeal.carbs) &&
			Math.round(t.fat) === Math.round(selectedMeal.fat)
		)
	}, [selectedMeal, meals])


	// Group logged meals by category
	const groupedMeals = useMemo(() => {
		const groups = { Breakfast: [], Lunch: [], Dinner: [], Snacks: [] }
		loggedMeals.forEach((meal) => {
			let cat = 'Breakfast'
			const rawCat = (meal.category || '').toLowerCase()
			if (rawCat.includes('lunch')) cat = 'Lunch'
			else if (rawCat.includes('dinner')) cat = 'Dinner'
			else if (rawCat.includes('snack')) cat = 'Snacks'
			
			if (groups[cat]) {
				groups[cat].push(meal)
			} else {
				groups.Breakfast.push(meal)
			}
		})
		return groups
	}, [loggedMeals])

	// Sum macros for currently logged meals
	const totals = useMemo(() => {
		return loggedMeals.reduce((acc, m) => {
			acc.calories += (m.calories || 0)
			acc.carbs += (m.carbs || 0)
			acc.fat += (m.fat || 0)
			acc.protein += (m.protein || 0)
			// Realistic fallback logic if sodium or sugar is absent from raw database logs
			const rawLower = (m.name || '').toLowerCase()
			const isSalty = rawLower.includes('adobo') || rawLower.includes('sinigang') || rawLower.includes('soy') || rawLower.includes('soup') || rawLower.includes('salty')
			const isSweet = rawLower.includes('halo') || rawLower.includes('sweet') || rawLower.includes('dessert') || rawLower.includes('cake')
			const sodiumVal = m.sodium ?? (isSalty ? Math.round(m.calories * 2.1) : Math.round(m.calories * 1.1))
			const sugarVal = m.sugar ?? (isSweet ? Number(((m.carbs || 0) * 0.45).toFixed(1)) : Number(((m.carbs || 0) * 0.12).toFixed(1)))
			
			acc.sodium += sodiumVal
			acc.sugar += sugarVal
			return acc
		}, { calories: 0, carbs: 0, fat: 0, protein: 0, sodium: 0, sugar: 0 })
	}, [loggedMeals])

	const remaining = useMemo(() => {
		return {
			calories: Math.round(goals.calories - totals.calories),
			carbs: Number((goals.carbs - totals.carbs).toFixed(1)),
			fat: Number((goals.fat - totals.fat).toFixed(1)),
			protein: Number((goals.protein - totals.protein).toFixed(1)),
			sodium: Math.round(goals.sodium - totals.sodium),
			sugar: Number((goals.sugar - totals.sugar).toFixed(1))
		}
	}, [goals, totals])

	const handlePrevDay = () => {
		setSelectedDate(prev => {
			const d = new Date(prev)
			d.setDate(d.getDate() - 1)
			return d
		})
	}

	const handleNextDay = () => {
		setSelectedDate(prev => {
			const d = new Date(prev)
			d.setDate(d.getDate() + 1)
			return d
		})
	}

	const handleDateChange = (e) => {
		if (e.target.value) {
			setSelectedDate(new Date(e.target.value))
		}
	}

	const confirmDelete = async () => {
		if (!deleteConfirmMealId) return
		try {
			const res = await deleteMeal(deleteConfirmMealId)
			if (res.ok) {
				setMeals(prev => prev.filter(m => m.id !== deleteConfirmMealId))
			} else {
				alert(res.error || 'Failed to delete entry.')
			}
		} catch (err) {
			console.error(err)
			alert('Error deleting entry.')
		} finally {
			setDeleteConfirmMealId(null)
		}
	}

	const handleDatabaseSearch = async (e) => {
		if (e) e.preventDefault()
		const query = searchQuery.trim()
		if (!query) return
		setSearchLoading(true)
		setSearchError('')
		setSearchResult(null)
		try {
			const res = await guessNutritionWithSpoonacular(query)
			if (res.ok && res.data) {
				const d = res.data
				const nut = d.nutrition || {}
				const getNutVal = (names) => {
					for (const n of names) {
						if (nut[n] && typeof nut[n] === 'object') {
							return parseFloat(nut[n].amount) || 0
						}
					}
					return 0
				}
				
				setSearchResult({
					name: d.title || query,
					calories: Math.round(d.calories || getNutVal(['calories'])),
					carbs: Number((d.carbs || getNutVal(['carbohydrates', 'carbs'])).toFixed(1)),
					fat: Number((d.fat || getNutVal(['fat'])).toFixed(1)),
					protein: Number((d.protein || getNutVal(['protein'])).toFixed(1)),
					sodium: Math.round(getNutVal(['sodium'])),
					sugar: Number((getNutVal(['sugar', 'sugars'])).toFixed(1)),
					serving_size: d.serving_size || '1 serving',
					provider: d.provider || 'spoonacular'
				})
			} else {
				setSearchError(res.error || 'No results found.')
			}
		} catch (err) {
			console.error(err)
			setSearchError(err.message || 'Error querying database.')
		} finally {
			setSearchLoading(false)
		}
	}

	const handleLogSearchResult = async () => {
		if (!searchResult) return
		const mult = parseFloat(servingMultiplier) || 1
		const payload = {
			name: searchResult.name,
			category: activeCategory,
			serving_size: `${mult} x ${searchResult.serving_size || '1 serving'}`,
			calories: Math.round(searchResult.calories * mult),
			carbs: Number((searchResult.carbs * mult).toFixed(1)),
			fat: Number((searchResult.fat * mult).toFixed(1)),
			protein: Number((searchResult.protein * mult).toFixed(1)),
			sodium: Math.round(searchResult.sodium * mult),
			sugar: Number((searchResult.sugar * mult).toFixed(1)),
			source: 'log',
			created_at: selectedDate.toISOString()
		}
		try {
			const res = await saveMeal(payload)
			if (res.ok) {
				setMeals(prev => [res.data, ...prev])
				setIsModalOpen(false)
				setSearchQuery('')
				setSearchResult(null)
			} else {
				setSearchError(res.error || 'Failed to log searched food.')
			}
		} catch (err) {
			console.error(err)
			setSearchError(err.message || 'Error saving log.')
		}
	}

	const openAddFoodModal = (category) => {
		setActiveCategory(category)
		setModalTab('saved')
		setServingMultiplier(1)
		setIsModalOpen(true)
	}

	const openScanModal = (category) => {
		setActiveCategory(category)
		setAddFoodDropdown(null)
		setScanPreview(null)
		setScanError('')
		setIsScanning(false)
		setIsScanModalOpen(true)
	}

	const handleScanFileChange = async (e) => {
		const file = e.target.files?.[0]
		if (!file) return
		let fileToProcess = file
		try {
			fileToProcess = await compressImage(file, 1024, 1024, 0.75)
		} catch (err) {
			console.error('Compression error:', err)
		}
		const reader = new FileReader()
		reader.onload = () => setScanPreview({ file: fileToProcess, url: reader.result })
		reader.readAsDataURL(fileToProcess)
	}

	const handleScanAnalyze = useCallback(async () => {
		if (!scanPreview?.file) return
		setIsScanning(true)
		setScanError('')
		try {
			// 1. Try decoding barcode first
			const barcode = await scanBarcodeFromImage(scanPreview.url)
			if (barcode) {
				const product = await getNutritionByBarcode(barcode)
				if (product) {
					const mockResult = {
						filename: scanPreview.file.name,
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

					navigate('/analysis', {
						state: {
							analysisData: mockResult,
							previewSrc: scanPreview.url,
							fileName: scanPreview.file.name,
						},
					})
					setIsScanModalOpen(false)
					return
				}
			}

			// 2. Fallback to image analysis
			navigate('/analysis', {
				state: {
					isAnalyzing: true,
					previewSrc: scanPreview.url,
					fileName: scanPreview.file.name,
					rawFile: scanPreview.file,
				},
			})
			setIsScanModalOpen(false)
		} catch (err) {
			console.error(err)
			setScanError(err.message || 'Error analyzing image.')
		} finally {
			setIsScanning(false)
		}
	}, [scanPreview, navigate])

	const handleSnapFood = (category) => {
		setAddFoodDropdown(null)
		navigate('/camera')
	}

	const handleLogSavedMeal = async (savedMeal) => {
		const mult = parseFloat(servingMultiplier) || 1
		// Calculate estimated values based on multiplier
		const rawLower = (savedMeal.name || '').toLowerCase()
		const isSalty = rawLower.includes('adobo') || rawLower.includes('sinigang') || rawLower.includes('soy') || rawLower.includes('soup') || rawLower.includes('salty')
		const isSweet = rawLower.includes('halo') || rawLower.includes('sweet') || rawLower.includes('dessert') || rawLower.includes('cake')
		const sodiumVal = savedMeal.sodium ?? (isSalty ? Math.round(savedMeal.calories * 2.1) : Math.round(savedMeal.calories * 1.1))
		const sugarVal = savedMeal.sugar ?? (isSweet ? Number(((savedMeal.carbs || 0) * 0.45).toFixed(1)) : Number(((savedMeal.carbs || 0) * 0.12).toFixed(1)))

		const payload = {
			name: savedMeal.name,
			category: activeCategory,
			search_query: savedMeal.name,
			serving_size: `${mult} x ${savedMeal.serving_size || '1 serving'}`,
			calories: Math.round((savedMeal.calories || 0) * mult),
			carbs: Number(((savedMeal.carbs || 0) * mult).toFixed(1)),
			fat: Number(((savedMeal.fat || 0) * mult).toFixed(1)),
			protein: Number(((savedMeal.protein || 0) * mult).toFixed(1)),
			fiber: Number(((savedMeal.fiber || 0) * mult).toFixed(1)),
			sodium: Math.round(sodiumVal * mult),
			sugar: Number((sugarVal * mult).toFixed(1)),
			confidence: savedMeal.confidence ?? null,
			description: savedMeal.description || 'Logged from Saved Meals collection.',
			source: 'log',
			image: savedMeal.image,
			created_at: selectedDate.toISOString(),
		}

		try {
			const res = await saveMeal(payload)
			if (res.ok) {
				setMeals(prev => [res.data, ...prev])
				setIsModalOpen(false)
			} else {
				alert(res.error || 'Failed to log food.')
			}
		} catch (err) {
			console.error(err)
			alert('Error logging food.')
		}
	}

	const handleLogQuickAdd = async (e) => {
		e.preventDefault()
		if (!quickAddName.trim()) {
			alert('Food name is required.')
			return
		}

		const payload = {
			name: quickAddName.trim(),
			category: activeCategory,
			serving_size: quickAddServing.trim() || '1 serving',
			calories: parseFloat(quickAddCalories) || 0,
			carbs: parseFloat(quickAddCarbs) || 0,
			fat: parseFloat(quickAddFat) || 0,
			protein: parseFloat(quickAddProtein) || 0,
			sodium: parseFloat(quickAddSodium) || 0,
			sugar: parseFloat(quickAddSugar) || 0,
			source: 'log',
			created_at: selectedDate.toISOString()
		}

		try {
			const res = await saveMeal(payload)
			if (res.ok) {
				setMeals(prev => [res.data, ...prev])
				// Reset form fields
				setQuickAddName('')
				setQuickAddServing('1 serving')
				setQuickAddCalories('')
				setQuickAddCarbs('')
				setQuickAddFat('')
				setQuickAddProtein('')
				setQuickAddSodium('')
				setQuickAddSugar('')
				setIsModalOpen(false)
			} else {
				alert(res.error || 'Failed to log quick add food.')
			}
		} catch (err) {
			console.error(err)
			alert('Error saving log.')
		}
	}

	const handleSaveMealAsTemplate = async (meal) => {
		const payload = {
			name: meal.name,
			category: meal.category || 'Meal',
			serving_size: meal.serving_size || '1 serving',
			calories: meal.calories || 0,
			carbs: meal.carbs || 0,
			fat: meal.fat || 0,
			protein: meal.protein || 0,
			fiber: meal.fiber || 0,
			sodium: meal.sodium || 0,
			sugar: meal.sugar || 0,
			description: meal.description || 'Saved from log.',
			source: 'analysis',
			image: meal.image,
		}

		try {
			const res = await saveMeal(payload)
			if (res.ok) {
				setMeals(prev => [res.data, ...prev])
				return true
			} else {
				console.error(res.error || 'Failed to save meal.')
				return false
			}
		} catch (err) {
			console.error(err)
			return false
		}
	}


	const handleSaveGoals = async (e) => {
		e.preventDefault()
		try {
			const payload = {
				daily_calorie_goal: editedGoals.calories,
				daily_carbs_goal: editedGoals.carbs,
				daily_protein_goal: editedGoals.protein,
				daily_fat_goal: editedGoals.fat,
				daily_sodium_goal: editedGoals.sodium,
				daily_sugar_goal: editedGoals.sugar
			}
			const res = await updateCalorieGoalManual(payload)
			if (res.ok) {
				setGoals(editedGoals)
				localStorage.setItem('nutrisnap_daily_goals', JSON.stringify(editedGoals))
				setIsEditingGoals(false)
			} else {
				alert(res.error || 'Failed to update goals in database.')
			}
		} catch (err) {
			console.error(err)
			alert('Error updating goals.')
		}
	}

	const openNameModal = () => {
		setTempName(userName)
		setNameError('')
		setIsNameModalOpen(true)
	}

	const handleSaveName = async (e) => {
		if (e) e.preventDefault()
		if (!tempName.trim()) {
			setNameError('Name is required.')
			return
		}
		if (!rawGoalConfig) {
			setNameError('Goal parameters not loaded yet.')
			return
		}
		setIsSavingName(true)
		setNameError('')
		try {
			const payload = {
				name: tempName.trim(),
				goal: rawGoalConfig.goal,
				activity_level: rawGoalConfig.activity_level,
				sex: rawGoalConfig.sex,
				birthday: rawGoalConfig.birthday,
				height_cm: rawGoalConfig.height_cm,
				weight_kg: rawGoalConfig.weight_kg,
				goal_weight_kg: rawGoalConfig.goal_weight_kg,
				weekly_goal_kg: rawGoalConfig.weekly_goal_kg
			}
			const res = await saveCalorieGoal(payload)
			if (res.ok) {
				setUserName(payload.name)
				localStorage.setItem('nutrisnap_user_name', payload.name)
				setRawGoalConfig(res.data)
				setIsNameModalOpen(false)
			} else {
				setNameError(res.error || 'Failed to update name.')
			}
		} catch (err) {
			console.error(err)
			setNameError(err.message || 'Error updating name.')
		} finally {
			setIsSavingName(false)
		}
	}

	// SVG Circular progress bar values
	const caloriesPct = Math.min(100, Math.max(0, (totals.calories / goals.calories) * 100))
	const strokeDashoffset = 220 - (220 * caloriesPct) / 100

	// Total macros sum to draw a stacked bar chart
	const macrosTotalGrams = totals.carbs + totals.protein + totals.fat
	const carbsBarPct = macrosTotalGrams > 0 ? (totals.carbs / macrosTotalGrams) * 100 : 0
	const proteinBarPct = macrosTotalGrams > 0 ? (totals.protein / macrosTotalGrams) * 100 : 0
	const fatBarPct = macrosTotalGrams > 0 ? (totals.fat / macrosTotalGrams) * 100 : 0

	return (
		<>
			<Navbar />
			<main className="bg-[var(--app-color-surface)] min-h-screen app-font-body pb-32 flex flex-col items-center">
				
				{/* Top Header Section - Premium Text-only style */}
				<div className="w-full max-w-[1200px] px-6 md:px-10 pt-8 pb-2 flex flex-col md:flex-row md:items-center justify-between gap-6 select-none w-full">
					<div className="space-y-1">
						<p 
							onClick={openNameModal}
							className="text-[0.7rem] font-black tracking-widest text-[#75b140] hover:text-[#5e9631] active:scale-95 transition-all uppercase font-poppins cursor-pointer select-none flex items-center gap-1.5 group"
							title="Click to change what we call you"
						>
							{userName ? `Hey, ${userName}!` : 'Hey there!'}
							<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="h-3.5 w-3.5 inline-block opacity-60 group-hover:opacity-100 transition-opacity">
								<path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
							</svg>
						</p>
						<h1 className="text-3xl font-extrabold tracking-tight md:text-4xl text-[var(--app-color-ink)] font-poppins">Daily Food Log</h1>
						<p className="text-xs font-semibold text-slate-500">View stats and manage your diary entries</p>
					</div>

					{/* Calendar / Date Slider Component */}
					<div className="flex items-center bg-white border border-slate-200/80 rounded-full px-5 py-2.5 text-slate-800 shadow-sm gap-4 select-none">
						<button 
							onClick={handlePrevDay} 
							className="text-slate-400 hover:text-[var(--app-color-primary)] active:scale-90 transition-colors cursor-pointer font-bold text-lg px-2"
							aria-label="Previous day"
						>
							&#9664;
						</button>

						<div className="flex flex-col items-center">
							<span className="text-[0.6rem] font-black text-slate-400 uppercase tracking-widest font-poppins">Your Food Diary For:</span>
							<div className="flex items-center gap-2 mt-0.5 relative">
								<span className="font-extrabold text-xs md:text-sm leading-none text-slate-800">
									{formatDateLabel(selectedDate)}
								</span>
								<label htmlFor="calendar-picker" className="cursor-pointer hover:opacity-85 transition-opacity">
									<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-4 w-4 text-[var(--app-color-primary)]">
										<path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
									</svg>
								</label>
								<input 
									type="date" 
									id="calendar-picker"
									onChange={handleDateChange}
									value={selectedDate.toISOString().split('T')[0]}
									className="absolute inset-0 opacity-0 w-full cursor-pointer" 
								/>
							</div>
						</div>

						<button 
							onClick={handleNextDay} 
							className="text-slate-400 hover:text-[var(--app-color-primary)] active:scale-90 transition-colors cursor-pointer font-bold text-lg px-2"
							aria-label="Next day"
						>
							&#9654;
						</button>
					</div>
				</div>

				{/* Main Content Area */}
				<div className="w-full max-w-[1200px] px-6 md:px-10 grid grid-cols-1 md:grid-cols-12 gap-8 pt-4">
					
					{/* Left Column (Diary Tables) */}
					<div className="md:col-span-7 flex flex-col gap-8">
						
						{error && (
							<div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
								{error}
							</div>
						)}

						{isLoading ? (
							<div className="rounded-[1.5rem] border border-dashed border-[var(--app-color-muted)]/30 bg-white/50 px-4 py-16 text-center text-sm text-[var(--app-color-muted)]">
								Loading your diary logs...
							</div>
						) : (
							CATEGORIES.map((category) => {
								const catMeals = groupedMeals[category] || []
								const catCalories = Math.round(catMeals.reduce((sum, m) => sum + (m.calories || 0), 0))
								const emojiMap = {
									Breakfast: '🥐',
									Lunch: '🥪',
									Dinner: '🍲',
									Snacks: '🍪'
								}
								const emptyMsgMap = {
									Breakfast: 'No food logged yet — tap Add Food to start your morning.',
									Lunch: 'No food logged yet.',
									Dinner: 'No food logged yet.',
									Snacks: 'No food logged yet.'
								}
								return (
									<div key={category} className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-[0_4px_25px_rgba(0,0,0,0.02)] flex flex-col relative">
										{/* Section Header */}
										<div className="flex items-center justify-between border-b border-dotted border-slate-200 pb-4 mb-4 select-none">
											<div className="flex items-center gap-3">
												<span className="text-3xl select-none filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.1)]">{emojiMap[category]}</span>
												<div className="flex flex-col">
													<h2 className="text-lg font-extrabold text-[var(--app-color-ink)] leading-snug font-poppins">{category}</h2>
													<span className="text-[0.7rem] font-bold text-slate-400">{catCalories} kcal logged</span>
												</div>
											</div>
											<div className="relative">
												<button
													onClick={() => setAddFoodDropdown(addFoodDropdown === category ? null : category)}
													className="px-5 py-2.5 rounded-full bg-[#163f22] text-white hover:bg-[#2c5e2e] transition-all font-bold text-xs shadow-sm cursor-pointer font-poppins flex items-center gap-1.5"
												>
													+ Add Food
													<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className={`h-3 w-3 transition-transform ${addFoodDropdown === category ? 'rotate-180' : ''}`}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
												</button>
 
												{/* Dropdown Menu */}
												{addFoodDropdown === category && (
													<>
														{/* Invisible overlay to close dropdown */}
														<div className="fixed inset-0 z-40" onClick={() => setAddFoodDropdown(null)} />
														<div className="absolute right-0 top-full mt-2 z-50 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 app-font-alt overflow-hidden animate-in fade-in slide-in-from-top-1">
															{/* Add Manual Food */}
															<button
																onClick={() => { setAddFoodDropdown(null); openAddFoodModal(category) }}
																className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[0.78rem] font-semibold text-slate-700 hover:bg-[var(--app-color-surface)] transition-colors cursor-pointer"
															>
																<span className="flex items-center justify-center h-7 w-7 rounded-lg bg-blue-50 text-blue-600 shrink-0">
																	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
																</span>
																<div>
																	<p className="font-bold text-slate-800">Add Manual Food</p>
																	<p className="text-[0.65rem] text-slate-400 font-medium">Search or enter manually</p>
																</div>
															</button>
															{/* Scan Barcode */}
															<button
																onClick={() => openScanModal(category)}
																className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[0.78rem] font-semibold text-slate-700 hover:bg-[var(--app-color-surface)] transition-colors cursor-pointer"
															>
																<span className="flex items-center justify-center h-7 w-7 rounded-lg bg-amber-50 text-amber-600 shrink-0">
																	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75H16.5v-.75z" /></svg>
																</span>
																<div>
																	<p className="font-bold text-slate-800">Scan Barcode</p>
																	<p className="text-[0.65rem] text-slate-400 font-medium">Upload or take a photo</p>
																</div>
															</button>
															{/* Snap Food */}
															<button
																onClick={() => handleSnapFood(category)}
																className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[0.78rem] font-semibold text-slate-700 hover:bg-[var(--app-color-surface)] transition-colors cursor-pointer"
															>
																<span className="flex items-center justify-center h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
																	<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.04l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" /></svg>
																</span>
																<div>
																	<p className="font-bold text-slate-800">Snap Food</p>
																	<p className="text-[0.65rem] text-slate-400 font-medium">Analyze with camera</p>
																</div>
															</button>
														</div>
													</>
												)}
											</div>
										</div>
 
										{/* Logs Table */}
										{catMeals.length === 0 ? (
											<div className="py-2.5 select-none">
												<p className="text-xs font-semibold text-slate-400 italic font-poppins flex items-center gap-2">
													<span className="text-slate-300">•</span>
													{emptyMsgMap[category] || 'No food logged yet.'}
												</p>
											</div>
										) : (
											<div className="overflow-x-auto">
												<table className="w-full text-left border-collapse text-[0.72rem] app-font-alt">
													<thead>
														<tr className="border-b border-slate-100 text-[0.62rem] uppercase font-black text-slate-400 tracking-wider">
															<th className="py-2 pr-4 min-w-[150px]">Food Item</th>
															<th className="py-2 text-center">Calories</th>
															<th className="py-2 text-center">Carbs</th>
															<th className="py-2 text-center">Fat</th>
															<th className="py-2 text-center">Protein</th>
															<th className="py-2 text-center">Sodium</th>
															<th className="py-2 text-center">Sugar</th>
															<th className="py-2 text-center">Action</th>
														</tr>
													</thead>
													<tbody className="divide-y divide-slate-100 font-semibold text-slate-600">
														{catMeals.map((meal) => {
															// Estimating sodium/sugar fallback values
															const nameLower = (meal.name || '').toLowerCase()
															const isSalty = nameLower.includes('adobo') || nameLower.includes('sinigang') || nameLower.includes('soy') || nameLower.includes('soup') || nameLower.includes('salty')
															const isSweet = nameLower.includes('halo') || nameLower.includes('sweet') || nameLower.includes('dessert') || nameLower.includes('cake')
															const sodiumDisplay = meal.sodium ?? (isSalty ? Math.round(meal.calories * 2.1) : Math.round(meal.calories * 1.1))
															const sugarDisplay = meal.sugar ?? (isSweet ? Number(((meal.carbs || 0) * 0.45).toFixed(1)) : Number(((meal.carbs || 0) * 0.12).toFixed(1)))

															return (
																<tr key={meal.id} className="hover:bg-slate-50/40 transition-colors cursor-pointer" onClick={() => setSelectedMeal(meal)}>
																	<td className="py-2.5 pr-4">
																		<div className="flex items-center gap-3">
																			{meal.image ? (
																				<img 
																					src={meal.image} 
																					alt={meal.name} 
																					className="h-8 w-8 rounded-lg object-cover flex-shrink-0 border border-slate-100 select-none" 
																				/>
																			) : (
																				<div className="h-8 w-8 rounded-lg bg-[var(--app-color-surface)] text-[var(--app-color-primary)] font-bold flex items-center justify-center flex-shrink-0 text-xs border border-slate-100 select-none">
																					{(meal.name || 'F').charAt(0).toUpperCase()}
																				</div>
																			)}
																			<div>
																				<p className="font-extrabold text-slate-800 leading-tight">{meal.name}</p>
																				<p className="text-[0.62rem] text-slate-400 font-medium">{meal.serving_size || '1 serving'}</p>
																			</div>
																		</div>
																	</td>
																	<td className="py-2.5 text-center text-slate-800 font-bold">{Math.round(meal.calories)} kcal</td>
																	<td className="py-2.5 text-center text-[#b78103]">{Math.round(meal.carbs)}g</td>
																	<td className="py-2.5 text-center text-[#e65100]">{Math.round(meal.fat)}g</td>
																	<td className="py-2.5 text-center text-[var(--app-color-primary-dark)]">{Math.round(meal.protein)}g</td>
																	<td className="py-2.5 text-center text-slate-500">{Math.round(sodiumDisplay)}mg</td>
																	<td className="py-2.5 text-center text-slate-500">{Math.round(sugarDisplay)}g</td>
																	<td className="py-2.5 text-center">
																		<button
																			onClick={(e) => { e.stopPropagation(); setDeleteConfirmMealId(meal.id); }}
																			className="p-1 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
																			title="Remove entry"
																		>
																			<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="h-4 w-4">
																				<path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
																			</svg>
																		</button>
																	</td>
																</tr>
															)
														})}
													</tbody>
												</table>
											</div>
										)}
									</div>
								)
							})
						)}
					</div>

					{/* Right Column (Goals, Ring Chart & Summary Table) */}
					<div className="md:col-span-5 flex flex-col gap-6 md:sticky md:top-24 md:self-start">
						
						{/* Progress Card (Calories & Macros Graph) - Premium Dark Green gradient style */}
						<div className="bg-gradient-to-br from-[#163f22] via-[#225732] to-[#0f2d17] text-white rounded-[2rem] p-6 shadow-xl flex flex-col items-center border border-black/5 select-none w-full">
							<h2 className="text-xs font-black uppercase tracking-widest text-[#c7e18a] mb-5 font-poppins">Daily Calorie Balance</h2>

							{/* Calories Circular Donut-Pie Graph */}
							<div className="relative w-36 h-36 flex items-center justify-center mb-6">
								<svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
									{/* Background Ring */}
									<circle 
										cx="50" cy="50" r="36" 
										fill="transparent" 
										stroke="#1a4929" 
										strokeWidth="11" 
									/>
									{/* Consumed Segment (Neon Green/Lime) */}
									<circle 
										cx="50" cy="50" r="36" 
										fill="transparent" 
										stroke="#9dbd57" 
										strokeWidth="11"
										strokeDasharray="226.19"
										strokeDashoffset={226.19 - (226.19 * Math.min(100, caloriesPct)) / 100}
										strokeLinecap="round"
										style={{ transition: 'stroke-dashoffset 0.8s ease' }}
									/>
									{/* Over-Limit segment overlay (Rose Red) */}
									{remaining.calories < 0 && (
										<circle 
											cx="50" cy="50" r="36" 
											fill="transparent" 
											stroke="#f43f5e" 
											strokeWidth="11"
											strokeDasharray="226.19"
											strokeDashoffset={226.19 - (226.19 * Math.min(100, (Math.abs(remaining.calories) / goals.calories) * 100)) / 100}
											strokeLinecap="round"
											style={{ transition: 'stroke-dashoffset 0.8s ease' }}
										/>
									)}
								</svg>
								{/* Core Label */}
								<div className="absolute flex flex-col items-center text-center select-none">
									<span className={`text-3xl font-extrabold font-poppins leading-none ${remaining.calories < 0 ? 'text-rose-400' : 'text-white'}`}>
										{Math.abs(remaining.calories)}
									</span>
									<span className="text-[0.6rem] font-bold text-white/75 uppercase tracking-widest mt-1">
										{remaining.calories < 0 ? 'over limit' : 'kcal left'}
									</span>
								</div>
							</div>

							{/* Calorie Math Equation */}
							<div className="flex items-center justify-between w-full bg-black/20 rounded-2xl p-4 text-xs font-semibold mb-6 select-none border-none">
								<div className="flex flex-col items-center flex-1">
									<span className="text-[0.55rem] uppercase font-bold text-white/50 tracking-wider">Target</span>
									<span className="font-extrabold text-white mt-1">{goals.calories}</span>
								</div>
								<span className="text-white/20 font-black text-sm px-1">−</span>
								<div className="flex flex-col items-center flex-1">
									<span className="text-[0.55rem] uppercase font-bold text-white/50 tracking-wider">Logged</span>
									<span className="font-extrabold text-[#e0f15a] mt-1">{Math.round(totals.calories)}</span>
								</div>
								<span className="text-white/20 font-black text-sm px-1">=</span>
								<div className="flex flex-col items-center flex-1">
									<span className="text-[0.55rem] uppercase font-bold text-white/50 tracking-wider">{remaining.calories < 0 ? 'Over' : 'Left'}</span>
									<span className={`font-extrabold mt-1 ${remaining.calories < 0 ? 'text-rose-400' : 'text-white'}`}>
										{Math.abs(remaining.calories)}
									</span>
								</div>
							</div>

							{/* Macros Horizontal Stacked Distribution Chart */}
							<div className="w-full flex flex-col gap-2">
								<div className="flex justify-between text-[0.68rem] font-bold text-white/80 select-none">
									<span>Macronutrient Breakdown</span>
									<span>{Math.round(macrosTotalGrams)}g logged</span>
								</div>
								
								{/* Stacked Progress Bar */}
								<div className="h-3 w-full bg-white/10 rounded-full overflow-hidden flex">
									{macrosTotalGrams === 0 ? (
										<div className="w-full h-full bg-white/5" />
									) : (
										<>
											<div style={{ width: `${carbsBarPct}%` }} className="h-full bg-[#b78103]" title={`Carbs: ${Math.round(carbsBarPct)}%`} />
											<div style={{ width: `${proteinBarPct}%` }} className="h-full bg-[#9dbd57]" title={`Protein: ${Math.round(proteinBarPct)}%`} />
											<div style={{ width: `${fatBarPct}%` }} className="h-full bg-[#e65100]" title={`Fat: ${Math.round(fatBarPct)}%`} />
										</>
									)}
								</div>

								{/* Legend */}
								<div className="flex items-center justify-center gap-4 text-[0.68rem] font-bold text-white/90 select-none mt-1">
									<div className="flex items-center gap-1.5">
										<span className="h-2 w-2 rounded-full bg-[#b78103]" />
										<span>Carbs ({Math.round(carbsBarPct)}%)</span>
									</div>
									<div className="flex items-center gap-1.5">
										<span className="h-2 w-2 rounded-full bg-[#9dbd57]" />
										<span>Protein ({Math.round(proteinBarPct)}%)</span>
									</div>
									<div className="flex items-center gap-1.5">
										<span className="h-2 w-2 rounded-full bg-[#e65100]" />
										<span>Fat ({Math.round(fatBarPct)}%)</span>
									</div>
								</div>
							</div>
						</div>

						{/* Nutrition Targets Table */}
						<div className="bg-white border border-[var(--app-color-muted)]/15 rounded-3xl p-6 shadow-sm overflow-hidden flex flex-col">
							<h3 className="text-xs font-black uppercase tracking-widest text-[var(--app-color-muted)] mb-4 select-none font-poppins">Nutritional Targets</h3>

							<div className="overflow-x-auto">
								<table className="w-full text-left border-collapse text-[0.72rem] app-font-alt">
									<thead>
										<tr className="border-b border-slate-100 text-[0.62rem] uppercase font-black text-slate-400 tracking-wider">
											<th className="py-2">Nutrient</th>
											<th className="py-2 text-center">Logged</th>
											<th className="py-2 text-center">Goal</th>
											<th className="py-2 text-center">Remaining</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-slate-100 font-semibold text-slate-600">
										{/* Calories Row */}
										<tr className="hover:bg-slate-50/20">
											<td className="py-2 font-extrabold text-slate-800">Calories</td>
											<td className="py-2 text-center">{Math.round(totals.calories)} kcal</td>
											<td className="py-2 text-center">{goals.calories} kcal</td>
											<td className={`py-2 text-center font-extrabold ${remaining.calories < 0 ? 'text-rose-600' : 'text-[#4b6e3d]'}`}>
												{remaining.calories} kcal
											</td>
										</tr>
										{/* Carbs Row */}
										<tr className="hover:bg-slate-50/20">
											<td className="py-2 font-extrabold text-slate-800">Carbs</td>
											<td className="py-2 text-center">{Math.round(totals.carbs)}g</td>
											<td className="py-2 text-center">{goals.carbs}g</td>
											<td className={`py-2 text-center font-extrabold ${remaining.carbs < 0 ? 'text-rose-600' : 'text-[#4b6e3d]'}`}>
												{remaining.carbs}g
											</td>
										</tr>
										{/* Fats Row */}
										<tr className="hover:bg-slate-50/20">
											<td className="py-2 font-extrabold text-slate-800">Fat</td>
											<td className="py-2 text-center">{Math.round(totals.fat)}g</td>
											<td className="py-2 text-center">{goals.fat}g</td>
											<td className={`py-2 text-center font-extrabold ${remaining.fat < 0 ? 'text-rose-600' : 'text-[#4b6e3d]'}`}>
												{remaining.fat}g
											</td>
										</tr>
										{/* Protein Row */}
										<tr className="hover:bg-slate-50/20">
											<td className="py-2 font-extrabold text-slate-800">Protein</td>
											<td className="py-2 text-center">{Math.round(totals.protein)}g</td>
											<td className="py-2 text-center">{goals.protein}g</td>
											<td className={`py-2 text-center font-extrabold ${remaining.protein < 0 ? 'text-rose-600' : 'text-[#4b6e3d]'}`}>
												{remaining.protein}g
											</td>
										</tr>
										{/* Sodium Row */}
										<tr className="hover:bg-slate-50/20">
											<td className="py-2 font-extrabold text-slate-800">Sodium</td>
											<td className="py-2 text-center">{Math.round(totals.sodium)}mg</td>
											<td className="py-2 text-center">{goals.sodium}mg</td>
											<td className={`py-2 text-center font-extrabold ${remaining.sodium < 0 ? 'text-rose-600' : 'text-[#4b6e3d]'}`}>
												{remaining.sodium}mg
											</td>
										</tr>
										{/* Sugar Row */}
										<tr className="hover:bg-slate-50/20">
											<td className="py-2 font-extrabold text-slate-800">Sugar</td>
											<td className="py-2 text-center">{Math.round(totals.sugar)}g</td>
											<td className="py-2 text-center">{goals.sugar}g</td>
											<td className={`py-2 text-center font-extrabold ${remaining.sugar < 0 ? 'text-rose-600' : 'text-[#4b6e3d]'}`}>
												{remaining.sugar}g
											</td>
										</tr>
									</tbody>
								</table>
							</div>
						</div>
					</div>
				</div>
			</main>

			{/* GOALS EDIT MODAL */}
			{isEditingGoals && (
				<div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
					<div className="w-full max-w-[420px] bg-white rounded-3xl shadow-2xl p-6 flex flex-col font-poppins">
						<h3 className="text-lg font-extrabold text-[var(--app-color-ink)] mb-4">Edit Daily Targets</h3>
						<form onSubmit={handleSaveGoals} className="flex flex-col gap-3 text-sm">
							<div className="flex flex-col gap-1">
								<label className="font-bold text-xs text-slate-400 uppercase">Calories Goal (kcal)</label>
								<input 
									type="number" 
									required 
									value={editedGoals.calories}
									onChange={e => setEditedGoals({ ...editedGoals, calories: parseInt(e.target.value) || 0 })}
									className="px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none text-slate-800 app-font-alt focus:border-[var(--app-color-primary)] font-semibold" 
								/>
							</div>
							<div className="flex flex-col gap-1">
								<label className="font-bold text-xs text-slate-400 uppercase">Carbohydrates Goal (g)</label>
								<input 
									type="number" 
									required 
									value={editedGoals.carbs}
									onChange={e => setEditedGoals({ ...editedGoals, carbs: parseInt(e.target.value) || 0 })}
									className="px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none text-slate-800 app-font-alt focus:border-[var(--app-color-primary)] font-semibold" 
								/>
							</div>
							<div className="flex flex-col gap-1">
								<label className="font-bold text-xs text-slate-400 uppercase">Protein Goal (g)</label>
								<input 
									type="number" 
									required 
									value={editedGoals.protein}
									onChange={e => setEditedGoals({ ...editedGoals, protein: parseInt(e.target.value) || 0 })}
									className="px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none text-slate-800 app-font-alt focus:border-[var(--app-color-primary)] font-semibold" 
								/>
							</div>
							<div className="flex flex-col gap-1">
								<label className="font-bold text-xs text-slate-400 uppercase">Fat Goal (g)</label>
								<input 
									type="number" 
									required 
									value={editedGoals.fat}
									onChange={e => setEditedGoals({ ...editedGoals, fat: parseInt(e.target.value) || 0 })}
									className="px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none text-slate-800 app-font-alt focus:border-[var(--app-color-primary)] font-semibold" 
								/>
							</div>
							<div className="flex flex-col gap-1">
								<label className="font-bold text-xs text-slate-400 uppercase">Sodium Goal (mg)</label>
								<input 
									type="number" 
									required 
									value={editedGoals.sodium}
									onChange={e => setEditedGoals({ ...editedGoals, sodium: parseInt(e.target.value) || 0 })}
									className="px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none text-slate-800 app-font-alt focus:border-[var(--app-color-primary)] font-semibold" 
								/>
							</div>
							<div className="flex flex-col gap-1">
								<label className="font-bold text-xs text-slate-400 uppercase">Sugar Goal (g)</label>
								<input 
									type="number" 
									required 
									value={editedGoals.sugar}
									onChange={e => setEditedGoals({ ...editedGoals, sugar: parseInt(e.target.value) || 0 })}
									className="px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none text-slate-800 app-font-alt focus:border-[var(--app-color-primary)] font-semibold" 
								/>
							</div>

							<div className="flex items-center justify-end gap-3 mt-4">
								<button 
									type="button" 
									onClick={() => setIsEditingGoals(false)}
									className="px-4.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full font-bold cursor-pointer transition-colors"
								>
									Cancel
								</button>
								<button 
									type="submit" 
									className="px-4.5 py-2 bg-[var(--app-color-primary-dark)] hover:bg-[var(--app-color-primary)] text-white rounded-full font-bold cursor-pointer transition-colors"
								>
									Save Goals
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* LOG FOOD MODAL */}
			{isModalOpen && (
				<div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
					<div className="w-full max-w-[560px] bg-white rounded-3xl shadow-2xl p-6 flex flex-col font-poppins max-h-[85vh]">
						<h3 className="text-lg font-extrabold text-[var(--app-color-ink)] mb-3">Add Food to {activeCategory}</h3>

						{/* Modal Tabs */}
						<div className="flex border-b border-slate-100 mb-4 select-none text-xs">
							<button 
								onClick={() => setModalTab('saved')} 
								className={`py-2.5 px-4 font-bold border-b-2 transition-all cursor-pointer ${modalTab === 'saved' ? 'border-[var(--app-color-primary)] text-[var(--app-color-primary-dark)]' : 'border-transparent text-slate-400'}`}
							>
								My Saved Meals
							</button>
							<button 
								onClick={() => setModalTab('quick')} 
								className={`py-2.5 px-4 font-bold border-b-2 transition-all cursor-pointer ${modalTab === 'quick' ? 'border-[var(--app-color-primary)] text-[var(--app-color-primary-dark)]' : 'border-transparent text-slate-400'}`}
							>
								Quick Add Custom
							</button>
							<button 
								onClick={() => setModalTab('search')} 
								className={`py-2.5 px-4 font-bold border-b-2 transition-all cursor-pointer ${modalTab === 'search' ? 'border-[var(--app-color-primary)] text-[var(--app-color-primary-dark)]' : 'border-transparent text-slate-400'}`}
							>
								Automated Search
							</button>
						</div>

						{/* Tab 1: Saved Meals Browser */}
						{modalTab === 'saved' && (
							<div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-1 max-h-[50vh]">
								
								<div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-2xl select-none">
									<label className="text-xs font-bold text-slate-500 uppercase shrink-0">Log Multiplier:</label>
									<input 
										type="number" 
										step="0.1" 
										min="0.1" 
										value={servingMultiplier}
										onChange={e => setServingMultiplier(parseFloat(e.target.value) || 1)}
										className="px-3 py-1.5 w-24 text-center rounded-xl bg-white border border-slate-200 outline-none font-bold text-sm text-slate-800 app-font-alt"
									/>
									<span className="text-[0.65rem] font-semibold text-slate-400 italic">e.g. 1.0 = normal, 1.5 = one and a half servings</span>
								</div>

								{savedMealsTemplates.length === 0 ? (
									<p className="text-sm font-semibold text-slate-400 text-center py-12 italic">You haven't saved any meals yet. Analyze a food item using the camera and save it first!</p>
								) : (
									<div className="flex flex-col gap-2.5">
										{savedMealsTemplates.map((savedMeal) => {
											const mult = parseFloat(servingMultiplier) || 1
											const displayCals = Math.round((savedMeal.calories || 0) * mult)
											return (
												<div 
													key={savedMeal.id}
													className="group border border-slate-100 hover:border-[var(--app-color-primary)]/40 hover:bg-slate-50/30 p-3.5 rounded-2xl flex items-center justify-between gap-4 transition-all"
												>
													<div className="flex items-center gap-3.5">
														{savedMeal.image ? (
															<img 
																src={savedMeal.image} 
																alt={savedMeal.name} 
																className="h-11 w-11 rounded-xl object-cover border border-slate-100 shrink-0 select-none" 
															/>
														) : (
															<div className="h-11 w-11 rounded-xl bg-[var(--app-color-surface)] text-[var(--app-color-primary)] font-extrabold flex items-center justify-center shrink-0 text-sm border border-slate-100 select-none">
																{savedMeal.name.charAt(0).toUpperCase()}
															</div>
														)}
														<div>
															<h4 className="font-extrabold text-sm text-slate-800">{savedMeal.name}</h4>
															<p className="text-[0.68rem] text-slate-400 font-bold mt-0.5 uppercase tracking-wide">
																{displayCals} kcal • C:{Math.round((savedMeal.carbs || 0) * mult)}g • P:{Math.round((savedMeal.protein || 0) * mult)}g • F:{Math.round((savedMeal.fat || 0) * mult)}g
															</p>
														</div>
													</div>
													
													<button
														onClick={() => handleLogSavedMeal(savedMeal)}
														className="px-4.5 py-2 rounded-xl bg-[var(--app-color-primary-dark)] text-white hover:bg-[var(--app-color-primary)] active:scale-95 transition-all text-xs font-black uppercase tracking-wider cursor-pointer"
													>
														Log
													</button>
												</div>
											)
										})}
									</div>
								)}
							</div>
						)}

						{/* Tab 2: Quick Add Custom Form */}
						{modalTab === 'quick' && (
							<form onSubmit={handleLogQuickAdd} className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 max-h-[50vh]">
								<div className="flex flex-col gap-1">
									<label className="font-bold text-xs text-slate-400 uppercase">Food Name *</label>
									<input 
										type="text" 
										required 
										placeholder="e.g. Fried Egg"
										value={quickAddName}
										onChange={e => setQuickAddName(e.target.value)}
										className="px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none text-slate-800 app-font-alt focus:border-[var(--app-color-primary)] font-semibold"
									/>
								</div>

								<div className="grid grid-cols-2 gap-3">
									<div className="flex flex-col gap-1">
										<label className="font-bold text-xs text-slate-400 uppercase">Serving Size</label>
										<input 
											type="text" 
											placeholder="e.g. 1 pc / 100g"
											value={quickAddServing}
											onChange={e => setQuickAddServing(e.target.value)}
											className="px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none text-slate-800 app-font-alt focus:border-[var(--app-color-primary)] font-semibold"
										/>
									</div>
									<div className="flex flex-col gap-1">
										<label className="font-bold text-xs text-slate-400 uppercase">Calories (kcal)</label>
										<input 
											type="number" 
											placeholder="0"
											value={quickAddCalories}
											onChange={e => setQuickAddCalories(e.target.value)}
											className="px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none text-slate-800 app-font-alt focus:border-[var(--app-color-primary)] font-semibold"
										/>
									</div>
								</div>

								<div className="grid grid-cols-3 gap-3">
									<div className="flex flex-col gap-1">
										<label className="font-bold text-xs text-slate-400 uppercase">Carbs (g)</label>
										<input 
											type="number" 
											step="0.1" 
											placeholder="0"
											value={quickAddCarbs}
											onChange={e => setQuickAddCarbs(e.target.value)}
											className="px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none text-slate-800 app-font-alt focus:border-[var(--app-color-primary)] font-semibold"
										/>
									</div>
									<div className="flex flex-col gap-1">
										<label className="font-bold text-xs text-slate-400 uppercase">Protein (g)</label>
										<input 
											type="number" 
											step="0.1" 
											placeholder="0"
											value={quickAddProtein}
											onChange={e => setQuickAddProtein(e.target.value)}
											className="px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none text-slate-800 app-font-alt focus:border-[var(--app-color-primary)] font-semibold"
										/>
									</div>
									<div className="flex flex-col gap-1">
										<label className="font-bold text-xs text-slate-400 uppercase">Fat (g)</label>
										<input 
											type="number" 
											step="0.1" 
											placeholder="0"
											value={quickAddFat}
											onChange={e => setQuickAddFat(e.target.value)}
											className="px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none text-slate-800 app-font-alt focus:border-[var(--app-color-primary)] font-semibold"
										/>
									</div>
								</div>

								<div className="grid grid-cols-2 gap-3">
									<div className="flex flex-col gap-1">
										<label className="font-bold text-xs text-slate-400 uppercase">Sodium (mg)</label>
										<input 
											type="number" 
											placeholder="0"
											value={quickAddSodium}
											onChange={e => setQuickAddSodium(e.target.value)}
											className="px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none text-slate-800 app-font-alt focus:border-[var(--app-color-primary)] font-semibold"
										/>
									</div>
									<div className="flex flex-col gap-1">
										<label className="font-bold text-xs text-slate-400 uppercase">Sugar (g)</label>
										<input 
											type="number" 
											step="0.1" 
											placeholder="0"
											value={quickAddSugar}
											onChange={e => setQuickAddSugar(e.target.value)}
											className="px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none text-slate-800 app-font-alt focus:border-[var(--app-color-primary)] font-semibold"
										/>
									</div>
								</div>

								<div className="flex items-center justify-end gap-3 mt-4 shrink-0">
									<button 
										type="button" 
										onClick={() => setIsModalOpen(false)}
										className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full font-bold cursor-pointer transition-colors"
									>
										Cancel
									</button>
									<button 
										type="submit" 
										className="px-5 py-2 bg-[var(--app-color-primary-dark)] hover:bg-[var(--app-color-primary)] text-white rounded-full font-bold cursor-pointer transition-colors"
									>
										Log Food
									</button>
								</div>
							</form>
						)}

						{/* Tab 3: Automated Search */}
						{modalTab === 'search' && (
							<div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4 max-h-[50vh] p-5 md:p-6">
								<form onSubmit={handleDatabaseSearch} className="flex gap-2 shrink-0">
									<input 
										type="text" 
										placeholder="Search Spoonacular database... (e.g. Apple)"
										value={searchQuery}
										onChange={e => setSearchQuery(e.target.value)}
										className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none text-slate-800 app-font-alt focus:border-[var(--app-color-primary)] font-semibold text-xs"
									/>
									<button 
										type="submit"
										disabled={searchLoading}
										className="px-5 py-2.5 rounded-xl bg-[var(--app-color-primary-dark)] text-white font-bold text-xs uppercase tracking-wider hover:bg-[var(--app-color-primary)] active:scale-95 transition-all cursor-pointer border-none outline-none"
									>
										{searchLoading ? 'Searching...' : 'Search'}
									</button>
								</form>

								{searchError && (
									<div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-2.5 text-xs font-semibold text-rose-700 shrink-0">
										{searchError}
									</div>
								)}

								{searchResult && (
									<div className="border border-slate-100 bg-slate-50/50 p-4 rounded-2xl flex flex-col gap-3">
										<div className="flex items-center justify-between">
											<div>
												<h4 className="font-extrabold text-sm text-slate-800">{searchResult.name}</h4>
												<p className="text-[0.68rem] text-slate-400 font-bold uppercase tracking-wide">Serving: {searchResult.serving_size}</p>
											</div>
										</div>

										<div className="flex items-center gap-3 p-3 bg-white border border-slate-100/60 rounded-2xl select-none text-xs">
											<label className="font-bold text-slate-500 uppercase shrink-0">Servings / Multiplier:</label>
											<input 
												type="number" 
												step="0.1" 
												min="0.1" 
												value={servingMultiplier}
												onChange={e => setServingMultiplier(parseFloat(e.target.value) || 1)}
												className="px-3 py-1.5 w-24 text-center rounded-xl bg-slate-50 border border-slate-200 outline-none font-bold text-sm text-slate-800 app-font-alt"
											/>
											<span className="text-[0.65rem] text-slate-400 italic">Scale nutrition values</span>
										</div>

										<div className="grid grid-cols-4 gap-2 text-center font-poppins">
											<div className="bg-white border border-slate-100 p-2 rounded-xl">
												<div className="text-sm font-extrabold text-slate-800">{Math.round(searchResult.calories * servingMultiplier)}</div>
												<div className="text-[0.55rem] text-slate-400 uppercase font-bold">kcal</div>
											</div>
											<div className="bg-white border border-slate-100 p-2 rounded-xl">
												<div className="text-sm font-extrabold text-slate-800">{(searchResult.carbs * servingMultiplier).toFixed(1)}g</div>
												<div className="text-[0.55rem] text-slate-400 uppercase font-bold">carbs</div>
											</div>
											<div className="bg-white border border-slate-100 p-2 rounded-xl">
												<div className="text-sm font-extrabold text-slate-800">{(searchResult.protein * servingMultiplier).toFixed(1)}g</div>
												<div className="text-[0.55rem] text-slate-400 uppercase font-bold">protein</div>
											</div>
											<div className="bg-white border border-slate-100 p-2 rounded-xl">
												<div className="text-sm font-extrabold text-slate-800">{(searchResult.fat * servingMultiplier).toFixed(1)}g</div>
												<div className="text-[0.55rem] text-slate-400 uppercase font-bold">fat</div>
											</div>
										</div>

										<div className="flex justify-end gap-2 border-t border-slate-100 pt-3 mt-1 shrink-0">
											<button 
												type="button"
												onClick={() => setSearchResult(null)}
												className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold cursor-pointer text-xs transition-colors border-none outline-none"
											>
												Clear
											</button>
											<button 
												type="button"
												onClick={handleLogSearchResult}
												className="px-4.5 py-2 rounded-xl bg-[var(--app-color-primary-dark)] text-white hover:bg-[var(--app-color-primary)] active:scale-95 transition-all text-xs font-black uppercase tracking-wider cursor-pointer border-none outline-none"
											>
												Log Food
											</button>
										</div>
									</div>
								)}
							</div>
						)}

						{/* Modal Footer (Browse template log tab does not have forms) */}
						{(modalTab === 'saved' || modalTab === 'search') && (
							<div className="flex items-center justify-end gap-3 mt-4 border-t border-slate-100 pt-3 shrink-0">
								<button 
									onClick={() => setIsModalOpen(false)}
									className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full font-bold cursor-pointer transition-colors border-none outline-none text-sm"
								>
									Close
								</button>
							</div>
						)}
					</div>
				</div>
			)}

			{/* SCAN BARCODE / UPLOAD MODAL */}
			{isScanModalOpen && (
				<div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
					<div className="w-full max-w-[460px] bg-white rounded-3xl shadow-2xl p-6 flex flex-col font-poppins">
						<h3 className="text-lg font-extrabold text-[var(--app-color-ink)] mb-1">Scan Barcode / Photo</h3>
						<p className="text-xs font-semibold text-slate-400 mb-5">Upload an image of food or a barcode to analyze and log to <span className="text-[var(--app-color-primary-dark)] font-bold">{activeCategory}</span></p>

						{/* Upload Area */}
						{!scanPreview ? (
							<div className="flex flex-col gap-4">
								{/* Option 1: Live Camera Scan */}
								<button
									type="button"
									onClick={() => openCamera()}
									className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-[var(--app-color-primary-dark)] text-white hover:bg-[var(--app-color-primary)] active:scale-98 transition-all rounded-2xl font-bold text-sm shadow-md cursor-pointer select-none border-none outline-none"
								>
									<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="h-5 w-5">
										<path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.04l-.821 1.316z" />
										<path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
									</svg>
									Scan with Live Camera
								</button>

								<div className="flex items-center my-6 select-none">
									<div className="grow border-t border-slate-100" />
									<span className="px-3 text-[0.68rem] font-bold text-slate-400 uppercase tracking-widest font-poppins">or</span>
									<div className="grow border-t border-slate-100" />
								</div>

								{/* Option 2: Upload Photo */}
								<div
									onClick={() => barcodeFileRef.current?.click()}
									className="border-2 border-dashed border-slate-200 hover:border-[var(--app-color-primary)]/50 rounded-2xl py-8 flex flex-col items-center justify-center cursor-pointer transition-colors group"
								>
									<div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform text-slate-500">
										<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5">
											<path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
										</svg>
									</div>
									<p className="text-xs font-bold text-slate-600">Upload product/barcode photo</p>
									<p className="text-[0.62rem] text-slate-400 font-medium mt-0.5">Click to browse your device</p>
								</div>
							</div>
						) : (
							<div className="flex flex-col items-center gap-4">
								<div className="relative rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
									<img src={scanPreview.url} alt="Preview" className="max-h-56 object-contain rounded-2xl" />
								</div>
								<button
									onClick={() => { setScanPreview(null); setScanError('') }}
									className="text-xs font-bold text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
								>
									Remove & re-upload
								</button>
							</div>
						)}

						<input
							ref={barcodeFileRef}
							type="file"
							accept="image/*"
							capture="environment"
							className="hidden"
							onChange={handleScanFileChange}
						/>

						{/* Error */}
						{scanError && (
							<div className="mt-3 rounded-xl bg-rose-50 border border-rose-200 px-4 py-2.5 text-xs font-semibold text-rose-700">
								{scanError}
							</div>
						)}

						{/* Actions */}
						<div className="flex items-center justify-end gap-3 mt-5">
							<button
								onClick={() => setIsScanModalOpen(false)}
								className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full font-bold cursor-pointer transition-colors text-sm"
							>
								Cancel
							</button>
							{scanPreview && (
								<button
									onClick={handleScanAnalyze}
									disabled={isScanning}
									className={`px-5 py-2 rounded-full font-bold text-sm text-white transition-all cursor-pointer ${isScanning ? 'bg-slate-400' : 'bg-[var(--app-color-primary-dark)] hover:bg-[var(--app-color-primary)]'}`}
								>
									{isScanning ? 'Analyzing...' : 'Analyze & Log'}
								</button>
							)}
						</div>
					</div>
				</div>
			)}

			{/* Open Camera Modal */}
			{isCameraOpen && (
				<CameraModal
					videoRef={videoRef}
					onClose={closeCamera}
					onConfirm={handleCameraCapture}
				/>
			)}

			{/* Custom Delete Confirmation Modal */}
			{deleteConfirmMealId && (
				<div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
					<div className="w-full max-w-[400px] bg-white rounded-3xl shadow-2xl p-6 flex flex-col items-center text-center gap-4 font-poppins">
						<div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
							<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-7 w-7">
								<path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
							</svg>
						</div>
						<div>
							<h3 className="text-lg font-extrabold text-[var(--app-color-ink)] mb-1">Are you sure?</h3>
							<p className="text-xs text-slate-500 font-semibold leading-relaxed">
								Do you want to delete this food log entry from your diary? This action cannot be undone.
							</p>
						</div>
						<div className="flex gap-3 w-full mt-2">
							<button 
								onClick={() => setDeleteConfirmMealId(null)}
								className="flex-1 py-3 px-6 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full font-bold cursor-pointer transition-colors text-sm border-none outline-none"
							>
								No, cancel
							</button>
							<button 
								onClick={confirmDelete}
								className="flex-1 py-3 px-6 bg-rose-600 hover:bg-rose-700 text-white rounded-full font-bold cursor-pointer transition-all active:scale-98 text-sm border-none outline-none shadow-md"
							>
								Yes, delete
							</button>
						</div>
					</div>
				</div>
			)}

			{/* What should we call you Modal */}
			{isNameModalOpen && (
				<div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
					<form 
						onSubmit={handleSaveName}
						className="w-full max-w-[420px] bg-white rounded-[2rem] shadow-2xl p-7 flex flex-col font-poppins text-[#163f22] gap-4"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="space-y-1">
							<h3 className="text-xl font-extrabold font-poppins text-[#163f22]">What should we call you?</h3>
							<p className="text-xs font-semibold text-slate-400">Let's personalize your dashboard greeting</p>
						</div>

						<div className="flex flex-col gap-2">
							<input
								type="text"
								placeholder="Enter your name or nickname"
								value={tempName}
								onChange={(e) => {
									setTempName(e.target.value);
									if (e.target.value.trim()) setNameError('');
								}}
								className={`w-full px-4 py-3 rounded-2xl border outline-none font-semibold text-sm transition-all ${
									nameError
										? "border-rose-500 focus:border-rose-500 bg-rose-50/10"
										: "border-slate-200 focus:border-[var(--app-color-primary)]"
								}`}
								autoFocus
								disabled={isSavingName}
							/>
							{nameError && (
								<p className="text-xs font-bold text-rose-600 select-none">{nameError}</p>
							)}
						</div>

						<div className="flex items-center justify-end gap-3 mt-2">
							<button
								type="button"
								onClick={() => setIsNameModalOpen(false)}
								disabled={isSavingName}
								className="px-5 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold transition-all text-xs border-none cursor-pointer"
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={isSavingName || !tempName.trim()}
								className="px-5 py-2.5 rounded-full bg-[var(--app-color-primary-dark)] hover:bg-[var(--app-color-primary)] text-white font-bold transition-all text-xs border-none cursor-pointer flex items-center gap-1.5 shadow-md disabled:opacity-50"
							>
								{isSavingName ? (
									<>
										<svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
											<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
											<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
										</svg>
										Saving...
									</>
								) : 'Save'}
							</button>
						</div>
					</form>
				</div>
			)}

			{/* Meal Detail Modal */}
			{selectedMeal && (
				<MealDetailModal
					meal={selectedMeal}
					onClose={() => setSelectedMeal(null)}
					onDelete={(id) => setDeleteConfirmMealId(id)}
					onSave={handleSaveMealAsTemplate}
					isAlreadySaved={isAlreadySaved}
				/>
			)}
		</>
	)
}
