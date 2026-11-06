import { useEffect, useState } from 'react'
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../types/navigation'
import { supabase } from '../services/supabase'

type Props = NativeStackScreenProps<RootStackParamList, 'RateCoach'>
const LABELS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent']

export default function RateCoachScreen({ navigation, route }: Props) {
  const { coachId, coachName } = route.params
  const [rating, setRating] = useState(0)
  const [review, setReview] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [existing, setExisting] = useState(false)
  const [reviewStatus, setReviewStatus] = useState<string | null>(null)
  
  useEffect(() => {
    let active = true
    async function load() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError) throw authError
        if (!user) throw new Error('Please log in again.')
        const { data, error } = await supabase
          .from('coach_reviews')
          .select('rating, review_text, moderation_status')
          .eq('client_id', user.id)
          .eq('coach_id', coachId)
          .maybeSingle()
        if (error) throw error
        if (active && data) {
          setRating(data.rating)
          setReview(data.review_text || '')
          setExisting(true)
          setReviewStatus(data.moderation_status)
        }
      } catch (error) {
        if (active) {
          setLoadError(true)
          Alert.alert('Could not load review', error instanceof Error ? error.message : 'Please try again later.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [coachId])

  async function saveReview() {
    if (saving || loadError) return
    if (rating < 1 || rating > 5) {
      Alert.alert('Choose a rating', 'Please select between 1 and 5 stars.')
      return
    }
    
    const trimmedReview = review.trim()
    
    if (trimmedReview.length > 0 && trimmedReview.length < 10) {
      Alert.alert(
        'Review too short',
        'Please write at least 10 characters, or leave the review blank to submit a star-only rating.'
      )
      return
    }

    try {
      setSaving(true)
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!user) throw new Error('Please log in again.')
     
      const reviewData = {
        rating,
        review_text: review.trim() || null,
      }
      
      let saveError
      
      if (existing) {
        // Update an existing review.
        // The database manages updated_at and moderation status.
        const { error } = await supabase
          .from('coach_reviews')
          .update(reviewData)
          .eq('client_id', user.id)
          .eq('coach_id', coachId)
      
        saveError = error
      } else {
        // Submit a new review.
        // The database automatically sets moderation_status to pending.
        const { error } = await supabase
          .from('coach_reviews')
          .insert({
            client_id: user.id,
            coach_id: coachId,
            ...reviewData,
          })
      
        saveError = error
      }
      
      if (saveError) throw saveError

      Alert.alert(
        'Review submitted',
        'Your review has been submitted for moderation. It will become publicly visible once approved.',
        [{ text: 'Done', onPress: () => navigation.goBack() }]
      )
    } catch (error) {
      Alert.alert('Review not saved', error instanceof Error ? error.message : 'Please check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back" style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Rate your coach</Text>
        <View style={styles.back} />
      </View>
      {loading ? <ActivityIndicator style={styles.loader} size="large" color="#1E5C35" /> : (
        <KeyboardAvoidingView style={styles.body} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.coachCard}>
              <Text style={styles.avatar}>{coachName.trim().slice(0, 1).toUpperCase() || 'C'}</Text>
              <Text style={styles.coachName}>{coachName}</Text>
              <Text style={styles.helper}>Your health coach</Text>
            </View>
            <View style={styles.card}>
              
              {existing && reviewStatus && (
                <View style={{ marginBottom: 14 }}>
                  <Text style={{
                    color: '#1E5C35',
                    fontWeight: '800',
                    fontSize: 13,
                  }}>
                    Review status: {reviewStatus.toUpperCase()}
                  </Text>
              
                  <Text style={styles.helper}>
                    {reviewStatus === 'pending'
                      ? 'Your review is awaiting administrator approval.'
                      : reviewStatus === 'published'
                      ? 'Your review is approved and publicly visible.'
                      : reviewStatus === 'rejected'
                      ? 'Your review was not approved. You may revise it after the editing cooldown.'
                      : 'Your review is currently hidden from public view.'}
                  </Text>
                </View>
              )}

              <Text style={styles.title}>How was your coaching experience?</Text>
              <Text style={styles.helper}>Your honest feedback helps your coach improve.</Text>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <Pressable key={value} onPress={() => setRating(value)} disabled={saving || loadError}
                    accessibilityRole="button" accessibilityLabel={`Rate ${value} out of 5 stars`}
                    accessibilityState={{ selected: rating === value }} style={styles.starButton}>
                    <Text style={[styles.star, { color: value <= rating ? '#E4AA28' : '#CAD8CE' }]}>
                      {value <= rating ? '★' : '☆'}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.ratingLabel}>{rating ? LABELS[rating] : 'Tap a star to rate'}</Text>
              <Text style={styles.fieldLabel}>Write a review (optional)</Text>
              <TextInput style={styles.input} value={review} onChangeText={setReview}
                placeholder="What went well? What could be improved?" placeholderTextColor="#819287"
                multiline maxLength={1000} textAlignVertical="top" editable={!saving && !loadError}
                accessibilityLabel="Your written coach review" />
              <Text style={styles.counter}>{review.length}/1000</Text>
              <Text style={styles.helper}>Your coach can read this review. Please avoid sharing sensitive health information.</Text>
              {loadError && <Text style={styles.error}>Could not load your review. Go back and reopen this screen to try again.</Text>}
              <Pressable onPress={() => void saveReview()} disabled={!rating || saving || loadError}
                accessibilityRole="button" style={[styles.submit, (!rating || saving || loadError) && styles.disabled]}>
                {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>{existing ? 'Update review' : 'Submit review'}</Text>}
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5FAF6' },
  body: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, minHeight: 56 },
  back: { width: 64, minHeight: 44, justifyContent: 'center' },
  backText: { color: '#1E5C35', fontSize: 15, fontWeight: '700' },
  headerTitle: { color: '#16281D', fontSize: 17, fontWeight: '800' },
  loader: { flex: 1 },
  content: { padding: 20, paddingBottom: 32 },
  coachCard: { alignItems: 'center', padding: 22, backgroundColor: '#EAF3EC', borderRadius: 20, marginBottom: 18 },
  avatar: { textAlign: 'center', textAlignVertical: 'center', overflow: 'hidden', lineHeight: 60, width: 60, height: 60, borderRadius: 30, backgroundColor: '#D0E6D6', color: '#1E5C35', fontSize: 26, fontWeight: '800' },
  coachName: { marginTop: 12, fontSize: 21, fontWeight: '800', color: '#16281D' },
  card: { padding: 18, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2ECE6' },
  title: { color: '#16281D', fontSize: 18, fontWeight: '800', lineHeight: 25 },
  helper: { color: '#5C7267', fontSize: 12, lineHeight: 18, marginTop: 6 },
  stars: { flexDirection: 'row', justifyContent: 'center', marginTop: 22 },
  starButton: { flex: 1, alignItems: 'center', minHeight: 48, justifyContent: 'center' },
  star: { fontSize: 37 },
  ratingLabel: { textAlign: 'center', color: '#8A6410', fontWeight: '700', marginTop: 8, marginBottom: 24 },
  fieldLabel: { color: '#16281D', fontSize: 14, fontWeight: '700', marginBottom: 10 },
  input: { minHeight: 150, borderRadius: 12, borderWidth: 1, borderColor: '#C9DBD0', padding: 14, backgroundColor: '#F5FAF6', color: '#16281D', fontSize: 14, lineHeight: 21 },
  counter: { textAlign: 'right', color: '#708277', fontSize: 11, marginTop: 6 },
  submit: { minHeight: 48, backgroundColor: '#1E5C35', alignItems: 'center', justifyContent: 'center', borderRadius: 12, marginTop: 22 },
  submitText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  disabled: { opacity: 0.45 },
  error: { color: '#B33327', marginTop: 12, lineHeight: 19 },
})
