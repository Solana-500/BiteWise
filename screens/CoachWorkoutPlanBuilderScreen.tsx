import React, { useMemo, useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'

type Props = {
  navigation: any
  route: any
}

type WorkoutPlanDraft = {
  clientId: string
  clientName: string
  title: string
  goal: string
  durationWeeks: number
  sessionsPerWeek: number
  sessionLengthMinutes: number
  trainingLocation: string
  experienceLevel: string
  equipment: string[]
  preferredDays: string[]
  healthNotes: string
  coachNotes: string
  status: 'draft'
}

type ExerciseCategory =
  | 'Strength'
  | 'Cardio'
  | 'Mobility'
  | 'Core'
  | 'Warm-up'
  | 'Cool-down'

type WorkoutExercise = {
  id: string
  name: string
  category: ExerciseCategory
  sets: string
  reps: string
  restSeconds: string
  load: string
  equipment: string
  notes: string
}

type WorkoutDay = {
  title: string
  focus: string
  exercises: WorkoutExercise[]
}

const EXERCISE_CATEGORIES: ExerciseCategory[] = [
  'Strength',
  'Cardio',
  'Mobility',
  'Core',
  'Warm-up',
  'Cool-down',
]

const STARTER_EXERCISES = [
  {
    name: 'Bodyweight squat',
    category: 'Strength' as ExerciseCategory,
    equipment: 'Bodyweight',
  },
  {
    name: 'Dumbbell goblet squat',
    category: 'Strength' as ExerciseCategory,
    equipment: 'Dumbbells',
  },
  {
    name: 'Push-up',
    category: 'Strength' as ExerciseCategory,
    equipment: 'Bodyweight',
  },
  {
    name: 'Dumbbell row',
    category: 'Strength' as ExerciseCategory,
    equipment: 'Dumbbells',
  },
  {
    name: 'Glute bridge',
    category: 'Strength' as ExerciseCategory,
    equipment: 'Bodyweight',
  },
  {
    name: 'Romanian deadlift',
    category: 'Strength' as ExerciseCategory,
    equipment: 'Dumbbells or barbell',
  },
  {
    name: 'Dead bug',
    category: 'Core' as ExerciseCategory,
    equipment: 'Bodyweight',
  },
  {
    name: 'Plank',
    category: 'Core' as ExerciseCategory,
    equipment: 'Bodyweight',
  },
  {
    name: 'Brisk walk',
    category: 'Cardio' as ExerciseCategory,
    equipment: 'None',
  },
  {
    name: 'Stationary cycling',
    category: 'Cardio' as ExerciseCategory,
    equipment: 'Exercise bike',
  },
  {
    name: 'Cat-cow',
    category: 'Mobility' as ExerciseCategory,
    equipment: 'Bodyweight',
  },
  {
    name: 'Hip flexor stretch',
    category: 'Mobility' as ExerciseCategory,
    equipment: 'Bodyweight',
  },
]

function createEmptyWorkoutDay(day: string): WorkoutDay {
  return {
    title: `${day} workout`,
    focus: '',
    exercises: [],
  }
}

function createExerciseId(day: string) {
  return `${day}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export default function CoachWorkoutPlanBuilderScreen({
  navigation,
  route,
}: Props) {
  const workoutPlanDraft: WorkoutPlanDraft = route.params?.workoutPlanDraft ?? {
    clientId: 'temporary-client',
    clientName: 'Client',
    title: 'New Workout Plan',
    goal: 'General fitness',
    durationWeeks: 4,
    sessionsPerWeek: 3,
    sessionLengthMinutes: 45,
    trainingLocation: 'Home',
    experienceLevel: 'Beginner',
    equipment: ['Bodyweight only'],
    preferredDays: ['Mon', 'Wed', 'Fri'],
    healthNotes: '',
    coachNotes: '',
    status: 'draft',
  }

  const workoutDays = workoutPlanDraft.preferredDays.length
    ? workoutPlanDraft.preferredDays
    : ['Mon', 'Wed', 'Fri']

  const initialWorkoutsByDay = useMemo(() => {
    return workoutDays.reduce<Record<string, WorkoutDay>>((result, day) => {
      result[day] = createEmptyWorkoutDay(day)
      return result
    }, {})
  }, [workoutDays.join('|')])

  const [selectedDay, setSelectedDay] = useState(workoutDays[0])
  const [workoutsByDay, setWorkoutsByDay] = useState<
    Record<string, WorkoutDay>
  >(initialWorkoutsByDay)

  const [addExerciseVisible, setAddExerciseVisible] = useState(false)
  const [exerciseSearchText, setExerciseSearchText] = useState('')
  const [customExerciseName, setCustomExerciseName] = useState('')
  const [selectedCategory, setSelectedCategory] =
    useState<ExerciseCategory>('Strength')
  const [savingExercise, setSavingExercise] = useState(false)

  const selectedWorkout = workoutsByDay[selectedDay] ?? createEmptyWorkoutDay(selectedDay)

  const completedWorkoutDays = useMemo(() => {
    return workoutDays.filter((day) => {
      return (workoutsByDay[day]?.exercises.length ?? 0) > 0
    }).length
  }, [workoutDays, workoutsByDay])

  const totalExercises = useMemo(() => {
    return workoutDays.reduce((total, day) => {
      return total + (workoutsByDay[day]?.exercises.length ?? 0)
    }, 0)
  }, [workoutDays, workoutsByDay])

  const filteredStarterExercises = useMemo(() => {
    const query = exerciseSearchText.trim().toLowerCase()

    if (!query) {
      return STARTER_EXERCISES.filter(
        (exercise) => exercise.category === selectedCategory
      )
    }

    return STARTER_EXERCISES.filter((exercise) => {
      return (
        exercise.name.toLowerCase().includes(query) ||
        exercise.category.toLowerCase().includes(query) ||
        exercise.equipment.toLowerCase().includes(query)
      )
    })
  }, [exerciseSearchText, selectedCategory])

  const updateWorkoutDay = (
    day: string,
    updater: (workout: WorkoutDay) => WorkoutDay
  ) => {
    setWorkoutsByDay((current) => {
      const existing = current[day] ?? createEmptyWorkoutDay(day)

      return {
        ...current,
        [day]: updater(existing),
      }
    })
  }

  const updateWorkoutTitle = (title: string) => {
    updateWorkoutDay(selectedDay, (workout) => ({
      ...workout,
      title,
    }))
  }

  const updateWorkoutFocus = (focus: string) => {
    updateWorkoutDay(selectedDay, (workout) => ({
      ...workout,
      focus,
    }))
  }

  const openAddExercise = () => {
    setExerciseSearchText('')
    setCustomExerciseName('')
    setSelectedCategory('Strength')
    setAddExerciseVisible(true)
  }

  const closeAddExercise = () => {
    if (savingExercise) return

    setExerciseSearchText('')
    setCustomExerciseName('')
    setAddExerciseVisible(false)
  }

  const addExercise = (
    name: string,
    category: ExerciseCategory,
    equipment: string
  ) => {
    const trimmedName = name.trim()

    if (!trimmedName) {
      Alert.alert(
        'Exercise name required',
        'Choose a suggested exercise or enter a custom exercise name.'
      )
      return
    }

    const exercise: WorkoutExercise = {
      id: createExerciseId(selectedDay),
      name: trimmedName,
      category,
      sets: category === 'Cardio' || category === 'Mobility' ? '1' : '2',
      reps:
        category === 'Cardio'
          ? '10 min'
          : category === 'Mobility'
          ? '8 each side'
          : '8–12',
      restSeconds:
        category === 'Cardio' || category === 'Mobility' ? '0' : '90',
      load: '',
      equipment,
      notes: '',
    }

    setSavingExercise(true)

    updateWorkoutDay(selectedDay, (workout) => ({
      ...workout,
      exercises: [...workout.exercises, exercise],
    }))

    setSavingExercise(false)
    closeAddExercise()
  }

  const updateExercise = (
    exerciseId: string,
    field: keyof Omit<WorkoutExercise, 'id'>,
    value: string
  ) => {
    updateWorkoutDay(selectedDay, (workout) => ({
      ...workout,
      exercises: workout.exercises.map((exercise) => {
        if (exercise.id !== exerciseId) return exercise

        return {
          ...exercise,
          [field]: value,
        }
      }),
    }))
  }

  const removeExercise = (exercise: WorkoutExercise) => {
    Alert.alert(
      'Remove exercise?',
      `${exercise.name} will be removed from ${selectedDay}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            updateWorkoutDay(selectedDay, (workout) => ({
              ...workout,
              exercises: workout.exercises.filter(
                (item) => item.id !== exercise.id
              ),
            }))
          },
        },
      ]
    )
  }

  const moveExercise = (exerciseId: string, direction: 'up' | 'down') => {
    updateWorkoutDay(selectedDay, (workout) => {
      const currentIndex = workout.exercises.findIndex(
        (exercise) => exercise.id === exerciseId
      )

      const nextIndex =
        direction === 'up' ? currentIndex - 1 : currentIndex + 1

      if (
        currentIndex < 0 ||
        nextIndex < 0 ||
        nextIndex >= workout.exercises.length
      ) {
        return workout
      }

      const reordered = [...workout.exercises]
      const temporary = reordered[currentIndex]
      reordered[currentIndex] = reordered[nextIndex]
      reordered[nextIndex] = temporary

      return {
        ...workout,
        exercises: reordered,
      }
    })
  }

  const copyWorkoutToNextDay = () => {
    const currentWorkout = workoutsByDay[selectedDay] ?? createEmptyWorkoutDay(selectedDay)

    if (currentWorkout.exercises.length === 0) {
      Alert.alert(
        'Nothing to copy',
        `Add at least one exercise to ${selectedDay} before copying this workout.`
      )
      return
    }

    const currentIndex = workoutDays.indexOf(selectedDay)
    const nextDay = workoutDays[currentIndex + 1]

    if (!nextDay) {
      Alert.alert(
        'Last workout day',
        'Choose an earlier workout day if you want to copy it forward.'
      )
      return
    }

    const copiedExercises = currentWorkout.exercises.map((exercise) => ({
      ...exercise,
      id: createExerciseId(nextDay),
    }))

    setWorkoutsByDay((current) => ({
      ...current,
      [nextDay]: {
        title: currentWorkout.title.replace(selectedDay, nextDay),
        focus: currentWorkout.focus,
        exercises: copiedExercises,
      },
    }))

    Alert.alert(
      'Workout copied',
      `${selectedDay}'s exercises were copied to ${nextDay}. Review the copied workout before submission.`
    )
  }

  const continueToReview = () => {
    if (completedWorkoutDays === 0) {
      Alert.alert(
        'Add a workout first',
        'Add at least one exercise to one workout day before continuing.'
      )
      return
    }

    const emptyDays = workoutDays.filter((day) => {
      return (workoutsByDay[day]?.exercises.length ?? 0) === 0
    })

    if (emptyDays.length > 0) {
      Alert.alert(
        'Some workout days are empty',
        `${emptyDays.join(
          ', '
        )} ${emptyDays.length === 1 ? 'has' : 'have'} no exercises. You can still review the plan, but complete the workout days before submitting it.`,
        [
          { text: 'Keep editing', style: 'cancel' },
          {
            text: 'Continue to review',
            onPress: () => {
              navigation.navigate('CoachWorkoutPlanReview', {
                workoutPlanDraft,
                workoutsByDay,
              })
            },
          },
        ]
      )
      return
    }

    navigation.navigate('CoachWorkoutPlanReview', {
      workoutPlanDraft,
      workoutsByDay,
    })
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Go back to workout plan basics"
          >
            <Text style={styles.backButtonText}>‹ Plan Basics</Text>
          </TouchableOpacity>

          <Text style={styles.pageHeading}>Build Workouts</Text>
          <Text style={styles.pageSubtitle}>{workoutPlanDraft.title}</Text>

          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Step 2 of 3</Text>
              <Text style={styles.progressText}>Add workouts</Text>
            </View>

            <View style={styles.progressTrack}>
              <View style={styles.progressFill} />
            </View>

            <View style={styles.progressLabels}>
              <Text style={styles.progressLabelComplete}>1. Basics</Text>
              <Text style={styles.progressLabelActive}>2. Workouts</Text>
              <Text style={styles.progressLabel}>3. Review</Text>
            </View>
          </View>

          <View style={styles.clientSummaryCard}>
            <View style={styles.clientSummaryTop}>
              <View>
                <Text style={styles.clientSummaryLabel}>Creating for</Text>
                <Text style={styles.clientSummaryName}>
                  {workoutPlanDraft.clientName}
                </Text>
              </View>

              <View style={styles.goalBadge}>
                <Text style={styles.goalBadgeText}>{workoutPlanDraft.goal}</Text>
              </View>
            </View>

            <View style={styles.clientSummaryDivider} />

            <View style={styles.clientSummaryInfoRow}>
              <ClientInfo
                label="Schedule"
                value={`${workoutPlanDraft.sessionsPerWeek} sessions/week`}
              />
              <ClientInfo
                label="Session"
                value={`${workoutPlanDraft.sessionLengthMinutes} min`}
              />
              <ClientInfo
                label="Level"
                value={workoutPlanDraft.experienceLevel}
              />
            </View>

            {workoutPlanDraft.healthNotes ? (
              <View style={styles.healthBanner}>
                <Text style={styles.healthIcon}>!</Text>
                <Text style={styles.healthText}>
                  Important context: {workoutPlanDraft.healthNotes}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.safetyNotice}>
            <Text style={styles.safetyNoticeIcon}>!</Text>
            <View style={styles.safetyNoticeTextWrap}>
              <Text style={styles.safetyNoticeTitle}>Build for safe progress</Text>
              <Text style={styles.safetyNoticeText}>
                Use exercises and loads appropriate for the client’s experience,
                available equipment, and recorded considerations. Stop or modify
                activity if pain, dizziness, chest symptoms, or other concerning
                symptoms occur.
              </Text>
            </View>
          </View>

          <View style={styles.daySectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Workout days</Text>
              <Text style={styles.sectionSubtitle}>
                {completedWorkoutDays}/{workoutDays.length} days have exercises
              </Text>
            </View>

            <Text style={styles.totalExercisesText}>
              {totalExercises} {totalExercises === 1 ? 'exercise' : 'exercises'}
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dayTabs}
            accessibilityRole="tablist"
          >
            {workoutDays.map((day) => {
              const isSelected = selectedDay === day
              const exerciseCount = workoutsByDay[day]?.exercises.length ?? 0
              const hasExercises = exerciseCount > 0

              return (
                <Pressable
                  key={day}
                  style={[styles.dayTab, isSelected && styles.dayTabActive]}
                  onPress={() => setSelectedDay(day)}
                  accessibilityRole="tab"
                  accessibilityLabel={`Select ${day} workout`}
                  accessibilityState={{ selected: isSelected }}
                >
                  <Text
                    style={[
                      styles.dayTabText,
                      isSelected && styles.dayTabTextActive,
                    ]}
                  >
                    {day}
                  </Text>

                  <View
                    style={[
                      styles.dayDot,
                      hasExercises && styles.dayDotFilled,
                      isSelected && styles.dayDotActive,
                    ]}
                  />
                </Pressable>
              )
            })}
          </ScrollView>

          <View style={styles.workoutHeaderCard}>
            <Text style={styles.workoutHeaderLabel}>{selectedDay} workout</Text>

            <TextInput
              value={selectedWorkout.title}
              onChangeText={updateWorkoutTitle}
              style={styles.workoutTitleInput}
              placeholder={`${selectedDay} workout title`}
              placeholderTextColor="#8B9D92"
              maxLength={60}
              accessibilityLabel={`${selectedDay} workout title`}
            />

            <TextInput
              value={selectedWorkout.focus}
              onChangeText={updateWorkoutFocus}
              style={styles.workoutFocusInput}
              placeholder="Workout focus, e.g. Full body strength"
              placeholderTextColor="#8B9D92"
              maxLength={100}
              accessibilityLabel={`${selectedDay} workout focus`}
            />

            <View style={styles.workoutHeaderMeta}>
              <Text style={styles.workoutHeaderMetaText}>
                Target duration: {workoutPlanDraft.sessionLengthMinutes} min
              </Text>

              <Text style={styles.workoutHeaderMetaText}>
                {selectedWorkout.exercises.length}{' '}
                {selectedWorkout.exercises.length === 1
                  ? 'exercise'
                  : 'exercises'}
              </Text>
            </View>
          </View>

          <View style={styles.exerciseSectionHeader}>
            <Text style={styles.sectionTitle}>Exercises</Text>

            <Pressable
              onPress={openAddExercise}
              accessibilityRole="button"
              accessibilityLabel={`Add an exercise to ${selectedDay}`}
            >
              <Text style={styles.addExerciseText}>+ Add exercise</Text>
            </Pressable>
          </View>

          {selectedWorkout.exercises.length > 0 ? (
            selectedWorkout.exercises.map((exercise, index) => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                index={index}
                total={selectedWorkout.exercises.length}
                onChange={(field, value) =>
                  updateExercise(exercise.id, field, value)
                }
                onMoveUp={() => moveExercise(exercise.id, 'up')}
                onMoveDown={() => moveExercise(exercise.id, 'down')}
                onRemove={() => removeExercise(exercise)}
              />
            ))
          ) : (
            <Pressable
              style={styles.emptyExerciseSlot}
              onPress={openAddExercise}
              accessibilityRole="button"
              accessibilityLabel={`Add an exercise to ${selectedDay}`}
            >
              <Text style={styles.emptyExerciseIcon}>＋</Text>
              <Text style={styles.emptyExerciseTitle}>
                Add your first exercise
              </Text>
              <Text style={styles.emptyExerciseText}>
                Build this workout with movements, sets, repetitions, rest, and
                client-specific coaching instructions.
              </Text>
            </Pressable>
          )}

          <Pressable
            style={styles.copyDayButton}
            onPress={copyWorkoutToNextDay}
            accessibilityRole="button"
            accessibilityLabel={`Copy ${selectedDay} workout to the next workout day`}
          >
            <Text style={styles.copyDayIcon}>⧉</Text>
            <Text style={styles.copyDayText}>
              Copy {selectedDay} workout to next day
            </Text>
          </Pressable>

          <View style={styles.draftNotice}>
            <Text style={styles.draftNoticeIcon}>i</Text>
            <Text style={styles.draftNoticeText}>
              This plan remains private as a draft until you review it and
              submit it for system admin approval.
            </Text>
          </View>

          <View style={styles.bottomActions}>
            <Pressable
              style={styles.saveDraftButton}
              onPress={() =>
                Alert.alert(
                  'Draft in progress',
                  'Your workout plan details will be reviewed before you save or submit the complete draft.'
                )
              }
              accessibilityRole="button"
              accessibilityLabel="Review workout plan before saving draft"
            >
              <Text style={styles.saveDraftButtonText}>Save Draft</Text>
            </Pressable>

            <Pressable
              style={styles.reviewButton}
              onPress={continueToReview}
              accessibilityRole="button"
              accessibilityLabel="Review workout plan"
            >
              <Text style={styles.reviewButtonText}>Review Plan ›</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={addExerciseVisible}
        transparent
        animationType="slide"
        onRequestClose={closeAddExercise}
      >
        <KeyboardAvoidingView
          style={styles.modalKeyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable style={styles.modalOverlay} onPress={closeAddExercise}>
            <Pressable
              style={styles.modalCard}
              onPress={(event) => event.stopPropagation()}
              accessibilityViewIsModal
            >
              <View style={styles.modalHandle} />

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.modalScrollContent}
              >
                <Text style={styles.modalTitle}>Add exercise</Text>

                <Text style={styles.modalSubtitle}>
                  Choose a starter exercise or create a custom one. You can
                  adjust sets, repetitions, rest, load, and instructions after
                  adding it.
                </Text>

                <TextInput
                  value={exerciseSearchText}
                  onChangeText={setExerciseSearchText}
                  placeholder="Search exercises"
                  placeholderTextColor="#8B9D92"
                  style={styles.exerciseSearchInput}
                  autoCapitalize="words"
                  autoCorrect={false}
                  accessibilityLabel="Search starter exercises"
                />

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryTabs}
                  accessibilityRole="tablist"
                >
                  {EXERCISE_CATEGORIES.map((category) => {
                    const isSelected = selectedCategory === category

                    return (
                      <Pressable
                        key={category}
                        style={[
                          styles.categoryTab,
                          isSelected && styles.categoryTabActive,
                        ]}
                        onPress={() => setSelectedCategory(category)}
                        accessibilityRole="tab"
                        accessibilityLabel={`Show ${category} exercises`}
                        accessibilityState={{ selected: isSelected }}
                      >
                        <Text
                          style={[
                            styles.categoryTabText,
                            isSelected && styles.categoryTabTextActive,
                          ]}
                        >
                          {category}
                        </Text>
                      </Pressable>
                    )
                  })}
                </ScrollView>

                {filteredStarterExercises.length > 0 ? (
                  <View style={styles.suggestionsContainer}>
                    {filteredStarterExercises.map((exercise) => (
                      <Pressable
                        key={`${exercise.name}-${exercise.category}`}
                        style={styles.suggestionCard}
                        onPress={() =>
                          addExercise(
                            exercise.name,
                            exercise.category,
                            exercise.equipment
                          )
                        }
                        accessibilityRole="button"
                        accessibilityLabel={`Add ${exercise.name}`}
                      >
                        <View style={styles.suggestionTextWrap}>
                          <Text style={styles.suggestionName}>
                            {exercise.name}
                          </Text>

                          <Text style={styles.suggestionMeta}>
                            {exercise.category} · {exercise.equipment}
                          </Text>
                        </View>

                        <Text style={styles.addSuggestionIcon}>＋</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <View style={styles.searchStateCard}>
                    <Text style={styles.searchStateText}>
                      No starter exercises match this search.
                    </Text>
                  </View>
                )}

                <View style={styles.customExerciseSection}>
                  <Text style={styles.customExerciseTitle}>
                    Or add a custom exercise
                  </Text>

                  <TextInput
                    value={customExerciseName}
                    onChangeText={setCustomExerciseName}
                    placeholder="Enter exercise name"
                    placeholderTextColor="#8B9D92"
                    style={styles.customExerciseInput}
                    autoCapitalize="words"
                    maxLength={80}
                    accessibilityLabel="Custom exercise name"
                  />

                  <Pressable
                    style={styles.addCustomExerciseButton}
                    onPress={() =>
                      addExercise(
                        customExerciseName,
                        selectedCategory,
                        workoutPlanDraft.equipment.join(', ')
                      )
                    }
                    disabled={savingExercise}
                    accessibilityRole="button"
                    accessibilityLabel="Add custom exercise"
                    accessibilityState={{ disabled: savingExercise }}
                  >
                    <Text style={styles.addCustomExerciseButtonText}>
                      Add custom exercise
                    </Text>
                  </Pressable>
                </View>

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={closeAddExercise}
                  accessibilityRole="button"
                  accessibilityLabel="Close exercise selection"
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

function ClientInfo({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.clientInfo}>
      <Text style={styles.clientInfoLabel}>{label}</Text>
      <Text style={styles.clientInfoValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  )
}

function ExerciseCard({
  exercise,
  index,
  total,
  onChange,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  exercise: WorkoutExercise
  index: number
  total: number
  onChange: (
    field: keyof Omit<WorkoutExercise, 'id'>,
    value: string
  ) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
}) {
  return (
    <View style={styles.exerciseCard}>
      <View style={styles.exerciseCardTop}>
        <View style={styles.exerciseOrderBadge}>
          <Text style={styles.exerciseOrderText}>{index + 1}</Text>
        </View>

        <View style={styles.exerciseNameWrap}>
          <TextInput
            value={exercise.name}
            onChangeText={(value) => onChange('name', value)}
            style={styles.exerciseNameInput}
            placeholder="Exercise name"
            placeholderTextColor="#8B9D92"
            maxLength={80}
            accessibilityLabel={`Exercise ${index + 1} name`}
          />

          <View style={styles.exerciseTagRow}>
            <View style={styles.exerciseCategoryTag}>
              <Text style={styles.exerciseCategoryTagText}>
                {exercise.category}
              </Text>
            </View>

            {exercise.equipment ? (
              <Text style={styles.exerciseEquipmentText}>
                {exercise.equipment}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.exerciseMoveButtons}>
          <Pressable
            style={[
              styles.exerciseMoveButton,
              index === 0 && styles.exerciseMoveButtonDisabled,
            ]}
            onPress={onMoveUp}
            disabled={index === 0}
            accessibilityRole="button"
            accessibilityLabel={`Move ${exercise.name} up`}
            accessibilityState={{ disabled: index === 0 }}
          >
            <Text style={styles.exerciseMoveButtonText}>↑</Text>
          </Pressable>

          <Pressable
            style={[
              styles.exerciseMoveButton,
              index === total - 1 && styles.exerciseMoveButtonDisabled,
            ]}
            onPress={onMoveDown}
            disabled={index === total - 1}
            accessibilityRole="button"
            accessibilityLabel={`Move ${exercise.name} down`}
            accessibilityState={{ disabled: index === total - 1 }}
          >
            <Text style={styles.exerciseMoveButtonText}>↓</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.exerciseDivider} />

      <View style={styles.prescriptionRow}>
        <CompactField
          label="Sets"
          value={exercise.sets}
          onChangeText={(value) => onChange('sets', value)}
          keyboardType="number-pad"
          accessibilityLabel={`${exercise.name} sets`}
        />

        <CompactField
          label="Reps / time"
          value={exercise.reps}
          onChangeText={(value) => onChange('reps', value)}
          accessibilityLabel={`${exercise.name} repetitions or time`}
        />

        <CompactField
          label="Rest (sec)"
          value={exercise.restSeconds}
          onChangeText={(value) => onChange('restSeconds', value)}
          keyboardType="number-pad"
          accessibilityLabel={`${exercise.name} rest seconds`}
        />
      </View>

      <Text style={styles.exerciseFieldLabel}>Load or intensity</Text>

      <TextInput
        value={exercise.load}
        onChangeText={(value) => onChange('load', value)}
        style={styles.exerciseInput}
        placeholder="Example: Moderate effort, 8 kg, RPE 6"
        placeholderTextColor="#8B9D92"
        maxLength={100}
        accessibilityLabel={`${exercise.name} load or intensity`}
      />

      <Text style={styles.exerciseFieldLabel}>Equipment</Text>

      <TextInput
        value={exercise.equipment}
        onChangeText={(value) => onChange('equipment', value)}
        style={styles.exerciseInput}
        placeholder="Equipment needed"
        placeholderTextColor="#8B9D92"
        maxLength={100}
        accessibilityLabel={`${exercise.name} equipment`}
      />

      <Text style={styles.exerciseFieldLabel}>
        Coach instruction and modification
      </Text>

      <TextInput
        value={exercise.notes}
        onChangeText={(value) => onChange('notes', value)}
        style={[styles.exerciseInput, styles.exerciseNotesInput]}
        placeholder="Technique cue, range of motion, easier option, or when to stop."
        placeholderTextColor="#8B9D92"
        multiline
        textAlignVertical="top"
        maxLength={500}
        accessibilityLabel={`${exercise.name} coach instruction and modification`}
      />

      <Pressable
        style={styles.removeExerciseButton}
        onPress={onRemove}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${exercise.name}`}
      >
        <Text style={styles.removeExerciseText}>Remove exercise</Text>
      </Pressable>
    </View>
  )
}

function CompactField({
  label,
  value,
  onChangeText,
  keyboardType,
  accessibilityLabel,
}: {
  label: string
  value: string
  onChangeText: (value: string) => void
  keyboardType?: 'default' | 'number-pad'
  accessibilityLabel: string
}) {
  return (
    <View style={styles.compactField}>
      <Text style={styles.compactFieldLabel}>{label}</Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={styles.compactFieldInput}
        placeholder="-"
        placeholderTextColor="#A3B3A9"
        keyboardType={keyboardType}
        accessibilityLabel={accessibilityLabel}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5FAF6',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#F5FAF6',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 36,
  },

  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingRight: 14,
  },
  backButtonText: {
    color: '#1E5C35',
    fontSize: 15,
    fontWeight: '800',
  },

  pageHeading: {
    marginTop: 6,
    color: '#16281D',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    marginTop: 5,
    color: '#5C7267',
    fontSize: 14,
    lineHeight: 20,
  },

  progressCard: {
    marginTop: 20,
    padding: 15,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2ECE6',
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressTitle: {
    color: '#1E5C35',
    fontSize: 13,
    fontWeight: '800',
  },
  progressText: {
    color: '#7C8F83',
    fontSize: 12,
    fontWeight: '700',
  },
  progressTrack: {
    height: 7,
    marginTop: 12,
    overflow: 'hidden',
    borderRadius: 5,
    backgroundColor: '#E8F0EA',
  },
  progressFill: {
    width: '66.66%',
    height: '100%',
    borderRadius: 5,
    backgroundColor: '#1E5C35',
  },
  progressLabels: {
    marginTop: 9,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    color: '#8B9D92',
    fontSize: 10,
    fontWeight: '700',
  },
  progressLabelActive: {
    color: '#1E5C35',
    fontSize: 10,
    fontWeight: '800',
  },
  progressLabelComplete: {
    color: '#4C7460',
    fontSize: 10,
    fontWeight: '800',
  },

  clientSummaryCard: {
    marginTop: 18,
    padding: 15,
    borderRadius: 17,
    backgroundColor: '#EAF4ED',
    borderWidth: 1,
    borderColor: '#D5E8DA',
  },
  clientSummaryTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  clientSummaryLabel: {
    color: '#5C7267',
    fontSize: 11,
    fontWeight: '700',
  },
  clientSummaryName: {
    marginTop: 3,
    color: '#16281D',
    fontSize: 17,
    fontWeight: '800',
  },
  goalBadge: {
    maxWidth: '45%',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
  },
  goalBadgeText: {
    color: '#1E5C35',
    fontSize: 10,
    fontWeight: '800',
  },
  clientSummaryDivider: {
    height: 1,
    marginTop: 13,
    marginBottom: 12,
    backgroundColor: '#D3E6D8',
  },
  clientSummaryInfoRow: {
    flexDirection: 'row',
  },
  clientInfo: {
    flex: 1,
    paddingRight: 7,
  },
  clientInfoLabel: {
    color: '#61776A',
    fontSize: 10,
    fontWeight: '700',
  },
  clientInfoValue: {
    marginTop: 3,
    color: '#294635',
    fontSize: 11,
    fontWeight: '800',
  },
  healthBanner: {
    marginTop: 13,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 11,
    backgroundColor: '#FFF0EA',
    borderWidth: 1,
    borderColor: '#F5D1C4',
  },
  healthIcon: {
    width: 19,
    height: 19,
    overflow: 'hidden',
    color: '#9B3B27',
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 19,
    textAlign: 'center',
    borderRadius: 10,
    backgroundColor: '#F9C9B9',
  },
  healthText: {
    flex: 1,
    marginLeft: 7,
    color: '#864431',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
  },

  safetyNotice: {
    marginTop: 16,
    padding: 13,
    flexDirection: 'row',
    borderRadius: 15,
    backgroundColor: '#FFF7E5',
    borderWidth: 1,
    borderColor: '#F3DEAA',
  },
  safetyNoticeIcon: {
    width: 22,
    height: 22,
    overflow: 'hidden',
    color: '#8A5A09',
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 22,
    textAlign: 'center',
    borderRadius: 11,
    backgroundColor: '#F7D98B',
  },
  safetyNoticeTextWrap: {
    flex: 1,
    marginLeft: 9,
  },
  safetyNoticeTitle: {
    color: '#704A08',
    fontSize: 12,
    fontWeight: '800',
  },
  safetyNoticeText: {
    marginTop: 3,
    color: '#7A6131',
    fontSize: 11,
    lineHeight: 16,
  },

  daySectionHeader: {
    marginTop: 25,
    marginBottom: 11,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: '#16281D',
    fontSize: 18,
    fontWeight: '800',
  },
  sectionSubtitle: {
    marginTop: 3,
    color: '#7C8F83',
    fontSize: 11,
    fontWeight: '700',
  },
  totalExercisesText: {
    color: '#5C7267',
    fontSize: 11,
    fontWeight: '800',
  },

  dayTabs: {
    paddingRight: 20,
  },
  dayTab: {
    width: 58,
    height: 57,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE9E1',
  },
  dayTabActive: {
    backgroundColor: '#1E5C35',
    borderColor: '#1E5C35',
  },
  dayTabText: {
    color: '#5C7267',
    fontSize: 12,
    fontWeight: '800',
  },
  dayTabTextActive: {
    color: '#FFFFFF',
  },
  dayDot: {
    width: 5,
    height: 5,
    marginTop: 6,
    borderRadius: 3,
    backgroundColor: '#D2DED5',
  },
  dayDotFilled: {
    backgroundColor: '#5DA476',
  },
  dayDotActive: {
    backgroundColor: '#DDF2E3',
  },

  workoutHeaderCard: {
    marginTop: 16,
    padding: 15,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2ECE6',
  },
  workoutHeaderLabel: {
    color: '#5C7267',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  workoutTitleInput: {
    marginTop: 5,
    paddingVertical: 3,
    color: '#16281D',
    fontSize: 19,
    fontWeight: '800',
  },
  workoutFocusInput: {
    marginTop: 3,
    paddingVertical: 6,
    color: '#5C7267',
    fontSize: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#E8F0EA',
  },
  workoutHeaderMeta: {
    marginTop: 11,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  workoutHeaderMetaText: {
    color: '#60766A',
    fontSize: 11,
    fontWeight: '700',
  },

  exerciseSectionHeader: {
    marginTop: 24,
    marginBottom: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addExerciseText: {
    color: '#1E5C35',
    fontSize: 13,
    fontWeight: '800',
  },

  emptyExerciseSlot: {
    minHeight: 150,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#CFE0D4',
    borderStyle: 'dashed',
    backgroundColor: '#F9FCFA',
  },
  emptyExerciseIcon: {
    color: '#1E5C35',
    fontSize: 29,
    fontWeight: '400',
  },
  emptyExerciseTitle: {
    marginTop: 5,
    color: '#1E5C35',
    fontSize: 14,
    fontWeight: '800',
  },
  emptyExerciseText: {
    marginTop: 5,
    color: '#5C7267',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },

  exerciseCard: {
    marginBottom: 12,
    padding: 14,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2ECE6',
  },
  exerciseCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  exerciseOrderBadge: {
    width: 27,
    height: 27,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#EAF4ED',
  },
  exerciseOrderText: {
    color: '#1E5C35',
    fontSize: 12,
    fontWeight: '800',
  },
  exerciseNameWrap: {
    flex: 1,
    marginLeft: 9,
    paddingRight: 6,
  },
  exerciseNameInput: {
    paddingVertical: 2,
    color: '#16281D',
    fontSize: 15,
    fontWeight: '800',
  },
  exerciseTagRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  exerciseCategoryTag: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#EEF6F0',
  },
  exerciseCategoryTagText: {
    color: '#48705A',
    fontSize: 9,
    fontWeight: '800',
  },
  exerciseEquipmentText: {
    marginLeft: 7,
    color: '#6D8175',
    fontSize: 10,
    fontWeight: '700',
  },
  exerciseMoveButtons: {
    flexDirection: 'row',
  },
  exerciseMoveButton: {
    width: 28,
    height: 28,
    marginLeft: 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#F1F6F3',
  },
  exerciseMoveButtonDisabled: {
    opacity: 0.35,
  },
  exerciseMoveButtonText: {
    color: '#1E5C35',
    fontSize: 16,
    fontWeight: '800',
  },
  exerciseDivider: {
    height: 1,
    marginTop: 13,
    marginBottom: 12,
    backgroundColor: '#EDF3EF',
  },

  prescriptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  compactField: {
    width: '31.5%',
  },
  compactFieldLabel: {
    marginBottom: 6,
    color: '#60766A',
    fontSize: 10,
    fontWeight: '800',
  },
  compactFieldInput: {
    height: 41,
    paddingHorizontal: 9,
    color: '#16281D',
    fontSize: 12,
    fontWeight: '800',
    borderRadius: 10,
    backgroundColor: '#F9FCFA',
    borderWidth: 1,
    borderColor: '#DDE9E1',
  },
  exerciseFieldLabel: {
    marginTop: 12,
    marginBottom: 6,
    color: '#60766A',
    fontSize: 10,
    fontWeight: '800',
  },
  exerciseInput: {
    minHeight: 42,
    paddingHorizontal: 11,
    color: '#16281D',
    fontSize: 12,
    borderRadius: 10,
    backgroundColor: '#F9FCFA',
    borderWidth: 1,
    borderColor: '#DDE9E1',
  },
  exerciseNotesInput: {
    minHeight: 78,
    paddingTop: 10,
    paddingBottom: 10,
  },
  removeExerciseButton: {
    alignSelf: 'flex-start',
    marginTop: 13,
    paddingVertical: 4,
  },
  removeExerciseText: {
    color: '#A13D27',
    fontSize: 11,
    fontWeight: '800',
  },

  copyDayButton: {
    height: 48,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CFE0D4',
  },
  copyDayIcon: {
    marginRight: 7,
    color: '#1E5C35',
    fontSize: 16,
    fontWeight: '800',
  },
  copyDayText: {
    color: '#1E5C35',
    fontSize: 13,
    fontWeight: '800',
  },

  draftNotice: {
    marginTop: 18,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: '#FFF7E5',
    borderWidth: 1,
    borderColor: '#F3DEAA',
  },
  draftNoticeIcon: {
    width: 20,
    height: 20,
    overflow: 'hidden',
    color: '#8A5A09',
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 20,
    textAlign: 'center',
    borderRadius: 10,
    backgroundColor: '#F7D98B',
  },
  draftNoticeText: {
    flex: 1,
    marginLeft: 8,
    color: '#7A6131',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
  },

  bottomActions: {
    marginTop: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  saveDraftButton: {
    width: '35%',
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#1E5C35',
  },
  saveDraftButtonText: {
    color: '#1E5C35',
    fontSize: 14,
    fontWeight: '800',
  },
  reviewButton: {
    width: '61%',
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#1E5C35',
    shadowColor: '#163020',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 5,
    elevation: 3,
  },
  reviewButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  modalKeyboardAvoidingView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(12, 27, 17, 0.42)',
  },
  modalCard: {
    maxHeight: '88%',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 18,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    backgroundColor: '#F5FAF6',
  },
  modalHandle: {
    width: 42,
    height: 4,
    alignSelf: 'center',
    borderRadius: 3,
    backgroundColor: '#B7C9BD',
  },
  modalScrollContent: {
    paddingBottom: 8,
  },
  modalTitle: {
    marginTop: 19,
    color: '#16281D',
    fontSize: 21,
    fontWeight: '800',
  },
  modalSubtitle: {
    marginTop: 5,
    marginBottom: 14,
    color: '#5C7267',
    fontSize: 13,
    lineHeight: 19,
  },
  exerciseSearchInput: {
    height: 47,
    paddingHorizontal: 13,
    color: '#16281D',
    fontSize: 13,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE9E1',
  },
  categoryTabs: {
    paddingTop: 12,
    paddingRight: 20,
  },
  categoryTab: {
    marginRight: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE9E1',
  },
  categoryTabActive: {
    backgroundColor: '#1E5C35',
    borderColor: '#1E5C35',
  },
  categoryTabText: {
    color: '#5C7267',
    fontSize: 11,
    fontWeight: '800',
  },
  categoryTabTextActive: {
    color: '#FFFFFF',
  },
  suggestionsContainer: {
    marginTop: 12,
  },
  suggestionCard: {
    minHeight: 66,
    marginBottom: 9,
    paddingHorizontal: 13,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0EBE3',
  },
  suggestionTextWrap: {
    flex: 1,
    paddingRight: 10,
  },
  suggestionName: {
    color: '#16281D',
    fontSize: 14,
    fontWeight: '800',
  },
  suggestionMeta: {
    marginTop: 4,
    color: '#5C7267',
    fontSize: 11,
    fontWeight: '600',
  },
  addSuggestionIcon: {
    color: '#1E5C35',
    fontSize: 22,
    fontWeight: '400',
  },
  searchStateCard: {
    minHeight: 72,
    marginTop: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0EBE3',
  },
  searchStateText: {
    color: '#5C7267',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },

  customExerciseSection: {
    marginTop: 10,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#DDE9E1',
  },
  customExerciseTitle: {
    marginBottom: 8,
    color: '#355244',
    fontSize: 13,
    fontWeight: '800',
  },
  customExerciseInput: {
    height: 47,
    paddingHorizontal: 13,
    color: '#16281D',
    fontSize: 13,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE9E1',
  },
  addCustomExerciseButton: {
    height: 47,
    marginTop: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: '#1E5C35',
  },
  addCustomExerciseButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  cancelButton: {
    height: 48,
    marginTop: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#1E5C35',
    fontSize: 14,
    fontWeight: '800',
  },
}) 