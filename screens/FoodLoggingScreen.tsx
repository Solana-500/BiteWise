import { useCallback, useEffect, useState } from 'react'
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
import { CameraView, useCameraPermissions } from 'expo-camera'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import { supabase } from '../services/supabase'
import type { RootStackParamList } from '../types/navigation'

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'FoodLogging'
>

type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'

type FoodResult = {
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  serving: string
}

type FoodLog = {
  id: string
  food_name: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  meal_type: string
  created_at: string
}

type ManageMode = 'edit' | 'delete' | null

type UsdaNutrient = {
  nutrientName?: string
  value?: number
  unitName?: string
}

type UsdaFood = {
  fdcId: number
  description: string
  brandOwner?: string
  servingSize?: number
  servingSizeUnit?: string
  foodNutrients?: UsdaNutrient[]
}

const MEAL_TYPES: MealType[] = [
  'Breakfast',
  'Lunch',
  'Dinner',
  'Snack',
]

function getNutrientValue(
  nutrients: UsdaNutrient[] | undefined,
  nutrientName: string
) {
  const nutrient = nutrients?.find(
    (item) =>
      item.nutrientName?.toLowerCase() === nutrientName.toLowerCase()
  )

  return Number(nutrient?.value ?? 0)
}

export default function FoodLoggingScreen() {
  const navigation = useNavigation<NavigationProp>()

  const [searchText, setSearchText] = useState('')
  const [selectedFood, setSelectedFood] = useState<FoodResult | null>(null)
  const [showScanner, setShowScanner] = useState(false)
  const [scanned, setScanned] = useState(false)
  const [saving, setSaving] = useState(false)
  const [permission, requestPermission] = useCameraPermissions()

  const [selectedMeal, setSelectedMeal] = useState<MealType>('Breakfast')
  const [showMealMenu, setShowMealMenu] = useState(false)

  const [foodResults, setFoodResults] = useState<FoodResult[]>([])
  const [searchingFoods, setSearchingFoods] = useState(false)
  const [searchError, setSearchError] = useState('')

  const searchFoods = useCallback(async (query: string) => {
    const cleanedQuery = query.trim()

    if (cleanedQuery.length < 2) {
      setFoodResults([])
      setSearchError('')
      setSearchingFoods(false)
      return
    }

    const apiKey = process.env.EXPO_PUBLIC_USDA_API_KEY

    if (!apiKey) {
      setSearchError(
        'USDA API key is missing. Check your .env file and restart Expo.'
      )
      setFoodResults([])
      setSearchingFoods(false)
      return
    }

    try {
      setSearchingFoods(true)
      setSearchError('')

      const url =
        'https://api.nal.usda.gov/fdc/v1/foods/search?' +
        `api_key=${encodeURIComponent(apiKey)}` +
        `&query=${encodeURIComponent(cleanedQuery)}` +
        '&pageSize=10'

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(
          `Food search failed. USDA returned status ${response.status}.`
        )
      }

      const data = await response.json()

      const mappedFoods: FoodResult[] = (data.foods ?? []).map(
        (food: UsdaFood) => {
          const nutrients = food.foodNutrients ?? []

          const serving =
            food.servingSize && food.servingSizeUnit
              ? `${food.servingSize} ${food.servingSizeUnit}`
              : food.brandOwner
                ? `${food.brandOwner} product`
                : '100 g'

          return {
            name: food.description || 'Unnamed food',
            calories: Math.round(getNutrientValue(nutrients, 'Energy')),
            protein: Number(
              getNutrientValue(nutrients, 'Protein').toFixed(1)
            ),
            carbs: Number(
              getNutrientValue(
                nutrients,
                'Carbohydrate, by difference'
              ).toFixed(1)
            ),
            fat: Number(
              getNutrientValue(
                nutrients,
                'Total lipid (fat)'
              ).toFixed(1)
            ),
            serving,
          }
        }
      )

      setFoodResults(mappedFoods)
    } catch (error: any) {
      console.error('USDA food search error:', error)

      setSearchError(
        error?.message || 'Unable to search foods. Please try again.'
      )
      setFoodResults([])
    } finally {
      setSearchingFoods(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      void searchFoods(searchText)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchText, searchFoods])

  const saveFood = useCallback(
    async (food: FoodResult) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        Alert.alert('Login required', 'Please log in again.')
        return
      }

      try {
        setSaving(true)

        const { error } = await supabase.from('food_logs').insert({
          user_id: user.id,
          food_name: food.name,
          calories: food.calories,
          protein_g: food.protein,
          carbs_g: food.carbs,
          fat_g: food.fat,
          meal_type: selectedMeal.toLowerCase(),
        })

        if (error) {
          Alert.alert('Could not save food', error.message)
          return
        }

        Alert.alert(
          'Food logged',
          `${food.name} was added to your ${selectedMeal.toLowerCase()}.`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        )
      } catch (error: any) {
        console.error('Food logging error:', error)

        Alert.alert(
          'Could not save food',
          error?.message || 'Unable to save food. Please try again.'
        )
      } finally {
        setSaving(false)
      }
    },
    [navigation, selectedMeal]
  )

  async function openScanner() {
    if (!permission?.granted) {
      const result = await requestPermission()

      if (!result.granted) {
        Alert.alert(
          'Camera permission needed',
          'Allow BiteWise to use your camera to scan food barcodes.'
        )
        return
      }
    }

    setScanned(false)
    setShowScanner(true)
  }

  function handleBarcodeScanned({ data }: { data: string }) {
    if (scanned) return

    setScanned(true)

    // Demo result. Replace with Open Food Facts barcode lookup later.
    const demoFood: FoodResult = {
      name: 'Scanned Chicken Breast',
      calories: 284,
      protein: 53,
      carbs: 0,
      fat: 6.2,
      serving: '1 serving',
    }

    setShowScanner(false)
    setSelectedFood(demoFood)

    Alert.alert('Barcode detected', `Code: ${data}`)
  }

  function chooseMeal(meal: MealType) {
    setSelectedMeal(meal)
    setShowMealMenu(false)
  }

  function handleClose() {
    if (selectedFood) {
      setSelectedFood(null)
      return
    }

    navigation.goBack()
  }

  if (showScanner) {
    return (
      <View style={styles.scannerScreen}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'],
          }}
          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        />

        <View style={styles.scannerControls} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.cameraBackButton}
            onPress={() => {
              setShowScanner(false)
              setScanned(false)
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.cameraBackArrow}>‹</Text>
            <Text style={styles.cameraBackText}>Food Diary</Text>
          </TouchableOpacity>

          <View style={styles.scannerCenter} pointerEvents="none">
            <View style={styles.scanFrame} />

            <Text style={styles.scannerTitle}>Scan a food barcode</Text>

            <Text style={styles.scannerHint}>
              Place the barcode inside the frame
            </Text>
          </View>
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.keyboardScreen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
            >
              <Text style={styles.closeText}>×</Text>
            </TouchableOpacity>

            <Text style={styles.pageTitle}>Log Food</Text>

            <View style={styles.topSpacer} />
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.mealDropdownButton,
              pressed && styles.mealDropdownPressed,
            ]}
            onPress={() => setShowMealMenu(true)}
          >
            <Text style={styles.mealDropdownText}>{selectedMeal}</Text>

            <View style={styles.arrowCircle}>
              <Text style={styles.dropdownArrow}>⌄</Text>
            </View>
          </Pressable>

          <View style={styles.searchRow}>
            <Text style={styles.searchIcon}>⌕</Text>

            <TextInput
              style={styles.searchInput}
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search foods, brands, flavors..."
              placeholderTextColor="#8D8A9A"
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
            />

            {searchText.length > 0 ? (
              <TouchableOpacity
                onPress={() => {
                  setSearchText('')
                  setFoodResults([])
                  setSearchError('')
                }}
              >
                <Text style={styles.clearText}>×</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.tabsRow}>
            <Text style={styles.activeTab}>All</Text>
            <Text style={styles.inactiveTab}>My Meals</Text>
            <Text style={styles.inactiveTab}>My Recipes</Text>
            <Text style={styles.inactiveTab}>My Foods</Text>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={openScanner}
            >
              <Text style={styles.actionIcon}>▣</Text>
              <Text style={styles.actionText}>Barcode scan</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => setSelectedFood(null)}
            >
              <Text style={styles.actionIcon}>⊕</Text>
              <Text style={styles.actionText}>Quick add</Text>
            </TouchableOpacity>
          </View>

          {selectedFood ? (
            <View style={styles.selectedCard}>
              <Text style={styles.selectedLabel}>
                Selected food · {selectedMeal}
              </Text>

              <Text style={styles.selectedName}>{selectedFood.name}</Text>

              <Text style={styles.selectedDetails}>
                {selectedFood.calories} cal · {selectedFood.serving}
              </Text>

              <Text style={styles.selectedMacros}>
                P {selectedFood.protein}g · C {selectedFood.carbs}g · F{' '}
                {selectedFood.fat}g
              </Text>

              <TouchableOpacity
                style={[
                  styles.addButton,
                  saving && styles.disabledAddButton,
                ]}
                disabled={saving}
                onPress={() => saveFood(selectedFood)}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.addButtonText}>
                    Add to {selectedMeal}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Search results</Text>

              {searchingFoods ? (
                <View style={styles.loadingResults}>
                  <ActivityIndicator size="small" color="#1E5C35" />
                  <Text style={styles.loadingResultsText}>
                    Searching foods...
                  </Text>
                </View>
              ) : searchError ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>{searchError}</Text>
                </View>
              ) : searchText.trim().length < 2 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>
                    Type at least 2 letters to search foods.
                  </Text>
                </View>
              ) : foodResults.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>
                    No matching foods found.
                  </Text>
                </View>
              ) : (
                foodResults.map((food, index) => (
                  <TouchableOpacity
                    key={`${food.name}-${food.serving}-${index}`}
                    style={styles.foodCard}
                    onPress={() => setSelectedFood(food)}
                  >
                    <View style={styles.foodInfo}>
                      <Text style={styles.foodName}>{food.name}</Text>

                      <Text style={styles.foodDetails}>
                        {food.calories} cal, {food.serving}
                      </Text>
                    </View>

                    <View style={styles.plusButton}>
                      <Text style={styles.plusButtonText}>+</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showMealMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMealMenu(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowMealMenu(false)}
        >
          <Pressable
            style={styles.mealMenu}
            onPress={(event) => event.stopPropagation()}
          >
            <Text style={styles.mealMenuTitle}>Select meal</Text>

            {MEAL_TYPES.map((meal) => {
              const isSelected = meal === selectedMeal

              return (
                <Pressable
                  key={meal}
                  style={({ pressed }) => [
                    styles.mealOption,
                    isSelected && styles.mealOptionSelected,
                    pressed && styles.mealOptionPressed,
                  ]}
                  onPress={() => chooseMeal(meal)}
                >
                  <Text
                    style={[
                      styles.mealOptionText,
                      isSelected && styles.mealOptionTextSelected,
                    ]}
                  >
                    {meal}
                  </Text>

                  {isSelected ? (
                    <Text style={styles.selectedCheck}>✓</Text>
                  ) : null}
                </Pressable>
              )
            })}

            <Pressable
              style={styles.cancelMealButton}
              onPress={() => setShowMealMenu(false)}
            >
              <Text style={styles.cancelMealText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  keyboardScreen: {
    flex: 1,
  },

  screen: {
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
    paddingTop: 8,
  },

  closeButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#C9DBD0',
    borderRadius: 27,
    borderWidth: 1,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },

  closeText: {
    color: '#1E5C35',
    fontSize: 34,
    fontWeight: '300',
    lineHeight: 40,
  },

  pageTitle: {
    color: '#16281D',
    fontSize: 22,
    fontWeight: '800',
  },

  topSpacer: {
    height: 54,
    width: 54,
  },

  mealDropdownButton: {
    alignSelf: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    minWidth: 210,
    marginTop: 22,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: '#EAF3EC',
    borderWidth: 1,
    borderColor: '#C9DBD0',
  },

  mealDropdownPressed: {
    opacity: 0.78,
  },

  mealDropdownText: {
    color: '#1E5C35',
    fontSize: 20,
    fontWeight: '800',
  },

  arrowCircle: {
    width: 26,
    height: 26,
    marginLeft: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: '#D8EADF',
  },

  dropdownArrow: {
    color: '#1E5C35',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 22,
    marginTop: -4,
  },

  searchRow: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#C9DBD0',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 20,
    paddingHorizontal: 14,
  },

  searchIcon: {
    color: '#5C7267',
    fontSize: 28,
    marginRight: 8,
  },

  searchInput: {
    color: '#16281D',
    flex: 1,
    fontSize: 15,
    paddingVertical: 14,
  },

  clearText: {
    color: '#5C7267',
    fontSize: 26,
  },

  tabsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 18,
    marginTop: 22,
  },

  activeTab: {
    borderBottomColor: '#1E5C35',
    borderBottomWidth: 3,
    color: '#1E5C35',
    fontSize: 15,
    fontWeight: '800',
    paddingBottom: 9,
  },

  inactiveTab: {
    color: '#708277',
    fontSize: 14,
    paddingBottom: 9,
  },

  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },

  actionCard: {
    alignItems: 'center',
    backgroundColor: '#D9ECDF',
    borderColor: '#C9DBD0',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    padding: 16,
  },

  actionIcon: {
    color: '#1E5C35',
    fontSize: 29,
    marginBottom: 7,
  },

  actionText: {
    color: '#1E5C35',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },

  sectionTitle: {
    color: '#16281D',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 12,
    marginTop: 28,
  },

  foodCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2ECE6',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 10,
    padding: 16,
  },

  foodInfo: {
    flex: 1,
  },

  foodName: {
    color: '#16281D',
    fontSize: 15,
    fontWeight: '800',
  },

  foodDetails: {
    color: '#708277',
    fontSize: 13,
    marginTop: 5,
  },

  plusButton: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 32,
    backgroundColor: '#D9ECDF',
  },

  plusButtonText: {
    color: '#1E5C35',
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 30,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
    transform: [{ translateY: 1 }],
  },

  selectedCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#1E5C35',
    borderRadius: 16,
    borderWidth: 1.5,
    marginTop: 26,
    padding: 18,
  },

  selectedLabel: {
    color: '#1E5C35',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  selectedName: {
    color: '#16281D',
    fontSize: 19,
    fontWeight: '800',
    marginTop: 8,
  },

  selectedDetails: {
    color: '#5C7267',
    fontSize: 14,
    marginTop: 6,
  },

  selectedMacros: {
    color: '#1E5C35',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 8,
  },

  addButton: {
    alignItems: 'center',
    backgroundColor: '#1E5C35',
    borderRadius: 12,
    justifyContent: 'center',
    marginTop: 16,
    minHeight: 50,
    paddingVertical: 14,
  },

  disabledAddButton: {
    opacity: 0.7,
  },

  addButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2ECE6',
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
  },

  emptyText: {
    color: '#708277',
    fontSize: 14,
  },

  loadingResults: {
    minHeight: 90,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2ECE6',
  },

  loadingResultsText: {
    marginTop: 10,
    color: '#5C7267',
    fontSize: 13,
    fontWeight: '600',
  },

  scannerScreen: {
    backgroundColor: '#000000',
    flex: 1,
    position: 'relative',
  },

  camera: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },

  scannerControls: {
    bottom: 0,
    elevation: 20,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 20,
  },

  cameraBackButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(30, 92, 53, 0.95)',
    borderColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1.5,
    elevation: 30,
    flexDirection: 'row',
    left: 18,
    paddingHorizontal: 15,
    paddingVertical: 11,
    position: 'absolute',
    top: 105,
    zIndex: 30,
  },

  cameraBackArrow: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '300',
    lineHeight: 30,
    marginRight: 5,
  },

  cameraBackText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  scannerCenter: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },

  scanFrame: {
    borderColor: '#D9ECDF',
    borderRadius: 18,
    borderWidth: 3,
    height: 190,
    width: '80%',
  },

  scannerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 24,
  },

  scannerHint: {
    color: '#E2ECE6',
    fontSize: 14,
    marginTop: 8,
  },

  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(22, 40, 29, 0.42)',
  },

  mealMenu: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 30,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: '#F5FAF6',
  },

  mealMenuTitle: {
    marginBottom: 14,
    color: '#16281D',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },

  mealOption: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 9,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2ECE6',
  },

  mealOptionSelected: {
    backgroundColor: '#EAF3EC',
    borderColor: '#1E5C35',
  },

  mealOptionPressed: {
    opacity: 0.75,
  },

  mealOptionText: {
    color: '#16281D',
    fontSize: 16,
    fontWeight: '700',
  },

  mealOptionTextSelected: {
    color: '#1E5C35',
    fontWeight: '800',
  },

  selectedCheck: {
    color: '#1E5C35',
    fontSize: 21,
    fontWeight: '900',
  },

  cancelMealButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    marginTop: 4,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#C9DBD0',
  },

  cancelMealText: {
    color: '#1E5C35',
    fontSize: 15,
    fontWeight: '800',
  },
})