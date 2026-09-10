import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { supabase } from '../services/supabase'

type Props = {
  navigation: any
}

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Missing information', 'Enter your email and password.')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    setLoading(false)

    if (error) {
      Alert.alert('Login failed', error.message)
      return
    }

    Alert.alert('Success', 'You are logged in.')
  }

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>BiteWise</Text>

      <Text style={styles.subtitle}>
        Sign in to your nutrition account.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {/* Main Action Button */}
      {loading ? (
        <ActivityIndicator size="large" color="#1E5C35" />
      ) : (
        <TouchableOpacity style={styles.primaryButton} onPress={handleLogin}>
          <Text style={styles.primaryButtonText}>Log in</Text>
        </TouchableOpacity>
      )}

      {/* Secondary Navigation Button */}
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.navigate('SignUp')}
      >
        <Text style={styles.secondaryButtonText}>Create an account</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  logo: {
    color: '#1E5C35',
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: '#5C7267',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 28,
  },
  input: {
    borderColor: '#C9DBD0',
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 16,
    marginBottom: 12,
    padding: 14,
  },
  primaryButton: {
    backgroundColor: '#1E5C35',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryButtonText: {
    color: '#1E5C35',
    fontSize: 15,
    fontWeight: '600',
  },
})