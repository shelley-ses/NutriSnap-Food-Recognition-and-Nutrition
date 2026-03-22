import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

export default function ImageAnalysis({ preview, onClose }) {
	const overlayRef = useRef(null)
	const modalRef = useRef(null)
	const imageRef = useRef(null)
	const loadingSkeletonRef = useRef(null)
	const insightBoxesRef = useRef([])
	const closeButtonRef = useRef(null)
	const errorContainerRef = useRef(null)
	const isClosingRef = useRef(false)

	// Main modal entrance and insights animation
	useEffect(() => {
		if (!preview) {
			return undefined
		}

		isClosingRef.current = false

		const ctx = gsap.context(() => {
			// Overlay fade-in
			gsap.fromTo(
				overlayRef.current,
				{ opacity: 0 },
				{ opacity: 1, duration: 0.24, ease: 'power2.out' },
			)

			// Modal pop entrance
			gsap.fromTo(
				modalRef.current,
				{ opacity: 0, y: 24, scale: 0.9 },
				{ opacity: 1, y: 0, scale: 1, duration: 0.42, ease: 'back.out(1.5)' },
			)

			// Loading skeleton pulse animation
			if (loadingSkeletonRef.current && (!preview.gemini && !preview.clarifai)) {
				gsap.fromTo(
					loadingSkeletonRef.current,
					{ opacity: 0 },
					{ opacity: 1, duration: 0.3, delay: 0.15 },
				)

				gsap.to(loadingSkeletonRef.current, {
					opacity: 0.5,
					duration: 1.2,
					repeat: -1,
					yoyo: true,
					ease: 'sine.inOut',
				})
			}

			// Image fade-in
			gsap.fromTo(
				imageRef.current,
				{ opacity: 0, y: 10 },
				{ opacity: 1, y: 0, duration: 0.3, delay: 0.1, ease: 'power2.out' },
			)

			// Close button entrance
			gsap.fromTo(
				closeButtonRef.current,
				{ opacity: 0, scale: 0.9 },
				{ opacity: 1, scale: 1, duration: 0.3, delay: 0.2, ease: 'back.out(1.2)' },
			)

			// Animate insight boxes with stagger when they appear
			if (insightBoxesRef.current.length > 0) {
				gsap.fromTo(
					insightBoxesRef.current,
					{ opacity: 0, x: -12 },
					{
						opacity: 1,
						x: 0,
						duration: 0.4,
						stagger: 0.12,
						delay: 0.25,
						ease: 'power2.out',
					},
				)
			}
		}, overlayRef)

		return () => ctx.revert()
	}, [preview])

	// Handle insight box hover animations
	const handleInsightMouseEnter = (index) => {
		if (insightBoxesRef.current[index]) {
			gsap.to(insightBoxesRef.current[index], {
				scale: 1.02,
				boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
				duration: 0.2,
				ease: 'power2.out',
			})
		}
	}

	const handleInsightMouseLeave = (index) => {
		if (insightBoxesRef.current[index]) {
			gsap.to(insightBoxesRef.current[index], {
				scale: 1,
				boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
				duration: 0.2,
				ease: 'power2.out',
			})
		}
	}

	// Handle image hover animations
	const handleImageMouseEnter = () => {
		if (imageRef.current) {
			gsap.to(imageRef.current, {
				scale: 1.06,
				filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.15))',
				duration: 0.22,
				ease: 'power2.out',
			})
		}
	}

	const handleImageMouseLeave = () => {
		if (imageRef.current) {
			gsap.to(imageRef.current, {
				scale: 1,
				filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.08))',
				duration: 0.22,
				ease: 'power2.out',
			})
		}
	}

	// Animate error state with shake effect
	const animateError = (errorElement) => {
		if (!errorElement) return

		gsap.fromTo(
			errorElement,
			{ opacity: 0, x: -20 },
			{ opacity: 1, x: 0, duration: 0.3, ease: 'back.out(1.2)' },
		)

		gsap.to(errorElement, {
			x: -8,
			duration: 0.1,
			repeat: 3,
			yoyo: true,
			ease: 'power2.inOut',
			delay: 0.3,
		})
	}

	// Set up error animation when component mounts with error
	useEffect(() => {
		if (errorContainerRef.current && preview && (preview.error || (preview.gemini?.error || preview.clarifai?.error))) {
			animateError(errorContainerRef.current)
		}
	}, [preview?.error])

	const closeModal = () => {
		if (isClosingRef.current) {
			return
		}

		isClosingRef.current = true
		const timeline = gsap.timeline({ onComplete: onClose })

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

	if (!preview) {
		return null
	}

	const geminiText =
		preview.gemini === null || preview.gemini === undefined
			? null
			: typeof preview.gemini === 'string'
				? preview.gemini
				: JSON.stringify(preview.gemini, null, 2)

	const clarifaiText =
		preview.clarifai === null || preview.clarifai === undefined
			? null
			: typeof preview.clarifai === 'string'
				? preview.clarifai
				: JSON.stringify(preview.clarifai, null, 2)

	// Determine if still loading
	const isLoading = !geminiText && !clarifaiText

	return (
		<div
			ref={overlayRef}
			onClick={(event) => {
				if (event.target === event.currentTarget) {
					closeModal()
				}
			}}
			className="fixed inset-0 z-[600] flex items-center justify-center overflow-y-auto bg-white/75 p-4 backdrop-blur-xl"
		>
			<div
				ref={modalRef}
				onClick={(event) => event.stopPropagation()}
				className="w-full max-w-[440px] max-h-[88vh] overflow-y-auto rounded-[22px] border-[1.5px] border-[#e8e8e8] bg-[var(--surface-card)] p-[26px] text-center shadow-[0_20px_60px_rgba(0,0,0,0.1)]"
			>
				{/* Image or Loading Skeleton */}
				<div className="relative mb-4">
					{isLoading ? (
						<div
							ref={loadingSkeletonRef}
							className="h-60 w-full rounded-[13px] border border-[#e8e8e8] bg-gradient-to-r from-[#f0f0f0] via-[#e0e0e0] to-[#f0f0f0] bg-[length:200%_100%] opacity-0"
							style={{
								animation: 'shimmer 2s infinite',
							}}
						/>
					) : (
						<img
							ref={imageRef}
							src={preview.src}
							alt={preview.title}
							className="h-60 w-full rounded-[13px] border border-[#e8e8e8] object-cover cursor-pointer transition-all"
							onMouseEnter={handleImageMouseEnter}
							onMouseLeave={handleImageMouseLeave}
							style={{
								filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.08))',
							}}
						/>
					)}
				</div>

				<h3 className="text-center text-[26px] tracking-[0.05em] text-[var(--brand-primary)] font-[var(--font-heading)]">
					{preview.title}
				</h3>
				<p className="mt-1 text-center text-xs text-[#aaaaaa]">{preview.description}</p>

				{/* Loading indicator text */}
				{isLoading && (
					<div className="mt-4 text-xs text-[#999] animate-pulse">
						Analyzing with AI engines...
					</div>
				)}

				{/* Insights Container */}
				{(geminiText || clarifaiText) && (
					<div className="mt-5 max-h-[34vh] space-y-3 overflow-y-auto pr-1 text-left">
						{geminiText && (
							<div
								ref={(el) => {
									if (el) insightBoxesRef.current[0] = el
								}}
								onMouseEnter={() => handleInsightMouseEnter(0)}
								onMouseLeave={() => handleInsightMouseLeave(0)}
								className="rounded-lg border border-[#75b140]/40 bg-[#75b140]/8 p-4 cursor-pointer transition-all"
								style={{
									boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
								}}
							>
								<h4 className="mb-2 text-sm font-semibold text-[#75b140]">🌱 Gemini Insights</h4>
								<p className="text-xs leading-relaxed text-[#333] whitespace-pre-wrap">{geminiText}</p>
							</div>
						)}
						{clarifaiText && (
							<div
								ref={(el) => {
									if (el) insightBoxesRef.current[geminiText ? 1 : 0] = el
								}}
								onMouseEnter={() => handleInsightMouseEnter(geminiText ? 1 : 0)}
								onMouseLeave={() => handleInsightMouseLeave(geminiText ? 1 : 0)}
								className="rounded-lg border border-[#ff9f45]/40 bg-[#ff9f45]/8 p-4 cursor-pointer transition-all"
								style={{
									boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
								}}
							>
								<h4 className="mb-2 text-sm font-semibold text-[#ff9f45]">🍽️ Clarifai Detected</h4>
								<p className="text-xs leading-relaxed text-[#333] whitespace-pre-wrap">{clarifaiText}</p>
							</div>
						)}
					</div>
				)}

				{/* Error State */}
				{preview.error && (
					<div
						ref={errorContainerRef}
						className="mt-4 rounded-lg border border-[#ff6b6b]/40 bg-[#ff6b6b]/8 p-4 text-left"
					>
						<h4 className="mb-2 text-sm font-semibold text-[#ff6b6b]">⚠️ Analysis Error</h4>
						<p className="text-xs leading-relaxed text-[#333]">{preview.error}</p>
					</div>
				)}

				<div className="mt-[18px] flex justify-center">
					<button
						ref={closeButtonRef}
						type="button"
						onClick={closeModal}
						onMouseEnter={() => gsap.to(closeButtonRef.current, { scale: 1.06, duration: 0.18 })}
						onMouseLeave={() => gsap.to(closeButtonRef.current, { scale: 1, duration: 0.18 })}
						className="cursor-none rounded-full border-[1.5px] border-[#e8e8e8] bg-transparent px-6 py-2 text-xs uppercase tracking-[0.1em] text-[#aaaaaa] hover:border-[var(--brand-secondary)] hover:text-[var(--brand-secondary)] transition-colors"
					>
						Close
					</button>
				</div>
			</div>

			<style>{`
				@keyframes shimmer {
					0% {
						background-position: -200% 0;
					}
					100% {
						background-position: 200% 0;
					}
				}
			`}</style>
		</div>
	)
}


