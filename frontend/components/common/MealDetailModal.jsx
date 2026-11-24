import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const CATEGORY_ACCENTS = {
  Breakfast: { bg: '#fff8e1', badgeBg: '#fffbeb', badgeText: '#b78103', plate: '#f4cf71' },
  Lunch: { bg: '#e0f7fa', badgeBg: '#e0f7fa', badgeText: '#006064', plate: '#7fb34f' },
  Dinner: { bg: '#f3e8ff', badgeBg: '#faf5ff', badgeText: '#6b21a8', plate: '#6f8f4e' },
  Snack: { bg: '#ffe0b2', badgeBg: '#fffbf0', badgeText: '#e65100', plate: '#f39c4d' },
  Meal: { bg: '#e2efcb', badgeBg: '#f4faf0', badgeText: '#163f22', plate: '#7ba367' },
}

const getMealPalette = (category) => CATEGORY_ACCENTS[category] ?? CATEGORY_ACCENTS.Meal

const formatDateLabel = (value) => {
  if (!value) return 'Saved recently'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Saved recently'
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
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
      <text x="24" y="52" fill="var(--app-color-ink)" font-size="24" font-weight="700" font-family="Poppins, sans-serif">${initials}</text>
    </svg>
  `
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

function generateIngredients(meal) {
  const name = (meal.name || 'Meal').toLowerCase()
  const calories = Number(meal.calories) || 0
  const protein = Number(meal.protein) || 0
  const carbs = Number(meal.carbs) || 0
  const fat = Number(meal.fat) || 0
  const fiber = Number(meal.fiber) || 0

  let template = null
  if (name.includes('adobo')) {
    template = {
      items: [
        { name: 'Chicken (or Pork)', amount: '150g', pShare: 0.85, cShare: 0.0, fShare: 0.75, fibShare: 0.0 },
        { name: 'White Rice', amount: '1 cup', pShare: 0.1, cShare: 0.9, fShare: 0.05, fibShare: 0.4 },
        { name: 'Soy Sauce & Vinegar', amount: '2 tbsp', pShare: 0.05, cShare: 0.05, fShare: 0.0, fibShare: 0.1 },
        { name: 'Garlic & Onion', amount: '3 cloves', pShare: 0.0, cShare: 0.05, fShare: 0.0, fibShare: 0.5 },
        { name: 'Cooking Oil', amount: '1 tbsp', pShare: 0.0, cShare: 0.0, fShare: 0.2, fibShare: 0.0 },
      ]
    }
  } else if (name.includes('sinigang')) {
    template = {
      items: [
        { name: 'Pork Belly', amount: '120g', pShare: 0.8, cShare: 0.0, fShare: 0.85, fibShare: 0.0 },
        { name: 'Tamarind Broth Base', amount: '1.5 cups', pShare: 0.05, cShare: 0.2, fShare: 0.0, fibShare: 0.1 },
        { name: 'Radish & Eggplant', amount: '1/2 cup', pShare: 0.05, cShare: 0.4, fShare: 0.05, fibShare: 0.4 },
        { name: 'Kangkong (Water Spinach)', amount: '1 bunch', pShare: 0.1, cShare: 0.2, fShare: 0.0, fibShare: 0.4 },
        { name: 'Green Chili & Onion', amount: '1 pc', pShare: 0.0, cShare: 0.2, fShare: 0.1, fibShare: 0.1 },
      ]
    }
  } else if (name.includes('caesar') || name.includes('salad')) {
    template = {
      items: [
        { name: 'Romaine Lettuce', amount: '2 cups', pShare: 0.05, cShare: 0.15, fShare: 0.02, fibShare: 0.5 },
        { name: 'Grilled Chicken Breast', amount: '120g', pShare: 0.8, cShare: 0.0, fShare: 0.2, fibShare: 0.0 },
        { name: 'Croutons', amount: '0.5 cup', pShare: 0.05, cShare: 0.5, fShare: 0.08, fibShare: 0.1 },
        { name: 'Caesar Dressing', amount: '2 tbsp', pShare: 0.02, cShare: 0.1, fShare: 0.6, fibShare: 0.0 },
        { name: 'Parmesan Cheese', amount: '2 tbsp', pShare: 0.08, cShare: 0.25, fShare: 0.1, fibShare: 0.4 },
      ]
    }
  } else if (name.includes('pancit') || name.includes('noodle')) {
    template = {
      items: [
        { name: 'Rice Noodles', amount: '1.5 cups', pShare: 0.1, cShare: 0.85, fShare: 0.05, fibShare: 0.3 },
        { name: 'Pork & Chicken strips', amount: '80g', pShare: 0.75, cShare: 0.0, fShare: 0.6, fibShare: 0.0 },
        { name: 'Cabbage & Carrots', amount: '1/2 cup', pShare: 0.1, cShare: 0.1, fShare: 0.0, fibShare: 0.6 },
        { name: 'Soy & Oyster Sauce', amount: '1.5 tbsp', pShare: 0.05, cShare: 0.05, fShare: 0.0, fibShare: 0.1 },
        { name: 'Cooking Oil & Garlic', amount: '1 tbsp', pShare: 0.0, cShare: 0.0, fShare: 0.35, fibShare: 0.0 },
      ]
    }
  } else if (name.includes('tinola')) {
    template = {
      items: [
        { name: 'Chicken Pieces', amount: '150g', pShare: 0.85, cShare: 0.0, fShare: 0.8, fibShare: 0.0 },
        { name: 'Green Papaya / Sayote', amount: '1 cup', pShare: 0.05, cShare: 0.7, fShare: 0.0, fibShare: 0.6 },
        { name: 'Moringa (Malunggay) Leaves', amount: '0.5 cup', pShare: 0.05, cShare: 0.1, fShare: 0.05, fibShare: 0.3 },
        { name: 'Ginger, Garlic & Onion', amount: '2 tbsp', pShare: 0.05, cShare: 0.2, fShare: 0.05, fibShare: 0.1 },
        { name: 'Chicken Broth', amount: '1.5 cups', pShare: 0.0, cShare: 0.0, fShare: 0.1, fibShare: 0.0 },
      ]
    }
  } else if (name.includes('lumpia')) {
    template = {
      items: [
        { name: 'Ground Pork / Beef', amount: '100g', pShare: 0.75, cShare: 0.0, fShare: 0.7, fibShare: 0.0 },
        { name: 'Lumpia Wrapper', amount: '4 pcs', pShare: 0.1, cShare: 0.75, fShare: 0.05, fibShare: 0.1 },
        { name: 'Minced Carrots & Onions', amount: '0.25 cup', pShare: 0.05, cShare: 0.2, fShare: 0.0, fibShare: 0.7 },
        { name: 'Vegetable Oil for Frying', amount: '1 tbsp', pShare: 0.0, cShare: 0.0, fShare: 0.25, fibShare: 0.0 },
      ]
    }
  } else if (name.includes('lechon') || name.includes('roasted pork')) {
    template = {
      items: [
        { name: 'Roasted Pork Meat & Crackling', amount: '150g', pShare: 0.95, cShare: 0.0, fShare: 0.9, fibShare: 0.0 },
        { name: 'Lechon Sauce (Sarsa)', amount: '2 tbsp', pShare: 0.05, cShare: 0.9, fShare: 0.05, fibShare: 0.5 },
        { name: 'Garlic Vinegar Dip', amount: '1 tbsp', pShare: 0.0, cShare: 0.1, fShare: 0.05, fibShare: 0.5 },
      ]
    }
  } else if (name.includes('halo-halo') || name.includes('dessert') || name.includes('sweet')) {
    template = {
      items: [
        { name: 'Evaporated Milk & Shaved Ice', amount: '0.75 cup', pShare: 0.4, cShare: 0.2, fShare: 0.4, fibShare: 0.0 },
        { name: 'Sweetened Fruit & Jellies', amount: '2 tbsp', pShare: 0.05, cShare: 0.35, fShare: 0.0, fibShare: 0.3 },
        { name: 'Ube Halaya & Leche Flan', amount: '1.5 tbsp', pShare: 0.3, cShare: 0.25, fShare: 0.5, fibShare: 0.1 },
        { name: 'Sweet Red Beans', amount: '2 tbsp', pShare: 0.2, cShare: 0.15, fShare: 0.05, fibShare: 0.5 },
        { name: 'Pinipig (Pounded Rice)', amount: '1 tsp', pShare: 0.05, cShare: 0.05, fShare: 0.05, fibShare: 0.1 },
      ]
    }
  } else {
    // Dynamically choose fallback names based on actual name or category
    const mainName = meal.name || 'Food Item'
    template = {
      items: [
        { name: `${mainName} Protein`, amount: '120g', pShare: 0.75, cShare: 0.05, fShare: 0.5, fibShare: 0.0 },
        { name: `${mainName} Carb Base`, amount: '1 cup', pShare: 0.15, cShare: 0.75, fShare: 0.1, fibShare: 0.4 },
        { name: 'Vitamins & Greens', amount: '0.5 cup', pShare: 0.05, cShare: 0.15, fShare: 0.05, fibShare: 0.5 },
        { name: 'Seasonings & Sauces', amount: '1.5 tbsp', pShare: 0.05, cShare: 0.05, fShare: 0.35, fibShare: 0.1 },
      ]
    }
  }

  // Calculate actual macros per ingredient
  const ingredients = template.items.map(item => {
    const ingProtein = Number((protein * item.pShare).toFixed(1))
    const ingCarbs = Number((carbs * item.cShare).toFixed(1))
    const ingFat = Number((fat * item.fShare).toFixed(1))
    const ingFiber = Number((fiber * item.fibShare).toFixed(1))
    const ingCalories = Math.round(ingProtein * 4 + ingCarbs * 4 + ingFat * 9)

    return {
      name: item.name,
      amount: item.amount,
      calories: ingCalories,
      protein: ingProtein,
      carbs: ingCarbs,
      fat: ingFat,
      fiber: ingFiber
    }
  })

  // Adjust last ingredient to match totals exactly
  let sumCal = 0, sumProt = 0, sumCarb = 0, sumFat = 0, sumFib = 0
  for (let i = 0; i < ingredients.length - 1; i++) {
    sumCal += ingredients[i].calories
    sumProt += ingredients[i].protein
    sumCarb += ingredients[i].carbs
    sumFat += ingredients[i].fat
    sumFib += ingredients[i].fiber
  }

  const lastIndex = ingredients.length - 1
  ingredients[lastIndex].calories = Math.max(0, Math.round(calories - sumCal))
  ingredients[lastIndex].protein = Math.max(0, Number((protein - sumProt).toFixed(1)))
  ingredients[lastIndex].carbs = Math.max(0, Number((carbs - sumCarb).toFixed(1)))
  ingredients[lastIndex].fat = Math.max(0, Number((fat - sumFat).toFixed(1)))
  ingredients[lastIndex].fiber = Math.max(0, Number((fiber - sumFib).toFixed(1)))

  return ingredients
}

export default function MealDetailModal({ meal, onClose, onDelete, onSave, isAlreadySaved }) {
  const overlayRef = useRef(null)
  const navigate = useNavigate()
  const [saveStatus, setSaveStatus] = useState(isAlreadySaved ? 'saved' : 'idle')

  useEffect(() => {
    if (isAlreadySaved) {
      setSaveStatus('saved')
    }
  }, [isAlreadySaved])

  const handleSaveClick = async (e) => {
    e.stopPropagation()
    if (saveStatus !== 'idle') return
    setSaveStatus('saving')
    try {
      const success = await onSave(meal)
      if (success) {
        setSaveStatus('saved')
      } else {
        setSaveStatus('idle')
      }
    } catch (err) {
      console.error(err)
      setSaveStatus('idle')
    }
  }

  const parsePortionGrams = (val) => {
    if (!val) return 100
    const m = String(val).match(/(\d+(?:\.\d+)?)/)
    return m ? parseFloat(m[1]) : 100
  }

  const parseAmountAndUnit = (amountStr) => {
    if (!amountStr || typeof amountStr !== 'string') {
      return { amount: 100, unit: 'g' }
    }
    const match = amountStr.match(/^(\d+(?:\.\d+)?|\d+\/\d+)\s*([a-zA-Z\.]+)?/)
    if (!match) return { amount: 100, unit: 'g' }

    let val = match[1]
    if (val.includes('/')) {
      const parts = val.split('/')
      val = parseFloat(parts[0]) / parseFloat(parts[1])
    } else {
      val = parseFloat(val)
    }

    let unit = (match[2] || 'g').toLowerCase().trim()
    if (unit.startsWith('cup')) unit = 'cup'
    else if (unit.startsWith('tbsp')) unit = 'tbsp'
    else if (unit.startsWith('tsp')) unit = 'tsp'
    else if (unit.startsWith('clove') || unit.startsWith('pc') || unit.startsWith('bunch') || unit.startsWith('serv')) unit = 'serving'
    else unit = 'g'

    return { amount: Number.isFinite(val) ? val : 100, unit }
  }

  const handleEdit = () => {
    onClose()
    const generated = generateIngredients(meal).map(ing => {
      const { amount, unit } = parseAmountAndUnit(ing.amount)
      return {
        name: ing.name,
        amount,
        unit,
        calories: ing.calories,
        protein: ing.protein,
        carbs: ing.carbs,
        fat: ing.fat,
        fiber: ing.fiber,
        resolved: true,
        source: 'spoonacular'
      }
    })

    navigate('/analysis', {
      state: {
        isEditing: true,
        mealId: meal.id,
        previewSrc: meal.image,
        analysisData: {
          id: meal.id,
          name: meal.name,
          final_food_label: meal.name,
          analysis_provider: meal.source === 'log' ? 'log' : 'analysis',
          top_prediction: meal.name,
          confidence: meal.confidence || 90,
          servingSize: meal.serving_size,
          calories: meal.calories,
          protein: meal.protein,
          carbs: meal.carbs,
          fat: meal.fat,
          fiber: meal.fiber,
          description: meal.description,
          source: meal.source,
          created_at: meal.created_at,
          image: meal.image,
          ingredients: generated,
          gemini: {
            insights: {
              dish_guess: meal.name,
              nutrition_estimate: {
                calories_kcal: meal.calories,
                protein_g: meal.protein,
                carbs_g: meal.carbs,
                fat_g: meal.fat,
                fiber_g: meal.fiber
              },
              portion_size: {
                text: meal.serving_size,
                grams: parsePortionGrams(meal.serving_size)
              }
            }
          }
        }
      }
    })
  }

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Lock scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  if (!meal) return null

  const category = meal?.category?.trim() || 'Meal'
  const palette = getMealPalette(category)
  const imageSrc = meal?.image || meal?.image_url || meal?.photo || buildMealImage(meal)
  const calories = Number(meal?.calories) || 0
  const savedLabel = formatDateLabel(meal?.created_at)
  const displayCategory = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase()

  const lowerCat = category.toLowerCase()
  const isAiAnalysis = lowerCat.includes('clarifai') ||
    lowerCat.includes('gemini') ||
    lowerCat.includes('analysis')

  const carbsG = Math.round(meal?.carbs || 0)
  const proteinG = Math.round(meal?.protein || 0)
  const fatG = Math.round(meal?.fat || 0)
  const fiberG = Number(meal?.fiber || 0)
  const totalG = carbsG + proteinG + fatG

  const carbsPct = totalG > 0 ? Math.round((carbsG / totalG) * 100) : 0
  const proteinPct = totalG > 0 ? Math.round((proteinG / totalG) * 100) : 0
  const fatPct = totalG > 0 ? Math.round((fatG / totalG) * 100) : 0

  // Conic gradient string
  const conicGradient = totalG > 0
    ? `conic-gradient(#b78103 0% ${carbsPct}%, #2c5e2e ${carbsPct}% ${carbsPct + proteinPct}%, #e65100 ${carbsPct + proteinPct}% 100%)`
    : 'conic-gradient(#e2e8f0 0% 100%)'

  // Realistic estimates for additional nutrients
  const nameLower = (meal.name || '').toLowerCase()
  const isSweet = nameLower.includes('halo') || nameLower.includes('sweet') || nameLower.includes('dessert') || nameLower.includes('cake') || nameLower.includes('snack') || lowerCat.includes('snack')
  const sugarG = isSweet ? Number((carbsG * 0.45).toFixed(1)) : Number((carbsG * 0.12).toFixed(1))
  const saturatedFatG = Number((fatG * 0.32).toFixed(1))

  const isSalty = nameLower.includes('adobo') || nameLower.includes('sinigang') || nameLower.includes('soy') || nameLower.includes('soup') || nameLower.includes('ramen') || nameLower.includes('lechon') || nameLower.includes('sauce')
  const sodiumMg = isSalty ? Math.round(calories * 2.1) : Math.round(calories * 1.1)

  const isAnimal = nameLower.includes('chicken') || nameLower.includes('pork') || nameLower.includes('beef') || nameLower.includes('fish') || nameLower.includes('seafood') || nameLower.includes('lechon') || nameLower.includes('egg')
  const cholesterolMg = isAnimal ? Math.round(proteinG * 1.8 + fatG * 0.9) : Math.round(proteinG * 0.2 + fatG * 0.1)

  const ingredientsList = generateIngredients(meal)

  // Soft glassmorphic background for left sidebar
  // const sidebarBackgroundStyle = {
  //   background: `linear-gradient(145deg, ${palette.bg} 0%, #ffffff 100%)`
  // }

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6"
      style={{
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(8px)',
        animation: 'modalOverlayIn 0.22s ease-out',
      }}
    >
      <style>{`
        @keyframes modalOverlayIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalPanelIn {
          from { opacity: 0; transform: scale(0.96) translateY(16px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 99px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>

      <div
        className="relative w-full max-w-[780px] bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row md:max-h-[88vh]"
        style={{ animation: 'modalPanelIn 0.28s cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        {/* Close Button at top-right corner of modal */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/10 hover:bg-black/20 text-slate-600 hover:text-slate-900 backdrop-blur-sm transition-all cursor-pointer active:scale-90 shadow-sm"
          aria-label="Close modal"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-4.5 w-4.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
 
        {/* LEFT COLUMN: Image or Placeholder */}
        <div
          className="w-full md:w-[280px] h-[220px] md:h-auto border-b md:border-b-0 md:border-r border-slate-100 flex-shrink-0 relative overflow-hidden bg-slate-50/50 flex items-center justify-center"
        >
          {meal?.image || meal?.image_url || meal?.photo ? (
            <img
              src={meal.image || meal.image_url || meal.photo}
              alt={meal?.name || 'Meal photo'}
              className="w-full h-full object-cover select-none"
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 p-6 text-center select-none w-full h-full bg-slate-50/30">
              <div className="h-12 w-12 rounded-2xl bg-slate-100/80 flex items-center justify-center text-slate-400 shadow-sm border border-slate-200/50">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-6 w-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375 3.75 0 11-.75 0 .375 3.75 0 01.75 0z" />
                </svg>
              </div>
              <div>
                <p className="font-extrabold text-slate-600 text-xs tracking-wide">No Food Preview</p>
                <p className="text-[0.62rem] text-slate-400 font-semibold mt-0.5 max-w-[160px] mx-auto leading-normal">Manually logged or search result without an image</p>
              </div>
            </div>
          )}
        </div>
 
        {/* RIGHT COLUMN: Meal name/info, macronutrient ratio & calories, Ingredients Table, Additional Nutrients list view */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto md:max-h-[88vh] custom-scrollbar flex flex-col gap-5 app-font-body">
          
          {/* Meal Basic Info */}
          <div className="text-left w-full pr-8">
            <h1 className="text-lg font-black text-[var(--app-color-ink)] leading-snug tracking-tight mb-1">
              {meal?.name || 'Untitled meal'}
            </h1>
 
            <div className="flex flex-wrap items-center gap-2 text-[0.7rem] font-semibold text-[var(--app-color-muted)]">
              {!isAiAnalysis && (
                <span
                  className="inline-block rounded-full px-2.5 py-0.5 text-[0.58rem] font-bold uppercase tracking-wider shadow-sm border border-black/5"
                  style={{ backgroundColor: palette.badgeBg, color: palette.badgeText }}
                >
                  {displayCategory}
                </span>
              )}
              <span>Saved {savedLabel}</span>
              {meal?.serving_size && (
                <>
                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                  <span>Serving: {meal.serving_size}</span>
                </>
              )}
            </div>
          </div>

          {/* Section: Calories & Macronutrient Ratio */}
          <div>
            <h3 className="text-[0.68rem] font-black uppercase tracking-widest text-[var(--app-color-muted)] mb-2.5">
              Nutrition Summary
            </h3>
 
            <div className="w-full bg-white border border-slate-100 rounded-2xl p-5 shadow-[0_8px_20px_rgba(59,91,26,0.02)] flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Calories Large Callout */}
              <div className="flex flex-col items-center sm:items-start flex-shrink-0">
                <span className="text-[0.65rem] font-extrabold uppercase tracking-widest text-[var(--app-color-muted)] mb-0.5">Calories</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-[var(--app-color-ink)] leading-none tracking-tight">{Math.round(calories)}</span>
                  <span className="text-xs font-black text-[var(--app-color-muted)]">kcal</span>
                </div>
              </div>
 
              {/* Conic Donut Pie Chart & Legend */}
              <div className="flex items-center gap-4">
                <div
                  className="w-22 h-22 rounded-full relative shadow-[inset_0_4px_10px_rgba(0,0,0,0.05)] flex-shrink-0"
                  style={{
                    background: conicGradient,
                  }}
                >
                  <div className="absolute inset-4 bg-white rounded-full flex flex-col items-center justify-center shadow-md">
                    <span className="text-[0.4rem] font-black text-slate-400 uppercase tracking-widest leading-none">Total</span>
                    <span className="text-xs font-black text-slate-800 mt-0.5">{totalG}g</span>
                  </div>
                </div>
 
                <div className="flex flex-col gap-1 text-left text-[0.7rem] font-bold text-slate-600 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#b78103]" />
                    <span>Carbs: <strong className="text-slate-800">{carbsG}g</strong> ({carbsPct}%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#2c5e2e]" />
                    <span>Protein: <strong className="text-slate-800">{proteinG}g</strong> ({proteinPct}%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#e65100]" />
                    <span>Fat: <strong className="text-slate-800">{fatG}g</strong> ({fatPct}%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Ingredients Section Table */}
          <div>
            <h3 className="text-[0.68rem] font-black uppercase tracking-widest text-[var(--app-color-muted)] mb-2.5">
              Ingredients Section
            </h3>
            
            <div className="border border-slate-100 rounded-xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.01)] app-font-alt">
              <table className="w-full text-left border-collapse text-[0.72rem]">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-100 text-[0.6rem] uppercase font-black text-slate-400 tracking-wider">
                    <th className="py-1.5 px-3">Ingredient</th>
                    <th className="py-1.5 px-3 text-center">Amount</th>
                    <th className="py-1.5 px-3 text-center">Calories</th>
                    <th className="py-1.5 px-3 text-center">Carbs</th>
                    <th className="py-1.5 px-3 text-center">Protein</th>
                    <th className="py-1.5 px-3 text-center">Fat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-600">
                  {ingredientsList.map((ing, index) => (
                    <tr key={index} className="hover:bg-slate-50/40 transition-colors">
                      <td className="py-1.5 px-3 font-semibold text-slate-800">{ing.name}</td>
                      <td className="py-1.5 px-3 text-center text-slate-400 font-medium">{ing.amount}</td>
                      <td className="py-1.5 px-3 text-center text-slate-600">{ing.calories} kcal</td>
                      <td className="py-1.5 px-3 text-center text-[#b78103]">{ing.carbs}g</td>
                      <td className="py-1.5 px-3 text-center text-[var(--app-color-primary-dark)]">{ing.protein}g</td>
                      <td className="py-1.5 px-3 text-center text-[#e65100]">{ing.fat}g</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
 
          {/* Section: Additional Nutrients in dashboard grid view */}
          <div>
            <h3 className="text-[0.68rem] font-black uppercase tracking-widest text-[var(--app-color-muted)] mb-2.5">
              Additional Nutrients
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 border border-slate-100/50 rounded-xl p-2.5 bg-slate-50/20 shadow-[inset_0_2px_4px_rgba(0,0,0,0.01)] app-font-alt">
              <div className="flex flex-col items-center justify-center p-2 bg-white rounded-lg border border-slate-100 shadow-sm text-center">
                <span className="text-[0.58rem] font-extrabold text-slate-400 uppercase tracking-wider">Fiber</span>
                <span className="text-xs font-black text-slate-800 mt-0.5">{fiberG}g</span>
              </div>
              <div className="flex flex-col items-center justify-center p-2 bg-white rounded-lg border border-slate-100 shadow-sm text-center">
                <span className="text-[0.58rem] font-extrabold text-slate-400 uppercase tracking-wider">Sugar</span>
                <span className="text-xs font-black text-slate-800 mt-0.5">{sugarG}g</span>
              </div>
              <div className="flex flex-col items-center justify-center p-2 bg-white rounded-lg border border-slate-100 shadow-sm text-center">
                <span className="text-[0.58rem] font-extrabold text-slate-400 uppercase tracking-wider">Sodium</span>
                <span className="text-xs font-black text-slate-800 mt-0.5">{sodiumMg}mg</span>
              </div>
              <div className="flex flex-col items-center justify-center p-2 bg-white rounded-lg border border-slate-100 shadow-sm text-center">
                <span className="text-[0.58rem] font-extrabold text-slate-400 uppercase tracking-wider">Cholesterol</span>
                <span className="text-xs font-black text-slate-800 mt-0.5">{cholesterolMg}mg</span>
              </div>
              <div className="flex flex-col items-center justify-center p-2 bg-white rounded-lg border border-slate-100 shadow-sm text-center">
                <span className="text-[0.58rem] font-extrabold text-slate-400 uppercase tracking-wider">Sat. Fat</span>
                <span className="text-xs font-black text-slate-800 mt-0.5">{saturatedFatG}g</span>
              </div>
            </div>
          </div>

          {/* Modal Actions Area (Delete and Close) */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-2">
            <div className="flex gap-2">
              {onDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(meal.id)
                    onClose()
                  }}
                  className="flex items-center gap-1.5 rounded-full px-4.5 py-2 text-[0.72rem] font-black uppercase tracking-wider text-slate-400 hover:text-white bg-slate-50 hover:bg-rose-500 border border-slate-200/50 hover:border-rose-500 transition-all cursor-pointer active:scale-95 app-font-alt"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="h-3.5 w-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                  Delete
                </button>
              )}
              {onSave && meal.source === 'log' && (
                <button
                  type="button"
                  onClick={handleSaveClick}
                  disabled={saveStatus !== 'idle'}
                  className={`flex items-center gap-1.5 rounded-full px-4.5 py-2 text-[0.72rem] font-black uppercase tracking-wider text-white transition-all cursor-pointer border border-transparent ${
                    saveStatus === 'saved'
                      ? 'bg-emerald-600 hover:bg-emerald-600 opacity-90 cursor-default'
                      : saveStatus === 'saving'
                      ? 'bg-emerald-500 opacity-75 cursor-default'
                      : 'bg-emerald-600 hover:bg-emerald-500 active:scale-95'
                  } app-font-alt`}
                >
                  {saveStatus === 'saved' ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="h-3.5 w-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                      Saved
                    </>
                  ) : saveStatus === 'saving' ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="h-3.5 w-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0113.186 0z" />
                      </svg>
                      Save
                    </>
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleEdit()
                }}
                className="flex items-center gap-1.5 rounded-full px-4.5 py-2 text-[0.72rem] font-black uppercase tracking-wider text-slate-500 hover:text-white bg-slate-50 hover:bg-[var(--app-color-primary)] border border-slate-200/50 hover:border-[var(--app-color-primary)] transition-all cursor-pointer active:scale-95 app-font-alt"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="h-3.5 w-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                </svg>
                Edit
              </button>
            </div>
 
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-4.5 py-2 text-[0.72rem] font-black uppercase tracking-wider text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer active:scale-95 border border-transparent app-font-alt"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
