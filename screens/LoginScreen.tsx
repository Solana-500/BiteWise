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

type AppRole = 'user' | 'coach' | 'admin'

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>

const ROLE_COPY: Record<AppRole, string> = {
  user: 'Registered User Sign In',
  coach: 'Health Coach Sign In',
  admin: 'System Admin Sign In',
}

export default function LoginScreen({ navigation }: Props) {
  const [selectedRole, setSelectedRole] = useState<AppRole>('user')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
  if (!email.trim() || !password) {
    Alert.alert('Missing information', 'Enter your email and password.')
    return
  }

  setLoading(true)

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    if (error || !data.user) {
      Alert.alert(
        'Login failed',
        error?.message || 'Unable to sign in. Please try again.'
      )
      return
    }

    // Fetch profile to verify role alignment before letting App.tsx navigate
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('app_role, approval_status')
      .eq('id', data.user.id)
      .maybeSingle()

    if (profileError) {
      await supabase.auth.signOut()
      Alert.alert('Role check failed', profileError.message)
      return
    }

    const actualRole = (profile?.app_role ?? 'user') as AppRole

    // Reject if selected login tab doesn't match DB role
    if (actualRole !== selectedRole) {
      await supabase.auth.signOut()
      Alert.alert(
        'Incorrect account type',
        `This account is registered as a ${actualRole}. Please select the ${actualRole} login tab.`
      )
      return
    }

    // Block pending coaches
    if (actualRole === 'coach' && profile?.approval_status !== 'approved') {
      await supabase.auth.signOut()
      Alert.alert(
        'Registration pending',
        'Your Coach registration is pending administrator approval.'
      )
      return
    }

    // DO NOT call navigation.replace() here!
    // App.tsx's onAuthStateChange listener handles rendering CoachHome automatically.

  } catch (error: any) {
    console.error('Login error:', error)
    Alert.alert(
      'Login failed',
      error?.message || 'Unable to sign in. Please try again.'
    )
  } finally {
    setLoading(false)
  }
}

  function openRegistration() {
    if (selectedRole === 'user') {
      navigation.navigate('SignUp')
      return
    }

    if (selectedRole === 'coach') {
      navigation.navigate('CoachSignUp')
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.brandBlock}>
        <Text style={styles.logo}>BiteWise</Text>
        <Text style={styles.subtitle}>{ROLE_COPY[selectedRole]}</Text>
      </View>

      <View style={styles.roleToggle}>
        <TouchableOpacity
          style={[
            styles.roleButton,
            selectedRole === 'user' && styles.roleButtonSelected,
          ]}
          onPress={() => setSelectedRole('user')}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.roleButtonText,
              selectedRole === 'user' && styles.roleButtonTextSelected,
            ]}
          >
            User
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.roleButton,
            selectedRole === 'coach' && styles.roleButtonSelected,
          ]}
          onPress={() => setSelectedRole('coach')}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.roleButtonText,
              selectedRole === 'coach' && styles.roleButtonTextSelected,
            ]}
          >
            Coach
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.roleButton,
            selectedRole === 'admin' && styles.roleButtonSelected,
          ]}
          onPress={() => setSelectedRole('admin')}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.roleButtonText,
              selectedRole === 'admin' && styles.roleButtonTextSelected,
            ]}
          >
            Admin
          </Text>
        </TouchableOpacity>
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
      />

      <Text style={styles.label}>Password</Text>

      <TextInput
        onChangeText={setPassword}
        placeholder="Enter your password"
        placeholderTextColor="#9AAEA1"
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

      {selectedRole === 'user' && (
        <TouchableOpacity
          disabled={loading}
          onPress={openRegistration}
          style={styles.linkButton}
        >
          <Text style={styles.linkText}>
            Don&apos;t have a user account? Sign Up
          </Text>
        </TouchableOpacity>
      )}

      {selectedRole === 'coach' && (
        <TouchableOpacity
          disabled={loading}
          onPress={openRegistration}
          style={styles.linkButton}
        >
          <Text style={styles.linkText}>
            New coach? Register as a Coach
          </Text>
        </TouchableOpacity>
      )}

      {selectedRole === 'admin' && (
        <Text style={styles.adminNote}>
          System administrator accounts are created by BiteWise.
        </Text>
      )}

      <TouchableOpacity
        style={styles.forgotButton}
        onPress={() =>
          Alert.alert(
            'Forgot password',
            'Password reset can be connected to Supabase Auth next.'
          )
        }
      >
        <Text style={styles.forgotText}>Forgot password?</Text>
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
  roleToggle: {
    backgroundColor: '#D9ECDF',
    borderRadius: 999,
    flexDirection: 'row',
    marginBottom: 26,
    padding: 5,
  },
  roleButton: {
    alignItems: 'center',
    borderRadius: 999,
    flex: 1,
    paddingVertical: 11,
  },
  roleButtonSelected: {
    backgroundColor: '#1E5C35',
    elevation: 4,
    shadowColor: '#1E5C35',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.22,
    shadowRadius: 7,
  },
  roleButtonText: {
    color: '#42634D',
    fontSize: 13,
    fontWeight: '800',
  },
  roleButtonTextSelected: {
    color: '#FFFFFF',
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
  linkText: {
    color: '#1E5C35',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  adminNote: {
    color: '#7C8F83',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 16,
    textAlign: 'center',
  },
  forgotButton: {
    alignItems: 'center',
    marginTop: 4,
    padding: 8,
  },
  forgotText: {
    color: '#1E5C35',
    fontSize: 13,
    fontWeight: '700',
  },
})