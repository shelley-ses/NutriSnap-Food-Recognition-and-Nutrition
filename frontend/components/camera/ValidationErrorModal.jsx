import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

export default function ValidationErrorModal({ error, onClose }) {
	const overlayRef = useRef(null)
	const modalRef = useRef(null)
	const errorIconRef = useRef(null)

	useEffect(() => {
		if (!error) return

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

			// Shake error icon
			gsap.fromTo(
				errorIconRef.current,
				{ scale: 0.8, opacity: 0 },
				{ scale: 1, opacity: 1, duration: 0.3, delay: 0.2, ease: 'back.out(1.2)' },
			)

			gsap.to(errorIconRef.current, {
				x: -6,
				duration: 0.08,
				repeat: 4,
				yoyo: true,
				ease: 'power2.inOut',
				delay: 0.3,
			})
		}, overlayRef)

		return () => ctx.revert()
	}, [error])

	if (!error) return null

	const handleClose = () => {
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

	return (
		<div
			ref={overlayRef}
			onClick={(e) => e.target === e.currentTarget && handleClose()}
			className="fixed inset-0 z-[700] flex items-center justify-center bg-white/75 p-4 backdrop-blur-xl"
		>
			<div
				ref={modalRef}
				onClick={(e) => e.stopPropagation()}
				className="w-full max-w-[400px] rounded-[22px] border-[1.5px] border-[#ffcccc] bg-[#fff5f5] p-[32px] text-center"
			>
				<div ref={errorIconRef} className="mb-4 text-5xl">
					⚠️
				</div>

				<h3 className="text-[20px] font-semibold text-[#ff6b6b] font-[var(--font-heading)]">
					Invalid File
				</h3>

				<p className="mt-3 text-xs leading-relaxed text-[#333] whitespace-pre-wrap">{error}</p>

				<button
					onClick={handleClose}
					onMouseEnter={(e) => gsap.to(e.target, { scale: 1.06, duration: 0.18 })}
					onMouseLeave={(e) => gsap.to(e.target, { scale: 1, duration: 0.18 })}
					className="mt-6 cursor-none rounded-full border-[1.5px] border-[#ff6b6b] bg-transparent px-6 py-2 text-xs uppercase tracking-[0.1em] text-[#ff6b6b] hover:bg-[#ff6b6b]/10 transition-colors"
				>
					Try Again
				</button>
			</div>
		</div>
	)
}
