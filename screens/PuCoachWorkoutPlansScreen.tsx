
import React, { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../services/supabase'

type Props = {
  navigation: any
}

type WorkoutExercise = {
  id: string
  day_id: string
  exercise_order: number | null
  name: string
  category: string | null
  sets: number | null
  reps: string | null
  rest_seconds: number | null
  load: string | null
  equipment: string | null
  notes: string | null
}

type WorkoutDay = {
  id: string
  plan_id: string
  day_name: string | null
  day_order: number | null
  title: string | null
  focus: string | null
  exercises: WorkoutExercise[]
}

type WorkoutPlan = {
  id: string
  title: string
  goal: string | null
  duration_weeks: number | null
  sessions_per_week: number | null
  session_length_minutes: number | null
  training_location: string | null
  experience_level: string | null
  coach_notes: string | null
  days: WorkoutDay[]
}

export default function PuCoachWorkoutPlansScreen({
  navigation,
}: Props) {
  const [plans, setPlans] = useState<WorkoutPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [expandedPlanId, setExpandedPlanId] =
    useState<string | null>(null)

  const loadPlans = useCallback(async () => {
    try {
      setLoading(true)
      setErrorMessage('')

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError) throw authError
      if (!user) throw new Error('Please sign in again.')

      // Only retrieve plans assigned to the signed-in client.
      const { data: planRows, error: plansError } =
        await supabase
          .from('workout_plans')
          .select(`
            id,
            title,
            goal,
            duration_weeks,
            sessions_per_week,
            session_length_minutes,
            training_location,
            experience_level,
            coach_notes
          `)
          .eq('client_id', user.id)
          .in('status', ['approved', 'active'])
          .order('created_at', { ascending: false })

      if (plansError) throw plansError

      const formattedPlans: WorkoutPlan[] = []

      for (const plan of planRows ?? []) {
        // Get the workout days for this plan.
        const { data: dayRows, error: daysError } =
          await supabase
            .from('workout_plan_days')
            .select(`
              id,
              plan_id,
              day_name,
              day_order,
              title,
              focus
            `)
            .eq('plan_id', plan.id)
            .order('day_order', { ascending: true })

        if (daysError) throw daysError

        const formattedDays: WorkoutDay[] = []

        for (const day of dayRows ?? []) {
          // Get exercises for the selected day.
          const { data: exerciseRows, error: exercisesError } =
            await supabase
              .from('workout_plan_exercises')
              .select(`
                id,
                day_id,
                exercise_order,
                name,
                category,
                sets,
                reps,
                rest_seconds,
                load,
                equipment,
                notes
              `)
              .eq('day_id', day.id)
              .order('exercise_order', { ascending: true })

          if (exercisesError) throw exercisesError

          formattedDays.push({
            ...day,
            exercises: exerciseRows ?? [],
          })
        }

        formattedPlans.push({
          ...plan,
          days: formattedDays,
        })
      }

      setPlans(formattedPlans)
    } catch (error) {
      console.error('Unable to load workout plans:', error)

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to load workout plans.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      void loadPlans()
    }, [loadPlans])
  )

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
        >
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>

        <Text style={styles.title}>Coach Workout Plans</Text>

        <Text style={styles.subtitle}>
          Personalised workout programmes from your health coach
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#1E5C35"
          style={{ marginTop: 40 }}
        />
      ) : errorMessage ? (
        <View style={styles.card}>
          <Text style={styles.errorText}>{errorMessage}</Text>

          <Pressable onPress={() => void loadPlans()}>
            <Text style={styles.action}>Try Again</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {plans.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.emptyEmoji}>🏋️</Text>

              <Text style={styles.cardTitle}>
                No workout plans available
              </Text>

              <Text style={styles.body}>
                Your health coach has not shared an approved
                workout plan with you yet.
              </Text>
            </View>
          ) : (
            plans.map((plan) => {
              const expanded = expandedPlanId === plan.id

              return (
                <View key={plan.id} style={styles.card}>
                  <Text style={styles.cardTitle}>
                    {plan.title}
                  </Text>

                  <Text style={styles.body}>
                    Goal: {plan.goal || 'General fitness'}
                  </Text>

                  <Text style={styles.body}>
                    Duration: {plan.duration_weeks ?? '—'} weeks
                  </Text>

                  <Text style={styles.body}>
                    Frequency: {plan.sessions_per_week ?? '—'} sessions/week
                  </Text>

                  <Text style={styles.body}>
                    Session length: {plan.session_length_minutes ?? '—'} min
                  </Text>

                  {plan.training_location ? (
                    <Text style={styles.body}>
                      Location: {plan.training_location}
                    </Text>
                  ) : null}

                  {plan.experience_level ? (
                    <Text style={styles.body}>
                      Level: {plan.experience_level}
                    </Text>
                  ) : null}

                  {plan.coach_notes ? (
                    <View style={styles.notesBox}>
                      <Text style={styles.sectionTitle}>
                        Coach's Notes
                      </Text>
                      <Text style={styles.body}>
                        {plan.coach_notes}
                      </Text>
                    </View>
                  ) : null}

                  <Pressable
                    onPress={() =>
                      setExpandedPlanId(expanded ? null : plan.id)
                    }
                    accessibilityRole="button"
                  >
                    <Text style={styles.action}>
                      {expanded
                        ? 'Hide Workout Plan ▲'
                        : 'View Workout Plan ▼'}
                    </Text>
                  </Pressable>

                  {expanded ? (
                    <View style={styles.details}>
                      {plan.days.length === 0 ? (
                        <Text style={styles.body}>
                          No workout days have been added.
                        </Text>
                      ) : (
                        plan.days.map((day) => (
                          <View key={day.id} style={styles.dayCard}>
                            <Text style={styles.dayTitle}>
                              {day.day_name || day.title || 'Workout Day'}
                            </Text>

                            {day.title && day.day_name ? (
                              <Text style={styles.body}>
                                {day.title}
                              </Text>
                            ) : null}

                            {day.focus ? (
                              <Text style={styles.focus}>
                                Focus: {day.focus}
                              </Text>
                            ) : null}

                            {day.exercises.length === 0 ? (
                              <Text style={styles.body}>
                                No exercises added.
                              </Text>
                            ) : (
                              day.exercises.map((exercise) => (
                                <View
                                  key={exercise.id}
                                  style={styles.exerciseCard}
                                >
                                  <Text style={styles.exerciseName}>
                                    {exercise.name}
                                  </Text>

                                  <Text style={styles.body}>
                                    {exercise.sets ?? '—'} sets ×{' '}
                                    {exercise.reps || '—'} reps
                                  </Text>

                                  {exercise.rest_seconds != null ? (
                                    <Text style={styles.body}>
                                      Rest: {exercise.rest_seconds} seconds
                                    </Text>
                                  ) : null}

                                  {exercise.load ? (
                                    <Text style={styles.body}>
                                      Load: {exercise.load}
                                    </Text>
                                  ) : null}

                                  {exercise.equipment ? (
                                    <Text style={styles.body}>
                                      Equipment: {exercise.equipment}
                                    </Text>
                                  ) : null}

                                  {exercise.notes ? (
                                    <Text style={styles.body}>
                                      Notes: {exercise.notes}
                                    </Text>
                                  ) : null}
                                </View>
                              ))
                            )}
                          </View>
                        ))
                      )}
                    </View>
                  ) : null}
                </View>
              )
            })
          )}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5FAF6',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2ECE6',
  },
  back: {
    color: '#1E5C35',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  title: {
    color: '#16281D',
    fontSize: 23,
    fontWeight: '800',
  },
  subtitle: {
    color: '#7C8F83',
    fontSize: 13,
    marginTop: 6,
    lineHeight: 20,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2ECE6',
    padding: 18,
    marginBottom: 14,
  },
  cardTitle: {
    color: '#16281D',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  body: {
    color: '#5C7267',
    fontSize: 13,
    lineHeight: 21,
  },
  emptyEmoji: {
    fontSize: 32,
    textAlign: 'center',
    marginBottom: 12,
  },
  action: {
    color: '#1E5C35',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 18,
  },
  notesBox: {
    backgroundColor: '#EAF3EC',
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
  },
  sectionTitle: {
    color: '#16281D',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 6,
  },
  details: {
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#E2ECE6',
    paddingTop: 14,
  },
  dayCard: {
    backgroundColor: '#F5FAF6',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  dayTitle: {
    color: '#16281D',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  focus: {
    color: '#1E5C35',
    fontSize: 13,
    fontWeight: '700',
    marginVertical: 8,
  },
  exerciseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2ECE6',
  },
  exerciseName: {
    color: '#16281D',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 6,
  },
  errorText: {
    color: '#C0392B',
    fontSize: 13,
  },
})
