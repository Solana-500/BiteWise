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

export default function SignUpScreen({ navigation }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignUp() {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Missing information', 'Complete all fields.')
      return
    }

    if (password.length < 6) {
      Alert.alert(
        'Password too short',
        'Your password must contain at least 6 characters.'
      )
      return
    }

    if (password !== confirmPassword) {
      Alert.alert('Password mismatch', 'The passwords do not match.')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    })

    setLoading(false)

    if (error) {
      Alert.alert('Registration failed', error.message)
      return
    }

    Alert.alert(
      'Account created',
      'Your account has been created. Check your email if confirmation is enabled.'
    )

    navigation.navigate('Login')
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create your BiteWise account</Text>

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

      <TextInput
        style={styles.input}
        placeholder="Confirm password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />

      {/* Primary Action Button */}
      {loading ? (
        <ActivityIndicator size="large" color="#1E5C35" />
      ) : (
        <TouchableOpacity style={styles.primaryButton} onPress={handleSignUp}>
          <Text style={styles.primaryButtonText}>Create account</Text>
        </TouchableOpacity>
      )}

      {/* Secondary Navigation Button */}
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.navigate('Login')}
      >
        <Text style={styles.secondaryButtonText}>Back to login</Text>
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
  title: {
    color: '#1E5C35',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 28,
    textAlign: 'center',
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