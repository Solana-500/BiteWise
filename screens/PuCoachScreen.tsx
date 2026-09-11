import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { supabase } from '../services/supabase'

type Props = {
  navigation: any
}

type CoachProfile = {
  id: string
  full_name: string | null
  app_role: 'user' | 'coach' | 'admin' | null
}

type CoachActionCardProps = {
  title: string
  subtitle: string
  onPress: () => void
}

function CoachActionCard({
  title,
  subtitle,
  onPress,
}: CoachActionCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.actionCard,
        pressed && styles.pressedCard,
      ]}
      onPress={onPress}
    >
      <View style={styles.actionTextBlock}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>

      <Text style={styles.chevron}>›</Text>
    </Pressable>
  )
}

export default function PuCoachScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true)
  const [coach, setCoach] = useState<CoachProfile | null>(null)

  useEffect(() => {
    void loadAssignedCoach()
  }, [])

  async function loadAssignedCoach() {
  try {
    setLoading(true)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      throw userError
    }

    if (!user) {
      console.error('No authenticated user found.')
      setCoach(null)
      return
    }

    console.log('Logged-in premium user ID:', user.id)

    const { data: userProfile, error: userProfileError } = await supabase
      .from('profiles')
      .select('id, full_name, assigned_coach_id')
      .eq('id', user.id)
      .maybeSingle<{
        id: string
        full_name: string | null
        assigned_coach_id: string | null
      }>()

    if (userProfileError) {
      throw userProfileError
    }

    console.log('Premium user profile:', userProfile)
    console.log('Assigned coach ID:', userProfile?.assigned_coach_id)

    if (!userProfile?.assigned_coach_id) {
      console.log('This premium user does not have an assigned_coach_id.')
      setCoach(null)
      return
    }

    const { data: coachProfile, error: coachError } = await supabase
      .from('profiles')
      .select('id, full_name, app_role')
      .eq('id', userProfile.assigned_coach_id)
      .maybeSingle<CoachProfile>()

    if (coachError) {
      throw coachError
    }

    console.log('Assigned coach profile:', coachProfile)

    if (!coachProfile) {
      console.log(
        'Coach was not found or is hidden by RLS. Compare assigned_coach_id with the coach profiles.id.'
      )
      setCoach(null)
      return
    }

    if (coachProfile.app_role !== 'coach') {
      console.log(
        'The assigned_coach_id points to a profile that is not marked as app_role = coach:',
        coachProfile
      )
      setCoach(null)
      return
    }

    setCoach(coachProfile)
  } catch (error) {
    console.error('Unable to load assigned coach:', error)
    setCoach(null)
  } finally {
    setLoading(false)
  }
}

  const coachInitials =
    coach?.full_name
      ?.trim()
      .split(/\s+/)
      .map((name) => name.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'HC'

  function showComingSoon(title: string) {
    Alert.alert(title, 'This premium feature will be available soon.')
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#1E5C35" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable
          hitSlop={12}
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </Pressable>

        <Text style={styles.topBarTitle}>Health Coach</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {coach ? (
          <>
            <View style={styles.coachCard}>
              <View style={styles.coachAvatar}>
                <Text style={styles.coachAvatarText}>{coachInitials}</Text>
              </View>

              <View style={styles.coachDetails}>
                <Text style={styles.coachName}>
                  {coach.full_name || 'Coach'}
                </Text>

                <Text style={styles.coachSpecialty}>
                  Health and nutrition coach
                </Text>

                <View style={styles.premiumCoachChip}>
                  <Text style={styles.premiumCoachChipText}>
                    PREMIUM COACH
                  </Text>
                </View>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.viewProfileButton,
                  pressed && styles.pressedButton,
                ]}
                onPress={() => showComingSoon('Coach Profile')}
              >
                <Text style={styles.viewProfileText}>View Profile</Text>
              </Pressable>
            </View>

            <CoachActionCard
              title="View Coach Meal Plan"
              subtitle="See your coach’s meal plan"
              onPress={() => showComingSoon('Coach Meal Plan')}
            />

            <CoachActionCard
              title="View Coach Recipes"
              subtitle="View and search recipes created by your coach"
              onPress={() => showComingSoon('Coach Recipes')}
            />

            <CoachActionCard
              title="View Coach Workout Plan"
              subtitle="See your assigned workout plan"
              onPress={() => showComingSoon('Coach Workout Plan')}
            />

            <View style={styles.coachNoteCard}>
              <Text style={styles.coachNoteTitle}>About your coach</Text>

              <Text style={styles.coachNoteText}>
                Your coach can help you stay consistent with your nutrition,
                fitness, and wellness goals.
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Text style={styles.emptyIcon}>♙</Text>
            </View>

            <Text style={styles.emptyTitle}>No coach assigned yet</Text>

            <Text style={styles.emptyText}>
              Your premium coach will appear here once an administrator assigns
              one to your account.
            </Text>

            <Pressable
              style={({ pressed }) => [
                styles.refreshButton,
                pressed && styles.pressedButton,
              ]}
              onPress={() => void loadAssignedCoach()}
            >
              <Text style={styles.refreshButtonText}>Refresh Assignment</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {coach ? (
        <View style={styles.bottomActions}>
          <Pressable
            style={({ pressed }) => [
              styles.messageButton,
              pressed && styles.pressedButton,
            ]}
            onPress={() => showComingSoon('Message Health Coach')}
          >
            <Text style={styles.messageButtonText}>Message Health Coach</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.reviewButton,
              pressed && styles.pressedReviewButton,
            ]}
            onPress={() => showComingSoon('Rate and Review Coach')}
          >
            <Text style={styles.reviewButtonText}>
              Rate and Review Coach
            </Text>
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5FAF6',
  },
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5FAF6',
  },

  topBar: {
    position: 'relative',
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F5FAF6',
    borderBottomWidth: 1,
    borderBottomColor: '#E2ECE6',
  },
  topBarTitle: {
    color: '#1E5C35',
    fontSize: 17,
    fontWeight: '800',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    top: 8,
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: '#1E5C35',
    fontSize: 36,
    fontWeight: '300',
    lineHeight: 38,
  },

  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 140,
  },

  coachCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#EAF3EC',
    borderWidth: 1,
    borderColor: '#73B987',
  },
  coachAvatar: {
    width: 62,
    height: 62,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 31,
    backgroundColor: '#8FD3A6',
  },
  coachAvatarText: {
    color: '#1E5C35',
    fontSize: 20,
    fontWeight: '900',
  },
  coachDetails: {
    flex: 1,
  },
  coachName: {
    color: '#16281D',
    fontSize: 14,
    fontWeight: '900',
  },
  coachSpecialty: {
    marginTop: 4,
    color: '#5C7267',
    fontSize: 11,
  },
  premiumCoachChip: {
    alignSelf: 'flex-start',
    marginTop: 7,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#FFF4D6',
  },
  premiumCoachChipText: {
    color: '#957115',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  viewProfileButton: {
    marginLeft: 8,
    borderRadius: 7,
    backgroundColor: '#1E5C35',
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  viewProfileText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },

  actionCard: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#73B987',
  },
  actionTextBlock: {
    flex: 1,
    paddingRight: 12,
  },
  actionTitle: {
    color: '#16281D',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  actionSubtitle: {
    marginTop: 4,
    color: '#5C7267',
    fontSize: 11,
    lineHeight: 15,
  },
  chevron: {
    color: '#1E5C35',
    fontSize: 28,
    fontWeight: '300',
  },

  coachNoteCard: {
    marginTop: 8,
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2ECE6',
  },
  coachNoteTitle: {
    color: '#16281D',
    fontSize: 14,
    fontWeight: '800',
  },
  coachNoteText: {
    marginTop: 8,
    color: '#5C7267',
    fontSize: 13,
    lineHeight: 20,
  },

  emptyCard: {
    alignItems: 'center',
    marginTop: 28,
    paddingHorizontal: 24,
    paddingVertical: 30,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2ECE6',
  },
  emptyIconCircle: {
    width: 66,
    height: 66,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 33,
    backgroundColor: '#EAF3EC',
  },
  emptyIcon: {
    color: '#1E5C35',
    fontSize: 29,
  },
  emptyTitle: {
    marginTop: 16,
    color: '#16281D',
    fontSize: 17,
    fontWeight: '800',
  },
  emptyText: {
    marginTop: 8,
    color: '#5C7267',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  refreshButton: {
    marginTop: 20,
    borderRadius: 999,
    backgroundColor: '#1E5C35',
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  bottomActions: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 18,
    backgroundColor: '#F5FAF6',
    borderTopWidth: 1,
    borderTopColor: '#E2ECE6',
  },
  messageButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginBottom: 9,
    borderRadius: 8,
    backgroundColor: '#1E5C35',
  },
  messageButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  reviewButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderRadius: 8,
    backgroundColor: '#EAF3EC',
    borderWidth: 1,
    borderColor: '#1E5C35',
  },
  reviewButtonText: {
    color: '#1E5C35',
    fontSize: 13,
    fontWeight: '800',
  },

  pressedCard: {
    opacity: 0.78,
  },
  pressedButton: {
    opacity: 0.8,
  },
  pressedReviewButton: {
    backgroundColor: '#D8EADF',
  },
})