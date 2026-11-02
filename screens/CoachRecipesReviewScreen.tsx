import React, { useRef, useState } from 'react'
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


import { saveCoachRecipe } from '../services/recipeService'


type Props = NativeStackScreenProps<CoachRecipeRoutes, 'CoachRecipesReview'>


export default function CoachRecipesReviewScreen({ navigation, route }: Props) {
  const { recipe } = route.params
  const originalRequestKey = route.params?.originalRequestKey
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)


  const requestKey = useRef(
    originalRequestKey ??
      `recipe-${recipe.id || Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`
  )


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


  async function submitRecipe() {
    if (submitting) {
      return
    }


    const validation = recipeValidation(recipe)


    if (validation) {
      Alert.alert('Recipe incomplete', validation)
      return
    }


    try {
      setSubmitting(true)


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


      await saveCoachRecipe(
        requestKey.current,
        {
          clientId: recipe.clientId,
          clientName: recipe.clientName,
          title: recipe.title,
          description: recipe.description,
          servings: Number(recipe.servings) || 1,
          preparationMinutes:
            (Number(recipe.prepMinutes) || 0) +
            (Number(recipe.cookMinutes) || 0),
          caloriesPerServing: recipe.caloriesPerServing,
          dietaryNotes: recipe.dietaryNotes,
          ingredients: recipe.ingredients.map((item) => ({
            name: item.name,
            quantity: item.quantity,
          })),
          steps: recipe.steps,
        },
        true
      )


      await saveLocalRecipe(user.id, recipe)


      Alert.alert(
        'Recipe submitted',
        'Your recipe has been sent for administrator review.',
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
        'Could not submit recipe',
        error instanceof Error ? error.message : 'Please try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }


  function deleteRecipe() {
    if (saving || submitting) {
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
          Check the recipe details before saving or submitting it.
        </Text>


        <View style={styles.card}>
          <View style={styles.chip}>
            <Text style={styles.chipText}>RECIPE PREVIEW</Text>
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
            Submitting sends this recipe to a system administrator for review.
            It will not be released to the client until it is approved.
          </Text>
        </View>


        <Pressable
          disabled={saving || submitting}
          style={[styles.button, styles.secondary]}
          onPress={() =>
            navigation.replace('CoachRecipesBuilder', {
              recipe,
              originalRequestKey,
            })
          }
          accessibilityRole="button"
          accessibilityLabel="Edit this recipe"
        >
          <Text style={styles.secondaryText}>Edit recipe</Text>
        </Pressable>


        <Pressable
          disabled={saving || submitting}
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
          disabled={saving || submitting}
          style={[styles.button, submitting && styles.disabled]}
          onPress={() => void submitRecipe()}
          accessibilityRole="button"
          accessibilityLabel="Submit this recipe for administrator review"
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>
              Submit for Administrator Review
            </Text>
          )}
        </Pressable>


        <Pressable
          disabled={saving || submitting}
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