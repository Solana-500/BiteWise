import React, { useMemo, useState } from 'react'
import {
  ActivityIndicator,
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

import {
  searchUsdaFoods,
  type UsdaFoodResult,
} from '../services/usdaFoodSearch'

type Props = {
  navigation: any
  route: any
}

type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'

type MealItem = {
  id: string
  mealType: MealType
  name: string
  brand: string | null
  foodSource: 'usda'
  foodId: string
  grams: number
  calories: number
  protein: number
  carbs: number
  fat: number
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

export default function CoachMealPlanBuilderScreen({
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

  const [selectedDay, setSelectedDay] = useState('Mon')
  const [mealsByDay, setMealsByDay] = useState<Record<string, MealItem[]>>({
    Mon: [],
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
  const [foodSearchText, setFoodSearchText] = useState('')
  const [foodResults, setFoodResults] = useState<UsdaFoodResult[]>([])
  const [searchingFoods, setSearchingFoods] = useState(false)
  const [foodSearchError, setFoodSearchError] = useState('')

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
    const allergens = planBasics.clientAllergies
      .split(',')
      .map((allergy) => allergy.trim().toLowerCase())
      .filter(
        (allergy) => allergy.length > 0 && allergy !== 'none recorded'
      )

    if (allergens.length === 0) {
      return false
    }

    const searchableText = `${meal.name} ${meal.brand || ''} ${meal.tags.join(
      ' '
    )}`.toLowerCase()

    return allergens.some((allergy) => searchableText.includes(allergy))
  }

  const openAddMeal = (mealType: MealType) => {
    setSelectedMealType(mealType)
    setFoodSearchText('')
    setFoodResults([])
    setFoodSearchError('')
    setAddMealModalVisible(true)
  }

  const searchFoods = async () => {
    const query = foodSearchText.trim()

    if (query.length < 2) {
      setFoodResults([])
      setFoodSearchError('Enter at least 2 characters to search.')
      return
    }

    try {
      setSearchingFoods(true)
      setFoodSearchError('')

      const results = await searchUsdaFoods(query)
      setFoodResults(results)

      if (results.length === 0) {
        setFoodSearchError('No foods found. Try a different search term.')
      }
    } catch (error: any) {
      console.error('Unable to search USDA foods:', error)
      setFoodResults([])
      setFoodSearchError(
        error?.message || 'Unable to search for foods. Please try again.'
      )
    } finally {
      setSearchingFoods(false)
    }
  }

  const addUsdaFoodToPlan = (food: UsdaFoodResult) => {
    const grams = 100

    const newMeal: MealItem = {
      id: `${selectedDay}-${selectedMealType}-${Date.now()}`,
      mealType: selectedMealType,
      name: food.name,
      brand: food.brand,
      foodSource: 'usda',
      foodId: food.id,
      grams,
      calories: Math.round(((food.caloriesPer100g ?? 0) * grams) / 100),
      protein: Number(
        (((food.proteinPer100g ?? 0) * grams) / 100).toFixed(1)
      ),
      carbs: Number((((food.carbsPer100g ?? 0) * grams) / 100).toFixed(1)),
      fat: Number((((food.fatPer100g ?? 0) * grams) / 100).toFixed(1)),
      serving: `${grams} g`,
      tags: ['USDA'],
    }

    setMealsByDay((currentMeals) => ({
      ...currentMeals,
      [selectedDay]: [...(currentMeals[selectedDay] ?? []), newMeal],
    }))

    setFoodSearchText('')
    setFoodResults([])
    setFoodSearchError('')
    setAddMealModalVisible(false)
  }

  const removeMeal = (mealId: string) => {
    Alert.alert('Remove food?', 'This food item will be removed from this day.', [
      { text: 'Cancel', style: 'cancel' },
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
        `Add at least one food to ${selectedDay} before copying it.`
      )
      return
    }

    const destinationDay = DAYS[DAYS.indexOf(selectedDay) + 1]

    if (!destinationDay) {
      Alert.alert('Last day selected', 'Choose another day to copy this plan into.')
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

    Alert.alert('Day copied', `${selectedDay}'s food items were copied to ${destinationDay}.`)
  }

  const continueToReview = () => {
    if (completedDays === 0) {
      Alert.alert(
        'Add foods first',
        'Add foods to at least one day before continuing to review.'
      )
      return
    }

    navigation.navigate('CoachMealPlanReview', {
      planBasics,
      mealsByDay,
      planId: route.params?.planId,
      adminFeedback: route.params?.adminFeedback,
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
              <Text style={styles.progressText}>Add foods</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={styles.progressFill} />
            </View>
            <View style={styles.progressLabels}>
              <Text style={styles.progressLabelComplete}>1. Basics</Text>
              <Text style={styles.progressLabelActive}>2. Foods</Text>
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
              <ClientInfo
                label="Target"
                value={`${planBasics.calorieTarget.toLocaleString()} kcal/day`}
              />
              <ClientInfo label="Diet" value={planBasics.clientDietaryPreference} />
            </View>

            {planBasics.clientAllergies !== 'None recorded' ? (
              <View style={styles.allergyBanner}>
                <Text style={styles.allergyIcon}>!</Text>
                <Text style={styles.allergyText}>
                  Allergy recorded: {planBasics.clientAllergies}. Possible
                  matches in food names or tags will be flagged.
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.daySectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Plan days</Text>
              <Text style={styles.sectionSubtitle}>
                {completedDays}/7 days have foods
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
                    onPress={() => openAddMeal(mealType)}
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
                    onPress={() => openAddMeal(mealType)}
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
            accessibilityLabel={`Copy ${selectedDay} foods to the next day`}
          >
            <Text style={styles.copyDayIcon}>⧉</Text>
            <Text style={styles.copyDayText}>
              Copy {selectedDay} foods to next day
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
              onPress={() =>
                Alert.alert(
                  'Review required',
                  'Continue to Review Plan to save this complete meal-plan draft.'
                )
              }
              accessibilityRole="button"
              accessibilityLabel="Continue to review before saving draft"
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
        <KeyboardAvoidingView
          style={styles.modalKeyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.modalScrollContent}
              >
                <Text style={styles.modalTitle}>
                  Add {selectedMealType.toLowerCase()}
                </Text>

                <Text style={styles.modalSubtitle}>
                  Search USDA foods and add one to {selectedDay}. Food values are
                  initially calculated for 100 g.
                </Text>

                <View style={styles.foodSearchRow}>
                  <TextInput
                    value={foodSearchText}
                    onChangeText={(text) => {
                      setFoodSearchText(text)
                      setFoodSearchError('')
                    }}
                    placeholder="Search food, e.g. chicken breast"
                    placeholderTextColor="#8B9D92"
                    style={styles.foodSearchInput}
                    returnKeyType="search"
                    onSubmitEditing={searchFoods}
                    accessibilityLabel="Search USDA foods"
                  />

                  <Pressable
                    style={styles.foodSearchButton}
                    onPress={searchFoods}
                    disabled={searchingFoods}
                    accessibilityRole="button"
                    accessibilityLabel="Search foods"
                  >
                    <Text style={styles.foodSearchButtonText}>
                      {searchingFoods ? '...' : 'Search'}
                    </Text>
                  </Pressable>
                </View>

                {searchingFoods ? (
                  <View style={styles.searchStateCard}>
                    <ActivityIndicator color="#1E5C35" />
                    <Text style={styles.searchStateText}>Searching foods...</Text>
                  </View>
                ) : foodSearchError ? (
                  <View style={styles.searchStateCard}>
                    <Text style={styles.searchStateError}>{foodSearchError}</Text>
                  </View>
                ) : foodResults.length > 0 ? (
                  <View style={styles.resultsContainer}>
                    {foodResults.map((food) => {
                      const allergyCheckMeal: MealItem = {
                        id: `allergy-check-${food.id}`,
                        mealType: selectedMealType,
                        name: food.name,
                        brand: food.brand,
                        foodSource: 'usda',
                        foodId: food.id,
                        grams: 100,
                        calories: Math.round(food.caloriesPer100g ?? 0),
                        protein: Number((food.proteinPer100g ?? 0).toFixed(1)),
                        carbs: Number((food.carbsPer100g ?? 0).toFixed(1)),
                        fat: Number((food.fatPer100g ?? 0).toFixed(1)),
                        serving: '100 g',
                        tags: ['USDA'],
                      }

                      const hasAllergyMatch = containsAllergen(allergyCheckMeal)

                      return (
                        <Pressable
                          key={food.id}
                          style={[
                            styles.suggestionCard,
                            hasAllergyMatch && styles.suggestionCardWarning,
                          ]}
                          onPress={() => addUsdaFoodToPlan(food)}
                          accessibilityRole="button"
                          accessibilityLabel={`Add ${food.name}`}
                        >
                          <View style={styles.suggestionTextWrap}>
                            <Text style={styles.suggestionName}>
                              {food.name}
                            </Text>

                            {food.brand ? (
                              <Text style={styles.foodBrand}>{food.brand}</Text>
                            ) : null}

                            <Text style={styles.suggestionMeta}>
                              {Math.round(food.caloriesPer100g ?? 0)} kcal · Protein{' '}
                              {(food.proteinPer100g ?? 0).toFixed(1)} g · Carbs{' '}
                              {(food.carbsPer100g ?? 0).toFixed(1)} g · Fat{' '}
                              {(food.fatPer100g ?? 0).toFixed(1)} g
                            </Text>

                            <View style={styles.tagsRow}>
                              <View style={styles.tag}>
                                <Text style={styles.tagText}>USDA</Text>
                              </View>

                              {hasAllergyMatch ? (
                                <View style={styles.tagWarning}>
                                  <Text style={styles.tagTextWarning}>
                                    Allergy check
                                  </Text>
                                </View>
                              ) : null}
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
                  </View>
                ) : (
                  <View style={styles.searchStateCard}>
                    <Text style={styles.searchStateText}>
                      Search USDA foods to add a food item.
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setAddMealModalVisible(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Close food search"
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
          {meal.brand ? <Text style={styles.mealBrand}>{meal.brand}</Text> : null}
          <Text style={styles.mealServing}>{meal.serving}</Text>
        </View>
        <Text style={styles.mealCalories}>{meal.calories} kcal</Text>
      </View>

      <Text style={styles.macroText}>
        Protein {meal.protein.toFixed(1)} g · Carbs {meal.carbs.toFixed(1)} g · Fat{' '}
        {meal.fat.toFixed(1)} g
      </Text>

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
            Possible match with a recorded allergy. Check the ingredient list
            before using this food.
          </Text>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5FAF6' },
  safeArea: { flex: 1, backgroundColor: '#F5FAF6' },
  content: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 36 },

  backButton: { alignSelf: 'flex-start', paddingVertical: 8, paddingRight: 14 },
  backButtonText: { color: '#1E5C35', fontSize: 15, fontWeight: '800' },

  pageHeading: {
    marginTop: 6,
    color: '#16281D',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  pageSubtitle: { marginTop: 5, color: '#5C7267', fontSize: 14, lineHeight: 20 },

  progressCard: {
    marginTop: 20,
    padding: 15,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2ECE6',
  },
  progressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressTitle: { color: '#1E5C35', fontSize: 13, fontWeight: '800' },
  progressText: { color: '#7C8F83', fontSize: 12, fontWeight: '700' },
  progressTrack: { height: 7, marginTop: 12, overflow: 'hidden', borderRadius: 5, backgroundColor: '#E8F0EA' },
  progressFill: { width: '66.66%', height: '100%', borderRadius: 5, backgroundColor: '#1E5C35' },
  progressLabels: { marginTop: 9, flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { color: '#8B9D92', fontSize: 10, fontWeight: '700' },
  progressLabelActive: { color: '#1E5C35', fontSize: 10, fontWeight: '800' },
  progressLabelComplete: { color: '#4C7460', fontSize: 10, fontWeight: '800' },

  clientSummaryCard: {
    marginTop: 18,
    padding: 15,
    borderRadius: 17,
    backgroundColor: '#EAF4ED',
    borderWidth: 1,
    borderColor: '#D5E8DA',
  },
  clientSummaryTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  clientSummaryLabel: { color: '#5C7267', fontSize: 11, fontWeight: '700' },
  clientSummaryName: { marginTop: 3, color: '#16281D', fontSize: 17, fontWeight: '800' },
  goalBadge: { maxWidth: '45%', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 11, backgroundColor: '#FFFFFF' },
  goalBadgeText: { color: '#1E5C35', fontSize: 10, fontWeight: '800' },
  clientSummaryDivider: { height: 1, marginTop: 13, marginBottom: 12, backgroundColor: '#D3E6D8' },
  clientSummaryInfoRow: { flexDirection: 'row' },
  clientInfo: { flex: 1 },
  clientInfoLabel: { color: '#61776A', fontSize: 10, fontWeight: '700' },
  clientInfoValue: { marginTop: 3, color: '#294635', fontSize: 12, fontWeight: '800' },
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
  allergyIcon: { width: 19, height: 19, overflow: 'hidden', color: '#9B3B27', fontSize: 12, fontWeight: '900', lineHeight: 19, textAlign: 'center', borderRadius: 10, backgroundColor: '#F9C9B9' },
  allergyText: { flex: 1, marginLeft: 7, color: '#864431', fontSize: 11, fontWeight: '700', lineHeight: 16 },

  daySectionHeader: { marginTop: 25, marginBottom: 11, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  sectionTitle: { color: '#16281D', fontSize: 18, fontWeight: '800' },
  sectionSubtitle: { marginTop: 3, color: '#7C8F83', fontSize: 11, fontWeight: '700' },
  weekTotalText: { color: '#5C7267', fontSize: 11, fontWeight: '800' },

  dayTabs: { paddingRight: 20 },
  dayTab: { width: 52, height: 57, marginRight: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DDE9E1' },
  dayTabActive: { backgroundColor: '#1E5C35', borderColor: '#1E5C35' },
  dayTabText: { color: '#5C7267', fontSize: 12, fontWeight: '800' },
  dayTabTextActive: { color: '#FFFFFF' },
  dayDot: { width: 5, height: 5, marginTop: 6, borderRadius: 3, backgroundColor: '#D2DED5' },
  dayDotFilled: { backgroundColor: '#5DA476' },
  dayDotActive: { backgroundColor: '#DDF2E3' },

  dayTotalCard: { marginTop: 16, padding: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 17, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2ECE6' },
  dayTotalTitle: { color: '#5C7267', fontSize: 12, fontWeight: '700' },
  dayTotalValue: { marginTop: 3, color: '#16281D', fontSize: 22, fontWeight: '800' },
  targetSummary: { alignItems: 'flex-end' },
  targetSummaryLabel: { color: '#7C8F83', fontSize: 10, fontWeight: '700' },
  targetSummaryValue: { marginTop: 3, color: '#355244', fontSize: 12, fontWeight: '800' },
  targetDifference: { marginTop: 4, color: '#1E5C35', fontSize: 10, fontWeight: '800' },
  targetDifferenceOver: { color: '#A13D27' },

  mealSection: { marginTop: 22 },
  mealSectionHeader: { marginBottom: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mealSectionTitle: { color: '#355244', fontSize: 14, fontWeight: '800' },
  addMealText: { color: '#1E5C35', fontSize: 13, fontWeight: '800' },
  mealCard: { marginBottom: 9, padding: 14, borderRadius: 15, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2ECE6' },
  mealCardAllergyWarning: { backgroundColor: '#FFF9F6', borderColor: '#F1B9A8' },
  mealCardTop: { flexDirection: 'row', justifyContent: 'space-between' },
  mealTextWrap: { flex: 1, paddingRight: 10 },
  mealName: { color: '#16281D', fontSize: 14, fontWeight: '800' },
  mealBrand: { marginTop: 3, color: '#557365', fontSize: 10, fontWeight: '700' },
  mealServing: { marginTop: 4, color: '#6D8175', fontSize: 11, fontWeight: '600' },
  mealCalories: { color: '#1E5C35', fontSize: 12, fontWeight: '800' },
  macroText: { marginTop: 9, color: '#5C7267', fontSize: 10, fontWeight: '700' },
  mealCardBottom: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tagsRow: { flex: 1, flexDirection: 'row', flexWrap: 'wrap' },
  tag: { marginRight: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9, backgroundColor: '#EEF6F0' },
  tagWarning: { marginRight: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9, backgroundColor: '#FDE7DF' },
  tagText: { color: '#48705A', fontSize: 9, fontWeight: '800' },
  tagTextWarning: { color: '#9B3B27', fontSize: 9, fontWeight: '800' },
  removeMealText: { marginLeft: 8, color: '#A13D27', fontSize: 11, fontWeight: '800' },
  allergyMealAlert: { marginTop: 10, paddingTop: 9, borderTopWidth: 1, borderTopColor: '#F1D3C8' },
  allergyMealAlertText: { color: '#9B3B27', fontSize: 10, fontWeight: '800', lineHeight: 15 },
  emptyMealSlot: { height: 53, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1, borderColor: '#CFE0D4', borderStyle: 'dashed', backgroundColor: '#F9FCFA' },
  emptyMealSlotText: { color: '#1E5C35', fontSize: 12, fontWeight: '800' },

  copyDayButton: { height: 48, marginTop: 23, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CFE0D4' },
  copyDayIcon: { marginRight: 7, color: '#1E5C35', fontSize: 16, fontWeight: '800' },
  copyDayText: { color: '#1E5C35', fontSize: 13, fontWeight: '800' },

  draftNotice: { marginTop: 18, padding: 13, flexDirection: 'row', alignItems: 'center', borderRadius: 14, backgroundColor: '#FFF7E5', borderWidth: 1, borderColor: '#F3DEAA' },
  draftNoticeIcon: { width: 20, height: 20, overflow: 'hidden', color: '#8A5A09', fontSize: 12, fontWeight: '900', lineHeight: 20, textAlign: 'center', borderRadius: 10, backgroundColor: '#F7D98B' },
  draftNoticeText: { flex: 1, marginLeft: 8, color: '#7A6131', fontSize: 11, fontWeight: '700', lineHeight: 16 },

  bottomActions: { marginTop: 22, flexDirection: 'row', justifyContent: 'space-between' },
  saveDraftButton: { width: '35%', height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#1E5C35' },
  saveDraftButtonText: { color: '#1E5C35', fontSize: 14, fontWeight: '800' },
  reviewButton: { width: '61%', height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#1E5C35', shadowColor: '#163020', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.16, shadowRadius: 5, elevation: 3 },
  reviewButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  modalKeyboardAvoidingView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalScrollContent: {
    paddingBottom: 8,
  },
  resultsContainer: {
    maxHeight: 320,
  },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(12, 27, 17, 0.42)' },
  modalCard: {
    maxHeight: '88%',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 18,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    backgroundColor: '#F5FAF6',
  },
  modalHandle: { width: 42, height: 4, alignSelf: 'center', borderRadius: 3, backgroundColor: '#B7C9BD' },
  modalTitle: { marginTop: 19, color: '#16281D', fontSize: 21, fontWeight: '800' },
  modalSubtitle: { marginTop: 5, marginBottom: 14, color: '#5C7267', fontSize: 13, lineHeight: 19 },
  foodSearchRow: { marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
  foodSearchInput: { flex: 1, height: 47, paddingHorizontal: 13, color: '#16281D', fontSize: 13, borderRadius: 13, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DDE9E1' },
  foodSearchButton: { height: 47, marginLeft: 8, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#1E5C35' },
  foodSearchButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  searchStateCard: { minHeight: 90, marginBottom: 8, padding: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E0EBE3' },
  searchStateText: { marginTop: 8, color: '#5C7267', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  searchStateError: { color: '#A13D27', fontSize: 12, fontWeight: '700', lineHeight: 18, textAlign: 'center' },
  searchResultsList: { maxHeight: 330, marginBottom: 4 },
  suggestionCard: { minHeight: 74, marginBottom: 10, padding: 13, flexDirection: 'row', alignItems: 'center', borderRadius: 15, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E0EBE3' },
  suggestionCardWarning: { backgroundColor: '#FFF9F6', borderColor: '#F0BBAA' },
  suggestionTextWrap: { flex: 1, paddingRight: 10 },
  suggestionName: { color: '#16281D', fontSize: 14, fontWeight: '800' },
  foodBrand: { marginTop: 3, color: '#557365', fontSize: 10, fontWeight: '700' },
  suggestionMeta: { marginTop: 4, color: '#5C7267', fontSize: 11, fontWeight: '600', lineHeight: 16 },
  addSuggestionIcon: { color: '#1E5C35', fontSize: 22, fontWeight: '400' },
  warningMark: { width: 22, height: 22, overflow: 'hidden', color: '#9B3B27', fontSize: 13, fontWeight: '900', lineHeight: 22, textAlign: 'center', borderRadius: 11, backgroundColor: '#F9C9B9' },
  cancelButton: { height: 48, marginTop: 3, alignItems: 'center', justifyContent: 'center' },
  cancelButtonText: { color: '#1E5C35', fontSize: 14, fontWeight: '800' },
})
