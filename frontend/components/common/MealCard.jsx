const CATEGORY_ACCENTS = {
  Breakfast: {
    bg: '#fff8e1',
    badgeBg: '#fffbeb',
    badgeText: '#b78103',
    plate: '#f4cf71',
    garnish: '#8fb84e',
    sauce: '#cf8b2a',
  },
  Lunch: {
    bg: '#e0f7fa',
    badgeBg: '#e0f7fa',
    badgeText: '#006064',
    plate: '#7fb34f',
    garnish: '#4d7f31',
    sauce: '#d95f59',
  },
  Dinner: {
    bg: '#f3e8ff',
    badgeBg: '#faf5ff',
    badgeText: '#6b21a8',
    plate: '#6f8f4e',
    garnish: '#aecf72',
    sauce: '#e38a39',
  },
  Snack: {
    bg: '#ffe0b2',
    badgeBg: '#fffbf0',
    badgeText: '#e65100',
    plate: '#f39c4d',
    garnish: '#e24f61',
    sauce: '#7bc043',
  },
  Meal: {
    bg: '#e2efcb',
    badgeBg: '#f4faf0',
    badgeText: '#163f22',
    plate: '#7ba367',
    garnish: '#a4c95e',
    sauce: '#4a7c2f',
  },
}

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

const getMealPalette = (category) => CATEGORY_ACCENTS[category] ?? CATEGORY_ACCENTS.Meal

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
      <!-- Transparent background to let card category color show through -->
      <ellipse cx="160" cy="164" rx="92" ry="64" fill="#d8e7bf" opacity="0.42" />
      <ellipse cx="160" cy="154" rx="86" ry="58" fill="url(#dish-${slugify(category)})" stroke="rgba(0,0,0,0.05)" stroke-width="4" />
      <ellipse cx="160" cy="148" rx="64" ry="36" fill="#ffffff" opacity="0.8" />
      <path d="M88 151c20-24 124-24 144 0" fill="none" stroke="${palette.plate}" stroke-width="9" stroke-linecap="round" />
      <circle cx="132" cy="120" r="16" fill="${palette.garnish}" />
      <circle cx="162" cy="108" r="13" fill="${palette.sauce}" />
      <circle cx="192" cy="123" r="18" fill="${palette.garnish}" />
      <circle cx="153" cy="133" r="8" fill="#fef3c7" />
      <circle cx="179" cy="140" r="7" fill="#f9fafb" />
      <path d="M115 101c0-15 12-27 27-27h36c15 0 27 12 27 27" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="7" stroke-linecap="round" />
      <text x="24" y="52" fill="var(--app-color-ink)" font-size="24" font-weight="700" font-family="Poppins, sans-serif">${initials}</text>
    </svg>
  `

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

export default function MealCard({ meal, onDelete, onClick }) {
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
    <article
      onClick={onClick}
      className="group overflow-hidden rounded-[1.25rem] border border-[var(--app-color-muted)]/15 bg-white shadow-[0_10px_25px_rgba(59,91,26,0.05)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_16px_34px_rgba(59,91,26,0.08)] relative cursor-pointer">
      <div
        className="relative flex h-36 items-center justify-center overflow-hidden"
        style={{ backgroundColor: palette.bg }}
      >
        {!isAiAnalysis && (
          <span
            className="absolute left-3.5 top-3.5 rounded-full px-3.5 py-1 text-[0.7rem] font-bold uppercase tracking-wider shadow-sm border border-black/5 z-10"
            style={{ backgroundColor: palette.badgeBg, color: palette.badgeText }}
          >
            {displayCategory}
          </span>
        )}

        {onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(meal.id)
            }}
            className="absolute right-3.5 top-3.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 hover:bg-white text-slate-500 hover:text-slate-900 border border-slate-200/50 shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer z-10"
            aria-label="Delete saved meal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-3.5 w-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        <img
          src={imageSrc}
          alt={meal?.name ? `${meal.name} illustration` : 'Meal illustration'}
          className="h-full w-full select-none object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      </div>

      <div style={{ padding: '12px 24px 20px 24px' }}>
        <div>
          <h3 className="text-[1.05rem] font-bold leading-snug text-[var(--app-color-ink)] tracking-tight">{meal?.name || 'Untitled meal'}</h3>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-bold" style={{ marginTop: '10px' }}>
          <span className="flex items-center gap-1 text-[0.88rem] font-semibold text-[var(--app-color-muted)] mr-1">
            <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 stroke-[2.2]" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M13 2s2 2 2 5-2 4-2 7 2 5 2 5a5 5 0 1 1-6 0s2-2 2-5-2-4-2-7 2-5 2-5" />
            </svg>
            {Number.isFinite(calories) ? `${Math.round(calories)} kcal` : '0 kcal'}
          </span>
          <span className="rounded-full px-2.5 py-1 text-[0.7rem] bg-[#fef3c7]/70 text-[#b78103]">
            C: {Math.round(meal?.carbs || 0)}g
          </span>
          <span className="rounded-full px-2.5 py-1 text-[0.7rem] bg-[#e2efcb]/60 text-[var(--app-color-primary-dark)]">
            P: {Math.round(meal?.protein || 0)}g
          </span>
          <span className="rounded-full px-2.5 py-1 text-[0.7rem] bg-[#ffe0b2]/60 text-[#e65100]">
            F: {Math.round(meal?.fat || 0)}g
          </span>
        </div>

        {/* Calories Progress Bar */}
        <div className="w-full bg-[var(--app-color-surface)] h-1.5 rounded-full overflow-hidden select-none" style={{ marginTop: '16px' }}>
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              calories >= 500 ? 'bg-[var(--app-color-primary-dark)]' : 'bg-[var(--app-color-primary)]'
            }`}
            style={{ width: `${Math.min((calories / 800) * 100, 100)}%` }}
          />
        </div>

        <p className="text-[0.8rem] font-semibold text-[var(--app-color-muted)]/80" style={{ marginTop: '12px' }}>Saved {savedLabel}</p>
      </div>
    </article>
  )
}