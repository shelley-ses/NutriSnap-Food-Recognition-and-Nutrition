import { useLocation } from 'react-router-dom'
import FoodAnalysis from './FoodAnalysis'

export default function AnalysisPage () {
  const location = useLocation()
  const analysisData = location.state?.analysisData ?? null
  const previewSrc = location.state?.previewSrc ?? null
  const isAnalyzing = location.state?.isAnalyzing ?? false
  const rawFile = location.state?.rawFile ?? null
  const isEditing = location.state?.isEditing ?? false
  const mealId = location.state?.mealId ?? null

  return (
    <FoodAnalysis
      analysisData={analysisData}
      previewSrc={previewSrc}
      isAnalyzingInit={isAnalyzing}
      rawFile={rawFile}
      isEditing={isEditing}
      mealId={mealId}
    />
  )
}