import { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
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
import type { RootStackParamList } from '../types/navigation'
import { supabase } from '../services/supabase'

type Props = NativeStackScreenProps<RootStackParamList, 'CoachRatings'>

type Review = {
  client_id: string
  rating: number
  review_text: string | null
  updated_at: string | null
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String(error.message)
  }
  return 'Unable to load your ratings. Please try again.'
}

function reviewDate(value: string | null) {
  if (!value) return 'Date unavailable'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : date.toLocaleDateString()
}

export default function CoachRatingScreen({ navigation }: Props) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [filter, setFilter] = useState<number | null>(null)

  useFocusEffect(
    useCallback(() => {
      let active = true

      async function load() {
        try {
          setError('')
          const {
            data: { user },
            error: authError,
          } = await supabase.auth.getUser()

          if (authError) throw authError
          if (!user) throw new Error('Please log in again.')

          const result: Review[] = []
          const pageSize = 500
          let offset = 0

          while (true) {
            const { data, error: queryError } = await supabase
              .from('coach_reviews')
              .select('client_id, rating, review_text, updated_at')
              .eq('coach_id', user.id)
              .eq('moderation_status', 'published')
              .order('updated_at', { ascending: false })
              .order('client_id', { ascending: true })
              .range(offset, offset + pageSize - 1)


            if (queryError) throw queryError
            if (!active) return
            const page = data ?? []
            result.push(...page)
            if (page.length === 0) break
            offset += page.length
          }

          if (active) setReviews(result)
        } catch (err) {
          if (active) setError(errorMessage(err))
        } finally {
          if (active) {
            setLoading(false)
            setRefreshing(false)
          }
        }
      }

      void load()
      return () => {
        active = false
      }
    }, [reload])
  )

  const validReviews = useMemo(
    () => reviews.filter((review) => Number.isInteger(review.rating) && review.rating >= 1 && review.rating <= 5),
    [reviews]
  )

  const total = validReviews.length
  const average = total
    ? validReviews.reduce((sum, review) => sum + review.rating, 0) / total
    : 0

  const visible = filter === null
    ? validReviews
    : validReviews.filter((review) => review.rating === filter)

  function refresh() {
    if (refreshing) return
    setRefreshing(true)
    setReload((current) => current + 1)
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back to coach home"
        >
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Client Ratings</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor="#1E5C35"
          />
        }
      >
        <Text style={styles.title}>Your Coaching Feedback</Text>
        <Text style={styles.subtitle}>
          Read the ratings and reviews clients have shared with you.
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color="#1E5C35" />
        ) : error ? (
          <View style={styles.card}>
            <Text style={styles.heading}>Could not load ratings</Text>
            <Text style={styles.body}>{error}</Text>
            <Pressable style={styles.button} onPress={refresh}>
              <Text style={styles.buttonText}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.score}>
                {total ? average.toFixed(1) : '—'}
              </Text>
              <Text style={styles.stars}>
                {total ? '★'.repeat(Math.round(average)) + '☆'.repeat(5 - Math.round(average)) : '☆☆☆☆☆'}
              </Text>
              <Text style={styles.centerText}>
                {total ? `Out of 5 · ${total} ${total === 1 ? 'review' : 'reviews'}` : 'No ratings yet'}
              </Text>

              {[5, 4, 3, 2, 1].map((star) => {
                const count = validReviews.filter((review) => review.rating === star).length
                const percentage = total ? (count / total) * 100 : 0
                return (
                  <View key={star} style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>{star} ★</Text>
                    <View style={styles.track}>
                      <View style={[styles.fill, { width: `${percentage}%` }]} />
                    </View>
                    <Text style={styles.count}>{count}</Text>
                  </View>
                )
              })}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {[null, 5, 4, 3, 2, 1].map((value) => (
                <Pressable
                  key={value ?? 'all'}
                  onPress={() => setFilter(value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: filter === value }}
                  style={[styles.chip, filter === value && styles.activeChip]}
                >
                  <Text style={[styles.chipText, filter === value && styles.activeChipText]}>
                    {value === null ? 'All ratings' : `${value} ★`}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.sectionTitle}>
              Client reviews · {visible.length}
            </Text>

            {visible.length === 0 ? (
              <View style={styles.card}>
                <Text style={styles.heading}>
                  {total ? 'No reviews with this rating' : 'No client feedback yet'}
                </Text>
                <Text style={styles.body}>
                  {total ? 'Choose another star filter to view more reviews.' : 'Ratings will appear here after clients submit feedback.'}
                </Text>
              </View>
            ) : visible.map((review) => (
              <View key={review.client_id} style={styles.card}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.heading}>Client review</Text>
                  <Text style={styles.date}>{reviewDate(review.updated_at)}</Text>
                </View>
                <Text style={styles.reviewStars}>
                  {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                  {' '}({review.rating}/5)
                </Text>
                <Text style={styles.body}>
                  {review.review_text?.trim() || 'This client left a rating without written feedback.'}
                </Text>
              </View>
            ))}
            <Text style={styles.subtitle}>
              Dates show the latest review update. Each client can update their review of you.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5FAF6',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2ECE6',
  },
  back: {
    color: '#1E5C35',
    fontSize: 15,
    fontWeight: '800',
    paddingVertical: 8,
  },
  headerTitle: {
    color: '#16281D',
    fontSize: 18,
    fontWeight: '800',
  },
  content: {
    padding: 20,
    paddingBottom: 36,
  },
  title: {
    color: '#16281D',
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: '#5C7267',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 18,
  },
  card: {
    padding: 18,
    marginBottom: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2ECE6',
    borderRadius: 18,
  },
  score: {
    color: '#16281D',
    fontSize: 46,
    fontWeight: '800',
    textAlign: 'center',
  },
  stars: {
    color: '#D69A14',
    fontSize: 28,
    textAlign: 'center',
  },
  centerText: {
    color: '#5C7267',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 18,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  breakdownLabel: {
    width: 38,
    color: '#5C7267',
  },
  track: {
    flex: 1,
    height: 8,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#EAF0EC',
  },
  fill: {
    height: '100%',
    backgroundColor: '#DFA92C',
  },
  count: {
    width: 36,
    textAlign: 'right',
    color: '#5C7267',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#EAF3EC',
  },
  activeChip: {
    backgroundColor: '#1E5C35',
  },
  chipText: {
    color: '#1E5C35',
    fontWeight: '700',
  },
  activeChipText: {
    color: '#FFFFFF',
  },
  sectionTitle: {
    color: '#16281D',
    fontSize: 17,
    fontWeight: '800',
    marginVertical: 18,
  },
  heading: {
    color: '#16281D',
    fontSize: 15,
    fontWeight: '800',
    flexShrink: 1,
  },
  body: {
    color: '#5C7267',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    color: '#7C8F83',
    fontSize: 11,
    marginLeft: 12,
  },
  reviewStars: {
    color: '#B67E08',
    fontSize: 17,
    marginTop: 10,
  },
  button: {
    backgroundColor: '#1E5C35',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
})
