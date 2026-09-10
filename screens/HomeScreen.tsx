import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { supabase } from '../services/supabase'

export default function HomeScreen() {
  async function handleLogout() {
    const { error } = await supabase.auth.signOut()

    if (error) {
      Alert.alert('Logout failed', error.message)
      return
    }

    Alert.alert('Logged out', 'You have been logged out successfully.')
  }

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>BiteWise</Text>

      <Text style={styles.title}>You are logged in.</Text>

      <Text style={styles.subtitle}>
        Your React Native app is now connected to Supabase Auth.
      </Text>

      <TouchableOpacity style={styles.button} onPress={handleLogout}>
        <Text style={styles.buttonText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#F5FAF6',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logo: {
    color: '#1E5C35',
    fontSize: 34,
    fontWeight: '800',
    marginBottom: 18,
  },
  title: {
    color: '#16281D',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    color: '#5C7267',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 26,
    textAlign: 'center',
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#B3261E',
    borderRadius: 10,
    paddingVertical: 14,
    width: '100%',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
})