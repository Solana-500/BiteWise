import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import { supabase } from '../services/supabase'
import type { RootStackParamList } from '../types/navigation'

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'CoachSignUp'
>

const COACH_SPECIALTIES = [
  'Bodybuilding',
  'Weight Loss Management',
  'Nutritionist',
  'Powerlifting',
  'Hyrox',
  'CrossFit',
  'Marathon',
  'Running',
] as const

const GENDER_OPTIONS = ['Male', 'Female', 'Other'] as const

export default function CoachSignUpScreen() {
  const navigation = useNavigation<NavigationProp>()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([])
  const [experience, setExperience] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male')
  const [heightCm, setHeightCm] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [loading, setLoading] = useState(false)

  function toggleSpecialty(specialty: string) {
    setSelectedSpecialties((current) => {
      if (current.includes(specialty)) {
        return current.filter((item) => item !== specialty)
      }

      if (current.length >= 3) {
        Alert.alert(
          'Maximum reached',
          'Please select up to 3 coaching specialties.'
        )
        return current
      }

      return [...current, specialty]
    })
  }

  async function handleCoachSignUp() {
  if (
    !fullName.trim() ||
    !email.trim() ||
    !password ||
    selectedSpecialties.length === 0
  ) {
    Alert.alert(
      'Missing information',
      'Complete your full name, email, password, and select at least one coaching specialty.'
    )
    return
  }

  if (password.length < 6) {
    Alert.alert(
      'Password too short',
      'Password must have at least 6 characters.'
    )
    return
  }

  setLoading(true)

  try {
    // 1. Create Auth user first
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    })

    if (error || !data.user) {
      Alert.alert(
        'Coach registration failed',
        error?.message || 'Unable to create the coach account.'
      )
      return
    }

    // 2. Insert profile with coaching & personal details
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: data.user.id,
        full_name: fullName.trim(),
        app_role: 'coach',
        approval_status: 'pending',
        coaching_specialty: selectedSpecialties.join(', '),
        years_experience: experience.trim() || null,
        age: age ? parseInt(age, 10) : null,
        gender: gender || null,
        height_cm: heightCm ? parseFloat(heightCm) : null,
        weight_kg: weightKg ? parseFloat(weightKg) : null,
        updated_at: new Date().toISOString(),
      })

    if (profileError) {
      Alert.alert('Profile setup failed', profileError.message)
      return
    }

    // 3. IMPORTANT: Sign out immediately so pending coaches stay on the Auth stack
    await supabase.auth.signOut()

    Alert.alert(
      'Coach registration submitted',
      'Your account was created and is waiting for a system administrator to approve it.',
      [
        {
          text: 'Back to Login',
          onPress: () => navigation.navigate('Login'),
        },
      ]
    )
  } catch (err: any) {
    Alert.alert('Error', err?.message || 'An unexpected error occurred.')
  } finally {
    setLoading(false)
  }
}

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backText}>‹ Back to Login</Text>
      </TouchableOpacity>

      <Text style={styles.logo}>BiteWise</Text>
      <Text style={styles.title}>Coach Registration</Text>

      <Text style={styles.subtitle}>
        Create a professional coach account. A system administrator will review
        your application before it is activated.
      </Text>

      {/* Account Info */}
      <Text style={styles.sectionHeader}>Account Information</Text>

      <Text style={styles.label}>Full name</Text>
      <TextInput
        autoCapitalize="words"
        onChangeText={setFullName}
        placeholder="e.g. Emma Wilson"
        placeholderTextColor="#8B9B90"
        style={styles.input}
        value={fullName}
      />

      <Text style={styles.label}>Professional email</Text>
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="coach@email.com"
        placeholderTextColor="#8B9B90"
        style={styles.input}
        value={email}
      />

      <Text style={styles.label}>Password</Text>
      <TextInput
        onChangeText={setPassword}
        placeholder="At least 6 characters"
        placeholderTextColor="#8B9B90"
        secureTextEntry
        style={styles.input}
        value={password}
      />

      {/* Personal Info */}
      <Text style={styles.sectionHeader}>Personal Information</Text>

      <Text style={styles.label}>Age (optional)</Text>
      <TextInput
        keyboardType="number-pad"
        onChangeText={setAge}
        placeholder="e.g. 28"
        placeholderTextColor="#8B9B90"
        style={styles.input}
        value={age}
      />

      <Text style={styles.label}>Gender</Text>
      <View style={styles.genderRow}>
        {GENDER_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[
              styles.genderOption,
              gender === opt && styles.genderOptionSelected,
            ]}
            onPress={() => setGender(opt)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.genderText,
                gender === opt && styles.genderTextSelected,
              ]}
            >
              {opt}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.dualInputRow}>
        <View style={styles.dualInputCol}>
          <Text style={styles.label}>Height (cm)</Text>
          <TextInput
            keyboardType="numeric"
            onChangeText={setHeightCm}
            placeholder="e.g. 175"
            placeholderTextColor="#8B9B90"
            style={styles.input}
            value={heightCm}
          />
        </View>

        <View style={styles.dualInputCol}>
          <Text style={styles.label}>Weight (kg)</Text>
          <TextInput
            keyboardType="numeric"
            onChangeText={setWeightKg}
            placeholder="e.g. 72"
            placeholderTextColor="#8B9B90"
            style={styles.input}
            value={weightKg}
          />
        </View>
      </View>

      {/* Coaching Details */}
      <Text style={styles.sectionHeader}>Coaching Details</Text>

      <Text style={styles.label}>Coaching specialties</Text>
      <Text style={styles.helperText}>Select up to 3 specialties</Text>

      <View style={styles.specialtyGrid}>
        {COACH_SPECIALTIES.map((specialtyOption) => {
          const selected = selectedSpecialties.includes(specialtyOption)

          return (
            <TouchableOpacity
              key={specialtyOption}
              style={[
                styles.specialtyChip,
                selected && styles.specialtyChipSelected,
              ]}
              onPress={() => toggleSpecialty(specialtyOption)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.specialtyChipText,
                  selected && styles.specialtyChipTextSelected,
                ]}
              >
                {selected ? '✓ ' : ''}
                {specialtyOption}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      <Text style={styles.selectionCount}>
        {selectedSpecialties.length}/3 selected
      </Text>

      <Text style={styles.label}>Years of experience</Text>
      <TextInput
        keyboardType="number-pad"
        onChangeText={setExperience}
        placeholder="e.g. 4"
        placeholderTextColor="#8B9B90"
        style={styles.input}
        value={experience}
      />

      <TouchableOpacity
        disabled={loading}
        onPress={handleCoachSignUp}
        style={[styles.button, loading && styles.disabledButton]}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Register as Coach</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F5FAF6',
    flexGrow: 1,
    padding: 24,
    paddingBottom: 42,
    paddingTop: 30,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 22,
    paddingVertical: 8,
  },
  backText: {
    color: '#1E5C35',
    fontSize: 14,
    fontWeight: '800',
  },
  logo: {
    color: '#1E5C35',
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
  },
  title: {
    color: '#16281D',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 18,
    textAlign: 'center',
  },
  subtitle: {
    color: '#5C7267',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 24,
    marginTop: 8,
    textAlign: 'center',
  },
  sectionHeader: {
    color: '#1E5C35',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
    marginTop: 16,
  },
  label: {
    color: '#16281D',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 7,
    marginTop: 2,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#C9DBD0',
    borderRadius: 12,
    borderWidth: 1,
    color: '#16281D',
    fontSize: 15,
    marginBottom: 14,
    padding: 14,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  genderOption: {
    backgroundColor: '#FFFFFF',
    borderColor: '#C9DBD0',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  genderOptionSelected: {
    backgroundColor: '#1E5C35',
    borderColor: '#1E5C35',
  },
  genderText: {
    color: '#42634D',
    fontSize: 14,
    fontWeight: '700',
  },
  genderTextSelected: {
    color: '#FFFFFF',
  },
  dualInputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dualInputCol: {
    flex: 1,
  },
  helperText: {
    color: '#7C8F83',
    fontSize: 12,
    marginBottom: 10,
    marginTop: -3,
  },
  specialtyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  specialtyChip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#C9DBD0',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  specialtyChipSelected: {
    backgroundColor: '#1E5C35',
    borderColor: '#1E5C35',
  },
  specialtyChipText: {
    color: '#42634D',
    fontSize: 13,
    fontWeight: '700',
  },
  specialtyChipTextSelected: {
    color: '#FFFFFF',
  },
  selectionCount: {
    color: '#5C7267',
    fontSize: 12,
    marginBottom: 16,
    marginTop: 9,
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#1E5C35',
    borderRadius: 999,
    justifyContent: 'center',
    marginTop: 18,
    minHeight: 52,
    paddingVertical: 14,
  },
  disabledButton: {
    opacity: 0.65,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
})