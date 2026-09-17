import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'

import { supabase } from '../services/supabase'

type Props = {
  onComplete: () => void
}

const FITNESS_GOALS = [
  'Bodybuilding',
  'Power Lifting',
  'Hyrox',
  'Fat Loss',
  'Weight Gain',
  'Maintenance',
  'Weight Loss',
] as const

const ACTIVITY_LEVELS = [
  'Sedentary',
  'Lightly Active',
  'Moderately Active',
  'Very Active',
] as const

type FitnessGoal = (typeof FITNESS_GOALS)[number]
type ActivityLevel = (typeof ACTIVITY_LEVELS)[number]

export default function OnboardingScreen({ onComplete }: Props) {
  const [fullName, setFullName] = useState('')
  const [age, setAge] = useState('')
  const [sex, setSex] = useState<'Male' | 'Female'>('Male')
  const [heightCm, setHeightCm] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [activityLevel, setActivityLevel] =
    useState<ActivityLevel>('Moderately Active')
  const [fitnessGoal, setFitnessGoal] =
    useState<FitnessGoal>('Fat Loss')
  const [loading, setLoading] = useState(false)

  function calculateDailyCalories() {
    const numericAge = Number(age)
    const numericHeight = Number(heightCm)
    const numericWeight = Number(weightKg)

    const bmr =
      sex === 'Male'
        ? 10 * numericWeight + 6.25 * numericHeight - 5 * numericAge + 5
        : 10 * numericWeight + 6.25 * numericHeight - 5 * numericAge - 161

    const activityMultipliers: Record<ActivityLevel, number> = {
      Sedentary: 1.2,
      'Lightly Active': 1.375,
      'Moderately Active': 1.55,
      'Very Active': 1.725,
    }

    const maintenance =
      bmr * activityMultipliers[activityLevel]

    // Estimated calorie deficit for fat/weight loss goals.
    if (fitnessGoal === 'Fat Loss' || fitnessGoal === 'Weight Loss') {
      return Math.round(maintenance - 400)
    }

    // Estimated calorie surplus for muscle/weight-gain goals.
    if (
      fitnessGoal === 'Bodybuilding' ||
      fitnessGoal === 'Weight Gain'
    ) {
      return Math.round(maintenance + 250)
    }

    // Power Lifting, Hyrox, and Maintenance use maintenance calories.
    return Math.round(maintenance)
  }

  async function handleSaveProfile() {
    const trimmedFullName = fullName.trim()

    if (!trimmedFullName || !age || !heightCm || !weightKg) {
      Alert.alert(
        'Missing information',
        'Please enter your name, age, height, and weight.'
      )
      return
    }

    const numericAge = Number(age)
    const numericHeight = Number(heightCm)
    const numericWeight = Number(weightKg)

    if (
      !Number.isFinite(numericAge) ||
      !Number.isFinite(numericHeight) ||
      !Number.isFinite(numericWeight) ||
      numericAge <= 0 ||
      numericHeight <= 0 ||
      numericWeight <= 0
    ) {
      Alert.alert(
        'Invalid values',
        'Age, height, and weight must be positive numbers.'
      )
      return
    }

    try {
      setLoading(true)

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      console.log('Onboarding auth user:', user)
      console.log('Onboarding auth error:', userError)

      if (userError || !user) {
        Alert.alert(
          'Login required',
          'Your session is invalid or expired. Please log in again.'
        )
        return
      }

      const dailyCalorieTarget = calculateDailyCalories()

      const { data, error } = await supabase
        .from('profiles')
        .upsert(
          {
            id: user.id,
            full_name: trimmedFullName,
            age: numericAge,
            sex,
            height_cm: numericHeight,
            weight_kg: numericWeight,
            activity_level: activityLevel,
            fitness_goal: fitnessGoal,
            daily_calorie_target: dailyCalorieTarget,
            tier: 'free',
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'id',
          }
        )
        .select()
        .single()

      console.log('Onboarding profile result:', data)
      console.log('Onboarding profile error:', error)

      if (error) {
        Alert.alert('Could not save profile', error.message)
        return
      }

      // App.tsx should switch from OnboardingScreen to the Main Tabs/Home.
      onComplete()
    } catch (error: any) {
      console.error('Onboarding save error:', error)

      Alert.alert(
        'Could not save profile',
        error?.message ?? 'Something went wrong. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.logo}>BiteWise</Text>

      <Text style={styles.title}>Set up your profile</Text>

      <Text style={styles.subtitle}>
        We will use this information to create an estimated nutrition target.
      </Text>

      <Text style={styles.label}>Full name</Text>
      <TextInput
        autoCapitalize="words"
        editable={!loading}
        onChangeText={setFullName}
        placeholder="e.g. Edmund Koh"
        placeholderTextColor="#8B9B90"
        style={styles.input}
        value={fullName}
      />

      <Text style={styles.label}>Age</Text>
      <TextInput
        editable={!loading}
        keyboardType="number-pad"
        onChangeText={setAge}
        placeholder="e.g. 22"
        placeholderTextColor="#8B9B90"
        style={styles.input}
        value={age}
      />

      <Text style={styles.label}>Sex</Text>
      <View style={styles.optionRow}>
        {(['Male', 'Female'] as const).map((option) => (
          <TouchableOpacity
            key={option}
            disabled={loading}
            onPress={() => setSex(option)}
            style={[
              styles.optionButton,
              sex === option && styles.optionButtonSelected,
            ]}
          >
            <Text
              style={[
                styles.optionText,
                sex === option && styles.optionTextSelected,
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Height (cm)</Text>
      <TextInput
        editable={!loading}
        keyboardType="decimal-pad"
        onChangeText={setHeightCm}
        placeholder="e.g. 171"
        placeholderTextColor="#8B9B90"
        style={styles.input}
        value={heightCm}
      />

      <Text style={styles.label}>Weight (kg)</Text>
      <TextInput
        editable={!loading}
        keyboardType="decimal-pad"
        onChangeText={setWeightKg}
        placeholder="e.g. 68"
        placeholderTextColor="#8B9B90"
        style={styles.input}
        value={weightKg}
      />

      <Text style={styles.label}>Activity level</Text>
      <View style={styles.optionWrap}>
        {ACTIVITY_LEVELS.map((option) => (
          <TouchableOpacity
            key={option}
            disabled={loading}
            onPress={() => setActivityLevel(option)}
            style={[
              styles.optionButton,
              activityLevel === option && styles.optionButtonSelected,
            ]}
          >
            <Text
              style={[
                styles.optionText,
                activityLevel === option && styles.optionTextSelected,
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Fitness goal</Text>
      <View style={styles.optionWrap}>
        {FITNESS_GOALS.map((option) => (
          <TouchableOpacity
            key={option}
            disabled={loading}
            onPress={() => setFitnessGoal(option)}
            style={[
              styles.optionButton,
              fitnessGoal === option && styles.optionButtonSelected,
            ]}
          >
            <Text
              style={[
                styles.optionText,
                fitnessGoal === option && styles.optionTextSelected,
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        disabled={loading}
        onPress={() => void handleSaveProfile()}
        style={[styles.saveButton, loading && styles.disabledButton]}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.saveButtonText}>Save Profile</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F5FAF6',
    flexGrow: 1,
    padding: 24,
    paddingBottom: 48,
    paddingTop: 56,
  },
  logo: {
    color: '#1E5C35',
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
  },
  title: {
    color: '#16281D',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 20,
    textAlign: 'center',
  },
  subtitle: {
    color: '#5C7267',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 28,
    marginTop: 8,
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
  optionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  optionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#C9DBD0',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  optionButtonSelected: {
    backgroundColor: '#1E5C35',
    borderColor: '#1E5C35',
  },
  optionText: {
    color: '#5C7267',
    fontSize: 13,
    fontWeight: '600',
  },
  optionTextSelected: {
    color: '#FFFFFF',
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: '#1E5C35',
    borderRadius: 10,
    justifyContent: 'center',
    marginTop: 32,
    minHeight: 52,
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
})