import React, { useCallback, useState } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../services/supabase'
import CoachBottomTabBar from '../components/CoachBottomTabBar';

type Props = {
  navigation: any
}

type ContentCardProps = {
  title: string
  description: string
  icon: string
  draftCount: number
  pendingCount: number
  approvedCount: number
  onPress: () => void
}

export default function CoachContentScreen({ navigation }: Props) {
  const [mealPlanCounts, setMealPlanCounts] = useState({
    drafts: 0,
    pending: 0,
    approved: 0,
  })

  const [workoutPlanCounts, setWorkoutPlanCounts] = useState({
    drafts: 0,
    pending: 0,
    approved: 0,
  })

  const loadMealPlanCounts = useCallback(async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        throw userError
      }

      if (!user) {
        setMealPlanCounts({
          drafts: 0,
          pending: 0,
          approved: 0,
        })
        return
      }

      const [draftResult, pendingResult, approvedResult] =
        await Promise.all([
          supabase
            .from('meal_plans')
            .select('*', {
              count: 'exact',
              head: true,
            })
            .eq('coach_id', user.id)
            .eq('status', 'draft'),

          supabase
            .from('meal_plans')
            .select('*', {
              count: 'exact',
              head: true,
            })
            .eq('coach_id', user.id)
            .eq('status', 'pending_review'),

          supabase
            .from('meal_plans')
            .select('*', {
              count: 'exact',
              head: true,
            })
            .eq('coach_id', user.id)
            .in('status', ['approved', 'active']),
        ])

      if (draftResult.error) {
        throw draftResult.error
      }
      if (pendingResult.error) {
        throw pendingResult.error
      }
      if (approvedResult.error) {
        throw approvedResult.error
      }

      setMealPlanCounts({
        drafts: draftResult.count ?? 0,
        pending: pendingResult.count ?? 0,
        approved: approvedResult.count ?? 0,
      })
    } catch (error) {
      console.error('Unable to load meal plan counts:', error)
    }
  }, [])

  const loadWorkoutPlanCounts = useCallback(async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        throw userError
      }

      if (!user) {
        setWorkoutPlanCounts({
          drafts: 0,
          pending: 0,
          approved: 0,
        })
        return
      }

      const [draftResult, pendingResult, approvedResult] =
        await Promise.all([
          supabase
            .from('workout_plans')
            .select('*', {
              count: 'exact',
              head: true,
            })
            .eq('coach_id', user.id)
            .eq('status', 'draft'),

          supabase
            .from('workout_plans')
            .select('*', {
              count: 'exact',
              head: true,
            })
            .eq('coach_id', user.id)
            .eq('status', 'pending_review'),

          supabase
            .from('workout_plans')
            .select('*', {
              count: 'exact',
              head: true,
            })
            .eq('coach_id', user.id)
            .in('status', ['approved', 'active']),
        ])

      if (draftResult.error) {
        throw draftResult.error
      }
      if (pendingResult.error) {
        throw pendingResult.error
      }
      if (approvedResult.error) {
        throw approvedResult.error
      }

      setWorkoutPlanCounts({
        drafts: draftResult.count ?? 0,
        pending: pendingResult.count ?? 0,
        approved: approvedResult.count ?? 0,
      })
    } catch (error) {
      console.error('Unable to load workout plan counts:', error)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      void loadMealPlanCounts()
      void loadWorkoutPlanCounts()
    }, [
      loadMealPlanCounts,
      loadWorkoutPlanCounts,
    ])
  )

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <TouchableOpacity
            style={styles.backHomeButton}
            onPress={() => navigation.navigate('CoachHome')}
            accessibilityRole="button"
            accessibilityLabel="Go back to coach home"
          >
            <Text style={styles.backHomeText}>‹ Home</Text>
          </TouchableOpacity>

          <Text style={styles.pageHeading}>Content Management</Text>
          <Text style={styles.pageSubtitle}>
            Create personalised content, then submit it for system admin
            approval before it is released to clients.
          </Text>

          <View style={styles.workflowCard}>
            <Text style={styles.workflowTitle}>How content is released</Text>
            <View style={styles.workflowRow}>
              <WorkflowStep number="1" label="Create" />
              <Text style={styles.workflowArrow}>→</Text>
              <WorkflowStep number="2" label="Submit" />
              <Text style={styles.workflowArrow}>→</Text>
              <WorkflowStep number="3" label="Admin approves" />
            </View>
            <Text style={styles.workflowNote}>
              Clients only receive content after approval.
            </Text>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your content</Text>
            <Pressable
              onPress={() => navigation.navigate('CoachContentStatus')}
              accessibilityRole="button"
              accessibilityLabel="View all content approval statuses"
            >
              <Text style={styles.viewStatusText}>View status ›</Text>
            </Pressable>
          </View>

          <ContentCard
            title="Meal Plans"
            description="Create personalised, client-specific nutrition plans."
            icon="🥗"
            draftCount={mealPlanCounts.drafts}
            pendingCount={mealPlanCounts.pending}
            approvedCount={mealPlanCounts.approved}
            onPress={() => navigation.navigate('CoachMealPlans')}
          />

          <ContentCard
            title="Workout Plans"
            description="Build structured workouts based on client goals."
            icon="🏋️"
            draftCount={workoutPlanCounts.drafts}
            pendingCount={workoutPlanCounts.pending}
            approvedCount={workoutPlanCounts.approved}
            onPress={() => navigation.navigate('CoachWorkoutPlans')}
          />

          <ContentCard
            title="Recipes"
            description="Save reusable recipes for meal plans and clients."
            icon="🍲"
            draftCount={0}
            pendingCount={0}
            approvedCount={0}
            onPress={() => navigation.navigate('CoachRecipes')}
          />

          <View style={styles.reminderCard}>
            <Text style={styles.reminderIcon}>✓</Text>
            <View style={styles.reminderTextWrap}>
              <Text style={styles.reminderTitle}>Approval required</Text>
              <Text style={styles.reminderText}>
                Save your work as a draft anytime. Submitted content stays
                private until a system admin approves it.
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      <CoachBottomTabBar
  activeTab="CoachContent"
  onNavigate={(route) => navigation.navigate(route)}
/>
    </View>
  )
}

function ContentCard({
  title,
  description,
  icon,
  draftCount,
  pendingCount,
  approvedCount,
  onPress,
}: ContentCardProps) {
  return (
    <Pressable
      style={styles.contentCard}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open ${title}`}
    >
      <View style={styles.contentCardTop}>
        <View style={styles.contentIconWrap}>
          <Text style={styles.contentIcon}>{icon}</Text>
        </View>
        <View style={styles.contentCardTextWrap}>
          <Text style={styles.contentCardTitle}>{title}</Text>
          <Text style={styles.contentCardDescription}>{description}</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </View>

      <View style={styles.statusDivider} />
      <View style={styles.statusRow}>
        <StatusPill label="Drafts" value={draftCount} color="#7C8F83" />
        <StatusPill label="Pending" value={pendingCount} color="#B97816" />
        <StatusPill label="Approved" value={approvedCount} color="#1E5C35" />
      </View>
    </Pressable>
  )
}

function StatusPill({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  return (
    <View style={styles.statusPill}>
      <Text style={[styles.statusPillValue, { color }]}>{value}</Text>
      <Text style={styles.statusPillLabel}>{label}</Text>
    </View>
  )
}

function WorkflowStep({ number, label }: { number: string; label: string }) {
  return (
    <View style={styles.workflowStep}>
      <View style={styles.workflowNumber}>
        <Text style={styles.workflowNumberText}>{number}</Text>
      </View>
      <Text style={styles.workflowStepLabel}>{label}</Text>
    </View>
  )
}

type CoachTabProps = {
  label: string
  icon: string
  active?: boolean
  onPress: () => void
}

function CoachTab({ label, icon, active, onPress }: CoachTabProps) {
  const color = active ? '#1E5C35' : '#7C8F83'

  return (
    <Pressable
      style={styles.tabItem}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: Boolean(active) }}
    >
      <Text style={[styles.tabIcon, { color }]}>{icon}</Text>
      <Text style={[styles.tabLabel, { color }]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5FAF6',
  },

  safeArea: {
    flex: 1,
    backgroundColor: '#F5FAF6',
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },

  backHomeButton: {
    alignSelf: 'flex-start',
    marginBottom: 6,
    paddingRight: 14,
    paddingVertical: 8,
  },

  backHomeText: {
    color: '#1E5C35',
    fontSize: 15,
    fontWeight: '800',
  },

  pageHeading: {
    color: '#16281D',
    fontSize: 27,
    fontWeight: '800',
    letterSpacing: -0.4,
  },

  pageSubtitle: {
    marginTop: 7,
    color: '#5C7267',
    fontSize: 14,
    lineHeight: 21,
  },

  workflowCard: {
    marginTop: 20,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#EAF4ED',
    borderWidth: 1,
    borderColor: '#D7E8DC',
  },

  workflowTitle: {
    color: '#1E5C35',
    fontSize: 14,
    fontWeight: '800',
  },

  workflowRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },

  workflowStep: {
    flex: 1,
    alignItems: 'center',
  },

  workflowNumber: {
    width: 27,
    height: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#1E5C35',
  },

  workflowNumberText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  workflowStepLabel: {
    marginTop: 6,
    color: '#355244',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },

  workflowArrow: {
    marginTop: 3,
    color: '#7C8F83',
    fontSize: 18,
    fontWeight: '700',
  },

  workflowNote: {
    marginTop: 13,
    color: '#5C7267',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },

  sectionHeader: {
    marginTop: 26,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  sectionTitle: {
    color: '#16281D',
    fontSize: 18,
    fontWeight: '800',
  },

  viewStatusText: {
    color: '#1E5C35',
    fontSize: 13,
    fontWeight: '800',
  },

  contentCard: {
    marginBottom: 14,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2ECE6',
    shadowColor: '#163020',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },

  contentCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  contentIconWrap: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#F0F7F2',
  },

  contentIcon: {
    fontSize: 27,
  },

  contentCardTextWrap: {
    flex: 1,
    marginLeft: 13,
  },

  contentCardTitle: {
    color: '#16281D',
    fontSize: 16,
    fontWeight: '800',
  },

  contentCardDescription: {
    marginTop: 4,
    color: '#5C7267',
    fontSize: 12,
    lineHeight: 17,
  },

  chevron: {
    marginLeft: 8,
    color: '#1E5C35',
    fontSize: 27,
    fontWeight: '300',
  },

  statusDivider: {
    height: 1,
    marginTop: 15,
    marginBottom: 12,
    backgroundColor: '#EDF3EF',
  },

  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  statusPill: {
    flex: 1,
    alignItems: 'center',
  },

  statusPillValue: {
    fontSize: 15,
    fontWeight: '800',
  },

  statusPillLabel: {
    marginTop: 2,
    color: '#7C8F83',
    fontSize: 10,
    fontWeight: '700',
  },

  reminderCard: {
    marginTop: 4,
    padding: 15,
    flexDirection: 'row',
    borderRadius: 16,
    backgroundColor: '#FFF7E5',
    borderWidth: 1,
    borderColor: '#F3DEAA',
  },

  reminderIcon: {
    width: 24,
    height: 24,
    overflow: 'hidden',
    color: '#8A5A09',
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 24,
    textAlign: 'center',
    borderRadius: 12,
    backgroundColor: '#F7D98B',
  },

  reminderTextWrap: {
    flex: 1,
    marginLeft: 10,
  },

  reminderTitle: {
    color: '#704A08',
    fontSize: 13,
    fontWeight: '800',
  },

  reminderText: {
    marginTop: 3,
    color: '#7A6131',
    fontSize: 12,
    lineHeight: 17,
  },

  bottomTabBar: {
    height: 78,
    paddingTop: 8,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2ECE6',
  },

  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tabIcon: {
    fontSize: 19,
  },

  tabLabel: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '700',
  },

})
