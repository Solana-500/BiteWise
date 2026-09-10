import { useEffect, useState } from 'react'
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { supabase } from '../services/supabase'

export default function MealsScreen() {
  const [foodName, setFoodName] = useState('')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedMessage, setSavedMessage] = useState('')

  useEffect(() => {
    console.log('MealsScreen opened')
  }, [])

  async function handleSaveMeal() {
    setSavedMessage('')

    if (!foodName || !calories || !protein || !carbs || !fat) {
      Alert.alert(
        'Missing information',
        'Please enter the food name, calories, protein, carbs, and fat.'
      )
      return
    }

    const calorieValue = Number(calories)
    const proteinValue = Number(protein)
    const carbsValue = Number(carbs)
    const fatValue = Number(fat)

    if (
      !Number.isFinite(calorieValue) ||
      !Number.isFinite(proteinValue) ||
      !Number.isFinite(carbsValue) ||
      !Number.isFinite(fatValue)
    ) {
      Alert.alert(
        'Invalid values',
        'Calories and macros must be numbers.'
      )
      return
    }

    setSaving(true)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setSaving(false)
      Alert.alert('Login required', 'Please log in again.')
      return
    }

    const { error } = await supabase.from('food_logs').insert({
      user_id: user.id,
      food_name: foodName.trim(),
      calories: calorieValue,
      protein_g: proteinValue,
      carbs_g: carbsValue,
      fat_g: fatValue,
      meal_type: 'Meal',
    })

    setSaving(false)

    if (error) {
      console.error('Save meal error:', error.message)
      Alert.alert('Could not save meal', error.message)
      return
    }

    setSavedMessage('Meal saved successfully.')
    setFoodName('')
    setCalories('')
    setProtein('')
    setCarbs('')
    setFat('')

    Alert.alert('Success', 'Your meal was saved to Supabase.')
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Log Your Meal</Text>

      <Text style={styles.subtitle}>
        Enter the nutrition information for your meal.
      </Text>

      <Text style={styles.label}>Food name</Text>
      <TextInput
        value={foodName}
        onChangeText={setFoodName}
        placeholder="e.g. Chicken rice"
        placeholderTextColor="#8B9B90"
        style={styles.input}
      />

      <Text style={styles.label}>Calories (kcal)</Text>
      <TextInput
        value={calories}
        onChangeText={setCalories}
        placeholder="e.g. 520"
        placeholderTextColor="#8B9B90"
        keyboardType="decimal-pad"
        style={styles.input}
      />

      <Text style={styles.label}>Protein (g)</Text>
      <TextInput
        value={protein}
        onChangeText={setProtein}
        placeholder="e.g. 28"
        placeholderTextColor="#8B9B90"
        keyboardType="decimal-pad"
        style={styles.input}
      />

      <Text style={styles.label}>Carbohydrates (g)</Text>
      <TextInput
        value={carbs}
        onChangeText={setCarbs}
        placeholder="e.g. 61"
        placeholderTextColor="#8B9B90"
        keyboardType="decimal-pad"
        style={styles.input}
      />

      <Text style={styles.label}>Fat (g)</Text>
      <TextInput
        value={fat}
        onChangeText={setFat}
        placeholder="e.g. 18"
        placeholderTextColor="#8B9B90"
        keyboardType="decimal-pad"
        style={styles.input}
      />

      <TouchableOpacity
        onPress={handleSaveMeal}
        disabled={saving}
        style={[styles.saveButton, saving && styles.disabledButton]}
      >
        <Text style={styles.saveButtonText}>
          {saving ? 'Saving...' : 'Save Meal'}
        </Text>
      </TouchableOpacity>

      {savedMessage ? (
        <Text style={styles.successText}>{savedMessage}</Text>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F5FAF6',
    flexGrow: 1,
    padding: 24,
    paddingTop: 70,
  },
  title: {
    color: '#16281D',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: '#5C7267',
    fontSize: 15,
    marginBottom: 28,
    textAlign: 'center',
  },
  label: {
    color: '#16281D',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 7,
    marginTop: 14,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#C9DBD0',
    borderRadius: 10,
    borderWidth: 1,
    color: '#16281D',
    fontSize: 16,
    padding: 14,
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: '#1E5C35',
    borderRadius: 10,
    marginTop: 30,
    paddingVertical: 15,
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  successText: {
    color: '#1E5C35',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 18,
    textAlign: 'center',
  },
})