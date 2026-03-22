import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { applySubtleCardTilt, resetSubtleCardTilt } from '../common/motion'

function CameraOverlay({ isOpen, streamRef, onCapture, onClose }) {
	const overlayRef = useRef(null)
	const containerRef = useRef(null)
	const videoRef = useRef(null)
	const captureButtonRef = useRef(null)
	const cancelButtonRef = useRef(null)
	const helperTextRef = useRef(null)

	useEffect(() => {
		if (!isOpen || !videoRef.current || !streamRef.current) {
			return
		}

		videoRef.current.srcObject = streamRef.current
	}, [isOpen, streamRef])

	useEffect(() => {
		if (!isOpen) {
			return undefined
		}

		const ctx = gsap.context(() => {
			gsap.fromTo(
				overlayRef.current,
				{ opacity: 0 },
				{ opacity: 1, duration: 0.25, ease: 'power2.out' },
			)

			gsap.fromTo(
				containerRef.current,
				{ opacity: 0, y: 30, scale: 0.93 },
				{ opacity: 1, y: 0, scale: 1, duration: 0.42, ease: 'back.out(1.5)' },
			)

			gsap.fromTo(
				[captureButtonRef.current, cancelButtonRef.current, helperTextRef.current],
				{ opacity: 0, y: 10 },
				{ opacity: 1, y: 0, duration: 0.28, stagger: 0.07, delay: 0.12, ease: 'power2.out' },
			)

			gsap.to(captureButtonRef.current, {
				scale: 1.06,
				duration: 0.8,
				repeat: -1,
				yoyo: true,
				ease: 'sine.inOut',
			})
		}, overlayRef)

		return () => ctx.revert()
	}, [isOpen])

	if (!isOpen) {
		return null
	}

	return (
		<div
			ref={overlayRef}
			className="fixed inset-0 z-[500] flex flex-col items-center justify-center gap-5 bg-white/95 p-4 backdrop-blur-xl"
		>
			<div
				ref={containerRef}
				className="flex w-full max-w-lg flex-col items-center gap-5"
			>
				<video
					ref={videoRef}
					autoPlay
					playsInline
					className="aspect-video w-full rounded-[18px] border-2 border-[var(--brand-primary)] object-cover shadow-[0_0_40px_rgba(117,177,64,0.2)]"
				/>
				<div className="flex items-center gap-[14px]">
					<button
						ref={captureButtonRef}
						type="button"
						onClick={() => onCapture(videoRef.current)}
						onMouseEnter={() => gsap.to(captureButtonRef.current, { scale: 1.12, duration: 0.18 })}
						onMouseLeave={() => gsap.to(captureButtonRef.current, { scale: 1, duration: 0.2 })}
						className="cursor-none h-[60px] w-[60px] rounded-full border-4 border-white/50 bg-[var(--brand-primary)] shadow-[0_0_24px_rgba(117,177,64,0.3)]"
					>
						<span className="sr-only">Capture</span>
					</button>
					<button
						ref={cancelButtonRef}
						type="button"
						onClick={onClose}
						onMouseEnter={() => gsap.to(cancelButtonRef.current, { scale: 1.06, duration: 0.18 })}
						onMouseLeave={() => gsap.to(cancelButtonRef.current, { scale: 1, duration: 0.18 })}
						className="cursor-none rounded-full border border-[#e8e8e8] bg-transparent px-[22px] py-[10px] text-[13px] text-[#aaaaaa] hover:border-[var(--brand-danger)] hover:text-[var(--brand-danger)]"
					>
						Cancel
					</button>
				</div>
				<p
					ref={helperTextRef}
					className="text-center text-[11px] uppercase tracking-[0.2em] text-[#aaaaaa]"
				>
					Tap circle to capture
				</p>
			</div>
		</div>
	)
}

export default function CaptureFood({
	status,
	isCameraOpen,
	streamRef,
	onOpenCamera,
	onCloseCamera,
	onCapturePhoto,
}) {
	const cardRef = useRef(null)
	const stripeRef = useRef(null)
	const glareRef = useRef(null)
	const iconMotionRef = useRef(null)
	const iconRingRef = useRef(null)
	const spinRingRef = useRef(null)
	const titleRef = useRef(null)
	const buttonRef = useRef(null)
	const progressBarRef = useRef(null)
	const progressFillRef = useRef(null)
	const statusRef = useRef(null)

	useEffect(() => {
		const spinTween = gsap.to(spinRingRef.current, {
			rotation: 360,
			duration: 3.8,
			repeat: -1,
			ease: 'none',
			transformOrigin: 'center',
		})

		return () => spinTween.kill()
	}, [])

	useEffect(() => {
		if (!progressBarRef.current || !progressFillRef.current || !statusRef.current) {
			return undefined
		}

		if (!status) {
			gsap.to(progressBarRef.current, { autoAlpha: 0, duration: 0.22, ease: 'power2.out' })
			gsap.to(progressFillRef.current, { width: '0%', duration: 0.3, ease: 'power2.out' })
			return
		}

		let targetProgress = 55
		if (/requesting/i.test(status)) targetProgress = 30
		if (/ready/i.test(status)) targetProgress = 85
		if (/captured/i.test(status)) targetProgress = 100
		if (/denied|permission/i.test(status)) targetProgress = 20

		gsap.to(progressBarRef.current, { autoAlpha: 1, duration: 0.22, ease: 'power2.out' })
		gsap.to(progressFillRef.current, {
			width: `${targetProgress}%`,
			duration: 0.45,
			ease: 'power2.out',
		})

		gsap.fromTo(statusRef.current, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.24, ease: 'power2.out' })

		if (!/captured/i.test(status)) {
			return undefined
		}

		const timeout = window.setTimeout(() => {
			gsap.to(progressBarRef.current, { autoAlpha: 0, duration: 0.25, ease: 'power2.out' })
			gsap.to(progressFillRef.current, { width: '0%', duration: 0.35, ease: 'power2.out' })
		}, 1200)

		return () => window.clearTimeout(timeout)
	}, [status])

	const handleCardEnter = () => {
		if (!cardRef.current) {
			return
		}

		gsap.to(stripeRef.current, { opacity: 1, duration: 0.3 })
		gsap.to(iconRingRef.current, {
			borderColor: 'var(--brand-primary)',
			boxShadow: '0 5px 20px rgba(117,177,64,0.28)',
			duration: 0.3,
		})
		gsap.to(spinRingRef.current, {
			borderColor: 'rgba(117,177,64,0.95)',
			opacity: 1,
			duration: 0.28,
		})
		gsap.to(titleRef.current, { color: 'var(--brand-primary)', duration: 0.3 })
		cardRef.current.style.borderColor = 'var(--brand-primary)'
	}

	const handleCardMove = (event) => {
		applySubtleCardTilt({
			event,
			cardElement: cardRef.current,
			glareElement: glareRef.current,
			iconElement: iconMotionRef.current,
			shadowColor: '117,177,64',
		})
	}

	const resetCardTilt = () => {
		if (!cardRef.current) {
			return
		}

		resetSubtleCardTilt({
			cardElement: cardRef.current,
			glareElement: glareRef.current,
			iconElement: iconMotionRef.current,
		})

		gsap.to(stripeRef.current, { opacity: 0, duration: 0.4 })
		gsap.to(iconRingRef.current, {
			borderColor: '#e8e8e8',
			boxShadow: 'none',
			duration: 0.5,
			ease: 'elastic.out(1,0.6)',
		})
		gsap.to(spinRingRef.current, {
			borderColor: '#d6d6d6',
			opacity: 0.78,
			duration: 0.4,
		})
		gsap.to(titleRef.current, { color: 'var(--text-main)', duration: 0.3 })
		cardRef.current.style.borderColor = '#e8e8e8'
		cardRef.current.style.boxShadow = '0 2px 22px rgba(0,0,0,0.05)'
	}

	return (
		<>
			<div
				ref={cardRef}
				onMouseEnter={handleCardEnter}
				onMouseMove={handleCardMove}
				onMouseLeave={resetCardTilt}
				className="interactive-card relative overflow-hidden rounded-[22px] border-[1.5px] border-[#e8e8e8] bg-white px-7 pb-8 pt-9 shadow-[0_2px_22px_rgba(0,0,0,0.05)] [transform-style:preserve-3d]"
			>
				<div
					ref={stripeRef}
					className="absolute left-0 right-0 top-0 h-1 rounded-t-[22px] bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-highlight)] opacity-0"
				/>
				<div ref={glareRef} className="card-glare" />

				<div className="relative z-20">
					<div
						ref={iconMotionRef}
						className="relative mb-[18px] h-[68px] w-[68px] [transform-style:preserve-3d]"
					>
						<div
							ref={iconRingRef}
							className="absolute flex h-[68px] w-[68px] items-center justify-center rounded-full border-[1.5px] border-[#e8e8e8] bg-[#f7f7f5]"
						>
							<svg
								width="28"
								height="28"
								viewBox="0 0 24 24"
								fill="none"
								stroke="var(--brand-primary)"
								strokeWidth="1.6"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<circle cx="12" cy="12" r="3.2" />
								<rect x="3" y="7" width="18" height="14" rx="2" />
								<path d="M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2" />
							</svg>
						</div>
						<div
							ref={spinRingRef}
							className="icon-dot-ring absolute -inset-[8px] rounded-full"
						/>
					</div>

					<span className="inline-block rounded-full bg-[rgba(117,177,64,0.1)] px-[10px] py-[3px] text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--brand-primary)]">
						Live Camera
					</span>
					<h2
						ref={titleRef}
						className="mt-3 text-[32px] leading-none tracking-[0.05em] text-[var(--text-main)] font-[var(--font-heading)]"
					>
						Capture Food
					</h2>
					<p className="mt-[7px] text-[12.5px] font-light leading-[1.65] text-[#bbbbbb]">
						Point your camera at any dish. AI delivers instant nutritional insights in real time.
					</p>

					<button
						ref={buttonRef}
						type="button"
						onClick={onOpenCamera}
						onMouseEnter={() => {
							gsap.to(buttonRef.current, { scale: 1.07, duration: 0.35, ease: 'back.out(2)' })
							gsap.to(buttonRef.current, {
								boxShadow: '0 8px 28px rgba(117,177,64,0.42), 0 2px 8px rgba(117,177,64,0.18)',
								duration: 0.3,
							})
						}}
						onMouseLeave={() => {
							gsap.to(buttonRef.current, { scale: 1, duration: 0.5, ease: 'elastic.out(1,0.5)' })
							gsap.to(buttonRef.current, { boxShadow: 'none', duration: 0.3 })
						}}
						className="group cursor-none relative mt-6 inline-flex h-11 items-center justify-center gap-[9px] overflow-hidden rounded-full border-2 border-[var(--brand-primary)] px-[26px] text-base tracking-[0.12em] text-[var(--brand-primary)] font-[var(--font-heading)]"
					>
						<span className="absolute inset-0 origin-left scale-x-0 rounded-full bg-[var(--brand-primary)] transition-transform duration-300 [transition-timing-function:cubic-bezier(.34,1.56,.64,1)] group-hover:scale-x-100" />
						<span className="relative z-10 flex items-center gap-[9px] group-hover:text-white">
							<svg
								width="14"
								height="14"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
							>
								<circle cx="12" cy="12" r="3" />
								<path d="M20 7h-3l-2-3H9L7 7H4a2 2 0 00-2 2v9a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" />
							</svg>
							<span>Open Camera</span>
							<span className="transition-transform duration-300 group-hover:translate-x-[5px]">
								<svg
									width="13"
									height="13"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2.2"
									strokeLinecap="round"
								>
									<path d="M5 12h14M12 5l7 7-7 7" />
								</svg>
							</span>
						</span>
					</button>

					<div ref={progressBarRef} className="mt-4 h-[3px] overflow-hidden rounded bg-[#eeeeee] opacity-0">
						<div
							ref={progressFillRef}
							className="h-full w-0 rounded bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-highlight)]"
						/>
					</div>

					<p
						ref={statusRef}
						className="mt-2 min-h-[14px] text-[11px] uppercase tracking-[0.14em] text-[#aaaaaa]"
					>
						{status}
					</p>
				</div>
			</div>

			<CameraOverlay
				isOpen={isCameraOpen}
				streamRef={streamRef}
				onCapture={onCapturePhoto}
				onClose={onCloseCamera}
			/>
		</>
	)
}

