import { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { CompositeNavigationProp } from '@react-navigation/native'

import { supabase } from '../services/supabase'
import type { MainTabParamList, RootStackParamList } from '../types/navigation'

type ProgressNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Progress'>,
  NativeStackNavigationProp<RootStackParamList>
>

type WaterLog = {
  id: string
  amount_ml: number | null
  logged_at: string
}

type ExerciseLog = {
  id: string
  exercise_type: string
  activity_name: string | null
  duration_minutes: number | null
  distance_km: number | null
  sets: number | null
  repetitions_per_set: number | null
  weight_kg: number | null
  calories_burned: number | null
  logged_at: string
}

type DayActivity = {
  key: string
  label: string
  date: string
  sessions: number
  duration: number
  isToday: boolean
}

const DAILY_WATER_TARGET = 2500
const MAX_RECENT_ACTIVITIES = 5

function getStartOfToday() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function getWeekStartDate() {
  const today = getStartOfToday()
  const day = today.getDay()

  // Monday is the first day of the week.
  const daysSinceMonday = day === 0 ? 6 : day - 1
  today.setDate(today.getDate() - daysSinceMonday)

  return today
}

function formatNumber(value: number | null | undefined) {
  const numberValue = Number(value ?? 0)

  if (!Number.isFinite(numberValue)) return '0'

  return Number.isInteger(numberValue)
    ? String(numberValue)
    : numberValue.toFixed(1)
}

function formatShortDate(dateString: string) {
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(dateString))
}

function formatDateTime(dateString: string) {
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(dateString))
}

function getDayKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getExerciseCategory(log: ExerciseLog) {
  const isStrength =
    log.sets !== null ||
    log.repetitions_per_set !== null ||
    log.weight_kg !== null

  return isStrength ? 'Strength' : 'Cardio'
}

function getExerciseSummary(log: ExerciseLog) {
  const isStrength = getExerciseCategory(log) === 'Strength'

  if (isStrength) {
    const parts = [
      log.sets ? `${log.sets} sets` : null,
      log.repetitions_per_set ? `${log.repetitions_per_set} reps` : null,
      log.weight_kg ? `${formatNumber(log.weight_kg)} kg` : null,
    ].filter(Boolean)

    return parts.length > 0 ? parts.join(' · ') : 'Strength workout'
  }

  const parts = [
    log.distance_km ? `${formatNumber(log.distance_km)} km` : null,
    log.duration_minutes ? `${log.duration_minutes} min` : null,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(' · ') : 'Cardio workout'
}

function buildWeekDays(exerciseLogs: ExerciseLog[]): DayActivity[] {
  const today = getStartOfToday()
  const weekStart = getWeekStartDate()

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + index)

    const dayKey = getDayKey(date)

    const dayLogs = exerciseLogs.filter((log) => {
      const logDate = new Date(log.logged_at)
      return getDayKey(logDate) === dayKey
    })

    const dayDuration = dayLogs.reduce(
      (total, log) => total + Number(log.duration_minutes ?? 0),
      0
    )

    return {
      key: dayKey,
      label: new Intl.DateTimeFormat('en-US', {
        weekday: 'narrow',
      }).format(date),
      date: dayKey,
      sessions: dayLogs.length,
      duration: dayDuration,
      isToday: getDayKey(today) === dayKey,
    }
  })
}

export default function ProgressScreen() {
  const navigation = useNavigation<ProgressNavigationProp>()

  const [waterLogs, setWaterLogs] = useState<WaterLog[]>([])
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadProgressData = useCallback(async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        setWaterLogs([])
        setExerciseLogs([])
        return
      }

      const weekStart = getWeekStartDate()

      const [waterResult, exerciseResult] = await Promise.all([
        supabase
          .from('water_logs')
          .select('id, amount_ml, logged_at')
          .eq('user_id', user.id)
          .gte('logged_at', weekStart.toISOString())
          .order('logged_at', { ascending: false }),

        supabase
          .from('exercise_logs')
          .select(`
            id,
            exercise_type,
            activity_name,
            duration_minutes,
            distance_km,
            sets,
            repetitions_per_set,
            weight_kg,
            calories_burned,
            logged_at
          `)
          .eq('user_id', user.id)
          .gte('logged_at', weekStart.toISOString())
          .order('logged_at', { ascending: false }),
      ])

      if (waterResult.error) {
        throw waterResult.error
      }

      if (exerciseResult.error) {
        throw exerciseResult.error
      }

      setWaterLogs((waterResult.data ?? []) as WaterLog[])
      setExerciseLogs((exerciseResult.data ?? []) as ExerciseLog[])
    } catch (error) {
      console.error('Could not load progress data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      void loadProgressData()
    }, [loadProgressData])
  )

  async function handleRefresh() {
    setRefreshing(true)
    await loadProgressData()
    setRefreshing(false)
  }

  const todayWater = useMemo(() => {
    const todayKey = getDayKey(getStartOfToday())

    return waterLogs
      .filter((log) => getDayKey(new Date(log.logged_at)) === todayKey)
      .reduce((total, log) => total + Number(log.amount_ml ?? 0), 0)
  }, [waterLogs])

  const waterProgress = Math.min(todayWater / DAILY_WATER_TARGET, 1)

  const totalExerciseSessions = exerciseLogs.length

  const totalExerciseMinutes = useMemo(() => {
    return exerciseLogs.reduce(
      (total, log) => total + Number(log.duration_minutes ?? 0),
      0
    )
  }, [exerciseLogs])

  const cardioSessions = useMemo(() => {
    return exerciseLogs.filter(
      (log) => getExerciseCategory(log) === 'Cardio'
    ).length
  }, [exerciseLogs])

  const strengthSessions = useMemo(() => {
    return exerciseLogs.filter(
      (log) => getExerciseCategory(log) === 'Strength'
    ).length
  }, [exerciseLogs])

  const totalCalories = useMemo(() => {
    return exerciseLogs.reduce(
      (total, log) => total + Number(log.calories_burned ?? 0),
      0
    )
  }, [exerciseLogs])

  const weekDays = useMemo(() => buildWeekDays(exerciseLogs), [exerciseLogs])

  const maxSessionsInADay = Math.max(
    ...weekDays.map((day) => day.sessions),
    1
  )

  const recentActivities = useMemo(() => {
    return exerciseLogs.slice(0, MAX_RECENT_ACTIVITIES)
  }, [exerciseLogs])

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E5C35" />
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor="#1E5C35"
        />
      }
    >
      <View style={styles.topBar}>
  <TouchableOpacity
    style={styles.backHomeButton}
    onPress={() =>
      navigation.navigate('Home', {
        screen: 'HomeMain',
      })
    }
    accessibilityRole="button"
    accessibilityLabel="Go to Home"
  >
    <Text style={styles.backHomeText}>‹ Home</Text>
  </TouchableOpacity>

  <Text style={styles.topBarTitle}>Progress</Text>

  <View style={styles.topBarSpacer} />
</View>

<Text style={styles.screenSubtitle}>
  A simple overview of your wellness this week.
</Text>

      <View style={styles.freePlanBadge}>
        <Text style={styles.freePlanBadgeText}>FREE PLAN</Text>
        <Text style={styles.freePlanText}>
          Your basic weekly wellness summary
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Today</Text>

      <View style={styles.waterCard}>
        <View style={styles.waterCardTop}>
          <View style={styles.iconCircle}>
            <Text style={styles.cardIcon}>💧</Text>
          </View>

          <View style={styles.waterContent}>
            <Text style={styles.cardLabel}>Water intake</Text>
            <Text style={styles.waterAmount}>
              {todayWater.toLocaleString()} ml
            </Text>
            <Text style={styles.cardHelper}>
              Goal: {DAILY_WATER_TARGET.toLocaleString()} ml
            </Text>
          </View>
        </View>

        <View
          style={styles.progressTrack}
          accessibilityRole="progressbar"
          accessibilityLabel="Today's water intake"
          accessibilityValue={{
            min: 0,
            max: DAILY_WATER_TARGET,
            now: todayWater,
            text: `${todayWater} of ${DAILY_WATER_TARGET} millilitres`,
          }}
        >
          <View
            style={[
              styles.progressFill,
              { width: `${waterProgress * 100}%` },
            ]}
          />
        </View>

        <Text style={styles.progressText}>
          {Math.round(waterProgress * 100)}% of today&apos;s target
        </Text>
      </View>

      <Text style={styles.sectionTitle}>This week</Text>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>🏃</Text>
          <Text style={styles.statValue}>{totalExerciseSessions}</Text>
          <Text style={styles.statLabel}>Exercise sessions</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statIcon}>⏱</Text>
          <Text style={styles.statValue}>{totalExerciseMinutes}</Text>
          <Text style={styles.statLabel}>Active minutes</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statIcon}>❤️</Text>
          <Text style={styles.statValue}>{cardioSessions}</Text>
          <Text style={styles.statLabel}>Cardio sessions</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statIcon}>🏋️</Text>
          <Text style={styles.statValue}>{strengthSessions}</Text>
          <Text style={styles.statLabel}>Strength sessions</Text>
        </View>
      </View>

      <View style={styles.weekCard}>
        <View style={styles.weekCardHeader}>
          <View>
            <Text style={styles.cardHeading}>Weekly activity</Text>
            <Text style={styles.cardDescription}>
              Sessions logged from Monday to Sunday
            </Text>
          </View>

          <Text style={styles.weekSessionTotal}>
            {totalExerciseSessions} total
          </Text>
        </View>

        <View style={styles.weekChart}>
          {weekDays.map((day) => {
            const heightPercentage =
              day.sessions === 0
                ? 8
                : Math.max((day.sessions / maxSessionsInADay) * 100, 20)

            return (
              <View key={day.key} style={styles.dayColumn}>
                <Text style={styles.daySessionText}>
                  {day.sessions > 0 ? day.sessions : ''}
                </Text>

                <View style={styles.barArea}>
                  <View
                    style={[
                      styles.dayBar,
                      day.isToday && styles.dayBarToday,
                      { height: `${heightPercentage}%` },
                    ]}
                    accessibilityRole="progressbar"
                    accessibilityLabel={`${day.label}: ${day.sessions} exercise sessions`}
                    accessibilityValue={{
                      min: 0,
                      max: maxSessionsInADay,
                      now: day.sessions,
                      text: `${day.sessions} session${day.sessions === 1 ? '' : 's'}`,
                    }}
                  />
                </View>

                <Text
                  style={[
                    styles.dayLabel,
                    day.isToday && styles.dayLabelToday,
                  ]}
                >
                  {day.label}
                </Text>
              </View>
            )
          })}
        </View>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryIconCircle}>
          <Text style={styles.summaryIcon}>✨</Text>
        </View>

        <View style={styles.summaryContent}>
          <Text style={styles.cardHeading}>Weekly summary</Text>
          <Text style={styles.summaryText}>
            You logged {totalExerciseSessions} exercise
            {totalExerciseSessions === 1 ? ' session' : ' sessions'} and{' '}
            {totalExerciseMinutes} active minutes this week.
          </Text>

          {totalCalories > 0 ? (
            <Text style={styles.summaryHighlight}>
              Estimated calories burned: {Math.round(totalCalories)} kcal
            </Text>
          ) : (
            <Text style={styles.summaryHighlight}>
              Add calories when logging workouts to see your estimate here.
            </Text>
          )}
        </View>
      </View>

      <View style={styles.recentHeaderRow}>
        <Text style={styles.sectionTitle}>Recent activity</Text>

        <TouchableOpacity
          onPress={() => navigation.navigate('Wellness')}
          accessibilityRole="button"
          accessibilityLabel="View and manage exercise history in Wellness"
        >
          <Text style={styles.manageHistoryText}>Manage</Text>
        </TouchableOpacity>
      </View>

      {recentActivities.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>🌱</Text>
          <Text style={styles.emptyTitle}>No exercise logged this week</Text>
          <Text style={styles.emptyText}>
            Start by logging a cardio or strength workout in Wellness.
          </Text>

          <TouchableOpacity
            style={styles.logExerciseButton}
            onPress={() => navigation.navigate('Wellness')}
            accessibilityRole="button"
          >
            <Text style={styles.logExerciseButtonText}>Go to Wellness</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.activityList}>
          {recentActivities.map((activity) => {
            const category = getExerciseCategory(activity)
            const isStrength = category === 'Strength'

            return (
              <View key={activity.id} style={styles.activityRow}>
                <View
                  style={[
                    styles.activityIconCircle,
                    isStrength
                      ? styles.activityIconStrength
                      : styles.activityIconCardio,
                  ]}
                >
                  <Text style={styles.activityIcon}>
                    {isStrength ? '🏋️' : '🏃'}
                  </Text>
                </View>

                <View style={styles.activityInfo}>
                  <Text style={styles.activityName}>
                    {activity.activity_name || activity.exercise_type}
                  </Text>

                  <Text style={styles.activityDetails}>
                    {getExerciseSummary(activity)}
                  </Text>

                  <Text style={styles.activityDate}>
                    {formatDateTime(activity.logged_at)}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.activityCategory,
                    isStrength
                      ? styles.activityCategoryStrength
                      : styles.activityCategoryCardio,
                  ]}
                >
                  {category}
                </Text>
              </View>
            )
          })}
        </View>
      )}

      <View style={styles.premiumCard}>
        <View style={styles.premiumIconCircle}>
          <Text style={styles.premiumIcon}>✦</Text>
        </View>

        <View style={styles.premiumContent}>
          <Text style={styles.premiumTitle}>More progress insights later</Text>
          <Text style={styles.premiumText}>
            Premium can unlock monthly trends, goals, detailed charts, and
            personalised recommendations.
          </Text>
        </View>
      </View>

      <TouchableOpacity
  style={styles.goPremiumButton}
  onPress={() =>
    Alert.alert(
      'BiteWise Premium',
      'Premium features are coming soon. They will include detailed charts, longer-term trends, and personalised wellness insights.'
    )
  }
  accessibilityRole="button"
  accessibilityLabel="Go Premium"
  accessibilityHint="Learn about upcoming BiteWise Premium features"
>
  <Text style={styles.goPremiumStar}>✦</Text>
  <Text style={styles.goPremiumButtonText}>Go Premium</Text>
</TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F5FAF6',
  },
  container: {
  backgroundColor: '#F5FAF6',
  flexGrow: 1,
  padding: 20,
  paddingBottom: 40,
  paddingTop: 52,
},
  loadingContainer: {
    alignItems: 'center',
    backgroundColor: '#F5FAF6',
    flex: 1,
    justifyContent: 'center',
  },

  freePlanBadge: {
    alignItems: 'center',
    backgroundColor: '#EAF3EC',
    borderColor: '#C9DBD0',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  freePlanBadgeText: {
    color: '#1E5C35',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.7,
    marginRight: 10,
  },
  freePlanText: {
    color: '#5C7267',
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    color: '#5C7267',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginTop: 25,
    textTransform: 'uppercase',
  },
  waterCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DCE9E0',
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 10,
    padding: 18,
  },
  waterCardTop: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  iconCircle: {
    alignItems: 'center',
    backgroundColor: '#D9ECDF',
    borderRadius: 25,
    height: 50,
    justifyContent: 'center',
    marginRight: 13,
    width: 50,
  },
  cardIcon: {
    fontSize: 25,
  },
  waterContent: {
    flex: 1,
  },
  cardLabel: {
    color: '#5C7267',
    fontSize: 13,
    fontWeight: '700',
  },
  waterAmount: {
    color: '#1E5C35',
    fontSize: 25,
    fontWeight: '800',
    marginTop: 2,
  },
  cardHelper: {
    color: '#708277',
    fontSize: 11,
    marginTop: 2,
  },
  progressTrack: {
    backgroundColor: '#E2ECE6',
    borderRadius: 999,
    height: 10,
    marginTop: 18,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    backgroundColor: '#1E5C35',
    borderRadius: 999,
    height: '100%',
  },
  progressText: {
    color: '#708277',
    fontSize: 12,
    marginTop: 7,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  statCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#DCE9E0',
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 136,
    paddingHorizontal: 10,
    paddingVertical: 16,
    width: '48.5%',
  },
  statIcon: {
    fontSize: 22,
  },
  statValue: {
    color: '#1E5C35',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 8,
  },
  statLabel: {
    color: '#5C7267',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
    textAlign: 'center',
  },
  weekCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DCE9E0',
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 14,
    padding: 18,
  },
  weekCardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardHeading: {
    color: '#16281D',
    fontSize: 16,
    fontWeight: '800',
  },
  cardDescription: {
    color: '#708277',
    fontSize: 11,
    marginTop: 4,
  },
  weekSessionTotal: {
    color: '#1E5C35',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  weekChart: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    height: 160,
    justifyContent: 'space-between',
    marginTop: 20,
  },
  dayColumn: {
    alignItems: 'center',
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  daySessionText: {
    color: '#1E5C35',
    fontSize: 11,
    fontWeight: '800',
    height: 16,
    marginBottom: 4,
  },
  barArea: {
    alignItems: 'center',
    height: 95,
    justifyContent: 'flex-end',
    width: '100%',
  },
  dayBar: {
    backgroundColor: '#BFD8C6',
    borderRadius: 999,
    minHeight: 7,
    width: 16,
  },
  dayBarToday: {
    backgroundColor: '#1E5C35',
  },
  dayLabel: {
    color: '#708277',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 8,
  },
  dayLabelToday: {
    color: '#1E5C35',
    fontWeight: '900',
  },
  summaryCard: {
    alignItems: 'flex-start',
    backgroundColor: '#EAF3EC',
    borderColor: '#C9DBD0',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 14,
    padding: 16,
  },
  summaryIconCircle: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    marginRight: 12,
    width: 44,
  },
  summaryIcon: {
    fontSize: 21,
  },
  summaryContent: {
    flex: 1,
  },
  summaryText: {
    color: '#40594B',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
  summaryHighlight: {
    color: '#1E5C35',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18,
    marginTop: 8,
  },
  recentHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  manageHistoryText: {
    color: '#1E5C35',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 25,
  },
  activityList: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DCE9E0',
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 10,
    overflow: 'hidden',
  },
  activityRow: {
    alignItems: 'center',
    borderBottomColor: '#E2ECE6',
    borderBottomWidth: 1,
    flexDirection: 'row',
    padding: 14,
  },
  activityIconCircle: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    marginRight: 11,
    width: 40,
  },
  activityIconCardio: {
    backgroundColor: '#D9ECDF',
  },
  activityIconStrength: {
    backgroundColor: '#EAF3EC',
  },
  activityIcon: {
    fontSize: 19,
  },
  activityInfo: {
    flex: 1,
    paddingRight: 8,
  },
  activityName: {
    color: '#16281D',
    fontSize: 14,
    fontWeight: '800',
  },
  activityDetails: {
    color: '#1E5C35',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
  activityDate: {
    color: '#708277',
    fontSize: 11,
    marginTop: 3,
  },
  activityCategory: {
    borderRadius: 999,
    fontSize: 10,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  activityCategoryCardio: {
    backgroundColor: '#D9ECDF',
    color: '#1E5C35',
  },
  activityCategoryStrength: {
    backgroundColor: '#EAF3EC',
    color: '#1E5C35',
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#DCE9E0',
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 10,
    padding: 24,
  },
  emptyIcon: {
    fontSize: 30,
  },
  emptyTitle: {
    color: '#16281D',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 10,
  },
  emptyText: {
    color: '#708277',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
    textAlign: 'center',
  },
  logExerciseButton: {
    alignItems: 'center',
    backgroundColor: '#1E5C35',
    borderRadius: 10,
    justifyContent: 'center',
    marginTop: 16,
    minHeight: 44,
    paddingHorizontal: 18,
  },
  logExerciseButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  premiumCard: {
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderColor: '#C9DBD0',
    borderRadius: 18,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    flexDirection: 'row',
    marginTop: 24,
    padding: 16,
  },
  premiumIconCircle: {
    alignItems: 'center',
    backgroundColor: '#FFF4D6',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    marginRight: 12,
    width: 40,
  },
  premiumIcon: {
    fontSize: 19,
  },
  premiumContent: {
    flex: 1,
  },
  premiumTitle: {
    color: '#16281D',
    fontSize: 14,
    fontWeight: '800',
  },
  premiumText: {
    color: '#708277',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  goPremiumButton: {
  alignItems: 'center',
  backgroundColor: '#D4A017',
  borderColor: '#B7791F',
  borderRadius: 14,
  borderWidth: 1,
  flexDirection: 'row',
  justifyContent: 'center',
  marginTop: 18,
  minHeight: 52,
  paddingHorizontal: 18,
  shadowColor: '#8A6500',
  shadowOffset: {
    width: 0,
    height: 3,
  },
  shadowOpacity: 0.2,
  shadowRadius: 5,
  elevation: 3,
},
goPremiumStar: {
  fontSize: 18,
  marginRight: 8,
},
goPremiumButtonText: {
  color: '#FFFFFF',
  fontSize: 15,
  fontWeight: '900',
  letterSpacing: 0.2,
},
topBar: {
  alignItems: 'center',
  flexDirection: 'row',
  height: 70,
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
screenSubtitle: {
  color: '#5C7267',
  fontSize: 13,
  lineHeight: 18,
  marginTop: 10,
  textAlign: 'center',
},
})