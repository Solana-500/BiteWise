
import { supabase } from './supabase'

export type AiMeal = {
  type: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'
  name: string
  serving: string
  ingredients: string[]
  calories: number
  protein: number
  carbs: number
  fat: number
}

export type AiMealPlanDay = {
  day: number
  meals: AiMeal[]
}

export type AiMealPlan = {
  title: string
  days: AiMealPlanDay[]
}

export type AiMealPlanResponse = {
  success: boolean
  mealPlan: AiMealPlan
  fitnessGoal: string | null
  dailyCalorieTarget: number
  dietaryPreferences: string[]
  allergies: string[]
  durationDays: number
  disclaimer: string
}

export async function generateAiMealPlan(): Promise<AiMealPlanResponse> {
  const { data, error } = await supabase.functions.invoke(
    'ai-generate-meal-plan',
    {
      body: {},
    }
  )

  if (error) {
    console.error('AI meal planning request failed:', error)
    throw error
  }

  if (
    !data?.success ||
    !data?.mealPlan ||
    !Array.isArray(data.mealPlan.days) ||
    data.mealPlan.days.length !== 7
  ) {
    throw new Error('AI returned an invalid meal plan.')
  }

  return data as AiMealPlanResponse
}

export async function saveAiMealPlan(
  result: AiMealPlanResponse
): Promise<string> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Please log in before saving your meal plan.')
  }

  const { data, error } = await supabase
    .from('ai_meal_plans')
    .insert({
      user_id: user.id,
      title: result.mealPlan.title,
      fitness_goal: result.fitnessGoal,
      daily_calorie_target: result.dailyCalorieTarget,
      dietary_preferences: result.dietaryPreferences,
      allergies: result.allergies,
      duration_days: result.durationDays,
      plan_data: result.mealPlan,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Unable to save AI meal plan:', error.message)
    throw new Error('Unable to save meal plan. Please try again.')
  }

  return data.id
}
