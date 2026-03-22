/**
 * Detects if an image is blurry using Laplacian variance method
 * Returns { isBlurry: boolean, sharpness: number }
 */
export function detectImageBlur(imageSrc) {
	return new Promise((resolve) => {
		const img = new Image()
		img.onload = () => {
			try {
				const canvas = document.createElement('canvas')
				canvas.width = img.width
				canvas.height = img.height
				const ctx = canvas.getContext('2d')

				ctx.drawImage(img, 0, 0)
				const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
				const data = imageData.data

				// Convert to grayscale
				const gray = []
				for (let i = 0; i < data.length; i += 4) {
					const r = data[i]
					const g = data[i + 1]
					const b = data[i + 2]
					gray.push(0.299 * r + 0.587 * g + 0.114 * b)
				}

				// Apply Laplacian filter for edge detection
				const width = canvas.width
				const height = canvas.height
				let laplacianSum = 0
				let count = 0

				for (let y = 1; y < height - 1; y++) {
					for (let x = 1; x < width - 1; x++) {
						const idx = y * width + x

						const laplacian =
							-1 * gray[idx - width - 1] +
							-1 * gray[idx - width] +
							-1 * gray[idx - width + 1] +
							-1 * gray[idx - 1] +
							8 * gray[idx] +
							-1 * gray[idx + 1] +
							-1 * gray[idx + width - 1] +
							-1 * gray[idx + width] +
							-1 * gray[idx + width + 1]

						laplacianSum += laplacian * laplacian
						count++
					}
				}

				const variance = laplacianSum / count

				// Threshold: lower variance = blurrier
				// Threshold of ~500 works well for most images
				const sharpness = Math.min(Math.round(variance), 10000)
				const threshold = 150
				const isBlurry = variance < threshold

				resolve({
					isBlurry,
					sharpness,
					variance,
				})
			} catch (error) {
				console.error('Error detecting blur:', error)
				// If detection fails, assume it's okay (conservative approach)
				resolve({ isBlurry: false, sharpness: 500, variance: 500 })
			}
		}

		img.onerror = () => {
			resolve({ isBlurry: false, sharpness: 500, variance: 500 })
		}

		img.crossOrigin = 'anonymous'
		img.src = imageSrc
	})
}
