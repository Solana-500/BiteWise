import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import type { MainTabParamList } from '../types/navigation'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../services/supabase'

type Props = BottomTabScreenProps<MainTabParamList, 'Reports'>

export default function ReportsScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true)
  const [mealCount, setMealCount] = useState(0)
  const [calories, setCalories] = useState(0)
  const [protein, setProtein] = useState(0)

  const loadReport = useCallback(async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setLoading(false)
      return
    }

    const startOfWeek = new Date()
    startOfWeek.setDate(startOfWeek.getDate() - 6)
    startOfWeek.setHours(0, 0, 0, 0)

    const { data, error } = await supabase
      .from('food_logs')
      .select('calories, protein_g')
      .eq('user_id', user.id)
      .gte('logged_at', startOfWeek.toISOString())

    if (error) {
      Alert.alert('Report error', error.message)
      setLoading(false)
      return
    }

    const meals = data ?? []

    setMealCount(meals.length)
    setCalories(
      meals.reduce((total, meal) => total + Number(meal.calories), 0)
    )
    setProtein(
      meals.reduce((total, meal) => total + Number(meal.protein_g), 0)
    )
    setLoading(false)
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadReport()
    }, [loadReport])
  )

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#1E5C35" />
      </View>
    )
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity
        style={styles.backHomeButton}
        onPress={() => navigation.navigate('Home')}
    >
  <Text style={styles.backHomeText}>‹ Home</Text>
</TouchableOpacity>
      <Text style={styles.title}>Nutrition Report</Text>
      <Text style={styles.subtitle}>Last 7 days</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Meals logged</Text>
        <Text style={styles.value}>{mealCount}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Calories logged</Text>
        <Text style={styles.value}>{calories} kcal</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Protein logged</Text>
        <Text style={styles.value}>{protein} g</Text>
      </View>
    </ScrollView>

    

  )
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  container: {
    backgroundColor: '#F5FAF6',
    flexGrow: 1,
    padding: 24,
    paddingTop: 60,
  },
  title: {
    color: '#16281D',
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: '#5C7267',
    fontSize: 15,
    marginTop: 7,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DCE9E0',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 18,
    padding: 20,
  },
  label: {
    color: '#5C7267',
    fontSize: 14,
    fontWeight: '700',
  },
  value: {
    color: '#1E5C35',
    fontSize: 27,
    fontWeight: '800',
    marginTop: 8,
  },
  backHomeButton: {
  alignSelf: 'flex-start',
  paddingVertical: 8,
  paddingRight: 14,
  marginBottom: 8,
},
backHomeText: {
  color: '#1E5C35',
  fontSize: 15,
  fontWeight: '800',
},
})