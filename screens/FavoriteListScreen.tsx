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
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import { supabase } from '../services/supabase'

type FavoriteNavigationProp = NativeStackNavigationProp<
  {
    FavoriteList: undefined
    HomeMain: undefined
  },
  'FavoriteList'
>

type FoodLog = {
  id: string
  food_name: string
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  meal_type: string | null
  logged_at: string
}

type FavoriteMeal = {
  id: string
  food_log_id: string
  created_at: string
  food_logs: FoodLog | null
}

function formatMealType(mealType: string | null) {
  if (!mealType) return 'Meal'

  return mealType.charAt(0).toUpperCase() + mealType.slice(1)
}

function formatLoggedDate(loggedAt: string) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(loggedAt))
}

export default function FavoriteListScreen() {
  const navigation = useNavigation<FavoriteNavigationProp>()

  const [favorites, setFavorites] = useState<FavoriteMeal[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const loadFavorites = useCallback(async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        throw userError
      }

      if (!user) {
        setFavorites([])
        return
      }

      const { data, error } = await supabase
        .from('favorite_meals')
        .select(`
          id,
          food_log_id,
          created_at,
          food_logs!favorite_meals_food_log_id_fkey (
            id,
            food_name,
            calories,
            protein_g,
            carbs_g,
            fat_g,
            meal_type,
            logged_at
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      setFavorites((data ?? []) as unknown as FavoriteMeal[])
    } catch (error: any) {
      console.error('Load favourites error:', error)

      Alert.alert(
        'Could not load favourites',
        error?.message || 'Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      void loadFavorites()
    }, [loadFavorites])
  )

  async function handleRefresh() {
    setRefreshing(true)
    await loadFavorites()
    setRefreshing(false)
  }

  function confirmRemoveFavorite(favorite: FavoriteMeal) {
    const foodName = favorite.food_logs?.food_name || 'this food'

    Alert.alert(
      'Remove favourite?',
      `Remove "${foodName}" from your favourite foods?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => void removeFavorite(favorite),
        },
      ]
    )
  }

  async function removeFavorite(favorite: FavoriteMeal) {
    try {
      setRemovingId(favorite.id)

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

      const { error } = await supabase
        .from('favorite_meals')
        .delete()
        .eq('id', favorite.id)
        .eq('user_id', user.id)

      if (error) {
        throw error
      }

      setFavorites((currentFavorites) =>
        currentFavorites.filter((item) => item.id !== favorite.id)
      )
    } catch (error: any) {
      console.error('Remove favourite error:', error)

      Alert.alert(
        'Could not remove favourite',
        error?.message || 'Please try again.'
      )
    } finally {
      setRemovingId(null)
    }
  }

  const visibleFavorites = favorites.filter(
    (favorite) => favorite.food_logs !== null
  )

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E5C35" />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#1E5C35"
          />
        }
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backHomeButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Go back to Home"
          >
            <Text style={styles.backHomeText}>‹ Home</Text>
          </TouchableOpacity>

          <Text style={styles.topBarTitle}>Favourites</Text>

          <View style={styles.topBarSpacer} />
        </View>

        <Text style={styles.title}>Saved Foods</Text>

        <Text style={styles.subtitle}>
          Your favourite logged foods in one place.
        </Text>

        <Text style={styles.sectionTitle}>
          SAVED FOODS ({visibleFavorites.length})
        </Text>

        {visibleFavorites.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Text style={styles.emptyIcon}>♡</Text>
            </View>

            <Text style={styles.emptyTitle}>No favourite foods yet</Text>

            <Text style={styles.emptyText}>
              Tap the heart beside a food in your Meal History to save it here.
            </Text>

            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => navigation.getParent()?.navigate('Meals')}
              accessibilityRole="button"
              accessibilityLabel="Go to Meals"
            >
              <Text style={styles.browseButtonText}>Go to Meals</Text>
            </TouchableOpacity>
          </View>
        ) : (
          visibleFavorites.map((favorite) => {
            const meal = favorite.food_logs

            if (!meal) {
              return null
            }

            return (
              <View key={favorite.id} style={styles.foodCard}>
                <View style={styles.foodTopRow}>
                  <View style={styles.foodIconCircle}>
                    <Text style={styles.foodIcon}>🍽️</Text>
                  </View>

                  <View style={styles.foodInfo}>
                    <Text style={styles.foodName}>{meal.food_name}</Text>

                    <Text style={styles.foodMeta}>
                      {Number(meal.calories ?? 0)} kcal ·{' '}
                      {Number(meal.protein_g ?? 0)}g protein ·{' '}
                      {formatMealType(meal.meal_type)}
                    </Text>

                    <Text style={styles.foodDate}>
                      Logged {formatLoggedDate(meal.logged_at)}
                    </Text>
                  </View>
                </View>

                <View style={styles.foodActions}>
                  <TouchableOpacity
                    style={styles.viewMealsButton}
                    onPress={() => navigation.getParent()?.navigate('Meals')}
                    accessibilityRole="button"
                    accessibilityLabel="View meal history"
                  >
                    <Text style={styles.viewMealsButtonText}>
                      View in Meals
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.removeButton}
                    disabled={removingId === favorite.id}
                    onPress={() => confirmRemoveFavorite(favorite)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${meal.food_name} from favourites`}
                  >
                    {removingId === favorite.id ? (
                      <ActivityIndicator size="small" color="#B3261E" />
                    ) : (
                      <Text style={styles.removeButtonText}>Remove</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )
          })
        )}

        <View style={styles.premiumCard}>
          <View style={styles.premiumIconCircle}>
            <Text style={styles.premiumIcon}>✦</Text>
          </View>

          <View style={styles.premiumContent}>
            <Text style={styles.premiumTitle}>More meal ideas later</Text>

            <Text style={styles.premiumText}>
              Premium can unlock personalised food suggestions, weekly meal
              plans, and smarter nutrition insights.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.goPremiumButton}
          onPress={() => navigation.getParent()?.navigate('SubPremium' as never)}
          accessibilityRole="button"
          accessibilityLabel="Go Premium"
        >
          <Text style={styles.goPremiumStar}>✦</Text>
          <Text style={styles.goPremiumButtonText}>Go Premium</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#F5FAF6',
    flex: 1,
  },
  screen: {
    backgroundColor: '#F5FAF6',
  },
  container: {
    backgroundColor: '#F5FAF6',
    flexGrow: 1,
    padding: 20,
    paddingBottom: 110,
    paddingTop: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    backgroundColor: '#F5FAF6',
    flex: 1,
    justifyContent: 'center',
  },
    topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 40,
    justifyContent: 'space-between',
    },
    backHomeButton: {
    alignItems: 'flex-start',
    height: 40,
    justifyContent: 'center',
    width: 72,
    },
    backHomeText: {
    color: '#1E5C35',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
    },
  topBarTitle: {
    color: '#16281D',
    fontSize: 18,
    fontWeight: '800',
  },
    topBarSpacer: {
    height: 40,
    width: 72,
    },
  title: {
    color: '#16281D',
    fontSize: 26,
    fontWeight: '800',
    marginTop: 24,
    textAlign: 'center',
  },
  subtitle: {
    color: '#5C7267',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5,
    textAlign: 'center',
  },
  sectionTitle: {
    color: '#5C7267',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.6,
    marginBottom: 10,
    marginTop: 26,
  },
  foodCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DCE9E0',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    padding: 14,
  },
  foodTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  foodIconCircle: {
    alignItems: 'center',
    backgroundColor: '#D9ECDF',
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    marginRight: 12,
    width: 48,
  },
  foodIcon: {
    fontSize: 22,
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    color: '#16281D',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 19,
  },
  foodMeta: {
    color: '#708277',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  foodDate: {
    color: '#708277',
    fontSize: 11,
    marginTop: 4,
  },
  foodActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  viewMealsButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#1E5C35',
    borderRadius: 10,
    borderWidth: 1.5,
    flex: 1,
    justifyContent: 'center',
    minHeight: 43,
    paddingHorizontal: 10,
  },
  viewMealsButtonText: {
    color: '#1E5C35',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  removeButton: {
    alignItems: 'center',
    backgroundColor: '#FDECEC',
    borderColor: '#E8AAA6',
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 43,
    paddingHorizontal: 10,
  },
  removeButtonText: {
    color: '#B3261E',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#DCE9E0',
    borderRadius: 18,
    borderWidth: 1,
    padding: 25,
  },
  emptyIconCircle: {
    alignItems: 'center',
    backgroundColor: '#EAF3EC',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  emptyIcon: {
    color: '#1E5C35',
    fontSize: 32,
    fontWeight: '700',
  },
  emptyTitle: {
    color: '#16281D',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 14,
  },
  emptyText: {
    color: '#708277',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
    textAlign: 'center',
  },
  browseButton: {
    alignItems: 'center',
    backgroundColor: '#1E5C35',
    borderRadius: 10,
    justifyContent: 'center',
    marginTop: 18,
    minHeight: 46,
    paddingHorizontal: 20,
  },
  browseButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  premiumCard: {
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderColor: '#C9DBD0',
    borderRadius: 18,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    flexDirection: 'row',
    marginTop: 24,
    padding: 16,
  },
  premiumIconCircle: {
    alignItems: 'center',
    backgroundColor: '#FFF4D6',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    marginRight: 12,
    width: 40,
  },
  premiumIcon: {
    fontSize: 19,
  },
  premiumContent: {
    flex: 1,
  },
  premiumTitle: {
    color: '#16281D',
    fontSize: 14,
    fontWeight: '800',
  },
  premiumText: {
    color: '#708277',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  goPremiumButton: {
    alignItems: 'center',
    backgroundColor: '#D4A017',
    borderColor: '#B7791F',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
    marginTop: 16,
    minHeight: 52,
    paddingHorizontal: 18,
  },
  goPremiumStar: {
    fontSize: 18,
    marginRight: 8,
  },
  goPremiumButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
})