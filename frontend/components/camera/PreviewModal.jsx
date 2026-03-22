import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { detectImageBlur } from '../../utils/imageQuality'
import ImageQualityWarningModal from './ImageQualityWarningModal'

export default function PreviewModal({ preview, onRetake, onSubmit, isSubmitting }) {
	const [isBlurry, setIsBlurry] = useState(false)
	const [isCheckingQuality, setIsCheckingQuality] = useState(false)
	const overlayRef = useRef(null)
	const modalRef = useRef(null)
	const imageRef = useRef(null)
	const buttonsRef = useRef([])

	// Detect image quality on mount
	useEffect(() => {
		if (!preview) {
			setIsBlurry(false)
			return
		}

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

	const handleIgnoreWarning = () => {
		setIsBlurry(false)
	}

	return (
		<>
			{/* Quality warning */}
			<ImageQualityWarningModal
				isBlurry={isBlurry}
				onRetake={handleRetakeFromWarning}
				onIgnore={handleIgnoreWarning}
			/>

			{/* Preview modal (hidden if blurry warning is shown) */}
			{!isBlurry && (
				<div
					ref={overlayRef}
					onClick={(e) => e.target === e.currentTarget && closeModal()}
					className="fixed inset-0 z-[650] flex items-center justify-center bg-white/75 p-4 backdrop-blur-xl"
				>
					<div
						ref={modalRef}
						onClick={(e) => e.stopPropagation()}
						className="w-full max-w-[420px] rounded-[22px] border-[1.5px] border-[#e8e8e8] bg-[var(--surface-card)] p-[28px] text-center"
					>
						<h2 className="text-[20px] font-semibold text-[var(--brand-primary)] font-[var(--font-heading)]">
							Review Your Image
						</h2>

						{isCheckingQuality && (
							<div className="mt-4 text-xs text-[#999]">Checking image quality...</div>
						)}

						<img
							ref={imageRef}
							src={preview.src}
							alt="Preview"
							className="mt-4 h-64 w-full rounded-[13px] border border-[#e8e8e8] object-cover"
						/>

						<p className="mt-3 text-xs text-[#999]">{preview.fileName}</p>

						<div className="mt-6 flex gap-3">
							<button
								ref={(el) => (buttonsRef.current[0] = el)}
								onClick={closeModal}
								disabled={isSubmitting || isCheckingQuality}
								onMouseEnter={(e) => (!isSubmitting && !isCheckingQuality) && gsap.to(e.target, { scale: 1.06, duration: 0.18 })}
								onMouseLeave={(e) => (!isSubmitting && !isCheckingQuality) && gsap.to(e.target, { scale: 1, duration: 0.18 })}
								className="flex-1 cursor-none rounded-full border-[1.5px] border-[#e8e8e8] bg-transparent px-4 py-2 text-xs uppercase tracking-[0.1em] text-[#aaa] hover:border-[#ff6b6b] hover:text-[#ff6b6b] transition-colors disabled:opacity-50"
							>
								Retake
							</button>

							<button
								ref={(el) => (buttonsRef.current[1] = el)}
								onClick={onSubmit}
								disabled={isSubmitting || isCheckingQuality}
								onMouseEnter={(e) => (!isSubmitting && !isCheckingQuality) && gsap.to(e.target, { scale: 1.06, duration: 0.18 })}
								onMouseLeave={(e) => (!isSubmitting && !isCheckingQuality) && gsap.to(e.target, { scale: 1, duration: 0.18 })}
								className="flex-1 cursor-none rounded-full border-[1.5px] border-[var(--brand-secondary)] bg-[var(--brand-secondary)] px-4 py-2 text-xs uppercase tracking-[0.1em] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
							>
								{isCheckingQuality ? 'Checking...' : isSubmitting ? 'Analyzing...' : 'Submit'}
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	)
}
