import React, { useMemo, useRef, useState } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { saveCoachWorkoutPlan } from '../services/workoutPlanService'

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

type WorkoutExercise = {
  id: string
  name: string
  category:
  | 'Strength'
  | 'Cardio'
  | 'Mobility'
  | 'Core'
  | 'Warm-up'
  | 'Cool-down'
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

type ReviewParams = {
  workoutPlanDraft: WorkoutPlanDraft
  workoutsByDay: Record<string, WorkoutDay>
}

export default function CoachWorkoutPlanReviewScreen({
  navigation,
  route,
}: Props) {
  const params = route.params as ReviewParams | undefined
  const plan = params?.workoutPlanDraft
  const workoutsByDay = params?.workoutsByDay ?? {}
  const [confirmed, setConfirmed] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [saving, setSaving] = useState(false)
const [submitted, setSubmitted] = useState(false)

const saveInFlight = useRef(false)

const requestKey = useRef(
  `workout-${Date.now()}-${Math.random().toString(36).slice(2)}`
)

  const issues = useMemo(() => {
    const result: string[] = []

    if (!plan) return ['Plan details are missing. Return to the builder.']

    if (!plan.clientId || plan.clientId === 'temporary-client') {
      result.push('Select a real assigned client in Plan Basics.')
    }
    if (!plan.title.trim()) result.push('Add a plan title.')
    if (!plan.goal.trim()) result.push('Choose a training goal.')
    if (!Number.isInteger(plan.durationWeeks) || plan.durationWeeks < 1) {
      result.push('Enter a valid duration in weeks.')
    }
    if (
      !Number.isInteger(plan.sessionsPerWeek) ||
      plan.sessionsPerWeek < 1 ||
      plan.sessionsPerWeek > 7 ||
      plan.preferredDays.length !== plan.sessionsPerWeek ||
      new Set(plan.preferredDays).size !== plan.preferredDays.length
    ) {
      result.push('The workout days must match the weekly session count.')
    }
    if (!Number.isFinite(plan.sessionLengthMinutes) || plan.sessionLengthMinutes <= 0) {
      result.push('Enter a valid session length.')
    }
    if (!plan.trainingLocation || !plan.experienceLevel) {
      result.push('Complete the training location and experience level.')
    }
    if (!plan.equipment.length) result.push('Select available equipment.')

    for (const day of plan.preferredDays) {
      const workout = workoutsByDay[day]

      if (!workout || workout.exercises.length === 0) {
        result.push(`${day}: add at least one exercise.`)
        continue
      }
      if (!workout.title.trim()) result.push(`${day}: add a workout title.`)

      workout.exercises.forEach((exercise, index) => {
        const label = `${day}, exercise ${index + 1}`
        const sets = Number(exercise.sets)
        const rest = Number(exercise.restSeconds)

        if (!exercise.name.trim()) result.push(`${label}: add an exercise name.`)
        if (!exercise.sets.trim() || !Number.isInteger(sets) || sets < 1) {
          result.push(`${label}: sets must be a positive whole number.`)
        }
        if (!exercise.reps.trim()) result.push(`${label}: enter reps or time.`)
        if (!exercise.restSeconds.trim() || !Number.isInteger(rest) || rest < 0) {
          result.push(`${label}: rest must be a non-negative whole number.`)
        }
        // Load is optional for bodyweight and other non-loaded exercises.
        // Equipment and notes remain in the data but are not required inputs.
      })
    }

    return result
  }, [plan, workoutsByDay])

  const days = plan?.preferredDays ?? []
  const exerciseCount = days.reduce((total, day) => {
    return total + (workoutsByDay[day]?.exercises.length ?? 0)
  }, 0)


  async function handleSavePlan(submit: boolean) {
  if (!plan || saveInFlight.current || submitted) {
    return
  }

  if (submit && (issues.length > 0 || !confirmed)) {
    setFeedback(
      'Complete the required fields and confirm your review before submitting.'
    )
    return
  }

  saveInFlight.current = true
  setSaving(true)
  setFeedback('')

  try {
    await saveCoachWorkoutPlan(
      requestKey.current,
      plan,
      workoutsByDay,
      submit
    )

    if (submit) {
  setSubmitted(true)

  navigation.reset({
    index: 0,
    routes: [
      {
        name: 'CoachTabs',
        params: {
          screen: 'CoachContent',
        },
      },
    ],
  })
} else {
      setFeedback(
        'Draft saved successfully. You can submit it from this review screen when ready.'
      )
    }
  } catch (error: any) {
    console.error('Save workout plan error:', error)

    setFeedback(
      error?.message ||
        'Unable to save the workout plan. Please try again.'
    )
  } finally {
    saveInFlight.current = false
    setSaving(false)
  }
}


  if (!plan) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.content}>
          <Text style={styles.heading}>Plan unavailable</Text>
          <Text style={styles.subtitle}>
            Open this screen from Review Plan in the workout builder.
          </Text>
          <Pressable
        onPress={() => navigation.goBack()}
        style={[
            styles.backButton,
            saving && styles.disabled,
        ]}
        disabled={saving}
        accessibilityRole="button"
        accessibilityLabel="Return to workout builder"
        accessibilityState={{ disabled: saving }}
        >
        <Text style={styles.linkText}>‹ Build Workouts</Text>
        </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Return to workout builder"
        >
          <Text style={styles.linkText}>‹ Build Workouts</Text>
        </Pressable>

        <Text style={styles.heading}>Review Workout Plan</Text>
        <Text style={styles.subtitle}>{plan.title}</Text>

        <View style={styles.card}>
          <Text style={styles.label}>STEP 3 OF 3</Text>
          <View style={styles.track}>
            <View style={styles.fill} />
          </View>
          <View style={styles.row}>
            <Text style={styles.smallText}>1. Basics</Text>
            <Text style={styles.smallText}>2. Workouts</Text>
            <Text style={styles.linkText}>3. Review</Text>
          </View>
        </View>

        <View style={[styles.card, styles.summaryCard]}>
          <Text style={styles.label}>CREATING FOR</Text>
          <Text style={styles.clientName}>{plan.clientName}</Text>
          <Detail label="Goal" value={plan.goal} />
          <Detail label="Duration" value={`${plan.durationWeeks} weeks`} />
          <Detail label="Schedule" value={`${plan.sessionsPerWeek} sessions/week`} />
          <Detail label="Workout days" value={days.join(', ')} />
          <Detail label="Session target" value={`${plan.sessionLengthMinutes} min`} />
          <Detail label="Location" value={plan.trainingLocation} />
          <Detail label="Experience" value={plan.experienceLevel} />
        </View>

        {plan.healthNotes ? (
          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>Recorded considerations</Text>
            <Text style={styles.noticeText}>{plan.healthNotes}</Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Weekly workout overview</Text>
        <Text style={styles.smallText}>
          {days.length} workout days · {exerciseCount} exercise entries
        </Text>

        {days.map((day) => {
          const workout = workoutsByDay[day]

          return (
            <View key={day} style={styles.card}>
              <Text style={styles.dayTitle}>
                {day} — {workout?.title || 'Untitled workout'}
              </Text>
              {workout?.focus ? (
                <Text style={styles.smallText}>{workout.focus}</Text>
              ) : null}

              {workout?.exercises.length ? (
                workout.exercises.map((exercise, index) => (
                  <View key={exercise.id} style={styles.exerciseRow}>
                    <Text style={styles.exerciseName}>
                      {index + 1}. {exercise.name || 'Unnamed exercise'}
                    </Text>
                    <Text style={styles.exerciseMeta}>
                      {exercise.category} · {exercise.sets || '—'} sets ×{' '}
                      {exercise.reps || '—'} · Rest {exercise.restSeconds || '—'} sec
                    </Text>
                    {exercise.load.trim() ? (
                      <Text style={styles.exerciseMeta}>
                        Load / intensity: {exercise.load}
                      </Text>
                    ) : null}
                  </View>
                ))
              ) : (
                <Text style={styles.warningText}>No exercises added.</Text>
              )}
            </View>
          )
        })}

        {plan.coachNotes ? (
          <View style={styles.card}>
            <Text style={styles.dayTitle}>Coach notes</Text>
            <Text style={styles.subtitle}>{plan.coachNotes}</Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Completeness check</Text>
        <View style={styles.card}>
          {issues.length ? (
            <>
              <Text style={styles.warningText}>
                Complete these items before submission:
              </Text>
              {issues.map((issue, index) => (
                <Text key={`${index}-${issue}`} style={styles.issueText}>
                  • {issue}
                </Text>
              ))}
            </>
          ) : (
            <Text style={styles.linkText}>
              Required fields are complete. This is not a safety or medical clearance.
            </Text>
          )}

          <Pressable
            style={[
                styles.editButton,
                (saving || submitted) && styles.disabled,
            ]}
            disabled={saving || submitted}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityState={{
                disabled: saving || submitted,
            }}
            >
            <Text style={styles.linkText}>Edit workouts ›</Text>
            </Pressable>
        </View>

        <Pressable
  style={[
    styles.confirmRow,
    (saving || submitted) && styles.disabled,
  ]}
  disabled={saving || submitted}
  onPress={() => setConfirmed((current) => !current)}
  accessibilityRole="checkbox"
  accessibilityState={{
    checked: confirmed,
    disabled: saving || submitted,
  }}
  accessibilityLabel="Confirm that you reviewed the plan for the selected client"
>
  <View
    style={[
      styles.checkbox,
      confirmed && styles.checkboxSelected,
    ]}
  >
    {confirmed ? (
      <Text style={styles.checkmark}>✓</Text>
    ) : null}
  </View>

  <Text style={styles.confirmText}>
    I have reviewed this plan for the selected client, their experience,
    and recorded considerations.
  </Text>
</Pressable>

                <View style={styles.notice}>
        <Text style={styles.noticeTitle}>
            Administrator approval required
        </Text>

        <Text style={styles.noticeText}>
            Save your plan as a private draft, or submit it for administrator review.
            Submission does not release the plan to the client.
        </Text>
        </View>
        {feedback ? (
          <Text style={styles.issueText} accessibilityLiveRegion="polite">
            {feedback}
          </Text>
        ) : null}

                <View style={styles.actions}>
        <Pressable
            style={[
            styles.secondaryButton,
            (saving || submitted) && styles.disabled,
            ]}
            disabled={saving || submitted}
            onPress={() => void handleSavePlan(false)}
            accessibilityRole="button"
            accessibilityState={{
            disabled: saving || submitted,
            }}
        >
            <Text style={styles.linkText}>
            {saving ? 'Saving...' : 'Save Draft'}
            </Text>
        </Pressable>

        <Pressable
            style={[
            styles.primaryButton,
            styles.submitButton,
            (saving ||
                submitted ||
                !confirmed ||
                issues.length > 0) &&
                styles.disabled,
            ]}
            disabled={
            saving ||
            submitted ||
            !confirmed ||
            issues.length > 0
            }
            onPress={() => void handleSavePlan(true)}
            accessibilityRole="button"
            accessibilityState={{
            disabled:
                saving ||
                submitted ||
                !confirmed ||
                issues.length > 0,
            }}
        >
            <Text style={styles.primaryButtonText}>
            {submitted
                ? 'Submitted'
                : saving
                ? 'Saving...'
                : 'Submit for Review'}
            </Text>
        </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.smallText}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
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
    paddingVertical: 10,
  },

  heading: {
    marginTop: 8,
    color: '#16281D',
    fontSize: 27,
    fontWeight: '800',
  },

  subtitle: {
    marginTop: 6,
    color: '#5C7267',
    fontSize: 14,
    lineHeight: 21,
  },

  card: {
    marginTop: 16,
    padding: 16,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2ECE6',
  },

  summaryCard: {
    backgroundColor: '#EAF4ED',
  },

  label: {
    color: '#1E5C35',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  clientName: {
    marginTop: 6,
    color: '#16281D',
    fontSize: 20,
    fontWeight: '800',
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  linkText: {
    color: '#1E5C35',
    fontSize: 13,
    fontWeight: '800',
  },

  smallText: {
    color: '#5C7267',
    fontSize: 12,
    lineHeight: 18,
  },

  track: {
    height: 7,
    marginVertical: 12,
    borderRadius: 5,
    backgroundColor: '#E8F0EA',
    overflow: 'hidden',
  },

  fill: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1E5C35',
  },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
  },

  detailValue: {
    flex: 1,
    marginLeft: 16,
    textAlign: 'right',
    color: '#294635',
    fontSize: 12,
    fontWeight: '700',
  },

  notice: {
    marginTop: 18,
    padding: 14,
    borderRadius: 15,
    backgroundColor: '#FFF7E5',
    borderWidth: 1,
    borderColor: '#F3DEAA',
  },

  noticeTitle: {
    color: '#704A08',
    fontSize: 13,
    fontWeight: '800',
  },

  noticeText: {
    marginTop: 5,
    color: '#7A6131',
    fontSize: 12,
    lineHeight: 18,
  },

  sectionTitle: {
    marginTop: 24,
    marginBottom: 6,
    color: '#16281D',
    fontSize: 18,
    fontWeight: '800',
  },

  dayTitle: {
    color: '#16281D',
    fontSize: 15,
    fontWeight: '800',
  },

  exerciseRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EDF3EF',
  },

  exerciseName: {
    color: '#16281D',
    fontSize: 14,
    fontWeight: '800',
  },

  exerciseMeta: {
    marginTop: 5,
    color: '#5C7267',
    fontSize: 12,
    lineHeight: 18,
  },

  warningText: {
    marginTop: 8,
    color: '#A13D27',
    fontSize: 13,
    fontWeight: '700',
  },

  issueText: {
    marginTop: 8,
    color: '#A13D27',
    fontSize: 12,
    lineHeight: 19,
  },

  editButton: {
    alignSelf: 'flex-start',
    marginTop: 14,
    paddingVertical: 8,
  },

  confirmRow: {
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1E5C35',
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkboxSelected: {
    backgroundColor: '#1E5C35',
  },

  checkmark: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  confirmText: {
    flex: 1,
    marginLeft: 10,
    color: '#355244',
    fontSize: 13,
    lineHeight: 20,
  },

  actions: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  secondaryButton: {
    width: '35%',
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#1E5C35',
  },

  primaryButton: {
    minHeight: 52,
    marginTop: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#1E5C35',
  },

  submitButton: {
    width: '61%',
    marginTop: 0,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  disabled: {
    opacity: 0.5,
  },

})
