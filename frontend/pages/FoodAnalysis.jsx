import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getIngredientNutritionWithSpoonacular, saveMeal, verifyIngredientsBatch, analyzeImage, updateMeal } from '../services/api'
import AnalyzingScreen from '../components/camera/AnalyzingScreen'

const DEFAULT_DATA = {
  name: "Chicken Caesar Salad",
  category: "Salad / Main Course",
  confidence: 96,
  description: "A classic Caesar salad with grilled chicken breast, romaine lettuce, parmesan shavings, croutons, and Caesar dressing.",
  servingSize: "350g (1 bowl)",
  calories: 420,
  macros: [
    { label: "Protein", value: 38, max: 60, unit: "g", color: "#4a7c2f" },
    { label: "Carbs", value: 22, max: 60, unit: "g", color: "#c9d84a" },
    { label: "Fat", value: 18, max: 60, unit: "g", color: "#f97316" },
    { label: "Fiber", value: 5, max: 30, unit: "g", color: "#06b6d4" },
  ],
  micros: [
    { label: "Sodium", value: "620mg", dv: "27%" },
    { label: "Calcium", value: "180mg", dv: "14%" },
    { label: "Iron", value: "2.4mg", dv: "13%" },
    { label: "Vitamin A", value: "450mcg", dv: "50%" },
    { label: "Vitamin C", value: "18mg", dv: "20%" },
    { label: "Potassium", value: "540mg", dv: "12%" },
  ],
  ingredients: [
    "Grilled Chicken Breast", "Romaine Lettuce", "Parmesan Cheese",
    "Caesar Dressing", "Croutons", "Lemon Juice", "Black Pepper",
    "Garlic", "Olive Oil", "Worcestershire Sauce",
  ],
};

const CONFIDENCE_SCORE = {
  high: 96,
  medium: 84,
  low: 72,
}

const PORTION_UNITS = [
  { value: 'g', label: 'g' },
  { value: 'kg', label: 'kg' },
  { value: 'oz', label: 'oz' },
  { value: 'lb', label: 'lb' },
  { value: 'cup', label: 'cup' },
  { value: 'tbsp', label: 'tbsp' },
  { value: 'tsp', label: 'tsp' },
]

const PORTION_UNIT_TO_GRAMS = {
  g: 1,
  kg: 1000,
  oz: 28.3495,
  lb: 453.592,
  cup: 240,
  tbsp: 15,
  tsp: 5,
}

const numberOrFallback = (value, fallback) => {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : fallback
}

const parsePortionGrams = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value !== 'string') {
    return null
  }

  const match = value.replace(/,/g, '').match(/(\d+(?:\.\d+)?)/)
  if (!match) {
    return null
  }

  const numericValue = Number(match[1])
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return null
  }

  const normalized = value.toLowerCase()
  if (normalized.includes('kg')) {
    return numericValue * 1000
  }

  return numericValue
}

const parsePortionAmountAndUnit = (value) => {
  if (!value || typeof value !== 'string') {
    return { amount: '', unit: 'g' }
  }

  const match = value.replace(/,/g, '').match(/(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?/)
  if (!match) {
    return { amount: '', unit: 'g' }
  }

  const amount = match[1]
  let unit = (match[2] || 'g').toLowerCase()

  if (unit.startsWith('kg')) unit = 'kg'
  else if (unit.startsWith('cup')) unit = 'cup'
  else if (unit.startsWith('tbsp')) unit = 'tbsp'
  else if (unit.startsWith('tsp')) unit = 'tsp'
  else if (unit.startsWith('oz')) unit = 'oz'
  else if (unit.startsWith('lb')) unit = 'lb'
  else if (unit.startsWith('serv') || unit.startsWith('pc')) unit = 'serving'
  else unit = 'g'

  return { amount, unit }
}

const portionToGrams = (amount, unit) => {
  const numericAmount = Number(amount)
  const gramsPerUnit = PORTION_UNIT_TO_GRAMS[unit] ?? 1

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return null
  }

  return numericAmount * gramsPerUnit
}

const normalizeIngredientName = (name) =>
  String(name || '').trim().toLowerCase().replace(/\s+/g, ' ')

const parseNutritionNumber = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const numericValue = Number.parseFloat(value.replace(/[^0-9.\-]/g, ''))
    return Number.isFinite(numericValue) ? numericValue : 0
  }

  return 0
}

const parseIngredientLine = (line) => {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const numberRegex = /^(\d+(?:\.\d+)?|\d+\s+\d+\/\d+|\d+\/\d+)/;
  const numMatch = trimmed.match(numberRegex);
  
  let amount = 100;
  let unit = 'g';
  let name = trimmed;

  if (numMatch) {
    const rawNum = numMatch[1];
    name = trimmed.slice(rawNum.length).trim();
    
    if (rawNum.includes('/')) {
      const parts = rawNum.split(/\s+/);
      if (parts.length === 2) {
        const whole = parseFloat(parts[0]);
        const fracParts = parts[1].split('/');
        const frac = parseFloat(fracParts[0]) / parseFloat(fracParts[1]);
        amount = whole + frac;
      } else {
        const fracParts = parts[0].split('/');
        amount = parseFloat(fracParts[0]) / parseFloat(fracParts[1]);
      }
    } else {
      amount = parseFloat(rawNum);
    }

    const unitRegex = /^(g|kg|cups?|tbsp|tbsp\.|tbspns?|tsps?|tsp\.|ounces?|oz|lbs?|servings?|pieces?|pcs?)\b/i;
    const unitMatch = name.match(unitRegex);
    if (unitMatch) {
      unit = unitMatch[1].toLowerCase();
      if (unit.startsWith('cup')) unit = 'cup';
      else if (unit.startsWith('tbsp')) unit = 'tbsp';
      else if (unit.startsWith('tsp')) unit = 'tsp';
      else if (unit.startsWith('piece') || unit.startsWith('pc')) unit = 'serving';
      
      name = name.slice(unitMatch[0].length).trim();
    } else {
      if (amount > 10) {
        unit = 'g';
      } else {
        unit = 'serving';
      }
    }
  }

  name = name.replace(/^(of\s+|-\s+|x\s+)/i, '').trim();

  return {
    name,
    amount: Number.isFinite(amount) ? amount : 100,
    unit
  };
};

const extractSpoonacularNutrition = (result) => {
  const nutritionMap = result?.nutrition && typeof result.nutrition === 'object' ? result.nutrition : {}

  const lookup = (...keys) => {
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(nutritionMap, key)) {
        const entry = nutritionMap[key]
        if (entry && typeof entry === 'object' && 'amount' in entry) {
          return parseNutritionNumber(entry.amount)
        }
      }
    }

    return 0
  }

  return {
    calories: parseNutritionNumber(result?.calories),
    protein: parseNutritionNumber(result?.protein) || lookup('protein'),
    carbs: parseNutritionNumber(result?.carbs) || lookup('carbohydrate', 'carbs', 'net carb'),
    fat: parseNutritionNumber(result?.fat) || lookup('fat'),
    fiber: lookup('fiber', 'dietary fiber'),
  }
}

const buildAnalysisData = (analysisData, previewSrc) => {
  const mapDefaultIngredient = (name) => ({
    name,
    amount: 100,
    unit: 'g',
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    resolved: false,
    useEstimate: true,
    source: 'pending',
    customMacros: { calories: '0', protein: '0', carbs: '0', fat: '0', fiber: '0' }
  })

  if (!analysisData || typeof analysisData !== 'object') {
    const fallbackPortionText = DEFAULT_DATA.servingSize
    return {
      ...DEFAULT_DATA,
      imageSrc: previewSrc ?? null,
      basePortionText: fallbackPortionText,
      basePortionGrams: parsePortionGrams(fallbackPortionText),
      portionDescription: 'AI-generated analysis based on the uploaded image.',
      nutritionEstimate: {
        calories: DEFAULT_DATA.calories,
        protein: DEFAULT_DATA.macros[0].value,
        carbs: DEFAULT_DATA.macros[1].value,
        fat: DEFAULT_DATA.macros[2].value,
        fiber: DEFAULT_DATA.macros[3].value,
      },
      ingredients: DEFAULT_DATA.ingredients.map(mapDefaultIngredient),
    }
  }

  const geminiInsights = analysisData.gemini?.insights
  const nutritionEstimate = geminiInsights?.nutrition_estimate
  const portionSizeText =
    (typeof geminiInsights?.portion_size?.text === 'string' && geminiInsights.portion_size.text.trim()) ||
    (typeof geminiInsights?.portion_note === 'string' && geminiInsights.portion_note.trim()) ||
    DEFAULT_DATA.servingSize
  const basePortionGrams =
    parsePortionGrams(geminiInsights?.portion_size?.grams) ??
    parsePortionGrams(portionSizeText) ??
    parsePortionGrams(geminiInsights?.portion_note)
  const detectedFoods = Array.isArray(analysisData.gemini_detected_foods)
    ? analysisData.gemini_detected_foods
    : []

  const firstDetectedFood = detectedFoods.find((food) => food && typeof food.name === 'string' && food.name.trim())
  const primaryName =
    (typeof analysisData.final_food_label === 'string' && analysisData.final_food_label.trim()) ||
    (firstDetectedFood?.name || '').trim() ||
    (typeof analysisData.top_prediction === 'string' && analysisData.top_prediction.trim()) ||
    DEFAULT_DATA.name

  const confidenceValue = firstDetectedFood?.confidence
  const confidenceScore =
    typeof confidenceValue === 'string' && confidenceValue.toLowerCase() in CONFIDENCE_SCORE
      ? CONFIDENCE_SCORE[confidenceValue.toLowerCase()]
      : numberOrFallback(confidenceValue, DEFAULT_DATA.confidence)

  const calories = numberOrFallback(nutritionEstimate?.calories_kcal, DEFAULT_DATA.calories)
  const protein = numberOrFallback(nutritionEstimate?.protein_g, DEFAULT_DATA.macros[0].value)
  const carbs = numberOrFallback(nutritionEstimate?.carbs_g, DEFAULT_DATA.macros[1].value)
  const fat = numberOrFallback(nutritionEstimate?.fat_g, DEFAULT_DATA.macros[2].value)
  const fiber = numberOrFallback(nutritionEstimate?.fiber_g, DEFAULT_DATA.macros[3].value)

  // Map ingredients from backend if present
  let ingredients = []
  if (Array.isArray(analysisData.ingredients) && analysisData.ingredients.length > 0) {
    ingredients = analysisData.ingredients.map((ing) => ({
      name: ing.name || '',
      amount: ing.amount || 100,
      unit: ing.unit || 'g',
      calories: ing.calories ?? 0,
      protein: ing.protein ?? 0,
      carbs: ing.carbs ?? 0,
      fat: ing.fat ?? 0,
      fiber: ing.fiber ?? 0,
      resolved: ing.resolved !== false,
      useEstimate: true,
      source: ing.source || 'spoonacular',
      customMacros: {
        calories: String(ing.calories ?? 0),
        protein: String(ing.protein ?? 0),
        carbs: String(ing.carbs ?? 0),
        fat: String(ing.fat ?? 0),
        fiber: String(ing.fiber ?? 0),
      }
    }))
  } else if (detectedFoods.length > 0) {
    ingredients = detectedFoods.map((food) => mapDefaultIngredient(typeof food.name === 'string' ? food.name.trim() : ''))
  } else {
    ingredients = DEFAULT_DATA.ingredients.map(mapDefaultIngredient)
  }

  return {
    ...DEFAULT_DATA,
    imageSrc: previewSrc ?? null,
    name: primaryName,
    category: analysisData.analysis_provider ? `${analysisData.analysis_provider} / AI Analysis` : DEFAULT_DATA.category,
    confidence: confidenceScore,
    description: geminiInsights?.confidence_note || 'AI-generated analysis based on the uploaded image.',
    aiNutritionNote: 'This is AI generated nutrition value.',
    servingSize: portionSizeText,
    basePortionText: portionSizeText,
    basePortionGrams,
    portionDescription: geminiInsights?.portion_note || portionSizeText,
    nutritionEstimate: {
      calories,
      protein,
      carbs,
      fat,
      fiber,
    },
    macros: [
      { label: 'Protein', value: protein, max: 60, unit: 'g', color: '#4a7c2f' },
      { label: 'Carbs', value: carbs, max: 60, unit: 'g', color: '#c9d84a' },
      { label: 'Fat', value: fat, max: 60, unit: 'g', color: '#f97316' },
      { label: 'Fiber', value: fiber, max: 30, unit: 'g', color: '#06b6d4' },
    ],
    ingredients,
    analysis_provider: analysisData.analysis_provider,
  }
}

export default function FoodAnalysis({ analysisData = null, previewSrc = null, isAnalyzingInit = false, rawFile = null, isEditing = false, mealId = null }) {
  const navigate = useNavigate()
  const initialData = buildAnalysisData(analysisData, previewSrc)
  const [data, setData] = useState(() => initialData)
  const [portionAmount, setPortionAmount] = useState(() => {
    const parsed = parsePortionAmountAndUnit(initialData.basePortionText || initialData.servingSize)
    return parsed.amount || String(initialData.basePortionGrams ?? parsePortionGrams(initialData.basePortionText) ?? '')
  })
  const [portionUnit, setPortionUnit] = useState(() => {
    const parsed = parsePortionAmountAndUnit(initialData.basePortionText || initialData.servingSize)
    return parsed.unit || 'g'
  })
  const [editingName, setEditingName] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [newIngredientName, setNewIngredientName] = useState("");
  const [newIngredientAmount, setNewIngredientAmount] = useState("100");
  const [newIngredientUnit, setNewIngredientUnit] = useState("g");
  const [addingIngredient, setAddingIngredient] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [logStatus, setLogStatus] = useState("idle");
  const [activeTab, setActiveTab] = useState("nutrition");
  const [mealCategory, setMealCategory] = useState(() => {
    const defaultCat = String(initialData?.category || '').toLowerCase();
    if (defaultCat.includes('breakfast')) return 'Breakfast';
    if (defaultCat.includes('lunch')) return 'Lunch';
    if (defaultCat.includes('dinner')) return 'Dinner';
    if (defaultCat.includes('snack')) return 'Snack';
    
    // Auto-detect based on current local hour
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return 'Breakfast';
    if (hour >= 11 && hour < 15) return 'Lunch';
    if (hour >= 15 && hour < 22) return 'Dinner';
    return 'Snack';
  });
  const nameRef = useRef(null);
  const descRef = useRef(null);
  const ingInputRef = useRef(null);


  const [verifying, setVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState(null);

  const [loadingAnalysis, setLoadingAnalysis] = useState(isAnalyzingInit);
  const [analysisError, setAnalysisError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalRows, setAddModalRows] = useState([{ name: "", amount: "100", unit: "g" }]);
  const [addModalStep, setAddModalStep] = useState('input'); // 'input' | 'calculated'
  const [addModalVerifying, setAddModalVerifying] = useState(false);
  const [addModalError, setAddModalError] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const [showIconLoading, setShowIconLoading] = useState(isAnalyzingInit);

  useEffect(() => {
    if (isAnalyzingInit) {
      setShowIconLoading(true);
      const timer = setTimeout(() => {
        setShowIconLoading(false);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [isAnalyzingInit]);

  useEffect(() => {
    if (!loadingAnalysis) {
      setShowIconLoading(false);
    }
  }, [loadingAnalysis]);

  const runAnalysis = async () => {
    if (!rawFile) return;
    setLoadingAnalysis(true);
    setAnalysisError(null);
    try {
      const res = await analyzeImage(rawFile);
      if (!res.ok) {
        throw new Error(res.error || "Failed to analyze image");
      }
      if (res.data && res.data.is_food === false) {
        throw new Error(res.data.error_message || "This image does not appear to contain food. Please try uploading a food photo.");
      }
      const nextData = buildAnalysisData(res.data, previewSrc);
      setData(nextData);
      setPortionAmount(String(nextData.basePortionGrams ?? parsePortionGrams(nextData.basePortionText) ?? ''));
      setPortionUnit('g');
      setLoadingAnalysis(false);
    } catch (err) {
      console.error(err);
      setAnalysisError(err instanceof Error ? err.message : "Error analyzing image");
      setLoadingAnalysis(false);
    }
  };

  useEffect(() => {
    if (isAnalyzingInit && rawFile) {
      runAnalysis();
    }
  }, [isAnalyzingInit, rawFile]);

  const basePortionGrams = data.basePortionGrams ?? parsePortionGrams(data.basePortionText) ?? 1
  const currentPortionGrams = portionToGrams(portionAmount, portionUnit) ?? basePortionGrams
  const portionDisplay = portionAmount ? `${portionAmount} ${portionUnit}` : `${Math.round(basePortionGrams)} g`

  useEffect(() => {
    if (!analysisData) return;
    const nextData = buildAnalysisData(analysisData, previewSrc)
    setData(nextData)
    const parsed = parsePortionAmountAndUnit(nextData.basePortionText || nextData.servingSize)
    setPortionAmount(parsed.amount || String(nextData.basePortionGrams ?? parsePortionGrams(nextData.basePortionText) ?? ''))
    setPortionUnit(parsed.unit || 'g')
    const defaultCat = String(nextData?.category || '').toLowerCase();
    if (defaultCat.includes('breakfast')) setMealCategory('Breakfast');
    else if (defaultCat.includes('lunch')) setMealCategory('Lunch');
    else if (defaultCat.includes('dinner')) setMealCategory('Dinner');
    else if (defaultCat.includes('snack')) setMealCategory('Snack');
  }, [analysisData, previewSrc])


  const verifyIngredients = async () => {
    if (data.ingredients.length === 0) return
    setVerifying(true)
    setVerificationError(null)
    try {
      const response = await verifyIngredientsBatch(
        data.ingredients.map((ing) => ({
          name: ing.name,
          amount: ing.amount,
          unit: ing.unit,
        }))
      )
      if (!response.ok) {
        throw new Error(response.error || "Failed to verify ingredients")
      }

      const verifiedResults = response.data.results
      setData((d) => ({
        ...d,
        ingredients: d.ingredients.map((ing, index) => {
          const match = verifiedResults[index]
          if (!match) return ing
          return {
            ...ing,
            calories: match.calories ?? 0,
            protein: match.protein ?? 0,
            carbs: match.carbs ?? 0,
            fat: match.fat ?? 0,
            fiber: match.fiber ?? 0,
            resolved: match.resolved !== false,
            source: match.source || 'spoonacular',
            useEstimate: true,
            customMacros: {
              calories: String(match.calories ?? 0),
              protein: String(match.protein ?? 0),
              carbs: String(match.carbs ?? 0),
              fat: String(match.fat ?? 0),
              fiber: String(match.fiber ?? 0),
            }
          }
        })
      }))
    } catch (err) {
      console.error(err)
      setVerificationError(err instanceof Error ? err.message : "Error verifying ingredients")
    } finally {
      setVerifying(false)
    }
  }

  // Auto verify ingredients on load if they are not resolved and have 0 calories
  useEffect(() => {
    const needsVerification = data.ingredients.length > 0 && data.ingredients.every(ing => !ing.resolved && ing.calories === 0 && ing.source !== 'pending');
    if (needsVerification) {
      verifyIngredients();
    }
  }, [data.ingredients.length]);

  const handlePortionChange = (newAmount, newUnit) => {
    const newGrams = portionToGrams(newAmount, newUnit) || 1
    const oldGrams = portionToGrams(portionAmount, portionUnit) || 1
    const ratio = oldGrams > 0 ? newGrams / oldGrams : 1

    setPortionAmount(newAmount)
    setPortionUnit(newUnit)

    setData((d) => ({
      ...d,
      ingredients: d.ingredients.map((ing) => {
        const updatedAmount = Number((ing.amount * ratio).toFixed(1))
        return {
          ...ing,
          amount: updatedAmount,
          calories: Number((ing.calories * ratio).toFixed(1)),
          protein: Number((ing.protein * ratio).toFixed(1)),
          carbs: Number((ing.carbs * ratio).toFixed(1)),
          fat: Number((ing.fat * ratio).toFixed(1)),
          fiber: Number((ing.fiber * ratio).toFixed(1)),
          customMacros: {
            calories: String(Number((Number(ing.customMacros?.calories || 0) * ratio).toFixed(1))),
            protein: String(Number((Number(ing.customMacros?.protein || 0) * ratio).toFixed(1))),
            carbs: String(Number((Number(ing.customMacros?.carbs || 0) * ratio).toFixed(1))),
            fat: String(Number((Number(ing.customMacros?.fat || 0) * ratio).toFixed(1))),
            fiber: String(Number((Number(ing.customMacros?.fiber || 0) * ratio).toFixed(1))),
          }
        }
      })
    }))
  }

  const handleSave = async () => {
    if (saveStatus === "saving") return;

    setSaveStatus("saving");

    try {
      const payload = {
        name: data.name,
        category: mealCategory,
        search_query: data.name,
        serving_size: portionDisplay,
        calories: scaledNutrition.calories,
        protein: scaledNutrition.protein,
        carbs: scaledNutrition.carbs,
        fat: scaledNutrition.fat,
        fiber: scaledNutrition.fiber,
        confidence: data.confidence ?? null,
        description: data.description,
        source: isEditing ? (analysisData?.source || "analysis") : "analysis",
        image: data.imageSrc,
      };

      const response = isEditing && mealId
        ? await updateMeal(mealId, payload)
        : await saveMeal(payload);

      if (!response.ok) {
        throw new Error(response.error || "Unable to save meal.")
      }

      setSaveStatus("saved");
      setTimeout(() => {
        setSaveStatus("idle");
      }, 2000);
    } catch (error) {
      console.error(error)
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 2400);
    }
  };

  const handleLog = async () => {
    if (logStatus === "logging") return;

    setLogStatus("logging");

    try {
      const payload = {
        name: data.name,
        category: mealCategory,
        search_query: data.name,
        serving_size: portionDisplay,
        calories: scaledNutrition.calories,
        protein: scaledNutrition.protein,
        carbs: scaledNutrition.carbs,
        fat: scaledNutrition.fat,
        fiber: scaledNutrition.fiber,
        confidence: data.confidence ?? null,
        description: data.description,
        source: isEditing ? (analysisData?.source || "log") : "log",
        image: data.imageSrc,
      };
      if (isEditing && analysisData?.created_at) {
        payload.created_at = analysisData.created_at;
      } else {
        payload.created_at = new Date().toISOString();
      }

      const response = isEditing && mealId
        ? await updateMeal(mealId, payload)
        : await saveMeal(payload);


      if (!response.ok) {
        throw new Error(response.error || "Unable to log meal.")
      }

      setLogStatus("logged");
      setTimeout(() => {
        navigate("/daily-log");
      }, 1000);
    } catch (error) {
      console.error(error)
      setLogStatus("error");
      setTimeout(() => setLogStatus("idle"), 2400);
    }
  };

  const updateIngredient = (index, fields) => {
    setData((d) => ({
      ...d,
      ingredients: d.ingredients.map((ing, idx) => {
        if (idx !== index) return ing
        return {
          ...ing,
          ...fields,
        }
      })
    }))
  }

  const updateIngredientCustomMacro = (index, key, val) => {
    setData((d) => ({
      ...d,
      ingredients: d.ingredients.map((ing, idx) => {
        if (idx !== index) return ing
        const customMacros = {
          ...ing.customMacros,
          [key]: val,
        }
        return {
          ...ing,
          customMacros,
        }
      })
    }))
  }

  const removeIngredient = (i) => {
    setData((d) => ({ ...d, ingredients: d.ingredients.filter((_, idx) => idx !== i) }))
  };

  const handleAddModalAddRow = () => {
    setAddModalRows([...addModalRows, { name: "", amount: "100", unit: "g" }]);
  };

  const handleAddModalRemoveRow = (index) => {
    setAddModalRows(addModalRows.filter((_, idx) => idx !== index));
  };

  const handleAddModalUpdateRow = (index, field, value) => {
    setAddModalRows(addModalRows.map((row, idx) => {
      if (idx !== index) return row;
      return { ...row, [field]: value };
    }));
  };

  const handleAddModalCalculate = async () => {
    const validRows = addModalRows.map(r => ({
      name: r.name.trim(),
      amount: parseFloat(r.amount) || 0,
      unit: r.unit
    })).filter(r => r.name.length > 0);

    if (validRows.length === 0) {
      setAddModalError("Please enter at least one ingredient name.");
      return;
    }

    setAddModalVerifying(true);
    setAddModalError(null);

    try {
      const response = await verifyIngredientsBatch(validRows);
      if (!response.ok) {
        throw new Error(response.error || "Failed to verify ingredients.");
      }

      const verifiedResults = response.data.results;
      const updatedRows = validRows.map((row, idx) => {
        const match = verifiedResults[idx];
        return {
          ...row,
          calories: match?.calories ?? 0,
          protein: match?.protein ?? 0,
          carbs: match?.carbs ?? 0,
          fat: match?.fat ?? 0,
          fiber: match?.fiber ?? 0,
          resolved: match?.resolved !== false,
          source: match?.source || 'spoonacular'
        };
      });

      setAddModalRows(updatedRows);
      setAddModalStep('calculated');
    } catch (err) {
      console.error(err);
      setAddModalError(err instanceof Error ? err.message : "Error verifying ingredients.");
    } finally {
      setAddModalVerifying(false);
    }
  };

  const handleAddModalSave = () => {
    const newIngredients = addModalRows.map((row) => ({
      name: row.name,
      amount: parseFloat(row.amount) || 100,
      unit: row.unit,
      calories: row.calories ?? 0,
      protein: row.protein ?? 0,
      carbs: row.carbs ?? 0,
      fat: row.fat ?? 0,
      fiber: row.fiber ?? 0,
      resolved: row.resolved !== false,
      source: row.source || 'spoonacular',
      useEstimate: true,
      customMacros: {
        calories: String(row.calories ?? 0),
        protein: String(row.protein ?? 0),
        carbs: String(row.carbs ?? 0),
        fat: String(row.fat ?? 0),
        fiber: String(row.fiber ?? 0),
      }
    }));

    setData((d) => ({
      ...d,
      ingredients: [...d.ingredients, ...newIngredients]
    }));

    setShowConfirmDialog(false);
    setShowAddModal(false);
    setAddModalRows([{ name: "", amount: "100", unit: "g" }]);
    setAddModalStep('input');
  };

  const isBarcode = data.analysis_provider === 'barcode+openfoodfacts';

  const ingredientNutritionTotals = data.ingredients.reduce(
    (totals, ingredient) => {
      return {
        calories: totals.calories + (ingredient.calories || 0),
        protein: totals.protein + (ingredient.protein || 0),
        carbs: totals.carbs + (ingredient.carbs || 0),
        fat: totals.fat + (ingredient.fat || 0),
        fiber: totals.fiber + (ingredient.fiber || 0),
      }
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  )

  const hasIngredientNutrition = !isBarcode && data.ingredients.length > 0 && data.ingredients.some((ing) => ing.resolved || ing.source === 'spoonacular' || ing.source === 'gemini-fallback' || ing.calories > 0)
  const nutritionSource = hasIngredientNutrition
    ? ingredientNutritionTotals
    : (data.nutritionEstimate || {
        calories: data.calories,
        protein: data.macros[0].value,
        carbs: data.macros[1].value,
        fat: data.macros[2].value,
        fiber: data.macros[3].value,
      })

  const finalMultiplier = hasIngredientNutrition ? 1 : (basePortionGrams > 0 ? currentPortionGrams / basePortionGrams : 1)

  const scaledNutrition = {
    calories: Math.round(numberOrFallback(nutritionSource.calories, 0) * finalMultiplier),
    protein: Number((numberOrFallback(nutritionSource.protein, 0) * finalMultiplier).toFixed(1)),
    carbs: Number((numberOrFallback(nutritionSource.carbs, 0) * finalMultiplier).toFixed(1)),
    fat: Number((numberOrFallback(nutritionSource.fat, 0) * finalMultiplier).toFixed(1)),
    fiber: Number((numberOrFallback(nutritionSource.fiber, 0) * finalMultiplier).toFixed(1)),
  }

  const geminiNutrition = data.nutritionEstimate || {
    calories: data.calories,
    protein: data.macros[0].value,
    carbs: data.macros[1].value,
    fat: data.macros[2].value,
    fiber: data.macros[3].value,
  }


  if (showIconLoading) {
    return <AnalyzingScreen isOpen={true} />;
  }

  if (loadingAnalysis) {
    return (
      <div style={{ fontFamily: "'Poppins', sans-serif", height: "100vh", display: "flex", background: "#f8faf5", overflow: "hidden" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,400;0,500;0,600;0,700;0,800;1,700&family=Bebas+Neue&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          .fa-skeleton {
            background: linear-gradient(90deg, #f0f4ec 25%, #f8faf5 50%, #f0f4ec 75%);
            background-size: 200% 100%;
            animation: loading-skeleton 1.5s infinite;
            border-radius: 8px;
          }
          @keyframes loading-skeleton {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
          .fa-left {
            width: 42%;
            min-width: 360px;
            position: relative;
            flex-shrink: 0;
            background: #1a2e08;
            overflow: hidden;
          }
          .fa-img {
            width: 100%; height: 100%;
            object-fit: cover;
            display: block;
            opacity: 0.82;
          }
          .fa-left-overlay {
            position: absolute; inset: 0;
            background: linear-gradient(to top, rgba(10,20,4,0.92) 0%, rgba(10,20,4,0.3) 45%, transparent 100%);
          }
          .fa-right {
            flex: 1;
            overflow-y: auto;
            padding: 40px;
            background: #ffffff;
            display: flex; flex-direction: column;
            gap: 28px;
          }
          .fa-back-btn {
            display: flex; align-items: center; gap: 8px;
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(8px);
            border: 1px solid rgba(255,255,255,0.15);
            border-radius: 10px;
            padding: 8px 16px;
            color: #fff; font-size: 13px; font-weight: 500;
            cursor: pointer;
          }
        `}</style>
        <div className="fa-left">
          {previewSrc && <img className="fa-img" src={previewSrc} alt="Analyzing food" />}
          <div className="fa-left-overlay" />
          <div style={{ position: 'absolute', top: 24, left: 24, right: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button className="fa-back-btn" onClick={() => navigate('/camera')}>Back</button>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: 2, color: '#c9d84a' }}>NutriSnap</div>
          </div>
          <div style={{ position: 'absolute', bottom: 32, left: 32, right: 32 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(201,216,74,0.15)', border: '1px solid rgba(201,216,74,0.25)', color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: 500, letterSpacing: 1, textTransform: 'uppercase', padding: '5px 12px', borderRadius: 100, marginBottom: 20 }}>
              Scanning...
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: '#fff', marginBottom: 12 }}>Analyzing plate...</h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 1.6 }}>Please wait while the AI ensemble decodes the ingredients, estimates portion sizes, and retrieves nutritional values.</p>
          </div>
        </div>

        <div className="fa-right">
          <div>
            <div className="fa-skeleton" style={{ height: 32, width: '60%', marginBottom: 16 }} />
            <div className="fa-skeleton" style={{ height: 16, width: '90%', marginBottom: 8 }} />
            <div className="fa-skeleton" style={{ height: 16, width: '40%' }} />
          </div>

          <div style={{ display: 'flex', gap: 16, borderBottom: '1px solid #f3f4f6', paddingBottom: 12 }}>
            <div className="fa-skeleton" style={{ height: 20, width: 120 }} />
            <div className="fa-skeleton" style={{ height: 20, width: 100 }} />
          </div>

          <div>
            <div className="fa-skeleton" style={{ height: 14, width: '30%', marginBottom: 16 }} />
            <div className="fa-skeleton" style={{ height: 120, width: '100%', borderRadius: 16 }} />
          </div>

          <div>
            <div className="fa-skeleton" style={{ height: 14, width: '25%', marginBottom: 16 }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <div className="fa-skeleton" style={{ height: 70, borderRadius: 12 }} />
              <div className="fa-skeleton" style={{ height: 70, borderRadius: 12 }} />
              <div className="fa-skeleton" style={{ height: 70, borderRadius: 12 }} />
            </div>
          </div>

          <div>
            <div className="fa-skeleton" style={{ height: 14, width: '35%', marginBottom: 16 }} />
            <div className="fa-skeleton" style={{ height: 140, width: '100%', borderRadius: 16 }} />
          </div>
        </div>
      </div>
    );
  }

  if (analysisError) {
    return (
      <div style={{ fontFamily: "'Poppins', sans-serif", height: "100vh", display: "flex", background: "#f8faf5", overflow: "hidden" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Bebas+Neue&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          .fa-left {
            width: 42%; min-width: 360px; position: relative; flex-shrink: 0; background: #1a2e08; overflow: hidden;
          }
          .fa-img { width: 100%; height: 100%; object-fit: cover; display: block; opacity: 0.82; }
          .fa-left-overlay {
            position: absolute; inset: 0; background: linear-gradient(to top, rgba(10,20,4,0.92) 0%, rgba(10,20,4,0.3) 45%, transparent 100%);
          }
          .fa-right {
            flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; background: #fff;
          }
          .fa-error-card {
            max-width: 440px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 20px;
          }
          .fa-btn {
            padding: 12px 24px; border: none; border-radius: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-family: 'Poppins', sans-serif;
          }
          .fa-btn-primary { background: #2d5016; color: #c9d84a; }
          .fa-btn-primary:hover { background: #3d6b20; }
          .fa-btn-secondary { background: #f3f4f6; color: #4b5563; }
          .fa-btn-secondary:hover { background: #e5e7eb; }
        `}</style>
        <div className="fa-left">
          {previewSrc && <img className="fa-img" src={previewSrc} alt="Error" />}
          <div className="fa-left-overlay" />
          <div style={{ position: 'absolute', top: 24, left: 24, display: 'flex', alignItems: 'center' }}>
            <button className="fa-btn fa-btn-secondary" style={{ padding: '8px 16px', borderRadius: 10 }} onClick={() => navigate('/camera')}>Back</button>
          </div>
        </div>

        <div className="fa-right">
          <div className="fa-error-card">
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', marginBottom: 8 }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#1f2937' }}>Analysis Failed</h2>
            <p style={{ color: '#4b5563', fontSize: 14, lineHeight: 1.6 }}>{analysisError}</p>
            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <button className="fa-btn fa-btn-primary" onClick={runAnalysis}>Retry Analysis</button>
              <button className="fa-btn fa-btn-secondary" onClick={() => navigate('/camera')}>Go back to Camera</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fa-container">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,400;0,500;0,600;0,700;0,800;1,700&family=Bebas+Neue&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .fa-container {
          font-family: 'Poppins', sans-serif;
          height: 100vh;
          display: flex;
          background: #f8faf5;
          overflow: hidden;
        }


        /* ── LEFT PANEL ── */
        .fa-left {
          width: 42%;
          min-width: 360px;
          position: relative;
          flex-shrink: 0;
          background: #1a2e08;
          overflow: hidden;
        }
        .fa-img {
          width: 100%; height: 100%;
          object-fit: cover;
          display: block;
          opacity: 0.82;
        }
        .fa-img-placeholder {
          width: 100%; height: 100%;
          background: linear-gradient(145deg, #2d5016 0%, #1a2e08 50%, #0f1a05 100%);
          display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 16px;
        }
        .fa-img-placeholder-icon {
          width: 80px; height: 80px;
          border: 2px dashed rgba(201,216,74,0.3);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
        }
        .fa-img-placeholder-text { color: rgba(255,255,255,0.35); font-size: 13px; }

        .fa-left-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(to top, rgba(10,20,4,0.92) 0%, rgba(10,20,4,0.3) 45%, transparent 100%);
        }
        .fa-left-top {
          position: absolute; top: 0; left: 0; right: 0;
          padding: 24px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .fa-back-btn {
          display: flex; align-items: center; gap: 8px;
          background: rgba(255,255,255,0.1);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 10px;
          padding: 8px 16px;
          color: #fff; font-size: 13px; font-weight: 500;
          font-family: 'Poppins', sans-serif;
          cursor: pointer; transition: all 0.2s;
        }
        .fa-back-btn:hover { background: rgba(255,255,255,0.18); }
        .fa-brand {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 22px; letter-spacing: 2px; color: #c9d84a;
        }
        .fa-confidence {
          background: rgba(201,216,74,0.15);
          border: 1px solid rgba(201,216,74,0.35);
          backdrop-filter: blur(8px);
          border-radius: 10px; padding: 8px 14px;
          display: flex; align-items: center; gap: 6px;
        }
        .fa-confidence-dot { width: 6px; height: 6px; background: #c9d84a; border-radius: 50%; animation: pulse 1.5s infinite; }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.7)} }
        .fa-confidence-text { color: #c9d84a; font-size: 12px; font-weight: 600; }

        .fa-left-bottom {
          position: absolute; bottom: 0; left: 0; right: 0; padding: 32px;
        }
        .fa-food-name-big {
          font-family: 'Poppins', sans-serif;
          font-size: clamp(26px, 3vw, 36px);
          font-weight: 800; color: #fff; line-height: 1.1; margin-bottom: 8px;
        }
        .fa-food-name-big em { color: #c9d84a; font-style: italic; }
        .fa-category-tag {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(201,216,74,0.15);
          border: 1px solid rgba(201,216,74,0.25);
          color: rgba(255,255,255,0.8);
          font-size: 11px; font-weight: 500; letter-spacing: 1px; text-transform: uppercase;
          padding: 5px 12px; border-radius: 100px; margin-bottom: 20px;
        }
        .fa-cal-badge {
          display: flex; align-items: baseline; gap: 6px;
          margin-bottom: 6px;
        }
        .fa-cal-num {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 52px; color: #c9d84a; line-height: 1;
        }
        .fa-cal-label { color: rgba(255,255,255,0.6); font-size: 14px; font-weight: 500; }
        .fa-serving { color: rgba(255,255,255,0.45); font-size: 12px; margin-top: 2px; }

        /* Macro mini bars on left */
        .fa-macro-mini { display: flex; gap: 8px; margin-top: 20px; }
        .fa-macro-mini-item {
          flex: 1; background: rgba(255,255,255,0.08);
          border-radius: 8px; padding: 10px 10px 8px;
          border: 1px solid rgba(255,255,255,0.08);
        }
        .fa-macro-mini-val { font-size: 15px; font-weight: 700; color: #fff; }
        .fa-macro-mini-label { font-size: 10px; color: rgba(255,255,255,0.5); margin-top: 2px; letter-spacing: 0.5px; }
        .fa-macro-mini-bar { height: 3px; border-radius: 2px; margin-top: 6px; background: rgba(255,255,255,0.1); overflow: hidden; }
        .fa-macro-mini-fill { height: 100%; border-radius: 2px; animation: fillBar 1s ease forwards; }
        @keyframes fillBar { from { width: 0; } }

        /* ── RIGHT PANEL ── */
        .fa-right {
          flex: 1;
          overflow-y: auto;
          padding: 0;
          background: #ffffff;
          display: flex; flex-direction: column;
        }
        .fa-right::-webkit-scrollbar { width: 4px; }
        .fa-right::-webkit-scrollbar-track { background: transparent; }
        .fa-right::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 4px; }

        .fa-right-header {
          padding: 28px 36px 0;
          border-bottom: 1px solid #f3f4f6;
          position: sticky; top: 0; z-index: 10;
          background: #fff;
        }

        /* Editable food name */
        .fa-edit-row {
          display: flex; align-items: center; gap: 10px; margin-bottom: 4px;
        }
        .fa-name-input {
          font-family: 'Poppins', sans-serif;
          font-size: 26px; font-weight: 700; color: #1a2e08;
          border: none; outline: none;
          border-bottom: 2px solid transparent;
          background: transparent;
          width: 100%; transition: border-color 0.2s;
          padding: 2px 0;
        }
        .fa-name-input:focus { border-bottom-color: #4a7c2f; }
        .fa-edit-btn {
          width: 32px; height: 32px; border-radius: 8px;
          background: #f0f7eb; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; transition: all 0.2s; color: #4a7c2f;
        }
        .fa-edit-btn:hover { background: #c9d84a; color: #1a2e08; }

        .fa-desc-input {
          font-family: 'Poppins', sans-serif;
          font-size: 13px; color: #6b7280; line-height: 1.6;
          border: none; outline: none; background: transparent;
          width: 100%; resize: none;
          border-left: 2px solid transparent;
          padding: 2px 8px 2px 0;
          transition: all 0.2s;
        }
        .fa-desc-input:focus {
          border-left-color: #c9d84a;
          padding-left: 10px;
          background: #fafdf7;
          border-radius: 0 6px 6px 0;
        }

        /* Tabs */
        .fa-tabs {
          display: flex; gap: 0; margin-top: 20px;
        }
        .fa-tab {
          padding: 12px 24px; font-size: 13px; font-weight: 600;
          color: #9ca3af; cursor: pointer; border-bottom: 2px solid transparent;
          transition: all 0.2s; font-family: 'Poppins', sans-serif;
          letter-spacing: 0.3px;
        }
        .fa-tab.active { color: #2d5016; border-bottom-color: #2d5016; }
        .fa-tab:hover:not(.active) { color: #4a7c2f; }

        /* Tab content */
        .fa-tab-content { padding: 28px 36px; flex: 1; }

        /* Nutrition */
        .fa-section-title {
          font-size: 11px; font-weight: 700; letter-spacing: 2px;
          text-transform: uppercase; color: #9ca3af; margin-bottom: 20px;
        }

        .fa-macro-card {
          background: #f8faf5;
          border: 1px solid #e8f0e0;
          border-radius: 16px; padding: 20px; margin-bottom: 20px;
        }
        .fa-macro-row {
          display: flex; align-items: center; gap: 16px;
          margin-bottom: 14px;
        }
        .fa-macro-row:last-child { margin-bottom: 0; }
        .fa-macro-label-wrap { width: 72px; flex-shrink: 0; }
        .fa-macro-label { font-size: 12px; font-weight: 600; color: #374151; }
        .fa-macro-val { font-size: 11px; color: #9ca3af; }
        .fa-macro-bar-wrap { flex: 1; height: 10px; background: #e5e7eb; border-radius: 99px; overflow: hidden; }
        .fa-macro-bar-fill { height: 100%; border-radius: 99px; animation: fillBar 1.2s cubic-bezier(0.22,1,0.36,1) forwards; }
        .fa-macro-pct { font-size: 11px; font-weight: 600; color: #6b7280; width: 36px; text-align: right; flex-shrink: 0; }

        /* Calorie donut-like row */
        .fa-cal-breakdown {
          display: flex; gap: 8px; margin-bottom: 20px;
        }
        .fa-cal-item {
          flex: 1; background: #f8faf5; border-radius: 12px;
          padding: 14px 12px; text-align: center;
          border: 1px solid #e8f0e0;
        }
        .fa-cal-item-val { font-size: 18px; font-weight: 700; color: #1a2e08; }
        .fa-cal-item-label { font-size: 10px; color: #9ca3af; font-weight: 500; margin-top: 3px; text-transform: uppercase; letter-spacing: 0.5px; }
        .fa-cal-item-sub { font-size: 10px; color: #c9d84a; font-weight: 600; }

        .fa-portion-card {
          background: #f8faf5;
          border: 1px solid #e8f0e0;
          border-radius: 14px;
          padding: 16px;
          margin-bottom: 20px;
        }
        .fa-portion-card-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
        .fa-portion-card-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #9ca3af; }
        .fa-portion-card-row { display: flex; align-items: center; gap: 10px; }
        .fa-portion-unit-wrap { position: relative; min-width: 88px; }
        .fa-portion-input {
          flex: 1;
          padding: 11px 14px;
          border-radius: 12px;
          border: 1.5px solid #c9d84a;
          background: #fff;
          outline: none;
          font-family: 'Poppins', sans-serif;
          font-size: 13px;
          color: #1a2e08;
        }
        .fa-portion-unit {
          width: 100%;
          text-align: center;
          background: #2d5016;
          color: #c9d84a;
          border-radius: 12px;
          padding: 10px 34px 10px 12px;
          font-size: 13px;
          font-weight: 700;
          border: none;
          outline: none;
          appearance: none;
          cursor: pointer;
        }
        .fa-portion-unit-icon {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          color: #c9d84a;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .fa-portion-helper { margin-top: 8px; font-size: 12px; color: #6b7280; line-height: 1.5; }
        .fa-portion-description { margin-top: 8px; font-size: 12px; color: #6b7280; line-height: 1.5; }

        /* Micro table */
        .fa-micro-table { width: 100%; }
        .fa-micro-row {
          display: flex; align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid #f3f4f6;
        }
        .fa-micro-row:last-child { border-bottom: none; }
        .fa-micro-name { flex: 1; font-size: 13px; color: #374151; font-weight: 500; }
        .fa-micro-val { font-size: 13px; color: #6b7280; margin-right: 16px; }
        .fa-micro-dv {
          font-size: 11px; font-weight: 600; padding: 3px 8px;
          background: #f0f7eb; color: #4a7c2f; border-radius: 6px;
          min-width: 40px; text-align: center;
        }

        /* Ingredients */
        .fa-ing-grid {
          display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;
        }
        .fa-ing-card {
          background: #f8faf5;
          border: 1px solid #e8f0e0;
          border-radius: 16px;
          padding: 14px;
          animation: chipIn 0.3s ease;
        }
        .fa-ing-card-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .fa-ing-card-name { font-size: 13px; font-weight: 700; color: #1a2e08; }
        .fa-ing-card-meta { margin-top: 6px; font-size: 11px; color: #6b7280; }
        .fa-ing-card-stats { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
        .fa-ing-card-stats span {
          font-size: 11px;
          background: #fff;
          border: 1px solid #e3ecd9;
          border-radius: 999px;
          padding: 4px 8px;
          color: #2d5016;
          font-weight: 600;
        }
        .fa-ing-table-header {
          display: grid;
          grid-template-columns: minmax(140px, 1.1fr) minmax(220px, 1.4fr) auto;
          gap: 12px;
          padding: 0 14px 8px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1.4px;
          color: #9ca3af;
        }
        .fa-ing-card-row {
          display: grid;
          grid-template-columns: minmax(140px, 1.1fr) minmax(220px, 1.4fr) auto;
          gap: 12px;
          align-items: center;
        }
        .fa-ing-cell-name { font-size: 13px; font-weight: 700; color: #1a2e08; }
        .fa-ing-cell-value { font-size: 13px; color: #374151; }
        .fa-ing-cell-meta { font-size: 11px; color: #6b7280; }
        @keyframes chipIn { from { opacity:0; transform:scale(0.85); } to { opacity:1; transform:scale(1); } }
        .fa-ing-chip-remove {
          width: 16px; height: 16px; border-radius: 50%;
          background: rgba(45,80,22,0.12); border: none;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          color: #4a7c2f; font-size: 10px; transition: all 0.15s;
          padding: 0;
        }
        .fa-ing-chip-remove:hover { background: #ef4444; color: #fff; }

        .fa-add-ing {
          display: inline-flex; align-items: center; gap: 6px;
          background: transparent; border: 1.5px dashed #c9d84a;
          color: #4a7c2f; font-size: 13px; font-weight: 600;
          padding: 7px 14px; border-radius: 100px; cursor: pointer;
          transition: all 0.2s; font-family: 'Poppins', sans-serif;
        }
        .fa-add-ing:hover { background: #f0f7eb; }

        .fa-add-ing-row {
          display: flex; gap: 8px; align-items: center; margin-top: 8px;
        }
        .fa-ing-input {
          flex: 1; padding: 9px 14px;
          border: 1.5px solid #c9d84a; border-radius: 100px;
          font-size: 13px; font-family: 'Poppins', sans-serif;
          outline: none; color: #1a2e08;
          box-shadow: 0 0 0 3px rgba(201,216,74,0.15);
        }
        .fa-ing-add-btn {
          background: #2d5016; color: #c9d84a;
          border: none; border-radius: 100px;
          padding: 9px 18px; font-size: 13px; font-weight: 600;
          font-family: 'Poppins', sans-serif; cursor: pointer;
          transition: all 0.2s;
        }
        .fa-ing-add-btn:hover { background: #3d6b20; }
        .fa-ing-cancel-btn {
          background: #f3f4f6; color: #6b7280;
          border: none; border-radius: 100px;
          padding: 9px 14px; font-size: 13px; font-weight: 600;
          font-family: 'Poppins', sans-serif; cursor: pointer;
        }

        /* Save button */
        .fa-save-bar {
          padding: 20px 36px 28px;
          border-top: 1px solid #f3f4f6;
          display: flex; gap: 12px; align-items: center;
        }
        .fa-save-btn {
          padding: 14px 24px;
          background: #2d5016; color: #c9d84a;
          border: none; border-radius: 14px;
          font-size: 14px; font-weight: 700; letter-spacing: 0.5px;
          font-family: 'Poppins', sans-serif; cursor: pointer;
          transition: all 0.25s; text-transform: uppercase;
          box-shadow: 0 6px 20px rgba(45,80,22,0.25);
          display: flex; align-items: center; justify-content: center; gap: 8px;
          white-space: nowrap;
        }
        .fa-save-btn:hover { background: #3d6b20; transform: translateY(-1px); box-shadow: 0 10px 28px rgba(45,80,22,0.35); }
        .fa-save-btn.saved { background: #4a7c2f; }
        .fa-log-btn {
          flex: 1; padding: 14px;
          background: #f0f7eb; color: #2d5016;
          border: 1.5px solid #c9d84a; border-radius: 14px;
          font-size: 14px; font-weight: 700;
          font-family: 'Poppins', sans-serif; cursor: pointer;
          transition: all 0.2s; white-space: nowrap;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .fa-log-btn:hover { background: #c9d84a; }

        @media (max-width: 768px) {
          .fa-container {
            flex-direction: column !important;
            height: auto !important;
            overflow-y: auto !important;
          }
          .fa-left {
            width: 100% !important;
            height: 380px !important;
            min-width: auto !important;
            flex-shrink: 1 !important;
          }
          .fa-right {
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
          }
          .fa-save-bar {
            position: sticky !important;
            bottom: 0 !important;
            background: #ffffff !important;
            box-shadow: 0 -4px 12px rgba(0,0,0,0.08) !important;
            z-index: 100 !important;
          }
          .fa-tab-content {
            padding: 20px !important;
          }
          .fa-right-header {
            padding: 20px 20px 0 !important;
          }
        }
      `}</style>

      {/* ── LEFT: IMAGE PANEL ── */}
      <div className="fa-left">
        {data.imageSrc ? (
          <img className="fa-img" src={data.imageSrc} alt={data.name} />
        ) : (
          <div className="fa-img-placeholder">
            <div className="fa-img-placeholder-icon">
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <rect x="3" y="8" width="30" height="22" rx="5" stroke="rgba(201,216,74,0.5)" strokeWidth="1.8"/>
                <circle cx="18" cy="19" r="7" stroke="rgba(201,216,74,0.5)" strokeWidth="1.8"/>
                <circle cx="18" cy="19" r="3" fill="rgba(201,216,74,0.25)"/>
                <path d="M13 8l2-4h6l2 4" stroke="rgba(201,216,74,0.5)" strokeWidth="1.8" strokeLinecap="round"/>
                <circle cx="28" cy="13" r="2" fill="rgba(201,216,74,0.4)"/>
              </svg>
            </div>
            <div className="fa-img-placeholder-text">Food image appears here</div>
          </div>
        )}
        <div className="fa-left-overlay" />

        {/* Top bar */}
        <div className="fa-left-top">
            <button className="fa-back-btn" onClick={() => navigate('/camera')}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 2L4 7l5 5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back
          </button>
          <div className="fa-brand">NutriSnap</div>
        </div>

        {/* Bottom info */}
        <div className="fa-left-bottom">
          <div className="fa-category-tag">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <circle cx="5" cy="5" r="4" stroke="rgba(255,255,255,0.6)" strokeWidth="1.2"/>
              <path d="M5 3v2.5l1.5 1" stroke="rgba(255,255,255,0.6)" strokeWidth="1" strokeLinecap="round"/>
            </svg>
            {mealCategory}
          </div>

          <div className="fa-food-name-big">
            {data.name.split(" ").map((w, i) =>
              i === data.name.split(" ").length - 1
                ? <em key={i}>{w}</em>
                : <span key={i}>{w} </span>
            )}
          </div>

          <div className="fa-cal-badge">
            <div className="fa-cal-num">{scaledNutrition.calories}</div>
            <div className="fa-cal-label">kcal</div>
          </div>
          <div className="fa-serving">{portionDisplay}</div>

          {/* Mini macro bars */}
          <div className="fa-macro-mini">
            {data.macros.slice(0, 3).map((m) => (
              <div className="fa-macro-mini-item" key={m.label}>
                <div className="fa-macro-mini-val" style={{ color: m.color }}>
                  {scaledNutrition[m.label.toLowerCase()] ?? m.value}{m.unit}
                </div>
                <div className="fa-macro-mini-label">{m.label}</div>
                <div className="fa-macro-mini-bar">
                  <div
                    className="fa-macro-mini-fill"
                    style={{ width: `${((scaledNutrition[m.label.toLowerCase()] ?? m.value) / m.max) * 100}%`, background: m.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT: DETAILS PANEL ── */}
      <div className="fa-right">
        {/* Header */}
        <div className="fa-right-header">
          <div className="fa-edit-row">
            <input
              ref={nameRef}
              className="fa-name-input"
              value={data.name}
              onChange={(e) => setData(d => ({ ...d, name: e.target.value }))}
              onFocus={() => setEditingName(true)}
              onBlur={() => setEditingName(false)}
            />
            <button className="fa-edit-btn" onClick={() => nameRef.current?.focus()} title="Edit name">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9.5 2.5l2 2-7 7H2.5v-2l7-7z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="fa-tabs">
            {(isBarcode ? ["nutrition"] : ["nutrition", "ingredients"]).map(t => (
              <div
                key={t}
                className={`fa-tab ${activeTab === t ? "active" : ""}`}
                onClick={() => setActiveTab(t)}
              >
                {t === "nutrition" ? "Nutritional Values" : "Ingredients"}
              </div>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="fa-tab-content">
          {activeTab === "nutrition" && (
            <>
              {/* Meal Category Select */}
              <div className="fa-section-title">Meal Type</div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
                {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map((cat) => {
                  const isSel = mealCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setMealCategory(cat)}
                      style={{
                        padding: '8px 18px',
                        borderRadius: '99px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.18s ease-in-out',
                        border: isSel ? '2px solid #2d5016' : '1px solid #e5e7eb',
                        background: isSel ? '#f0f7eb' : '#fff',
                        color: isSel ? '#2d5016' : '#6b7280',
                        fontFamily: "'Poppins', sans-serif"
                      }}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              <div className="fa-section-title">Estimated Nutrition</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                <div style={{ background: '#f8faf5', border: '1px solid #e8f0e0', borderRadius: 16, padding: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#9ca3af' }}>Nutrition Breakdown</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, textAlign: 'center' }}>
                    <div style={{ background: 'white', borderRadius: 12, padding: 10, border: '1px solid rgba(232,240,224,0.4)' }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#1a2e08' }}>{Math.round(scaledNutrition.calories)}</div>
                      <div style={{ fontSize: 10, color: '#6b7280' }}>kcal</div>
                    </div>
                    <div style={{ background: 'white', borderRadius: 12, padding: 10, border: '1px solid rgba(232,240,224,0.4)' }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#1a2e08' }}>{scaledNutrition.protein.toFixed(1)}g</div>
                      <div style={{ fontSize: 10, color: '#6b7280' }}>protein</div>
                    </div>
                    <div style={{ background: 'white', borderRadius: 12, padding: 10, border: '1px solid rgba(232,240,224,0.4)' }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#1a2e08' }}>{scaledNutrition.carbs.toFixed(1)}g</div>
                      <div style={{ fontSize: 10, color: '#6b7280' }}>carbs</div>
                    </div>
                    <div style={{ background: 'white', borderRadius: 12, padding: 10, border: '1px solid rgba(232,240,224,0.4)' }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#1a2e08' }}>{scaledNutrition.fat.toFixed(1)}g</div>
                      <div style={{ fontSize: 10, color: '#6b7280' }}>fat</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Portion size */}
              <div className="fa-section-title">Portion Size</div>
              <div className="fa-portion-card">
                <div className="fa-portion-card-head">
                  <div className="fa-portion-card-label">Editable portion size</div>
                  <div className="fa-portion-unit-wrap">
                    <select
                      className="fa-portion-unit"
                      value={portionUnit}
                      onChange={(e) => handlePortionChange(portionAmount, e.target.value)}
                    >
                      {PORTION_UNITS.map((unit) => (
                        <option key={unit.value} value={unit.value}>
                          {unit.label}
                        </option>
                      ))}
                    </select>
                    <svg className="fa-portion-unit-icon" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
                <div className="fa-portion-card-row">
                  <input
                    className="fa-portion-input"
                    type="number"
                    min="1"
                    step="1"
                    value={portionAmount}
                    onChange={(e) => handlePortionChange(e.target.value.replace(/[^0-9]/g, ''), portionUnit)}
                    placeholder="e.g. 350"
                  />
                </div>
              </div>

              {/* Macro bars */}
              <div className="fa-section-title" style={{ marginTop: 24 }}>Macronutrients</div>
              <div className="fa-macro-card">
                {data.macros.map((m) => (
                  <div className="fa-macro-row" key={m.label}>
                    <div className="fa-macro-label-wrap">
                      <div className="fa-macro-label">{m.label}</div>
                      <div className="fa-macro-val">{scaledNutrition[m.label.toLowerCase()] ?? m.value}{m.unit}</div>
                    </div>
                    <div className="fa-macro-bar-wrap">
                      <div
                        className="fa-macro-bar-fill"
                        style={{ width: `${((scaledNutrition[m.label.toLowerCase()] ?? m.value) / m.max) * 100}%`, background: m.color }}
                      />
                    </div>
                    <div className="fa-macro-pct">{Math.round(((scaledNutrition[m.label.toLowerCase()] ?? m.value) / m.max) * 100)}%</div>
                  </div>
                ))}
              </div>

              {/* Micronutrients */}
              <div className="fa-section-title" style={{ marginTop: 8 }}>Micronutrients <span style={{ color: "#c9d84a", fontSize: "10px" }}>% Daily Value</span></div>
              <div className="fa-micro-table">
                {data.micros.map((m) => (
                  <div className="fa-micro-row" key={m.label}>
                    <div className="fa-micro-name">{m.label}</div>
                    <div className="fa-micro-val">{m.value}</div>
                    <div className="fa-micro-dv">{m.dv}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === "ingredients" && (
            <>
              <div className="fa-section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <span>{data.ingredients.length} Ingredients</span>
                {!addingIngredient && !isBarcode && (
                <button className="fa-add-ing" onClick={() => setShowAddModal(true)}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                  Add ingredient
                </button>
                )}
              </div>

              {/* Verify Banner */}
              {!isBarcode && data.ingredients.some(ing => ing.source === 'pending') && (
                <div style={{ background: '#fff9c4', color: '#f57f17', padding: '12px 16px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', border: '1px solid #ffe082' }}>
                  <span>Ingredients list updated. Verify to calculate nutrition breakdown.</span>
                  <button
                    style={{ background: '#f57f17', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                    onClick={verifyIngredients}
                    disabled={verifying}
                  >
                    {verifying ? 'Verifying...' : 'Verify Now'}
                  </button>
                </div>
              )}

              {/* Verification Error */}
              {verificationError && (
                <div style={{ background: '#ffebee', color: '#c62828', padding: '12px 16px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, marginBottom: '16px', border: '1px solid #ffcdd2' }}>
                  {verificationError}
                </div>
              )}

              {/* Ingredients List */}
              <div className="fa-ing-grid">
                <div className="fa-ing-table-header" style={{ display: 'grid', gridTemplateColumns: isBarcode ? '1.5fr 100px 100px' : '1.5fr 80px 80px auto', gap: '8px', padding: '0 12px 8px' }}>
                  <div>Ingredient Name</div>
                  <div style={{ textAlign: 'right' }}>Amount</div>
                  <div>Unit</div>
                  {!isBarcode && <div></div>}
                </div>

                {data.ingredients.map((ing, i) => {
                  return (
                    <div className="fa-ing-card" key={i} style={{ marginBottom: '12px' }}>
                      {isBarcode ? (
                        <div className="fa-ing-card-row" style={{ display: 'grid', gridTemplateColumns: '1.5fr 100px 100px', gap: '8px', alignItems: 'center' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#1a2e08' }}>{ing.name}</span>
                          <span style={{ fontSize: '13px', color: '#374151', textAlign: 'right' }}>{ing.amount}</span>
                          <span style={{ fontSize: '13px', color: '#6b7280' }}>{ing.unit}</span>
                        </div>
                      ) : (
                        <div className="fa-ing-card-row" style={{ display: 'grid', gridTemplateColumns: '1.5fr 80px 80px auto', gap: '8px', alignItems: 'center' }}>
                          <input
                            className="fa-ing-input-inline-name"
                            type="text"
                            value={ing.name}
                            onChange={(e) => updateIngredient(i, { name: e.target.value, source: 'pending' })}
                            placeholder="e.g. Chicken Breast"
                          />
                          <input
                            className="fa-ing-input-inline-amount"
                            type="number"
                            value={ing.amount}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              const ratio = ing.amount > 0 ? val / ing.amount : 1;
                              updateIngredient(i, {
                                amount: val,
                                source: 'pending',
                                calories: Number((ing.calories * ratio).toFixed(1)),
                                protein: Number((ing.protein * ratio).toFixed(1)),
                                carbs: Number((ing.carbs * ratio).toFixed(1)),
                                fat: Number((ing.fat * ratio).toFixed(1)),
                                fiber: Number((ing.fiber * ratio).toFixed(1)),
                              });
                            }}
                          />
                          <select
                            className="fa-ing-select-inline-unit"
                            value={ing.unit}
                            onChange={(e) => updateIngredient(i, { unit: e.target.value, source: 'pending' })}
                          >
                            <option value="g">g</option>
                            <option value="serving">serving</option>
                            <option value="cup">cup</option>
                            <option value="tbsp">tbsp</option>
                            <option value="tsp">tsp</option>
                            <option value="oz">oz</option>
                          </select>
                          <button className="fa-ing-chip-remove" onClick={() => removeIngredient(i)} title="Remove">
                            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                              <path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            </svg>
                          </button>
                        </div>
                      )}

                      {/* Nutrition Info or Warning */}
                      {!isBarcode && (
                        <div style={{ marginTop: '8px', padding: '6px 0 0', borderTop: '1px solid rgba(0,0,0,0.03)', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                          {ing.source === 'pending' ? (
                            <span style={{ fontSize: '11px', color: '#ff8f00', fontWeight: 600 }}>⏳ Verification pending</span>
                          ) : (
                            <>
                              <span style={{ fontSize: '11px', color: ing.resolved ? '#4a7c2f' : '#b78103', fontWeight: 600 }}>
                                {ing.resolved 
                                  ? `✓ Verified by ${ing.source === 'gemini-fallback' ? 'Gemini AI' : 'Spoonacular'}` 
                                  : '✦ AI Estimate (Gemini)'}
                              </span>
                              <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500 }}>
                                {Math.round(ing.calories)} kcal • {ing.protein}g P • {ing.carbs}g C • {ing.fat}g F
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Save bar */}
        <div className="fa-save-bar">
          <button className="fa-log-btn" onClick={handleLog} disabled={logStatus === "logging"}>
            {logStatus === "logged" ? (
              <>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8l3.5 3.5L13 4" stroke="#2d5016" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {isEditing && analysisData?.source === 'log' ? "Log Updated" : "Meal Logged"}
              </>
            ) : logStatus === "logging" ? (
              <>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 3v2M8 11v2M3 8h2M11 8h2M4.5 4.5l1.4 1.4M10.1 10.1l1.4 1.4M11.5 4.5l-1.4 1.4M5.9 10.1l-1.4 1.4" stroke="#2d5016" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
                {isEditing && analysisData?.source === 'log' ? "Updating..." : "Logging..."}
              </>
            ) : (
              isEditing && analysisData?.source === 'log' ? "Update Log" : "Log Meal"
            )}
          </button>

          <button className={`fa-save-btn ${saveStatus === "saved" ? "saved" : ""}`} onClick={handleSave} disabled={saveStatus === "saving"}>
            {saveStatus === "saved" ? (
              <>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8l3.5 3.5L13 4" stroke="#c9d84a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {isEditing && analysisData?.source !== 'log' ? "Template Updated" : "Template Saved"}
              </>
            ) : saveStatus === "saving" ? (
              <>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 3v2M8 11v2M3 8h2M11 8h2M4.5 4.5l1.4 1.4M10.1 10.1l1.4 1.4M11.5 4.5l-1.4 1.4M5.9 10.1l-1.4 1.4" stroke="#c9d84a" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
                {isEditing && analysisData?.source !== 'log' ? "Updating..." : "Saving..."}
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M13 10v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3M8 2v7M5 6l3 3 3-3" stroke="#c9d84a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {isEditing ? (analysisData?.source === 'log' ? "Save as Template" : "Update Template") : "Save Meal"}
              </>
            )}
          </button>
        </div>
      </div>

      {showAddModal && (
        <div className="fa-modal-overlay" onClick={() => { if (!addModalVerifying) setShowAddModal(false); }}>
          <div className="fa-modal" style={{ maxWidth: '600px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <style>{`
              .fa-modal-overlay {
                position: fixed; inset: 0;
                background: rgba(26,46,8,0.4);
                backdrop-filter: blur(8px);
                display: flex; align-items: center; justify-content: center;
                z-index: 1000;
                animation: fadeIn 0.25s ease;
              }
              .fa-modal {
                background: #ffffff;
                border-radius: 20px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.15);
                border: 1px solid #e8f0e0;
                display: flex; flex-direction: column;
                overflow: hidden;
                animation: scaleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
              }
              @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
              @keyframes scaleIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
              .fa-modal-header {
                padding: 20px 24px;
                border-bottom: 1px solid #f3f4f6;
                display: flex; align-items: center; justify-content: space-between;
              }
              .fa-modal-title { font-size: 16px; font-weight: 700; color: #1a2e08; }
              .fa-modal-close {
                background: transparent; border: none; cursor: pointer; color: #9ca3af;
                display: flex; align-items: center; justify-content: center;
                width: 32px; height: 32px; border-radius: 50%; transition: all 0.2s;
              }
              .fa-modal-close:hover { background: #f3f4f6; color: #374151; }
              .fa-modal-body { padding: 24px; display: flex; flex-direction: column; gap: 16px; max-height: 60vh; overflow-y: auto; }
              .fa-modal-textarea {
                width: 100%; height: 160px;
                border: 1.5px solid #c9d84a; border-radius: 12px;
                padding: 12px; outline: none; resize: none;
                font-family: 'Poppins', sans-serif; font-size: 13px; color: #1a2e08;
                box-shadow: 0 0 0 3px rgba(201,216,74,0.1);
                transition: border-color 0.2s;
              }
              .fa-modal-textarea:focus { border-color: #2d5016; }
              .fa-modal-footer {
                padding: 16px 24px; background: #fafdf7; border-top: 1px solid #f3f4f6;
                display: flex; justify-content: flex-end; gap: 12px;
              }
              .fa-modal-row-grid {
                display: grid;
                grid-template-columns: 2fr 1fr 1.2fr auto;
                gap: 10px;
                align-items: center;
                margin-bottom: 12px;
              }
              .fa-modal-row-label {
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 1px;
                color: #9ca3af;
              }
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
            
            <div className="fa-modal-header">
              <div className="fa-modal-title">
                {addModalStep === 'input' ? 'Add Recipe Ingredients' : 'Verify Ingredient Calories'}
              </div>
              <button className="fa-modal-close" onClick={() => { if (!addModalVerifying) setShowAddModal(false); }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M1 1l12 12M13 1L1 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <div className="fa-modal-body">
              {addModalStep === 'input' ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.2fr auto', gap: '10px', paddingBottom: '4px' }}>
                    <div className="fa-modal-row-label">Ingredient Name</div>
                    <div className="fa-modal-row-label">Amount</div>
                    <div className="fa-modal-row-label">Unit</div>
                    <div></div>
                  </div>

                  {addModalRows.map((row, idx) => (
                    <div className="fa-modal-row-grid" key={idx}>
                      <input
                        className="fa-ing-input"
                        style={{ width: '100%', borderRadius: '10px', boxShadow: 'none' }}
                        type="text"
                        placeholder="e.g. Garlic cloves"
                        value={row.name}
                        onChange={(e) => handleAddModalUpdateRow(idx, 'name', e.target.value)}
                      />
                      <input
                        className="fa-ing-input"
                        style={{ width: '100%', borderRadius: '10px', boxShadow: 'none' }}
                        type="number"
                        placeholder="Amt"
                        value={row.amount}
                        onChange={(e) => handleAddModalUpdateRow(idx, 'amount', e.target.value)}
                      />
                      <select
                        className="fa-ing-input"
                        style={{ width: '100%', background: '#fff', cursor: 'pointer', borderRadius: '10px', boxShadow: 'none' }}
                        value={row.unit}
                        onChange={(e) => handleAddModalUpdateRow(idx, 'unit', e.target.value)}
                      >
                        <option value="g">g</option>
                        <option value="serving">serving</option>
                        <option value="cup">cup</option>
                        <option value="tbsp">tbsp</option>
                        <option value="tsp">tsp</option>
                        <option value="oz">oz</option>
                      </select>
                      {addModalRows.length > 1 ? (
                        <button className="fa-ing-chip-remove" onClick={() => handleAddModalRemoveRow(idx)} title="Remove">
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                            <path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          </svg>
                        </button>
                      ) : (
                        <div style={{ width: 16 }}></div>
                      )}
                    </div>
                  ))}

                  <button
                    onClick={handleAddModalAddRow}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '12px auto 0',
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: '#f0f7eb',
                      border: '1.5px dashed #c9d84a',
                      color: '#4a7c2f',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    title="Add Ingredient Row"
                  >
                    <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
                      <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ fontSize: 13, color: '#4b5563', fontWeight: 500 }}>
                    Here is the calculated calorie breakdown for the ingredients you chose:
                  </div>

                  <div style={{ background: '#f8faf5', border: '1px solid #e8f0e0', borderRadius: 16, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {addModalRows.map((row, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: idx === addModalRows.length - 1 ? 'none' : '1px solid rgba(232,240,224,0.5)', paddingBottom: idx === addModalRows.length - 1 ? 0 : 10 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#1a2e08' }}>{row.name}</div>
                          <div style={{ fontSize: 11, color: '#6b7280' }}>{row.amount} {row.unit}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: '#2d5016' }}>{Math.round(row.calories)} kcal</span>
                          {!row.resolved && (
                            <div style={{ fontSize: 9, background: '#ffebee', color: '#c62828', padding: '1px 5px', borderRadius: '4px', display: 'inline-block', marginLeft: '6px', fontWeight: 700 }}>AI Est</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#2d5016', color: '#c9d84a', padding: '14px 20px', borderRadius: 12, fontWeight: 700 }}>
                    <span>Total Added Calories</span>
                    <span style={{ fontSize: 18 }}>{Math.round(addModalRows.reduce((sum, r) => sum + (r.calories || 0), 0))} kcal</span>
                  </div>
                </div>
              )}

              {addModalError && (
                <div style={{ background: '#ffebee', color: '#c62828', padding: '10px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 600 }}>
                  {addModalError}
                </div>
              )}
            </div>

            <div className="fa-modal-footer">
              {addModalStep === 'input' ? (
                <>
                  <button
                    className="fa-ing-cancel-btn"
                    style={{ borderRadius: '10px', padding: '10px 18px' }}
                    onClick={() => setShowAddModal(false)}
                    disabled={addModalVerifying}
                  >
                    Cancel
                  </button>
                  <button
                    className="fa-ing-add-btn"
                    style={{ borderRadius: '10px', padding: '10px 18px', background: '#2d5016', color: '#c9d84a', display: 'flex', alignItems: 'center', gap: '8px' }}
                    onClick={handleAddModalCalculate}
                    disabled={addModalVerifying}
                  >
                    {addModalVerifying ? (
                      <>
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="2" strokeDasharray="16" fill="none"/>
                        </svg>
                        Calculating...
                      </>
                    ) : 'Calculate Calories'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="fa-ing-cancel-btn"
                    style={{ borderRadius: '10px', padding: '10px 18px' }}
                    onClick={() => setAddModalStep('input')}
                  >
                    Back to Edit
                  </button>
                  <button
                    className="fa-ing-add-btn"
                    style={{ borderRadius: '10px', padding: '10px 18px', background: '#2d5016', color: '#c9d84a' }}
                    onClick={() => setShowConfirmDialog(true)}
                  >
                    Add
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Are You Sure Dialog */}
      {showConfirmDialog && (
        <div className="fa-modal-overlay" style={{ zIndex: 1100 }}>
          <div className="fa-modal" style={{ maxWidth: '400px', width: '90%', padding: '24px', textAlign: 'center', gap: '16px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f0f7eb', color: '#2d5016', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1a2e08', marginBottom: '8px' }}>Are you sure?</h3>
              <p style={{ fontSize: '13px', color: '#4b5563', lineHeight: 1.5 }}>
                Do you want to add these {addModalRows.length} ingredients to your meal profile and update the recipes macros?
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '8px' }}>
              <button
                className="fa-ing-cancel-btn"
                style={{ borderRadius: '10px', padding: '10px 18px', flex: 1 }}
                onClick={() => setShowConfirmDialog(false)}
              >
                No, cancel
              </button>
              <button
                className="fa-ing-add-btn"
                style={{ borderRadius: '10px', padding: '10px 18px', background: '#2d5016', color: '#c9d84a', flex: 1 }}
                onClick={handleAddModalSave}
              >
                Yes, add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}