const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

const ALLOWED_TYPES = new Set([
  'cardio',
  'olympic_weightlifting',
  'plyometrics',
  'powerlifting',
  'strength',
  'stretching',
  'strongman',
])

const ALLOWED_MUSCLES = new Set([
  'abdominals',
  'abductors',
  'adductors',
  'biceps',
  'calves',
  'chest',
  'forearms',
  'glutes',
  'hamstrings',
  'lats',
  'lower_back',
  'middle_back',
  'neck',
  'quadriceps',
  'traps',
  'triceps',
])

const ALLOWED_DIFFICULTIES = new Set([
  'beginner',
  'intermediate',
  'expert',
])

function jsonResponse(
  body: Record<string, unknown>,
  status = 200
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

function sanitiseOptionalFilter(
  value: unknown,
  allowedValues: Set<string>
) {
  if (typeof value !== 'string') {
    return undefined
  }

  const normalisedValue = value.trim().toLowerCase()

  if (!allowedValues.has(normalisedValue)) {
    return undefined
  }

  return normalisedValue
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    })
  }

  if (request.method !== 'POST') {
    return jsonResponse(
      { error: 'Method not allowed.' },
      405
    )
  }

  try {
    const apiKey = Deno.env.get('API_NINJAS_KEY')

    if (!apiKey) {
      console.error('API_NINJAS_KEY is not configured.')

      return jsonResponse(
        { error: 'Exercise search is not configured.' },
        500
      )
    }

    const body = await request.json().catch(() => ({}))

    const query =
      typeof body?.query === 'string'
        ? body.query.trim()
        : ''

    if (query.length < 2) {
      return jsonResponse(
        { error: 'Enter at least 2 characters to search exercises.' },
        400
      )
    }

    const type = sanitiseOptionalFilter(
      body?.type,
      ALLOWED_TYPES
    )

    const muscle = sanitiseOptionalFilter(
      body?.muscle,
      ALLOWED_MUSCLES
    )

    const difficulty = sanitiseOptionalFilter(
      body?.difficulty,
      ALLOWED_DIFFICULTIES
    )

    const params = new URLSearchParams({
      name: query,
    })

    if (type) {
      params.set('type', type)
    }

    if (muscle) {
      params.set('muscle', muscle)
    }

    if (difficulty) {
      params.set('difficulty', difficulty)
    }

    const apiResponse = await fetch(
      `https://api.api-ninjas.com/v1/exercises?${params.toString()}`,
      {
        headers: {
          'X-Api-Key': apiKey,
        },
      }
    )

    const apiBody = await apiResponse.json().catch(() => null)

    if (!apiResponse.ok) {
      console.error(
        'API Ninjas exercise search failed:',
        apiResponse.status
      )

      return jsonResponse(
        {
          error:
            apiBody?.error ||
            'Unable to search the exercise library.',
        },
        apiResponse.status >= 500
          ? 502
          : apiResponse.status
      )
    }

    const exercises = Array.isArray(apiBody)
      ? apiBody
      : []

    const results = exercises
      .filter((exercise) => typeof exercise?.name === 'string')
      .map((exercise, index) => ({
        id: `${exercise.name ?? 'exercise'}-${exercise.type ?? 'unknown'}-${exercise.muscle ?? 'unknown'}-${index}`,
        name: exercise.name ?? 'Unnamed exercise',
        type: exercise.type ?? 'unknown',
        muscle: exercise.muscle ?? 'not specified',
        equipment: exercise.equipment ?? 'not specified',
        difficulty: exercise.difficulty ?? 'not specified',
        instructions: exercise.instructions ?? '',
      }))

    return jsonResponse({ results })
  } catch (error) {
    console.error('search-exercises function error:', error)

    return jsonResponse(
      { error: 'Unable to search the exercise library.' },
      500
    )
  }
})