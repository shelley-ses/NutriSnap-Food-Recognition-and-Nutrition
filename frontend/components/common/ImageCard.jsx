import { motion as Motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useState } from 'react'

export default function ImageCard({ image, badge, title, description, buttonIcon, buttonLabel, onButtonClick }) {
    const pointerX = useMotionValue(0)
    const pointerY = useMotionValue(0)
    const [isCardHovered, setIsCardHovered] = useState(false)
    const hoverAccent = '#fb923c'

    // 3D Tilt
    const rotateX = useSpring(useTransform(pointerY, [-1, 1], [8, -8]), {
        stiffness: 210,
        damping: 22,
    })
    const rotateY = useSpring(useTransform(pointerX, [-1, 1], [-12, 12]), {
        stiffness: 210,
        damping: 22,
    })
    const shiftX = useSpring(useTransform(pointerX, [-1, 1], [-6, 6]), {
        stiffness: 190,
        damping: 20,
    })

    const glowX = useTransform(pointerX, [-1, 1], ['10%', '90%'])
    const glowOpacity = useTransform(pointerY, [-1, 1], [0.16, 0.08])

    const applyEdgeDeadZone = (value) => {
        const deadZone = 0.35
        const absValue = Math.abs(value)

        if (absValue <= deadZone) {
            return 0
        }

        const normalized = (absValue - deadZone) / (1 - deadZone)
        return Math.sign(value) * normalized
    }

    const handleMouseMove = (event) => {
        const rect = event.currentTarget.getBoundingClientRect()
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
        const y = ((event.clientY - rect.top) / rect.height) * 2 - 1

        const edgeX = applyEdgeDeadZone(x)
        const edgeY = applyEdgeDeadZone(y)
        pointerX.set(edgeX)
        pointerY.set(edgeY)
    }

    const handleMouseLeave = () => {
        pointerX.set(0)
        pointerY.set(0)
    }

    return (
        <Motion.div
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onHoverStart={() => setIsCardHovered(true)}
            onHoverEnd={() => setIsCardHovered(false)}
            whileHover={{ y: -1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 22 }}
            style={{
                x: shiftX,
                rotateX,
                rotateY,
                transformPerspective: 900,
                transformStyle: 'preserve-3d',
            }}
            className="relative overflow-hidden bg-highlight w-full max-w-85 p-8 text-white flex flex-col items-start gap-6 rounded-3xl"
        >
            <Motion.div
                aria-hidden="true"
                style={{ left: glowX, opacity: glowOpacity }}
                className="pointer-events-none absolute top-2 h-24 w-24 -translate-x-1/2 rounded-full bg-white/30 blur-2xl"
            />

            {/* Circle */}
            <Motion.div
                style={{ translateZ: 24 }}
                className="relative w-28 h-28"
            >
                <Motion.svg
                    aria-hidden="true"
                    viewBox="0 0 120 120"
                    animate={{ rotate: 360 }}
                    transition={{
                        rotate: { duration: 4, repeat: Infinity, ease: 'linear' },
                    }}
                    className="pointer-events-none absolute -inset-2"
                >
                    <circle
                        cx="60"
                        cy="60"
                        r="56"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeDasharray="2 8"
                    />
                </Motion.svg>
                <div className="flex items-center justify-center bg-white w-28 h-28 rounded-full border-4 border-yellow-200/50">
                    <img src={image} className="w-12 h-12" />
                </div>
            </Motion.div>

            {/* Badge */}
            <Motion.div
                style={{ translateZ: 18 }}
                className="flex items-center justify-center bg-amber-100 w-36 h-7 rounded-3xl"
            >
                <Motion.p
                    animate={{ color: isCardHovered ? hoverAccent : '#2f5f25' }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="text-[12px]"
                >
                    {badge}
                </Motion.p>
            </Motion.div>

            {/* Text */}
            <Motion.div style={{ translateZ: 14 }} className="pb-5 pt-5">
                <Motion.h1
                    animate={{ color: isCardHovered ? hoverAccent : '#ffffff' }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="text-[25px] pb-3"
                >
                    {title}
                </Motion.h1>
                <p className="font-light text-[15px] secondary-text max-w-60">{description}</p>
            </Motion.div>

            {/* Button */}
            <Motion.button
                onClick={onButtonClick}
                whileHover={{ y: -2, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="mt-28 flex justify-center items-center gap-4 bg-[#FFF4E1] text-orange-400 hover:bg-orange-400 hover:text-white w-full h-12 rounded-3xl border border-orange-400 transition-colors duration-200"
            >
                <span className="text-current [&_svg]:stroke-current [&_svg]:fill-current">{buttonIcon}</span>
                <p className="text-sm">{buttonLabel} </p>
            </Motion.button>
        </Motion.div>
    )
}