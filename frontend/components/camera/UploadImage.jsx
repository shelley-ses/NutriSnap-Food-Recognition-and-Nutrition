import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { applySubtleCardTilt, resetSubtleCardTilt } from '../common/motion'

export default function UploadImage({
	fileInputRef,
	onTriggerUpload,
	onFileChange,
}) {
	const cardRef = useRef(null)
	const stripeRef = useRef(null)
	const glareRef = useRef(null)
	const iconMotionRef = useRef(null)
	const iconRingRef = useRef(null)
	const spinRingRef = useRef(null)
	const titleRef = useRef(null)
	const buttonRef = useRef(null)

	useEffect(() => {
		const spinTween = gsap.to(spinRingRef.current, {
			rotation: -360,
			duration: 3.4,
			repeat: -1,
			ease: 'none',
			transformOrigin: 'center',
		})

		return () => spinTween.kill()
	}, [])

	const handleCardEnter = () => {
		if (!cardRef.current) {
			return
		}

		gsap.to(stripeRef.current, { opacity: 1, duration: 0.3 })
		gsap.to(iconRingRef.current, {
			borderColor: 'var(--brand-secondary)',
			boxShadow: '0 5px 20px rgba(255,159,69,0.28)',
			duration: 0.3,
		})
		gsap.to(spinRingRef.current, {
			borderColor: 'rgba(255,159,69,0.95)',
			opacity: 1,
			duration: 0.28,
		})
		gsap.to(titleRef.current, { color: 'var(--brand-secondary)', duration: 0.3 })
		cardRef.current.style.borderColor = 'var(--brand-secondary)'
	}

	const handleCardMove = (event) => {
		applySubtleCardTilt({
			event,
			cardElement: cardRef.current,
			glareElement: glareRef.current,
			iconElement: iconMotionRef.current,
			shadowColor: '255,159,69',
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
		<div
			ref={cardRef}
			onMouseEnter={handleCardEnter}
			onMouseMove={handleCardMove}
			onMouseLeave={resetCardTilt}
			className="interactive-card relative overflow-hidden rounded-[22px] border-[1.5px] border-[#e8e8e8] bg-white px-7 pb-8 pt-9 shadow-[0_2px_22px_rgba(0,0,0,0.05)] [transform-style:preserve-3d]"
		>
			<div
				ref={stripeRef}
				className="absolute left-0 right-0 top-0 h-1 rounded-t-[22px] bg-gradient-to-r from-[var(--brand-secondary)] to-[var(--brand-danger)] opacity-0"
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
							stroke="var(--brand-secondary)"
							strokeWidth="1.6"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
							<polyline points="17 8 12 3 7 8" />
							<line x1="12" y1="3" x2="12" y2="15" />
						</svg>
					</div>
					<div
						ref={spinRingRef}
						className="icon-dot-ring absolute -inset-[8px] rounded-full"
					/>
				</div>

				<input
					ref={fileInputRef}
					type="file"
					accept="image/*"
					onChange={onFileChange}
					className="hidden"
				/>

				<span className="inline-block rounded-full bg-[rgba(255,159,69,0.1)] px-[10px] py-[3px] text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--brand-secondary)]">
					From Gallery
				</span>
				<h2
					ref={titleRef}
					className="mt-3 text-[32px] leading-none tracking-[0.05em] text-[var(--text-main)] font-[var(--font-heading)]"
				>
					Upload Photo
				</h2>
				<p className="mt-[7px] text-[12.5px] font-light leading-[1.65] text-[#bbbbbb]">
					PNG or JPEG only. Max 10 MB. Instant AI nutrition breakdown.
				</p>

				<button
					ref={buttonRef}
					type="button"
					onClick={onTriggerUpload}
					onMouseEnter={() => {
						gsap.to(buttonRef.current, { scale: 1.07, duration: 0.35, ease: 'back.out(2)' })
						gsap.to(buttonRef.current, {
							boxShadow: '0 8px 28px rgba(255,159,69,0.42), 0 2px 8px rgba(255,159,69,0.18)',
							duration: 0.3,
						})
					}}
					onMouseLeave={() => {
						gsap.to(buttonRef.current, { scale: 1, duration: 0.5, ease: 'elastic.out(1,0.5)' })
						gsap.to(buttonRef.current, { boxShadow: 'none', duration: 0.3 })
					}}
					className="group cursor-none relative mt-6 inline-flex h-11 items-center justify-center gap-[9px] overflow-hidden rounded-full border-2 border-[var(--brand-secondary)] px-[26px] text-base tracking-[0.12em] text-[var(--brand-secondary)] font-[var(--font-heading)]"
				>
					<span className="absolute inset-0 origin-left scale-x-0 rounded-full bg-[var(--brand-secondary)] transition-transform duration-300 [transition-timing-function:cubic-bezier(.34,1.56,.64,1)] group-hover:scale-x-100" />
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
							<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
							<polyline points="17 8 12 3 7 8" />
							<line x1="12" y1="3" x2="12" y2="15" />
						</svg>
						<span>Browse Files</span>
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
			</div>
		</div>
	)
}

