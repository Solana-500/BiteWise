
import React, { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../services/supabase'

type Props = {
  navigation: any
}

type Ingredient = {
  name: string
  quantity: string
}

type CoachRecipe = {
  id: string
  title: string
  description: string | null
  meal_type: string | null
  servings: number | null
  preparation_minutes: number | null
  ingredients: Ingredient[]
  steps: string[]
  calories: number | null
  coach_notes: string | null
}

export default function PuCoachRecipesScreen({ navigation }: Props) {
  const [recipes, setRecipes] = useState<CoachRecipe[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const loadRecipes = useCallback(async () => {
    try {
      setError('')

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError) throw authError
      if (!user) throw new Error('Please sign in again.')

      const { data, error: recipesError } = await supabase
        .from('coach_recipes')
        .select(`
          id,
          title,
          description,
          meal_type,
          servings,
          preparation_minutes,
          ingredients,
          steps,
          nutrition,
          coach_notes
        `)
        .eq('client_id', user.id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })

      if (recipesError) throw recipesError

      const formatted: CoachRecipe[] = (data ?? []).map((row) => {
        const nutrition =
          row.nutrition &&
          typeof row.nutrition === 'object' &&
          !Array.isArray(row.nutrition)
            ? row.nutrition as Record<string, unknown>
            : {}

        const rawCalories = Number(nutrition.calories_per_serving)

        return {
          id: row.id,
          title: row.title || 'Untitled Recipe',
          description: row.description,
          meal_type: row.meal_type,
          servings: row.servings,
          preparation_minutes: row.preparation_minutes,
          ingredients: Array.isArray(row.ingredients)
            ? row.ingredients
            : [],
          steps: Array.isArray(row.steps) ? row.steps : [],
          calories: Number.isFinite(rawCalories)
            ? rawCalories
            : null,
          coach_notes: row.coach_notes,
        }
      })

      setRecipes(formatted)
    } catch (err) {
      console.error('Unable to load coach recipes:', err)
      setError(
        err instanceof Error ? err.message : 'Unable to load recipes.'
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      void loadRecipes()
    }, [loadRecipes])
  )

  const filtered = recipes.filter((recipe) =>
    `${recipe.title} ${recipe.description ?? ''}`
      .toLowerCase()
      .includes(query.trim().toLowerCase())
  )

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Coach Recipes</Text>
        <Text style={styles.subtitle}>
          Recipes shared with you by your health coach
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              void loadRecipes()
            }}
          />
        }
      >
        <TextInput
          style={styles.search}
          placeholder="Search recipes"
          value={query}
          onChangeText={setQuery}
        />

        {loading ? (
          <ActivityIndicator color="#1E5C35" size="large" />
        ) : error ? (
          <View style={styles.card}>
            <Text style={styles.error}>{error}</Text>
            <Pressable onPress={() => void loadRecipes()}>
              <Text style={styles.action}>Try Again</Text>
            </Pressable>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {query ? 'No matching recipes' : 'No coach recipes available'}
            </Text>
            <Text style={styles.body}>
              {query
                ? 'Try searching for another recipe.'
                : 'Your coach has not shared any approved recipes with you yet.'}
            </Text>
          </View>
        ) : (
          filtered.map((recipe) => {
            const expanded = expandedId === recipe.id

            return (
              <View key={recipe.id} style={styles.card}>
                <Text style={styles.cardTitle}>{recipe.title}</Text>

                {recipe.description ? (
                  <Text style={styles.body}>{recipe.description}</Text>
                ) : null}

                <Text style={styles.meta}>
                  {recipe.servings ?? '—'} serving(s) ·{' '}
                  {recipe.preparation_minutes ?? '—'} min
                  {recipe.calories !== null
                    ? ` · ${recipe.calories} kcal/serving`
                    : ''}
                </Text>

                <Pressable
                  onPress={() =>
                    setExpandedId(expanded ? null : recipe.id)
                  }
                >
                  <Text style={styles.action}>
                    {expanded ? 'Hide Recipe ▲' : 'View Recipe ▼'}
                  </Text>
                </Pressable>

                {expanded ? (
                  <View style={styles.details}>
                    <Text style={styles.sectionTitle}>Ingredients</Text>
                    {recipe.ingredients.map((ingredient, index) => (
                      <Text key={index} style={styles.body}>
                        • {ingredient.quantity} {ingredient.name}
                      </Text>
                    ))}

                    <Text style={styles.sectionTitle}>Instructions</Text>
                    {recipe.steps.map((step, index) => (
                      <Text key={index} style={styles.body}>
                        {index + 1}. {step}
                      </Text>
                    ))}

                    {recipe.coach_notes ? (
                      <>
                        <Text style={styles.sectionTitle}>
                          Coach's Notes
                        </Text>
                        <Text style={styles.body}>
                          {recipe.coach_notes}
                        </Text>
                      </>
                    ) : null}
                  </View>
                ) : null}
              </View>
            )
          })
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5FAF6' },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2ECE6',
  },
  back: {
    color: '#1E5C35',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  title: {
    color: '#16281D',
    fontSize: 23,
    fontWeight: '800',
  },
  subtitle: {
    color: '#7C8F83',
    fontSize: 13,
    marginTop: 6,
  },
  content: { padding: 20, paddingBottom: 40 },
  search: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE9DF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2ECE6',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
  },
  cardTitle: {
    color: '#16281D',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 8,
  },
  body: {
    color: '#5C7267',
    fontSize: 13,
    lineHeight: 21,
  },
  meta: {
    color: '#7C8F83',
    fontSize: 12,
    marginTop: 10,
  },
  action: {
    color: '#1E5C35',
    fontWeight: '700',
    marginTop: 14,
  },
  details: {
    borderTopWidth: 1,
    borderTopColor: '#E2ECE6',
    marginTop: 16,
    paddingTop: 12,
  },
  sectionTitle: {
    color: '#16281D',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 12,
    marginBottom: 6,
  },
  error: {
    color: '#C0392B',
    fontSize: 13,
  },
})
