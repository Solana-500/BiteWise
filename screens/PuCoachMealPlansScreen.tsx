
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

type CoachMeal = {
  id: string
  day: string
  meal_type: string
  name: string
  calories: number | null
  serving: string | null
}

type CoachMealPlan = {
  id: string
  title: string
  goal: string | null
  duration: string | null
  daily_calorie_target: number | null
  coach_notes: string | null
  status: string
  meals: CoachMeal[]
}

export default function PuCoachMealPlansScreen({
  navigation,
}: Props) {
  const [plans, setPlans] = useState<CoachMealPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

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

      // Retrieve only plans assigned to this user.
      const { data: planRows, error: plansError } =
        await supabase
          .from('meal_plans')
          .select(`
            id,
            title,
            goal,
            duration,
            daily_calorie_target,
            coach_notes,
            status
          `)
          .eq('client_id', user.id)
          .in('status', ['approved', 'active'])
          .order('updated_at', { ascending: false })

      if (plansError) throw plansError

      const formattedPlans: CoachMealPlan[] = []

      for (const plan of planRows ?? []) {
        const { data: mealRows, error: mealsError } =
          await supabase
            .from('meal_plan_meals')
            .select(`
              id,
              day,
              meal_type,
              name,
              calories,
              serving
            `)
            .eq('plan_id', plan.id)

        if (mealsError) throw mealsError

        formattedPlans.push({
          id: plan.id,
          title: plan.title,
          goal: plan.goal,
          duration: plan.duration,
          daily_calorie_target: plan.daily_calorie_target,
          coach_notes: plan.coach_notes,
          status: plan.status,
          meals: mealRows ?? [],
        })
      }

      setPlans(formattedPlans)
    } catch (error: any) {
      console.error('Unable to load coach meal plans:', error)
      setErrorMessage(
        error?.message || 'Unable to load meal plans.'
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
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>‹ Back</Text>
        </Pressable>

        <Text style={styles.heading}>Coach Meal Plans</Text>
        <Text style={styles.subtitle}>
          Personalised nutrition plans from your health coach
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
          <Text style={styles.errorText}>
            {errorMessage}
          </Text>

          <Pressable onPress={() => void loadPlans()}>
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {plans.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.emptyTitle}>
                No meal plans available
              </Text>

              <Text style={styles.subtitle}>
                Your coach has not released an approved
                meal plan for you yet.
              </Text>
            </View>
          ) : (
            plans.map((plan) => (
              <View key={plan.id} style={styles.card}>
                <Text style={styles.planTitle}>
                  {plan.title}
                </Text>

                <Text style={styles.planInfo}>
                  Goal: {plan.goal || 'General nutrition'}
                </Text>

                <Text style={styles.planInfo}>
                  Duration: {plan.duration || 'Not specified'}
                </Text>

                <Text style={styles.planInfo}>
                  Daily target: {
                    plan.daily_calorie_target ?? 'Not specified'
                  } kcal
                </Text>

                {plan.coach_notes ? (
                  <View style={styles.notesBox}>
                    <Text style={styles.notesHeading}>
                      Coach's Notes
                    </Text>
                    <Text style={styles.planInfo}>
                      {plan.coach_notes}
                    </Text>
                  </View>
                ) : null}

                <Text style={styles.mealsHeading}>
                  Your Meals
                </Text>

                {plan.meals.length === 0 ? (
                  <Text style={styles.planInfo}>
                    No meals have been added.
                  </Text>
                ) : (
                  plan.meals.map((meal) => (
                    <View
                      key={meal.id}
                      style={styles.mealCard}
                    >
                      <Text style={styles.mealName}>
                        {meal.name}
                      </Text>

                      <Text style={styles.planInfo}>
                        {meal.day} · {meal.meal_type}
                      </Text>

                      <Text style={styles.planInfo}>
                        {meal.calories ?? '—'} kcal
                        {meal.serving
                          ? ` · ${meal.serving}`
                          : ''}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            ))
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
  backButton: {
    color: '#1E5C35',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  heading: {
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
    paddingBottom: 36,
  },
  card: {
    margin: 20,
    marginBottom: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2ECE6',
    padding: 18,
  },
  planTitle: {
    color: '#16281D',
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 12,
  },
  planInfo: {
    color: '#5C7267',
    fontSize: 13,
    lineHeight: 21,
  },
  notesBox: {
    backgroundColor: '#EAF3EC',
    padding: 12,
    borderRadius: 12,
    marginTop: 14,
  },
  notesHeading: {
    color: '#1E5C35',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 5,
  },
  mealsHeading: {
    color: '#16281D',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 20,
    marginBottom: 8,
  },
  mealCard: {
    backgroundColor: '#F5FAF6',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  mealName: {
    color: '#16281D',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptyTitle: {
    color: '#16281D',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 8,
  },
  errorText: {
    color: '#C0392B',
    fontSize: 14,
    marginBottom: 12,
  },
  retryText: {
    color: '#1E5C35',
    fontSize: 14,
    fontWeight: '700',
  },
})
