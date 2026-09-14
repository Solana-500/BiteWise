import { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RouteProp } from '@react-navigation/native'

import { supabase } from '../services/supabase'
import type { RootStackParamList } from '../types/navigation'

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ExerciseEntry'
>

type ExerciseEntryRouteProp = RouteProp<
  RootStackParamList,
  'ExerciseEntry'
>

function getPositiveInteger(value: string) {
  const parsedValue = Number(value)

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return 0
  }

  return parsedValue
}

function getNonNegativeInteger(value: string) {
  const parsedValue = Number(value)

  if (!Number.isInteger(parsedValue) || parsedValue < 0) {
    return 0
  }

  return parsedValue
}

function getPositiveDecimal(value: string) {
  const parsedValue = Number(value)

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return 0
  }

  return parsedValue
}

function getNonNegativeDecimal(value: string) {
  const parsedValue = Number(value)

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return 0
  }

  return parsedValue
}

function formatPace(secondsPerKm: number) {
  if (!Number.isFinite(secondsPerKm) || secondsPerKm <= 0) {
    return '—'
  }

  const minutes = Math.floor(secondsPerKm / 60)
  const seconds = Math.round(secondsPerKm % 60)

  return `${minutes}:${String(seconds).padStart(2, '0')} min/km`
}

export default function ExerciseEntryScreen() {
  const navigation = useNavigation<NavigationProp>()
  const route = useRoute<ExerciseEntryRouteProp>()

  const { exerciseName, exerciseType } = route.params

  const isCardio = exerciseType.toLowerCase() === 'cardio'

  const [activityName, setActivityName] = useState(exerciseName)

  const [sets, setSets] = useState('3')
  const [repetitions, setRepetitions] = useState('10')
  const [weightKg, setWeightKg] = useState('')

  const [distanceKm, setDistanceKm] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('')
  const [durationSeconds, setDurationSeconds] = useState('')

  const [caloriesBurned, setCaloriesBurned] = useState('')
  const [saving, setSaving] = useState(false)

  const calculatedPaceSeconds = useMemo(() => {
    const distance = getPositiveDecimal(distanceKm)
    const minutes = getNonNegativeInteger(durationMinutes)
    const seconds = getNonNegativeInteger(durationSeconds)

    const totalSeconds = minutes * 60 + seconds

    if (distance <= 0 || totalSeconds <= 0) {
      return 0
    }

    return Math.round(totalSeconds / distance)
  }, [distanceKm, durationMinutes, durationSeconds])

  async function saveExerciseEntry() {
    const finalActivityName = activityName.trim()

    if (!finalActivityName) {
      Alert.alert(
        'Activity name required',
        'Enter a name for this exercise.'
      )
      return
    }

    try {
      setSaving(true)

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        throw userError
      }

      if (!user) {
        Alert.alert('Login required', 'Please log in again.')
        return
      }

      const safeCaloriesBurned = caloriesBurned.trim()
        ? getNonNegativeDecimal(caloriesBurned)
        : null

      if (isCardio) {
        const safeDistanceKm = getPositiveDecimal(distanceKm)
        const safeMinutes = getNonNegativeInteger(durationMinutes)
        const safeSeconds = getNonNegativeInteger(durationSeconds)
        const totalDurationSeconds = safeMinutes * 60 + safeSeconds

        if (safeDistanceKm <= 0) {
          Alert.alert(
            'Distance required',
            'Enter a distance greater than 0 km.'
          )
          return
        }

        if (totalDurationSeconds <= 0) {
          Alert.alert(
            'Time required',
            'Enter a duration greater than 0.'
          )
          return
        }

        const { error } = await supabase.from('exercise_logs').insert({
          user_id: user.id,
          exercise_type: exerciseName,
          activity_name: finalActivityName,
          duration_minutes: Math.max(1, Math.round(totalDurationSeconds / 60)),
          duration_seconds: totalDurationSeconds,
          distance_km: safeDistanceKm,
          pace_seconds_per_km: calculatedPaceSeconds,
          calories_burned: safeCaloriesBurned,
          sets: null,
          repetitions_per_set: null,
          weight_kg: null,
        })

        if (error) {
          throw error
        }

        Alert.alert(
          'Cardio activity logged',
          `${finalActivityName} was added. Pace: ${formatPace(
            calculatedPaceSeconds
          )}.`,
          [
            {
              text: 'Done',
              onPress: () => navigation.popToTop(),
            },
          ]
        )

        return
      }

      const safeSets = getPositiveInteger(sets)
      const safeRepetitions = getPositiveInteger(repetitions)
      const safeWeightKg = weightKg.trim()
        ? getNonNegativeDecimal(weightKg)
        : null

      if (safeSets <= 0) {
        Alert.alert(
          'Sets required',
          'Enter a whole number of sets greater than 0.'
        )
        return
      }

      if (safeRepetitions <= 0) {
        Alert.alert(
          'Repetitions required',
          'Enter a whole number of repetitions greater than 0.'
        )
        return
      }

      const { error } = await supabase.from('exercise_logs').insert({
        user_id: user.id,
        exercise_type: exerciseName,
        activity_name: finalActivityName,
        duration_minutes: null,
        duration_seconds: null,
        distance_km: null,
        pace_seconds_per_km: null,
        sets: safeSets,
        repetitions_per_set: safeRepetitions,
        weight_kg: safeWeightKg,
        calories_burned: safeCaloriesBurned,
      })

      if (error) {
        throw error
      }

      Alert.alert(
        'Exercise logged',
        `${finalActivityName} has been added to your activity log.`,
        [
          {
            text: 'Done',
            onPress: () => navigation.popToTop(),
          },
        ]
      )
    } catch (error: any) {
      console.error('Save exercise entry error:', error)

      Alert.alert(
        'Could not log exercise',
        error?.message || 'Unable to save your exercise entry.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            disabled={saving}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backArrow}>‹</Text>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <Text style={styles.topBarTitle}>
            {isCardio ? 'Log Cardio' : 'Add Exercise'}
          </Text>

          <TouchableOpacity
            style={[
              styles.saveTopButton,
              saving && styles.saveTopButtonDisabled,
            ]}
            disabled={saving}
            onPress={() => void saveExerciseEntry()}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveTopButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.exerciseHeadingCard}>
            <Text style={styles.exerciseTypeText}>
              {isCardio ? 'CARDIO' : 'STRENGTH'}
            </Text>

            <Text style={styles.exerciseName}>{exerciseName}</Text>

            <Text style={styles.exerciseHint}>
              {isCardio
                ? 'Record your distance and time. Your pace is calculated automatically.'
                : 'Enter your completed sets, repetitions, and weight.'}
            </Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.fieldLabel}>
              {isCardio ? 'Activity Name' : 'Exercise Name'}
            </Text>

            <TextInput
              style={styles.input}
              value={activityName}
              onChangeText={setActivityName}
              placeholder={exerciseName}
              placeholderTextColor="#97A89D"
              editable={!saving}
            />

            {isCardio ? (
              <>
                <Text style={styles.fieldLabel}>Distance (km)</Text>

                <TextInput
                  style={styles.input}
                  value={distanceKm}
                  onChangeText={setDistanceKm}
                  keyboardType="decimal-pad"
                  placeholder="Example: 5"
                  placeholderTextColor="#97A89D"
                  editable={!saving}
                  maxLength={7}
                />

                <Text style={styles.fieldLabel}>Time</Text>

                <View style={styles.timeRow}>
                  <View style={styles.timeInputGroup}>
                    <TextInput
                      style={styles.timeInput}
                      value={durationMinutes}
                      onChangeText={setDurationMinutes}
                      keyboardType="number-pad"
                      placeholder="Minutes"
                      placeholderTextColor="#97A89D"
                      editable={!saving}
                      maxLength={4}
                    />

                    <Text style={styles.timeUnit}>min</Text>
                  </View>

                  <View style={styles.timeInputGroup}>
                    <TextInput
                      style={styles.timeInput}
                      value={durationSeconds}
                      onChangeText={setDurationSeconds}
                      keyboardType="number-pad"
                      placeholder="Seconds"
                      placeholderTextColor="#97A89D"
                      editable={!saving}
                      maxLength={2}
                    />

                    <Text style={styles.timeUnit}>sec</Text>
                  </View>
                </View>

                <View style={styles.paceCard}>
                  <Text style={styles.paceLabel}>Average Pace</Text>
                  <Text style={styles.paceValue}>
                    {formatPace(calculatedPaceSeconds)}
                  </Text>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.fieldLabel}>Number of Sets</Text>

                <TextInput
                  style={styles.input}
                  value={sets}
                  onChangeText={setSets}
                  keyboardType="number-pad"
                  placeholder="3"
                  placeholderTextColor="#97A89D"
                  editable={!saving}
                  maxLength={2}
                />

                <Text style={styles.fieldLabel}>Repetitions per Set</Text>

                <TextInput
                  style={styles.input}
                  value={repetitions}
                  onChangeText={setRepetitions}
                  keyboardType="number-pad"
                  placeholder="10"
                  placeholderTextColor="#97A89D"
                  editable={!saving}
                  maxLength={3}
                />

                <Text style={styles.fieldLabel}>Weight per Set (kg)</Text>

                <TextInput
                  style={styles.input}
                  value={weightKg}
                  onChangeText={setWeightKg}
                  keyboardType="decimal-pad"
                  placeholder="Optional, e.g. 40"
                  placeholderTextColor="#97A89D"
                  editable={!saving}
                  maxLength={7}
                />
              </>
            )}

            <Text style={styles.fieldLabel}>Calories Burned</Text>

            <TextInput
              style={styles.input}
              value={caloriesBurned}
              onChangeText={setCaloriesBurned}
              keyboardType="decimal-pad"
              placeholder="Optional"
              placeholderTextColor="#97A89D"
              editable={!saving}
              maxLength={6}
            />

            <Text style={styles.helperText}>
              {isCardio
                ? 'Pace is calculated from your distance and time. Calories are optional.'
                : 'Calories are optional for strength exercises.'}
            </Text>

            <TouchableOpacity
              style={[
                styles.saveButton,
                saving && styles.saveButtonDisabled,
              ]}
              disabled={saving}
              onPress={() => void saveExerciseEntry()}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {isCardio ? 'Log Cardio Activity' : 'Log Exercise'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F5FAF6',
    flex: 1,
  },

  keyboardView: {
    flex: 1,
  },

  topBar: {
    alignItems: 'center',
    borderBottomColor: '#DCE9E0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 14,
    paddingHorizontal: 20,
    paddingTop: 12,
  },

  backButton: {
    alignItems: 'center',
    flexDirection: 'row',
    minWidth: 72,
    paddingVertical: 8,
  },

  backArrow: {
    color: '#1E5C35',
    fontSize: 30,
    fontWeight: '300',
    lineHeight: 30,
    marginRight: 3,
  },

  backText: {
    color: '#1E5C35',
    fontSize: 14,
    fontWeight: '800',
  },

  topBarTitle: {
    color: '#16281D',
    fontSize: 20,
    fontWeight: '800',
  },

  saveTopButton: {
    alignItems: 'center',
    backgroundColor: '#1E5C35',
    borderRadius: 999,
    justifyContent: 'center',
    minHeight: 38,
    minWidth: 72,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },

  saveTopButtonDisabled: {
    opacity: 0.7,
  },

  saveTopButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  container: {
    padding: 20,
    paddingBottom: 40,
  },

  exerciseHeadingCard: {
    backgroundColor: '#EAF3EC',
    borderColor: '#C9DBD0',
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
  },

  exerciseTypeText: {
    color: '#1E5C35',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
  },

  exerciseName: {
    color: '#16281D',
    fontSize: 23,
    fontWeight: '800',
    marginTop: 7,
  },

  exerciseHint: {
    color: '#5C7267',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
  },

  formCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DCE9E0',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 16,
    padding: 20,
  },

  fieldLabel: {
    color: '#16281D',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 7,
    marginTop: 14,
  },

  input: {
    backgroundColor: '#F8FBF9',
    borderColor: '#C9DBD0',
    borderRadius: 12,
    borderWidth: 1,
    color: '#16281D',
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: 14,
  },

  timeRow: {
    flexDirection: 'row',
    gap: 10,
  },

  timeInputGroup: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
  },

  timeInput: {
    backgroundColor: '#F8FBF9',
    borderColor: '#C9DBD0',
    borderRadius: 12,
    borderWidth: 1,
    color: '#16281D',
    flex: 1,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: 12,
    textAlign: 'center',
  },

  timeUnit: {
    color: '#1E5C35',
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 7,
  },

  paceCard: {
    alignItems: 'center',
    backgroundColor: '#EAF3EC',
    borderColor: '#C9DBD0',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },

  paceLabel: {
    color: '#5C7267',
    fontSize: 13,
    fontWeight: '700',
  },

  paceValue: {
    color: '#1E5C35',
    fontSize: 17,
    fontWeight: '800',
  },

  helperText: {
    color: '#708277',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 14,
  },

  saveButton: {
    alignItems: 'center',
    backgroundColor: '#1E5C35',
    borderRadius: 12,
    justifyContent: 'center',
    marginTop: 22,
    minHeight: 52,
  },

  saveButtonDisabled: {
    opacity: 0.7,
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
})