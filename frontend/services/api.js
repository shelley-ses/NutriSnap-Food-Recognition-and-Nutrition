const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

async function parseErrorResponse(response) {
	const fallbackMessage = `Request failed (${response.status})`

	try {
		const errorData = await response.json()
		return errorData.detail || errorData.error || fallbackMessage
	} catch {
		return fallbackMessage
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
