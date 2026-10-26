import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { supabase } from '../services/supabase'
import {
  type CoachRecipeDraft,
  type CoachRecipeRoutes,
  newRecipe,
  saveLocalRecipe,
  recipeValidation,
  recipeStyles as styles,
} from '../services/coachRecipeDrafts'

type Props = NativeStackScreenProps<
  CoachRecipeRoutes,
  'CoachRecipesBuilder'
>

type AssignedClient = {
  id: string
  full_name: string | null
}

export default function CoachRecipesBuilderScreen({
  navigation,
  route,
}: Props) {
  const [recipe, setRecipe] = useState<CoachRecipeDraft>(() => {
    return route.params?.recipe ?? newRecipe()
  })

  const [saving, setSaving] = useState(false)

  const [clients, setClients] = useState<AssignedClient[]>([])
  const [loadingClients, setLoadingClients] = useState(true)
  const [clientError, setClientError] = useState('')

  useEffect(() => {
    let active = true

    async function loadClients() {
      try {
        setClientError('')

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

        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('assigned_coach_id', user.id)
          .order('full_name', {
            ascending: true,
          })

        if (error) {
          throw error
        }

        const loadedClients = (
          (data ?? []) as unknown as Array<{
            id: string
            full_name: string | null
          }>
        ).map((client) => ({
          id: client.id,
          full_name: client.full_name,
        }))

        if (active) {
          setClients(loadedClients)
        }
      } catch (error) {
        if (active) {
          setClientError(
            error instanceof Error
              ? error.message
              : JSON.stringify(error, null, 2)
          )
        }
      } finally {
        if (active) {
          setLoadingClients(false)
        }
      }
    }

    void loadClients()

    return () => {
      active = false
    }
  }, [])

  function update(key: keyof CoachRecipeDraft, value: string) {
    setRecipe((current) => ({
      ...current,
      [key]: value,
    }))
  }

  function selectClient(client: AssignedClient) {
    if (saving) {
      return
    }

    setRecipe((current) => ({
      ...current,
      clientId: client.id,
      clientName: client.full_name || 'Unnamed client',
    }))
  }

  async function saveDraft() {
    if (saving) {
      return
    }

    try {
      setSaving(true)

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error) {
        throw error
      }

      if (!user) {
        throw new Error('Please log in again.')
      }

      await saveLocalRecipe(user.id, recipe)

      Alert.alert(
        'Draft saved',
        'This recipe draft is saved on this device.'
      )
    } catch (error) {
      Alert.alert(
        'Could not save draft',
        error instanceof Error ? error.message : 'Please try again.'
      )
    } finally {
      setSaving(false)
    }
  }

  function reviewRecipe() {
    const validationError = recipeValidation(recipe)

    if (validationError) {
      Alert.alert('Check recipe details', validationError)
      return
    }

    navigation.navigate('CoachRecipesReview', {
      recipe,
    })
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={() => navigation.goBack()}>
            <Text style={styles.back}>‹ Back</Text>
          </Pressable>

          <Text style={styles.title}>Recipe Builder</Text>

          <Text style={styles.subtitle}>
            Select a client, then add ingredients, portions, and
            easy-to-follow instructions.
          </Text>

          <View style={styles.card}>
            <Text style={styles.heading}>Select client</Text>

            <Text style={styles.subtitle}>
              Choose the assigned client this recipe is for.
            </Text>

            {loadingClients ? (
              <ActivityIndicator color="#1E5C35" />
            ) : clientError ? (
              <Text style={styles.text}>{clientError}</Text>
            ) : clients.length === 0 ? (
              <Text style={styles.text}>
                You do not have any assigned clients yet.
              </Text>
            ) : (
              clients.map((client) => {
                const isSelected = recipe.clientId === client.id

                return (
                  <Pressable
                    key={client.id}
                    disabled={saving}
                    style={[
                      styles.clientOption,
                      isSelected && styles.clientOptionSelected,
                    ]}
                    onPress={() => selectClient(client)}
                    accessibilityRole="radio"
                    accessibilityLabel={`Select ${
                      client.full_name || 'client'
                    }`}
                    accessibilityState={{
                      selected: isSelected,
                      disabled: saving,
                    }}
                  >
                    <Text
                      style={[
                        styles.clientOptionText,
                        isSelected &&
                          styles.clientOptionTextSelected,
                      ]}
                    >
                      {client.full_name || 'Unnamed client'}
                    </Text>

                    {isSelected ? (
                      <Text style={styles.clientSelectedTick}>
                        ✓
                      </Text>
                    ) : null}
                  </Pressable>
                )
              })
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.heading}>Recipe basics</Text>

            {(
              [
                ['title', 'Recipe title', 'default'],
                ['description', 'Short description', 'default'],
                ['servings', 'Servings', 'number-pad'],
                [
                  'prepMinutes',
                  'Preparation time (minutes, optional)',
                  'number-pad',
                ],
                [
                  'cookMinutes',
                  'Cooking time (minutes, optional)',
                  'number-pad',
                ],
                [
                  'caloriesPerServing',
                  'Estimated kcal per serving (optional)',
                  'decimal-pad',
                ],
                [
                  'dietaryNotes',
                  'Dietary / allergen notes (optional)',
                  'default',
                ],
              ] as const
            ).map(([key, label, keyboard]) => (
              <View key={key}>
                <Text style={styles.label}>{label}</Text>

                <TextInput
                  style={[
                    styles.input,
                    key === 'description' && styles.multiline,
                  ]}
                  value={recipe[key]}
                  onChangeText={(value) => update(key, value)}
                  multiline={
                    key === 'description' || key === 'dietaryNotes'
                  }
                  keyboardType={keyboard}
                  editable={!saving}
                  maxLength={
                    key === 'description' ? 1000 : 300
                  }
                  accessibilityLabel={label}
                />
              </View>
            ))}

            <Text style={styles.text}>
              Calories are coach-entered estimates, not automatically
              calculated from ingredients.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.heading}>Ingredients</Text>

            {recipe.ingredients.map((item, index) => (
              <View key={item.id}>
                <Text style={styles.label}>
                  Ingredient {index + 1}
                </Text>

                <TextInput
                  style={styles.input}
                  value={item.name}
                  placeholder="Ingredient name"
                  editable={!saving}
                  maxLength={200}
                  onChangeText={(value) =>
                    setRecipe((current) => ({
                      ...current,
                      ingredients: current.ingredients.map(
                        (entry) =>
                          entry.id === item.id
                            ? {
                                ...entry,
                                name: value,
                              }
                            : entry
                      ),
                    }))
                  }
                />

                <TextInput
                  style={styles.input}
                  value={item.quantity}
                  placeholder="Quantity, e.g. 150 g or 1 tbsp"
                  editable={!saving}
                  maxLength={100}
                  onChangeText={(value) =>
                    setRecipe((current) => ({
                      ...current,
                      ingredients: current.ingredients.map(
                        (entry) =>
                          entry.id === item.id
                            ? {
                                ...entry,
                                quantity: value,
                              }
                            : entry
                      ),
                    }))
                  }
                />

                {recipe.ingredients.length > 1 ? (
                  <Pressable
                    disabled={saving}
                    onPress={() =>
                      setRecipe((current) => ({
                        ...current,
                        ingredients:
                          current.ingredients.filter(
                            (entry) => entry.id !== item.id
                          ),
                      }))
                    }
                  >
                    <Text style={styles.remove}>
                      Remove ingredient
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ))}

            <Pressable
              disabled={saving}
              style={[styles.button, styles.secondary]}
              onPress={() =>
                setRecipe((current) => ({
                  ...current,
                  ingredients: [
                    ...current.ingredients,
                    {
                      id: `ingredient-${Date.now()}-${Math.random()}`,
                      name: '',
                      quantity: '',
                    },
                  ],
                }))
              }
            >
              <Text style={styles.secondaryText}>
                ＋ Add ingredient
              </Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.heading}>Preparation steps</Text>

            {recipe.steps.map((step, index) => (
              <View key={index}>
                <Text style={styles.label}>Step {index + 1}</Text>

                <TextInput
                  style={[styles.input, styles.multiline]}
                  value={step}
                  editable={!saving}
                  multiline
                  maxLength={2000}
                  onChangeText={(value) =>
                    setRecipe((current) => ({
                      ...current,
                      steps: current.steps.map(
                        (entry, stepIndex) =>
                          stepIndex === index ? value : entry
                      ),
                    }))
                  }
                />

                {recipe.steps.length > 1 ? (
                  <Pressable
                    disabled={saving}
                    onPress={() =>
                      setRecipe((current) => ({
                        ...current,
                        steps: current.steps.filter(
                          (_, stepIndex) => stepIndex !== index
                        ),
                      }))
                    }
                  >
                    <Text style={styles.remove}>Remove step</Text>
                  </Pressable>
                ) : null}
              </View>
            ))}

            <Pressable
              disabled={saving}
              style={[styles.button, styles.secondary]}
              onPress={() =>
                setRecipe((current) => ({
                  ...current,
                  steps: [...current.steps, ''],
                }))
              }
            >
              <Text style={styles.secondaryText}>＋ Add step</Text>
            </Pressable>
          </View>

          <Pressable
            disabled={saving}
            style={[styles.button, styles.secondary]}
            onPress={() => void saveDraft()}
            accessibilityRole="button"
            accessibilityLabel="Save this recipe as a local draft"
          >
            {saving ? (
              <ActivityIndicator color="#1E5C35" />
            ) : (
              <Text style={styles.secondaryText}>
                Save local draft
              </Text>
            )}
          </Pressable>

          <Pressable
            disabled={saving}
            style={styles.button}
            onPress={reviewRecipe}
            accessibilityRole="button"
            accessibilityLabel="Review this recipe"
          >
            <Text style={styles.buttonText}>
              Review Recipe ›
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
