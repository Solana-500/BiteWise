
import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'

import { supabase } from '../services/supabase'

type Props = {
  onComplete: () => void
}

export default function ResetPasswordScreen({ onComplete }: Props) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleResetPassword() {
    if (password.length < 8) {
      Alert.alert(
        'Invalid password',
        'Your password must be at least 8 characters.'
      )
      return
    }

    if (password !== confirmPassword) {
      Alert.alert(
        'Passwords do not match',
        'Please enter matching passwords.'
      )
      return
    }

    try {
      setLoading(true)

      const { data: { user }, error: sessionError } =
        await supabase.auth.getUser()

      if (sessionError || !user) {
        Alert.alert(
          'Invalid recovery session',
          'Please request a new password reset link.'
        )
        return
      }

      const { error } = await supabase.auth.updateUser({
        password,
      })

      if (error) throw error

      
      const { error: signOutError } = await supabase.auth.signOut()
      
      if (signOutError) {
        throw signOutError
      }
      
      setPassword('')
      setConfirmPassword('')
      
      Alert.alert(
        'Password Updated',
        'Your password has been changed successfully. Please log in again.',
        [
          {
            text: 'OK',
            onPress: onComplete,
          },
        ]
      )

    } catch (error: any) {
      Alert.alert(
        'Password Reset Failed',
        error?.message || 'Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.title}>Reset Password</Text>

        <Text style={styles.subtitle}>
          Enter your new BiteWise password.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="New password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
          autoComplete="new-password"
        />

        <TextInput
          style={styles.input}
          placeholder="Confirm new password"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          autoCapitalize="none"
        />

        <TouchableOpacity
          style={styles.button}
          onPress={() => void handleResetPassword()}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>
              Update Password
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FAF6',
    justifyContent: 'center',
    padding: 24,
  },
  form: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E5C35',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#5C7267',
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#C9DBD0',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#1E5C35',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
})
