import { useEffect } from 'react'
import { motion } from 'framer-motion'
import loadingIcon from '../../src/assets/loading-icon.webp'

export default function AnalyzingScreen({ isOpen }) {
    useEffect(() => {
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [])

    const text = "Analyzing your meal..."

    return (
        <div className="fixed inset-0 flex flex-col justify-center items-center h-screen">
            <img src={loadingIcon} className="w-96 h-96"/>
            <h1 className="text-2xl font-bold primary-text flex">
                {text.split("").map((char, i) => (
                    <motion.span
                        key={i}
                        className="inline-block"
                        animate={{ y: [0, -8, 0] }}
                        transition={{
                            duration: 1.8,
                            repeat: Infinity,
                            ease: 'easeInOut',
                            delay: i * 0.07,
                        }}
                    >
                        {char === " " ? "\u00A0" : char}
                    </motion.span>
                ))}
            </h1>
            <p className="text-gray-500">Hang tight while we process your photo</p>
        </div>
    )
}