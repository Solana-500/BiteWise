const USDA_API_KEY = process.env.EXPO_PUBLIC_USDA_API_KEY

const USDA_SEARCH_URL =
  'https://api.nal.usda.gov/fdc/v1/foods/search'

export type UsdaFoodResult = {
  id: string
  name: string
  brand: string | null
  caloriesPer100g: number | null
  proteinPer100g: number | null
  carbsPer100g: number | null
  fatPer100g: number | null
}

type UsdaNutrient = {
  nutrientName?: string
  nutrientNumber?: string
  value?: number
}

type UsdaFood = {
  fdcId: number
  description?: string
  brandOwner?: string
  brandName?: string
  foodNutrients?: UsdaNutrient[]
}

type UsdaSearchResponse = {
  foods?: UsdaFood[]
}

function getNutrientValue(
  nutrients: UsdaNutrient[] | undefined,
  names: string[],
  numbers: string[]
) {
  const nutrient = nutrients?.find((item) => {
    const name = item.nutrientName?.toLowerCase() || ''
    const number = item.nutrientNumber || ''

    return (
      names.some((target) => name.includes(target.toLowerCase())) ||
      numbers.includes(number)
    )
  })

  return typeof nutrient?.value === 'number' ? nutrient.value : null
}

export async function searchUsdaFoods(
  query: string
): Promise<UsdaFoodResult[]> {
  const trimmedQuery = query.trim()

  if (!trimmedQuery) {
    return []
  }

  if (!USDA_API_KEY) {
    throw new Error(
      'USDA API key is missing. Add EXPO_PUBLIC_USDA_API_KEY to your .env file.'
    )
  }

  const url =
    `${USDA_SEARCH_URL}` +
    `?api_key=${encodeURIComponent(USDA_API_KEY)}` +
    `&query=${encodeURIComponent(trimmedQuery)}` +
    '&pageSize=15'

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(
      `Food search failed. Please try again. (${response.status})`
    )
  }

  const body: UsdaSearchResponse = await response.json()

  return (body.foods ?? []).map((food) => ({
    id: String(food.fdcId),
    name: food.description?.trim() || 'Unnamed food',
    brand: food.brandOwner?.trim() || food.brandName?.trim() || null,
    caloriesPer100g: getNutrientValue(
      food.foodNutrients,
      ['energy'],
      ['208']
    ),
    proteinPer100g: getNutrientValue(
      food.foodNutrients,
      ['protein'],
      ['203']
    ),
    carbsPer100g: getNutrientValue(
      food.foodNutrients,
      ['carbohydrate'],
      ['205']
    ),
    fatPer100g: getNutrientValue(
      food.foodNutrients,
      ['total lipid', 'fat'],
      ['204']
    ),
  }))
}