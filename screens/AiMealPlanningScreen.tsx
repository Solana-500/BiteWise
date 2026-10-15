
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
  type AiMealPlanResponse,
} from '../services/aiMealPlanning'

export default function AiMealPlanningScreen() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AiMealPlanResponse | null>(null)

  async function handleGenerate() {
    if (loading) return

    setLoading(true)
    setResult(null)

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

            <Text style={styles.disclaimer}>
              {result.disclaimer}
            </Text>
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
