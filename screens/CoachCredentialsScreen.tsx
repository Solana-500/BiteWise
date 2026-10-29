import { useCallback, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import * as DocumentPicker from 'expo-document-picker'
import { File } from 'expo-file-system'
import * as Crypto from 'expo-crypto'
import type { RootStackParamList } from '../types/navigation'
import { supabase } from '../services/supabase'

type Props = NativeStackScreenProps<RootStackParamList, 'CoachCredentials'>
type Certificate = {
  id: string
  file_name: string
  file_path: string
  file_type: string | null
  verification_status: string | null
  uploaded_at: string | null
}

const BUCKET = 'coach-certificates'
const LIMIT = 5 * 1024 * 1024

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message)
  }
  return 'Please try again.'
}

export default function CoachCredentialsScreen({ navigation }: Props) {
  const [documents, setDocuments] = useState<Certificate[]>([])
  const [selected, setSelected] = useState<DocumentPicker.DocumentPickerAsset | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const locked = useRef(false)

  useFocusEffect(
    useCallback(() => {
      let active = true
      async function load() {
        try {
          setError('')
          const { data: { user }, error: authError } = await supabase.auth.getUser()
          if (authError) throw authError
          if (!user) throw new Error('Please log in again.')

          const { data, error: queryError } = await supabase
            .from('coach_documents')
            .select('id, file_name, file_path, file_type, verification_status, uploaded_at')
            .eq('coach_id', user.id)
            .order('uploaded_at', { ascending: false })

          if (queryError) throw queryError
          if (active) setDocuments(data ?? [])
        } catch (err) {
          if (active) setError(errorText(err))
        } finally {
          if (active) {
            setLoading(false)
            setRefreshing(false)
          }
        }
      }
      void load()
      return () => { active = false }
    }, [reload])
  )

  async function choose() {
    if (locked.current) return
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png'],
        copyToCacheDirectory: true,
        multiple: false,
      })
      if (result.canceled) return
      const asset = result.assets[0]
      const size = new File(asset.uri).size
      if (!size || size > LIMIT) {
        throw new Error('Choose a non-empty certificate smaller than or equal to 5 MB.')
      }
      setSelected(asset)
    } catch (err) {
      Alert.alert('Could not select certificate', errorText(err))
    }
  }

  async function upload() {
    if (!selected || locked.current) return
    locked.current = true
    setBusy(true)

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!user) throw new Error('Please log in again.')

      const localFile = new File(selected.uri)
      if (!localFile.size || localFile.size > LIMIT) {
        throw new Error('The certificate must be non-empty and no larger than 5 MB.')
      }

      const bytes = await localFile.bytes()
      let extension: string
      let contentType: string

      if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d) {
        extension = 'pdf'
        contentType = 'application/pdf'
      } else if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
        extension = 'jpg'
        contentType = 'image/jpeg'
      } else if ([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value)) {
        extension = 'png'
        contentType = 'image/png'
      } else {
        throw new Error('Please select a PDF, JPG, or PNG certificate.')
      }

      const path = `${user.id}/${Crypto.randomUUID()}.${extension}`
      const buffer = new ArrayBuffer(bytes.byteLength)
      new Uint8Array(buffer).set(bytes)

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, buffer, { contentType, upsert: false })
      if (uploadError) throw uploadError

      const { error: recordError } = await supabase
        .from('coach_documents')
        .insert({
          coach_id: user.id,
          file_name: selected.name,
          file_path: path,
          file_type: contentType,
          verification_status: 'pending',
          uploaded_at: new Date().toISOString(),
        })

      if (recordError) {
        const { error: cleanupError } = await supabase.storage.from(BUCKET).remove([path])
        if (cleanupError) {
          throw new Error(`${errorText(recordError)} The uploaded object may remain in storage; ask your administrator to remove the unlinked object: ${path}`)
        }
        throw recordError
      }

      setSelected(null)
      setReload((current) => current + 1)
      Alert.alert('Certificate uploaded', 'Your certificate was saved. Uploading does not automatically approve your certificate or coach account.')
    } catch (err) {
      Alert.alert('Could not upload certificate', errorText(err))
    } finally {
      locked.current = false
      setBusy(false)
    }
  }

  async function openDocument(document: Certificate) {
    if (locked.current) return
    locked.current = true
    setBusy(true)
    try {
      const { data, error: urlError } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(document.file_path, 60)
      if (urlError) throw urlError
      await Linking.openURL(data.signedUrl)
    } catch (err) {
      Alert.alert('Could not open certificate', errorText(err))
    } finally {
      locked.current = false
      setBusy(false)
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            if (busy || refreshing) return
            setRefreshing(true)
            setReload((current) => current + 1)
          }} />
        }
      >
        <Pressable disabled={busy} onPress={() => navigation.goBack()}>
          <Text style={styles.link}>‹ Profile</Text>
        </Pressable>
        <Text style={styles.title}>Your Credentials</Text>
        <Text style={styles.body}>Upload your personal trainer certification for administrator verification.</Text>

        <View style={styles.card}>
          <Text style={styles.heading}>Personal trainer certification</Text>
          <Text style={styles.body}>PDF, JPG or PNG · Maximum 5 MB per file</Text>
          <Pressable disabled={busy} style={styles.secondary} onPress={() => void choose()}>
            <Text style={styles.link}>{selected ? 'Choose another file' : 'Select certificate'}</Text>
          </Pressable>
          {selected && (
            <>
              <Text style={styles.body}>{selected.name}</Text>
              <Pressable disabled={busy} style={styles.button} onPress={() => void upload()}>
                <Text style={styles.buttonText}>Upload certificate</Text>
              </Pressable>
            </>
          )}
          {busy && <ActivityIndicator style={{ marginTop: 12 }} color="#1E5C35" />}
        </View>

        <Text style={styles.heading}>Uploaded certificates</Text>
        {loading ? <ActivityIndicator color="#1E5C35" /> : error ? (
          <View style={styles.card}>
            <Text style={styles.body}>{error}</Text>
            <Pressable onPress={() => setReload((current) => current + 1)}>
              <Text style={styles.link}>Retry</Text>
            </Pressable>
          </View>
        ) : documents.length === 0 ? (
          <View style={styles.card}><Text style={styles.body}>No certificates uploaded yet.</Text></View>
        ) : documents.map((document) => (
          <View key={document.id} style={styles.card}>
            <Text style={styles.heading}>{document.file_name}</Text>
            <Text style={styles.body}>Verification: {document.verification_status || 'Not recorded'}</Text>
            <Text style={styles.body}>Uploaded: {document.uploaded_at ? new Date(document.uploaded_at).toLocaleDateString() : 'Not recorded'}</Text>
            <Pressable disabled={busy} onPress={() => void openDocument(document)} accessibilityRole="button">
              <Text style={styles.link}>View certificate ›</Text>
            </Pressable>
          </View>
        ))}
        <Text style={styles.body}>Verification is managed by your administrator. This screen does not change your coach approval status.</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5FAF6',
  },
  content: {
    padding: 20,
    paddingBottom: 36,
  },
  title: {
    color: '#16281D',
    fontSize: 26,
    fontWeight: '800',
    marginVertical: 10,
  },
  heading: {
    color: '#16281D',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 6,
  },
  body: {
    color: '#5C7267',
    fontSize: 13,
    lineHeight: 21,
    marginTop: 8,
  },
  card: {
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    marginVertical: 14,
    borderWidth: 1,
    borderColor: '#E2ECE6',
  },
  link: {
    color: '#1E5C35',
    fontSize: 14,
    fontWeight: '800',
    paddingVertical: 12,
  },
  button: {
    backgroundColor: '#1E5C35',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    marginTop: 14,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  secondary: {
    backgroundColor: '#EAF3EC',
    alignItems: 'center',
    borderRadius: 12,
    marginTop: 16,
  },
})
