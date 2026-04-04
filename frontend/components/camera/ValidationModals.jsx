import { useRef } from 'react'
import { gsap } from 'gsap'
import FeedbackModalShell from '../common/FeedbackModalShell'

export default function ValidationModals({ 
	error, 
	isBlurry,
	onClose, 
	onRetake,
	onCancel,
}) {
	const overlayRef = useRef(null)
	const modalRef = useRef(null)
	const iconRef = useRef(null)
	const closeButtonRef = useRef(null)

	// Determine validation type
	const isOpen = Boolean(error) || isBlurry
	const isBlurryValidation = isBlurry && !error

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

	const handleClose = () => closeModal(onClose)
	const handleRetakeClick = () => closeModal(onRetake)
	const handleCancelClick = () => closeModal(onCancel)

	if (!isOpen) return null

	// Render error modal (invalid file or wrong size)
	if (error) {
		return (
			<FeedbackModalShell
				isOpen={Boolean(error)}
				overlayRef={overlayRef}
				modalRef={modalRef}
				onBackdropClick={handleClose}
				iconRef={iconRef}
				animationType="shake"
				closeButtonRef={closeButtonRef}
				modalClassName="border-[1.5px] border-[#ffcccc] bg-[#fff5f5]"
			>
				<div ref={iconRef} className="text-5xl">
					⚠️
				</div>

				<div className="flex flex-col gap-2">
					<h3 className="text-[20px] font-[var(--font-heading)] text-[#ff6b6b]">
						Invalid File
					</h3>

					<p className="text-xs leading-relaxed text-[#333] whitespace-pre-wrap">{error}</p>
				</div>

				<button
					onClick={handleClose}
					onMouseEnter={(e) => gsap.to(e.target, { scale: 1.06, duration: 0.18 })}
					onMouseLeave={(e) => gsap.to(e.target, { scale: 1, duration: 0.18 })}
					className="cursor-pointer rounded-full border-[1.5px] border-[#ff6b6b] bg-transparent px-6 py-2 text-xs uppercase tracking-widest text-[#ff6b6b] hover:bg-[#ff6b6b]/10 transition-colors"
				>
					Try Again
				</button>
			</FeedbackModalShell>
		)
	}

	// Render blurry image warning modal
	if (isBlurryValidation) {
		return (
			<FeedbackModalShell
				isOpen={isBlurry}
				overlayRef={overlayRef}
				modalRef={modalRef}
				onBackdropClick={() => closeModal(onCancel)}
				iconRef={iconRef}
				animationType="pulse"
				closeButtonRef={closeButtonRef}
				modalClassName="border-[1.5px] border-[#ffd700]/40 bg-gradient-to-b from-[#fffef0] to-[#fff9e6]"
			>
				<div ref={iconRef} className="text-6xl">
					⚠️
				</div>

				<div className="flex flex-col gap-2">
					<h3 className="text-[20px] font-[var(--font-heading)] text-[#ff9f45]">
						Image Might Be Blurry
					</h3>

					<p className="text-xs leading-relaxed text-[#333]">
						We detected that this image might be blurry or unclear. This could affect the accuracy of the nutrition analysis.
					</p>

					<p className="text-[11px] text-[#999] italic">
						Consider retaking the photo for better results.
					</p>
				</div>

				<div className="flex gap-3">
					<button
						onClick={handleCancelClick}
						onMouseEnter={(e) => gsap.to(e.target, { scale: 1.06, duration: 0.18 })}
						onMouseLeave={(e) => gsap.to(e.target, { scale: 1, duration: 0.18 })}
						className="flex-1 cursor-pointer rounded-full border-[1.5px] border-[#e8e8e8] bg-transparent px-4 py-2 text-xs uppercase tracking-widest text-[#999] hover:border-[#ff9f45] hover:text-[#ff9f45] transition-colors"
					>
						Cancel
					</button>

					<button
						onClick={handleRetakeClick}
						onMouseEnter={(e) => gsap.to(e.target, { scale: 1.06, duration: 0.18 })}
						onMouseLeave={(e) => gsap.to(e.target, { scale: 1, duration: 0.18 })}
						className="flex-1 cursor-pointer rounded-full border-[1.5px] border-[#ff9f45] bg-[#ff9f45] px-4 py-2 text-xs uppercase tracking-widest text-white hover:opacity-90 transition-opacity"
					>
						Retake
					</button>
				</div>
			</FeedbackModalShell>
		)
	}

	return null
}
