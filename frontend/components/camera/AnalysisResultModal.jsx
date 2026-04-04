import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

export default function AnalysisResultModal({ result, onAnalyzeAnother, onClose }) {
	const overlayRef = useRef(null)
	const modalRef = useRef(null)
	const imageRef = useRef(null)
	const contentRefs = useRef([])

	useEffect(() => {
		if (!result) return

		contentRefs.current = []

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

			if (contentRefs.current.length > 0) {
				gsap.fromTo(
					contentRefs.current,
					{ opacity: 0, y: 12 },
					{
						opacity: 1,
						y: 0,
						duration: 0.28,
						stagger: 0.1,
						delay: 0.2,
						ease: 'power2.out',
					},
				)
			}
		}, overlayRef)

		return () => ctx.revert()
	}, [result])

	if (!result) return null

	const closeModal = () => {
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

	const setContentRef = (index) => (el) => {
		if (el) {
			contentRefs.current[index] = el
		}
	}

	return (
		<div
			ref={overlayRef}
			onClick={(e) => e.target === e.currentTarget && closeModal()}
			className="fixed inset-0 z-[650] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
		>
			<div
				ref={modalRef}
				onClick={(e) => e.stopPropagation()}
				className="bg-white p-7 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col items-center"
			>
				<h2 className="mt-1 text-[20px] font-semibold text-[var(--brand-primary)] font-[var(--font-heading)]">
					{result.title || 'Analysis Complete'}
				</h2>

				<div ref={imageRef} className="mt-4 w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
					{result.src ? (
						<img
							src={result.src}
							alt={result.description || 'Analyzed image'}
							className="h-[24rem] w-full object-cover"
						/>
					) : (
						<div className="flex h-[24rem] items-center justify-center text-sm text-gray-500">
							No preview available
						</div>
					)}
				</div>

				<p ref={setContentRef(0)} className="mt-3 text-sm font-medium text-gray-800">
					{result.description}
				</p>

				<div ref={setContentRef(1)} className="mt-4 w-full rounded-xl border border-gray-200 bg-gray-50 p-4 text-left">
					<p className="text-xs uppercase tracking-[0.12em] text-[var(--brand-primary)]">Gemini</p>
					<p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">
						{result.gemini || 'No Gemini insights returned.'}
					</p>
				</div>

				<div ref={setContentRef(2)} className="mt-3 w-full rounded-xl border border-gray-200 bg-gray-50 p-4 text-left">
					<p className="text-xs uppercase tracking-[0.12em] text-[var(--brand-secondary)]">Clarifai</p>
					<p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">
						{result.clarifai || 'No Clarifai details returned.'}
					</p>
				</div>

				<div className="mt-6 flex w-full justify-center gap-4">
					<button
						onClick={onAnalyzeAnother}
						className="flex-1 py-3 px-6 bg-gray-300 text-gray-800 rounded-full text-md font-medium hover:bg-gray-400 transition"
					>
						Analyze Another
					</button>

					<button
						onClick={closeModal}
						className="flex-1 py-3 px-6 bg-orange-400 text-white rounded-full text-md font-medium hover:bg-orange-500 transition"
					>
						Close
					</button>
				</div>
			</div>
		</div>
	)
}
