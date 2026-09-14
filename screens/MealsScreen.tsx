import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
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

type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'

type ManageMode = 'edit' | 'delete' | null

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

const MEAL_TYPES: MealType[] = [
  'Breakfast',
  'Lunch',
  'Dinner',
  'Snack',
]

function formatMealType(mealType: string | null) {
  if (!mealType) return 'Meal'

  return mealType.charAt(0).toUpperCase() + mealType.slice(1)
}

function formatLoggedDate(loggedAt: string) {
  const date = new Date(loggedAt)

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function getSafeNumber(value: string) {
  const numberValue = Number(value)

  return Number.isFinite(numberValue) ? numberValue : 0
}

export default function MealsScreen() {
  const navigation = useNavigation<MealsNavigationProp>()

  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)

  const [manageMode, setManageMode] = useState<ManageMode>(null)
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null)

  const [editFoodName, setEditFoodName] = useState('')
  const [editCalories, setEditCalories] = useState('')
  const [editProtein, setEditProtein] = useState('')
  const [editCarbs, setEditCarbs] = useState('')
  const [editFat, setEditFat] = useState('')
  const [editMealType, setEditMealType] =
    useState<MealType>('Breakfast')

  const loadMeals = useCallback(async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        throw userError
      }

      if (!user) {
        setMeals([])
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
        throw error
      }

      setMeals((data ?? []) as Meal[])
    } catch (error: any) {
      console.error('Load meals error:', error)

      Alert.alert(
        'Meal error',
        error?.message || 'Unable to load logged meals. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      void loadMeals()
    }, [loadMeals])
  )

  async function handleRefresh() {
    setRefreshing(true)
    await loadMeals()
    setRefreshing(false)
  }

  function toggleManageMode(mode: ManageMode) {
    setManageMode((currentMode) =>
      currentMode === mode ? null : mode
    )
  }

  function openEditMeal(meal: Meal) {
    setEditingMeal(meal)
    setEditFoodName(meal.food_name)
    setEditCalories(String(Number(meal.calories ?? 0)))
    setEditProtein(String(Number(meal.protein_g ?? 0)))
    setEditCarbs(String(Number(meal.carbs_g ?? 0)))
    setEditFat(String(Number(meal.fat_g ?? 0)))

    const matchingMealType = MEAL_TYPES.find(
      (mealType) =>
        mealType.toLowerCase() === meal.meal_type?.toLowerCase()
    )

    setEditMealType(matchingMealType ?? 'Breakfast')
  }

  function closeEditModal() {
    if (saving) return

    setEditingMeal(null)
  }

  async function handleUpdateMeal() {
    if (!editingMeal) return

    const foodName = editFoodName.trim()

    if (!foodName) {
      Alert.alert('Food name required', 'Please enter a food name.')
      return
    }

    try {
      setSaving(true)

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
        .from('food_logs')
        .update({
          food_name: foodName,
          calories: getSafeNumber(editCalories),
          protein_g: getSafeNumber(editProtein),
          carbs_g: getSafeNumber(editCarbs),
          fat_g: getSafeNumber(editFat),
          meal_type: editMealType.toLowerCase(),
        })
        .eq('id', editingMeal.id)
        .eq('user_id', user.id)

      if (error) {
        throw error
      }

      setEditingMeal(null)
      await loadMeals()

      Alert.alert('Food updated', `${foodName} has been updated.`)
    } catch (error: any) {
      console.error('Update meal error:', error)

      Alert.alert(
        'Could not update food',
        error?.message || 'Unable to update this food entry.'
      )
    } finally {
      setSaving(false)
    }
  }

  function confirmDeleteMeal(meal: Meal) {
    Alert.alert(
      'Delete logged food?',
      `Remove "${meal.food_name}" from your food diary?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => void handleDeleteMeal(meal.id),
        },
      ]
    )
  }

  async function handleDeleteMeal(mealId: string) {
    try {
      setSaving(true)

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
        .from('food_logs')
        .delete()
        .eq('id', mealId)
        .eq('user_id', user.id)

      if (error) {
        throw error
      }

      setMeals((currentMeals) =>
        currentMeals.filter((meal) => meal.id !== mealId)
      )
    } catch (error: any) {
      console.error('Delete meal error:', error)

      Alert.alert(
        'Could not delete meal',
        error?.message || 'Unable to delete this food entry.'
      )
    } finally {
      setSaving(false)
    }
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

  const mealHistory = todayMeals.length > 0 ? todayMeals : meals
  const displayedMeals = mealHistory.slice(0, 4)
  const hasMoreMeals = mealHistory.length > 4

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
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

        <Text style={styles.subtitle}>
          Track and manage your logged meals.
        </Text>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Today&apos;s logged meals</Text>

          <Text style={styles.summaryValue}>
            {todayMeals.length}{' '}
            {todayMeals.length === 1 ? 'meal' : 'meals'} logged today
          </Text>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.getParent()?.navigate('FoodLogging')}
        >
          <Text style={styles.primaryButtonText}>Log New Food</Text>
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
  <>
    {displayedMeals.map((meal) => (
      <View key={meal.id} style={styles.mealCard}>
        <View style={styles.mealMain}>
          <Text style={styles.mealName}>{meal.food_name}</Text>

          <Text style={styles.mealMeta}>
            {Number(meal.calories ?? 0)} kcal •{' '}
            {formatMealType(meal.meal_type)}
          </Text>

          <Text style={styles.macroSummary}>
            P {Number(meal.protein_g ?? 0)}g · C{' '}
            {Number(meal.carbs_g ?? 0)}g · F{' '}
            {Number(meal.fat_g ?? 0)}g
          </Text>

          <Text style={styles.mealDate}>
            Logged {formatLoggedDate(meal.logged_at)}
          </Text>
        </View>
      </View>
    ))}

    {hasMoreMeals ? (
      <Text style={styles.historyLimitText}>
        Use Manage Logged Food below to
        edit or delete older entries.
      </Text>
    ) : null}
  </>
)}
        <Text style={styles.sectionTitle}>Manage Logged Food</Text>

        <View style={styles.manageCard}>
          <TouchableOpacity
            style={[
              styles.manageRow,
              manageMode === 'edit' && styles.manageRowActive,
            ]}
            onPress={() => toggleManageMode('edit')}
          >
            <Text
              style={[
                styles.manageText,
                manageMode === 'edit' && styles.manageTextActive,
              ]}
            >
              Edit Logged Food
            </Text>

            <Text
              style={[
                styles.chevron,
                manageMode === 'edit' && styles.chevronActive,
              ]}
            >
              {manageMode === 'edit' ? '⌃' : '›'}
            </Text>
          </TouchableOpacity>

          {manageMode === 'edit' ? (
            <View style={styles.manageList}>
              <Text style={styles.manageListHint}>
                Select a logged food to edit it.
              </Text>

              {meals.length === 0 ? (
                <Text style={styles.manageEmptyText}>
                  No logged foods available to edit.
                </Text>
              ) : (
                meals.map((meal) => (
                  <View key={meal.id} style={styles.manageMealRow}>
                    <View style={styles.manageMealInfo}>
                      <Text style={styles.manageMealName}>
                        {meal.food_name}
                      </Text>

                      <Text style={styles.manageMealMeta}>
                        {formatMealType(meal.meal_type)} ·{' '}
                        {Number(meal.calories ?? 0)} kcal
                      </Text>

                      <Text style={styles.manageMealDate}>
                        Logged {formatLoggedDate(meal.logged_at)}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.editButton}
                      disabled={saving}
                      onPress={() => openEditMeal(meal)}
                    >
                      <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          ) : null}

          <View style={styles.divider} />

          <TouchableOpacity
            style={[
              styles.manageRow,
              manageMode === 'delete' && styles.deleteManageRowActive,
            ]}
            onPress={() => toggleManageMode('delete')}
          >
            <Text
              style={[
                styles.manageText,
                styles.deleteManageText,
                manageMode === 'delete' && styles.deleteManageTextActive,
              ]}
            >
              Delete Logged Food
            </Text>

            <Text
              style={[
                styles.trash,
                manageMode === 'delete' && styles.trashActive,
              ]}
            >
              {manageMode === 'delete' ? '⌃' : '›'}
            </Text>
          </TouchableOpacity>

          {manageMode === 'delete' ? (
            <View style={styles.manageList}>
              <Text style={styles.manageListHint}>
                Deleted foods cannot be restored.
              </Text>

              {meals.length === 0 ? (
                <Text style={styles.manageEmptyText}>
                  No logged foods available to delete.
                </Text>
              ) : (
                meals.map((meal) => (
                  <View key={meal.id} style={styles.manageMealRow}>
                    <View style={styles.manageMealInfo}>
                      <Text style={styles.manageMealName}>
                        {meal.food_name}
                      </Text>

                      <Text style={styles.manageMealMeta}>
                        {formatMealType(meal.meal_type)} ·{' '}
                        {Number(meal.calories ?? 0)} kcal
                      </Text>

                      <Text style={styles.manageMealDate}>
                        Logged {formatLoggedDate(meal.logged_at)}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.manageDeleteButton}
                      disabled={saving}
                      onPress={() => confirmDeleteMeal(meal)}
                    >
                      <Text style={styles.manageDeleteText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          ) : null}
        </View>
      </ScrollView>

      <Modal
        visible={editingMeal !== null}
        transparent
        animationType="slide"
        onRequestClose={closeEditModal}
      >
        <KeyboardAvoidingView
          style={styles.modalKeyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.editModal}>
              <View style={styles.editModalHeader}>
                <Text style={styles.editModalTitle}>Edit Logged Food</Text>

                <TouchableOpacity
                  style={styles.closeModalButton}
                  disabled={saving}
                  onPress={closeEditModal}
                >
                  <Text style={styles.closeModalText}>×</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <Text style={styles.editFieldLabel}>Food name</Text>

                <TextInput
                  style={styles.editInput}
                  value={editFoodName}
                  onChangeText={setEditFoodName}
                  placeholder="Food name"
                  placeholderTextColor="#8D8A9A"
                />

                <Text style={styles.editFieldLabel}>Meal type</Text>

                <View style={styles.mealTypeButtons}>
                  {MEAL_TYPES.map((mealType) => {
                    const isSelected = editMealType === mealType

                    return (
                      <TouchableOpacity
                        key={mealType}
                        style={[
                          styles.mealTypeButton,
                          isSelected && styles.mealTypeButtonActive,
                        ]}
                        disabled={saving}
                        onPress={() => setEditMealType(mealType)}
                      >
                        <Text
                          style={[
                            styles.mealTypeButtonText,
                            isSelected &&
                              styles.mealTypeButtonTextActive,
                          ]}
                        >
                          {mealType}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>

                <Text style={styles.editFieldLabel}>Calories</Text>

                <TextInput
                  style={styles.editInput}
                  value={editCalories}
                  onChangeText={setEditCalories}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor="#8D8A9A"
                />

                <Text style={styles.editFieldLabel}>Protein (g)</Text>

                <TextInput
                  style={styles.editInput}
                  value={editProtein}
                  onChangeText={setEditProtein}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor="#8D8A9A"
                />

                <Text style={styles.editFieldLabel}>Carbs (g)</Text>

                <TextInput
                  style={styles.editInput}
                  value={editCarbs}
                  onChangeText={setEditCarbs}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor="#8D8A9A"
                />

                <Text style={styles.editFieldLabel}>Fat (g)</Text>

                <TextInput
                  style={styles.editInput}
                  value={editFat}
                  onChangeText={setEditFat}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor="#8D8A9A"
                />

                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    saving && styles.saveButtonDisabled,
                  ]}
                  disabled={saving}
                  onPress={() => void handleUpdateMeal()}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
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
    backgroundColor: '#FFFFFF',
    borderColor: '#E2ECE6',
    borderRadius: 14,
    borderWidth: 1,
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

  mealDate: {
    color: '#7C8F83',
    fontSize: 11,
    marginTop: 6,
  },

  manageCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2ECE6',
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
    overflow: 'hidden',
  },

  manageRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },

  manageRowActive: {
    backgroundColor: '#EAF3EC',
  },

  deleteManageRowActive: {
    backgroundColor: '#FDECEC',
  },

  manageText: {
    color: '#16281D',
    fontSize: 14,
    fontWeight: '700',
  },

  manageTextActive: {
    color: '#1E5C35',
    fontWeight: '800',
  },

  deleteManageText: {
    color: '#B3261E',
  },

  deleteManageTextActive: {
    color: '#B3261E',
    fontWeight: '800',
  },

  chevron: {
    color: '#1E5C35',
    fontSize: 27,
    fontWeight: '300',
  },

  chevronActive: {
    fontSize: 20,
    fontWeight: '800',
  },

  trash: {
    color: '#B3261E',
    fontSize: 27,
  },

  trashActive: {
    fontSize: 20,
    fontWeight: '800',
  },

  divider: {
    backgroundColor: '#E2ECE6',
    height: 1,
  },

  manageList: {
    backgroundColor: '#F8FBF9',
    borderTopColor: '#E2ECE6',
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },

  manageListHint: {
    color: '#7C8F83',
    fontSize: 12,
    marginBottom: 8,
  },

  manageEmptyText: {
    color: '#7C8F83',
    fontSize: 13,
    paddingVertical: 10,
  },

  manageMealRow: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2ECE6',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 8,
    padding: 12,
  },

  manageMealInfo: {
    flex: 1,
    paddingRight: 8,
  },

  manageMealName: {
    color: '#16281D',
    fontSize: 13,
    fontWeight: '800',
  },

  manageMealMeta: {
    color: '#1E5C35',
    fontSize: 11.5,
    fontWeight: '700',
    marginTop: 4,
  },

  manageMealDate: {
    color: '#7C8F83',
    fontSize: 11,
    marginTop: 4,
  },

  editButton: {
    alignItems: 'center',
    backgroundColor: '#EAF3EC',
    borderRadius: 9,
    justifyContent: 'center',
    minWidth: 58,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },

  editButtonText: {
    color: '#1E5C35',
    fontSize: 12,
    fontWeight: '800',
  },

  manageDeleteButton: {
    alignItems: 'center',
    backgroundColor: '#FDE3E3',
    borderRadius: 9,
    justifyContent: 'center',
    minWidth: 62,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },

  manageDeleteText: {
    color: '#B3261E',
    fontSize: 12,
    fontWeight: '800',
  },

  modalKeyboardAvoidingView: {
    flex: 1,
  },

  modalBackdrop: {
    backgroundColor: 'rgba(22, 40, 29, 0.45)',
    flex: 1,
    justifyContent: 'flex-end',
  },

  editModal: {
    backgroundColor: '#F5FAF6',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: '90%',
    paddingBottom: 32,
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  editModalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  editModalTitle: {
    color: '#16281D',
    fontSize: 20,
    fontWeight: '800',
  },

  closeModalButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },

  closeModalText: {
    color: '#1E5C35',
    fontSize: 30,
    fontWeight: '300',
    lineHeight: 34,
  },

  editFieldLabel: {
    color: '#16281D',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 7,
    marginTop: 12,
  },

  editInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#C9DBD0',
    borderRadius: 12,
    borderWidth: 1,
    color: '#16281D',
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },

  mealTypeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  mealTypeButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#C9DBD0',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },

  mealTypeButtonActive: {
    backgroundColor: '#1E5C35',
    borderColor: '#1E5C35',
  },

  mealTypeButtonText: {
    color: '#1E5C35',
    fontSize: 12,
    fontWeight: '800',
  },

  mealTypeButtonTextActive: {
    color: '#FFFFFF',
  },

  saveButton: {
    alignItems: 'center',
    backgroundColor: '#1E5C35',
    borderRadius: 12,
    justifyContent: 'center',
    marginTop: 24,
    minHeight: 52,
  },

  saveButtonDisabled: {
    opacity: 0.7,
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  historyLimitText: {
  color: '#7C8F83',
  fontSize: 12,
  lineHeight: 18,
  marginTop: 2,
  textAlign: 'center',
},
}) 