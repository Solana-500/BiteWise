export type BarcodeFood = {
  barcode: string
  name: string
  brand: string | null
  servingSize: string | null
  caloriesPer100g: number | null
  proteinPer100g: number | null
  carbsPer100g: number | null
  fatPer100g: number | null
  imageUrl: string | null
}

type OpenFoodFactsResponse = {
  status: number
  status_verbose?: string
  product?: {
    product_name?: string
    product_name_en?: string
    brands?: string
    serving_size?: string
    image_front_small_url?: string
    nutriments?: {
      'energy-kcal_100g'?: number
      'energy-kcal'?: number
      proteins_100g?: number
      carbohydrates_100g?: number
      fat_100g?: number
    }
  }
}

function asNumber(value: unknown): number | null {
  const numberValue = Number(value)

  return Number.isFinite(numberValue) ? numberValue : null
}

export async function getFoodByBarcode(
  barcode: string
): Promise<BarcodeFood> {
  const fields = [
    'product_name',
    'product_name_en',
    'brands',
    'serving_size',
    'image_front_small_url',
    'nutriments',
  ].join(',')

  const response = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(
      barcode
    )}?fields=${fields}`,
    {
      headers: {
        Accept: 'application/json',
      },
    }
  )

  if (!response.ok) {
    throw new Error('Could not contact the food database. Try again.')
  }

  const result = (await response.json()) as OpenFoodFactsResponse

  if (result.status !== 1 || !result.product) {
    throw new Error(
      'Food not found. Try searching by name or enter the nutrition details manually.'
    )
  }

  const nutriments = result.product.nutriments ?? {}

  return {
    barcode,
    name:
      result.product.product_name?.trim() ||
      result.product.product_name_en?.trim() ||
      'Unknown product',
    brand: result.product.brands?.trim() || null,
    servingSize: result.product.serving_size?.trim() || null,
    caloriesPer100g:
      asNumber(nutriments['energy-kcal_100g']) ??
      asNumber(nutriments['energy-kcal']),
    proteinPer100g: asNumber(nutriments.proteins_100g),
    carbsPer100g: asNumber(nutriments.carbohydrates_100g),
    fatPer100g: asNumber(nutriments.fat_100g),
    imageUrl: result.product.image_front_small_url?.trim() || null,
  }
}