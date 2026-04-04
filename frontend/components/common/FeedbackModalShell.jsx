import { useEffect } from 'react'
import { gsap } from 'gsap'

export default function FeedbackModalShell({
	isOpen,
	overlayRef,
	modalRef,
	onBackdropClick,
	children,
	iconRef,
	animationType = 'shake',
	overlayClassName = 'fixed inset-0 z-[700] flex items-center justify-center bg-white/75 p-4 backdrop-blur-xl',
	modalClassName = '',
	maxWidthClass = 'max-w-[460px]',
	closeButtonRef,
}) {
	useEffect(() => {
		if (!isOpen) return

		const ctx = gsap.context(() => {
			// Overlay fade in
			gsap.fromTo(
				overlayRef.current,
				{ opacity: 0 },
				{ opacity: 1, duration: 0.24, ease: 'power2.out' },
			)

			// Modal entrance
			gsap.fromTo(
				modalRef.current,
				{ opacity: 0, y: 24, scale: 0.9 },
				{ opacity: 1, y: 0, scale: 1, duration: 0.42, ease: 'back.out(1.5)' },
			)

			// Icon animation
			if (iconRef?.current) {
				if (animationType === 'pulse') {
					// Pulse effect for blurry warning
					gsap.fromTo(
						iconRef.current,
						{ scale: 0.7, opacity: 0 },
						{ scale: 1, opacity: 1, duration: 0.4, delay: 0.2, ease: 'back.out(1.2)' },
					)

					gsap.to(iconRef.current, {
						scale: [1, 1.15, 1],
						duration: 2,
						repeat: -1,
						ease: 'sine.inOut',
						delay: 0.5,
					})
				} else {
					// Shake effect for error
					gsap.fromTo(
						iconRef.current,
						{ scale: 0.8, opacity: 0 },
						{ scale: 1, opacity: 1, duration: 0.3, delay: 0.2, ease: 'back.out(1.2)' },
					)

					gsap.to(iconRef.current, {
						x: -6,
						duration: 0.08,
						repeat: 4,
						yoyo: true,
						ease: 'power2.inOut',
						delay: 0.3,
					})
				}
			}
		}, overlayRef)

		return () => ctx.revert()
	}, [isOpen, animationType, iconRef, overlayRef, modalRef])

	if (!isOpen) return null

	return (
		<div
			ref={overlayRef}
			onClick={(e) => e.target === e.currentTarget && onBackdropClick?.()}
			className={overlayClassName}
		>
			<div
				ref={modalRef}
				onClick={(e) => e.stopPropagation()}
				className={`relative w-full flex flex-col gap-5 ${maxWidthClass} rounded-[22px] p-8 text-center ${modalClassName}`}
			>
				{closeButtonRef && (
					<button
						ref={closeButtonRef}
						onClick={onBackdropClick}
						className="absolute -top-3 -right-3 h-9 w-9 rounded-full bg-white shadow-md hover:shadow-xl transition-shadow cursor-pointer border border-gray-200 text-gray-600 text-xl leading-none flex items-center justify-center"
						aria-label="Close"
					>
						<span aria-hidden="true">&times;</span>
					</button>
				)}
				{children}
			</div>
		</div>
	)
}