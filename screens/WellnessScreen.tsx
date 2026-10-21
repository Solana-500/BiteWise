import { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import {
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { CompositeNavigationProp } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../services/supabase'
import PremiumUpsellCard from '../context/PremiumUpsellCard'
import type {
  ExerciseCategory,
  MainTabParamList,
  RootStackParamList,
} from '../types/navigation'

type WellnessNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Wellness'>,
  NativeStackNavigationProp<RootStackParamList>
>

type WaterLog = {
  id: string
  amount_ml: number | null
  logged_at: string
}

type ExerciseLog = {
  id: string
  exercise_type: string
  activity_name: string | null
  duration_minutes: number | null
  duration_seconds: number | null
  distance_km: number | null
  pace_seconds_per_km: number | null
  sets: number | null
  repetitions_per_set: number | null
  weight_kg: number | null
  calories_burned: number | null
  logged_at: string
}

type SavedRoutine = {
  id: string
  routine_name: string
  created_at: string
  workout_routine_exercises: Array<{
    id: string
    exercise_name: string
    exercise_order: number
  }>
}

const EXERCISE_CATEGORIES: ExerciseCategory[] = [
  'Cardio',
  'Strength',
  'Workout Routines',
]

const DAILY_WATER_TARGET = 2500
const WATER_STEP = 500

function getSafeAmount(value: string) {
  const parsedValue = Number(value)
  if (!Number.isFinite(parsedValue) || parsedValue < 0) return 0
  return Math.round(parsedValue)
}

function getSafeInteger(value: string) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) return 0
  return parsed
}

function getSafeDecimal(value: string) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return 0
  return parsed
}

function formatNumber(value: number | null) {
  const num = Number(value ?? 0)
  if (!Number.isFinite(num)) return '0'
  return Number.isInteger(num) ? String(num) : num.toFixed(1)
}

function formatExerciseDate(dateString: string) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(dateString))
}

function formatPace(secondsPerKm: number | null) {
  if (!secondsPerKm || secondsPerKm <= 0) return '—'
  const min = Math.floor(secondsPerKm / 60)
  const sec = Math.round(secondsPerKm % 60)
  return `${min}:${String(sec).padStart(2, '0')} min/km`
}

function getTodayRange() {
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return {
    startOfDay: startOfDay.toISOString(),
    startOfTomorrow: startOfTomorrow.toISOString(),
  }
}

  export default function WellnessScreen() {
  const navigation = useNavigation<WellnessNavigationProp>()

  // Water State
  const [waterToday, setWaterToday] = useState(0)
  const [amountInput, setAmountInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // Exercise Category Menu State
  const [exerciseCategory, setExerciseCategory] = useState<ExerciseCategory | null>(null)
  const [showExerciseMenu, setShowExerciseMenu] = useState(false)

  // Combined History States
  const [selectedHistoryTab, setSelectedHistoryTab] = useState<ExerciseCategory>('Strength')
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([])
  const [savedRoutines, setSavedRoutines] = useState<SavedRoutine[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Edit Single Log Modal State
  const [editingLog, setEditingLog] = useState<ExerciseLog | null>(null)
  const [editActivityName, setEditActivityName] = useState('')
  const [editSets, setEditSets] = useState('')
  const [editRepetitions, setEditRepetitions] = useState('')
  const [editWeightKg, setEditWeightKg] = useState('')
  const [editDistanceKm, setEditDistanceKm] = useState('')
  const [editDurationMinutes, setEditDurationMinutes] = useState('')
  const [editCaloriesBurned, setEditCaloriesBurned] = useState('')
  const [updatingLog, setUpdatingLog] = useState(false)

  const [isPremium, setIsPremium] = useState(false)

  // --- DATA LOADING ---
  const loadWellnessData = useCallback(async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        setWaterToday(0)
        setExerciseLogs([])
        setSavedRoutines([])
        setIsPremium(false)
        return
      }

      const { startOfDay, startOfTomorrow } = getTodayRange()

      setLoadingHistory(true)

      const [waterRes, exerciseRes, routineRes, profileRes] = await Promise.all([
        supabase
          .from('water_logs')
          .select('id, amount_ml, logged_at')
          .eq('user_id', user.id)
          .gte('logged_at', startOfDay)
          .lt('logged_at', startOfTomorrow)
          .order('logged_at', { ascending: false }),

        supabase
          .from('exercise_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('logged_at', { ascending: false })
          .limit(30),

        supabase
          .from('workout_routines')
          .select(`
            id,
            routine_name,
            created_at,
            workout_routine_exercises (
              id,
              exercise_name,
              exercise_order
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),

          supabase
          .from('profiles')
          .select('subscription_tier')
          .eq('id', user.id)
          .single(),
      ])

          if (profileRes.error) {
            console.error(
              'Load Wellness subscription tier error:',
              profileRes.error
            )

            setIsPremium(false)
          } else {
            setIsPremium(profileRes.data?.subscription_tier === 'premium')
          }

      // 1. Water
      const totalWater = (waterRes.data ?? []).reduce(
        (total, log) => total + Number(log.amount_ml ?? 0),
        0
      )
      setWaterToday(Math.max(totalWater, 0))

      // 2. Exercises
      setExerciseLogs((exerciseRes.data ?? []) as ExerciseLog[])

      // 3. Routines
      const formattedRoutines = (routineRes.data ?? []).map((routine) => ({
        ...routine,
        workout_routine_exercises: (routine.workout_routine_exercises ?? []).sort(
          (a, b) => a.exercise_order - b.exercise_order
        ),
      }))
      setSavedRoutines(formattedRoutines as SavedRoutine[])
    } catch (error: any) {
      console.error('Load wellness error:', error)
    } finally {
      setLoading(false)
      setLoadingHistory(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      void loadWellnessData()
    }, [loadWellnessData])
  )

  async function handleRefresh() {
    setRefreshing(true)
    await loadWellnessData()
    setRefreshing(false)
  }

  // --- WATER HANDLERS ---
  async function saveWater() {
    const amount = getSafeAmount(amountInput)
    if (amount <= 0) {
      Alert.alert('Enter an amount', 'Enter a water amount greater than 0 ml before saving.')
      return
    }

    try {
      setSaving(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase.from('water_logs').insert({
        user_id: user.id,
        amount_ml: amount,
      })
      if (error) throw error

      setAmountInput('')
      await loadWellnessData()
      Alert.alert('Water logged', `${amount.toLocaleString()} ml was added.`)
    } catch (error: any) {
      Alert.alert('Could not save water', error?.message)
    } finally {
      setSaving(false)
    }
  }

  async function addWaterInstantly() {
    try {
      setSaving(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase.from('water_logs').insert({
        user_id: user.id,
        amount_ml: WATER_STEP,
      })
      if (error) throw error
      await loadWellnessData()
    } catch (error: any) {
      Alert.alert('Could not add water', error?.message)
    } finally {
      setSaving(false)
    }
  }

  async function removeWaterInstantly() {
    if (waterToday <= 0) {
      Alert.alert('No water to remove', 'Your water intake is already 0 ml.')
      return
    }

    try {
      setSaving(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { startOfDay, startOfTomorrow } = getTodayRange()
      const { data: todayLogs } = await supabase
        .from('water_logs')
        .select('id, amount_ml')
        .eq('user_id', user.id)
        .gte('logged_at', startOfDay)
        .lt('logged_at', startOfTomorrow)
        .order('logged_at', { ascending: false })

      if (!todayLogs || todayLogs.length === 0) return

      let remaining = Math.min(WATER_STEP, waterToday)
      for (const log of todayLogs) {
        if (remaining <= 0) break
        const amt = Number(log.amount_ml ?? 0)
        if (amt <= 0) continue

        if (amt <= remaining) {
          await supabase.from('water_logs').delete().eq('id', log.id).eq('user_id', user.id)
          remaining -= amt
        } else {
          await supabase
            .from('water_logs')
            .update({ amount_ml: amt - remaining })
            .eq('id', log.id)
            .eq('user_id', user.id)
          remaining = 0
        }
      }
      await loadWellnessData()
    } catch (error: any) {
      Alert.alert('Could not remove water', error?.message)
    } finally {
      setSaving(false)
    }
  }

  // --- EXERCISE ACTIONS ---
  function chooseExerciseCategory(cat: ExerciseCategory) {
    setExerciseCategory(cat)
    setShowExerciseMenu(false)

    if (cat === 'Workout Routines') {
      navigation.navigate('WorkoutRoutineBuilder')
      return
    }

    navigation.navigate('ExerciseLibrary', { category: cat })
  }

  // Edit / Delete single Exercise Log
  function openEditExercise(log: ExerciseLog) {
    setEditingLog(log)
    setEditActivityName(log.activity_name || log.exercise_type || '')
    setEditSets(log.sets ? String(log.sets) : '')
    setEditRepetitions(log.repetitions_per_set ? String(log.repetitions_per_set) : '')
    setEditWeightKg(log.weight_kg ? String(log.weight_kg) : '')
    setEditDistanceKm(log.distance_km ? String(log.distance_km) : '')
    setEditDurationMinutes(log.duration_minutes ? String(log.duration_minutes) : '')
    setEditCaloriesBurned(log.calories_burned ? String(log.calories_burned) : '')
  }

  async function updateExerciseLog() {
    if (!editingLog) return

    try {
      setUpdatingLog(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const isCardio = editingLog.distance_km !== null || editingLog.pace_seconds_per_km !== null

      let paceSeconds = editingLog.pace_seconds_per_km
      const dist = editDistanceKm.trim() ? getSafeDecimal(editDistanceKm) : null
      const durMin = editDurationMinutes.trim() ? getSafeInteger(editDurationMinutes) : null

      if (isCardio && dist && durMin && dist > 0 && durMin > 0) {
        paceSeconds = Math.round((durMin * 60) / dist)
      }

      const { error } = await supabase
        .from('exercise_logs')
        .update({
          activity_name: editActivityName.trim() || editingLog.exercise_type,
          sets: editSets.trim() ? getSafeInteger(editSets) : null,
          repetitions_per_set: editRepetitions.trim() ? getSafeInteger(editRepetitions) : null,
          weight_kg: editWeightKg.trim() ? getSafeDecimal(editWeightKg) : null,
          distance_km: dist,
          duration_minutes: durMin,
          pace_seconds_per_km: paceSeconds,
          calories_burned: editCaloriesBurned.trim() ? getSafeDecimal(editCaloriesBurned) : null,
        })
        .eq('id', editingLog.id)
        .eq('user_id', user.id)

      if (error) throw error

      setEditingLog(null)
      await loadWellnessData()
      Alert.alert('Updated', 'Your exercise record has been updated.')
    } catch (error: any) {
      Alert.alert('Could not update', error?.message)
    } finally {
      setUpdatingLog(false)
    }
  }

  function confirmDeleteExercise(log: ExerciseLog) {
    Alert.alert(
      'Delete Exercise Record?',
      `Remove "${log.activity_name || log.exercise_type}" from your history?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            await supabase.from('exercise_logs').delete().eq('id', log.id).eq('user_id', user.id)
            await loadWellnessData()
          },
        },
      ]
    )
  }

  // Delete saved routine
  function confirmDeleteRoutine(routine: SavedRoutine) {
    Alert.alert(
      'Delete Routine?',
      `Remove "${routine.routine_name}" and its exercises?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            await supabase.from('workout_routines').delete().eq('id', routine.id).eq('user_id', user.id)
            await loadWellnessData()
          },
        },
      ]
    )
  }

  // Filter lists by category
  const strengthHistory = useMemo(() => {
    return exerciseLogs.filter((log) => log.sets !== null || log.weight_kg !== null)
  }, [exerciseLogs])

  const cardioHistory = useMemo(() => {
    return exerciseLogs.filter((log) => log.distance_km !== null || log.pace_seconds_per_km !== null)
  }, [exerciseLogs])

  const waterProgress = Math.min(waterToday / DAILY_WATER_TARGET, 1)

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E5C35" />
      </View>
    )
  }

  function goHome() {
    const routeNames: string[] = navigation.getState().routeNames

    if (routeNames.includes('PremiumTabs') || routeNames.includes('PuHome')) {
      navigation.navigate('PremiumTabs', {
        screen: 'PuHome',
      })
      return
    }

    if (routeNames.includes('MainTabs') || routeNames.includes('Home')) {
      navigation.navigate('MainTabs', {
        screen: 'Home',
        params: {
          screen: 'HomeMain',
        },
      })
      return
    }

    navigation.goBack()
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#1E5C35"
          />
        }
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backHomeButton}
            onPress={goHome}
            accessibilityRole="button"
            accessibilityLabel="Go to Home"
          >
            <Text style={styles.backHomeText}>‹ Home</Text>
          </TouchableOpacity>

          <Text style={styles.topBarTitle}>Wellness</Text>

          <TouchableOpacity
            style={[styles.saveTopButton, saving && styles.saveTopButtonDisabled]}
            disabled={saving}
            onPress={() => void saveWater()}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveTopButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>Log Water Intake</Text>
        <Text style={styles.screenSubtitle}>Keep your hydration habits on track.</Text>

        {/* Water Card */}
        <View style={styles.card}>
          <View style={styles.waterIconCircle}>
            <Text style={styles.waterIcon}>💧</Text>
          </View>
          <Text style={styles.cardTitle}>Today&apos;s Water</Text>
          <Text style={styles.amount}>{waterToday.toLocaleString()} ml</Text>
          <Text style={styles.subtitle}>
            Daily target: {DAILY_WATER_TARGET.toLocaleString()} ml
          </Text>

          <View style={styles.progressBackground}>
            <View style={[styles.progressFill, { width: `${waterProgress * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {Math.round(waterProgress * 100)}% of your daily goal
          </Text>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.amountInput}
              value={amountInput}
              onChangeText={setAmountInput}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor="#97A89D"
              returnKeyType="done"
              maxLength={5}
            />
            <Text style={styles.unitText}>ml</Text>
          </View>

          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.waterButton, styles.removeButton, saving && styles.waterButtonDisabled]}
              disabled={saving}
              onPress={() => void removeWaterInstantly()}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#1E5C35" />
              ) : (
                <Text style={styles.removeButtonText}>−500 ml</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.waterButton, styles.addButton, saving && styles.waterButtonDisabled]}
              disabled={saving}
              onPress={() => void addWaterInstantly()}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.addButtonText}>+500 ml</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Log Exercise Launcher */}
        <Text style={styles.wellnessSectionTitle}>Log Exercise</Text>
        <View style={styles.exerciseCard}>
          <Text style={styles.exerciseHeading}>Choose an exercise category</Text>
          <TouchableOpacity
            style={styles.exerciseDropdown}
            onPress={() => setShowExerciseMenu(true)}
          >
            <Text style={[styles.exerciseDropdownText, !exerciseCategory && styles.exerciseDropdownPlaceholder]}>
              {exerciseCategory || 'Select exercise category...'}
            </Text>
            <Text style={styles.exerciseDropdownArrow}>⌄</Text>
          </TouchableOpacity>
          <Text style={styles.exerciseHelperText}>
            Choose Cardio, Strength, or Workout Routines to log new activity.
          </Text>
        </View>

        {/* --- 3-CATEGORY EXERCISE HISTORY SECTION --- */}
        <Text style={styles.wellnessSectionTitle}>Activity & Exercise History</Text>
        
        {/* Category Pill Tabs */}
        <View style={styles.historyTabsRow}>
          {EXERCISE_CATEGORIES.map((categoryTab) => {
            const isActive = selectedHistoryTab === categoryTab
            return (
              <TouchableOpacity
                key={categoryTab}
                style={[styles.historyTabPill, isActive && styles.historyTabPillActive]}
                onPress={() => setSelectedHistoryTab(categoryTab)}
              >
                <Text style={[styles.historyTabPillText, isActive && styles.historyTabPillTextActive]}>
                  {categoryTab}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* History Content */}
        {loadingHistory ? (
          <View style={styles.historyStateCard}>
            <ActivityIndicator size="small" color="#1E5C35" />
            <Text style={styles.historyStateText}>Loading activity history...</Text>
          </View>
        ) : selectedHistoryTab === 'Strength' ? (
          strengthHistory.length === 0 ? (
            <View style={styles.historyStateCard}>
              <Text style={styles.emptyText}>No strength workouts logged yet.</Text>
            </View>
          ) : (
            <View style={styles.historyCardContainer}>
              {strengthHistory.map((log) => (
                <View key={log.id} style={styles.historyRow}>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyName}>{log.activity_name || log.exercise_type}</Text>
                    <Text style={styles.historyMeta}>
                      {log.sets ? `${log.sets} sets` : ''}
                      {log.repetitions_per_set ? ` × ${log.repetitions_per_set} reps` : ''}
                      {log.weight_kg ? ` · ${formatNumber(log.weight_kg)} kg` : ''}
                    </Text>
                    <Text style={styles.historyDate}>Logged {formatExerciseDate(log.logged_at)}</Text>
                  </View>
                  <View style={styles.historyActions}>
                    <TouchableOpacity style={styles.editBtn} onPress={() => openEditExercise(log)}>
                      <Text style={styles.editBtnText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => confirmDeleteExercise(log)}>
                      <Text style={styles.deleteBtnText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )
        ) : selectedHistoryTab === 'Cardio' ? (
          cardioHistory.length === 0 ? (
            <View style={styles.historyStateCard}>
              <Text style={styles.emptyText}>No cardio activities logged yet.</Text>
            </View>
          ) : (
            <View style={styles.historyCardContainer}>
              {cardioHistory.map((log) => (
                <View key={log.id} style={styles.historyRow}>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyName}>{log.activity_name || log.exercise_type}</Text>
                    <Text style={styles.historyMeta}>
                      {log.distance_km ? `${formatNumber(log.distance_km)} km` : ''}
                      {log.duration_minutes ? ` · ${log.duration_minutes} min` : ''}
                      {log.pace_seconds_per_km ? ` · Pace: ${formatPace(log.pace_seconds_per_km)}` : ''}
                    </Text>
                    <Text style={styles.historyDate}>Logged {formatExerciseDate(log.logged_at)}</Text>
                  </View>
                  <View style={styles.historyActions}>
                    <TouchableOpacity style={styles.editBtn} onPress={() => openEditExercise(log)}>
                      <Text style={styles.editBtnText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => confirmDeleteExercise(log)}>
                      <Text style={styles.deleteBtnText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )
        ) : (
          /* Workout Routines History */
          savedRoutines.length === 0 ? (
            <View style={styles.historyStateCard}>
              <Text style={styles.emptyText}>No workout routines created yet.</Text>
            </View>
          ) : (
            <View style={styles.historyCardContainer}>
              {savedRoutines.map((routine) => (
                <View key={routine.id} style={styles.historyRow}>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyName}>{routine.routine_name}</Text>
                    <Text style={styles.historyMeta}>
                      {routine.workout_routine_exercises.length}{' '}
                      {routine.workout_routine_exercises.length === 1 ? 'exercise' : 'exercises'}
                    </Text>
                    <Text style={styles.historySubDetail}>
                      {routine.workout_routine_exercises.map((e) => e.exercise_name).join(' → ')}
                    </Text>
                    <Text style={styles.historyDate}>Created {formatExerciseDate(routine.created_at)}</Text>
                  </View>
                  <View style={styles.historyActions}>
                    <TouchableOpacity
                      style={styles.editBtn}
                      onPress={() => navigation.navigate('WorkoutRoutineBuilder')}
                    >
                      <Text style={styles.editBtnText}>Open</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => confirmDeleteRoutine(routine)}>
                      <Text style={styles.deleteBtnText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )
        )}

        {/* Sync Device Card */}
        <Text style={styles.wellnessSectionTitle}>Sync From Device</Text>
        <View style={styles.syncCard}>
          <View style={styles.syncTopRow}>
            <View style={styles.deviceIconCircle}>
              <Text style={styles.deviceIcon}>⌚</Text>
            </View>
            <View style={styles.syncTextArea}>
              <Text style={styles.syncCardTitle}>Connected Device</Text>
              <Text style={styles.syncCardSubtitle}>No activity device synced yet.</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.syncButton}
            onPress={() =>
              Alert.alert(
                'Sync from device',
                'Device sync is not connected yet. You can add Apple Health, Google Fit, Fitbit, or Garmin integration later.'
              )
            }
          >
            <Text style={styles.syncButtonText}>Connect a Device</Text>
          </TouchableOpacity>
        </View>
        {!isPremium ? (
          <PremiumUpsellCard
            onPress={() => navigation.navigate('SubPremium')}
          />
        ) : null}
      </ScrollView>

      {/* --- CATEGORY PICKER MODAL --- */}
      <Modal
        visible={showExerciseMenu}
        transparent
        animationType="slide"
        onRequestClose={() => setShowExerciseMenu(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.exerciseMenu}>
            <View style={styles.exerciseMenuHeader}>
              <Text style={styles.exerciseMenuTitle}>Add Exercise</Text>
              <TouchableOpacity
                style={styles.closeMenuButton}
                onPress={() => setShowExerciseMenu(false)}
              >
                <Text style={styles.closeMenuText}>×</Text>
              </TouchableOpacity>
            </View>

            {EXERCISE_CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category}
                style={styles.exerciseCategoryOption}
                onPress={() => chooseExerciseCategory(category)}
              >
                <Text style={styles.exerciseCategoryOptionText}>{category}</Text>
                <Text style={styles.exerciseCategoryArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* --- EDIT EXERCISE MODAL --- */}
      <Modal
        visible={editingLog !== null}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!updatingLog) setEditingLog(null)
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalKeyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.editModal}>
              <View style={styles.editModalHeader}>
                <Text style={styles.editModalTitle}>Edit Logged Exercise</Text>
                <TouchableOpacity
                  disabled={updatingLog}
                  onPress={() => setEditingLog(null)}
                >
                  <Text style={styles.closeMenuText}>×</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={styles.fieldLabel}>Activity Name</Text>
                <TextInput
                  style={styles.editInput}
                  value={editActivityName}
                  onChangeText={setEditActivityName}
                  placeholder="Exercise Name"
                  placeholderTextColor="#97A89D"
                  editable={!updatingLog}
                />

                {editingLog?.distance_km !== null || editingLog?.pace_seconds_per_km !== null ? (
                  <>
                    <Text style={styles.fieldLabel}>Distance (km)</Text>
                    <TextInput
                      style={styles.editInput}
                      value={editDistanceKm}
                      onChangeText={setEditDistanceKm}
                      keyboardType="decimal-pad"
                      placeholder="e.g. 5"
                      placeholderTextColor="#97A89D"
                      editable={!updatingLog}
                    />

                    <Text style={styles.fieldLabel}>Duration (minutes)</Text>
                    <TextInput
                      style={styles.editInput}
                      value={editDurationMinutes}
                      onChangeText={setEditDurationMinutes}
                      keyboardType="number-pad"
                      placeholder="e.g. 30"
                      placeholderTextColor="#97A89D"
                      editable={!updatingLog}
                    />
                  </>
                ) : (
                  <>
                    <Text style={styles.fieldLabel}>Sets</Text>
                    <TextInput
                      style={styles.editInput}
                      value={editSets}
                      onChangeText={setEditSets}
                      keyboardType="number-pad"
                      placeholder="e.g. 3"
                      placeholderTextColor="#97A89D"
                      editable={!updatingLog}
                    />

                    <Text style={styles.fieldLabel}>Repetitions per set</Text>
                    <TextInput
                      style={styles.editInput}
                      value={editRepetitions}
                      onChangeText={setEditRepetitions}
                      keyboardType="number-pad"
                      placeholder="e.g. 10"
                      placeholderTextColor="#97A89D"
                      editable={!updatingLog}
                    />

                    <Text style={styles.fieldLabel}>Weight (kg)</Text>
                    <TextInput
                      style={styles.editInput}
                      value={editWeightKg}
                      onChangeText={setEditWeightKg}
                      keyboardType="decimal-pad"
                      placeholder="e.g. 40"
                      placeholderTextColor="#97A89D"
                      editable={!updatingLog}
                    />
                  </>
                )}

                <Text style={styles.fieldLabel}>Calories Burned</Text>
                <TextInput
                  style={styles.editInput}
                  value={editCaloriesBurned}
                  onChangeText={setEditCaloriesBurned}
                  keyboardType="decimal-pad"
                  placeholder="Optional"
                  placeholderTextColor="#97A89D"
                  editable={!updatingLog}
                />

                <TouchableOpacity
                  style={[styles.saveRoutineButton, updatingLog && styles.saveRoutineButtonDisabled]}
                  disabled={updatingLog}
                  onPress={() => void updateExerciseLog()}
                >
                  {updatingLog ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveRoutineButtonText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    alignItems: 'center',
    backgroundColor: '#F5FAF6',
    flex: 1,
    justifyContent: 'center',
  },
  safeArea: {
  backgroundColor: '#F5FAF6',
  flex: 1,
  },
  screen: {
    backgroundColor: '#F5FAF6',
    flex: 1,
  },
  container: {
  backgroundColor: '#F5FAF6',
  flexGrow: 1,
  padding: 20,
  paddingBottom: 40,
  paddingTop: 8,
},
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 40,
    justifyContent: 'space-between',
  },
  backHomeButton: {
    alignItems: 'flex-start',
    height: 40,
    justifyContent: 'center',
    width: 72,
  },
  backHomeText: {
    color: '#1E5C35',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
  },
  topBarTitle: {
    color: '#16281D',
    fontSize: 18,
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
  title: {
    color: '#16281D',
    fontSize: 26,
    fontWeight: '800',
    marginTop: 24,
    textAlign: 'center',
  },
  screenSubtitle: {
    color: '#5C7267',
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
  },
  card: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#DCE9E0',
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 24,
    padding: 20,
  },
  waterIconCircle: {
    alignItems: 'center',
    backgroundColor: '#D9ECDF',
    borderRadius: 44,
    height: 88,
    justifyContent: 'center',
    width: 88,
  },
  waterIcon: {
    fontSize: 46,
  },
  cardTitle: {
    color: '#16281D',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 14,
  },
  amount: {
    color: '#1E5C35',
    fontSize: 34,
    fontWeight: '800',
    marginTop: 8,
  },
  subtitle: {
    color: '#5C7267',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
    textAlign: 'center',
  },
  progressBackground: {
    backgroundColor: '#E2ECE6',
    borderRadius: 999,
    height: 10,
    marginTop: 18,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    backgroundColor: '#1E5C35',
    borderRadius: 999,
    height: '100%',
  },
  progressText: {
    color: '#708277',
    fontSize: 12,
    marginTop: 7,
  },
  inputRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  amountInput: {
    backgroundColor: '#F8FBF9',
    borderColor: '#1E5C35',
    borderRadius: 12,
    borderWidth: 1.5,
    color: '#16281D',
    fontSize: 26,
    fontWeight: '800',
    minWidth: 170,
    paddingHorizontal: 16,
    paddingVertical: 14,
    textAlign: 'center',
  },
  unitText: {
    color: '#1E5C35',
    fontSize: 20,
    fontWeight: '800',
    marginLeft: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    width: '100%',
  },
  waterButton: {
    alignItems: 'center',
    borderRadius: 12,
    flex: 1,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 10,
  },
  waterButtonDisabled: {
    opacity: 0.7,
  },
  addButton: {
    backgroundColor: '#1E5C35',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  removeButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#1E5C35',
    borderWidth: 1.5,
  },
  removeButtonText: {
    color: '#1E5C35',
    fontSize: 14,
    fontWeight: '800',
  },
  wellnessSectionTitle: {
    color: '#5C7267',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 24,
    textTransform: 'uppercase',
  },
  exerciseCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DCE9E0',
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  exerciseHeading: {
    color: '#16281D',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
  },
  exerciseDropdown: {
    alignItems: 'center',
    backgroundColor: '#F8FBF9',
    borderColor: '#C9DBD0',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: 14,
  },
  exerciseDropdownText: {
    color: '#16281D',
    fontSize: 14,
    fontWeight: '600',
  },
  exerciseDropdownPlaceholder: {
    color: '#97A89D',
    fontWeight: '400',
  },
  exerciseDropdownArrow: {
    color: '#1E5C35',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 22,
    marginTop: -4,
  },
  exerciseHelperText: {
    color: '#708277',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },
  syncCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DCE9E0',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
    padding: 20,
  },
  syncTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  deviceIconCircle: {
    alignItems: 'center',
    backgroundColor: '#D9ECDF',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    marginRight: 12,
    width: 48,
  },
  deviceIcon: {
    fontSize: 25,
  },
  syncTextArea: {
    flex: 1,
  },
  syncCardTitle: {
    color: '#16281D',
    fontSize: 14,
    fontWeight: '800',
  },
  syncCardSubtitle: {
    color: '#708277',
    fontSize: 12,
    marginTop: 4,
  },
  syncButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#1E5C35',
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: 'center',
    marginTop: 18,
    minHeight: 48,
  },
  syncButtonText: {
    color: '#1E5C35',
    fontSize: 13,
    fontWeight: '800',
  },

  /* HISTORY STYLES */
  historyTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  historyTabPill: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DCE9E0',
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  historyTabPillActive: {
    backgroundColor: '#1E5C35',
    borderColor: '#1E5C35',
  },
  historyTabPillText: {
    color: '#5C7267',
    fontSize: 12,
    fontWeight: '800',
  },
  historyTabPillTextActive: {
    color: '#FFFFFF',
  },
  historyStateCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2ECE6',
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  historyStateText: {
    color: '#5C7267',
    fontSize: 13,
    marginTop: 8,
  },
  emptyText: {
    color: '#708277',
    fontSize: 13,
    textAlign: 'center',
  },
  historyCardContainer: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2ECE6',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  historyRow: {
    borderBottomColor: '#E2ECE6',
    borderBottomWidth: 1,
    padding: 14,
  },
  historyInfo: {
    marginBottom: 10,
  },
  historyName: {
    color: '#16281D',
    fontSize: 14,
    fontWeight: '800',
  },
  historyMeta: {
    color: '#1E5C35',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  historySubDetail: {
    color: '#5C7267',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 5,
  },
  historyDate: {
    color: '#708277',
    fontSize: 11,
    marginTop: 4,
  },
  historyActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editBtn: {
    alignItems: 'center',
    backgroundColor: '#EAF3EC',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 32,
    paddingHorizontal: 12,
  },
  editBtnText: {
    color: '#1E5C35',
    fontSize: 12,
    fontWeight: '800',
  },
  deleteBtn: {
    alignItems: 'center',
    backgroundColor: '#FDE3E3',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 32,
    paddingHorizontal: 12,
  },
  deleteBtnText: {
    color: '#B3261E',
    fontSize: 12,
    fontWeight: '800',
  },

  /* MODAL STYLES */
  modalBackdrop: {
    backgroundColor: 'rgba(22, 40, 29, 0.45)',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  exerciseMenu: {
    backgroundColor: '#F5FAF6',
    borderColor: '#C9DBD0',
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
  },
  exerciseMenuHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  exerciseMenuTitle: {
    color: '#16281D',
    fontSize: 21,
    fontWeight: '800',
  },
  closeMenuButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  closeMenuText: {
    color: '#1E5C35',
    fontSize: 30,
    fontWeight: '300',
    lineHeight: 34,
  },
  exerciseCategoryOption: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#DCE9E0',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    minHeight: 60,
    paddingHorizontal: 22,
  },
  exerciseCategoryOptionText: {
    color: '#16281D',
    fontSize: 17,
    fontWeight: '800',
  },
  exerciseCategoryArrow: {
    color: '#1E5C35',
    fontSize: 30,
    fontWeight: '300',
    lineHeight: 32,
  },
  modalKeyboardView: {
    flex: 1,
  },
  editModal: {
    backgroundColor: '#F5FAF6',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: '90%',
    paddingBottom: 30,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  editModalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  editModalTitle: {
    color: '#16281D',
    fontSize: 18,
    fontWeight: '800',
  },
  fieldLabel: {
    color: '#16281D',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 6,
    marginTop: 10,
  },
  editInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#C9DBD0',
    borderRadius: 12,
    borderWidth: 1,
    color: '#16281D',
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  saveRoutineButton: {
    alignItems: 'center',
    backgroundColor: '#1E5C35',
    borderRadius: 12,
    justifyContent: 'center',
    marginTop: 18,
    minHeight: 50,
  },
  saveRoutineButtonDisabled: {
    opacity: 0.7,
  },
  saveRoutineButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
})
