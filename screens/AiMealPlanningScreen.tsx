
import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import {
  generateAiMealPlan,
  saveAiMealPlan,
  type AiMealPlanResponse,
} from '../services/aiMealPlanning'

export default function AiMealPlanningScreen() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AiMealPlanResponse | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedPlanId, setSavedPlanId] = useState<string | null>(null)
  
  async function handleGenerate() {
    if (loading) return

    setLoading(true)
    setResult(null)
    setSavedPlanId(null)
    
    try {
      const response = await generateAiMealPlan()
      setResult(response)
    } catch (error: any) {
      console.error('AI meal planning error:', error)
      Alert.alert(
        'Generation failed',
        error?.message || 'Unable to generate a meal plan.'
      )
    } finally {
      setLoading(false)
    }
  }

  
  async function handleSave() {
    if (!result || saving || savedPlanId) return
  
    try {
      setSaving(true)
  
      const planId = await saveAiMealPlan(result)
  
      setSavedPlanId(planId)
  
      Alert.alert(
        'Meal Plan Saved',
        'Your 7-day meal plan has been saved successfully.'
      )
    } catch (error: any) {
      Alert.alert(
        'Save Failed',
        error?.message || 'Unable to save your meal plan.'
      )
    } finally {
      setSaving(false)
    }
  }

  
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>AI Meal Planning</Text>

        <Text style={styles.subtitle}>
          Generate a personalised 7-day meal plan based on
          your fitness goals, calorie target, dietary
          preferences and allergies.
        </Text>

        <TouchableOpacity
          style={[styles.button, loading && styles.disabledButton]}
          disabled={loading}
          onPress={() => void handleGenerate()}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>
              Generate 7-Day Meal Plan
            </Text>
          )}
        </TouchableOpacity>

        {loading && (
          <Text style={styles.status}>
            Gemini is preparing your meal plan...
          </Text>
        )}

        {result && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>
              {result.mealPlan.title}
            </Text>

            <Text style={styles.resultText}>
              Daily target: {result.dailyCalorieTarget} kcal
            </Text>

            <Text style={styles.resultText}>
              Generated: {result.mealPlan.days.length} days
            </Text>

            <Text style={styles.successText}>
              Your meal plan was generated successfully!
            </Text>

            {result.mealPlan.days.map((day) => {
              const totalCalories = day.meals.reduce(
                (total, meal) => total + meal.calories,
                0
              )
            
              return (
                <View key={day.day} style={{ marginTop: 24 }}>
                  <Text
                    style={{
                      fontSize: 20,
                      fontWeight: '800',
                      color: '#1E5C35',
                      marginBottom: 10,
                    }}
                  >
                    Day {day.day} — {totalCalories} kcal
                  </Text>
            
                  {day.meals.map((meal, index) => (
                    <View
                      key={`${day.day}-${meal.type}-${index}`}
                      style={{
                        backgroundColor: '#F5FAF6',
                        borderRadius: 12,
                        padding: 16,
                        marginBottom: 12,
                        borderWidth: 1,
                        borderColor: '#DCE9DF',
                      }}
                    >
                      <Text style={{ fontWeight: '800', color: '#1E5C35' }}>
                        {meal.type}
                      </Text>
            
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: '700',
                          marginTop: 6,
                          color: '#16281D',
                        }}
                      >
                        {meal.name}
                      </Text>
            
                      <Text style={{ marginTop: 6 }}>
                        Serving: {meal.serving}
                      </Text>
            
                      <Text>
                        Calories: {meal.calories} kcal
                      </Text>
            
                      <Text>
                        Protein: {meal.protein}g | Carbs: {meal.carbs}g | Fat: {meal.fat}g
                      </Text>
            
                      <Text style={{ marginTop: 8, fontWeight: '700' }}>
                        Ingredients:
                      </Text>
            
                      <Text>{meal.ingredients.join(', ')}</Text>
                    </View>
                  ))}
                </View>
              )
            })}

            <Text style={styles.disclaimer}>
              {result.disclaimer}
            </Text>
            
            <TouchableOpacity
              style={[
                styles.button,
                { marginTop: 20 },
                (saving || savedPlanId !== null) && styles.disabledButton,
              ]}
              disabled={saving || savedPlanId !== null}
              onPress={() => void handleSave()}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>
                  {savedPlanId ? 'Meal Plan Saved ✓' : 'Save Meal Plan'}
                </Text>
              )}
            </TouchableOpacity>

          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5FAF6',
  },
  container: {
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1E5C35',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: '#5C7267',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#1E5C35',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  status: {
    textAlign: 'center',
    marginTop: 20,
    color: '#5C7267',
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#DCE9DF',
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E5C35',
    marginBottom: 12,
  },
  resultText: {
    fontSize: 14,
    color: '#294234',
    marginBottom: 8,
  },
  successText: {
    fontSize: 14,
    color: '#1E5C35',
    fontWeight: '700',
    marginTop: 12,
  },
  disclaimer: {
    fontSize: 12,
    color: '#708277',
    lineHeight: 18,
    marginTop: 16,
  },
})
