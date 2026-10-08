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
import { getAiMealRecommendation } from '../services/aiRecommendations'

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

  const [meals] = useState<Meal[]>([
    { label: 'Breakfast', description: 'Meal description' },
    { label: 'Lunch', description: 'Meal description' },
    { label: 'Dinner', description: 'Meal description' },
  ])

  const [nutrition, setNutrition] = useState({
    protein: { value: 0, goal: 0 },
    carb: { value: 0, goal: 0 },
    fat: { value: 0, goal: 0 },
    fiber: { value: 0, goal: 0 },
  })

  const [recommendation, setRecommendation] = useState({
    name: 'Suggested meal name',
    kcal: 0,
  })
  
const [aiLoading, setAiLoading] = useState(false)

async function fetchAiRecommendation() {
  try {
    setAiLoading(true)

    const result = await getAiMealRecommendation()

    setRecommendation({
      name: result,
      kcal: 0,
    })
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
  .select('full_name, subscription_tier, assigned_coach_id')
  .eq('id', user.id)
  .maybeSingle<{
    full_name: string | null
    subscription_tier: string | null
    assigned_coach_id: string | null
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

      // Temporary values until food_logs / progress_logs are connected.
      setCalories({ consumed: 0, goal: 0 })
      setNutrition({
        protein: { value: 0, goal: 0 },
        carb: { value: 0, goal: 0 },
        fat: { value: 0, goal: 0 },
        fiber: { value: 0, goal: 0 },
      })
      setRecommendation({
        name: 'Suggested meal name',
        kcal: 0,
      })
    } catch (error) {
      console.error('Unable to load premium user dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const firstName = userName.trim().split(/\s+/)[0] || 'User'

  const caloriePercent =
    calories.goal > 0
      ? Math.min(100, Math.round((calories.consumed / calories.goal) * 100))
      : 0

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
              <Text style={styles.ringPercentText}>{caloriePercent}%</Text>
            </View>
          </View>

          <View style={styles.calorieTextBlock}>
            <Text style={styles.calorieLabel}>Calorie Progress</Text>

            <Text style={styles.calorieValue}>
              {calories.consumed} / {calories.goal} kcal
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
            <Text style={styles.activePlanChipText}>Active Meal Plan</Text>
          </View>
        </View>

          {meals.map((meal) => (
            <View key={meal.label} style={styles.mealRow}>
              <Text style={styles.mealLabel}>{meal.label}</Text>

              <Text style={styles.mealDescription} numberOfLines={1}>
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
          onPress={() => navigation.navigate('PuNutrition')}
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
        <Pressable
          style={styles.summaryLinkCard}
          onPress={() => navigation.navigate('PuRecommendation')}
        >
          <View style={styles.summaryLinkHeaderRow}>
            <Text style={styles.summaryLinkHeading}>
              Personalized Recommendation
            </Text>

            <Text style={styles.chevron}>›</Text>
          </View>

          <Text style={styles.recommendationText} numberOfLines={1}>
            {recommendation.name} — {recommendation.kcal} kcal
          </Text>
        </Pressable>
      </View>
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
    alignItems: 'center',
    marginBottom: 8,
  },
  mealLabel: {
    width: 78,
    color: '#16281D',
    fontSize: 13,
    fontWeight: '700',
  },
  mealDescription: {
    flex: 1,
    color: '#7C8F83',
    fontSize: 13,
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
recommendationSection: {
  flexGrow: 1,
  justifyContent: 'flex-end',
},
})
