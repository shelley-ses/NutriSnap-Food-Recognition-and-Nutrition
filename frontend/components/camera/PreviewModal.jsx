import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { detectImageBlur } from '../../utils/imageQuality'
import ValidationModals from './ValidationModals'

export default function PreviewModal({ preview, onRetake, onSubmit, isSubmitting, onValidationFailed }) {
	const [isBlurry, setIsBlurry] = useState(false)
	const [isCheckingQuality, setIsCheckingQuality] = useState(false)
	const overlayRef = useRef(null)
	const modalRef = useRef(null)
	const imageRef = useRef(null)
	const buttonsRef = useRef([])

	// Detect image quality on mount
	useEffect(() => {
		if (!preview) return

		const checkQuality = async () => {
			setIsCheckingQuality(true)
			const result = await detectImageBlur(preview.src)
			setIsBlurry(result.isBlurry)
			setIsCheckingQuality(false)
		}

		checkQuality()
	}, [preview])

	useEffect(() => {
		if (!preview || isBlurry) return

		const ctx = gsap.context(() => {
			gsap.fromTo(
				overlayRef.current,
				{ opacity: 0 },
				{ opacity: 1, duration: 0.24, ease: 'power2.out' },
			)

			gsap.fromTo(
				modalRef.current,
				{ opacity: 0, y: 24, scale: 0.9 },
				{ opacity: 1, y: 0, scale: 1, duration: 0.42, ease: 'back.out(1.5)' },
			)

			gsap.fromTo(
				imageRef.current,
				{ opacity: 0, y: 10 },
				{ opacity: 1, y: 0, duration: 0.3, delay: 0.15, ease: 'power2.out' },
			)

			// Buttons entrance
			if (buttonsRef.current[0] && buttonsRef.current[1]) {
				gsap.fromTo(
					buttonsRef.current,
					{ opacity: 0, scale: 0.9 },
					{
						opacity: 1,
						scale: 1,
						duration: 0.3,
						stagger: 0.12,
						delay: 0.25,
						ease: 'back.out(1.2)',
					},
				)
			}
		}, overlayRef)

		return () => ctx.revert()
	}, [preview, isBlurry])

	if (!preview) return null

	const closeModal = () => {
		const timeline = gsap.timeline({ onComplete: onRetake })

		timeline
			.to(modalRef.current, {
				y: 18,
				scale: 0.92,
				opacity: 0,
				duration: 0.22,
				ease: 'power2.in',
			})
			.to(
				overlayRef.current,
				{
					opacity: 0,
					duration: 0.18,
					ease: 'power2.inOut',
				},
				'-=0.12',
			)
	}

	const handleRetakeFromWarning = () => {
		setIsBlurry(false)
		onRetake()
	}

	const handleCancelFromWarning = () => {
		setIsBlurry(false)
		onValidationFailed('Image validation failed: the image appears blurry. Please retake a clearer photo before submitting.')
		onRetake()
	}

	return (
		<>
			{/* Quality warning */}
			<ValidationModals
				isBlurry={isBlurry}
				onRetake={handleRetakeFromWarning}
				onCancel={handleCancelFromWarning}
			/>

			{/* Preview modal (hidden if blurry warning is shown) */}
			{!isBlurry && (
				<div
					ref={overlayRef}
					onClick={(e) => e.target === e.currentTarget && closeModal()}
					className="fixed inset-0 z-[650] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
				>
					<div
						ref={modalRef}
						onClick={(e) => e.stopPropagation()}
						className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col items-center"
					>
						<h2 className="mt-1 text-[20px] font-semibold text-[var(--brand-primary)] font-[var(--font-heading)]">
							Review Your Image
						</h2>

						{isCheckingQuality && (
							<div className="mt-2 text-xs text-[#999]">Checking image quality...</div>
						)}

						<img
							ref={imageRef}
							src={preview.src}
							alt="Preview"
							className="mt-3 h-[26rem] w-full rounded-xl border border-gray-200 object-cover"
						/>

						<p className="mt-2 text-xs text-[#999]">{preview.fileName}</p>

						<div className="mt-5 flex w-full justify-center gap-4">
							<button
								ref={(el) => (buttonsRef.current[0] = el)}
								onClick={closeModal}
								disabled={isSubmitting || isCheckingQuality}
								onMouseEnter={(e) => (!isSubmitting && !isCheckingQuality) && gsap.to(e.target, { scale: 1.06, duration: 0.18 })}
								onMouseLeave={(e) => (!isSubmitting && !isCheckingQuality) && gsap.to(e.target, { scale: 1, duration: 0.18 })}
								className="flex-1 py-3 px-6 bg-gray-300 text-gray-800 rounded-full text-md font-medium hover:bg-gray-400 transition disabled:opacity-50"
							>
								Retake
							</button>

							<button
								ref={(el) => (buttonsRef.current[1] = el)}
								onClick={onSubmit}
								disabled={isSubmitting || isCheckingQuality}
								onMouseEnter={(e) => (!isSubmitting && !isCheckingQuality) && gsap.to(e.target, { scale: 1.06, duration: 0.18 })}
								onMouseLeave={(e) => (!isSubmitting && !isCheckingQuality) && gsap.to(e.target, { scale: 1, duration: 0.18 })}
								className="flex-1 py-3 px-6 bg-orange-400 text-white rounded-full text-md font-medium hover:bg-orange-500 transition disabled:opacity-50"
							>
								{isCheckingQuality ? 'Checking...' : 'Submit'}
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	)
}
