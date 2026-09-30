import React, { useMemo, useState } from 'react'
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

import { supabase } from '../services/supabase'

type Props = {
  navigation: any
  route: any
}

type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'

type MealItem = {
  id: string
  mealType: MealType
  name: string
  calories: number
  serving: string
  tags: string[]
}

type PlanBasics = {
  clientId: string
  clientName: string
  clientGoal: string
  clientDietaryPreference: string
  clientAllergies: string
  planTitle: string
  goal: string
  duration: string
  calorieTarget: number
  coachNotes: string
}

type ValidationType = 'pass' | 'warning' | 'blocker'

type ValidationItem = {
  id: string
  type: ValidationType
  title: string
  description: string
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function CoachMealPlanReviewScreen({
  navigation,
  route,
}: Props) {
  const planBasics: PlanBasics = route.params?.planBasics ?? {
    clientId: 'temporary-client',
    clientName: 'Client',
    clientGoal: 'Maintenance',
    clientDietaryPreference: 'No preference',
    clientAllergies: 'None recorded',
    planTitle: 'New Meal Plan',
    goal: 'Maintenance',
    duration: '7 days',
    calorieTarget: 2000,
    coachNotes: '',
  }

  const mealsByDay: Record<string, MealItem[]> = route.params?.mealsByDay ?? {
    Mon: [],
    Tue: [],
    Wed: [],
    Thu: [],
    Fri: [],
    Sat: [],
    Sun: [],
  }

  const [submitting, setSubmitting] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [savedPlanId, setSavedPlanId] = useState<string | null>(
    route.params?.planId ?? null
  )

  const summary = useMemo(() => {
    const dailyTotals = DAYS.map((day) => {
      const meals = mealsByDay[day] ?? []

      return {
        day,
        meals,
        total: meals.reduce((sum, meal) => sum + meal.calories, 0),
      }
    })

    const totalCalories = dailyTotals.reduce(
      (sum, day) => sum + day.total,
      0
    )

    const totalMeals = dailyTotals.reduce(
      (sum, day) => sum + day.meals.length,
      0
    )

    const completedDays = dailyTotals.filter((day) => day.meals.length > 0)
    const recordedAllergies = planBasics.clientAllergies
      .split(',')
      .map((allergy) => allergy.trim().toLowerCase())
      .filter(
        (allergy) => allergy.length > 0 && allergy !== 'none recorded'
      )

    const allergyMatches = dailyTotals.flatMap((day) =>
      day.meals
        .filter((meal) => {
          const searchableText = `${meal.name} ${meal.tags.join(' ')}`.toLowerCase()

          return recordedAllergies.some((allergy) =>
            searchableText.includes(allergy)
          )
        })
        .map((meal) => ({
          day: day.day,
          meal,
        }))
    )

    const incompleteDays = dailyTotals.filter((day) => day.meals.length === 0)

    const lowCalorieDays = completedDays.filter(
      (day) => day.total < planBasics.calorieTarget * 0.9
    )

    const highCalorieDays = completedDays.filter(
      (day) => day.total > planBasics.calorieTarget * 1.1
    )

    return {
      dailyTotals,
      totalCalories,
      totalMeals,
      completedDays,
      incompleteDays,
      lowCalorieDays,
      highCalorieDays,
      allergyMatches,
    }
  }, [mealsByDay, planBasics.clientAllergies, planBasics.calorieTarget])

  const validations = useMemo<ValidationItem[]>(() => {
    const items: ValidationItem[] = []

    if (summary.incompleteDays.length === 0) {
      items.push({
        id: 'days-complete',
        type: 'pass',
        title: 'All days contain meals',
        description: 'Meals have been added for all 7 days.',
      })
    } else {
      items.push({
        id: 'days-incomplete',
        type: 'blocker',
        title: `${summary.incompleteDays.length} day${
          summary.incompleteDays.length === 1 ? '' : 's'
        } still need meals`,
        description: `Add meals for: ${summary.incompleteDays
          .map((day) => day.day)
          .join(', ')}.`,
      })
    }

    if (summary.allergyMatches.length === 0) {
      items.push({
        id: 'allergy-clear',
        type: 'pass',
        title: 'No recorded allergy matches found',
        description:
          planBasics.clientAllergies === 'None recorded'
            ? 'No allergies are recorded for this client.'
            : `No meals appear to conflict with the recorded allergies: ${planBasics.clientAllergies}.`,
      })
    } else {
      items.push({
        id: 'allergy-warning',
        type: 'blocker',
        title: 'Possible allergy conflict detected',
        description: summary.allergyMatches
          .map((match) => `${match.day}: ${match.meal.name}`)
          .join(' · '),
      })
    }

    if (
      summary.lowCalorieDays.length === 0 &&
      summary.highCalorieDays.length === 0
    ) {
      items.push({
        id: 'calorie-balanced',
        type: 'pass',
        title: 'Daily calories are within target range',
        description: `Each completed day is within 10% of ${planBasics.calorieTarget.toLocaleString()} kcal.`,
      })
    } else {
      const warningParts: string[] = []

      if (summary.lowCalorieDays.length > 0) {
        warningParts.push(
          `${summary.lowCalorieDays.map((day) => day.day).join(', ')} below target`
        )
      }

      if (summary.highCalorieDays.length > 0) {
        warningParts.push(
          `${summary.highCalorieDays.map((day) => day.day).join(', ')} above target`
        )
      }

      items.push({
        id: 'calorie-warning',
        type: 'warning',
        title: 'Some days are outside the calorie target range',
        description: warningParts.join(' · '),
      })
    }

    if (summary.totalMeals >= 21) {
      items.push({
        id: 'meal-coverage',
        type: 'pass',
        title: 'Good weekly meal coverage',
        description: `${summary.totalMeals} meals have been added to the plan.`,
      })
    } else {
      items.push({
        id: 'meal-coverage-warning',
        type: 'warning',
        title: 'Limited meal coverage',
        description: `${summary.totalMeals} meals added. Consider adding breakfast, lunch and dinner for each day.`,
      })
    }

    if (planBasics.coachNotes.trim()) {
      items.push({
        id: 'coach-notes',
        type: 'pass',
        title: 'Client guidance included',
        description: 'Coach notes will be included with the meal plan.',
      })
    } else {
      items.push({
        id: 'coach-notes-warning',
        type: 'warning',
        title: 'No client guidance added',
        description:
          'Consider adding a short preparation or adherence note for the client.',
      })
    }

    return items
  }, [planBasics, summary])

  const blockers = validations.filter((item) => item.type === 'blocker')
  const warnings = validations.filter((item) => item.type === 'warning')

  const saveDraft = async () => {
    try {
      setSavingDraft(true)

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        throw userError
      }

      if (!user) {
        Alert.alert(
          'Session expired',
          'Please sign in again before saving a meal plan.'
        )
        navigation.replace('Login')
        return
      }

      if (savedPlanId) {
        Alert.alert(
          'Draft already saved',
          'This meal plan already has a saved draft. You can submit it for review when it is ready.'
        )
        return
      }

      const { data, error } = await supabase
        .from('meal_plans')
        .insert({
          coach_id: user.id,
          client_id: planBasics.clientId,
          title: planBasics.planTitle,
          goal: planBasics.goal,
          duration: planBasics.duration,
          daily_calorie_target: planBasics.calorieTarget,
          coach_notes: planBasics.coachNotes.trim() || null,
          status: 'draft',
        })
        .select('id, title, status')
        .single()

      if (error) {
        console.error('Unable to save meal-plan draft:', error)
        throw error
      }

      setSavedPlanId(data.id)

      Alert.alert(
        'Draft saved',
        `${data.title} has been saved as a private draft. You can now submit it for system admin review when you are ready.`
      )
    } catch (error: any) {
      console.error('Unable to save meal-plan draft:', error)

      Alert.alert(
        'Could not save draft',
        error?.message ||
          'Something went wrong while saving the meal plan. Please try again.'
      )
    } finally {
      setSavingDraft(false)
    }
  }

  const editPlan = () => {
    navigation.goBack()
  }

  const submitForAdminReview = () => {
    if (blockers.length > 0) {
      Alert.alert(
        'Resolve required checks',
        'This plan has required issues that must be fixed before it can be submitted for admin review.'
      )
      return
    }

    if (!savedPlanId) {
      Alert.alert(
        'Save the draft first',
        'Save this meal plan as a draft before submitting it for admin review.'
      )
      return
    }

    Alert.alert(
      'Submit for admin review?',
      `Once submitted, ${planBasics.planTitle} will be sent to the system admin. ${planBasics.clientName} will not see it unless an admin approves and releases it.`,
      [
        {
          text: 'Keep editing',
          style: 'cancel',
        },
        {
          text: 'Submit for review',
          onPress: async () => {
            try {
              setSubmitting(true)

              const {
                data: { user },
                error: userError,
              } = await supabase.auth.getUser()

              if (userError) {
                throw userError
              }

              if (!user) {
                Alert.alert(
                  'Session expired',
                  'Please sign in again before submitting the meal plan.'
                )
                navigation.replace('Login')
                return
              }

              const { data, error } = await supabase
                .from('meal_plans')
                .update({
                  status: 'pending_review',
                  submitted_at: new Date().toISOString(),
                })
                .eq('id', savedPlanId)
                .eq('coach_id', user.id)
                .eq('status', 'draft')
                .select('id, title, status, submitted_at')
                .single()

              if (error) {
                console.error('Unable to submit meal plan for review:', error)
                throw error
              }

              Alert.alert(
                'Submitted for review',
                `${data.title} is now awaiting system admin approval. It remains private and is not visible to ${planBasics.clientName}.`,
                [
                  {
                    text: 'Back to Meal Plans',
                    onPress: () => navigation.navigate('CoachMealPlans'),
                  },
                ]
              )
            } catch (error: any) {
              console.error('Unable to submit meal plan for review:', error)

              Alert.alert(
                'Could not submit for review',
                error?.message ||
                  'Something went wrong while submitting the meal plan.',
              )
            } finally {
              setSubmitting(false)
            }
          },
        },
      ]
    )
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Go back to meal plan builder"
          >
            <Text style={styles.backButtonText}>‹ Build Plan</Text>
          </TouchableOpacity>

          <Text style={styles.pageHeading}>Review Meal Plan</Text>
          <Text style={styles.pageSubtitle}>
            Check the plan before submitting it for system admin approval.
          </Text>

          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Step 3 of 3</Text>
              <Text style={styles.progressText}>Review and submit</Text>
            </View>

            <View style={styles.progressTrack}>
              <View style={styles.progressFill} />
            </View>

            <View style={styles.progressLabels}>
              <Text style={styles.progressLabelComplete}>1. Basics</Text>
              <Text style={styles.progressLabelComplete}>2. Meals</Text>
              <Text style={styles.progressLabelActive}>3. Review</Text>
            </View>
          </View>

          <View style={styles.planSummaryCard}>
            <View style={styles.planSummaryTop}>
              <View style={styles.planSummaryTitleWrap}>
                <Text style={styles.planSummaryLabel}>Meal plan</Text>
                <Text style={styles.planSummaryTitle}>
                  {planBasics.planTitle}
                </Text>
                <Text style={styles.planSummaryClient}>
                  For {planBasics.clientName}
                </Text>
              </View>

              <View
                style={[
                  styles.draftBadge,
                  savedPlanId && styles.draftBadgeSaved,
                ]}
              >
                <Text
                  style={[
                    styles.draftBadgeText,
                    savedPlanId && styles.draftBadgeTextSaved,
                  ]}
                >
                  {savedPlanId ? 'Saved draft' : 'Draft'}
                </Text>
              </View>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryMetrics}>
              <SummaryMetric label="Duration" value={planBasics.duration} />
              <SummaryMetric
                label="Target"
                value={`${planBasics.calorieTarget.toLocaleString()} kcal`}
              />
              <SummaryMetric label="Meals" value={String(summary.totalMeals)} />
            </View>
          </View>

          <View style={styles.statusCard}>
            <View style={styles.statusCardIcon}>
              <Text style={styles.statusCardIconText}>!</Text>
            </View>

            <View style={styles.statusCardTextWrap}>
              <Text style={styles.statusCardTitle}>Not visible to client</Text>
              <Text style={styles.statusCardText}>
                Submitting sends this plan to system admin review only. The
                client receives it only after approval and release.
              </Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Plan readiness</Text>

            <Text
              style={[
                styles.readinessCount,
                blockers.length > 0
                  ? styles.readinessCountBlocked
                  : styles.readinessCountReady,
              ]}
            >
              {blockers.length > 0
                ? `${blockers.length} required issue${
                    blockers.length === 1 ? '' : 's'
                  }`
                : 'Ready to submit'}
            </Text>
          </View>

          <View style={styles.validationCard}>
            {validations.map((item, index) => (
              <ValidationRow
                key={item.id}
                item={item}
                isLast={index === validations.length - 1}
              />
            ))}
          </View>

          <Text style={styles.sectionTitle}>Daily overview</Text>
          <Text style={styles.sectionSubtitle}>
            Review calories before the plan is submitted.
          </Text>

          <View style={styles.dailyOverviewCard}>
            {summary.dailyTotals.map((day, index) => {
              const difference = day.total - planBasics.calorieTarget
              const hasMeals = day.meals.length > 0
              const isOutsideTarget =
                hasMeals &&
                Math.abs(difference) > planBasics.calorieTarget * 0.1

              return (
                <View
                  key={day.day}
                  style={[
                    styles.dailyRow,
                    index === summary.dailyTotals.length - 1 &&
                      styles.dailyRowLast,
                  ]}
                >
                  <View style={styles.dailyDayWrap}>
                    <Text style={styles.dailyDay}>{day.day}</Text>
                    <Text style={styles.dailyMealCount}>
                      {day.meals.length} meal{day.meals.length === 1 ? '' : 's'}
                    </Text>
                  </View>

                  <View style={styles.dailyCaloriesWrap}>
                    <Text
                      style={[
                        styles.dailyCalories,
                        !hasMeals && styles.dailyCaloriesMissing,
                        isOutsideTarget && styles.dailyCaloriesWarning,
                      ]}
                    >
                      {day.total.toLocaleString()} kcal
                    </Text>

                    <Text
                      style={[
                        styles.dailyDifference,
                        !hasMeals && styles.dailyDifferenceMissing,
                        isOutsideTarget && styles.dailyDifferenceWarning,
                      ]}
                    >
                      {!hasMeals
                        ? 'Needs meals'
                        : difference === 0
                        ? 'On target'
                        : difference > 0
                        ? `${difference.toLocaleString()} over`
                        : `${Math.abs(difference).toLocaleString()} under`}
                    </Text>
                  </View>
                </View>
              )
            })}
          </View>

          <Text style={styles.sectionTitle}>Client notes</Text>

          <View style={styles.notesCard}>
            {planBasics.coachNotes.trim() ? (
              <Text style={styles.notesText}>{planBasics.coachNotes}</Text>
            ) : (
              <Text style={styles.notesEmptyText}>
                No client notes have been added yet.
              </Text>
            )}
          </View>

          <View style={styles.reviewInfoCard}>
            <Text style={styles.reviewInfoTitle}>What happens next?</Text>
            <Text style={styles.reviewInfoText}>
              1. You save the plan as a draft.{'\n'}
              2. You submit the saved plan for review.{'\n'}
              3. The system admin approves it or requests changes.{'\n'}
              4. Only an approved plan can be released to the client.
            </Text>
          </View>

          <View style={styles.bottomActions}>
            <Pressable
              style={[
                styles.saveDraftButton,
                savingDraft && styles.buttonDisabled,
              ]}
              onPress={saveDraft}
              disabled={savingDraft || submitting || Boolean(savedPlanId)}
              accessibilityRole="button"
              accessibilityLabel="Save meal plan draft"
            >
              <Text style={styles.saveDraftButtonText}>
                {savingDraft
                  ? 'Saving...'
                  : savedPlanId
                  ? 'Draft Saved'
                  : 'Save Draft'}
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.submitButton,
                (blockers.length > 0 || !savedPlanId) &&
                  styles.submitButtonDisabled,
              ]}
              onPress={submitForAdminReview}
              disabled={submitting || savingDraft}
              accessibilityRole="button"
              accessibilityLabel="Submit meal plan for admin review"
            >
              <Text style={styles.submitButtonText}>
                {submitting
                  ? 'Submitting...'
                  : savedPlanId
                  ? 'Submit for Review'
                  : 'Save Draft First'}
              </Text>
            </Pressable>
          </View>

          {warnings.length > 0 ? (
            <TouchableOpacity
              style={styles.editPlanButton}
              onPress={editPlan}
              accessibilityRole="button"
              accessibilityLabel="Go back and edit meal plan"
            >
              <Text style={styles.editPlanButtonText}>‹ Edit meal plan</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryMetric}>
      <Text style={styles.summaryMetricLabel}>{label}</Text>
      <Text style={styles.summaryMetricValue}>{value}</Text>
    </View>
  )
}

function ValidationRow({
  item,
  isLast,
}: {
  item: ValidationItem
  isLast: boolean
}) {
  const theme = getValidationTheme(item.type)

  return (
    <View style={[styles.validationRow, isLast && styles.validationRowLast]}>
      <View style={[styles.validationIcon, { backgroundColor: theme.bg }]}>
        <Text style={[styles.validationIconText, { color: theme.color }]}>
          {theme.icon}
        </Text>
      </View>

      <View style={styles.validationTextWrap}>
        <Text style={styles.validationTitle}>{item.title}</Text>
        <Text style={styles.validationDescription}>{item.description}</Text>
      </View>
    </View>
  )
}

function getValidationTheme(type: ValidationType) {
  const themes: Record<
    ValidationType,
    { color: string; bg: string; icon: string }
  > = {
    pass: {
      color: '#1E5C35',
      bg: '#DFF1E4',
      icon: '✓',
    },
    warning: {
      color: '#8A5A09',
      bg: '#FFF0C8',
      icon: '!',
    },
    blocker: {
      color: '#9B3B27',
      bg: '#FBD6CB',
      icon: '!',
    },
  }

  return themes[type]
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
    marginTop: 6,
    color: '#5C7267',
    fontSize: 14,
    lineHeight: 21,
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
    width: '100%',
    height: '100%',
    borderRadius: 5,
    backgroundColor: '#1E5C35',
  },
  progressLabels: {
    marginTop: 9,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabelComplete: {
    color: '#4C7460',
    fontSize: 10,
    fontWeight: '800',
  },
  progressLabelActive: {
    color: '#1E5C35',
    fontSize: 10,
    fontWeight: '800',
  },

  planSummaryCard: {
    marginTop: 18,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2ECE6',
  },
  planSummaryTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  planSummaryTitleWrap: {
    flex: 1,
    paddingRight: 10,
  },
  planSummaryLabel: {
    color: '#7C8F83',
    fontSize: 11,
    fontWeight: '700',
  },
  planSummaryTitle: {
    marginTop: 4,
    color: '#16281D',
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 23,
  },
  planSummaryClient: {
    marginTop: 4,
    color: '#1E5C35',
    fontSize: 13,
    fontWeight: '700',
  },
  draftBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 11,
    backgroundColor: '#EEF2EF',
  },
  draftBadgeSaved: {
    backgroundColor: '#E4F3E8',
  },
  draftBadgeText: {
    color: '#64756B',
    fontSize: 10,
    fontWeight: '800',
  },
  draftBadgeTextSaved: {
    color: '#1E5C35',
  },
  summaryDivider: {
    height: 1,
    marginTop: 15,
    marginBottom: 13,
    backgroundColor: '#EDF3EF',
  },
  summaryMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryMetric: {
    flex: 1,
  },
  summaryMetricLabel: {
    color: '#7C8F83',
    fontSize: 10,
    fontWeight: '700',
  },
  summaryMetricValue: {
    marginTop: 4,
    color: '#355244',
    fontSize: 12,
    fontWeight: '800',
  },

  statusCard: {
    marginTop: 14,
    padding: 14,
    flexDirection: 'row',
    borderRadius: 16,
    backgroundColor: '#FFF7E5',
    borderWidth: 1,
    borderColor: '#F3DEAA',
  },
  statusCardIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#F7D98B',
  },
  statusCardIconText: {
    color: '#8A5A09',
    fontSize: 14,
    fontWeight: '900',
  },
  statusCardTextWrap: {
    flex: 1,
    marginLeft: 10,
  },
  statusCardTitle: {
    color: '#704A08',
    fontSize: 13,
    fontWeight: '800',
  },
  statusCardText: {
    marginTop: 3,
    color: '#7A6131',
    fontSize: 12,
    lineHeight: 17,
  },

  sectionHeader: {
    marginTop: 25,
    marginBottom: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    marginTop: 25,
    color: '#16281D',
    fontSize: 18,
    fontWeight: '800',
  },
  sectionSubtitle: {
    marginTop: 4,
    marginBottom: 11,
    color: '#7C8F83',
    fontSize: 12,
    lineHeight: 18,
  },
  readinessCount: {
    fontSize: 11,
    fontWeight: '800',
  },
  readinessCountReady: {
    color: '#1E5C35',
  },
  readinessCountBlocked: {
    color: '#A13D27',
  },

  validationCard: {
    overflow: 'hidden',
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2ECE6',
  },
  validationRow: {
    padding: 14,
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#EDF3EF',
  },
  validationRowLast: {
    borderBottomWidth: 0,
  },
  validationIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  validationIconText: {
    fontSize: 13,
    fontWeight: '900',
  },
  validationTextWrap: {
    flex: 1,
    marginLeft: 10,
  },
  validationTitle: {
    color: '#274334',
    fontSize: 13,
    fontWeight: '800',
  },
  validationDescription: {
    marginTop: 3,
    color: '#61776A',
    fontSize: 11,
    lineHeight: 16,
  },

  dailyOverviewCard: {
    marginTop: 11,
    overflow: 'hidden',
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2ECE6',
  },
  dailyRow: {
    minHeight: 58,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#EDF3EF',
  },
  dailyRowLast: {
    borderBottomWidth: 0,
  },
  dailyDayWrap: {
    flex: 1,
  },
  dailyDay: {
    color: '#274334',
    fontSize: 13,
    fontWeight: '800',
  },
  dailyMealCount: {
    marginTop: 3,
    color: '#7C8F83',
    fontSize: 10,
    fontWeight: '700',
  },
  dailyCaloriesWrap: {
    alignItems: 'flex-end',
  },
  dailyCalories: {
    color: '#1E5C35',
    fontSize: 12,
    fontWeight: '800',
  },
  dailyCaloriesMissing: {
    color: '#A13D27',
  },
  dailyCaloriesWarning: {
    color: '#8A5A09',
  },
  dailyDifference: {
    marginTop: 3,
    color: '#4B8060',
    fontSize: 10,
    fontWeight: '800',
  },
  dailyDifferenceMissing: {
    color: '#A13D27',
  },
  dailyDifferenceWarning: {
    color: '#8A5A09',
  },

  notesCard: {
    marginTop: 11,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2ECE6',
  },
  notesText: {
    color: '#496656',
    fontSize: 13,
    lineHeight: 20,
  },
  notesEmptyText: {
    color: '#8A9B91',
    fontSize: 13,
    fontStyle: 'italic',
  },

  reviewInfoCard: {
    marginTop: 20,
    padding: 15,
    borderRadius: 17,
    backgroundColor: '#EAF4ED',
    borderWidth: 1,
    borderColor: '#D5E8DA',
  },
  reviewInfoTitle: {
    color: '#1E5C35',
    fontSize: 14,
    fontWeight: '800',
  },
  reviewInfoText: {
    marginTop: 8,
    color: '#496656',
    fontSize: 12,
    lineHeight: 19,
  },

  bottomActions: {
    marginTop: 24,
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
  submitButton: {
    width: '61%',
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#1E5C35',
    shadowColor: '#163020',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.16,
    shadowRadius: 5,
    elevation: 3,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CB3A3',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  editPlanButton: {
    height: 46,
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editPlanButtonText: {
    color: '#1E5C35',
    fontSize: 13,
    fontWeight: '800',
  },
})
