import { useEffect, useState } from 'react'
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
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import { supabase } from '../services/supabase'
import type {
  MainTabParamList,
  RootStackParamList,
} from '../types/navigation'

type FeedbackNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Feedback'
>

export default function FeedbackScreen() {
  const navigation = useNavigation<FeedbackNavigationProp>()

  const [rating, setRating] = useState<number | null>(null)
  const [feedbackText, setFeedbackText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [reviewStatus, setReviewStatus] = useState<string | null>(null)
  const [checkingReview, setCheckingReview] = useState(true)

  
useEffect(() => {
  let active = true

  async function loadExistingReview() {
    try {
      const { data: { user }, error: authError } =
        await supabase.auth.getUser()

      if (authError) throw authError
      if (!user) throw new Error('Please log in again.')

      const { data, error } = await supabase
        .from('app_feedback')
        .select('rating, feedback_text, moderation_status')
        .eq('user_id', user.id)
        .neq('moderation_status', 'hidden')
        .limit(1)
        .maybeSingle()

      if (error) throw error

      if (active && data) {
        setRating(data.rating)
        setFeedbackText(data.feedback_text || '')
        setReviewStatus(data.moderation_status)
      }
    } catch (error) {
      console.error('Unable to load existing app review:', error)
    } finally {
      if (active) setCheckingReview(false)
    }
  }

  void loadExistingReview()

  return () => {
    active = false
  }
}, [])

  async function submitFeedback() {
    if (!rating) {
      Alert.alert(
        'Choose a rating',
        'Please select a star rating before submitting your feedback.'
      )
      return
    }

    try {
      setSubmitting(true)

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        throw userError
      }

      if (!user) {
        Alert.alert('Login required', 'Please log in again.')
        return
      }

// Check whether the user already has an active app review.
      const { data: existingReview, error: reviewCheckError } =
        await supabase
          .from('app_feedback')
          .select('id, moderation_status')
          .eq('user_id', user.id)
          .neq('moderation_status', 'hidden')
          .limit(1)
          .maybeSingle()
      
      if (reviewCheckError) {
        throw reviewCheckError
      }
      
      if (existingReview) {
        Alert.alert(
          'Review already submitted',
          `You already have a ${existingReview.moderation_status} review. ` +
            'Please wait for moderation before submitting another review.'
        )
        return
      }

      const { error } = await supabase.from('app_feedback').insert({
        user_id: user.id,
        rating,
        feedback_text: feedbackText.trim() || null,
      })

      if (error) {
        throw error
      }

      Alert.alert(
        'Review submitted!',
        'Thank you for reviewing BiteWise. Your review is now pending administrator approval.',
        [
          {
            text: 'Done',
            onPress: () => navigation.goBack(),
          },
        ]
      )
    } catch (error: any) {
      console.error('Submit feedback error:', error)

      Alert.alert(
        'Could not submit feedback',
        error?.message || 'Please try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }

    function navigateToTab(
  screen: keyof MainTabParamList
) {
  if (screen === 'Home') {
    navigation.reset({
      index: 0,
      routes: [
        {
          name: 'MainTabs',
          params: {
            screen: 'Home',
            params: {
              screen: 'HomeMain',
            },
          },
        },
      ],
    })

    return
  }

  if (screen === 'Meals') {
    navigation.reset({
      index: 0,
      routes: [
        {
          name: 'MainTabs',
          params: {
            screen: 'Meals',
          },
        },
      ],
    })

    return
  }

  if (screen === 'Wellness') {
    navigation.reset({
      index: 0,
      routes: [
        {
          name: 'MainTabs',
          params: {
            screen: 'Wellness',
          },
        },
      ],
    })

    return
  }

  if (screen === 'Progress') {
    navigation.reset({
      index: 0,
      routes: [
        {
          name: 'MainTabs',
          params: {
            screen: 'Progress',
          },
        },
      ],
    })

    return
  }

  navigation.reset({
    index: 0,
    routes: [
      {
        name: 'MainTabs',
        params: {
          screen: 'Profile',
        },
      },
    ],
  })
}

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.screen}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.backHomeButton}
              onPress={() => navigation.goBack()}
              accessibilityRole="button"
              accessibilityLabel="Go back to Home"
            >
              <Text style={styles.backHomeText}>‹ Home</Text>
            </TouchableOpacity>

            <Text style={styles.topBarTitle}>Feedback</Text>

            <View style={styles.topBarSpacer} />
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroIconCircle}>
              <Text style={styles.heroIcon}>💬</Text>
            </View>

            <Text style={styles.heroTitle}>Help us improve BiteWise</Text>

            <Text style={styles.heroText}>
              Tell us what is working well and what we can make better.
            </Text>
          </View>

          <View style={styles.feedbackCard}>
            
            {reviewStatus && (
              <View style={{ marginBottom: 16 }}>
                <Text style={{
                  color: '#1E5C35',
                  fontWeight: '800',
                  fontSize: 14,
                }}>
                  Your review: {reviewStatus.toUpperCase()}
                </Text>
            
                <Text style={styles.questionText}>
                  {reviewStatus === 'pending'
                    ? 'Your feedback is awaiting administrator approval.'
                    : reviewStatus === 'published'
                    ? 'Your review has been approved and is publicly visible.'
                    : 'Your review is not currently displayed publicly.'}
                </Text>
              </View>
            )}

            <Text style={styles.sectionEyebrow}>APPLICATION FEEDBACK</Text>

            <Text style={styles.questionTitle}>
              How would you rate BiteWise?
            </Text>

            <Text style={styles.questionText}>
              Tap a star to share your experience.
            </Text>

            <View style={styles.starRatingRow}>
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = rating !== null && star <= rating

                return (
                  <TouchableOpacity
                    key={star}
                    style={styles.starButton}
                    disabled={submitting || checkingReview || !!reviewStatus}
                    onPress={() => setRating(star)}
                    accessibilityRole="button"
                    accessibilityLabel={`${star} out of 5 stars`}
                    accessibilityState={{ selected: rating === star }}
                  >
                    <Text
                      style={[
                        styles.starIcon,
                        isFilled && styles.starIconFilled,
                      ]}
                    >
                      {isFilled ? '★' : '☆'}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            {rating ? (
              <Text style={styles.selectedRatingText}>
                {rating} out of 5 stars
              </Text>
            ) : null}

            <Text style={styles.fieldLabel}>
              Tell us more{' '}
              <Text style={styles.optionalText}>(optional)</Text>
            </Text>

            <TextInput
              style={styles.feedbackInput}
              value={feedbackText}
              onChangeText={setFeedbackText}
              editable={!submitting}
              multiline
              maxLength={800}
              placeholder="What do you enjoy? What should we improve?"
              placeholderTextColor="#8D8A9A"
              textAlignVertical="top"
            />

            <Text style={styles.characterCount}>
              {feedbackText.length}/800
            </Text>

            <TouchableOpacity
              style={[
                styles.submitButton,
                (!rating || submitting) && styles.submitButtonDisabled,
              ]}
              disabled={!rating || submitting}
              onPress={() => void submitFeedback()}
              accessibilityRole="button"
              accessibilityLabel="Submit feedback"
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Feedback</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.noteCard}>
            <Text style={styles.noteIcon}>✦</Text>

            <View style={styles.noteContent}>
              <Text style={styles.noteTitle}>Your voice matters</Text>

              <Text style={styles.noteText}>
                We review feedback to make BiteWise more useful for every
                member.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.bottomTabBar}>
        <TouchableOpacity
          style={styles.bottomTab}
          onPress={() => navigateToTab('Home')}
          accessibilityRole="button"
          accessibilityLabel="Go to Home"
        >
          <Text style={styles.bottomTabIcon}>🏠</Text>
          <Text style={styles.bottomTabLabel}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bottomTab}
          onPress={() => navigateToTab('Meals')}
          accessibilityRole="button"
          accessibilityLabel="Go to Meals"
        >
          <Text style={styles.bottomTabIcon}>🍽️</Text>
          <Text style={styles.bottomTabLabel}>Meals</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bottomTab}
          onPress={() => navigateToTab('Wellness')}
          accessibilityRole="button"
          accessibilityLabel="Go to Wellness"
        >
          <Text style={styles.bottomTabIcon}>💧</Text>
          <Text style={styles.bottomTabLabel}>Wellness</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bottomTab}
          onPress={() => navigateToTab('Progress')}
          accessibilityRole="button"
          accessibilityLabel="Go to Progress"
        >
          <Text style={styles.bottomTabIcon}>📈</Text>
          <Text style={styles.bottomTabLabel}>Progress</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bottomTab}
          onPress={() => navigateToTab('Profile')}
          accessibilityRole="button"
          accessibilityLabel="Go to Profile"
        >
          <Text style={styles.bottomTabIcon}>👤</Text>
          <Text style={styles.bottomTabLabel}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#F5FAF6',
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  screen: {
    backgroundColor: '#F5FAF6',
  },
  container: {
    backgroundColor: '#F5FAF6',
    flexGrow: 1,
    padding: 20,
    paddingBottom: 48,
    paddingTop: 8,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 40,
    justifyContent: 'space-between',
  },
  backHomeButton: {
    alignItems: 'flex-start',
    height: 40,
    justifyContent: 'center',
    width: 72,
  },
  backHomeText: {
    color: '#1E5C35',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
  },
  topBarTitle: {
    color: '#16281D',
    fontSize: 18,
    fontWeight: '800',
  },
  topBarSpacer: {
    height: 40,
    width: 72,
  },
  heroCard: {
    alignItems: 'center',
    backgroundColor: '#1E5C35',
    borderRadius: 20,
    marginTop: 20,
    paddingHorizontal: 22,
    paddingVertical: 24,
  },
  heroIconCircle: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  heroIcon: {
    fontSize: 27,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 13,
    textAlign: 'center',
  },
  heroText: {
    color: '#D8EADF',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
    textAlign: 'center',
  },
  feedbackCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DCE9E0',
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 16,
    padding: 18,
  },
  sectionEyebrow: {
    color: '#5C7267',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  questionTitle: {
    color: '#16281D',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 10,
  },
  questionText: {
    color: '#708277',
    fontSize: 13,
    marginTop: 5,
  },
  starRatingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 18,
  },
  starButton: {
    alignItems: 'center',
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  starIcon: {
    color: '#B7C8BC',
    fontSize: 38,
    lineHeight: 42,
  },
  starIconFilled: {
    color: '#D4A017',
  },
  selectedRatingText: {
    color: '#1E5C35',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 13,
    textAlign: 'center',
  },
  fieldLabel: {
    color: '#16281D',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 22,
  },
  optionalText: {
    color: '#708277',
    fontWeight: '500',
  },
  feedbackInput: {
    backgroundColor: '#F8FBF9',
    borderColor: '#C9DBD0',
    borderRadius: 12,
    borderWidth: 1,
    color: '#16281D',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    minHeight: 132,
    padding: 14,
  },
  characterCount: {
    color: '#708277',
    fontSize: 11,
    marginTop: 6,
    textAlign: 'right',
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: '#1E5C35',
    borderRadius: 12,
    justifyContent: 'center',
    marginTop: 18,
    minHeight: 52,
  },
  submitButtonDisabled: {
    backgroundColor: '#9ABAA4',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  noteCard: {
    alignItems: 'flex-start',
    backgroundColor: '#FFF8E7',
    borderColor: '#F2D68C',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 18,
    padding: 16,
  },
  noteIcon: {
    color: '#A46E00',
    fontSize: 19,
    marginRight: 11,
  },
  noteContent: {
    flex: 1,
  },
  noteTitle: {
    color: '#4C3400',
    fontSize: 13,
    fontWeight: '800',
  },
  noteText: {
    color: '#735817',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  bottomTabBar: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopColor: '#E2ECE6',
    borderTopWidth: 1,
    flexDirection: 'row',
    height: 68,
    justifyContent: 'space-around',
    paddingBottom: 8,
    paddingTop: 7,
  },
  bottomTab: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  bottomTabIcon: {
    fontSize: 19,
  },
  bottomTabLabel: {
    color: '#7C8F83',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
})
