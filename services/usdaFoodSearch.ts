
import { supabase } from './supabase'

export type UsdaFoodResult = {
  id: string
  name: string
  brand: string | null
  caloriesPer100g: number | null
  proteinPer100g: number | null
  carbsPer100g: number | null
  fatPer100g: number | null
}

type UsdaSearchResponse = {
  foods: UsdaFoodResult[]
}

export async function searchUsdaFoods(
  query: string
): Promise<UsdaFoodResult[]> {
  const trimmedQuery = query.trim()

  if (!trimmedQuery) {
    return []
  }

  if (trimmedQuery.length > 80) {
    throw new Error('Search must be 80 characters or fewer.')
  }

  const { data, error } =
    await supabase.functions.invoke<UsdaSearchResponse>(
      'search-usda-foods',
      {
        body: { query: trimmedQuery },
      }
    )

  if (error) {
    console.error('USDA Edge Function error:', error)
    throw new Error(
      'Unable to search foods. Please check your connection and try again.'
    )
  }

  if (!data || !Array.isArray(data.foods)) {
    throw new Error('Invalid response from food search service.')
  }

  return data.foods
}
