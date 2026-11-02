import { supabase } from './supabase'


export type RecipeIngredientPayload = {
  name: string
  quantity: string
}


export type CoachRecipeSubmission = {
  clientId: string
  clientName: string
  title: string
  description: string
  servings: number
  preparationMinutes: number
  caloriesPerServing: string
  dietaryNotes: string
  ingredients: RecipeIngredientPayload[]
  steps: string[]
}


export async function saveCoachRecipe(
  requestKey: string,
  recipe: CoachRecipeSubmission,
  submit: boolean
): Promise<string> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()


  if (userError) {
    throw userError
  }


  if (!user) {
    throw new Error('Please log in again.')
  }


  const payload = {
    coach_id: user.id,
    client_id: recipe.clientId,
    request_key: requestKey,


    title: recipe.title.trim(),
    description: recipe.description.trim(),


    // Your current recipe draft does not have a meal-type field,
    // so this uses a neutral value understood by the database.
    meal_type: 'recipe',


    servings: recipe.servings,
    preparation_minutes: recipe.preparationMinutes,


    ingredients: recipe.ingredients,
    steps: recipe.steps,


    nutrition: {
      calories_per_serving: recipe.caloriesPerServing,
    },


    coach_notes: recipe.dietaryNotes.trim(),


    status: submit ? 'pending_review' : 'draft',
    submitted_at: submit ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }


  const { data, error } = await supabase
    .from('coach_recipes')
    .upsert(payload, {
      onConflict: 'coach_id,request_key',
    })
    .select('id')
    .single()


  if (error) {
    throw error
  }


  return data.id
}