import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import type { CompositeNavigationProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { supabase } from '../services/supabase'
import type {
  MainTabParamList,
  RootStackParamList,
} from '../types/navigation'

type MealsNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Meals'>,
  NativeStackNavigationProp<RootStackParamList>
>

type Meal = {
  id: string
  food_name: string
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  meal_type: string | null
  logged_at: string
}

export default function MealsScreen() {
  const navigation = useNavigation<MealsNavigationProp>()
  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadMeals = useCallback(async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setLoading(false)
      Alert.alert('Login required', 'Please log in again.')
      return
    }

    const { data, error } = await supabase
      .from('food_logs')
      .select(
        'id, food_name, calories, protein_g, carbs_g, fat_g, meal_type, logged_at'
      )
      .eq('user_id', user.id)
      .order('logged_at', { ascending: false })

    if (error) {
      setLoading(false)
      Alert.alert('Meal error', error.message)
      return
    }

    setMeals((data ?? []) as Meal[])
    setLoading(false)
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadMeals()
    }, [loadMeals])
  )

  

  function handleDeleteMeal(mealId: string) {
    Alert.alert(
      'Delete meal',
      'Are you sure you want to delete this logged meal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('food_logs')
              .delete()
              .eq('id', mealId)

            if (error) {
              Alert.alert('Could not delete meal', error.message)
              return
            }

            setMeals((current) => current.filter((meal) => meal.id !== mealId))
          },
        },
      ]
    )
  }

  async function handleRefresh() {
    setRefreshing(true)
    await loadMeals()
    setRefreshing(false)
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E5C35" />
      </View>
    )
  }

  const today = new Date()
  const todayMeals = meals.filter((meal) => {
    const date = new Date(meal.logged_at)
    return date.toDateString() === today.toDateString()
  })

  const displayedMeals = todayMeals.length > 0 ? todayMeals : meals

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
      <TouchableOpacity
        style={styles.backHomeButton}
        onPress={() => navigation.navigate('Home')}
      >
        <Text style={styles.backHomeText}>‹ Home</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Food Diary</Text>
      <Text style={styles.subtitle}>Track and manage your logged meals.</Text>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Today&apos;s logged meals</Text>
        <Text style={styles.summaryValue}>
          {todayMeals.length} {todayMeals.length === 1 ? 'meal' : 'meals'} logged today
        </Text>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.getParent()?.navigate('FoodLogging')}
>
        <Text style={styles.primaryButtonText}>+ Log New Food</Text>
      </TouchableOpacity>


      <Text style={styles.sectionTitle}>Meal History</Text>

      {displayedMeals.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No meals logged yet</Text>
          <Text style={styles.emptyText}>
            Tap “Log New Food” to add your first meal.
          </Text>
        </View>
      ) : (
        displayedMeals.map((meal) => (
          <View key={meal.id} style={styles.mealCard}>
            <View style={styles.mealMain}>
              <Text style={styles.mealName}>{meal.food_name}</Text>
              <Text style={styles.mealMeta}>
                {Number(meal.calories || 0)} kcal •{' '}
                {meal.meal_type || 'Meal'} • Tap to view nutrition
              </Text>
              <Text style={styles.macroSummary}>
                P {Number(meal.protein_g || 0)}g  ·  C {Number(meal.carbs_g || 0)}g  ·  F {Number(meal.fat_g || 0)}g
              </Text>
            </View>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteMeal(meal.id)}
            >
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      <Text style={styles.sectionTitle}>Manage Logged Food</Text>

      <View style={styles.manageCard}>
        <TouchableOpacity style={styles.manageRow}>
          <Text style={styles.manageText}>Edit Logged Food</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.manageRow}>
          <Text style={styles.manageText}>Delete Logged Food</Text>
          <Text style={styles.trash}>▢</Text>
        </TouchableOpacity>
      </View>
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
    paddingBottom: 40,
  },
  backHomeButton: {
    alignSelf: 'flex-start',
    marginBottom: 4,
    paddingRight: 14,
    paddingVertical: 8,
  },
  backHomeText: {
    color: '#1E5C35',
    fontSize: 15,
    fontWeight: '800',
  },
  title: {
    color: '#16281D',
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: '#5C7267',
    fontSize: 14,
    marginTop: 5,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2ECE6',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 22,
    padding: 18,
  },
  summaryTitle: {
    color: '#16281D',
    fontSize: 16,
    fontWeight: '800',
  },
  summaryValue: {
    color: '#5C7267',
    fontSize: 13,
    marginTop: 5,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#1E5C35',
    borderRadius: 12,
    marginTop: 12,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  sectionTitle: {
    color: '#5C7267',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 24,
    textTransform: 'uppercase',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2ECE6',
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
  },
  emptyTitle: {
    color: '#16281D',
    fontSize: 15,
    fontWeight: '800',
  },
  emptyText: {
    color: '#7C8F83',
    fontSize: 13,
    marginTop: 5,
  },
  mealCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2ECE6',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 10,
    padding: 15,
  },
  mealMain: {
    flex: 1,
  },
  mealName: {
    color: '#16281D',
    fontSize: 14,
    fontWeight: '800',
  },
  mealMeta: {
    color: '#7C8F83',
    fontSize: 11.5,
    marginTop: 5,
  },
  macroSummary: {
    color: '#1E5C35',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
  },
  deleteButton: {
    backgroundColor: '#FDE3E3',
    borderRadius: 8,
    marginLeft: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  deleteText: {
    color: '#B3261E',
    fontSize: 11,
    fontWeight: '800',
  },
  manageCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2ECE6',
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  manageRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  manageText: {
    color: '#16281D',
    fontSize: 14,
  },
  chevron: {
    color: '#1E5C35',
    fontSize: 27,
    fontWeight: '300',
  },
  trash: {
    color: '#B3261E',
    fontSize: 22,
  },
  divider: {
    backgroundColor: '#E2ECE6',
    height: 1,
  },
})
