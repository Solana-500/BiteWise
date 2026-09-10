import { useState } from 'react'
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { supabase } from '../services/supabase'

export default function WellnessScreen() {
  const [waterToday, setWaterToday] = useState(0)

  async function addWater(amount: number) {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      Alert.alert('Login required', 'Please log in again.')
      return
    }

    const { error } = await supabase.from('water_logs').insert({
      user_id: user.id,
      amount_ml: amount,
    })

    if (error) {
      Alert.alert('Could not save water', error.message)
      return
    }

    setWaterToday((value) => value + amount)
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Activity & Wellness</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Water Intake</Text>
        <Text style={styles.amount}>{waterToday} ml</Text>
        <Text style={styles.subtitle}>Daily target: 2,500 ml</Text>

        <View style={styles.row}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => addWater(250)}
          >
            <Text style={styles.buttonText}>+250 ml</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={() => addWater(500)}
          >
            <Text style={styles.buttonText}>+500 ml</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Exercise</Text>
        <Text style={styles.subtitle}>
          Exercise logging will be added after the core nutrition tracker.
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F5FAF6',
    flex: 1,
    padding: 24,
    paddingTop: 60,
  },
  title: {
    color: '#16281D',
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DCE9E0',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 24,
    padding: 20,
  },
  cardTitle: {
    color: '#16281D',
    fontSize: 18,
    fontWeight: '800',
  },
  amount: {
    color: '#1E5C35',
    fontSize: 32,
    fontWeight: '800',
    marginTop: 12,
  },
  subtitle: {
    color: '#5C7267',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  button: {
    backgroundColor: '#1E5C35',
    borderRadius: 10,
    flex: 1,
    paddingVertical: 13,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    textAlign: 'center',
  },
})