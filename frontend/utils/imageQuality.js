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

/**
 * Compresses and resizes an image file.
 * @param {File} file - The original image file.
 * @param {number} maxWidth - Maximum allowed width.
 * @param {number} maxHeight - Maximum allowed height.
 * @param {number} quality - Quality level (0.0 to 1.0).
 * @returns {Promise<File>} - A promise that resolves to the compressed File object.
 */
export function compressImage(file, maxWidth = 1024, maxHeight = 1024, quality = 0.75) {
	return new Promise((resolve) => {
		const reader = new FileReader()
		reader.readAsDataURL(file)
		reader.onload = (event) => {
			const img = new Image()
			img.src = event.target?.result
			img.onload = () => {
				const canvas = document.createElement('canvas')
				let width = img.width
				let height = img.height

				if (width > height) {
					if (width > maxWidth) {
						height = Math.round((height * maxWidth) / width)
						width = maxWidth
					}
				} else {
					if (height > maxHeight) {
						width = Math.round((width * maxHeight) / height)
						height = maxHeight
					}
				}

				canvas.width = width
				canvas.height = height

				const ctx = canvas.getContext('2d')
				if (!ctx) {
					resolve(file)
					return
				}

				ctx.drawImage(img, 0, 0, width, height)

				canvas.toBlob(
					(blob) => {
						if (!blob) {
							resolve(file)
							return
						}
						const compressedFile = new File([blob], file.name, {
							type: 'image/jpeg',
							lastModified: Date.now(),
						})
						resolve(compressedFile)
					},
					'image/jpeg',
					quality
				)
			}
			img.onerror = () => resolve(file)
		}
		reader.onerror = () => resolve(file)
	})
}

