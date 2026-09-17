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

type Props = NativeStackScreenProps<RootStackParamList, 'SignUp'>

export default function SignUpScreen({ navigation }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignUp() {
    const cleanedEmail = email.trim().toLowerCase()

    if (!cleanedEmail || !password || !confirmPassword) {
      Alert.alert('Missing information', 'Please complete all fields.')
      return
    }

    if (password.length < 6) {
      Alert.alert(
        'Password too short',
        'Use a password with at least 6 characters.'
      )
      return
    }

    if (password !== confirmPassword) {
      Alert.alert('Password mismatch', 'The passwords do not match.')
      return
    }

    try {
      setLoading(true)

      const { data, error } = await supabase.auth.signUp({
        email: cleanedEmail,
        password,
        options: {
          data: {
            email: cleanedEmail,
          },
        },
      })

      console.log('Signup user:', data.user)
      console.log('Signup session:', data.session)
      console.log('Signup error:', error)

      if (error) {
        Alert.alert('Registration failed', error.message)
        return
      }

      if (!data.user) {
        Alert.alert(
          'Registration failed',
          'No user was created. Please try again.'
        )
        return
      }

      // This is normal when Supabase requires email confirmation.
      if (!data.session) {
        Alert.alert(
          'Verify your email',
          'Your account has been created. Open the verification email, confirm your account, then return and log in.',
          [
            {
              text: 'Go to Login',
              onPress: () => navigation.replace('Login'),
            },
          ]
        )
        return
      }

      navigation.replace('SignUp')
    } catch (error: any) {
      console.error('Signup error:', error)

      Alert.alert(
        'Registration failed',
        error?.message ?? 'Something went wrong. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>BiteWise</Text>
      <Text style={styles.title}>Create an account</Text>

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

      <TextInput
        onChangeText={setConfirmPassword}
        placeholder="Confirm password"
        placeholderTextColor="#8B9B90"
        secureTextEntry
        style={styles.input}
        value={confirmPassword}
      />

      <TouchableOpacity
        disabled={loading}
        onPress={handleSignUp}
        style={[styles.button, loading && styles.disabledButton]}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Create Account</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        disabled={loading}
        onPress={() => navigation.navigate('Login')}
        style={styles.linkButton}
      >
        <Text style={styles.linkText}>
          Already have an account? Log In
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
  title: {
    color: '#16281D',
    fontSize: 22,
    fontWeight: '700',
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