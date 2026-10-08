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

const cleaned = data.analysis
  .replace(/```json\s*/gi, '')
  .replace(/```\s*/g, '')
  .trim()

const food = JSON.parse(cleaned)

if (food.isFood !== true) {
  throw new Error('No recognizable food found in the image')
}

if (
  typeof food.name !== 'string' ||
  !food.name.trim() ||
  typeof food.serving !== 'string' ||
  !['calories', 'protein', 'carbs', 'fat'].every(
    (key) =>
      typeof food[key] === 'number' &&
      Number.isFinite(food[key]) &&
      food[key] >= 0
  )
) {
  throw new Error('Invalid nutritional information returned by AI')
}

return {
  name: food.name,
  calories: food.calories,
  protein: food.protein,
  carbs: food.carbs,
  fat: food.fat,
  serving: food.serving,
}

