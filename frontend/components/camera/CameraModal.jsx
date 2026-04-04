export default function CameraModal({ videoRef, onClose, onConfirm }) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm bg-black/40"
      onClick={onClose} 
    >
      <div
        className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col items-center"
        onClick={e => e.stopPropagation()} // prevent closing when clicking inside
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-96 bg-gray-200 rounded-xl object-cover"
        />

        <div className="h-8" />

        <div className="flex w-full justify-center gap-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-6 bg-gray-300 text-gray-800 rounded-full text-md font-medium hover:bg-gray-400 transition"
          >
            Close
          </button>

          <button
            onClick={onConfirm}
            className="flex-1 py-3 px-6 bg-orange-400 text-white rounded-full text-md font-medium hover:bg-orange-500 transition"
          >
            Capture
          </button>
        </div>
      </div>
    </div>
  )
}