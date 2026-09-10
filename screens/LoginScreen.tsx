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
import type { NativeStackScreenProps } from '@react-navigation/native-stack'

import { supabase } from '../services/supabase'
import type { RootStackParamList } from '../types/navigation'

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>

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
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>BiteWise</Text>
      <Text style={styles.subtitle}>
        Sign in to continue your nutrition journey.
      </Text>

      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="Email"
        placeholderTextColor="#8B9B90"
        style={styles.input}
        value={email}
      />

      <TextInput
        onChangeText={setPassword}
        placeholder="Password"
        placeholderTextColor="#8B9B90"
        secureTextEntry
        style={styles.input}
        value={password}
      />

      <TouchableOpacity
        disabled={loading}
        onPress={handleLogin}
        style={[styles.button, loading && styles.disabledButton]}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Log In</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        disabled={loading}
        onPress={() => navigation.navigate('SignUp')}
        style={styles.linkButton}
      >
        <Text style={styles.linkText}>
          Don&apos;t have an account? Sign Up
        </Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F5FAF6',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logo: {
    color: '#1E5C35',
    fontSize: 34,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: '#5C7267',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 28,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#C9DBD0',
    borderRadius: 10,
    borderWidth: 1,
    color: '#16281D',
    fontSize: 16,
    marginBottom: 12,
    padding: 14,
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#1E5C35',
    borderRadius: 10,
    justifyContent: 'center',
    marginTop: 6,
    minHeight: 50,
    paddingVertical: 14,
  },
  disabledButton: {
    opacity: 0.65,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  linkButton: {
    alignItems: 'center',
    marginTop: 18,
    padding: 8,
  },
  linkText: {
    color: '#1E5C35',
    fontSize: 14,
    fontWeight: '600',
  },
})