import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
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

import { supabase } from '../services/supabase'
import type { MainTabParamList } from '../types/navigation'

type WellnessNavigationProp = BottomTabNavigationProp<
  MainTabParamList,
  'Wellness'
>

type WaterLog = {
  id: string
  amount_ml: number | null
  logged_at: string
}

const DAILY_WATER_TARGET = 2500
const WATER_STEP = 500

function getSafeAmount(value: string) {
  const parsedValue = Number(value)

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return 0
  }

  return Math.round(parsedValue)
}

function getTodayRange() {
  const now = new Date()

  const startOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  )

  const startOfTomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1
  )

  return {
    startOfDay: startOfDay.toISOString(),
    startOfTomorrow: startOfTomorrow.toISOString(),
  }
}

export default function WellnessScreen() {
  const navigation = useNavigation<WellnessNavigationProp>()

  const [waterToday, setWaterToday] = useState(0)
  const [amountInput, setAmountInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const loadWaterToday = useCallback(async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        throw userError
      }

      if (!user) {
        setWaterToday(0)
        Alert.alert('Login required', 'Please log in again.')
        return
      }

      const { startOfDay, startOfTomorrow } = getTodayRange()

      const { data, error } = await supabase
        .from('water_logs')
        .select('id, amount_ml, logged_at')
        .eq('user_id', user.id)
        .gte('logged_at', startOfDay)
        .lt('logged_at', startOfTomorrow)
        .order('logged_at', { ascending: false })

      if (error) {
        throw error
      }

      const totalWater = (data ?? []).reduce(
        (total, log) => total + Number(log.amount_ml ?? 0),
        0
      )

      setWaterToday(Math.max(totalWater, 0))
    } catch (error: any) {
      console.error('Load water error:', error)

      Alert.alert(
        'Water error',
        error?.message || 'Unable to load today’s water intake.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      void loadWaterToday()
    }, [loadWaterToday])
  )

  async function saveWater() {
    const amount = getSafeAmount(amountInput)

    if (amount <= 0) {
      Alert.alert(
        'Enter an amount',
        'Enter a water amount greater than 0 ml before saving.'
      )
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

      const { error } = await supabase.from('water_logs').insert({
        user_id: user.id,
        amount_ml: amount,
      })

      if (error) {
        throw error
      }

      setAmountInput('')
      await loadWaterToday()

      Alert.alert(
        'Water logged',
        `${amount.toLocaleString()} ml was added to today’s water intake.`
      )
    } catch (error: any) {
      console.error('Save water error:', error)

      Alert.alert(
        'Could not save water',
        error?.message || 'Unable to save your water intake.'
      )
    } finally {
      setSaving(false)
    }
  }

  async function addWaterInstantly() {
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

      const { error } = await supabase.from('water_logs').insert({
        user_id: user.id,
        amount_ml: WATER_STEP,
      })

      if (error) {
        throw error
      }

      await loadWaterToday()
    } catch (error: any) {
      console.error('Instant add water error:', error)

      Alert.alert(
        'Could not add water',
        error?.message || 'Unable to add water intake.'
      )
    } finally {
      setSaving(false)
    }
  }

  async function removeWaterInstantly() {
    if (waterToday <= 0) {
      Alert.alert('No water to remove', 'Your water intake is already 0 ml.')
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

      const { startOfDay, startOfTomorrow } = getTodayRange()

      const { data, error: loadError } = await supabase
        .from('water_logs')
        .select('id, amount_ml, logged_at')
        .eq('user_id', user.id)
        .gte('logged_at', startOfDay)
        .lt('logged_at', startOfTomorrow)
        .order('logged_at', { ascending: false })

      if (loadError) {
        throw loadError
      }

      const todayLogs = (data ?? []) as WaterLog[]

      if (todayLogs.length === 0) {
        setWaterToday(0)
        return
      }

      let remainingToRemove = Math.min(WATER_STEP, waterToday)

      for (const log of todayLogs) {
        if (remainingToRemove <= 0) {
          break
        }

        const loggedAmount = Number(log.amount_ml ?? 0)

        if (!Number.isFinite(loggedAmount) || loggedAmount <= 0) {
          continue
        }

        if (loggedAmount <= remainingToRemove) {
          const { error: deleteError } = await supabase
            .from('water_logs')
            .delete()
            .eq('id', log.id)
            .eq('user_id', user.id)

          if (deleteError) {
            throw deleteError
          }

          remainingToRemove -= loggedAmount
        } else {
          const { error: updateError } = await supabase
            .from('water_logs')
            .update({
              amount_ml: loggedAmount - remainingToRemove,
            })
            .eq('id', log.id)
            .eq('user_id', user.id)

          if (updateError) {
            throw updateError
          }

          remainingToRemove = 0
        }
      }

      await loadWaterToday()
    } catch (error: any) {
      console.error('Instant remove water error:', error)

      Alert.alert(
        'Could not remove water',
        error?.message || 'Unable to remove water intake.'
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleRefresh() {
    setRefreshing(true)
    await loadWaterToday()
    setRefreshing(false)
  }

  const waterProgress = Math.min(
    waterToday / DAILY_WATER_TARGET,
    1
  )

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E5C35" />
      </View>
    )
  }

  return (
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
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backHomeButton}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.backHomeText}>‹ Home</Text>
        </TouchableOpacity>

        <Text style={styles.topBarTitle}>Wellness</Text>

        <TouchableOpacity
          style={[
            styles.saveTopButton,
            saving && styles.saveTopButtonDisabled,
          ]}
          disabled={saving}
          onPress={() => void saveWater()}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveTopButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>Log Water Intake</Text>

      <Text style={styles.screenSubtitle}>
        Keep your hydration habits on track.
      </Text>

      <View style={styles.card}>
        <View style={styles.waterIconCircle}>
          <Text style={styles.waterIcon}>💧</Text>
        </View>

        <Text style={styles.cardTitle}>Today&apos;s Water</Text>

        <Text style={styles.amount}>
          {waterToday.toLocaleString()} ml
        </Text>

        <Text style={styles.subtitle}>
          Daily target: {DAILY_WATER_TARGET.toLocaleString()} ml
        </Text>

        <View style={styles.progressBackground}>
          <View
            style={[
              styles.progressFill,
              { width: `${waterProgress * 100}%` },
            ]}
          />
        </View>

        <Text style={styles.progressText}>
          {Math.round(waterProgress * 100)}% of your daily goal
        </Text>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.amountInput}
            value={amountInput}
            onChangeText={setAmountInput}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor="#97A89D"
            returnKeyType="done"
            maxLength={5}
          />

          <Text style={styles.unitText}>ml</Text>
        </View>

        <View style={styles.row}>
          <TouchableOpacity
            style={[
              styles.waterButton,
              styles.removeButton,
              saving && styles.waterButtonDisabled,
            ]}
            disabled={saving}
            onPress={() => void removeWaterInstantly()}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#1E5C35" />
            ) : (
              <Text style={styles.removeButtonText}>−500 ml</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.waterButton,
              styles.addButton,
              saving && styles.waterButtonDisabled,
            ]}
            disabled={saving}
            onPress={() => void addWaterInstantly()}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.addButtonText}>+500 ml</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.inputHint}>
          Enter an amount or use the buttons, then tap Save.
        </Text>
      </View>

      <View style={styles.exerciseCard}>
        <Text style={styles.exerciseIcon}>🏃</Text>

        <Text style={styles.cardTitle}>Log Exercise</Text>

        <Text style={styles.subtitle}>
          Exercise logging will be added after the core nutrition tracker.
        </Text>
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
    paddingTop: 24,
  },

  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  backHomeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
    paddingVertical: 8,
  },

  backHomeText: {
    color: '#1E5C35',
    fontSize: 15,
    fontWeight: '800',
  },

  topBarTitle: {
    color: '#16281D',
    fontSize: 18,
    fontWeight: '800',
  },

  saveTopButton: {
    alignItems: 'center',
    backgroundColor: '#1E5C35',
    borderRadius: 999,
    justifyContent: 'center',
    minHeight: 38,
    minWidth: 72,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },

  saveTopButtonDisabled: {
    opacity: 0.7,
  },

  saveTopButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  title: {
    color: '#16281D',
    fontSize: 26,
    fontWeight: '800',
    marginTop: 24,
    textAlign: 'center',
  },

  screenSubtitle: {
    color: '#5C7267',
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
  },

  card: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#DCE9E0',
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 24,
    padding: 20,
  },

  waterIconCircle: {
    alignItems: 'center',
    backgroundColor: '#D9ECDF',
    borderRadius: 44,
    height: 88,
    justifyContent: 'center',
    width: 88,
  },

  waterIcon: {
    fontSize: 46,
  },

  cardTitle: {
    color: '#16281D',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 14,
  },

  amount: {
    color: '#1E5C35',
    fontSize: 34,
    fontWeight: '800',
    marginTop: 8,
  },

  subtitle: {
    color: '#5C7267',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
    textAlign: 'center',
  },

  progressBackground: {
    backgroundColor: '#E2ECE6',
    borderRadius: 999,
    height: 10,
    marginTop: 18,
    overflow: 'hidden',
    width: '100%',
  },

  progressFill: {
    backgroundColor: '#1E5C35',
    borderRadius: 999,
    height: '100%',
  },

  progressText: {
    color: '#708277',
    fontSize: 12,
    marginTop: 7,
  },

  inputRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },

  amountInput: {
    backgroundColor: '#F8FBF9',
    borderColor: '#1E5C35',
    borderRadius: 12,
    borderWidth: 1.5,
    color: '#16281D',
    fontSize: 26,
    fontWeight: '800',
    minWidth: 170,
    paddingHorizontal: 16,
    paddingVertical: 14,
    textAlign: 'center',
  },

  unitText: {
    color: '#1E5C35',
    fontSize: 20,
    fontWeight: '800',
    marginLeft: 10,
  },

  row: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    width: '100%',
  },

  waterButton: {
    alignItems: 'center',
    borderRadius: 12,
    flex: 1,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 10,
  },

  waterButtonDisabled: {
    opacity: 0.7,
  },

  addButton: {
    backgroundColor: '#1E5C35',
  },

  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  removeButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#1E5C35',
    borderWidth: 1.5,
  },

  removeButtonText: {
    color: '#1E5C35',
    fontSize: 14,
    fontWeight: '800',
  },

  inputHint: {
    color: '#708277',
    fontSize: 12,
    marginTop: 14,
    textAlign: 'center',
  },

  exerciseCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#DCE9E0',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 18,
    padding: 20,
  },

  exerciseIcon: {
    fontSize: 34,
  },
})