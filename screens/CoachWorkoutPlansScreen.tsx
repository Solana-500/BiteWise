import React, { useMemo, useState } from 'react'
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

type Props = {
  navigation: any
}

type WorkoutPlanStatus =
  | 'draft'
  | 'pending_review'
  | 'changes_requested'
  | 'approved'
  | 'active'

type WorkoutPlan = {
  id: string
  title: string
  clientName: string
  frequency: string
  duration: string
  status: WorkoutPlanStatus
  updatedAt: string
  adminFeedback?: string
}

const SAMPLE_WORKOUT_PLANS: WorkoutPlan[] = []

const STATUS_FILTERS: Array<{
  label: string
  value: 'all' | WorkoutPlanStatus
}> = [
  { label: 'All', value: 'all' },
  { label: 'Drafts', value: 'draft' },
  { label: 'Pending', value: 'pending_review' },
  { label: 'Returned', value: 'changes_requested' },
  { label: 'Approved', value: 'approved' },
  { label: 'Active', value: 'active' },
]

export default function CoachWorkoutPlansScreen({ navigation }: Props) {
  const [plans] = useState<WorkoutPlan[]>(SAMPLE_WORKOUT_PLANS)

  const [selectedFilter, setSelectedFilter] = useState<
    'all' | WorkoutPlanStatus
  >('all')

  const filteredPlans = useMemo(() => {
  return plans.filter((plan) => {
    return selectedFilter === 'all' || plan.status === selectedFilter
  })
}, [plans, selectedFilter])

  const counts = useMemo(() => {
    return {
      drafts: plans.filter((plan) => plan.status === 'draft').length,
      pending: plans.filter((plan) => plan.status === 'pending_review').length,
      active: plans.filter((plan) => plan.status === 'active').length,
    }
  }, [plans])

  const openCreatePlan = () => {
  navigation.navigate('CoachCreateWorkoutPlan')
}

  const openPlan = (plan: WorkoutPlan) => {
    Alert.alert(
      plan.title,
      `${plan.clientName}\n${plan.frequency} · ${plan.duration}\n\nCurrent status: ${getStatusLabel(
        plan.status
      )}`
    )
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Go back to content management"
          >
            <Text style={styles.backButtonText}>‹ Content</Text>
          </TouchableOpacity>

          <View style={styles.headingRow}>
            <View style={styles.headingTextWrap}>
              <Text style={styles.pageHeading}>Workout Plans</Text>
              <Text style={styles.pageSubtitle}>
                Build structured training plans for assigned clients and submit
                them for admin approval.
              </Text>
            </View>

            <View style={styles.headerIconWrap}>
              <Text style={styles.headerIcon}>🏋️</Text>
            </View>
          </View>

          <Pressable
            style={styles.createButton}
            onPress={openCreatePlan}
            accessibilityRole="button"
            accessibilityLabel="Create a new workout plan"
          >
            <Text style={styles.createButtonPlus}>＋</Text>
            <Text style={styles.createButtonText}>Create Workout Plan</Text>
          </Pressable>

          <View style={styles.statsRow}>
            <SummaryCard
              value={counts.drafts}
              label="Drafts"
              color="#7C8F83"
              onPress={() => setSelectedFilter('draft')}
            />

            <SummaryCard
              value={counts.pending}
              label="Pending"
              color="#B97816"
              onPress={() => setSelectedFilter('pending_review')}
            />

            <SummaryCard
              value={counts.active}
              label="Active"
              color="#1E5C35"
              onPress={() => setSelectedFilter('active')}
            />
          </View>

          <View style={styles.approvalNotice}>
            <Text style={styles.approvalNoticeIcon}>✓</Text>

            <View style={styles.approvalNoticeTextWrap}>
              <Text style={styles.approvalNoticeTitle}>
                Admin approval required
              </Text>

              <Text style={styles.approvalNoticeText}>
                Clients can only view workout plans after a system admin
                approves and releases them.
              </Text>
            </View>
          </View>

        
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {STATUS_FILTERS.map((filter) => {
              const isSelected = selectedFilter === filter.value

              return (
                <Pressable
                  key={filter.value}
                  style={[
                    styles.filterButton,
                    isSelected && styles.filterButtonActive,
                  ]}
                  onPress={() => setSelectedFilter(filter.value)}
                  accessibilityRole="button"
                  accessibilityLabel={`Show ${filter.label.toLowerCase()} workout plans`}
                  accessibilityState={{ selected: isSelected }}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      isSelected && styles.filterButtonTextActive,
                    ]}
                  >
                    {filter.label}
                  </Text>
                </Pressable>
              )
            })}
          </ScrollView>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {selectedFilter === 'all'
                ? 'All workout plans'
                : `${getFilterLabel(selectedFilter)} workout plans`}
            </Text>

            <Text style={styles.planCount}>
              {filteredPlans.length}{' '}
              {filteredPlans.length === 1 ? 'plan' : 'plans'}
            </Text>
          </View>

          {filteredPlans.length > 0 ? (
            filteredPlans.map((plan) => (
              <WorkoutPlanCard
                key={plan.id}
                plan={plan}
                onPress={() => openPlan(plan)}
              />
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>🏋️</Text>
              <Text style={styles.emptyTitle}>No workout plans yet</Text>
              <Text style={styles.emptyText}>
                Create a structured workout plan for one of your assigned
                clients. It will remain private until you submit it for system
                admin approval.
              </Text>

              <Pressable
                style={styles.emptyCreateButton}
                onPress={openCreatePlan}
                accessibilityRole="button"
                accessibilityLabel="Create a workout plan"
              >
                <Text style={styles.emptyCreateButtonText}>
                  + Create Workout Plan
                </Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

function SummaryCard({
  value,
  label,
  color,
  onPress,
}: {
  value: number
  label: string
  color: string
  onPress: () => void
}) {
  return (
    <Pressable
      style={styles.summaryCard}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Show ${value} ${label.toLowerCase()} workout plans`}
    >
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </Pressable>
  )
}

function WorkoutPlanCard({
  plan,
  onPress,
}: {
  plan: WorkoutPlan
  onPress: () => void
}) {
  const statusTheme = getStatusTheme(plan.status)

  return (
    <Pressable
      style={styles.planCard}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open ${plan.title} for ${plan.clientName}`}
    >
      <View style={styles.planCardTop}>
        <View style={styles.planCardTitleWrap}>
          <Text style={styles.planTitle}>{plan.title}</Text>
          <Text style={styles.clientName}>{plan.clientName}</Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusTheme.backgroundColor },
          ]}
        >
          <Text style={[styles.statusBadgeText, { color: statusTheme.color }]}>
            {statusTheme.label}
          </Text>
        </View>
      </View>

      <View style={styles.planMetaRow}>
        <Text style={styles.planMeta}>{plan.frequency}</Text>
        <Text style={styles.metaDot}>•</Text>
        <Text style={styles.planMeta}>{plan.duration}</Text>
      </View>

      {plan.adminFeedback ? (
        <View style={styles.feedbackBox}>
          <Text style={styles.feedbackTitle}>Admin feedback</Text>
          <Text style={styles.feedbackText}>{plan.adminFeedback}</Text>
        </View>
      ) : null}

      <View style={styles.planCardBottom}>
        <Text style={styles.updatedAt}>{plan.updatedAt}</Text>
        <Text style={styles.openPlanText}>
          {getPlanActionLabel(plan.status)} ›
        </Text>
      </View>
    </Pressable>
  )
}

function getStatusLabel(status: WorkoutPlanStatus) {
  const labels: Record<WorkoutPlanStatus, string> = {
    draft: 'Draft',
    pending_review: 'Pending review',
    changes_requested: 'Changes requested',
    approved: 'Approved',
    active: 'Active',
  }

  return labels[status]
}

function getFilterLabel(status: WorkoutPlanStatus) {
  const labels: Record<WorkoutPlanStatus, string> = {
    draft: 'Draft',
    pending_review: 'Pending',
    changes_requested: 'Returned',
    approved: 'Approved',
    active: 'Active',
  }

  return labels[status]
}

function getPlanActionLabel(status: WorkoutPlanStatus) {
  const labels: Record<WorkoutPlanStatus, string> = {
    draft: 'Continue editing',
    pending_review: 'View submission',
    changes_requested: 'Review feedback',
    approved: 'View approval',
    active: 'View active plan',
  }

  return labels[status]
}

function getStatusTheme(status: WorkoutPlanStatus) {
  const themes: Record<
    WorkoutPlanStatus,
    { label: string; color: string; backgroundColor: string }
  > = {
    draft: {
      label: 'Draft',
      color: '#64756B',
      backgroundColor: '#EEF2EF',
    },
    pending_review: {
      label: 'Pending review',
      color: '#8A5A09',
      backgroundColor: '#FFF2CC',
    },
    changes_requested: {
      label: 'Changes requested',
      color: '#9B3B27',
      backgroundColor: '#FCE6E0',
    },
    approved: {
      label: 'Approved',
      color: '#1E5C35',
      backgroundColor: '#E4F3E8',
    },
    active: {
      label: 'Active',
      color: '#FFFFFF',
      backgroundColor: '#1E5C35',
    },
  }

  return themes[status]
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
    paddingTop: 14,
    paddingBottom: 32,
  },

  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingRight: 14,
  },
  backButtonText: {
    color: '#1E5C35',
    fontSize: 15,
    fontWeight: '800',
  },

  headingRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headingTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  pageHeading: {
    color: '#16281D',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    marginTop: 6,
    color: '#5C7267',
    fontSize: 14,
    lineHeight: 20,
  },
  headerIconWrap: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#E7F2EA',
  },
  headerIcon: {
    fontSize: 30,
  },

  createButton: {
    height: 53,
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: '#1E5C35',
  },
  createButtonPlus: {
    marginRight: 6,
    color: '#FFFFFF',
    fontSize: 23,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },

  statsRow: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryCard: {
    width: '31.5%',
    minHeight: 76,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2ECE6',
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  summaryLabel: {
    marginTop: 4,
    color: '#5C7267',
    fontSize: 11,
    fontWeight: '700',
  },

  approvalNotice: {
    marginTop: 17,
    padding: 14,
    flexDirection: 'row',
    borderRadius: 16,
    backgroundColor: '#FFF7E5',
    borderWidth: 1,
    borderColor: '#F3DEAA',
  },
  approvalNoticeIcon: {
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
  approvalNoticeTextWrap: {
    flex: 1,
    marginLeft: 10,
  },
  approvalNoticeTitle: {
    color: '#704A08',
    fontSize: 13,
    fontWeight: '800',
  },
  approvalNoticeText: {
    marginTop: 3,
    color: '#7A6131',
    fontSize: 12,
    lineHeight: 17,
  },

  filterRow: {
    paddingTop: 14,
    paddingRight: 20,
  },
  filterButton: {
    marginRight: 9,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE9E1',
  },
  filterButtonActive: {
    backgroundColor: '#1E5C35',
    borderColor: '#1E5C35',
  },
  filterButtonText: {
    color: '#5C7267',
    fontSize: 12,
    fontWeight: '800',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },

  sectionHeader: {
    marginTop: 23,
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
  planCount: {
    color: '#7C8F83',
    fontSize: 12,
    fontWeight: '700',
  },

  planCard: {
    marginBottom: 13,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2ECE6',
  },
  planCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  planCardTitleWrap: {
    flex: 1,
    paddingRight: 10,
  },
  planTitle: {
    color: '#16281D',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 21,
  },
  clientName: {
    marginTop: 4,
    color: '#1E5C35',
    fontSize: 13,
    fontWeight: '700',
  },
  statusBadge: {
    maxWidth: 130,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  planMetaRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  planMeta: {
    color: '#5C7267',
    fontSize: 12,
    fontWeight: '600',
  },
  metaDot: {
    marginHorizontal: 7,
    color: '#A1B0A7',
  },
  feedbackBox: {
    marginTop: 13,
    padding: 11,
    borderRadius: 12,
    backgroundColor: '#FFF4F0',
    borderWidth: 1,
    borderColor: '#F5D3C9',
  },
  feedbackTitle: {
    color: '#9B3B27',
    fontSize: 11,
    fontWeight: '800',
  },
  feedbackText: {
    marginTop: 4,
    color: '#795448',
    fontSize: 11,
    lineHeight: 16,
  },
  planCardBottom: {
    marginTop: 14,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#EDF3EF',
  },
  updatedAt: {
    color: '#7C8F83',
    fontSize: 11,
    fontWeight: '600',
  },
  openPlanText: {
    color: '#1E5C35',
    fontSize: 12,
    fontWeight: '800',
  },

  emptyCard: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2ECE6',
  },
  emptyEmoji: {
    fontSize: 34,
  },
  emptyTitle: {
    marginTop: 10,
    color: '#16281D',
    fontSize: 16,
    fontWeight: '800',
  },
  emptyText: {
    marginTop: 6,
    color: '#5C7267',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  emptyCreateButton: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#1E5C35',
  },
  emptyCreateButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
})