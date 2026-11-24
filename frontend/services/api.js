const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

async function parseErrorResponse(response) {
	if (response.status === 429) {
		try {
			const errorData = await response.json()
			return errorData.detail || "Too many requests. Please slow down and try again later."
		} catch {
			return "Too many requests. Please slow down and try again later."
		}
	}

	const fallbackMessage = `Request failed (${response.status})`

	try {
		const errorData = await response.json()
		return errorData.detail || errorData.error || fallbackMessage
	} catch {
		return fallbackMessage
	}
}


async function requestJson(path, options = {}) {
	const response = await fetch(`${API_BASE_URL}${path}`, {
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json',
			...(options.headers || {}),
		},
		...options,
	})


	if (!response.ok) {
		return {
			ok: false,
			error: await parseErrorResponse(response),
			status: response.status,
		}
	}

	return {
		ok: true,
		data: await response.json(),
	}
}

export async function analyzeImage(file, useGemini = true) {
	let requestOptions
	if (typeof useGemini === 'boolean') {
		requestOptions = { useGemini }
	} else {
		requestOptions = useGemini ?? {}
	}

	const queryParams = new URLSearchParams()
	if (typeof requestOptions.useGemini === 'boolean') {
		queryParams.set('use_gemini', String(requestOptions.useGemini))
	}
	if (typeof requestOptions.useClarifai === 'boolean') {
		queryParams.set('use_clarifai', String(requestOptions.useClarifai))
	}

	const querySuffix = queryParams.toString()
	const endpoint = querySuffix ? `${API_BASE_URL}/camera/analyze?${querySuffix}` : `${API_BASE_URL}/camera/analyze`

	const formData = new FormData()
	formData.append('file', file)

	const response = await fetch(endpoint, {
		method: 'POST',
		credentials: 'include',
		body: formData,
	})

	if (!response.ok) {
		return {
			ok: false,
			error: await parseErrorResponse(response),
			status: response.status,
		}
	}

	return {
		ok: true,
		data: await response.json(),
	}
}

export async function guessNutritionWithSpoonacular(query) {
	const trimmedQuery = typeof query === 'string' ? query.trim() : ''
	if (!trimmedQuery) {
		return {
			ok: false,
			error: 'Query is required',
			status: 400,
		}
	}

	const endpoint = `${API_BASE_URL}/nutrition/guess?query=${encodeURIComponent(trimmedQuery)}`
	const response = await fetch(endpoint, {
		credentials: 'include',
	})

	if (!response.ok) {
		return {
			ok: false,
			error: await parseErrorResponse(response),
			status: response.status,
		}
	}

	return {
		ok: true,
		data: await response.json(),
	}
}

export async function getIngredientNutritionWithSpoonacular(ingredientName, amount, unit) {
	const trimmedQuery = typeof ingredientName === 'string' ? ingredientName.trim() : ''
	if (!trimmedQuery) {
		return {
			ok: false,
			error: 'Query is required',
			status: 400,
		}
	}

	const safeAmount = Number.isFinite(Number(amount)) && Number(amount) > 0 ? Number(amount) : 100
	const safeUnit = typeof unit === 'string' && unit.trim() ? unit.trim() : 'g'
	const endpoint = `${API_BASE_URL}/nutrition/ingredient?query=${encodeURIComponent(trimmedQuery)}&amount=${encodeURIComponent(safeAmount)}&unit=${encodeURIComponent(safeUnit)}`
	const response = await fetch(endpoint, {
		credentials: 'include',
	})

	if (!response.ok) {
		return {
			ok: false,
			error: await parseErrorResponse(response),
			status: response.status,
		}
	}

	return {
		ok: true,
		data: await response.json(),
	}
}

export async function verifyIngredientsBatch(ingredients) {
	const endpoint = `${API_BASE_URL}/nutrition/batch`
	const response = await fetch(endpoint, {
		method: 'POST',
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ ingredients }),
	})

	if (!response.ok) {
		return {
			ok: false,
			error: await parseErrorResponse(response),
			status: response.status,
		}
	}

	return {
		ok: true,
		data: await response.json(),
	}
}

export async function getMeals() {
	return requestJson('/meals')
}

export async function saveMeal(payload) {
	return requestJson('/meals', {
		method: 'POST',
		body: JSON.stringify(payload),
	})
}

export async function deleteMeal(mealId) {
	return requestJson(`/meals/${mealId}`, {
		method: 'DELETE',
	})
}

export async function updateMeal(mealId, payload) {
	return requestJson(`/meals/${mealId}`, {
		method: 'PUT',
		body: JSON.stringify(payload),
	})
}

export async function logoutUser() {
	return requestJson('/auth/logout', {
		method: 'POST',
	})
}

export async function getMe() {
	return requestJson('/auth/me')
}

export async function saveCalorieGoal(payload) {
	return requestJson('/calorie-goal', {
		method: 'POST',
		body: JSON.stringify(payload),
	})
}

export async function getCalorieGoal() {
	return requestJson('/calorie-goal/current')
}

export async function updateCalorieGoalManual(payload) {
	return requestJson('/calorie-goal/manual', {
		method: 'PATCH',
		body: JSON.stringify(payload),
	})
}

export async function changePassword(payload) {
	return requestJson('/auth/change-password', {
		method: 'POST',
		body: JSON.stringify(payload),
	})
}

