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

type Props = NativeStackScreenProps<RootStackParamList, 'CoachContentStatus'>
type ContentType = 'meal' | 'workout'
type Item = {
  id: string
  type: ContentType
  title: string
  clientId: string
  status: string
  feedback: string
  submittedAt: string
  reviewedAt: string
  updatedAt: string
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  pending_review: 'Pending review',
  approved: 'Approved',
  rejected: 'Rejected',
  changes_requested: 'Changes requested',
  active: 'Active',
}

function message(error: unknown): string {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message)
  }
  return 'Unable to load content. Please try again.'
}

function text(row: Record<string, unknown>, key: string): string {
  return typeof row[key] === 'string' ? row[key] as string : ''
}

function date(value: string): string {
  if (!value) return 'Not recorded'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? 'Not recorded' : parsed.toLocaleDateString()
}

async function fetchPlans(
  table: 'meal_plans' | 'workout_plans',
  type: ContentType,
  coachId: string
): Promise<Item[]> {
  const result: Item[] = []
  let offset = 0

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('coach_id', coachId)
      .order('id', { ascending: true })
      .range(offset, offset + 499)

    if (error) throw error
    const page = data ?? []
    if (page.length === 0) break

    for (const entry of page) {
      const row = entry as Record<string, unknown>
      result.push({
        id: text(row, 'id'),
        type,
        title: text(row, 'title') || 'Untitled plan',
        clientId: text(row, 'client_id'),
        status: text(row, 'status') || 'unknown',
        feedback: text(row, 'admin_feedback'),
        submittedAt: text(row, 'submitted_at'),
        reviewedAt: text(row, 'reviewed_at'),
        updatedAt: text(row, 'updated_at'),
      })
    }

    offset += page.length
  }

  return result
}

export default function CoachContentStatusScreen({ navigation }: Props) {
  const [items, setItems] = useState<Item[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [reload, setReload] = useState(0)
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  useFocusEffect(
    useCallback(() => {
      let active = true

      async function load() {
        try {
          const {
            data: { user },
            error: authError,
          } = await supabase.auth.getUser()

          if (authError) throw authError
          if (!user) throw new Error('Please log in again.')

          const results = await Promise.all([
            fetchPlans('meal_plans', 'meal', user.id)
              .then((rows) => ({ rows, error: '' }))
              .catch((error: unknown) => ({ rows: [] as Item[], error: `Meal plans: ${message(error)}` })),
            fetchPlans('workout_plans', 'workout', user.id)
              .then((rows) => ({ rows, error: '' }))
              .catch((error: unknown) => ({ rows: [] as Item[], error: `Workout plans: ${message(error)}` })),
          ])

          if (active) {
            setItems(results.flatMap((result) => result.rows).sort((a, b) => {
              const first = Date.parse(a.updatedAt || a.submittedAt) || 0
              const second = Date.parse(b.updatedAt || b.submittedAt) || 0
              return second - first
            }))
            setErrors(results.map((result) => result.error).filter(Boolean))
          }
        } catch (error) {
          if (active) {
            setItems([])
            setErrors([message(error)])
          }
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

  const visible = useMemo(() => items.filter((item) => (
    (statusFilter === 'all' || item.status === statusFilter) &&
    (typeFilter === 'all' || item.type === typeFilter)
  )), [items, statusFilter, typeFilter])

  function refresh() {
    if (refreshing) return
    setRefreshing(true)
    setReload((current) => current + 1)
  }

  const filters = [
    ['all', 'All statuses'],
    ['pending_review', 'Pending review'],
    ['approved', 'Approved'],
    ['rejected', 'Rejected'],
    ['changes_requested', 'Changes requested'],
    ['draft', 'Drafts'],
    ['active', 'Active'],
  ]

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#1E5C35" />
        }
      >
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button">
          <Text style={styles.link}>‹ Back</Text>
        </Pressable>

        <Text style={styles.title}>Content Status</Text>
        <Text style={styles.subtitle}>
          Track your meal plans and workouts through administrator review.
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color="#1E5C35" />
        ) : (
          <>
            {errors.length > 0 && (
              <View style={styles.notice}>
                <Text style={styles.heading}>Some content could not be loaded</Text>
                {errors.map((error) => <Text key={error} style={styles.body}>{error}</Text>)}
                <Text style={styles.body}>Counts below cover successfully loaded records only.</Text>
                <Pressable onPress={refresh}><Text style={styles.link}>Retry</Text></Pressable>
              </View>
            )}

            <View style={styles.summary}>
              {[
                ['pending_review', 'Pending'],
                ['approved', 'Approved'],
                ['rejected', 'Rejected'],
              ].map(([status, label]) => (
                <Pressable
                  key={status}
                  style={styles.metric}
                  onPress={() => {
                    setTypeFilter('all')
                    setStatusFilter(status)
                  }}
                >
                  <Text style={styles.number}>{items.filter((item) => item.status === status).length}</Text>
                  <Text style={styles.small}>{label}</Text>
                </Pressable>
              ))}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {[
                ['all', 'All types'],
                ['meal', 'Meal plans'],
                ['workout', 'Workouts'],
                ['recipe', 'Recipes'],
              ].map(([value, label]) => (
                <Pressable
                  key={value}
                  onPress={() => setTypeFilter(value)}
                  style={[styles.chip, typeFilter === value && styles.selected]}
                  accessibilityState={{ selected: typeFilter === value }}
                >
                  <Text style={[styles.chipText, typeFilter === value && styles.selectedText]}>{label}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {filters.map(([value, label]) => (
                <Pressable
                  key={value}
                  onPress={() => setStatusFilter(value)}
                  style={[styles.chip, statusFilter === value && styles.selected]}
                  accessibilityState={{ selected: statusFilter === value }}
                >
                  <Text style={[styles.chipText, statusFilter === value && styles.selectedText]}>{label}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.notice}>
              <Text style={styles.heading}>Recipes: submission not connected</Text>
              <Text style={styles.body}>
                Recipe drafts are stored on this device. They have not been sent to an administrator and are not included in review counts.
              </Text>
              <Pressable onPress={() => navigation.navigate('CoachRecipes')}>
                <Text style={styles.link}>Manage recipe drafts ›</Text>
              </Pressable>
            </View>

            {typeFilter !== 'recipe' && (
              <>
                <Text style={styles.section}>{visible.length} matching plans</Text>
                {visible.length === 0 ? (
                  <View style={styles.card}>
                    <Text style={styles.heading}>No matching plans</Text>
                    <Text style={styles.body}>Try another filter, or pull down to reload review decisions.</Text>
                  </View>
                ) : visible.map((item) => {
                  const key = `${item.type}:${item.id}`
                  const open = expanded === key
                  return (
                    <View key={key} style={styles.card}>
                      <Text style={styles.small}>{item.type === 'meal' ? 'MEAL PLAN' : 'WORKOUT PLAN'}</Text>
                      <Text style={styles.heading}>{item.title}</Text>
                      <Text style={styles.badge}>
                        {STATUS_LABELS[item.status] || `Status: ${item.status}`}
                      </Text>
                      <Text style={styles.body}>
                        {item.status === 'draft' ? 'Private draft — not submitted' : `Submitted: ${date(item.submittedAt)}`}
                      </Text>
                      {item.feedback.trim() ? (
                        <View style={styles.notice}>
                          <Text style={styles.heading}>Administrator feedback</Text>
                          <Text style={styles.body}>{item.feedback}</Text>
                        </View>
                      ) : null}
                      <Pressable
                        onPress={() => setExpanded(open ? null : key)}
                        accessibilityRole="button"
                        accessibilityState={{ expanded: open }}
                      >
                        <Text style={styles.link}>{open ? 'Hide details' : 'Show status details'}</Text>
                      </Pressable>
                      {open && (
                        <View>
                          <Text style={styles.body}>Plan ID: {item.id}</Text>
                          <Text style={styles.body}>Client ID: {item.clientId || 'Not recorded'}</Text>
                          <Text style={styles.body}>Reviewed: {date(item.reviewedAt)}</Text>
                          <Text style={styles.body}>Updated: {date(item.updatedAt)}</Text>
                          <Text style={styles.body}>
                            This screen is read-only. Approval does not by itself confirm release to the client.
                          </Text>
                        </View>
                      )}
                    </View>
                  )
                })}
              </>
            )}
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
  content: {
    padding: 20,
    paddingBottom: 36,
  },
  title: {
    color: '#16281D',
    fontSize: 27,
    fontWeight: '800',
    marginTop: 12,
  },
  subtitle: {
    color: '#5C7267',
    fontSize: 14,
    lineHeight: 21,
    marginVertical: 12,
  },
  card: {
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2ECE6',
  },
  heading: {
    color: '#16281D',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 6,
  },
  body: {
    color: '#5C7267',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 7,
  },
  small: {
    color: '#5C7267',
    fontSize: 11,
    fontWeight: '700',
  },
  link: {
    color: '#1E5C35',
    fontSize: 14,
    fontWeight: '800',
    paddingVertical: 12,
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 16,
  },
  metric: {
    width: '31%',
    padding: 14,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
  },
  number: {
    color: '#1E5C35',
    fontSize: 25,
    fontWeight: '800',
    marginBottom: 5,
  },
  chip: {
    backgroundColor: '#EAF3EC',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginRight: 8,
    marginBottom: 12,
  },
  selected: {
    backgroundColor: '#1E5C35',
  },
  chipText: {
    color: '#1E5C35',
    fontWeight: '700',
    fontSize: 12,
  },
  selectedText: {
    color: '#FFFFFF',
  },
  notice: {
    backgroundColor: '#FFF7E5',
    padding: 14,
    borderRadius: 14,
    marginVertical: 12,
  },
  section: {
    color: '#16281D',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 14,
  },
  badge: {
    color: '#1E5C35',
    backgroundColor: '#EAF3EC',
    alignSelf: 'flex-start',
    padding: 8,
    borderRadius: 8,
    marginTop: 10,
    fontSize: 12,
    fontWeight: '700',
  },
})
