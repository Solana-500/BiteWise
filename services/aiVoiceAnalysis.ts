
import { File } from 'expo-file-system'
import { supabase } from './supabase'

export type AiVoiceFood = {
  name: string
  serving: string
  calories: number
  protein: number
  carbs: number
  fat: number
}

export type AiVoiceAnalysis = AiVoiceFood & {
  success: boolean
  transcription: string
  foods: AiVoiceFood[]
  disclaimer?: string
}

export async function analyzeFoodVoice(
  audioUri: string
): Promise<AiVoiceAnalysis> {
  if (!audioUri) {
    throw new Error('No voice recording available.')
  }

  // Read the locally recorded audio as Base64.
  const audioFile = new File(audioUri)
  const audioBase64 = await audioFile.base64()

  if (!audioBase64) {
    throw new Error('Could not read voice recording.')
  }

  // Expo Audio's high-quality preset normally records
  // MPEG-4 audio on Android and iOS.
  const mimeType = 'audio/mp4'

  const { data, error } = await supabase.functions.invoke(
    'ai-analyze-voice',
    {
      body: {
        audioBase64,
        mimeType,
      },
    }
  )

  if (error) {
    throw new Error(
      error.message || 'Unable to analyse voice recording.'
    )
  }

  if (!data?.success || !Array.isArray(data.foods)) {
    throw new Error(
      data?.error || 'No food could be identified.'
    )
  }

  return data as AiVoiceAnalysis
}
