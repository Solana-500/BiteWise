import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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

// Replace with your allowlisted web recovery URL when web recovery is configured.
// A web URL must open a screen that handles the Supabase recovery session.

const WEB_PASSWORD_RESET_REDIRECT =
  'https://bitewise-nutrition.netlify.app/reset-password.html'

const MOBILE_PASSWORD_RESET_REDIRECT =
  'https://bitewise-nutrition.netlify.app/reset-password.html'


export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [sendingResetEmail, setSendingResetEmail] = useState(false)
  const [feedback, setFeedback] = useState('')

  const busy = loading || sendingResetEmail

  function showMessage(title: string, message: string) {
    setFeedback(`${title}: ${message}`)

    if (Platform.OS !== 'web') {
      Alert.alert(title, message)
    }
  }

  async function handleLogin() {
    if (busy) return

    if (!email.trim() || !password) {
      showMessage('Missing information', 'Enter your email and password.')
      return
    }

    setFeedback('')
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })


      if (error || !data.user) {
        showMessage(
          'Login failed',
          error?.message || 'Unable to sign in. Please try again.'
        )
        return
      }

      // App.tsx must validate profiles.app_role and coach approval before
      // rendering any authenticated navigator. Do not navigate manually here.
    } catch (error: any) {
      console.error('Login error:', error)

      showMessage(
        'Login failed',
        error?.message || 'Unable to sign in. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  async function handleForgotPassword() {
    if (busy) return

    const recoveryEmail = email.trim().toLowerCase()

    if (!recoveryEmail) {
      showMessage(
        'Email required',
        'Enter your registered email address above, then tap Forgot password.'
      )
      return
    }

    const redirectTo =
      Platform.OS === 'web'
        ? WEB_PASSWORD_RESET_REDIRECT
        : MOBILE_PASSWORD_RESET_REDIRECT

    if (!redirectTo) {
      showMessage(
        'Web password reset not configured',
        'The web recovery URL must be configured before sending a reset link from the browser. Use the mobile app in the meantime.'
      )
      return
    }

    setFeedback('')
    setSendingResetEmail(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        recoveryEmail,
        { redirectTo }
      )

      if (error) throw error

      showMessage(
        'Check your email',
        'If an account exists for this email address, a password-reset link will be sent. Check your inbox and spam folder.'
      )
    } catch (error: any) {
      console.error('Password reset email error:', error)

      showMessage(
        'Unable to send reset email',
        error?.message || 'Please try again later.'
      )
    } finally {
      setSendingResetEmail(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>
          <View style={styles.brandBlock}>
            <Text style={styles.logo}>BiteWise</Text>
            <Text style={styles.subtitle}>
              Sign in to your BiteWise account
            </Text>
          </View>

          <Text style={styles.label}>Email</Text>

          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="you@email.com"
            placeholderTextColor="#9AAEA1"
            style={styles.input}
            value={email}
            editable={!busy}
            autoComplete="email"
            accessibilityLabel="Email address"
          />

          <Text style={styles.label}>Password</Text>

          <TextInput
            onChangeText={setPassword}
            placeholder="Enter your password"
            placeholderTextColor="#9AAEA1"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
            value={password}
            editable={!busy}
            autoComplete="current-password"
            returnKeyType="go"
            onSubmitEditing={() => void handleLogin()}
            accessibilityLabel="Password"
          />

          {feedback ? (
            <Text
              style={styles.feedback}
              accessibilityLiveRegion="polite"
            >
              {feedback}
            </Text>
          ) : null}

          <TouchableOpacity
            disabled={busy}
            onPress={() => void handleLogin()}
            style={[styles.button, busy && styles.disabledButton]}
            accessibilityRole="button"
            accessibilityLabel="Log in"
            accessibilityState={{ disabled: busy }}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Log In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            disabled={busy}
            onPress={() => navigation.navigate('SignUp')}
            style={styles.linkButton}
            accessibilityRole="button"
          >
            <Text style={styles.linkText}>
              Don&apos;t have an account? Sign Up
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            disabled={busy}
            onPress={() => navigation.navigate('CoachSignUp')}
            style={styles.coachLinkButton}
            accessibilityRole="button"
          >
            <Text style={styles.linkText}>
              Want to join as a coach? Apply here
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.forgotButton}
            disabled={busy}
            onPress={() => void handleForgotPassword()}
            accessibilityRole="button"
            accessibilityLabel="Forgot password"
            accessibilityState={{ disabled: busy }}
          >
            {sendingResetEmail ? (
              <ActivityIndicator color="#1E5C35" />
            ) : (
              <Text style={styles.forgotText}>Forgot password?</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5FAF6',
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  form: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  brandBlock: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logo: {
    color: '#1E5C35',
    fontSize: 34,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: '#5C7267',
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
  },
  label: {
    color: '#16281D',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 7,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#C9DBD0',
    borderRadius: 14,
    borderWidth: 1,
    color: '#16281D',
    fontSize: 16,
    marginBottom: 16,
    paddingHorizontal: 15,
    paddingVertical: 14,
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#1E5C35',
    borderRadius: 999,
    justifyContent: 'center',
    marginTop: 6,
    minHeight: 52,
    paddingVertical: 14,
  },
  disabledButton: {
    opacity: 0.65,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  linkButton: {
    alignItems: 'center',
    marginTop: 14,
    padding: 8,
  },
  coachLinkButton: {
    alignItems: 'center',
    padding: 8,
  },
  linkText: {
    color: '#1E5C35',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  forgotButton: {
    alignItems: 'center',
    marginTop: 4,
    padding: 8,
    minHeight: 36,
  },
  forgotText: {
    color: '#1E5C35',
    fontSize: 13,
    fontWeight: '700',
  },
  feedback: {
    color: '#355244',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
})
