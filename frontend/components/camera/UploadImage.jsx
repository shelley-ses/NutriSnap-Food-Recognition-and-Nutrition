import { ArrowUpTrayIcon } from '@heroicons/react/24/solid'
import uploadImg from '../../src/assets/upload-icon.png'
import ImageCard from '../common/ImageCard'

export default function UploadImage({
  fileInputRef,
  onFileChange,
}) {

  // Trigger file picker
  const handleTriggerUpload = () => {
    fileInputRef.current?.click()
  }

  return (
    <>
      {/* File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg"
        onChange={onFileChange}
        className="hidden"
      />

      {/* UI Card */}
      <ImageCard
        image={uploadImg}
        badge="From Gallery"
        title="Upload Image"
        description="Choose a PNG or JPEG image from your device."
        buttonIcon={<ArrowUpTrayIcon className="w-5 h-5" />}
        buttonLabel="Browse Files"
        onButtonClick={handleTriggerUpload}
      />
    </>
  )
}