import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { supabase } from '../services/supabase'
import {
  type CoachRecipeRoutes,
  deleteLocalRecipe,
  saveLocalRecipe,
  recipeValidation,
  recipeStyles as styles,
} from '../services/coachRecipeDrafts'

type Props = NativeStackScreenProps<CoachRecipeRoutes, 'CoachRecipesReview'>

export default function CoachRecipesReviewScreen({ navigation, route }: Props) {
  const { recipe } = route.params
  const [saving, setSaving] = useState(false)

  async function save() {
    if (saving) {
      return
    }

    const validation = recipeValidation(recipe)

    if (validation) {
      Alert.alert('Recipe incomplete', validation)
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
        'Recipe draft saved',
        'Saved on this device only. This has not been submitted to an administrator.',
        [
          {
          text: 'View recipes',
          onPress: () => {
            navigation.popToTop()
            navigation.navigate('CoachRecipes')
          },
        },
        ]
      )
    } catch (error) {
      Alert.alert(
        'Could not save recipe',
        error instanceof Error ? error.message : 'Please try again.'
      )
    } finally {
      setSaving(false)
    }
  }

  function deleteRecipe() {
    if (saving) {
      return
    }

    Alert.alert(
      'Delete recipe draft',
      'This recipe draft will be permanently removed from this device. This cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
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

              await deleteLocalRecipe(user.id, recipe.id)

              Alert.alert(
                'Recipe deleted',
                'The recipe draft has been removed.',
                [
                  {
                    text: 'View recipes',
                    onPress: () => {
                      navigation.popToTop()
                      navigation.navigate('CoachRecipes')
                    },
                  },
                ]
              )
            } catch (error) {
              Alert.alert(
                'Could not delete recipe',
                error instanceof Error ? error.message : 'Please try again.'
              )
            } finally {
              setSaving(false)
            }
          },
        },
      ]
    )
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>

        <Text style={styles.title}>Review Recipe</Text>
        <Text style={styles.subtitle}>
          Check the recipe details before saving your draft.
        </Text>

        <View style={styles.card}>
          <View style={styles.chip}>
            <Text style={styles.chipText}>DRAFT PREVIEW</Text>
          </View>

          <Text style={styles.heading}>
            {recipe.title || 'Untitled recipe'}
          </Text>

          <Text style={styles.text}>
            {recipe.description || 'No description added.'}
          </Text>

          <Text style={styles.label}>Servings</Text>
          <Text style={styles.text}>{recipe.servings || 'Not set'}</Text>

          <Text style={styles.label}>Preparation / cooking time</Text>
          <Text style={styles.text}>
            {recipe.prepMinutes.trim()
              ? `${recipe.prepMinutes} min prep`
              : 'Prep time not set'}
            {' · '}
            {recipe.cookMinutes.trim()
              ? `${recipe.cookMinutes} min cooking`
              : 'Cooking time not set'}
          </Text>

          <Text style={styles.label}>Estimated calories per serving</Text>
          <Text style={styles.text}>
            {recipe.caloriesPerServing.trim()
              ? `${recipe.caloriesPerServing} kcal (coach-entered)`
              : 'Not provided'}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.heading}>Ingredients</Text>

          {recipe.ingredients.map((item, index) => (
            <Text key={item.id} style={styles.text}>
              {index + 1}. {item.quantity} {item.name}
            </Text>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.heading}>Preparation</Text>

          {recipe.steps.map((step, index) => (
            <View key={index} style={{ marginBottom: 12 }}>
              <Text style={styles.label}>Step {index + 1}</Text>
              <Text style={styles.text}>{step || 'Not written yet'}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.heading}>Dietary / allergen notes</Text>

          <Text style={styles.text}>
            {recipe.dietaryNotes ||
              'No notes provided. This does not establish that the recipe is allergen-free.'}
          </Text>
        </View>

        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            Admin submission and client sharing are not connected yet. Saving
            creates or updates a local draft, not an approved recipe.
          </Text>
        </View>

        <Pressable
          disabled={saving}
          style={[styles.button, styles.secondary]}
          onPress={() =>
            navigation.replace('CoachRecipesBuilder', { recipe })
          }
          accessibilityRole="button"
          accessibilityLabel="Edit this recipe"
        >
          <Text style={styles.secondaryText}>Edit recipe</Text>
        </Pressable>

        <Pressable
          disabled={saving}
          style={[styles.button, saving && styles.disabled]}
          onPress={() => void save()}
          accessibilityRole="button"
          accessibilityLabel="Save this recipe draft"
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Save recipe draft</Text>
          )}
        </Pressable>

        <Pressable
          disabled={saving}
          style={styles.deleteButton}
          onPress={deleteRecipe}
          accessibilityRole="button"
          accessibilityLabel="Delete this recipe draft"
        >
          <Text style={styles.deleteButtonText}>Delete Recipe Draft</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}
