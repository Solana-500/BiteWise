import AsyncStorage from '@react-native-async-storage/async-storage'
import { StyleSheet } from 'react-native'

export type RecipeIngredient = { id: string; name: string; quantity: string }
export type CoachRecipeDraft = {
  id: string
  clientId: string
  clientName: string
  title: string
  description: string
  servings: string
  prepMinutes: string
  cookMinutes: string
  caloriesPerServing: string
  dietaryNotes: string
  ingredients: RecipeIngredient[]
  steps: string[]
  updatedAt: string
}
export type CoachRecipeRoutes = {
  CoachRecipes: undefined
  CoachRecipesBuilder: { recipe?: CoachRecipeDraft } | undefined
  CoachRecipesReview: { recipe: CoachRecipeDraft }
}
const key = (userId: string) => `bitewise:coach-recipes:v1:${userId}`

export async function loadLocalRecipes(userId: string): Promise<CoachRecipeDraft[]> {
  const raw = await AsyncStorage.getItem(key(userId))
  if (!raw) return []
  const value = JSON.parse(raw)
  if (!Array.isArray(value)) throw new Error('Saved recipe data is invalid.')
  return value
}

export async function saveLocalRecipe(userId: string, recipe: CoachRecipeDraft) {
  const current = await loadLocalRecipes(userId)
  const next = { ...recipe, updatedAt: new Date().toISOString() }
  await AsyncStorage.setItem(key(userId), JSON.stringify([
    next,
    ...current.filter((item) => item.id !== recipe.id),
  ]))
}

export async function deleteLocalRecipe(
  userId: string,
  recipeId: string
): Promise<void> {
  const current = await loadLocalRecipes(userId)

  const remaining = current.filter(
    (recipe) => recipe.id !== recipeId
  )

  await AsyncStorage.setItem(
    `bitewise:coach-recipes:v1:${userId}`,
    JSON.stringify(remaining)
  )
}

export function newRecipe(): CoachRecipeDraft {
  return {
    id: `recipe-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    clientId: '',
    clientName: '',
    title: '',
    description: '',
    servings: '1',
    prepMinutes: '',
    cookMinutes: '',
    caloriesPerServing: '',
    dietaryNotes: '',
    ingredients: [
      {
        id: 'ingredient-1',
        name: '',
        quantity: '',
      },
    ],
    steps: [''],
    updatedAt: new Date().toISOString(),
  }
}

export function recipeValidation(recipe: CoachRecipeDraft): string | null {
  if (!recipe.clientId.trim()) {
  return 'Select the client this recipe is for.'
}
  const servings = Number(recipe.servings)
  if (!Number.isInteger(servings) || servings < 1) return 'Servings must be a positive whole number.'
  for (const [label, value] of [
    ['Preparation time', recipe.prepMinutes],
    ['Cooking time', recipe.cookMinutes],
    ['Calories per serving', recipe.caloriesPerServing],
  ]) {
    if (value.trim() && (!Number.isFinite(Number(value)) || Number(value) < 0)) {
      return `${label} must be zero or greater.`
    }
  }
  if (!recipe.ingredients.length || recipe.ingredients.some((item) => !item.name.trim() || !item.quantity.trim())) {
    return 'Give every ingredient a name and quantity, or remove unused rows.'
  }
  if (!recipe.steps.length || recipe.steps.some((step) => !step.trim())) {
    return 'Write every preparation step, or remove unused steps.'
  }
  return null
}

export const recipeStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5FAF6' },
  content: { padding: 20, paddingBottom: 36 },
  back: { color: '#1E5C35', fontSize: 15, fontWeight: '800', paddingVertical: 12 },
  title: { color: '#16281D', fontSize: 27, fontWeight: '800', marginTop: 8 },
  subtitle: { color: '#5C7267', fontSize: 13, lineHeight: 20, marginTop: 7, marginBottom: 18 },
  card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2ECE6', borderRadius: 18, padding: 18, marginBottom: 14 },
  heading: { color: '#16281D', fontSize: 17, fontWeight: '800', marginBottom: 10 },
  text: { color: '#5C7267', fontSize: 14, lineHeight: 22 },
  notice: { backgroundColor: '#FFF7E5', borderRadius: 14, padding: 14, marginBottom: 18 },
  noticeText: { color: '#795B1A', fontSize: 12, lineHeight: 18 },
  button: { backgroundColor: '#1E5C35', borderRadius: 12, minHeight: 48, alignItems: 'center', justifyContent: 'center', padding: 12, marginBottom: 12 },
  buttonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  secondary: { backgroundColor: '#EAF3EC' },
  secondaryText: { color: '#1E5C35', fontWeight: '800' },
  input: { backgroundColor: '#FFFFFF', borderColor: '#C9DBD0', borderWidth: 1, borderRadius: 10, padding: 12, color: '#16281D', fontSize: 14, marginBottom: 10 },
  label: { color: '#16281D', fontSize: 13, fontWeight: '800', marginBottom: 7, marginTop: 8 },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chip: { alignSelf: 'flex-start', backgroundColor: '#EEF2EF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, marginBottom: 10 },
  chipText: { color: '#64756B', fontSize: 11, fontWeight: '800' },
  remove: { color: '#AD3D2E', fontWeight: '700', paddingVertical: 10 },
  disabled: { opacity: 0.5 },
  deleteButton: {
  minHeight: 48,
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 12,
  backgroundColor: '#FDE3E3',
  padding: 12,
},
deleteButtonText: {
  color: '#B3261E',
  fontSize: 14,
  fontWeight: '800',
},
clientOption: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  minHeight: 52,
  paddingHorizontal: 14,
  paddingVertical: 12,
  marginBottom: 9,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#C9DBD0',
  backgroundColor: '#FFFFFF',
},
clientOptionSelected: {
  borderColor: '#1E5C35',
  backgroundColor: '#EAF3EC',
},
clientOptionText: {
  color: '#16281D',
  fontSize: 14,
  fontWeight: '600',
},
clientOptionTextSelected: {
  color: '#1E5C35',
  fontWeight: '800',
},
clientSelectedTick: {
  color: '#1E5C35',
  fontSize: 18,
  fontWeight: '900',
},
})
