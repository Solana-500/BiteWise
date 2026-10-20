import { useCallback, useEffect, useRef, useState } from 'react'
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
import * as ImagePicker from 'expo-image-picker'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import { supabase } from '../services/supabase'
import { analyzeFoodImage } from '../services/aiFoodAnalysis'
import {
  getFoodByBarcode,
  type BarcodeFood,
} from '../services/openFoodFacts'
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

function mapBarcodeFoodToFoodResult(food: BarcodeFood): FoodResult {
  const nameWithBrand = food.brand
    ? `${food.name} (${food.brand})`
    : food.name

  return {
    name: nameWithBrand,
    calories: Math.round(food.caloriesPer100g ?? 0),
    protein: Number((food.proteinPer100g ?? 0).toFixed(1)),
    carbs: Number((food.carbsPer100g ?? 0).toFixed(1)),
    fat: Number((food.fatPer100g ?? 0).toFixed(1)),
    serving: food.servingSize
      ? `${food.servingSize} · nutrition per 100 g`
      : 'Nutrition per 100 g',
  }
}

export default function FoodLoggingScreen() {
  const navigation = useNavigation<NavigationProp>()

  const [searchText, setSearchText] = useState('')
  const [selectedFood, setSelectedFood] = useState<FoodResult | null>(null)
  const [isAiFood, setIsAiFood] = useState(false)
  const [aiFoodReviewed, setAiFoodReviewed] = useState(false)
  const [showEditFood, setShowEditFood] = useState(false)
  const [editFoodName, setEditFoodName] = useState('')
  const [editServing, setEditServing] = useState('')
  const [editCalories, setEditCalories] = useState('')
  const [editProtein, setEditProtein] = useState('')
  const [editCarbs, setEditCarbs] = useState('')
  const [editFat, setEditFat] = useState('')
  const [showScanner, setShowScanner] = useState(false)
  const [scanned, setScanned] = useState(false)
  const barcodeScanLock = useRef(false)
  const [lookingUpBarcode, setLookingUpBarcode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [permission, requestPermission] = useCameraPermissions()
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [analyzingImage, setAnalyzingImage] = useState(false)
  
async function pickFoodImage() {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.5,
      base64: false,
    })

    if (result.canceled || result.assets.length === 0) {
      return
    }

    const imageUri = result.assets[0].uri
    setSelectedImage(imageUri)
    setAnalyzingImage(true)

    
   
    const analysis = await analyzeFoodImage(imageUri)
    
    // Mark this food as AI-generated and not yet reviewed.
    setIsAiFood(true)
    setAiFoodReviewed(false)
    
    // Display the AI result in the food logging card.
        
  
    const calories = Number(editCalories)
    const protein = Number(editProtein)
    const carbs = Number(editCarbs)
    const fat = Number(editFat)
    
    setSelectedFood({
      name: editFoodName.trim(),
      serving: editServing.trim(),
      calories,
      protein,
      carbs,
      fat,
    })
    
    if (isAiFood) {
      setAiFoodReviewed(true)
    }
    
    setShowEditFood(false)

    
    // Confirm the user has reviewed the AI estimates.
    if (isAiFood) {
      setAiFoodReviewed(true)
    }
    
    setShowEditFood(false)
    
    Alert.alert(
      'Food Reviewed',
      'Your food details have been confirmed. You can now save the meal.'
    )

  } catch (error) {
    console.error('Food image analysis failed:', error)

    Alert.alert(
      'AI Analysis Failed',
      'Unable to analyze this photo. Please try again.'
    )
  } finally {
    setAnalyzingImage(false)
  }
}



  

  const [selectedMeal, setSelectedMeal] = useState<MealType>('Breakfast')
  const [showMealMenu, setShowMealMenu] = useState(false)

  const [foodResults, setFoodResults] = useState<FoodResult[]>([])
  const [searchingFoods, setSearchingFoods] = useState(false)
  const [searchError, setSearchError] = useState('')

  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [quickAddName, setQuickAddName] = useState('')
  const [quickAddCalories, setQuickAddCalories] = useState('')
  const [quickAddProtein, setQuickAddProtein] = useState('')
  const [quickAddCarbs, setQuickAddCarbs] = useState('')
  const [quickAddFat, setQuickAddFat] = useState('')
  const [quickAddSaving, setQuickAddSaving] = useState(false)

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
        if (isAiFood && !aiFoodReviewed) {
          Alert.alert(
            'Review Required',
            'Please tap Edit Food Details and confirm the nutritional estimates before saving this AI-generated meal.'
          )
          return
        }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
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
          [{ text: 'OK', onPress: () => navigation.goBack() }]
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
    [navigation, selectedMeal, isAiFood, aiFoodReviewed]
  )

  function getOptionalMacro(value: string) {
    const cleanedValue = value.trim()

    if (!cleanedValue) {
      return 0
    }

    const numberValue = Number(cleanedValue)

    return Number.isFinite(numberValue) && numberValue >= 0
      ? numberValue
      : 0
  }

function openEditFood() {
  if (!selectedFood) return

  setEditFoodName(selectedFood.name)
  setEditServing(selectedFood.serving)
  setEditCalories(String(selectedFood.calories))
  setEditProtein(String(selectedFood.protein))
  setEditCarbs(String(selectedFood.carbs))
  setEditFat(String(selectedFood.fat))

  setShowEditFood(true)
}

  function openQuickAdd() {
    setQuickAddName('')
    setQuickAddCalories('')
    setQuickAddProtein('')
    setQuickAddCarbs('')
    setQuickAddFat('')
    setShowQuickAdd(true)
  }

  async function handleQuickAdd() {
    const foodName = quickAddName.trim()
    const calories = Number(quickAddCalories)

    if (!foodName) {
      Alert.alert('Food name required', 'Enter a name for this food or meal.')
      return
    }

    if (!Number.isFinite(calories) || calories < 0) {
      Alert.alert(
        'Invalid calories',
        'Enter a valid calorie amount of zero or more.'
      )
      return
    }

    const protein = getOptionalMacro(quickAddProtein)
    const carbs = getOptionalMacro(quickAddCarbs)
    const fat = getOptionalMacro(quickAddFat)

    try {
      setQuickAddSaving(true)

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        Alert.alert('Login required', 'Please log in again.')
        return
      }

      const { error } = await supabase.from('food_logs').insert({
        user_id: user.id,
        food_name: foodName,
        calories: Math.round(calories),
        protein_g: Number(protein.toFixed(1)),
        carbs_g: Number(carbs.toFixed(1)),
        fat_g: Number(fat.toFixed(1)),
        meal_type: selectedMeal.toLowerCase(),
      })

      if (error) {
        throw error
      }

      setShowQuickAdd(false)

      Alert.alert(
        'Food logged',
        `${foodName} was added to your ${selectedMeal.toLowerCase()}.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      )
    } catch (error: any) {
      console.error('Quick add error:', error)
      Alert.alert(
        'Could not add food',
        error?.message ?? 'Please try again.'
      )
    } finally {
      setQuickAddSaving(false)
    }
  }

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

    barcodeScanLock.current = false
    setScanned(false)
    setLookingUpBarcode(false)
    setShowScanner(true)
  }

  async function handleBarcodeScanned({ data }: { data: string }) {
    if (barcodeScanLock.current) {
      return
    }

    barcodeScanLock.current = true
    setScanned(true)
    setLookingUpBarcode(true)

    try {
      console.log('Scanned barcode:', data)

      const barcodeFood = await getFoodByBarcode(data)
      const scannedFood = mapBarcodeFoodToFoodResult(barcodeFood)

      console.log('Barcode food result:', scannedFood)

      setShowScanner(false)
      setSelectedFood(scannedFood)

      Alert.alert(
        'Food found',
        `${scannedFood.name}\n\n` +
          `${scannedFood.calories} cal per 100 g\n` +
          `Protein: ${scannedFood.protein} g\n` +
          `Carbs: ${scannedFood.carbs} g\n` +
          `Fat: ${scannedFood.fat} g`,
        [{ text: 'Add food' }]
      )
    } catch (error: any) {
      console.error('Barcode lookup error:', error)

      Alert.alert(
        'Food not found',
        error?.message ??
          'This barcode could not be matched. Try searching by name.'
      )

      barcodeScanLock.current = false
      setScanned(false)
    } finally {
      setLookingUpBarcode(false)
    }
  }

  function chooseMeal(meal: MealType) {
    setSelectedMeal(meal)
    setShowMealMenu(false)
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
          onBarcodeScanned={
            scanned || lookingUpBarcode ? undefined : handleBarcodeScanned
          }
        />

        <View style={styles.scannerControls} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.cameraBackButton}
            onPress={() => {
              barcodeScanLock.current = false
              setShowScanner(false)
              setScanned(false)
              setLookingUpBarcode(false)
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

          {lookingUpBarcode ? (
            <View style={styles.barcodeLoadingOverlay}>
              <ActivityIndicator size="large" color="#FFFFFF" />
              <Text style={styles.barcodeLoadingText}>
                Looking up food details...
              </Text>
            </View>
          ) : null}
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
              style={styles.backHomeButton}
              onPress={() => navigation.goBack()}
              accessibilityRole="button"
              accessibilityLabel="Go back to Meals"
            >
              <Text style={styles.backHomeText}>‹ Meals</Text>
            </TouchableOpacity>

            <Text style={styles.pageTitle}>Log Food</Text>

            <View style={styles.topBarSpacer} />
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
              onPress={() => void openScanner()}
            >
              <Text style={styles.actionIcon}>▣</Text>
              <Text style={styles.actionText}>Barcode scan</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={openQuickAdd}
            >
              <Text style={styles.actionIcon}>⊕</Text>
              <Text style={styles.actionText}>Quick add</Text>
            </TouchableOpacity>
            
            
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => void pickFoodImage()}
              disabled={analyzingImage}
            >
              {analyzingImage ? (
                <ActivityIndicator color="#1E5C35" />
              ) : (
                <Text style={styles.actionIcon}>📷</Text>
              )}
            
              <Text style={styles.actionText}>
                {analyzingImage ? 'Analyzing...' : 'AI Photo'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() =>
                Alert.alert(
                  'AI Voice Food Logging',
                  'Voice recording will be available soon.'
                )
              }
              accessibilityRole="button"
              accessibilityLabel="Log food using voice"
            >
              <Text style={styles.actionIcon}>🎤</Text>
              <Text style={styles.actionText}>AI Voice</Text>
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
                style={styles.editFoodButton}
                onPress={openEditFood}
              >
                <Text style={styles.editFoodButtonText}>
                  Edit Food Details
                </Text>
              </TouchableOpacity>

             
              <TouchableOpacity
                style={[
                  styles.addButton,
                  saving && styles.disabledAddButton,
                ]}
                disabled={saving}
                onPress={() => void saveFood(selectedFood)}
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
                    onPress={() => {
                      setIsAiFood(false)
                      setAiFoodReviewed(false)
                      setSelectedFood(food)
                    }}
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

      <Modal
        visible={showEditFood}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditFood(false)}
      >
        <KeyboardAvoidingView
          style={styles.quickAddKeyboard}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.quickAddBackdrop}>
            <View style={styles.quickAddModal}>
              <Text style={styles.quickAddTitle}>
                Edit Food Details
              </Text>
      
              <Text style={styles.quickAddSubtitle}>
                Review and correct AI nutritional estimates
              </Text>
      
              <ScrollView keyboardShouldPersistTaps="handled">
                {[
                  { label: 'Food Name', value: editFoodName, setter: setEditFoodName },
                  { label: 'Serving Size', value: editServing, setter: setEditServing },
                  { label: 'Calories (kcal)', value: editCalories, setter: setEditCalories },
                  { label: 'Protein (g)', value: editProtein, setter: setEditProtein },
                  { label: 'Carbs (g)', value: editCarbs, setter: setEditCarbs },
                  { label: 'Fat (g)', value: editFat, setter: setEditFat },
                ].map((field, index) => (
                  <View key={field.label}>
                    <Text style={styles.quickAddLabel}>
                      {field.label}
                    </Text>
      
                    <TextInput
                      style={styles.quickAddInput}
                      value={field.value}
                      onChangeText={field.setter}
                      keyboardType={index >= 2 ? 'decimal-pad' : 'default'}
                    />
                  </View>
                ))}
      
                <TouchableOpacity
                  style={styles.quickAddSaveButton}
                  onPress={() => {
                    const calories = Number(editCalories)
                    const protein = Number(editProtein)
                    const carbs = Number(editCarbs)
                    const fat = Number(editFat)
      
                    const validNumbers = [calories, protein, carbs, fat]
                      .every(value => Number.isFinite(value) && value >= 0)
      
                    if (
                      !editFoodName.trim() ||
                      !editServing.trim() ||
                      !validNumbers ||
                      [editCalories, editProtein, editCarbs, editFat]
                        .some(value => value.trim() === '')
                    ) {
                      Alert.alert(
                        'Invalid food details',
                        'Please enter a name, serving size and valid non-negative nutritional values.'
                      )
                      return
                    }
      
                    setSelectedFood({
                      name: editFoodName.trim(),
                      serving: editServing.trim(),
                      calories,
                      protein,
                      carbs,
                      fat,
                    })
      
                    setShowEditFood(false)
                  }}
                >
                  <Text style={styles.quickAddSaveText}>
                    Save Changes
                  </Text>
                </TouchableOpacity>
      
                <TouchableOpacity
                  style={styles.cancelMealButton}
                  onPress={() => setShowEditFood(false)}
                >
                  <Text style={styles.cancelMealText}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={showQuickAdd}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!quickAddSaving) {
            setShowQuickAdd(false)
          }
        }}
      >
        <KeyboardAvoidingView
          style={styles.quickAddKeyboard}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable
            style={styles.quickAddBackdrop}
            onPress={() => {
              if (!quickAddSaving) {
                setShowQuickAdd(false)
              }
            }}
          >
            <Pressable
              style={styles.quickAddModal}
              onPress={(event) => event.stopPropagation()}
            >
              <View style={styles.quickAddHeader}>
                <View>
                  <Text style={styles.quickAddTitle}>Quick add food</Text>
                  <Text style={styles.quickAddSubtitle}>
                    Add directly to {selectedMeal}
                  </Text>
                </View>

                <TouchableOpacity
                  disabled={quickAddSaving}
                  onPress={() => setShowQuickAdd(false)}
                  style={styles.quickAddCloseButton}
                >
                  <Text style={styles.quickAddCloseText}>×</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.quickAddLabel}>Food name</Text>
                <TextInput
                  autoCapitalize="words"
                  editable={!quickAddSaving}
                  onChangeText={setQuickAddName}
                  placeholder="e.g. Chicken rice"
                  placeholderTextColor="#8D8A9A"
                  style={styles.quickAddInput}
                  value={quickAddName}
                />

                <Text style={styles.quickAddLabel}>Calories (kcal)</Text>
                <TextInput
                  editable={!quickAddSaving}
                  keyboardType="decimal-pad"
                  onChangeText={setQuickAddCalories}
                  placeholder="e.g. 650"
                  placeholderTextColor="#8D8A9A"
                  style={styles.quickAddInput}
                  value={quickAddCalories}
                />

                <Text style={styles.quickAddOptionalTitle}>
                  Macros — optional
                </Text>

                <View style={styles.quickAddMacroRow}>
                  <View style={styles.quickAddMacroField}>
                    <Text style={styles.quickAddLabel}>Protein (g)</Text>
                    <TextInput
                      editable={!quickAddSaving}
                      keyboardType="decimal-pad"
                      onChangeText={setQuickAddProtein}
                      placeholder="0"
                      placeholderTextColor="#8D8A9A"
                      style={styles.quickAddInput}
                      value={quickAddProtein}
                    />
                  </View>

                  <View style={styles.quickAddMacroField}>
                    <Text style={styles.quickAddLabel}>Carbs (g)</Text>
                    <TextInput
                      editable={!quickAddSaving}
                      keyboardType="decimal-pad"
                      onChangeText={setQuickAddCarbs}
                      placeholder="0"
                      placeholderTextColor="#8D8A9A"
                      style={styles.quickAddInput}
                      value={quickAddCarbs}
                    />
                  </View>
                </View>

                <View style={styles.quickAddMacroField}>
                  <Text style={styles.quickAddLabel}>Fat (g)</Text>
                  <TextInput
                    editable={!quickAddSaving}
                    keyboardType="decimal-pad"
                    onChangeText={setQuickAddFat}
                    placeholder="0"
                    placeholderTextColor="#8D8A9A"
                    style={styles.quickAddInput}
                    value={quickAddFat}
                  />
                </View>

                <TouchableOpacity
                  disabled={quickAddSaving}
                  onPress={() => void handleQuickAdd()}
                  style={[
                    styles.quickAddSaveButton,
                    quickAddSaving && styles.quickAddSaveButtonDisabled,
                  ]}
                >
                  {quickAddSaving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.quickAddSaveText}>
                      Add to {selectedMeal}
                    </Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
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
  pageTitle: {
    color: '#16281D',
    fontSize: 22,
    fontWeight: '800',
  },
  topBarSpacer: {
    height: 40,
    width: 72,
  },
  mealDropdownButton: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#EAF3EC',
    borderColor: '#C9DBD0',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 22,
    minWidth: 210,
    paddingHorizontal: 18,
    paddingVertical: 11,
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
    alignItems: 'center',
    backgroundColor: '#D8EADF',
    borderRadius: 13,
    height: 26,
    justifyContent: 'center',
    marginLeft: 10,
    width: 26,
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
    alignItems: 'center',
    backgroundColor: '#D9ECDF',
    borderRadius: 32,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  plusButtonText: {
    color: '#1E5C35',
    fontSize: 30,
    fontWeight: '700',
    includeFontPadding: false,
    lineHeight: 30,
    textAlign: 'center',
    textAlignVertical: 'center',
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
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2ECE6',
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 90,
  },
  loadingResultsText: {
    color: '#5C7267',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 10,
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
  barcodeLoadingOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  barcodeLoadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  modalBackdrop: {
    backgroundColor: 'rgba(22, 40, 29, 0.42)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  mealMenu: {
    backgroundColor: '#F5FAF6',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingBottom: 30,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  mealMenuTitle: {
    color: '#16281D',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 14,
    textAlign: 'center',
  },
  mealOption: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2ECE6',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 9,
    minHeight: 54,
    paddingHorizontal: 16,
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
    backgroundColor: '#FFFFFF',
    borderColor: '#C9DBD0',
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 4,
    minHeight: 52,
  },
  cancelMealText: {
    color: '#1E5C35',
    fontSize: 15,
    fontWeight: '800',
  },
  quickAddKeyboard: {
    flex: 1,
  },
  quickAddBackdrop: {
    backgroundColor: 'rgba(22, 40, 29, 0.42)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  quickAddModal: {
    backgroundColor: '#F5FAF6',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: '88%',
    paddingBottom: 32,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  quickAddHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  quickAddTitle: {
    color: '#16281D',
    fontSize: 20,
    fontWeight: '800',
  },
  quickAddSubtitle: {
    color: '#5C7267',
    fontSize: 13,
    marginTop: 4,
  },
  quickAddCloseButton: {
    alignItems: 'center',
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  quickAddCloseText: {
    color: '#1E5C35',
    fontSize: 30,
    fontWeight: '300',
    lineHeight: 34,
  },
  quickAddLabel: {
    color: '#16281D',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 7,
    marginTop: 14,
  },
  quickAddInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#C9DBD0',
    borderRadius: 12,
    borderWidth: 1,
    color: '#16281D',
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  quickAddOptionalTitle: {
    color: '#5C7267',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 20,
    textTransform: 'uppercase',
  },
  quickAddMacroRow: {
    flexDirection: 'row',
    gap: 12,
  },
  quickAddMacroField: {
    flex: 1,
  },
  quickAddSaveButton: {
    alignItems: 'center',
    backgroundColor: '#1E5C35',
    borderRadius: 12,
    justifyContent: 'center',
    marginTop: 26,
    minHeight: 52,
    paddingVertical: 14,
  },
  quickAddSaveButtonDisabled: {
    opacity: 0.7,
  },
  quickAddSaveText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  
  editFoodButton: {
    backgroundColor: '#EAF3EC',
    borderColor: '#1E5C35',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    marginTop: 16,
    alignItems: 'center',
  },
  
  editFoodButtonText: {
    color: '#1E5C35',
    fontSize: 14,
    fontWeight: '800',
},

})
