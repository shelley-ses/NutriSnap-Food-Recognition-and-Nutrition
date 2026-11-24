import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import MealCard from '../components/common/MealCard'
import MealDetailModal from '../components/common/MealDetailModal'
import { getMeals, deleteMeal } from '../services/api'

const MEAL_FILTERS = ['All', 'Breakfast', 'Lunch', 'Dinner', 'Snack']

const CATEGORY_ACCENTS = {
	Breakfast: {
		bg: '#fff8e1',
		badgeBg: '#fffbeb',
		badgeText: '#b78103',
	},
	Lunch: {
		bg: '#e0f7fa',
		badgeBg: '#e0f7fa',
		badgeText: '#006064',
	},
	Dinner: {
		bg: '#f3e8ff',
		badgeBg: '#faf5ff',
		badgeText: '#6b21a8',
	},
	Snack: {
		bg: '#ffe0b2',
		badgeBg: '#fffbf0',
		badgeText: '#e65100',
	},
	Meal: {
		bg: '#e2efcb',
		badgeBg: '#f4faf0',
		badgeText: '#163f22',
	},
}

const getMealPalette = (category) => CATEGORY_ACCENTS[category] ?? CATEGORY_ACCENTS.Meal

const formatDateLabel = (value) => {
	if (!value) {
		return 'Saved recently'
	}

	const date = new Date(value)
	if (Number.isNaN(date.getTime())) {
		return 'Saved recently'
	}

	return new Intl.DateTimeFormat('en', {
		month: 'short',
		day: 'numeric',
	}).format(date)
}

const slugify = (value) =>
	String(value || 'meal')
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')

const buildMealImage = (meal) => {
	const category = meal?.category?.trim() || 'Meal'
	const palette = getMealPalette(category)
	const title = String(meal?.name || 'Meal').trim() || 'Meal'
	const initials = title
		.split(/\s+/)
		.slice(0, 2)
		.map((part) => part.charAt(0).toUpperCase())
		.join('')

	const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240" role="img" aria-label="${title}">
      <defs>
        <linearGradient id="dish-${slugify(category)}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#fff8ec" />
          <stop offset="100%" stop-color="#f6e7bf" />
        </linearGradient>
      </defs>
      <ellipse cx="160" cy="164" rx="92" ry="64" fill="#d8e7bf" opacity="0.42" />
      <ellipse cx="160" cy="154" rx="86" ry="58" fill="url(#dish-${slugify(category)})" stroke="rgba(0,0,0,0.05)" stroke-width="4" />
      <ellipse cx="160" cy="148" rx="64" ry="36" fill="#ffffff" opacity="0.8" />
      <path d="M88 151c20-24 124-24 144 0" fill="none" stroke="${palette.plate || '#7ba367'}" stroke-width="9" stroke-linecap="round" />
      <circle cx="132" cy="120" r="16" fill="${palette.garnish || '#a4c95e'}" />
      <circle cx="162" cy="108" r="13" fill="${palette.sauce || '#4a7c2f'}" />
      <circle cx="192" cy="123" r="18" fill="${palette.garnish || '#a4c95e'}" />
      <circle cx="153" cy="133" r="8" fill="#fef3c7" />
      <circle cx="179" cy="140" r="7" fill="#f9fafb" />
      <path d="M115 101c0-15 12-27 27-27h36c15 0 27 12 27 27" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="7" stroke-linecap="round" />
      <text x="24" y="52" fill="var(--app-color-ink)" font-size="24" font-weight="700" font-family="Poppins, sans-serif">${initials}</text>
    </svg>
  `

	return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

export default function SaveMealPage() {
	const [meals, setMeals] = useState([])
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState('')
	const [search, setSearch] = useState('')
	const [activeFilter, setActiveFilter] = useState('All')
	const [showScrollBtn, setShowScrollBtn] = useState(true)
	const [viewMode, setViewMode] = useState('grid')
	const [selectedMeal, setSelectedMeal] = useState(null)
	const [deleteConfirmMealId, setDeleteConfirmMealId] = useState(null)

	const loadMeals = async () => {
		setIsLoading(true)
		setError('')

		try {
			const response = await getMeals()
			setMeals(Array.isArray(response?.data) ? response.data : [])
		} catch (requestError) {
			setError(requestError?.message || 'Unable to load saved meals.')
		} finally {
			setIsLoading(false)
		}
	}

	useEffect(() => {
		loadMeals()
	}, [])

	useEffect(() => {
		const handleScroll = () => {
			const isAtBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 120
			setShowScrollBtn(!isAtBottom)
		}
		window.addEventListener('scroll', handleScroll)
		return () => window.removeEventListener('scroll', handleScroll)
	}, [])

	const handleDeleteMeal = async (mealId) => {
		setDeleteConfirmMealId(mealId)
	}

	const confirmDeleteMeal = async () => {
		if (!deleteConfirmMealId) return
		try {
			const response = await deleteMeal(deleteConfirmMealId)
			if (response.ok) {
				setMeals((prevMeals) => prevMeals.filter((m) => m.id !== deleteConfirmMealId))
				setSelectedMeal(null)
			} else {
				setError(response.error || 'Failed to delete the meal.')
			}
		} catch {
			setError('An error occurred while deleting the meal.')
		} finally {
			setDeleteConfirmMealId(null)
		}
	}

	const filteredMeals = useMemo(() => {
		const query = search.trim().toLowerCase()

		return meals.filter((meal) => {
			if (meal.source === 'log') return false;
			const matchesFilter = activeFilter === 'All' || String(meal.category || 'Meal') === activeFilter
			const searchableText = [meal.name, meal.category, meal.search_query, meal.description, meal.serving_size]
				.filter(Boolean)
				.join(' ')
				.toLowerCase()

			return matchesFilter && (!query || searchableText.includes(query))
		})
	}, [activeFilter, meals, search])

	const stats = useMemo(() => {
		const total = meals.length
		const avgCalories = total > 0
			? Math.round(meals.reduce((sum, m) => sum + (m.calories || 0), 0) / total)
			: 0
		return { total, avgCalories }
	}, [meals])

	const totals = useMemo(() => {
		return filteredMeals.reduce((acc, m) => {
			acc.calories += (m.calories || 0)
			acc.protein += (m.protein || 0)
			acc.carbs += (m.carbs || 0)
			acc.fat += (m.fat || 0)
			return acc
		}, { calories: 0, protein: 0, carbs: 0, fat: 0 })
	}, [filteredMeals])

	return (
		<>
			<Navbar />
			<main className="bg-[var(--app-color-surface)] min-h-screen app-font-body relative pb-32 w-full flex flex-col items-center">
				{/* Top Header Section - Premium Text-only style */}
				<div className="w-full max-w-[1200px] px-6 md:px-10 pt-8 pb-2 flex flex-col md:flex-row md:items-center justify-between gap-6 select-none">
					<div className="space-y-1">
						<p className="text-[0.7rem] font-black tracking-widest text-[#75b140] uppercase font-poppins">Your Collection</p>
						<h1 className="text-3xl font-extrabold tracking-tight md:text-4xl text-[var(--app-color-ink)] font-poppins">Saved Meals</h1>
						<p className="text-xs font-semibold text-slate-500">Track your favourite dishes & nutrition</p>
					</div>
				</div>


				{/* Main Content Area - Spaced from header using banner margin-bottom and top padding */}
				<div className="w-full max-w-[1200px] px-6 md:px-10 flex flex-col gap-6 pt-8 md:pt-12 relative z-20" style={{ paddingTop: '32px' }}>
					{/* Search bar and Category filters side-by-side - Fully Rounded Pills */}
					<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full mb-2" style={{ marginTop: '12px', marginBottom: '24px' }}>
						{/* Search input - Rounded-full and stretched to fill space */}
						<div className="grow md:flex-grow md:flex-1 shadow-sm rounded-full overflow-hidden bg-white w-full">
							<span className="sr-only">Search saved meals</span>
							<div className="relative flex items-center border border-[var(--app-color-muted)]/20 rounded-full">
								<span className="absolute left-4 flex items-center pointer-events-none text-[var(--app-color-primary-dark)]">
									<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-5 w-5">
										<path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
									</svg>
								</span>
								<input
									value={search}
									onChange={(event) => setSearch(event.target.value)}
									placeholder="Search saved meals..."
									className="w-full bg-transparent pl-12 pr-5 py-3 text-[1rem] text-[var(--app-color-ink)] outline-none placeholder:text-[var(--app-color-muted)]/50 focus:ring-4 focus:ring-[var(--app-color-primary)]/10 rounded-full"
								/>
							</div>
						</div>

						{/* Category chips filters - Rounded-full */}
						<div className="flex flex-wrap gap-2.5 flex-shrink-0">
							{MEAL_FILTERS.map((filter) => {
								const isActive = activeFilter === filter

								return (
									<button
										key={filter}
										type="button"
										onClick={() => setActiveFilter(filter)}
										className={`rounded-full border px-5 py-2.5 text-[0.88rem] transition font-bold cursor-pointer ${isActive
												? 'border-[var(--app-color-ink)] bg-[var(--app-color-surface)] text-[var(--app-color-ink)] shadow-sm'
												: 'border-[var(--app-color-muted)]/35 bg-white text-[var(--app-color-ink)]/75 hover:border-[var(--app-color-primary)] hover:text-[var(--app-color-ink)]'
											}`}
									>
										{filter}
									</button>
								)
							})}
						</div>
					</div>

					{/* Grid Title Row with View Mode Toggle and Green CTA Button */}
					<div className="flex items-center justify-between mt-2 select-none">
						<h2 className="text-lg font-extrabold text-[var(--app-color-ink)] tracking-tight">
							{activeFilter === 'All' ? 'All meals' : `${activeFilter} meals`}
						</h2>

						<div className="flex items-center gap-3.5">
							{/* View Mode Toggle - Rounded-full */}
							<div className="flex bg-white border border-[var(--app-color-muted)]/20 rounded-full p-1 shadow-sm">
								<button
									type="button"
									onClick={() => setViewMode('grid')}
									className={`p-1.5 rounded-full transition-colors cursor-pointer ${viewMode === 'grid' ? 'bg-[var(--app-color-primary)] text-white' : 'text-[var(--app-color-ink)] hover:bg-slate-50'}`}
									aria-label="Grid view"
								>
									<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4.5 w-4.5">
										<path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25a2.25 2.25 0 01-2.25-2.25V6z" />
									</svg>
								</button>
								<button
									type="button"
									onClick={() => setViewMode('list')}
									className={`p-1.5 rounded-full transition-colors cursor-pointer ${viewMode === 'list' ? 'bg-[var(--app-color-primary)] text-white' : 'text-[var(--app-color-ink)] hover:bg-slate-50'}`}
									aria-label="List view"
								>
									<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4.5 w-4.5">
										<path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
									</svg>
								</button>
							</div>

							{/* + Add new - Green button with white text, fully rounded-full */}
							<Link
								to="/camera"
								className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[var(--app-color-primary-dark)] text-white hover:bg-[var(--app-color-primary)] transition-all font-bold text-sm shadow-sm active:scale-95 cursor-pointer"
							>
								<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="h-4 w-4">
									<path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
								</svg>
								<span>Add new</span>
							</Link>
						</div>
					</div>

					{error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

					{isLoading ? (
						<div className="rounded-[1.5rem] border border-dashed border-[var(--app-color-muted)]/30 bg-white/50 px-4 py-10 text-center text-sm text-[var(--app-color-muted)]">
							Loading saved meals...
						</div>
					) : filteredMeals.length === 0 ? (
						<div className="w-full rounded-[1.5rem] border border-dashed border-[var(--app-color-muted)]/35 bg-white/60 px-4 py-12 flex flex-col items-center justify-center text-center">
							{/* Like Heart Outline SVG inside empty state circle */}
							<div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--app-color-surface)] text-[var(--app-color-primary-dark)] shadow-sm border border-[var(--app-color-muted)]/10">
								<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="h-6 w-6">
									<path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
								</svg>
							</div>
							<p className="mt-4 text-base font-semibold text-[var(--app-color-ink)]">No meals saved yet</p>
							<p className="mt-1 text-sm text-[var(--app-color-muted)]">Search a meal and save it from the analysis screen.</p>
						</div>
					) : viewMode === 'list' ? (
						/* LIST VIEW SECTION */
						<div className="flex flex-col gap-6">
							{/* Mustard-Yellow Nutrition Summary Card */}
							<div className="w-full bg-[#fdfaf2] border border-[#e5d8b3] rounded-2xl p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
								<div>
									<h3 className="text-xs font-bold text-[#b78103] uppercase tracking-wide">Nutrition Summary</h3>
									<p className="text-[0.7rem] text-[#6f8a63] mt-0.5">Aggregated totals for the selected list of meals</p>
								</div>
								<div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full md:w-auto">
									<div className="bg-white border border-[#e5d8b3]/50 rounded-xl px-4 py-2 text-center">
										<p className="text-[0.7rem] font-bold text-slate-400">Calories</p>
										<p className="text-base font-extrabold text-[var(--app-color-ink)] mt-0.5">{Math.round(totals.calories)} kcal</p>
									</div>
									<div className="bg-white border border-[#e5d8b3]/50 rounded-xl px-4 py-2 text-center">
										<p className="text-[0.7rem] font-bold text-slate-400">Carbs</p>
										<p className="text-base font-extrabold text-[#b78103] mt-0.5">{Math.round(totals.carbs)}g</p>
									</div>
									<div className="bg-white border border-[#e5d8b3]/50 rounded-xl px-4 py-2 text-center">
										<p className="text-[0.7rem] font-bold text-slate-400">Protein</p>
										<p className="text-base font-extrabold text-[var(--app-color-primary-dark)] mt-0.5">{Math.round(totals.protein)}g</p>
									</div>
									<div className="bg-white border border-[#e5d8b3]/50 rounded-xl px-4 py-2 text-center">
										<p className="text-[0.7rem] font-bold text-slate-400">Fats</p>
										<p className="text-base font-extrabold text-[#e65100] mt-0.5">{Math.round(totals.fat)}g</p>
									</div>
								</div>
							</div>

							{/* Vertical list of meals */}
							<div className="w-full flex flex-col gap-3.5">
								{filteredMeals.map((meal) => {
									const category = meal?.category?.trim() || 'Meal'
									const palette = getMealPalette(category)
									const imageSrc = meal?.image || meal?.image_url || meal?.photo || buildMealImage(meal)
									const calories = Number(meal?.calories)
									const savedLabel = formatDateLabel(meal?.created_at)
									const displayCategory = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase()

									const lowerCat = category.toLowerCase()
									const isAiAnalysis = lowerCat.includes('clarifai') ||
										lowerCat.includes('gemini') ||
										lowerCat.includes('analysis')

									return (
										<div
											key={meal.id}
											onClick={() => setSelectedMeal(meal)}
											className="group bg-white border border-[var(--app-color-muted)]/15 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-[0_4px_12px_rgba(59,91,26,0.02)] hover:shadow-[0_8px_20px_rgba(59,91,26,0.06)] hover:-translate-y-0.5 transition-all relative overflow-hidden cursor-pointer"
										>
											<div className="flex items-center gap-4">
												{/* Meal Image */}
												<div
													className="h-16 w-16 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 relative"
													style={{ backgroundColor: palette.bg }}
												>
													<img src={imageSrc} alt={meal.name} className="h-full w-full object-cover select-none" />
												</div>

												{/* Name and Categories */}
												<div className="space-y-1">
													<div className="flex items-center gap-2 flex-wrap">
														<h3 className="font-extrabold text-[var(--app-color-ink)] leading-snug text-sm sm:text-base">{meal.name}</h3>
														{!isAiAnalysis && (
															<span
																className="rounded-full px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider border border-black/5"
																style={{ backgroundColor: palette.badgeBg, color: palette.badgeText }}
															>
																{displayCategory}
															</span>
														)}
													</div>
													<div className="flex items-center gap-3 text-xs font-semibold text-[var(--app-color-muted)] flex-wrap">
														<span className="text-[var(--app-color-ink)]">{Math.round(calories)} kcal</span>
														<span className="h-1 w-1 bg-slate-300 rounded-full" />
														<span className="text-[#b78103]">C: {Math.round(meal.carbs || 0)}g</span>
														<span className="h-1 w-1 bg-slate-300 rounded-full" />
														<span className="text-[var(--app-color-primary-dark)]">P: {Math.round(meal.protein || 0)}g</span>
														<span className="h-1 w-1 bg-slate-300 rounded-full" />
														<span className="text-[#e65100]">F: {Math.round(meal.fat || 0)}g</span>
													</div>
												</div>
											</div>

											{/* Date and Action Block */}
											<div className="flex items-center gap-4">
												<span className="hidden sm:inline text-xs font-semibold text-[var(--app-color-muted)]/75">Saved {savedLabel}</span>
												<button
													type="button"
													onClick={(e) => { e.stopPropagation(); handleDeleteMeal(meal.id) }}
													className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 bg-slate-50 border border-slate-200/60 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-all cursor-pointer active:scale-95"
													aria-label="Delete saved meal"
												>
													<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="h-4 w-4">
														<path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
													</svg>
												</button>
											</div>
										</div>
									)
								})}
							</div>
						</div>
					) : (
						/* GRID VIEW SECTION */
						<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 w-full">
							{filteredMeals.map((meal) => (
								<MealCard key={meal.id} meal={meal} onDelete={handleDeleteMeal} onClick={() => setSelectedMeal(meal)} />
							))}
						</div>
					)}
				</div>

				{showScrollBtn && meals.length > 0 && (
					<button
						type="button"
						onClick={() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })}
						className="fixed bottom-6 left-1/2 -translate-x-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white text-[var(--app-color-ink)] shadow-md border border-[var(--app-color-muted)]/20 hover:scale-110 active:scale-95 transition-all cursor-pointer z-50"
						aria-label="Scroll to bottom"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							strokeWidth={2.5}
							stroke="currentColor"
							className="h-5 w-5 animate-bounce"
						>
							<path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
						</svg>
					</button>
				)}
			</main>

			{/* Meal Detail Modal */}
			{selectedMeal && (
				<MealDetailModal
					meal={selectedMeal}
					onClose={() => setSelectedMeal(null)}
					onDelete={handleDeleteMeal}
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
								Do you want to delete this saved meal template? This action cannot be undone.
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
								onClick={confirmDeleteMeal}
								className="flex-1 py-3 px-6 bg-rose-600 hover:bg-rose-700 text-white rounded-full font-bold cursor-pointer transition-all active:scale-98 text-sm border-none outline-none shadow-md"
							>
								Yes, delete
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	)
}
