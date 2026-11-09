import React, { useCallback, useState } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { supabase } from '../services/supabase'
import {
  getAiMealRecommendation,
  type AiMealRecommendation,
} from '../services/aiRecommendations'

type Props = {
  navigation: any
}

type Meal = {
  label: 'Breakfast' | 'Lunch' | 'Dinner'
  description: string
}

type NutritionRowProps = {
  label: string
  value: number
  goal: number
}

type DailyFoodLog = {
  id: string
  food_name: string
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  meal_type: string | null
  logged_at: string
}

function NutritionRow({ label, value, goal }: NutritionRowProps) {
  return (
    <View style={styles.nutritionRow}>
      <Text style={styles.nutritionLabel}>{label}</Text>
      <Text style={styles.nutritionValue}>
        {value} / {goal} g
      </Text>
    </View>
  )
}

export default function PuHomeScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('User')
  const [coachName, setCoachName] = useState<string | null>(null)
 

  const [calories, setCalories] = useState({ consumed: 0, goal: 0 })

  const [meals, setMeals] = useState<Meal[]>([
  { label: 'Breakfast', description: 'No food logged yet' },
  { label: 'Lunch', description: 'No food logged yet' },
  { label: 'Dinner', description: 'No food logged yet' },
])

  const [nutrition, setNutrition] = useState({
    protein: { value: 0, goal: 0 },
    carb: { value: 0, goal: 0 },
    fat: { value: 0, goal: 0 },
    fiber: { value: 0, goal: 0 },
  })

 const [recommendation, setRecommendation] =
  useState<AiMealRecommendation | null>(null)
  
const [aiLoading, setAiLoading] = useState(false)

async function fetchAiRecommendation() {
  try {
    setAiLoading(true)

    const result = await getAiMealRecommendation()
      console.log('AI recommendation:', result)
      console.log('Recommendation length:', result.meal_name)
    
   setRecommendation(result)
  } catch (error) {
    console.error('Failed to get AI recommendation:', error)
  } finally {
    setAiLoading(false)
  }
}
  
  useFocusEffect(
  useCallback(() => {
    void loadPuHome()
  }, [])
)

  async function loadPuHome() {
    try {
      setLoading(true)

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        console.error('Unable to retrieve authenticated user:', userError.message)
        return
      }

      if (!user) {
        console.error('No authenticated user found.')
        return
      }

      const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select(`
    full_name,
    subscription_tier,
    assigned_coach_id,
    daily_calorie_target
  `)
  .eq('id', user.id)
  .maybeSingle<{
    full_name: string | null
    subscription_tier: string | null
    assigned_coach_id: string | null
    daily_calorie_target: number | null
  }>()

    if (profileError) {
      console.error(
        'Unable to load premium user profile:',
        profileError.message
      )
      return
    }

    console.log('Premium user profile:', profile)
    console.log('Assigned coach ID:', profile?.assigned_coach_id)

    setUserName(profile?.full_name?.trim() || 'User')

    if (!profile?.assigned_coach_id) {
      setCoachName(null)
    } else {
      const { data: coachProfile, error: coachError } = await supabase
        .from('profiles')
        .select('full_name, app_role')
        .eq('id', profile.assigned_coach_id)
        .maybeSingle<{
          full_name: string | null
          app_role: 'user' | 'coach' | 'admin' | null
        }>()

      if (coachError) {
        console.error('Unable to load assigned coach:', coachError.message)
        setCoachName(null)
      } else if (coachProfile?.app_role !== 'coach') {
        console.error(
          'The assigned_coach_id does not point to a coach profile:',
          coachProfile
        )
        setCoachName(null)
      } else {
        console.log('Assigned coach profile:', coachProfile)
        setCoachName(coachProfile.full_name?.trim() || null)
      }
    }

     // Load food logged during today's local calendar day.
      const now = new Date()

      const startOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      )

      const startOfTomorrow = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1
      )

      const { data: foodData, error: foodError } = await supabase
        .from('food_logs')
        .select(`
          id,
          food_name,
          calories,
          protein_g,
          carbs_g,
          fat_g,
          meal_type,
          logged_at
        `)
        .eq('user_id', user.id)
        .gte('logged_at', startOfToday.toISOString())
        .lt('logged_at', startOfTomorrow.toISOString())
        .order('logged_at', { ascending: true })

      if (foodError) {
        throw foodError
      }

      const todayFoods = (foodData ?? []) as DailyFoodLog[]

      const mealLabels: Meal['label'][] = [
  'Breakfast',
  'Lunch',
  'Dinner',
]

setMeals(
  mealLabels.map((label) => {
    const foodsForMeal = todayFoods.filter(
      (food) =>
        food.meal_type?.trim().toLowerCase() === label.toLowerCase()
    )

    const description = foodsForMeal
      .map((food) => food.food_name?.trim())
      .filter(Boolean)
      .join(', ')

    return {
      label,
      description: description || 'No food logged yet',
    }
  })
)

      function numericValue(value: unknown) {
        const number = Number(value ?? 0)
        return Number.isFinite(number) ? number : 0
      }

      const totals = todayFoods.reduce(
        (total, food) => ({
          calories: total.calories + numericValue(food.calories),
          protein: total.protein + numericValue(food.protein_g),
          carbs: total.carbs + numericValue(food.carbs_g),
          fat: total.fat + numericValue(food.fat_g),
        }),
        {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
        }
      )

      const savedCalorieTarget = Number(
  profile?.daily_calorie_target ?? 0
)

const dailyCalorieTarget =
  Number.isFinite(savedCalorieTarget) && savedCalorieTarget > 0
    ? savedCalorieTarget
    : 0

setCalories({
  consumed: Math.round(totals.calories),
  goal: dailyCalorieTarget,
})

      
const dailyCalories = Number(profile?.daily_calorie_target) || 0

// Calculate daily macronutrient goals from calorie target
const proteinGoal = Math.round((dailyCalories * 0.30) / 4)
const carbGoal = Math.round((dailyCalories * 0.45) / 4)
const fatGoal = Math.round((dailyCalories * 0.25) / 9)

setNutrition((current) => ({
  ...current,
  protein: {
    value: Math.round(totals.protein * 10) / 10,
    goal: proteinGoal,
  },
  carb: {
    value: Math.round(totals.carbs * 10) / 10,
    goal: carbGoal,
  },
  fat: {
    value: Math.round(totals.fat * 10) / 10,
    goal: fatGoal,
  },
  fiber: {
    ...current.fiber,
  },
}))

     
    } catch (error) {
      console.error('Unable to load premium user dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const firstName = userName.trim().split(/\s+/)[0] || 'User'

  const hasCalorieTarget =
  Number.isFinite(calories.goal) && calories.goal > 0

const caloriePercent = hasCalorieTarget
  ? Math.max(
      0,
      Math.round((calories.consumed / calories.goal) * 100)
    )
  : null

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#1E5C35" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
                <View style={styles.headerRow}>
          <View style={styles.headerSideSpacer} />

          <View style={styles.brandBlock}>
            <Text style={styles.brandName}>BiteWise</Text>
            <Text style={styles.premiumHeaderLabel}>PREMIUM</Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.avatarButton,
              pressed && styles.pressedButton,
            ]}
            onPress={() => navigation.navigate('Profile')}
            accessibilityRole="button"
            accessibilityLabel="Open profile"
          >
            <Text style={styles.avatarEmoji}>👤</Text>
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.heroGreeting}>Hello, {firstName}</Text>
        </View>

        <View style={styles.coachCard}>
          <View style={styles.coachIconWrap}>
            <Text style={styles.coachIconText}>👤</Text>
          </View>

          <View style={styles.coachTextBlock}>
            <Text style={styles.coachName}>
              {coachName ? `Coach ${coachName}` : 'Coach not assigned yet'}
            </Text>

            <Text style={styles.coachSubtitle}>
              {coachName
                ? 'Your assigned health coach'
                : 'A coach will be assigned to you soon'}
            </Text>
          </View>

          <Pressable
            style={styles.viewCoachButton}
            onPress={() => navigation.navigate('PuCoach')}
          >
            <Text style={styles.viewCoachText}>View Coach</Text>
          </Pressable>
        </View>

        <View style={styles.progressCard}>
        <View style={styles.progressTopRow}>
          <View style={styles.ringOuter}>
            <View style={styles.ringInner}>
              <Text
  style={styles.ringPercentText}
  adjustsFontSizeToFit
  minimumFontScale={0.65}
  numberOfLines={1}
>
  {caloriePercent !== null ? `${caloriePercent}%` : '—'}
</Text>
            </View>
          </View>

          <View style={styles.calorieTextBlock}>
            <Text style={styles.calorieLabel}>Calorie Progress</Text>

            <Text style={styles.calorieValue}>
            {calories.goal > 0
              ? `${calories.consumed.toLocaleString()} / ${calories.goal.toLocaleString()} kcal`
              : `${calories.consumed.toLocaleString()} kcal consumed today`}
          </Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.progressShortcutButton,
              pressed && styles.pressedButton,
            ]}
            onPress={() => navigation.navigate('Progress')}
            accessibilityRole="button"
            accessibilityLabel="View progress"
          >
            <Text style={styles.progressShortcutText}>Progress</Text>
            <Text style={styles.progressShortcutChevron}>›</Text>
          </Pressable>
        </View>

        <View style={styles.mealsHeaderRow}>
          <Text style={styles.mealsHeading}>Today&apos;s Meals</Text>

          <View style={styles.activePlanChip}>
            <Text style={styles.activePlanChipText}>Today's Food Log</Text>
          </View>
        </View>

          {meals.map((meal) => (
  <View key={meal.label} style={styles.mealRow}>
    <Text style={styles.mealLabel}>
      {meal.label}
    </Text>

    <Text style={styles.mealDescription}>
      {meal.description}
    </Text>
  </View>
))}

          <Pressable
            style={styles.logMealButton}
            onPress={() => navigation.getParent()?.navigate('FoodLogging')}
          >
            <Text style={styles.logMealText}>Log Meal</Text>
          </Pressable>
        </View>

        
          <Pressable
            style={styles.summaryLinkCard}
            onPress={() => navigation.getParent()?.navigate('Meals')}
          >

          <View style={styles.summaryLinkHeaderRow}>
            <Text style={styles.summaryLinkHeading}>Nutrition Summary</Text>
            <Text style={styles.chevron}>›</Text>
          </View>

          <View style={styles.nutritionGrid}>
            <NutritionRow
              label="Protein"
              value={nutrition.protein.value}
              goal={nutrition.protein.goal}
            />
            <NutritionRow
              label="Carb"
              value={nutrition.carb.value}
              goal={nutrition.carb.goal}
            />
            <NutritionRow
              label="Fat"
              value={nutrition.fat.value}
              goal={nutrition.fat.goal}
            />
            <NutritionRow
              label="Fiber"
              value={nutrition.fiber.value}
              goal={nutrition.fiber.goal}
            />
          </View>
        </Pressable>

        

        
  <View style={styles.recommendationSection}>
    <View style={styles.aiRecommendationCard}>
  
      {/* Header */}
      <View style={styles.aiRecommendationHeader}>
        <View style={styles.aiHeaderLeft}>
          <Text style={styles.aiSparkle}>✦</Text>
          <Text style={styles.aiRecommendationHeading}>
            AI MEAL RECOMMENDATION
          </Text>
        </View>
  
        <View style={styles.aiPremiumBadge}>
          <Text style={styles.aiPremiumBadgeText}>
            PREMIUM
          </Text>
        </View>
      </View>
  
      {/* Recommendation content */}
      <View style={styles.aiRecommendationContent}>
        <Text style={styles.aiRecommendationLabel}>
          PERSONALISED FOR YOU
        </Text>
  
        <Text style={styles.aiRecommendationText}>
          
{recommendation ? (
  <View>
    <Text style={styles.aiRecommendationLabel}>
      RECOMMENDED FOR YOU
    </Text>

    <Text style={styles.aiMealName}>
      {recommendation.meal_name}
    </Text>

    {Boolean(recommendation.description) && (
      <Text style={styles.aiRecommendationText}>
        {recommendation.description}
      </Text>
    )}

    {[
      recommendation.calories,
      recommendation.protein_g,
      recommendation.carbs_g,
      recommendation.fat_g,
    ].some((value) => value !== null) && (
      <View style={styles.aiMacroRow}>
        {[
          ['Calories', recommendation.calories, 'kcal'],
          ['Protein', recommendation.protein_g, 'g'],
          ['Carbs', recommendation.carbs_g, 'g'],
          ['Fat', recommendation.fat_g, 'g'],
        ].map(([label, value, unit]) => (
          <View key={String(label)} style={styles.aiMacroBox}>
            <Text style={styles.aiMacroValue}>
              {value === null ? '—' : `${value}${unit === 'g' ? 'g' : ''}`}
            </Text>
            <Text style={styles.aiMacroLabel}>
              {label}
            </Text>
          </View>
        ))}
      </View>
    )}

    {Boolean(recommendation.reason) && (
      <View style={styles.aiReasonBox}>
        <Text style={styles.aiReasonHeading}>
          Why this meal suits you
        </Text>

        <Text style={styles.aiRecommendationText}>
          {recommendation.reason}
        </Text>
      </View>
    )}
  </View>
) : (
  <Text style={styles.aiRecommendationText}>
    Generate a personalised meal recommendation
    based on your fitness goals and dietary preferences.
  </Text>
)}

        </Text>
      </View>
  
      {/* Generate button */}
      <Pressable
        style={[
          styles.aiGenerateButton,
          aiLoading && styles.aiGenerateButtonDisabled,
        ]}
        onPress={fetchAiRecommendation}
        disabled={aiLoading}
      >
        {aiLoading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.aiGenerateButtonText}>
            {recommendation === null
              ? '✦ Generate AI Recommendation'
              : '↻ Generate Another Recommendation'}
          </Text>
        )}
      </Pressable>
  
      <Text style={styles.aiDisclaimer}>
        AI-generated suggestions are estimates. Please verify nutritional information.
      </Text>
  
    </View>
  </View>

        
            <Pressable
              style={styles.summaryLinkCard}
              onPress={() =>
                navigation
                  .getParent()
                  ?.getParent()
                  ?.navigate('AiMealPlanning')
              }
              accessibilityRole="button"
              accessibilityLabel="Open AI Meal Planning"
            >
              <View style={styles.summaryLinkHeaderRow}>
                <Text style={styles.summaryLinkHeading}>
                  AI Meal Planning
                </Text>
                <Text style={styles.chevron}>{'›'}</Text>
              </View>
            
              <Text style={styles.recommendationText}>
                Generate a personalised 7-day meal plan based on
                your fitness goals and dietary preferences.
              </Text>
            </Pressable>
            
            {/* Rate BiteWise */}
            <Pressable
              style={styles.summaryLinkCard}
              onPress={() =>
                navigation.getParent()?.getParent()?.navigate('Feedback')
              }
              accessibilityRole="button"
              accessibilityLabel="Rate and review BiteWise"
            >
              <View style={styles.summaryLinkHeaderRow}>
                <Text style={styles.summaryLinkHeading}>
                  ⭐ Rate BiteWise
                </Text>
                <Text style={styles.chevron}>›</Text>
              </View>
            
              <Text style={styles.recommendationText}>
                Share your experience and help us improve BiteWise.
              </Text>
            </Pressable>


      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5FAF6',
  },
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5FAF6',
  },

  topBar: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: '#F5FAF6',
    borderBottomWidth: 1,
    borderBottomColor: '#E2ECE6',
  },
  topBarTitle: {
    color: '#1E5C35',
    fontSize: 17,
    fontWeight: '800',
  },

  scrollView: {
  flex: 1,
},

content: {
  flexGrow: 1,
  paddingHorizontal: 20,
  paddingTop: 18,
  paddingBottom: 0,
},

    headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    marginBottom: 16,
  },
  headerSideSpacer: {
    width: 40,
    height: 40,
  },
  brandBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    color: '#16281D',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  premiumHeaderLabel: {
    marginTop: 1,
    color: '#957115',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  avatarButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D8B45A',
  },
  avatarEmoji: {
    fontSize: 18,
  },
  pressedButton: {
    opacity: 0.78,
  },
  
  heroCard: {
    marginBottom: 14,
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2ECE6',
  },
  heroGreeting: {
    color: '#16281D',
    fontSize: 18,
    fontWeight: '800',
  },

  coachCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2ECE6',
  },
  coachIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF3EC',
  },
  coachIconText: {
    fontSize: 18,
  },
  coachTextBlock: {
    flex: 1,
  },
  coachName: {
    color: '#16281D',
    fontSize: 14,
    fontWeight: '800',
  },
  coachSubtitle: {
    marginTop: 2,
    color: '#7C8F83',
    fontSize: 12,
  },
  viewCoachButton: {
    borderRadius: 999,
    backgroundColor: '#1E5C35',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  viewCoachText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  progressCard: {
    marginBottom: 18,
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2ECE6',
  },
  progressTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  ringOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 8,
    borderColor: '#DCEEE1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  ringInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 8,
    borderColor: '#1E5C35',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5FAF6',
  },
  ringPercentText: {
  color: '#1E5C35',
  fontSize: 12,
  fontWeight: '800',
  textAlign: 'center',
  width: '100%',
},
  calorieTextBlock: {
    flex: 1,
  },
  calorieLabel: {
    color: '#16281D',
    fontSize: 15,
    fontWeight: '800',
  },
  calorieValue: {
    marginTop: 4,
    color: '#7C8F83',
    fontSize: 13,
  },

  mealsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  mealsHeading: {
    color: '#16281D',
    fontSize: 14,
    fontWeight: '800',
  },
  activePlanChip: {
    borderRadius: 999,
    backgroundColor: '#8FD3A6',
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  activePlanChipText: {
    color: '#1E5C35',
    fontSize: 11,
    fontWeight: '700',
  },

  mealRow: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  marginBottom: 10,
},
mealLabel: {
  width: 78,
  color: '#16281D',
  fontSize: 13,
  fontWeight: '700',
  lineHeight: 20,
},
mealDescription: {
  flex: 1,
  color: '#7C8F83',
  fontSize: 13,
  lineHeight: 20,
},
  logMealButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#1E5C35',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  logMealText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  summaryLinkCard: {
    marginBottom: 14,
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2ECE6',
  },
  summaryLinkHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLinkHeading: {
    color: '#16281D',
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  chevron: {
    color: '#B7C6BC',
    fontSize: 22,
  },

  nutritionGrid: {
    gap: 8,
  },
  nutritionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nutritionLabel: {
    color: '#5C7267',
    fontSize: 13,
    fontWeight: '600',
  },
  nutritionValue: {
    color: '#16281D',
    fontSize: 13,
    fontWeight: '700',
  },

  recommendationText: {
  color: '#7C8F83',
  fontSize: 13,
  lineHeight: 21,
  flexShrink: 1,
  flexWrap: 'wrap',
},
  
progressShortcutButton: {
  flexDirection: 'row',
  alignItems: 'center',
  marginLeft: 8,
  borderRadius: 999,
  backgroundColor: '#EAF3EC',
  paddingHorizontal: 10,
  paddingVertical: 8,
},
progressShortcutText: {
  color: '#1E5C35',
  fontSize: 11,
  fontWeight: '800',
},
progressShortcutChevron: {
  marginLeft: 3,
  color: '#1E5C35',
  fontSize: 18,
  fontWeight: '400',
  lineHeight: 18,
},
  
aiRecommendationCard: {
  backgroundColor: '#FFFFFF',
  borderRadius: 20,
  borderWidth: 1,
  borderColor: '#DCE9DF',
  padding: 18,
  marginBottom: 14,
},

aiRecommendationHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 18,
},

aiHeaderLeft: {
  flexDirection: 'row',
  alignItems: 'center',
  flexShrink: 1,
},

aiSparkle: {
  fontSize: 22,
  color: '#1E5C35',
  marginRight: 8,
},

aiRecommendationHeading: {
  color: '#16281D',
  fontSize: 12,
  fontWeight: '900',
  letterSpacing: 0.4,
  flexShrink: 1,
},

aiPremiumBadge: {
  backgroundColor: '#FFF4D6',
  paddingHorizontal: 9,
  paddingVertical: 5,
  borderRadius: 20,
  marginLeft: 6,
},

aiPremiumBadgeText: {
  color: '#957115',
  fontSize: 9,
  fontWeight: '800',
  letterSpacing: 0.5,
},

aiRecommendationContent: {
  backgroundColor: '#F5FAF6',
  borderRadius: 14,
  padding: 16,
  marginBottom: 16,
},

aiRecommendationLabel: {
  color: '#1E5C35',
  fontSize: 10,
  fontWeight: '800',
  letterSpacing: 1.2,
  marginBottom: 10,
},

aiRecommendationText: {
  color: '#283F30',
  fontSize: 14,
  lineHeight: 23,
  flexShrink: 1,
},

aiGenerateButton: {
  backgroundColor: '#1E5C35',
  borderRadius: 14,
  minHeight: 46,
  paddingVertical: 12,
  paddingHorizontal: 12,
  alignItems: 'center',
  justifyContent: 'center',
},

aiGenerateButtonDisabled: {
  opacity: 0.65,
},

aiGenerateButtonText: {
  color: '#FFFFFF',
  fontSize: 13,
  fontWeight: '800',
  textAlign: 'center',
},

aiDisclaimer: {
  color: '#87978B',
  fontSize: 10,
  lineHeight: 16,
  textAlign: 'center',
  marginTop: 12,
},

recommendationSection: {
  width: '100%',
},
  
aiMealName: {
  color: '#16281D',
  fontSize: 19,
  fontWeight: '800',
  marginBottom: 8,
},

aiMacroRow: {
  flexDirection: 'row',
  gap: 6,
  marginTop: 16,
  marginBottom: 16,
},

aiMacroBox: {
  flex: 1,
  minWidth: 0,
  alignItems: 'center',
  backgroundColor: '#EAF3EC',
  borderRadius: 10,
  paddingVertical: 12,
  paddingHorizontal: 3,
},

aiMacroValue: {
  color: '#1E5C35',
  fontSize: 13,
  fontWeight: '800',
},

aiMacroLabel: {
  color: '#5C7267',
  fontSize: 10,
  marginTop: 4,
},

aiReasonBox: {
  backgroundColor: '#FFFFFF',
  borderRadius: 12,
  padding: 14,
  marginTop: 4,
  borderWidth: 1,
  borderColor: '#DCE9DF',
},

aiReasonHeading: {
  color: '#16281D',
  fontSize: 14,
  fontWeight: '800',
  marginBottom: 8,
},

})
