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
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../services/supabase'
import type { HomeStackParamList } from '../types/navigation'

type Props = NativeStackScreenProps<HomeStackParamList, 'HomeMain'>

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

function formatMacro(value: number | null | undefined) {
  const numberValue = Number(value ?? 0)

  if (!Number.isFinite(numberValue)) {
    return '0.0'
  }

  return numberValue.toFixed(1)
}

function formatCalories(value: number | null | undefined) {
  const numberValue = Number(value ?? 0)

  if (!Number.isFinite(numberValue)) {
    return '0'
  }

  return Math.round(numberValue).toString()
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
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        throw userError
      }

      if (!user) {
        Alert.alert('Login required', 'Please log in again.')
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
        throw profileResponse.error
      }

      if (mealsResponse.error) {
        throw mealsResponse.error
      }

      const meals = mealsResponse.data ?? []

      setProfile(profileResponse.data)

      setCalories(
        meals.reduce(
          (total, item) => total + Number(item.calories ?? 0),
          0
        )
      )

      setProtein(
        meals.reduce(
          (total, item) => total + Number(item.protein_g ?? 0),
          0
        )
      )

      setCarbs(
        meals.reduce(
          (total, item) => total + Number(item.carbs_g ?? 0),
          0
        )
      )

      setFat(
        meals.reduce(
          (total, item) => total + Number(item.fat_g ?? 0),
          0
        )
      )
    } catch (error: any) {
      console.error('Dashboard loading error:', error)

      Alert.alert(
        'Dashboard error',
        error?.message || 'Unable to load your dashboard. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      void loadDashboard()
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
      onPress: () => navigation.getParent()?.navigate('Meals'),
    },
    {
      key: 'wellness',
      icon: '💧',
      title: 'Wellness',
      subtitle: 'Water, exercise, sync',
      onPress: () => navigation.getParent()?.navigate('Wellness')
    },
    {
      key: 'progress',
      icon: '📈',
      title: 'Progress Tracking',
      subtitle: 'How much have you achieved?',
      onPress: () => navigation.getParent()?.navigate('Progress')
    },
    {
      key: 'food-logging',
      icon: '🍽️',
      title: 'Food Logging',
      subtitle: 'Log your meals',
      onPress: () => navigation.getParent()?.navigate('Meals')
    },
    {
      key: 'favourites',
      icon: '♡',
      title: 'Favourites',
      subtitle: 'Saved meals and recipes',
      onPress: () =>
        navigation.getParent()?.navigate('Home', {
          screen: 'FavoriteList',
        }),
    },
    {
      key: 'review',
      icon: '⭐',
      title: 'Review',
      subtitle: 'Let us know what you think',
      onPress: () => navigation.getParent()?.navigate('Feedback'),
    },
  ]

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
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
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Home</Text>

        {!isPremium ? (
          <TouchableOpacity style={styles.goPremiumBtn}>
            <Text style={styles.goPremiumText}>Go Premium ✦</Text>
          </TouchableOpacity>
        ) : null}
      </View>

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

      <View style={styles.calorieCard}>
        <Text style={styles.cardLabel}>Daily Calorie Goal</Text>

        <Text style={styles.calorieValue}>
          {formatCalories(calories)} /{' '}
          {calorieTarget > 0 ? formatCalories(calorieTarget) : '—'} kcal
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

      <Text style={styles.sectionTitle}>Today&apos;s Macros</Text>

      <View style={styles.macroGrid}>
        <View style={styles.macroCard}>
          <Text
            style={styles.macroValue}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatMacro(protein)} g
          </Text>

          <Text style={styles.macroLabel}>Protein</Text>
        </View>

        <View style={styles.macroCard}>
          <Text
            style={styles.macroValue}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatMacro(carbs)} g
          </Text>

          <Text style={styles.macroLabel}>Carbohydrates</Text>
        </View>

        <View style={styles.macroCard}>
          <Text
            style={styles.macroValue}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatMacro(fat)} g
          </Text>

          <Text style={styles.macroLabel}>Fat</Text>
        </View>
      </View>

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

      {!isPremium ? (
        <View style={styles.upsellCard}>
          <Text style={styles.upsellTitle}>
            Unlock everything for $9.90/month
          </Text>

          <Text style={styles.upsellSub}>
            Personal coach access, custom meal plans, and full analytics.
          </Text>

          <TouchableOpacity style={styles.upsellBtn}>
            <Text style={styles.upsellBtnText}>See Premium Plans</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    alignItems: 'center',
    backgroundColor: '#F5FAF6',
    flex: 1,
    justifyContent: 'center',
  },
  safeArea: {
    backgroundColor: '#F5FAF6',
    flex: 1,
  },
  container: {
  backgroundColor: '#F5FAF6',
  flexGrow: 1,
  padding: 20,
  paddingBottom: 40,
},

  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  topBarTitle: {
    color: '#16281D',
    fontSize: 24,
    fontWeight: '800',
  },

  goPremiumBtn: {
    backgroundColor: '#F2C14E',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },

  goPremiumText: {
    color: '#4C3400',
    fontSize: 12.5,
    fontWeight: '800',
  },

  heroCard: {
    backgroundColor: '#1E5C35',
    borderRadius: 18,
    marginBottom: 14,
    padding: 18,
  },

  heroTopRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  heroGreeting: {
    color: '#CFE4D6',
    fontSize: 13,
  },

  tierBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  tierBadgeText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  heroHello: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '800',
    marginTop: 6,
  },

  heroSub: {
    color: '#D8EADF',
    fontSize: 13,
    marginTop: 4,
  },

  calorieCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DCE9E0',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
    padding: 18,
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
    letterSpacing: 0.5,
    marginBottom: 12,
    marginTop: 4,
    textTransform: 'uppercase',
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
    minWidth: 0,
    padding: 13,
  },

  macroValue: {
    color: '#1E5C35',
    flexShrink: 1,
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
    backgroundColor: '#FFFFFF',
    borderColor: '#E2ECE6',
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    padding: 14,
    width: '48%',
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
    alignItems: 'center',
    backgroundColor: '#D9ECDF',
    borderRadius: 16,
    marginBottom: 20,
    padding: 18,
  },

  upsellTitle: {
    color: '#154526',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
  },

  upsellSub: {
    color: '#5C7267',
    fontSize: 12.5,
    marginBottom: 14,
    textAlign: 'center',
  },

  upsellBtn: {
    backgroundColor: '#1E5C35',
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },

  upsellBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
})