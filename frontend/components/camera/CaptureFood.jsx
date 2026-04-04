import ImageCard from '../common/ImageCard'
import cameraImg from '../../src/assets/camera-icon.png'

export default function CaptureFood ({ onOpenCamera }){
	return (
		<ImageCard
			image={cameraImg}
			badge="Live Camera"
			title="Capture Image"
			description="Use your camera to take a live photo of any dish."
			buttonIcon={
				<svg viewBox="0 0 24 24" className="w-6 h-6 shrink-0" aria-hidden="true">
					<path
						d="M7 7.5h2.1l1.1-1.5h3.6l1.1 1.5H17a2.5 2.5 0 0 1 2.5 2.5v6A2.5 2.5 0 0 1 17 18.5H7A2.5 2.5 0 0 1 4.5 16v-6A2.5 2.5 0 0 1 7 7.5Z"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.9"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
					<circle cx="12" cy="13" r="3.1" fill="none" stroke="currentColor" strokeWidth="1.9" />
					<circle cx="16.9" cy="9.7" r="0.9" fill="currentColor" />
				</svg>
			}
			buttonLabel="Open Camera"
			onButtonClick={onOpenCamera}
		/>
	)
}