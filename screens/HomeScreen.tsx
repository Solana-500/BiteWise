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

import { supabase } from '../services/supabase'
import type { RootStackParamList } from '../types/navigation'

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>

type DashboardData = {
  full_name: string | null
  daily_calorie_target: number | null
  fitness_goal: string | null
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
        .select('full_name, daily_calorie_target, fitness_goal')
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

  async function handleLogout() {
    const { error } = await supabase.auth.signOut()

    if (error) {
      Alert.alert('Logout failed', error.message)
    }
  }

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
    calorieTarget > 0
      ? Math.min(calories / calorieTarget, 1)
      : 0

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
      <Text style={styles.logo}>BiteWise</Text>

      <Text style={styles.greeting}>
        Hello, {profile?.full_name || 'BiteWise user'}
      </Text>

      <Text style={styles.goal}>
        Goal: {profile?.fitness_goal || 'Not selected'}
      </Text>

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

      <Text style={styles.sectionTitle}>Quick Actions</Text>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.navigate('Meals')}
      >
        <Text style={styles.primaryButtonText}>Log a Meal</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.navigate('Wellness')}
      >
        <Text style={styles.secondaryButtonText}>Track Wellness</Text>
      </TouchableOpacity>

       <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.navigate('Reports')}
      >
        <Text style={styles.secondaryButtonText}>View Reports</Text>
      </TouchableOpacity>       

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
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
    padding: 24,
    paddingTop: 60,
  },
  logo: {
    color: '#1E5C35',
    fontSize: 32,
    fontWeight: '800',
  },
  greeting: {
    color: '#16281D',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 24,
  },
  goal: {
    color: '#5C7267',
    fontSize: 15,
    marginTop: 5,
  },
  calorieCard: {
    backgroundColor: '#1E5C35',
    borderRadius: 18,
    marginTop: 26,
    padding: 20,
  },
  cardLabel: {
    color: '#D8EADF',
    fontSize: 14,
    fontWeight: '700',
  },
  calorieValue: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    marginTop: 10,
  },
  progressBackground: {
    backgroundColor: '#5C856A',
    borderRadius: 999,
    height: 9,
    marginTop: 18,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    height: '100%',
  },
  sectionTitle: {
    color: '#16281D',
    fontSize: 19,
    fontWeight: '800',
    marginTop: 28,
    marginBottom: 12,
  },
  macroGrid: {
    flexDirection: 'row',
    gap: 9,
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
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#1E5C35',
    borderRadius: 10,
    paddingVertical: 15,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#D9ECDF',
    borderRadius: 10,
    marginTop: 10,
    paddingVertical: 15,
  },
  secondaryButtonText: {
    color: '#1E5C35',
    fontSize: 16,
    fontWeight: '800',
  },
  logoutButton: {
    alignItems: 'center',
    backgroundColor: '#FDE3E3',
    borderRadius: 10,
    marginTop: 32,
    paddingVertical: 13,
  },
  logoutText: {
    color: '#B3261E',
    fontSize: 14,
    fontWeight: '800',
  },
})