import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'

import { supabase } from '../services/supabase'
import type { MainTabParamList } from '../types/navigation'

type Props = BottomTabScreenProps<MainTabParamList, 'Home'>

type DashboardData = {
  full_name: string | null
  daily_calorie_target: number | null
  fitness_goal: string | null
  tier: string | null
}

type FeatureTile = {
  key: string
  icon: string
  title: string
  subtitle: string
  onPress: () => void
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function HomeScreen({ navigation }: Props) {
  const [profile, setProfile] = useState<DashboardData | null>(null)
  const [calories, setCalories] = useState(0)
  const [protein, setProtein] = useState(0)
  const [carbs, setCarbs] = useState(0)
  const [fat, setFat] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadDashboard = useCallback(async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      Alert.alert('Login required', 'Please log in again.')
      setLoading(false)
      return
    }

    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const [profileResponse, mealsResponse] = await Promise.all([
      supabase
        .from('profiles')
        .select('full_name, daily_calorie_target, fitness_goal, tier')
        .eq('id', user.id)
        .single(),

      supabase
        .from('food_logs')
        .select('calories, protein_g, carbs_g, fat_g')
        .eq('user_id', user.id)
        .gte('logged_at', startOfDay.toISOString()),
    ])

    if (profileResponse.error) {
      Alert.alert('Profile error', profileResponse.error.message)
      setLoading(false)
      return
    }

    if (mealsResponse.error) {
      Alert.alert('Meal error', mealsResponse.error.message)
      setLoading(false)
      return
    }

    const meals = mealsResponse.data ?? []

    setProfile(profileResponse.data)
    setCalories(
      meals.reduce((total, item) => total + Number(item.calories), 0)
    )
    setProtein(
      meals.reduce((total, item) => total + Number(item.protein_g), 0)
    )
    setCarbs(
      meals.reduce((total, item) => total + Number(item.carbs_g), 0)
    )
    setFat(
      meals.reduce((total, item) => total + Number(item.fat_g), 0)
    )
    setLoading(false)
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadDashboard()
    }, [loadDashboard])
  )


  async function handleRefresh() {
    setRefreshing(true)
    await loadDashboard()
    setRefreshing(false)
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E5C35" />
      </View>
    )
  }

  const calorieTarget = profile?.daily_calorie_target ?? 0
  const calorieProgress =
    calorieTarget > 0 ? Math.min(calories / calorieTarget, 1) : 0
  const isPremium = profile?.tier === 'premium'
  const firstName = profile?.full_name?.split(' ')[0] || 'there'

  const featureTiles: FeatureTile[] = [
    {
      key: 'food-diary',
      icon: '📖',
      title: 'Food Diary',
      subtitle: 'View your daily meals',
      onPress: () => navigation.navigate('Meals'),
    },
    {
      key: 'wellness',
      icon: '💧',
      title: 'Wellness',
      subtitle: 'Water, exercise, sync',
      onPress: () => navigation.navigate('Wellness'),
    },
    {
      key: 'progress',
      icon: '📈',
      title: 'Progress Tracking',
      subtitle: 'How much have you achieved?',
      onPress: () => navigation.navigate('Reports'),
    },
    {
      key: 'food-logging',
      icon: '🍽️',
      title: 'Food Logging',
      subtitle: 'Log your meals',
      onPress: () => navigation.navigate('Meals'),
    },
    {
      key: 'favourites',
      icon: '❤️',
      title: 'Favourites',
      subtitle: 'Saved meals & recipes',
      onPress: () => navigation.navigate('Meals'),
    },
    {
      key: 'review',
      icon: '⭐',
      title: 'Review',
      subtitle: 'Lets us know what you think',
      onPress: () => navigation.navigate('Reports'),
    },
  ]

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor="#1E5C35"
        />
      }
    >
      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Home</Text>
        {!isPremium && (
          <TouchableOpacity style={styles.goPremiumBtn}>
            <Text style={styles.goPremiumText}>Go Premium ✦</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Hero greeting card */}
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <Text style={styles.heroGreeting}>{getGreeting()}</Text>
          <View style={styles.tierBadge}>
            <Text style={styles.tierBadgeText}>
              {isPremium ? 'PREMIUM PLAN' : 'FREE PLAN'}
            </Text>
          </View>
        </View>
        <Text style={styles.heroHello}>Hello, {firstName} 👋</Text>
        <Text style={styles.heroSub}>
          Keep building healthy habits one day at a time.
        </Text>
      </View>

      {/* Calorie goal card */}
      <View style={styles.calorieCard}>
        <Text style={styles.cardLabel}>Daily Calorie Goal</Text>
        <Text style={styles.calorieValue}>
          {calories} / {calorieTarget || '—'} kcal
        </Text>
        <View style={styles.progressBackground}>
          <View
            style={[
              styles.progressFill,
              { width: `${calorieProgress * 100}%` },
            ]}
          />
        </View>
      </View>

      {/* Macros */}
      <Text style={styles.sectionTitle}>Today&apos;s Macros</Text>
      <View style={styles.macroGrid}>
        <View style={styles.macroCard}>
          <Text style={styles.macroValue}>{protein} g</Text>
          <Text style={styles.macroLabel}>Protein</Text>
        </View>
        <View style={styles.macroCard}>
          <Text style={styles.macroValue}>{carbs} g</Text>
          <Text style={styles.macroLabel}>Carbohydrates</Text>
        </View>
        <View style={styles.macroCard}>
          <Text style={styles.macroValue}>{fat} g</Text>
          <Text style={styles.macroLabel}>Fat</Text>
        </View>
      </View>

      {/* Feature grid */}
      <Text style={styles.sectionTitle}>Your Features</Text>
      <View style={styles.grid}>
        {featureTiles.map((tile) => (
          <TouchableOpacity
            key={tile.key}
            style={styles.tile}
            onPress={tile.onPress}
            activeOpacity={0.7}
          >
            <Text style={styles.tileIcon}>{tile.icon}</Text>
            <Text style={styles.tileTitle}>{tile.title}</Text>
            <Text style={styles.tileSub}>{tile.subtitle}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Premium upsell */}
      {!isPremium && (
        <View style={styles.upsellCard}>
          <Text style={styles.upsellTitle}>
            Unlock everything for $9.90/month
          </Text>
          <Text style={styles.upsellSub}>
            Personal coach access, custom meal plans, and full analytics.
          </Text>
          <View style={styles.upsellBtn}>
            <Text style={styles.upsellBtnText}>See Premium Plans</Text>
          </View>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    alignItems: 'center',
    backgroundColor: '#F5FAF6',
    flex: 1,
    justifyContent: 'center',
  },
  container: {
    backgroundColor: '#F5FAF6',
    flexGrow: 1,
    padding: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  topBarTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#16281D',
  },
  goPremiumBtn: {
    backgroundColor: '#F2C14E',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  goPremiumText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#4C3400',
  },
  heroCard: {
    backgroundColor: '#1E5C35',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroGreeting: {
    fontSize: 13,
    color: '#CFE4D6',
  },
  tierBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  tierBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  heroHello: {
    fontSize: 21,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 6,
  },
  heroSub: {
    fontSize: 13,
    color: '#D8EADF',
    marginTop: 4,
  },
  calorieCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DCE9E0',
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
  },
  cardLabel: {
    color: '#5C7267',
    fontSize: 14,
    fontWeight: '700',
  },
  calorieValue: {
    color: '#16281D',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 6,
  },
  progressBackground: {
    backgroundColor: '#E2ECE6',
    borderRadius: 999,
    height: 9,
    marginTop: 14,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: '#1E5C35',
    borderRadius: 999,
    height: '100%',
  },
  sectionTitle: {
    color: '#5C7267',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
    marginBottom: 12,
  },
  macroGrid: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 20,
  },
  macroCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DCE9E0',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    padding: 13,
  },
  macroValue: {
    color: '#1E5C35',
    fontSize: 18,
    fontWeight: '800',
  },
  macroLabel: {
    color: '#708277',
    fontSize: 11,
    marginTop: 5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  tile: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2ECE6',
    padding: 14,
    marginBottom: 12,
  },
  tileIcon: {
    fontSize: 22,
    marginBottom: 8,
  },
  tileTitle: {
  color: '#16281D',
  fontSize: 13,
  fontWeight: '800',
  marginBottom: 2,
  },
  tileSub: {
  color: '#7C8F83',
  fontSize: 11,
  lineHeight: 15,
  },
  upsellCard: {
    backgroundColor: '#D9ECDF',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 20,
  },
  upsellTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#154526',
    textAlign: 'center',
    marginBottom: 6,
  },
  upsellSub: {
    fontSize: 12.5,
    color: '#5C7267',
    textAlign: 'center',
    marginBottom: 14,
  },
  upsellBtn: {
    backgroundColor: '#1E5C35',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  upsellBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
})
