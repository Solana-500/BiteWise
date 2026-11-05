
import { supabase } from './supabase'

export type AiMealRecommendation = {
  meal_name: string
  description: string
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  reason: string
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : null
}

function toText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export async function getAiMealRecommendation():
  Promise<AiMealRecommendation> {

  const { data, error } = await supabase.functions.invoke(
    'ai-recommend-meal',
    {
      body: {},
    }
  )

  if (error) {
    console.error('AI recommendation error:', error)
    throw error
  }

  if (data?.error) {
    throw new Error(String(data.error))
  }

  const raw = data?.recommendation ?? data

  // Support the existing plain-text response.
  if (typeof raw === 'string') {
    let parsed: unknown

    try {
      parsed = JSON.parse(raw)
    } catch {
      return {
        meal_name: 'Your Personalised Meal Recommendation',
        description: '',
        calories: null,
        protein_g: null,
        carbs_g: null,
        fat_g: null,
        reason: raw,
      }
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid AI recommendation response')
    }

    return normalizeRecommendation(parsed)
  }

  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid AI recommendation response')
  }

  return normalizeRecommendation(raw)
}

function normalizeRecommendation(
  value: unknown
): AiMealRecommendation {
  const item = value as Record<string, unknown>

  return {
    meal_name: toText(item.meal_name) ||
      toText(item.name) ||
      'Recommended Meal',

    description: toText(item.description),

    calories: toNumber(item.calories),
    protein_g: toNumber(item.protein_g),
    carbs_g: toNumber(item.carbs_g),
    fat_g: toNumber(item.fat_g),

    reason: toText(item.reason),
  }
}
