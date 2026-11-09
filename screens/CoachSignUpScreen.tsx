import {
  supabaseUrl,
  supabasePublishableKey,
} from '../services/supabase'
import { useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import * as DocumentPicker from 'expo-document-picker'
import { File } from 'expo-file-system'
import * as Crypto from 'expo-crypto'
import type { RootStackParamList } from '../types/navigation'

type Props = NativeStackScreenProps<RootStackParamList, 'CoachSignUp'>
const SPECIALTIES = [
  'Bodybuilding',
  'Weight Loss Management',
  'Nutritionist',
  'Powerlifting',
  'Hyrox',
  'CrossFit',
  'Marathon',
  'Running',
]
const LIMIT = 5 * 1024 * 1024
const BUCKET = 'coach-certificates'

type PreparedFile = {
  body: ArrayBuffer
  extension: string
  mime: string
  name: string
}

type Application = {
  full_name: string
  coaching_specialty: string
  years_experience: string | null
  age: number | null
  gender: string
  height_cm: number | null
  weight_kg: number | null
}

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error) return String(error.message)
  return 'Please try again.'
}

function optionalNumber(value: string, label: string, whole = false) {
  if (!value.trim()) return null
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0 || (whole && !Number.isInteger(number))) {
    throw new Error(`${label} must be a positive ${whole ? 'whole number' : 'number'}.`)
  }
  return number
}

async function prepare(asset: DocumentPicker.DocumentPickerAsset): Promise<PreparedFile> {
  const file = new File(asset.uri)
  if (!file.size || file.size > LIMIT) throw new Error('Select a non-empty certificate no larger than 5 MB.')
  const bytes = await file.bytes()
  let extension: string
  let mime: string
  if ([0x25, 0x50, 0x44, 0x46, 0x2d].every((v, i) => bytes[i] === v)) {
    extension = 'pdf'
    mime = 'application/pdf'
  } else if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    extension = 'jpg'
    mime = 'image/jpeg'
  } else if ([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => bytes[i] === v)) {
    extension = 'png'
    mime = 'image/png'
  } else {
    throw new Error('Select a PDF, JPG, or PNG certificate.')
  }
   const body = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(body).set(bytes)

  return { body, extension, mime, name: asset.name }
}

export default function CoachSignUpScreen({ navigation }: Props) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [specialties, setSpecialties] = useState<string[]>([])
  const [experience, setExperience] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('Male')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [certificate, setCertificate] = useState<DocumentPicker.DocumentPickerAsset | null>(null)
  const [busy, setBusy] = useState(false)
  const [accountCreated, setAccountCreated] = useState(false)
  const [phase, setPhase] = useState('')
  const locked = useRef(false)
  const client = useRef<SupabaseClient | null>(null)
  const userId = useRef<string | null>(null)
  const application = useRef<Application | null>(null)
  const profileSaved = useRef(false)
  const uploadedPath = useRef<string | null>(null)
  const prepared = useRef<PreparedFile | null>(null)

  function registrationClient() {
    if (!client.current) {
      const url = supabaseUrl
      const key = supabasePublishableKey
      client.current = createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      })
    }
    return client.current
  }

  function toggle(value: string) {
    if (busy || accountCreated) return
    if (specialties.includes(value)) {
      setSpecialties((current) => current.filter((item) => item !== value))
    } else if (specialties.length < 3) {
      setSpecialties((current) => [...current, value])
    } else {
      Alert.alert('Maximum reached', 'Select up to 3 specialties.')
    }
  }

   
  async function chooseCertificate() {
    if (busy || accountCreated) return
  
    try {
      const result = await File.pickFileAsync({
        mimeTypes: [
          'application/pdf',
          'image/jpeg',
          'image/png',
        ],
      })
  
      if (result.canceled) return
  
      const pickedFile = result.result
  
      console.log('Picked file exists:', pickedFile.exists)
      console.log('Picked file size:', pickedFile.size)
  
           
      const asset: DocumentPicker.DocumentPickerAsset = {
        uri: pickedFile.uri,
        name: pickedFile.name,
        size: pickedFile.size,
        mimeType: pickedFile.type ?? undefined,
        lastModified: pickedFile.modificationTime
          ? pickedFile.modificationTime * 1000
          : Date.now(),
      }

  
      const validatedFile = await prepare(asset)
  
      prepared.current = validatedFile
      setCertificate(asset)
  
      console.log('Certificate validated successfully')
    } catch (error) {
      console.error('Certificate selection failed:', error)
      Alert.alert('Certificate unavailable', errorText(error))
    }
  }

  async function register() {
    if (locked.current) return
    locked.current = true
    setBusy(true)
    try {
      const api = registrationClient()
      if (!userId.current) {
        if (!fullName.trim() || !email.trim() || !password || !specialties.length) {
          throw new Error('Complete your name, email, password, and at least one specialty.')
        }
        if (password.length < 8) throw new Error('Use a password with at least 8 characters.')
        if (!certificate) throw new Error('Select your personal trainer certificate.')
        application.current = {
          full_name: fullName.trim(),
          coaching_specialty: specialties.join(', '),
          years_experience: experience.trim() || null,
          age: optionalNumber(age, 'Age', true),
          gender,
          height_cm: optionalNumber(height, 'Height'),
          weight_kg: optionalNumber(weight, 'Weight'),
        }
        
          setPhase('Checking certificate…')
          
          if (!prepared.current) {
            prepared.current = await prepare(certificate)
          }

        setPhase('Creating account…')
        const { data, error } = await api.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
        })
        if (error) throw error
        if (!data.user || !data.session) {
          throw new Error('Registration did not return a session. If email confirmation is enabled, confirm your email and contact support to complete your application. Do not repeatedly register the same email.')
        }
        userId.current = data.user.id
        setAccountCreated(true)
        setPassword('')
      }

      if (!profileSaved.current) {
        setPhase('Saving coach profile…')
        const { error } = await api.from('profiles').upsert({
          id: userId.current,
          ...application.current,
          app_role: 'coach',
          approval_status: 'pending',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' })
        if (error) throw error
        profileSaved.current = true
      }

      const file = prepared.current
      if (!file) throw new Error('Certificate data is unavailable. Please contact support to finish your existing application.')
      if (!uploadedPath.current) {
        setPhase('Uploading certificate…')
        const path = `${userId.current}/${Crypto.randomUUID()}.${file.extension}`
        const { error } = await api.storage.from(BUCKET).upload(path, file.body, {
          contentType: file.mime,
          upsert: false,
        })
        if (error) throw error
        uploadedPath.current = path
      }

      setPhase('Saving certificate details…')
      const path = uploadedPath.current
      const { data: existing, error: lookupError } = await api
        .from('coach_documents')
        .select('id')
        .eq('coach_id', userId.current)
        .eq('file_path', path)
        .limit(1)
      if (lookupError) throw lookupError
      if (!existing?.length) {
        const { error } = await api.from('coach_documents').insert({
          coach_id: userId.current,
          file_name: file.name,
          file_path: path,
          file_type: file.mime,
          verification_status: 'pending',
          uploaded_at: new Date().toISOString(),
        })
        if (error) throw error
      }

      await api.auth.signOut({ scope: 'local' })
      prepared.current = null
      Alert.alert('Coach application submitted', 'Your account and certificate were saved for administrator review. Uploading a certificate does not automatically approve your account.', [
        { text: 'Back to Login', onPress: () => navigation.navigate('Login') },
      ])
    } catch (error) {
      Alert.alert(userId.current ? 'Application not complete' : 'Registration not completed',
        `${errorText(error)}${userId.current ? '\n\nYour account already exists. Stay on this screen and tap Retry to resume; do not register again. If you close the app, sign in with that account and use Credentials to complete the upload, or contact support if access is blocked.' : ''}`)
    } finally {
      setBusy(false)
      setPhase('')
      locked.current = false
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Pressable disabled={busy} onPress={() => {
        if (accountCreated) {
          Alert.alert('Application incomplete', 'Your account exists, but registration may be unfinished. Retry here to finish before leaving.', [
            { text: 'Stay', style: 'cancel' },
            { text: 'Leave', onPress: () => {
              void client.current?.auth.signOut({ scope: 'local' })
              navigation.goBack()
            } },
          ])
        } else navigation.goBack()
      }}><Text style={styles.link}>‹ Back to Login</Text></Pressable>
      <Text style={styles.logo}>BiteWise</Text>
      <Text style={styles.title}>Coach Registration</Text>
      <Text style={styles.helper}>Complete your details and upload your personal trainer certificate for administrator review.</Text>

      <Text style={styles.section}>Account Information</Text>
      {[
        { label: 'Full name', value: fullName, change: setFullName },
        { label: 'Professional email', value: email, change: setEmail },
        { label: 'Password (at least 8 characters)', value: password, change: setPassword },
      ].map((field) => (
        <View key={field.label}>
          <Text style={styles.label}>{field.label}</Text>
          <TextInput
            style={styles.input}
            value={field.value}
            onChangeText={field.change}
            editable={!busy && !accountCreated}
            secureTextEntry={field.change === setPassword}
            autoCapitalize={field.change === setFullName ? 'words' : 'none'}
            keyboardType={field.change === setEmail ? 'email-address' : 'default'}
            autoCorrect={false}
          />
        </View>
      ))}

      <Text style={styles.section}>Personal Information</Text>
      {[
        { label: 'Age (optional)', value: age, change: setAge },
        { label: 'Height in cm (optional)', value: height, change: setHeight },
        { label: 'Weight in kg (optional)', value: weight, change: setWeight },
      ].map((field) => (
        <View key={field.label}>
          <Text style={styles.label}>{field.label}</Text>
          <TextInput style={styles.input} value={field.value} onChangeText={field.change}
            editable={!busy && !accountCreated} keyboardType={field.change === setAge ? 'number-pad' : 'decimal-pad'} />
        </View>
      ))}
      <Text style={styles.label}>Gender</Text>
      <View style={styles.grid}>
        {['Male', 'Female', 'Other'].map((value) => (
          <Pressable key={value} disabled={busy || accountCreated} onPress={() => setGender(value)}
            style={[styles.chip, gender === value && styles.selected]}>
            <Text style={[styles.chipText, gender === value && styles.white]}>{value}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.section}>Coaching Details</Text>
      <Text style={styles.label}>Select 1–3 specialties</Text>
      <View style={styles.grid}>
        {SPECIALTIES.map((value) => (
          <Pressable key={value} disabled={busy || accountCreated} onPress={() => toggle(value)}
            style={[styles.chip, specialties.includes(value) && styles.selected]}>
            <Text style={[styles.chipText, specialties.includes(value) && styles.white]}>{value}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.helper}>{specialties.length}/3 selected</Text>
      <Text style={styles.label}>Years of experience</Text>
      <TextInput style={styles.input} value={experience} onChangeText={setExperience} editable={!busy && !accountCreated} />

      <Text style={styles.section}>Personal Trainer Certification *</Text>
      <Text style={styles.helper}>PDF, JPG, or PNG · Maximum 5 MB. Required to complete your application.</Text>
      <Pressable style={styles.secondary} disabled={busy || accountCreated} onPress={() => void chooseCertificate()}>
        <Text style={styles.link}>{certificate ? 'Choose another certificate' : 'Select certificate'}</Text>
      </Pressable>
      {certificate && <Text style={styles.helper}>Selected: {certificate.name}</Text>}
      <Pressable style={[styles.button, busy && styles.disabled]} disabled={busy} onPress={() => void register()}>
        {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>{accountCreated ? 'Retry completing application' : 'Register as Coach'}</Text>}
      </Pressable>
      {phase ? <Text style={styles.helper}>{phase}</Text> : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 30,
    paddingBottom: 42,
    backgroundColor: '#F5FAF6',
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
    textAlign: 'center',
    marginVertical: 16,
  },
  section: {
    color: '#1E5C35',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 22,
    marginBottom: 12,
  },
  label: {
    color: '#16281D',
    fontWeight: '800',
    marginBottom: 8,
    fontSize: 13,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#C9DBD0',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    color: '#16281D',
  },
  helper: {
    color: '#5C7267',
    fontSize: 13,
    lineHeight: 21,
    marginVertical: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  chip: {
    padding: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#C9DBD0',
    backgroundColor: '#FFFFFF',
  },
  selected: {
    backgroundColor: '#1E5C35',
  },
  chipText: {
    color: '#42634D',
    fontWeight: '700',
  },
  white: {
    color: '#FFFFFF',
  },
  link: {
    color: '#1E5C35',
    fontWeight: '800',
    paddingVertical: 12,
  },
  secondary: {
    borderRadius: 12,
    backgroundColor: '#EAF3EC',
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#1E5C35',
    minHeight: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.6,
  },
})
