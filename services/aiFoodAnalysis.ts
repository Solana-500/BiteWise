import { File } from 'expo-file-system'
import { supabase } from './supabase'

export async function analyzeFoodImage(imageUri: string) {
  // Read the photo and convert it to Base64.
  const image = new File(imageUri)
  const imageBase64 = await image.base64()

  // Determine the image format.
  const mimeType = imageUri.toLowerCase().split('?')[0].endsWith('.png')
    ? 'image/png'
    : 'image/jpeg'

  // Send the photo to our Supabase Edge Function.
  const { data, error } = await supabase.functions.invoke(
    'ai-analyze-food',
    {
      body: {
        imageBase64,
        mimeType,
      },
    }
  )

  if (error) {
    console.error('AI food analysis error:', error)
    throw error
  }

  if (typeof data?.analysis !== 'string') {
    throw new Error('Invalid AI food analysis response')
  }

  return data.analysis as string
}
