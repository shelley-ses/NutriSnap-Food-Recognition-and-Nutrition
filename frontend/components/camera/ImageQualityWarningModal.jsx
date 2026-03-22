import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

export default function ImageQualityWarningModal({ isBlurry, onRetake, onIgnore }) {
	const overlayRef = useRef(null)
	const modalRef = useRef(null)
	const warningIconRef = useRef(null)

	useEffect(() => {
		if (!isBlurry) return

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

			// Warning icon animation
			gsap.fromTo(
				warningIconRef.current,
				{ scale: 0.7, opacity: 0 },
				{ scale: 1, opacity: 1, duration: 0.4, delay: 0.2, ease: 'back.out(1.2)' },
			)

			// Pulse effect
			gsap.to(warningIconRef.current, {
				scale: [1, 1.15, 1],
				duration: 2,
				repeat: -1,
				ease: 'sine.inOut',
				delay: 0.5,
			})
		}, overlayRef)

		return () => ctx.revert()
	}, [isBlurry])

	if (!isBlurry) return null

	const closeModal = (callback) => {
		const timeline = gsap.timeline({ onComplete: callback })

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

	return (
		<div
			ref={overlayRef}
			onClick={(e) => e.target === e.currentTarget && closeModal(onRetake)}
			className="fixed inset-0 z-[700] flex items-center justify-center bg-white/75 p-4 backdrop-blur-xl"
		>
			<div
				ref={modalRef}
				onClick={(e) => e.stopPropagation()}
				className="w-full max-w-[400px] rounded-[22px] border-[1.5px] border-[#ffd700]/40 bg-gradient-to-b from-[#fffef0] to-[#fff9e6] p-[32px] text-center"
			>
				<div ref={warningIconRef} className="mb-4 text-6xl">
					⚠️
				</div>

				<h3 className="text-[20px] font-semibold text-[#ff9f45] font-[var(--font-heading)]">
					Image Might Be Blurry
				</h3>

				<p className="mt-3 text-xs leading-relaxed text-[#333]">
					We detected that this image might be blurry or unclear. This could affect the accuracy of the nutrition analysis.
				</p>

				<p className="mt-2 text-[11px] text-[#999] italic">
					Consider retaking the photo for better results.
				</p>

				<div className="mt-6 flex gap-3">
					<button
						onClick={() => closeModal(onRetake)}
						onMouseEnter={(e) => gsap.to(e.target, { scale: 1.06, duration: 0.18 })}
						onMouseLeave={(e) => gsap.to(e.target, { scale: 1, duration: 0.18 })}
						className="flex-1 cursor-none rounded-full border-[1.5px] border-[#ff9f45] bg-[#ff9f45] px-4 py-2 text-xs uppercase tracking-[0.1em] text-white hover:opacity-90 transition-opacity"
					>
						Retake
					</button>

					<button
						onClick={() => closeModal(onIgnore)}
						onMouseEnter={(e) => gsap.to(e.target, { scale: 1.06, duration: 0.18 })}
						onMouseLeave={(e) => gsap.to(e.target, { scale: 1, duration: 0.18 })}
						className="flex-1 cursor-none rounded-full border-[1.5px] border-[#e8e8e8] bg-transparent px-4 py-2 text-xs uppercase tracking-[0.1em] text-[#999] hover:border-[#ff9f45] hover:text-[#ff9f45] transition-colors"
					>
						Continue Anyway
					</button>
				</div>
			</div>
		</div>
	)
}
