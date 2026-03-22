import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

export default function AnalyzingModal({ isOpen }) {
	const overlayRef = useRef(null)
	const modalRef = useRef(null)
	const visualRef = useRef(null)
	const phoneRef = useRef(null)
	const shutterRef = useRef(null)
	const flashRef = useRef(null)
	const foodRefs = useRef([])

	useEffect(() => {
		if (!isOpen) return
		foodRefs.current = []

		const ctx = gsap.context(() => {
			// Overlay fade
			gsap.fromTo(
				overlayRef.current,
				{ opacity: 0 },
				{ opacity: 1, duration: 0.3, ease: 'power2.out' },
			)

			// Modal entrance
			gsap.fromTo(
				modalRef.current,
				{ opacity: 0, scale: 0.85 },
				{ opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.3)' },
			)

			// Visual block entrance
			gsap.fromTo(
				visualRef.current,
				{ opacity: 0, scale: 0.9, y: 8 },
				{ opacity: 1, scale: 1, y: 0, duration: 0.6, ease: 'power3.out' },
			)

			gsap.to(phoneRef.current, {
				y: -8,
				rotation: -2,
				duration: 0.8,
				yoyo: true,
				repeat: -1,
				ease: 'sine.inOut',
			})

			const captureTimeline = gsap.timeline({ repeat: -1, repeatDelay: 0.35 })

			captureTimeline
				.to(shutterRef.current, {
					scale: 0.82,
					duration: 0.12,
					ease: 'power1.inOut',
				})
				.to(shutterRef.current, {
					scale: 1,
					duration: 0.18,
					ease: 'back.out(2)',
				})
				.fromTo(
					flashRef.current,
					{ opacity: 0, scale: 0.6 },
					{ opacity: 0.92, scale: 1.12, duration: 0.08, ease: 'power2.out' },
					'-=0.08',
				)
				.to(flashRef.current, {
					opacity: 0,
					scale: 1.4,
					duration: 0.22,
					ease: 'power2.out',
				})

			foodRefs.current.forEach((food, index) => {
				if (!food) return
				gsap.to(food, {
					y: index % 2 === 0 ? -7 : -4,
					scale: 1.08,
					duration: 0.5 + index * 0.03,
					yoyo: true,
					repeat: -1,
					ease: 'sine.inOut',
					delay: index * 0.05,
				})

				gsap.to(food, {
					rotation: index % 2 === 0 ? 12 : -12,
					duration: 0.65,
					yoyo: true,
					repeat: -1,
					ease: 'sine.inOut',
					delay: index * 0.04,
				})
			})
		}, overlayRef)

		return () => ctx.revert()
	}, [isOpen])

	if (!isOpen) return null

	return (
		<div
			ref={overlayRef}
			className="fixed inset-0 z-[750] flex items-center justify-center bg-black/30 backdrop-blur-sm"
		>
			<div
				ref={modalRef}
				className="relative w-full max-w-[360px] rounded-[24px] bg-gradient-to-b from-white to-white/95 p-[36px] text-center shadow-[0_20px_60px_rgba(0,0,0,0.15)]"
			>
				<div ref={visualRef} className="relative mb-5 mx-auto h-[220px] w-[220px]">
					<div className="absolute inset-0 rounded-full bg-gradient-to-br from-[var(--brand-primary)]/10 via-[var(--brand-secondary)]/8 to-[var(--brand-primary)]/5" />

					<div className="absolute left-1/2 top-[58%] h-[112px] w-[112px] -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-white shadow-[0_10px_28px_rgba(0,0,0,0.16)]">
						<div className="absolute inset-3 rounded-full border border-[var(--brand-primary)]/20 bg-[var(--brand-primary)]/5" />
						{['🍔', '🍟', '🥗', '🍓', '🍕'].map((food, index) => (
							<div
								key={`plate-food-${food}-${index}`}
								ref={(el) => {
									if (el) foodRefs.current[index] = el
								}}
								className="absolute left-1/2 top-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center text-[16px]"
								style={{
									transform: `translate(-50%, -50%) rotate(${index * 72}deg) translateY(-28px)`,
								}}
							>
								{food}
							</div>
						))}
					</div>

					<div
						ref={phoneRef}
						className="absolute left-1/2 top-[24%] h-[120px] w-[76px] -translate-x-1/2 -translate-y-1/2 rounded-[18px] border-4 border-[#2d3140] bg-[#1f2230] shadow-[0_14px_28px_rgba(0,0,0,0.3)]"
					>
						<div className="absolute left-1/2 top-3 h-1 w-8 -translate-x-1/2 rounded-full bg-white/35" />
						<div className="absolute inset-[9px] rounded-[10px] bg-gradient-to-b from-[#5b637a] to-[#2b3145]" />
						<div className="absolute right-3 top-4 h-4 w-4 rounded-full border-2 border-white/60 bg-[#87b7ff]/70" />
						<div
							ref={shutterRef}
							className="absolute bottom-4 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-white bg-white/90"
						/>
					</div>

					<div
						ref={flashRef}
						className="pointer-events-none absolute left-1/2 top-[24%] h-[140px] w-[140px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white opacity-0 blur-lg"
					/>
				</div>

				{/* Text */}
				<h3 className="text-[18px] font-semibold text-[var(--brand-primary)] font-[var(--font-heading)]">
					Capturing Your Meal
				</h3>

				<p className="mt-2 text-xs text-[#999] leading-relaxed">
					Snapping your food photo and preparing nutrition insights...
				</p>

				{/* Progress indicators */}
				<div className="mt-5 flex justify-center gap-2">
					{['Detecting', 'Processing', 'Analyzing'].map((label, i) => (
						<div key={i} className="text-center">
							<div
								className="h-1 w-6 rounded-full overflow-hidden bg-[#e8e8e8]"
								style={{
									backgroundImage:
										i === 0
											? `linear-gradient(90deg, #ff8f6b 0%, #ff8f6b ${33 + i * 22}%, #e8e8e8 ${33 + i * 22}%)`
											: i === 1
												? `linear-gradient(90deg, var(--brand-primary) 0%, var(--brand-primary) ${33 + i * 22}%, #e8e8e8 ${33 + i * 22}%)`
												: `linear-gradient(90deg, #7aa6ff 0%, #7aa6ff ${33 + i * 22}%, #e8e8e8 ${33 + i * 22}%)`,
									animation: `shimmer 2s ease-in-out infinite`,
									animationDelay: `${i * 0.2}s`,
								}}
							/>
							<p className="mt-0.5 text-[9px] text-[#ccc] uppercase tracking-[0.05em]">{label}</p>
						</div>
					))}
				</div>

				<style>{`
					@keyframes shimmer {
						0%, 100% { background-position: 0 0; }
						50% { background-position: 100px 0; }
					}
				`}</style>
			</div>
		</div>
	)
}
