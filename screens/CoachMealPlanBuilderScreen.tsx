import React, { useMemo, useState } from 'react'
import {
  Alert,
  Modal,
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

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const MEAL_TYPES: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack']

const MEAL_SUGGESTIONS: Record<
  MealType,
  Array<{
    name: string
    calories: number
    serving: string
    tags: string[]
  }>
> = {
  Breakfast: [
    {
      name: 'Overnight oats with berries',
      calories: 410,
      serving: '1 bowl',
      tags: ['High fibre'],
    },
    {
      name: 'Greek yogurt, fruit and granola',
      calories: 385,
      serving: '1 bowl',
      tags: ['High protein'],
    },
    {
      name: 'Egg and wholegrain toast',
      calories: 430,
      serving: '2 eggs + 2 slices',
      tags: ['High protein'],
    },
  ],
  Lunch: [
    {
      name: 'Chicken brown-rice bowl',
      calories: 560,
      serving: '1 bowl',
      tags: ['High protein'],
    },
    {
      name: 'Tofu vegetable grain bowl',
      calories: 510,
      serving: '1 bowl',
      tags: ['Vegetarian'],
    },
    {
      name: 'Tuna wrap with salad',
      calories: 480,
      serving: '1 wrap',
      tags: ['Quick meal'],
    },
  ],
  Dinner: [
    {
      name: 'Salmon, vegetables and quinoa',
      calories: 620,
      serving: '1 plate',
      tags: ['High protein'],
    },
    {
      name: 'Chicken stir-fry with rice',
      calories: 610,
      serving: '1 plate',
      tags: ['Quick meal'],
    },
    {
      name: 'Lentil curry with brown rice',
      calories: 575,
      serving: '1 bowl',
      tags: ['Vegetarian', 'High fibre'],
    },
  ],
  Snack: [
    {
      name: 'Apple with peanut butter',
      calories: 230,
      serving: '1 apple + 1 tbsp',
      tags: ['Contains peanuts'],
    },
    {
      name: 'Banana with yogurt',
      calories: 205,
      serving: '1 banana + 1 cup',
      tags: ['High protein'],
    },
    {
      name: 'Hummus with vegetable sticks',
      calories: 190,
      serving: '1 cup',
      tags: ['Vegetarian'],
    },
  ],
}

export default function CoachMealPlanBuilderScreen({
  navigation,
  route,
}: Props) {
  const planBasics: PlanBasics = route.params?.planBasics ?? {
    clientId: 'temporary-client',
    clientName: 'Client',
    clientGoal: 'Healthy eating',
    clientDietaryPreference: 'No preference',
    clientAllergies: 'None recorded',
    planTitle: 'New Meal Plan',
    goal: 'Healthy eating',
    duration: '7 days',
    calorieTarget: 2000,
    coachNotes: '',
  }

  const [selectedDay, setSelectedDay] = useState('Mon')
  const [mealsByDay, setMealsByDay] = useState<Record<string, MealItem[]>>({
    Mon: [
      {
        id: 'mon-breakfast',
        mealType: 'Breakfast',
        name: 'Overnight oats with berries',
        calories: 410,
        serving: '1 bowl',
        tags: ['High fibre'],
      },
      {
        id: 'mon-lunch',
        mealType: 'Lunch',
        name: 'Chicken brown-rice bowl',
        calories: 560,
        serving: '1 bowl',
        tags: ['High protein'],
      },
      {
        id: 'mon-dinner',
        mealType: 'Dinner',
        name: 'Salmon, vegetables and quinoa',
        calories: 620,
        serving: '1 plate',
        tags: ['High protein'],
      },
    ],
    Tue: [],
    Wed: [],
    Thu: [],
    Fri: [],
    Sat: [],
    Sun: [],
  })

  const [addMealModalVisible, setAddMealModalVisible] = useState(false)
  const [selectedMealType, setSelectedMealType] =
    useState<MealType>('Breakfast')

  const dayMeals = mealsByDay[selectedDay] ?? []

  const dailyCalories = useMemo(() => {
    return dayMeals.reduce((total, meal) => total + meal.calories, 0)
  }, [dayMeals])

  const dailyDifference = planBasics.calorieTarget - dailyCalories

  const allWeekCalories = useMemo(() => {
    return DAYS.reduce((total, day) => {
      const dayTotal = (mealsByDay[day] ?? []).reduce(
        (sum, meal) => sum + meal.calories,
        0
      )

      return total + dayTotal
    }, 0)
  }, [mealsByDay])

  const completedDays = useMemo(() => {
    return DAYS.filter((day) => (mealsByDay[day] ?? []).length > 0).length
  }, [mealsByDay])

  const containsAllergen = (meal: MealItem) => {
    const allergy = planBasics.clientAllergies.toLowerCase()

    if (allergy === 'none recorded') {
      return false
    }

    const searchableText = `${meal.name} ${meal.tags.join(' ')}`.toLowerCase()

    return searchableText.includes(allergy)
  }

  const addSuggestedMeal = (
    suggestion: (typeof MEAL_SUGGESTIONS)[MealType][number]
  ) => {
    const newMeal: MealItem = {
      id: `${selectedDay}-${selectedMealType}-${Date.now()}`,
      mealType: selectedMealType,
      name: suggestion.name,
      calories: suggestion.calories,
      serving: suggestion.serving,
      tags: suggestion.tags,
    }

    setMealsByDay((currentMeals) => ({
      ...currentMeals,
      [selectedDay]: [...(currentMeals[selectedDay] ?? []), newMeal],
    }))

    setAddMealModalVisible(false)
  }

  const removeMeal = (mealId: string) => {
    Alert.alert('Remove meal?', 'This meal will be removed from this day.', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          setMealsByDay((currentMeals) => ({
            ...currentMeals,
            [selectedDay]: (currentMeals[selectedDay] ?? []).filter(
              (meal) => meal.id !== mealId
            ),
          }))
        },
      },
    ])
  }

  const copyDay = () => {
    const mealsToCopy = mealsByDay[selectedDay] ?? []

    if (mealsToCopy.length === 0) {
      Alert.alert(
        'Nothing to copy',
        `Add at least one meal to ${selectedDay} before copying it.`
      )
      return
    }

    const nextDayIndex = DAYS.indexOf(selectedDay) + 1
    const destinationDay = DAYS[nextDayIndex]

    if (!destinationDay) {
      Alert.alert(
        'Last day selected',
        'Choose another day to copy this meal plan into.'
      )
      return
    }

    const copiedMeals = mealsToCopy.map((meal) => ({
      ...meal,
      id: `${destinationDay}-${meal.mealType}-${Date.now()}-${Math.random()}`,
    }))

    setMealsByDay((currentMeals) => ({
      ...currentMeals,
      [destinationDay]: copiedMeals,
    }))

    Alert.alert(
      'Day copied',
      `${selectedDay}'s meals were copied to ${destinationDay}.`
    )
  }

  const saveDraft = () => {
    Alert.alert(
      'Draft saved',
      `${planBasics.planTitle} is saved as a private draft. It is not visible to ${planBasics.clientName} or the system admin yet.`
    )
  }

  const continueToReview = () => {
  if (completedDays === 0) {
    Alert.alert(
      'Add meals first',
      'Add meals to at least one day before continuing to review.'
    )
    return
  }

  navigation.navigate('CoachMealPlanReview', {
    planBasics,
    mealsByDay,
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
            accessibilityLabel="Go back to meal plan basics"
          >
            <Text style={styles.backButtonText}>‹ Plan Basics</Text>
          </TouchableOpacity>

          <Text style={styles.pageHeading}>Build Meal Plan</Text>
          <Text style={styles.pageSubtitle}>{planBasics.planTitle}</Text>

          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Step 2 of 3</Text>
              <Text style={styles.progressText}>Add meals</Text>
            </View>

            <View style={styles.progressTrack}>
              <View style={styles.progressFill} />
            </View>

            <View style={styles.progressLabels}>
              <Text style={styles.progressLabelComplete}>1. Basics</Text>
              <Text style={styles.progressLabelActive}>2. Meals</Text>
              <Text style={styles.progressLabel}>3. Review</Text>
            </View>
          </View>

          <View style={styles.clientSummaryCard}>
            <View style={styles.clientSummaryTop}>
              <View>
                <Text style={styles.clientSummaryLabel}>Creating for</Text>
                <Text style={styles.clientSummaryName}>
                  {planBasics.clientName}
                </Text>
              </View>

              <View style={styles.goalBadge}>
                <Text style={styles.goalBadgeText}>{planBasics.goal}</Text>
              </View>
            </View>

            <View style={styles.clientSummaryDivider} />

            <View style={styles.clientSummaryInfoRow}>
              <ClientInfo label="Target" value={`${planBasics.calorieTarget} kcal/day`} />
              <ClientInfo
                label="Diet"
                value={planBasics.clientDietaryPreference}
              />
            </View>

            {planBasics.clientAllergies !== 'None recorded' ? (
              <View style={styles.allergyBanner}>
                <Text style={styles.allergyIcon}>!</Text>
                <Text style={styles.allergyText}>
                  Allergy recorded: {planBasics.clientAllergies}. Meals with a
                  possible match will be flagged.
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.daySectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Plan days</Text>
              <Text style={styles.sectionSubtitle}>
                {completedDays}/7 days have meals
              </Text>
            </View>

            <Text style={styles.weekTotalText}>
              {allWeekCalories.toLocaleString()} kcal total
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dayTabs}
          >
            {DAYS.map((day) => {
              const isSelected = selectedDay === day
              const dayHasMeals = (mealsByDay[day] ?? []).length > 0

              return (
                <Pressable
                  key={day}
                  style={[styles.dayTab, isSelected && styles.dayTabActive]}
                  onPress={() => setSelectedDay(day)}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${day}`}
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
                      dayHasMeals && styles.dayDotFilled,
                      isSelected && styles.dayDotActive,
                    ]}
                  />
                </Pressable>
              )
            })}
          </ScrollView>

          <View style={styles.dayTotalCard}>
            <View>
              <Text style={styles.dayTotalTitle}>{selectedDay} total</Text>
              <Text style={styles.dayTotalValue}>
                {dailyCalories.toLocaleString()} kcal
              </Text>
            </View>

            <View style={styles.targetSummary}>
              <Text style={styles.targetSummaryLabel}>Daily target</Text>
              <Text style={styles.targetSummaryValue}>
                {planBasics.calorieTarget.toLocaleString()} kcal
              </Text>
              <Text
                style={[
                  styles.targetDifference,
                  dailyDifference < 0 && styles.targetDifferenceOver,
                ]}
              >
                {dailyDifference >= 0
                  ? `${dailyDifference.toLocaleString()} kcal remaining`
                  : `${Math.abs(dailyDifference).toLocaleString()} kcal over`}
              </Text>
            </View>
          </View>

          {MEAL_TYPES.map((mealType) => {
            const mealsForType = dayMeals.filter(
              (meal) => meal.mealType === mealType
            )

            return (
              <View key={mealType} style={styles.mealSection}>
                <View style={styles.mealSectionHeader}>
                  <Text style={styles.mealSectionTitle}>{mealType}</Text>

                  <Pressable
                    onPress={() => {
                      setSelectedMealType(mealType)
                      setAddMealModalVisible(true)
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Add ${mealType.toLowerCase()}`}
                  >
                    <Text style={styles.addMealText}>+ Add</Text>
                  </Pressable>
                </View>

                {mealsForType.length > 0 ? (
                  mealsForType.map((meal) => (
                    <MealCard
                      key={meal.id}
                      meal={meal}
                      allergyMatch={containsAllergen(meal)}
                      onRemove={() => removeMeal(meal.id)}
                    />
                  ))
                ) : (
                  <Pressable
                    style={styles.emptyMealSlot}
                    onPress={() => {
                      setSelectedMealType(mealType)
                      setAddMealModalVisible(true)
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Add a ${mealType.toLowerCase()}`}
                  >
                    <Text style={styles.emptyMealSlotText}>
                      + Add {mealType.toLowerCase()}
                    </Text>
                  </Pressable>
                )}
              </View>
            )
          })}

          <Pressable
            style={styles.copyDayButton}
            onPress={copyDay}
            accessibilityRole="button"
            accessibilityLabel={`Copy ${selectedDay} meals to the next day`}
          >
            <Text style={styles.copyDayIcon}>⧉</Text>
            <Text style={styles.copyDayText}>
              Copy {selectedDay} meals to next day
            </Text>
          </Pressable>

          <View style={styles.draftNotice}>
            <Text style={styles.draftNoticeIcon}>i</Text>
            <Text style={styles.draftNoticeText}>
              This plan remains a draft until you finish review and submit it
              for system admin approval.
            </Text>
          </View>

          <View style={styles.bottomActions}>
            <Pressable
              style={styles.saveDraftButton}
              onPress={saveDraft}
              accessibilityRole="button"
              accessibilityLabel="Save meal plan draft"
            >
              <Text style={styles.saveDraftButtonText}>Save Draft</Text>
            </Pressable>

            <Pressable
              style={styles.reviewButton}
              onPress={continueToReview}
              accessibilityRole="button"
              accessibilityLabel="Review meal plan"
            >
              <Text style={styles.reviewButtonText}>Review Plan ›</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={addMealModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddMealModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setAddMealModalVisible(false)}
        >
          <Pressable
            style={styles.modalCard}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.modalHandle} />

            <Text style={styles.modalTitle}>
              Add {selectedMealType.toLowerCase()}
            </Text>

            <Text style={styles.modalSubtitle}>
              Select a suggested meal for {selectedDay}. You can add a recipe
              library and custom meal option later.
            </Text>

            {MEAL_SUGGESTIONS[selectedMealType].map((suggestion) => {
              const hasAllergyMatch = containsAllergen({
                id: 'check',
                mealType: selectedMealType,
                name: suggestion.name,
                calories: suggestion.calories,
                serving: suggestion.serving,
                tags: suggestion.tags,
              })

              return (
                <Pressable
                  key={suggestion.name}
                  style={[
                    styles.suggestionCard,
                    hasAllergyMatch && styles.suggestionCardWarning,
                  ]}
                  onPress={() => addSuggestedMeal(suggestion)}
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${suggestion.name}`}
                >
                  <View style={styles.suggestionTextWrap}>
                    <Text style={styles.suggestionName}>{suggestion.name}</Text>
                    <Text style={styles.suggestionMeta}>
                      {suggestion.serving} · {suggestion.calories} kcal
                    </Text>

                    <View style={styles.tagsRow}>
                      {suggestion.tags.map((tag) => (
                        <View key={tag} style={styles.tag}>
                          <Text style={styles.tagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {hasAllergyMatch ? (
                    <Text style={styles.warningMark}>!</Text>
                  ) : (
                    <Text style={styles.addSuggestionIcon}>＋</Text>
                  )}
                </Pressable>
              )
            })}

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setAddMealModalVisible(false)}
              accessibilityRole="button"
              accessibilityLabel="Close add meal options"
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

function ClientInfo({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.clientInfo}>
      <Text style={styles.clientInfoLabel}>{label}</Text>
      <Text style={styles.clientInfoValue}>{value}</Text>
    </View>
  )
}

function MealCard({
  meal,
  allergyMatch,
  onRemove,
}: {
  meal: MealItem
  allergyMatch: boolean
  onRemove: () => void
}) {
  return (
    <View
      style={[
        styles.mealCard,
        allergyMatch && styles.mealCardAllergyWarning,
      ]}
    >
      <View style={styles.mealCardTop}>
        <View style={styles.mealTextWrap}>
          <Text style={styles.mealName}>{meal.name}</Text>
          <Text style={styles.mealServing}>{meal.serving}</Text>
        </View>

        <Text style={styles.mealCalories}>{meal.calories} kcal</Text>
      </View>

      <View style={styles.mealCardBottom}>
        <View style={styles.tagsRow}>
          {meal.tags.map((tag) => (
            <View
              key={tag}
              style={[styles.tag, allergyMatch && styles.tagWarning]}
            >
              <Text
                style={[styles.tagText, allergyMatch && styles.tagTextWarning]}
              >
                {tag}
              </Text>
            </View>
          ))}
        </View>

        <Pressable
          onPress={onRemove}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${meal.name}`}
        >
          <Text style={styles.removeMealText}>Remove</Text>
        </Pressable>
      </View>

      {allergyMatch ? (
        <View style={styles.allergyMealAlert}>
          <Text style={styles.allergyMealAlertText}>
            Possible match with recorded allergy: {meal.name}.
          </Text>
        </View>
      ) : null}
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
  },
  clientInfoLabel: {
    color: '#61776A',
    fontSize: 10,
    fontWeight: '700',
  },
  clientInfoValue: {
    marginTop: 3,
    color: '#294635',
    fontSize: 12,
    fontWeight: '800',
  },
  allergyBanner: {
    marginTop: 13,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 11,
    backgroundColor: '#FFF0EA',
    borderWidth: 1,
    borderColor: '#F5D1C4',
  },
  allergyIcon: {
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
  allergyText: {
    flex: 1,
    marginLeft: 7,
    color: '#864431',
    fontSize: 11,
    fontWeight: '700',
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
  weekTotalText: {
    color: '#5C7267',
    fontSize: 11,
    fontWeight: '800',
  },

  dayTabs: {
    paddingRight: 20,
  },
  dayTab: {
    width: 52,
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

  dayTotalCard: {
    marginTop: 16,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2ECE6',
  },
  dayTotalTitle: {
    color: '#5C7267',
    fontSize: 12,
    fontWeight: '700',
  },
  dayTotalValue: {
    marginTop: 3,
    color: '#16281D',
    fontSize: 22,
    fontWeight: '800',
  },
  targetSummary: {
    alignItems: 'flex-end',
  },
  targetSummaryLabel: {
    color: '#7C8F83',
    fontSize: 10,
    fontWeight: '700',
  },
  targetSummaryValue: {
    marginTop: 3,
    color: '#355244',
    fontSize: 12,
    fontWeight: '800',
  },
  targetDifference: {
    marginTop: 4,
    color: '#1E5C35',
    fontSize: 10,
    fontWeight: '800',
  },
  targetDifferenceOver: {
    color: '#A13D27',
  },

  mealSection: {
    marginTop: 22,
  },
  mealSectionHeader: {
    marginBottom: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mealSectionTitle: {
    color: '#355244',
    fontSize: 14,
    fontWeight: '800',
  },
  addMealText: {
    color: '#1E5C35',
    fontSize: 13,
    fontWeight: '800',
  },

  mealCard: {
    marginBottom: 9,
    padding: 14,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2ECE6',
  },
  mealCardAllergyWarning: {
    backgroundColor: '#FFF9F6',
    borderColor: '#F1B9A8',
  },
  mealCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mealTextWrap: {
    flex: 1,
    paddingRight: 10,
  },
  mealName: {
    color: '#16281D',
    fontSize: 14,
    fontWeight: '800',
  },
  mealServing: {
    marginTop: 4,
    color: '#6D8175',
    fontSize: 11,
    fontWeight: '600',
  },
  mealCalories: {
    color: '#1E5C35',
    fontSize: 12,
    fontWeight: '800',
  },
  mealCardBottom: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tagsRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    marginRight: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9,
    backgroundColor: '#EEF6F0',
  },
  tagWarning: {
    backgroundColor: '#FDE7DF',
  },
  tagText: {
    color: '#48705A',
    fontSize: 9,
    fontWeight: '800',
  },
  tagTextWarning: {
    color: '#9B3B27',
  },
  removeMealText: {
    marginLeft: 8,
    color: '#A13D27',
    fontSize: 11,
    fontWeight: '800',
  },
  allergyMealAlert: {
    marginTop: 10,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: '#F1D3C8',
  },
  allergyMealAlertText: {
    color: '#9B3B27',
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 15,
  },

  emptyMealSlot: {
    height: 53,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CFE0D4',
    borderStyle: 'dashed',
    backgroundColor: '#F9FCFA',
  },
  emptyMealSlotText: {
    color: '#1E5C35',
    fontSize: 12,
    fontWeight: '800',
  },

  copyDayButton: {
    height: 48,
    marginTop: 23,
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
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.16,
    shadowRadius: 5,
    elevation: 3,
  },
  reviewButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(12, 27, 17, 0.42)',
  },
  modalCard: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 26,
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

  suggestionCard: {
    minHeight: 74,
    marginBottom: 10,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0EBE3',
  },
  suggestionCardWarning: {
    backgroundColor: '#FFF9F6',
    borderColor: '#F0BBAA',
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
    marginTop: 3,
    color: '#5C7267',
    fontSize: 11,
    fontWeight: '600',
  },
  addSuggestionIcon: {
    color: '#1E5C35',
    fontSize: 22,
    fontWeight: '400',
  },
  warningMark: {
    width: 22,
    height: 22,
    overflow: 'hidden',
    color: '#9B3B27',
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 22,
    textAlign: 'center',
    borderRadius: 11,
    backgroundColor: '#F9C9B9',
  },

  cancelButton: {
    height: 48,
    marginTop: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#1E5C35',
    fontSize: 14,
    fontWeight: '800',
  },
})