import { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import { supabase } from '../services/supabase'
import type {
  RootStackParamList,
  RoutineExerciseDraft,
} from '../types/navigation'

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'WorkoutRoutineBuilder'
>

type SavedRoutine = {
  id: string
  routine_name: string
  created_at: string
  workout_routine_exercises: Array<{
    id: string
    exercise_name: string
    exercise_type: string | null
    target_muscle: string | null
    equipment: string | null
    exercise_order: number
  }>
}

const EXERCISE_CATALOG: RoutineExerciseDraft[] = [
  {
    id: 'barbell-bench-press',
    name: 'Barbell Bench Press',
    exerciseType: 'strength',
    muscle: 'Chest',
    equipment: 'Barbell',
  },
  {
    id: 'incline-dumbbell-press',
    name: 'Incline Dumbbell Press',
    exerciseType: 'strength',
    muscle: 'Chest',
    equipment: 'Dumbbells',
  },
  {
    id: 'chest-fly',
    name: 'Chest Fly',
    exerciseType: 'strength',
    muscle: 'Chest',
    equipment: 'Cable Machine',
  },
  {
    id: 't-bar-row',
    name: 'T-Bar Row',
    exerciseType: 'strength',
    muscle: 'Back',
    equipment: 'T-Bar Machine',
  },
  {
    id: 'lat-pulldown',
    name: 'Lat Pulldown',
    exerciseType: 'strength',
    muscle: 'Back',
    equipment: 'Cable Machine',
  },
  {
    id: 'barbell-row',
    name: 'Barbell Row',
    exerciseType: 'strength',
    muscle: 'Back',
    equipment: 'Barbell',
  },
  {
    id: 'barbell-squat',
    name: 'Barbell Squat',
    exerciseType: 'strength',
    muscle: 'Quadriceps',
    equipment: 'Barbell',
  },
  {
    id: 'leg-press',
    name: 'Leg Press',
    exerciseType: 'strength',
    muscle: 'Quadriceps',
    equipment: 'Machine',
  },
  {
    id: 'romanian-deadlift',
    name: 'Romanian Deadlift',
    exerciseType: 'strength',
    muscle: 'Hamstrings',
    equipment: 'Barbell',
  },
  {
    id: 'shoulder-press',
    name: 'Shoulder Press',
    exerciseType: 'strength',
    muscle: 'Shoulders',
    equipment: 'Dumbbells',
  },
  {
    id: 'lateral-raise',
    name: 'Lateral Raise',
    exerciseType: 'strength',
    muscle: 'Shoulders',
    equipment: 'Dumbbells',
  },
  {
    id: 'bicep-curl',
    name: 'Bicep Curl',
    exerciseType: 'strength',
    muscle: 'Biceps',
    equipment: 'Dumbbells',
  },
  {
    id: 'tricep-pushdown',
    name: 'Tricep Pushdown',
    exerciseType: 'strength',
    muscle: 'Triceps',
    equipment: 'Cable Machine',
  },
  {
    id: 'running',
    name: 'Running',
    exerciseType: 'cardio',
    muscle: 'Cardiovascular System',
    equipment: 'None',
  },
  {
    id: 'cycling',
    name: 'Cycling',
    exerciseType: 'cardio',
    muscle: 'Cardiovascular System',
    equipment: 'Bicycle',
  },
  {
    id: 'plank',
    name: 'Plank',
    exerciseType: 'workout routines',
    muscle: 'Core',
    equipment: 'Bodyweight',
  },
]

function formatRoutineDate(dateString: string) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(dateString))
}

export default function WorkoutRoutineBuilderScreen() {
  const navigation = useNavigation<NavigationProp>()

  // Active builder form state
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null)
  const [routineName, setRoutineName] = useState('')
  const [exercises, setExercises] = useState<RoutineExerciseDraft[]>([])
  const [saving, setSaving] = useState(false)

  // In-screen Exercise Picker Modal state
  const [showPicker, setShowPicker] = useState(false)
  const [pickerSearch, setPickerSearch] = useState('')

  // History list state
  const [savedRoutines, setSavedRoutines] = useState<SavedRoutine[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const loadSavedRoutines = useCallback(async () => {
    try {
      setLoadingHistory(true)
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        setSavedRoutines([])
        return
      }

      const { data, error } = await supabase
        .from('workout_routines')
        .select(`
          id,
          routine_name,
          created_at,
          workout_routine_exercises (
            id,
            exercise_name,
            exercise_type,
            target_muscle,
            equipment,
            exercise_order
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      const formatted = (data ?? []).map((routine) => ({
        ...routine,
        workout_routine_exercises: (routine.workout_routine_exercises ?? []).sort(
          (a, b) => a.exercise_order - b.exercise_order
        ),
      }))

      setSavedRoutines(formatted as SavedRoutine[])
    } catch (error: any) {
      console.error('Load routines error:', error)
    } finally {
      setLoadingHistory(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      void loadSavedRoutines()
    }, [loadSavedRoutines])
  )

  const existingExerciseIds = useMemo(() => {
    return new Set(exercises.map((item) => item.id))
  }, [exercises])

  const filteredCatalog = useMemo(() => {
    const search = pickerSearch.trim().toLowerCase()
    if (!search) {
      return EXERCISE_CATALOG
    }
    return EXERCISE_CATALOG.filter((item) => {
      const nameMatch = item.name.toLowerCase().includes(search)
      const muscleMatch = item.muscle.toLowerCase().includes(search)
      const typeMatch = item.exerciseType.toLowerCase().includes(search)
      return nameMatch || muscleMatch || typeMatch
    })
  }, [pickerSearch])

  function addExerciseToRoutine(exercise: RoutineExerciseDraft) {
    setExercises((current) => {
      if (current.some((item) => item.id === exercise.id)) {
        return current
      }
      return [...current, exercise]
    })
    setShowPicker(false)
    setPickerSearch('')
  }

  function removeExercise(exerciseId: string) {
    setExercises((current) => current.filter((item) => item.id !== exerciseId))
  }

  function moveExercise(exerciseId: string, direction: 'up' | 'down') {
    setExercises((current) => {
      const index = current.findIndex((item) => item.id === exerciseId)
      const targetIndex = direction === 'up' ? index - 1 : index + 1
      if (index === -1 || targetIndex < 0 || targetIndex >= current.length) {
        return current
      }
      const copy = [...current]
      const [moved] = copy.splice(index, 1)
      copy.splice(targetIndex, 0, moved)
      return copy
    })
  }

  function cancelEditing() {
    setEditingRoutineId(null)
    setRoutineName('')
    setExercises([])
  }

  function startEditRoutine(routine: SavedRoutine) {
    setEditingRoutineId(routine.id)
    setRoutineName(routine.routine_name)
    setExercises(
      routine.workout_routine_exercises.map((ex) => ({
        id: ex.id || ex.exercise_name.toLowerCase().replace(/\s+/g, '-'),
        name: ex.exercise_name,
        exerciseType: ex.exercise_type || 'strength',
        muscle: ex.target_muscle || '',
        equipment: ex.equipment || '',
      }))
    )
  }

  function confirmDeleteRoutine(routine: SavedRoutine) {
    Alert.alert(
      'Delete Routine?',
      `Are you sure you want to delete "${routine.routine_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => void deleteRoutine(routine.id),
        },
      ]
    )
  }

  async function deleteRoutine(routineId: string) {
    try {
      setSaving(true)
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        Alert.alert('Login required', 'Please log in again.')
        return
      }

      const { error } = await supabase
        .from('workout_routines')
        .delete()
        .eq('id', routineId)
        .eq('user_id', user.id)

      if (error) {
        throw error
      }

      if (editingRoutineId === routineId) {
        cancelEditing()
      }

      await loadSavedRoutines()
      Alert.alert('Routine deleted', 'The workout routine was removed.')
    } catch (error: any) {
      console.error('Delete routine error:', error)
      Alert.alert('Could not delete routine', error?.message)
    } finally {
      setSaving(false)
    }
  }

  async function saveRoutine() {
    const name = routineName.trim()

    if (!name) {
      Alert.alert('Routine name required', 'Enter a name for your workout routine.')
      return
    }

    if (exercises.length === 0) {
      Alert.alert('Add an exercise', 'Add at least one exercise before saving.')
      return
    }

    try {
      setSaving(true)
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        Alert.alert('Login required', 'Please log in again.')
        return
      }

      let routineId = editingRoutineId

      if (editingRoutineId) {
        // 1. Update Routine Name
        const { error: updateError } = await supabase
          .from('workout_routines')
          .update({ routine_name: name })
          .eq('id', editingRoutineId)
          .eq('user_id', user.id)

        if (updateError) throw updateError

        // 2. Clean up existing exercises for this routine to rewrite current sequence
        const { error: delExercisesError } = await supabase
          .from('workout_routine_exercises')
          .delete()
          .eq('routine_id', editingRoutineId)

        if (delExercisesError) throw delExercisesError
      } else {
        // 1. Insert new Routine
        const { data: newRoutine, error: routineError } = await supabase
          .from('workout_routines')
          .insert({
            user_id: user.id,
            routine_name: name,
          })
          .select('id')
          .single()

        if (routineError) throw routineError
        routineId = newRoutine.id
      }

      // 2. Bulk insert current exercises
      const exerciseRows = exercises.map((item, index) => ({
        routine_id: routineId,
        exercise_name: item.name,
        exercise_type: item.exerciseType,
        target_muscle: item.muscle || null,
        equipment: item.equipment || null,
        exercise_order: index + 1,
      }))

      const { error: insertExercisesError } = await supabase
        .from('workout_routine_exercises')
        .insert(exerciseRows)

      if (insertExercisesError) throw insertExercisesError

      Alert.alert(
        editingRoutineId ? 'Routine updated' : 'Routine saved',
        `"${name}" has been ${editingRoutineId ? 'updated' : 'created'} with ${
          exercises.length
        } ${exercises.length === 1 ? 'exercise' : 'exercises'}.`
      )

      cancelEditing()
      await loadSavedRoutines()
    } catch (error: any) {
      console.error('Save routine error:', error)
      Alert.alert('Could not save routine', error?.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
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
          {editingRoutineId ? 'Edit Routine' : 'Build Routine'}
        </Text>

        <TouchableOpacity
          style={[
            styles.saveTopButton,
            saving && styles.saveTopButtonDisabled,
          ]}
          disabled={saving}
          onPress={() => void saveRoutine()}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveTopButtonText}>
              {editingRoutineId ? 'Update' : 'Save'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.introCard}>
          <Text style={styles.introTitle}>
            {editingRoutineId ? 'Editing Workout Routine' : 'Create your workout routine'}
          </Text>
          <Text style={styles.introText}>
            {editingRoutineId
              ? 'Update the routine name or adjust exercises and order.'
              : 'Give your routine a name, then add exercises in the order you plan to perform them.'}
          </Text>
          {editingRoutineId && (
            <TouchableOpacity style={styles.cancelEditBtn} onPress={cancelEditing}>
              <Text style={styles.cancelEditBtnText}>Cancel Editing</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.fieldLabel}>Routine Name</Text>
        <TextInput
          style={styles.routineNameInput}
          value={routineName}
          onChangeText={setRoutineName}
          placeholder="Example: Push Day"
          placeholderTextColor="#97A89D"
          editable={!saving}
          maxLength={60}
        />

        <View style={styles.exerciseHeaderRow}>
        <Text style={styles.sectionTitle}>
            Exercises ({exercises.length})
        </Text>
        </View>

        {exercises.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No exercises added</Text>
            <Text style={styles.emptyText}>
              Tap “+ Add Exercise” to choose exercises for this routine.
            </Text>
          </View>
        ) : (
          exercises.map((item, index) => (
            <View key={`${item.id}-${index}`} style={styles.exerciseCard}>
              <View style={styles.exerciseNumber}>
                <Text style={styles.exerciseNumberText}>{index + 1}</Text>
              </View>

              <View style={styles.exerciseInfo}>
                <Text style={styles.exerciseName}>{item.name}</Text>
                <Text style={styles.exerciseMeta}>
                  {item.muscle
                    ? `Targets: ${item.muscle}`
                    : item.exerciseType || 'Exercise'}
                  {item.equipment ? ` · ${item.equipment}` : ''}
                </Text>
              </View>

              <View style={styles.exerciseActions}>
                <TouchableOpacity
                  style={styles.orderButton}
                  disabled={saving || index === 0}
                  onPress={() => moveExercise(item.id, 'up')}
                >
                  <Text
                    style={[
                      styles.orderButtonText,
                      index === 0 && styles.orderButtonTextDisabled,
                    ]}
                  >
                    ↑
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.orderButton}
                  disabled={saving || index === exercises.length - 1}
                  onPress={() => moveExercise(item.id, 'down')}
                >
                  <Text
                    style={[
                      styles.orderButtonText,
                      index === exercises.length - 1 &&
                        styles.orderButtonTextDisabled,
                    ]}
                  >
                    ↓
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.removeButton}
                  disabled={saving}
                  onPress={() => removeExercise(item.id)}
                >
                  <Text style={styles.removeButtonText}>×</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <TouchableOpacity
          style={[
            styles.bottomAddButton,
            saving && styles.bottomAddButtonDisabled,
          ]}
          disabled={saving}
          onPress={() => setShowPicker(true)}
        >
          <Text style={styles.bottomAddButtonText}>+ Add Exercise</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.saveRoutineButton,
            saving && styles.saveRoutineButtonDisabled,
          ]}
          disabled={saving}
          onPress={() => void saveRoutine()}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveRoutineButtonText}>
              {editingRoutineId ? 'Update Routine' : 'Save Routine'}
            </Text>
          )}
        </TouchableOpacity>

        {/* --- SAVED ROUTINES SECTION --- */}
        <View style={styles.historyDivider} />
        <Text style={styles.historySectionTitle}>Your Saved Routines</Text>

        {loadingHistory ? (
          <View style={styles.historyStateCard}>
            <ActivityIndicator size="small" color="#1E5C35" />
            <Text style={styles.historyStateText}>Loading saved routines...</Text>
          </View>
        ) : savedRoutines.length === 0 ? (
          <View style={styles.historyStateCard}>
            <Text style={styles.emptyText}>No saved routines yet.</Text>
          </View>
        ) : (
          <View style={styles.historyCardContainer}>
            {savedRoutines.map((routine) => (
              <View key={routine.id} style={styles.historyRoutineRow}>
                <View style={styles.historyRoutineInfo}>
                  <Text style={styles.historyRoutineName}>{routine.routine_name}</Text>
                  <Text style={styles.historyRoutineMeta}>
                    {routine.workout_routine_exercises.length}{' '}
                    {routine.workout_routine_exercises.length === 1 ? 'exercise' : 'exercises'}
                  </Text>
                  <Text style={styles.historyRoutineExerciseList}>
                    {routine.workout_routine_exercises
                      .map((ex) => ex.exercise_name)
                      .join(' → ')}
                  </Text>
                  <Text style={styles.historyRoutineDate}>
                    Created {formatRoutineDate(routine.created_at)}
                  </Text>
                </View>

                <View style={styles.historyActions}>
                  <TouchableOpacity
                    style={styles.editHistoryBtn}
                    disabled={saving}
                    onPress={() => startEditRoutine(routine)}
                  >
                    <Text style={styles.editHistoryBtnText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteHistoryBtn}
                    disabled={saving}
                    onPress={() => confirmDeleteRoutine(routine)}
                  >
                    <Text style={styles.deleteHistoryBtnText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* --- IN-SCREEN EXERCISE PICKER MODAL --- */}
      <Modal
        visible={showPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPicker(false)}
      >
        <SafeAreaView style={styles.pickerModalOverlay}>
          <View style={styles.pickerModalContainer}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Add Exercise</Text>
              <TouchableOpacity
                style={styles.pickerCloseButton}
                onPress={() => {
                  setShowPicker(false)
                  setPickerSearch('')
                }}
              >
                <Text style={styles.pickerCloseText}>×</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.pickerSearchBox}>
              <Text style={styles.pickerSearchIcon}>⌕</Text>
              <TextInput
                style={styles.pickerSearchInput}
                value={pickerSearch}
                onChangeText={setPickerSearch}
                placeholder="Search exercises (e.g. bench, squat, row)"
                placeholderTextColor="#97A89D"
                autoCorrect={false}
              />
              {pickerSearch.length > 0 ? (
                <TouchableOpacity onPress={() => setPickerSearch('')}>
                  <Text style={styles.pickerClearText}>×</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <ScrollView
              contentContainerStyle={styles.pickerList}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.pickerSectionLabel}>Available Exercises</Text>

              {filteredCatalog.map((item) => {
                const added = existingExerciseIds.has(item.id)
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.pickerRow,
                      added && styles.pickerRowDisabled,
                    ]}
                    disabled={added}
                    onPress={() => addExerciseToRoutine(item)}
                  >
                    <View style={styles.pickerRowInfo}>
                      <Text style={styles.pickerRowName}>{item.name}</Text>
                      <Text style={styles.pickerRowMeta}>
                        Targets: {item.muscle} · {item.equipment}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.pickerRowAction,
                        added && styles.pickerRowActionAdded,
                      ]}
                    >
                      {added ? 'Added' : '+'}
                    </Text>
                  </TouchableOpacity>
                )
              })}

              {filteredCatalog.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>No exercises match your search.</Text>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F5FAF6',
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
  introCard: {
    backgroundColor: '#EAF3EC',
    borderColor: '#C9DBD0',
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
  },
  introTitle: {
    color: '#16281D',
    fontSize: 18,
    fontWeight: '800',
  },
  introText: {
    color: '#5C7267',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
  },
  cancelEditBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderColor: '#C9DBD0',
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cancelEditBtnText: {
    color: '#B3261E',
    fontSize: 12,
    fontWeight: '800',
  },
  fieldLabel: {
    color: '#16281D',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 7,
    marginTop: 20,
  },
  routineNameInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#C9DBD0',
    borderRadius: 12,
    borderWidth: 1,
    color: '#16281D',
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  exerciseHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  sectionTitle: {
    color: '#5C7267',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2ECE6',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 12,
    padding: 18,
  },
  emptyTitle: {
    color: '#16281D',
    fontSize: 15,
    fontWeight: '800',
  },
  emptyText: {
    color: '#708277',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
  exerciseCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2ECE6',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 10,
    padding: 12,
  },
  exerciseNumber: {
    alignItems: 'center',
    backgroundColor: '#D9ECDF',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    marginRight: 10,
    width: 32,
  },
  exerciseNumberText: {
    color: '#1E5C35',
    fontSize: 13,
    fontWeight: '800',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    color: '#16281D',
    fontSize: 14,
    fontWeight: '800',
  },
  exerciseMeta: {
    color: '#708277',
    fontSize: 11,
    marginTop: 4,
  },
  exerciseActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    marginLeft: 8,
  },
  orderButton: {
    alignItems: 'center',
    backgroundColor: '#F5FAF6',
    borderColor: '#DCE9E0',
    borderRadius: 7,
    borderWidth: 1,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  orderButtonText: {
    color: '#1E5C35',
    fontSize: 16,
    fontWeight: '800',
  },
  orderButtonTextDisabled: {
    color: '#B4C3B9',
  },
  removeButton: {
    alignItems: 'center',
    backgroundColor: '#FDE3E3',
    borderRadius: 7,
    height: 30,
    justifyContent: 'center',
    marginLeft: 2,
    width: 30,
  },
  removeButtonText: {
    color: '#B3261E',
    fontSize: 20,
    fontWeight: '400',
    lineHeight: 22,
  },
  bottomAddButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#1E5C35',
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    marginTop: 16,
    minHeight: 50,
  },
  bottomAddButtonDisabled: {
    opacity: 0.7,
  },
  bottomAddButtonText: {
    color: '#1E5C35',
    fontSize: 14,
    fontWeight: '800',
  },
  saveRoutineButton: {
    alignItems: 'center',
    backgroundColor: '#1E5C35',
    borderRadius: 12,
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 52,
  },
  saveRoutineButtonDisabled: {
    opacity: 0.7,
  },
  saveRoutineButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  /* HISTORY STYLES */
  historyDivider: {
    backgroundColor: '#DCE9E0',
    height: 1,
    marginTop: 32,
  },
  historySectionTitle: {
    color: '#5C7267',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 20,
    textTransform: 'uppercase',
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
  historyCardContainer: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2ECE6',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  historyRoutineRow: {
    borderBottomColor: '#E2ECE6',
    borderBottomWidth: 1,
    padding: 14,
  },
  historyRoutineInfo: {
    marginBottom: 10,
  },
  historyRoutineName: {
    color: '#16281D',
    fontSize: 15,
    fontWeight: '800',
  },
  historyRoutineMeta: {
    color: '#1E5C35',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
  historyRoutineExerciseList: {
    color: '#5C7267',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 5,
  },
  historyRoutineDate: {
    color: '#708277',
    fontSize: 11,
    marginTop: 5,
  },
  historyActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editHistoryBtn: {
    alignItems: 'center',
    backgroundColor: '#EAF3EC',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 32,
    paddingHorizontal: 12,
  },
  editHistoryBtnText: {
    color: '#1E5C35',
    fontSize: 12,
    fontWeight: '800',
  },
  deleteHistoryBtn: {
    alignItems: 'center',
    backgroundColor: '#FDE3E3',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 32,
    paddingHorizontal: 12,
  },
  deleteHistoryBtnText: {
    color: '#B3261E',
    fontSize: 12,
    fontWeight: '800',
  },

  /* MODAL STYLES */
  pickerModalOverlay: {
    backgroundColor: 'rgba(22, 40, 29, 0.45)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  pickerModalContainer: {
    backgroundColor: '#F5FAF6',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    paddingBottom: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  pickerHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pickerTitle: {
    color: '#16281D',
    fontSize: 20,
    fontWeight: '800',
  },
  pickerCloseButton: {
    alignItems: 'center',
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  pickerCloseText: {
    color: '#1E5C35',
    fontSize: 30,
    fontWeight: '300',
    lineHeight: 32,
  },
  pickerSearchBox: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#C9DBD0',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 14,
    paddingHorizontal: 12,
  },
  pickerSearchIcon: {
    color: '#5C7267',
    fontSize: 24,
    marginRight: 8,
  },
  pickerSearchInput: {
    color: '#16281D',
    flex: 1,
    fontSize: 14,
    paddingVertical: 12,
  },
  pickerClearText: {
    color: '#5C7267',
    fontSize: 22,
  },
  pickerSectionLabel: {
    color: '#5C7267',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  pickerList: {
    paddingBottom: 20,
  },
  pickerRow: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2ECE6',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 9,
    padding: 13,
  },
  pickerRowDisabled: {
    backgroundColor: '#EDF4EF',
    opacity: 0.7,
  },
  pickerRowInfo: {
    flex: 1,
  },
  pickerRowName: {
    color: '#16281D',
    fontSize: 14,
    fontWeight: '800',
  },
  pickerRowMeta: {
    color: '#708277',
    fontSize: 11.5,
    marginTop: 4,
  },
  pickerRowAction: {
    color: '#1E5C35',
    fontSize: 22,
    fontWeight: '800',
    marginLeft: 10,
  },
  pickerRowActionAdded: {
    color: '#7C8F83',
    fontSize: 12,
    fontWeight: '700',
  },
})