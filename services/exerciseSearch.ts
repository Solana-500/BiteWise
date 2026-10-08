import { supabase } from './supabase'

export type ExerciseSearchResult = {
  id: string
  name: string
  type: string
  muscle: string
  equipment: string
  difficulty: string
  instructions: string
}

type ExerciseSearchResponse = {
  results?: ExerciseSearchResult[]
  error?: string
}

export async function searchExercises(
  query: string
): Promise<ExerciseSearchResult[]> {
  const trimmedQuery = query.trim()

  if (trimmedQuery.length < 2) return []

  const { data, error } =
    await supabase.functions.invoke<ExerciseSearchResponse>(
      'search-exercises',
      {
        body: {
          query: trimmedQuery,
        },
      }
    )

  if (error) {
    let message = error.message || 'Unable to search exercises.'
    const context = (
      error as unknown as { context?: Response }
    ).context

    if (context && typeof context.json === 'function') {
      try {
        const responseBody = await context.json()

        if (typeof responseBody?.error === 'string') {
          message = responseBody.error
        }
      } catch {
        // Keep the original error message.
      }
    }

    throw new Error(message)
  }

  if (data?.error) throw new Error(data.error)

  if (!Array.isArray(data?.results)) {
    throw new Error('The exercise search returned an unexpected response.')
  }

  return data.results
}
