import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
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
  useRoute,
} from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RouteProp } from '@react-navigation/native'
import {
  searchExercises as searchExercisesFromServer
} from '../services/exerciseSearch'
import { supabase } from '../services/supabase'
import type {
  ExerciseCategory,
  RootStackParamList,
} from '../types/navigation'

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ExerciseLibrary'
>

type ExerciseLibraryRouteProp = RouteProp<
  RootStackParamList,
  'ExerciseLibrary'
>


type ExerciseOption = {
  id: string
  name: string
  type: string
  muscle: string
  equipment: string
  difficulty: string
  instructions: string
}

type ExerciseLog = {
  id: string
  exercise_type: string
  duration_minutes: number | null
  sets: number | null
  repetitions_per_set: number | null
  weight_kg: number | null
  calories_burned: number | null
  logged_at: string
}

const CARDIO_ACTIVITIES: ExerciseOption[] = [
  {
    id: 'running',
    name: 'Running',
    type: 'cardio',
    muscle: 'cardiovascular system',
    equipment: 'none',
    difficulty: 'intermediate',
    instructions: '',
  },
  {
    id: 'treadmill-running',
    name: 'Treadmill Running',
    type: 'cardio',
    muscle: 'cardiovascular system',
    equipment: 'treadmill',
    difficulty: 'intermediate',
    instructions: '',
  },
  {
    id: 'jogging',
    name: 'Jogging',
    type: 'cardio',
    muscle: 'cardiovascular system',
    equipment: 'none',
    difficulty: 'beginner',
    instructions: '',
  },
  {
    id: 'walking',
    name: 'Walking',
    type: 'cardio',
    muscle: 'cardiovascular system',
    equipment: 'none',
    difficulty: 'beginner',
    instructions: '',
  },
  {
    id: 'hiking',
    name: 'Hiking',
    type: 'cardio',
    muscle: 'cardiovascular system',
    equipment: 'none',
    difficulty: 'beginner',
    instructions: '',
  },
  {
    id: 'cycling',
    name: 'Cycling',
    type: 'cardio',
    muscle: 'cardiovascular system',
    equipment: 'bicycle',
    difficulty: 'intermediate',
    instructions: '',
  },
  {
    id: 'stationary-bike',
    name: 'Stationary Bike',
    type: 'cardio',
    muscle: 'cardiovascular system',
    equipment: 'stationary bike',
    difficulty: 'beginner',
    instructions: '',
  },
  {
    id: 'swimming',
    name: 'Swimming',
    type: 'cardio',
    muscle: 'full body',
    equipment: 'pool',
    difficulty: 'intermediate',
    instructions: '',
  },
  {
    id: 'rowing',
    name: 'Rowing',
    type: 'cardio',
    muscle: 'full body',
    equipment: 'rowing machine',
    difficulty: 'intermediate',
    instructions: '',
  },
  {
    id: 'elliptical',
    name: 'Elliptical',
    type: 'cardio',
    muscle: 'cardiovascular system',
    equipment: 'elliptical machine',
    difficulty: 'beginner',
    instructions: '',
  },
  {
    id: 'stair-climber',
    name: 'Stair Climber',
    type: 'cardio',
    muscle: 'quadriceps',
    equipment: 'stair climber',
    difficulty: 'intermediate',
    instructions: '',
  },
  {
    id: 'jump-rope',
    name: 'Jump Rope',
    type: 'cardio',
    muscle: 'calves',
    equipment: 'jump rope',
    difficulty: 'intermediate',
    instructions: '',
  },
  {
    id: 'hiit',
    name: 'HIIT Workout',
    type: 'cardio',
    muscle: 'full body',
    equipment: 'none',
    difficulty: 'advanced',
    instructions: '',
  },
  {
    id: 'dance-fitness',
    name: 'Dance Fitness',
    type: 'cardio',
    muscle: 'full body',
    equipment: 'none',
    difficulty: 'beginner',
    instructions: '',
  },
]

function mapCategoryToApiType(category: ExerciseCategory) {
  if (category === 'Cardio') {
    return 'cardio'
  }

  if (category === 'Strength') {
    return 'strength'
  }

  return undefined
}

function formatLabel(value: string) {
  if (!value) return 'Not specified'

  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function getSearchTerms(query: string) {
  const cleanedQuery = query.trim().toLowerCase()

  const normalizedWithSpaces = cleanedQuery
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const compactQuery = normalizedWithSpaces.replace(/\s+/g, '')

  const commonJoinedWords: Record<string, string> = {
    benchpress: 'bench press',
    tbar: 't bar',
    barbellrow: 'barbell row',
    cablefly: 'cable fly',
    pullup: 'pull up',
    pushup: 'push up',
    latpulldown: 'lat pulldown',
    legpress: 'leg press',
    shoulderpress: 'shoulder press',
  }

  const expandedQuery =
    commonJoinedWords[compactQuery] ?? normalizedWithSpaces

  const terms = Array.from(
    new Set([
      expandedQuery,
      expandedQuery.replace(/\s+/g, '-'),
      compactQuery,
      ...expandedQuery.split(' ').filter((word) => word.length >= 3),
    ])
  )

  return {
    compactQuery,
    expandedQuery,
    searchTerms: terms.slice(0, 4),
  }
}

function getSafeInteger(value: string) {
  const parsedValue = Number(value)

  if (!Number.isInteger(parsedValue) || parsedValue < 0) {
    return 0
  }

  return parsedValue
}

function getSafeDecimal(value: string) {
  const parsedValue = Number(value)

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return 0
  }

  return parsedValue
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

function formatNumber(value: number | null) {
  const numberValue = Number(value ?? 0)

  if (!Number.isFinite(numberValue)) {
    return '0'
  }

  return Number.isInteger(numberValue)
    ? String(numberValue)
    : numberValue.toFixed(1)
}

export default function ExerciseLibraryScreen() {
  const navigation = useNavigation<NavigationProp>()
  const route = useRoute<ExerciseLibraryRouteProp>()

  const { category } = route.params

  const [searchText, setSearchText] = useState('')
  const [exerciseResults, setExerciseResults] = useState<ExerciseOption[]>([])
  const [searchingExercises, setSearchingExercises] = useState(false)
  const [searchError, setSearchError] = useState('')

  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [historyError, setHistoryError] = useState('')

  const [editingLog, setEditingLog] = useState<ExerciseLog | null>(null)
  const [updatingLog, setUpdatingLog] = useState(false)

  const [editSets, setEditSets] = useState('')
  const [editRepetitions, setEditRepetitions] = useState('')
  const [editWeightKg, setEditWeightKg] = useState('')
  const [editCaloriesBurned, setEditCaloriesBurned] = useState('')
  const [editDuration, setEditDuration] = useState('')

  const loadExerciseHistory = useCallback(async () => {
    try {
      setLoadingHistory(true)
      setHistoryError('')

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        throw userError
      }

      if (!user) {
        setExerciseLogs([])
        return
      }

      const { data, error } = await supabase
        .from('exercise_logs')
        .select(
          'id, exercise_type, duration_minutes, sets, repetitions_per_set, weight_kg, calories_burned, logged_at'
        )
        .eq('user_id', user.id)
        .order('logged_at', { ascending: false })
        .limit(20)

      if (error) {
        throw error
      }

      setExerciseLogs((data ?? []) as ExerciseLog[])
    } catch (error: any) {
      console.error('Load exercise history error:', error)

      setHistoryError(
        error?.message || 'Unable to load exercise history.'
      )
    } finally {
      setLoadingHistory(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      void loadExerciseHistory()
    }, [loadExerciseHistory])
  )

  function searchCardioActivities(query: string) {
  const cleanedQuery = query.trim().toLowerCase()

  if (cleanedQuery.length === 0) {
    setExerciseResults(CARDIO_ACTIVITIES)
    setSearchError('')
    setSearchingExercises(false)
    return
  }

  const results = CARDIO_ACTIVITIES.filter((activity) => {
    const activityName = activity.name.toLowerCase()

    const compactActivityName = activityName.replace(/[\s-]/g, '')
    const compactQuery = cleanedQuery.replace(/[\s-]/g, '')

    return (
      activityName.includes(cleanedQuery) ||
      compactActivityName.includes(compactQuery)
    )
  })

  setExerciseResults(results)
  setSearchError('')
  setSearchingExercises(false)
}



const searchExercises = useCallback(
  async (query: string) => {
    const cleanedQuery = query.trim()

    if (cleanedQuery.length < 2) {
      setExerciseResults([])
      setSearchError('')
      setSearchingExercises(false)
      return
    }

    try {
      setSearchingExercises(true)
      setSearchError('')

      // Preserve existing search-term normalization.
      const { expandedQuery } = getSearchTerms(cleanedQuery)

      // Search through Supabase instead of calling API Ninjas.
      const results = await searchExercisesFromServer(expandedQuery)

      setExerciseResults(results)
    } catch (error: any) {
      console.error('Exercise search error:', error)

      setSearchError(
        error?.message ||
          'Unable to search exercises. Please try again.'
      )

      setExerciseResults([])
    } finally {
      setSearchingExercises(false)
    }
  },
  []
)


  const timer = setTimeout(() => {
    void searchExercises(searchText)
  }, 450)

  return () => clearTimeout(timer)
}, [category, searchExercises, searchText])

  function openEditExercise(log: ExerciseLog) {
    setEditingLog(log)

    setEditSets(
      log.sets === null || log.sets === undefined
        ? ''
        : String(log.sets)
    )

    setEditRepetitions(
      log.repetitions_per_set === null ||
        log.repetitions_per_set === undefined
        ? ''
        : String(log.repetitions_per_set)
    )

    setEditWeightKg(
      log.weight_kg === null || log.weight_kg === undefined
        ? ''
        : String(log.weight_kg)
    )

    setEditCaloriesBurned(
      log.calories_burned === null || log.calories_burned === undefined
        ? ''
        : String(log.calories_burned)
    )

    setEditDuration(
      log.duration_minutes === null ||
        log.duration_minutes === undefined
        ? ''
        : String(log.duration_minutes)
    )
  }

  async function updateExerciseLog() {
    if (!editingLog) return

    try {
      setUpdatingLog(true)

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

      const { error } = await supabase
        .from('exercise_logs')
        .update({
          duration_minutes: editDuration.trim()
            ? getSafeInteger(editDuration)
            : null,
          sets: editSets.trim() ? getSafeInteger(editSets) : null,
          repetitions_per_set: editRepetitions.trim()
            ? getSafeInteger(editRepetitions)
            : null,
          weight_kg: editWeightKg.trim()
            ? getSafeDecimal(editWeightKg)
            : null,
          calories_burned: editCaloriesBurned.trim()
            ? getSafeDecimal(editCaloriesBurned)
            : null,
        })
        .eq('id', editingLog.id)
        .eq('user_id', user.id)

      if (error) {
        throw error
      }

      setEditingLog(null)
      await loadExerciseHistory()

      Alert.alert('Exercise updated', 'Your exercise entry was updated.')
    } catch (error: any) {
      console.error('Update exercise error:', error)

      Alert.alert(
        'Could not update exercise',
        error?.message || 'Unable to update this exercise.'
      )
    } finally {
      setUpdatingLog(false)
    }
  }

  function confirmDeleteExercise(log: ExerciseLog) {
    Alert.alert(
      'Delete exercise?',
      `Remove "${log.exercise_type}" from your exercise history?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => void deleteExerciseLog(log.id),
        },
      ]
    )
  }

  async function deleteExerciseLog(logId: string) {
    try {
      setUpdatingLog(true)

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

      const { error } = await supabase
        .from('exercise_logs')
        .delete()
        .eq('id', logId)
        .eq('user_id', user.id)

      if (error) {
        throw error
      }

      setExerciseLogs((currentLogs) =>
        currentLogs.filter((log) => log.id !== logId)
      )
    } catch (error: any) {
      console.error('Delete exercise error:', error)

      Alert.alert(
        'Could not delete exercise',
        error?.message || 'Unable to delete this exercise.'
      )
    } finally {
      setUpdatingLog(false)
    }
  }

  function renderSearchEmptyState() {
    if (searchingExercises) {
      return (
        <View style={styles.emptyCard}>
          <ActivityIndicator size="small" color="#1E5C35" />

          <Text style={styles.searchStateText}>
            Searching exercises...
          </Text>
        </View>
      )
    }

    if (searchError) {
      return (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>{searchError}</Text>
        </View>
      )
    }

    if (category === 'Cardio' && searchText.trim().length === 0) {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyText}>
        Choose a cardio activity from the list above.
      </Text>
    </View>
  )
}

if (searchText.trim().length < 2) {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyText}>
        Type at least 2 letters to search exercises.
      </Text>
    </View>
  )
}
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyText}>
          No matching exercises found. Try “bench”, “row”, “squat”, or
          “running”.
        </Text>
      </View>
    )
  }

  function renderExerciseHistory() {
    if (loadingHistory) {
      return (
        <View style={styles.historyStateCard}>
          <ActivityIndicator size="small" color="#1E5C35" />

          <Text style={styles.searchStateText}>
            Loading your exercise history...
          </Text>
        </View>
      )
    }

    if (historyError) {
      return (
        <View style={styles.historyStateCard}>
          <Text style={styles.emptyText}>{historyError}</Text>
        </View>
      )
    }

    if (exerciseLogs.length === 0) {
      return (
        <View style={styles.historyStateCard}>
          <Text style={styles.emptyText}>
            No exercise entries yet.
          </Text>
        </View>
      )
    }

    return (
      <View style={styles.historyCard}>
        {exerciseLogs.map((log) => {
          const strengthDetails =
            log.sets && log.repetitions_per_set
              ? `${log.sets} sets × ${log.repetitions_per_set} reps`
              : null

          const weightDetails =
            log.weight_kg !== null && log.weight_kg !== undefined
              ? `${formatNumber(log.weight_kg)} kg`
              : null

          const durationDetails =
            log.duration_minutes !== null &&
            log.duration_minutes > 0
              ? `${log.duration_minutes} min`
              : null

          const caloriesDetails =
            log.calories_burned !== null &&
            log.calories_burned !== undefined &&
            log.calories_burned > 0
              ? `${formatNumber(log.calories_burned)} kcal`
              : null

          const details = [
            strengthDetails,
            weightDetails,
            durationDetails,
            caloriesDetails,
          ]
            .filter(Boolean)
            .join(' · ')

          return (
            <View key={log.id} style={styles.historyRow}>
              <View style={styles.historyInfo}>
                <Text style={styles.historyExerciseName}>
                  {log.exercise_type}
                </Text>

                <Text style={styles.historyMeta}>
                  {details || 'Exercise logged'}
                </Text>

                <Text style={styles.historyDate}>
                  Logged {formatExerciseDate(log.logged_at)}
                </Text>
              </View>

              <View style={styles.historyActions}>
                <TouchableOpacity
                  style={styles.editHistoryButton}
                  disabled={updatingLog}
                  onPress={() => openEditExercise(log)}
                >
                  <Text style={styles.editHistoryButtonText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteHistoryButton}
                  disabled={updatingLog}
                  onPress={() => confirmDeleteExercise(log)}
                >
                  <Text style={styles.deleteHistoryButtonText}>
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )
        })}
      </View>
    )
  }

  return (
    <>
      <SafeAreaView style={styles.screen}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.backButton}
              disabled={updatingLog}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backArrow}>‹</Text>
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>

            <Text style={styles.topBarTitle}>{category}</Text>

            <View style={styles.topBarSpacer} />
          </View>

          <FlatList
            data={exerciseResults}
            keyExtractor={(exercise) => exercise.id}
            contentContainerStyle={styles.screenContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <>
                <View style={styles.searchBox}>
                  <Text style={styles.searchIcon}>⌕</Text>

                  <TextInput
                    style={styles.searchInput}
                    value={searchText}
                    onChangeText={setSearchText}
                    placeholder="Search for an exercise"
                    placeholderTextColor="#97A89D"
                    autoCorrect={false}
                    autoCapitalize="words"
                    returnKeyType="search"
                  />

                  {searchText.length > 0 ? (
                    <TouchableOpacity
                      onPress={() => {
                        setSearchText('')
                        setExerciseResults([])
                        setSearchError('')
                      }}
                    >
                      <Text style={styles.clearText}>×</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                <Text style={styles.sectionTitle}>
                {category === 'Cardio' && searchText.trim().length === 0
                    ? 'Popular Cardio Activities'
                    : `Search ${category.toLowerCase()} exercises`}
                </Text>
              </>
            }
            ListEmptyComponent={renderSearchEmptyState}
            renderItem={({ item }) => {
              const metadata = [
                item.type && formatLabel(item.type),
                item.muscle && `Targets: ${formatLabel(item.muscle)}`,
                item.equipment &&
                  `Equipment: ${formatLabel(item.equipment)}`,
              ]
                .filter(Boolean)
                .join(' · ')

              return (
                <TouchableOpacity
                  style={styles.exerciseRow}
                  onPress={() =>
                    navigation.navigate('ExerciseEntry', {
                      exerciseName: item.name,
                      exerciseType: item.type || category,
                    })
                  }
                >
                  <View style={styles.exerciseRowText}>
                    <Text style={styles.exerciseName}>{item.name}</Text>

                    <Text style={styles.exerciseMeta} numberOfLines={2}>
                      {metadata || 'Tap to log this exercise'}
                    </Text>
                  </View>

                  <Text style={styles.exerciseRowArrow}>›</Text>
                </TouchableOpacity>
              )
            }}
            ListFooterComponent={
              <>
                <View style={styles.historyDivider} />

                <Text style={styles.historyTitle}>Exercise History</Text>

                {renderExerciseHistory()}
              </>
            }
          />
        </KeyboardAvoidingView>
      </SafeAreaView>

      <Modal
        visible={editingLog !== null}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!updatingLog) {
            setEditingLog(null)
          }
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalKeyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.editModal}>
              <View style={styles.editModalHeader}>
                <Text style={styles.editModalTitle}>Edit Exercise</Text>

                <TouchableOpacity
                  disabled={updatingLog}
                  onPress={() => setEditingLog(null)}
                >
                  <Text style={styles.closeModalText}>×</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.editExerciseName}>
                {editingLog?.exercise_type}
              </Text>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <Text style={styles.editFieldLabel}>Sets</Text>

                <TextInput
                  style={styles.editInput}
                  value={editSets}
                  onChangeText={setEditSets}
                  keyboardType="number-pad"
                  placeholder="Optional"
                  placeholderTextColor="#97A89D"
                  editable={!updatingLog}
                />

                <Text style={styles.editFieldLabel}>
                  Repetitions per set
                </Text>

                <TextInput
                  style={styles.editInput}
                  value={editRepetitions}
                  onChangeText={setEditRepetitions}
                  keyboardType="number-pad"
                  placeholder="Optional"
                  placeholderTextColor="#97A89D"
                  editable={!updatingLog}
                />

                <Text style={styles.editFieldLabel}>Weight (kg)</Text>

                <TextInput
                  style={styles.editInput}
                  value={editWeightKg}
                  onChangeText={setEditWeightKg}
                  keyboardType="decimal-pad"
                  placeholder="Optional"
                  placeholderTextColor="#97A89D"
                  editable={!updatingLog}
                />

                <Text style={styles.editFieldLabel}>
                  Duration (minutes)
                </Text>

                <TextInput
                  style={styles.editInput}
                  value={editDuration}
                  onChangeText={setEditDuration}
                  keyboardType="number-pad"
                  placeholder="Optional"
                  placeholderTextColor="#97A89D"
                  editable={!updatingLog}
                />

                <Text style={styles.editFieldLabel}>
                  Calories burned
                </Text>

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
                  style={[
                    styles.updateButton,
                    updatingLog && styles.updateButtonDisabled,
                  ]}
                  disabled={updatingLog}
                  onPress={() => void updateExerciseLog()}
                >
                  {updatingLog ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.updateButtonText}>
                      Save Changes
                    </Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
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
    fontSize: 21,
    fontWeight: '800',
  },

  topBarSpacer: {
    minWidth: 72,
  },

  screenContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },

  searchBox: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#C9DBD0',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 20,
    paddingHorizontal: 14,
  },

  searchIcon: {
    color: '#5C7267',
    fontSize: 27,
    marginRight: 8,
  },

  searchInput: {
    color: '#16281D',
    flex: 1,
    fontSize: 15,
    paddingVertical: 14,
  },

  clearText: {
    color: '#5C7267',
    fontSize: 25,
  },

  sectionTitle: {
    color: '#5C7267',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginHorizontal: 20,
    marginTop: 22,
    textTransform: 'uppercase',
  },

  exerciseRow: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2ECE6',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 10,
    marginHorizontal: 20,
    padding: 15,
  },

  exerciseRowText: {
    flex: 1,
    paddingRight: 8,
  },

  exerciseName: {
    color: '#16281D',
    fontSize: 15,
    fontWeight: '800',
  },

  exerciseMeta: {
    color: '#708277',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },

  exerciseRowArrow: {
    color: '#1E5C35',
    fontSize: 28,
    fontWeight: '300',
  },

  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2ECE6',
    borderRadius: 14,
    borderWidth: 1,
    marginHorizontal: 20,
    padding: 20,
  },

  emptyText: {
    color: '#708277',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },

  searchStateText: {
    color: '#5C7267',
    fontSize: 13,
    marginTop: 10,
  },

  historyDivider: {
    backgroundColor: '#DCE9E0',
    height: 1,
    marginHorizontal: 20,
    marginTop: 26,
  },

  historyTitle: {
    color: '#5C7267',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginHorizontal: 20,
    marginTop: 20,
    textTransform: 'uppercase',
  },

  historyStateCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2ECE6',
    borderRadius: 14,
    borderWidth: 1,
    marginHorizontal: 20,
    padding: 16,
  },

  historyCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2ECE6',
    borderRadius: 14,
    borderWidth: 1,
    marginHorizontal: 20,
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

  historyExerciseName: {
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

  historyDate: {
    color: '#708277',
    fontSize: 11,
    marginTop: 4,
  },

  historyActions: {
    flexDirection: 'row',
    gap: 8,
  },

  editHistoryButton: {
    alignItems: 'center',
    backgroundColor: '#EAF3EC',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: 12,
  },

  editHistoryButtonText: {
    color: '#1E5C35',
    fontSize: 12,
    fontWeight: '800',
  },

  deleteHistoryButton: {
    alignItems: 'center',
    backgroundColor: '#FDE3E3',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: 12,
  },

  deleteHistoryButtonText: {
    color: '#B3261E',
    fontSize: 12,
    fontWeight: '800',
  },

  modalKeyboardView: {
    flex: 1,
  },

  modalBackdrop: {
    backgroundColor: 'rgba(22, 40, 29, 0.45)',
    flex: 1,
    justifyContent: 'flex-end',
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
    marginBottom: 8,
  },

  editModalTitle: {
    color: '#16281D',
    fontSize: 20,
    fontWeight: '800',
  },

  closeModalText: {
    color: '#1E5C35',
    fontSize: 30,
    fontWeight: '300',
    lineHeight: 34,
  },

  editExerciseName: {
    color: '#1E5C35',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 12,
  },

  editFieldLabel: {
    color: '#16281D',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 7,
    marginTop: 12,
  },

  editInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#C9DBD0',
    borderRadius: 12,
    borderWidth: 1,
    color: '#16281D',
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },

  updateButton: {
    alignItems: 'center',
    backgroundColor: '#1E5C35',
    borderRadius: 12,
    justifyContent: 'center',
    marginTop: 24,
    minHeight: 52,
  },

  updateButtonDisabled: {
    opacity: 0.7,
  },

  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
})
