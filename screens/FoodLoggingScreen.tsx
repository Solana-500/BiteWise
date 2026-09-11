import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
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
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'

import { supabase } from '../services/supabase'
import type { MainTabParamList } from '../types/navigation'

type NavigationProp = BottomTabNavigationProp<MainTabParamList, 'Meals'>

type FoodResult = {
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  serving: string
}

const SAMPLE_FOODS: FoodResult[] = [
  {
    name: 'White Rice, Cooked',
    calories: 204,
    protein: 4.3,
    carbs: 44.5,
    fat: 0.4,
    serving: '1 cup',
  },
  {
    name: 'Chicken Breast, Cooked',
    calories: 284,
    protein: 53,
    carbs: 0,
    fat: 6.2,
    serving: '1 breast',
  },
  {
    name: 'Banana',
    calories: 105,
    protein: 1.3,
    carbs: 27,
    fat: 0.4,
    serving: '1 medium',
  },
  {
    name: 'Greek Yogurt, Plain',
    calories: 130,
    protein: 17,
    carbs: 9,
    fat: 0.7,
    serving: '1 container',
  },
]

export default function FoodLoggingScreen() {
  const navigation = useNavigation<NavigationProp>()
  const [searchText, setSearchText] = useState('')
  const [selectedFood, setSelectedFood] = useState<FoodResult | null>(null)
  const [showScanner, setShowScanner] = useState(false)
  const [scanned, setScanned] = useState(false)
  const [saving, setSaving] = useState(false)
  const [permission, requestPermission] = useCameraPermissions()

  const filteredFoods = SAMPLE_FOODS.filter((food) =>
    food.name.toLowerCase().includes(searchText.toLowerCase().trim())
  )

  const saveFood = useCallback(async (food: FoodResult) => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      Alert.alert('Login required', 'Please log in again.')
      return
    }

    setSaving(true)

    const { error } = await supabase.from('food_logs').insert({
      user_id: user.id,
      food_name: food.name,
      calories: food.calories,
      protein_g: food.protein,
      carbs_g: food.carbs,
      fat_g: food.fat,
      meal_type: 'Meal',
    })

    setSaving(false)

    if (error) {
      Alert.alert('Could not save food', error.message)
      return
    }

    Alert.alert('Food logged', `${food.name} was added to your diary.`, [
      {
        text: 'OK',
        onPress: () => navigation.navigate('Meals'),
      },
    ])
  }, [navigation])

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

    // Demo barcode result. Replace this lookup with a food database API later.
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

      {/* This is outside CameraView, so it appears above the preview */}
      <View style={styles.scannerControls} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.cameraBackButton}
          onPress={() => {
            setShowScanner(false)
            setScanned(false)
            navigation.navigate('Meals')
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
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.closeText}>×</Text>
          </TouchableOpacity>

          <Text style={styles.pageTitle}>Log Food</Text>
          <View style={styles.topSpacer} />
        </View>

        <View style={styles.mealSelector}>
          <Text style={styles.mealSelectorText}>Breakfast</Text>
          <Text style={styles.downArrow}>⌄</Text>
        </View>

        <View style={styles.searchRow}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search foods, brands, flavors..."
            placeholderTextColor="#8D8A9A"
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Text style={styles.clearText}>×</Text>
            </TouchableOpacity>
          )}
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
            <Text style={styles.selectedLabel}>Selected food</Text>
            <Text style={styles.selectedName}>{selectedFood.name}</Text>
            <Text style={styles.selectedDetails}>
              {selectedFood.calories} cal · {selectedFood.serving}
            </Text>
            <Text style={styles.selectedMacros}>
              P {selectedFood.protein}g · C {selectedFood.carbs}g · F {selectedFood.fat}g
            </Text>
            <TouchableOpacity
              style={styles.addButton}
              disabled={saving}
              onPress={() => saveFood(selectedFood)}
            >
              <Text style={styles.addButtonText}>
                {saving ? 'Adding...' : 'Add to Diary'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Search results</Text>
            {filteredFoods.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No matching foods found.</Text>
              </View>
            ) : (
              filteredFoods.map((food) => (
                <TouchableOpacity
                  key={food.name}
                  style={styles.foodCard}
                  onPress={() => setSelectedFood(food)}
                >
                  <View style={styles.foodInfo}>
                    <Text style={styles.foodName}>{food.name}</Text>
                    <Text style={styles.foodDetails}>
                      {food.calories} cal, {food.serving}
                    </Text>
                  </View>
                  <Text style={styles.plusButton}>＋</Text>
                </TouchableOpacity>
              ))
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
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

  mealSelector: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 18,
  },

  mealSelectorText: {
    color: '#1E5C35',
    fontSize: 19,
    fontWeight: '800',
  },

  downArrow: {
    color: '#1E5C35',
    fontSize: 24,
    marginLeft: 8,
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
    borderRadius: 26,
    color: '#1E5C35',
    fontSize: 28,
    fontWeight: '700',
    height: 52,
    lineHeight: 48,
    textAlign: 'center',
    width: 52,
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
    marginTop: 16,
    paddingVertical: 14,
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
})
