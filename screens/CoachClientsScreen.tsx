import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../services/supabase'

type ClientProfile = {
  id: string
  full_name: string | null
  fitness_goal: string | null
  activity_level: string | null
  subscription_tier: string | null
  assigned_coach_id: string | null
  updated_at: string | null
}

function getInitials(name: string | null) {
  const value = name?.trim()

  if (!value) {
    return 'BW'
  }

  return value
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function formatAssignedDate(updatedAt: string | null) {
  if (!updatedAt) {
    return 'Recently'
  }

  return new Intl.DateTimeFormat('en-SG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(updatedAt))
}

export default function CoachClientsScreen() {
  const navigation = useNavigation<any>()

  const [clients, setClients] = useState<ClientProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadClients = useCallback(async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        Alert.alert('Login required', 'Please log in again.')
        setClients([])
        return
      }

      // Load all premium users directly assigned to this coach
      const { data: clientData, error: clientError } = await supabase
        .from('profiles')
        .select(
          'id, full_name, fitness_goal, activity_level, subscription_tier, assigned_coach_id, updated_at'
        )
        .eq('assigned_coach_id', user.id)
        .order('full_name', { ascending: true })

      if (clientError) {
        throw clientError
      }

      setClients((clientData ?? []) as ClientProfile[])
    } catch (error: any) {
      console.error('Load coach clients error:', error)

      Alert.alert(
        'Could not load assigned users',
        error?.message || 'Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      void loadClients()
    }, [loadClients])
  )

  async function handleRefresh() {
    setRefreshing(true)
    await loadClients()
    setRefreshing(false)
  }

  function openClientChat(client: ClientProfile) {
    navigation.navigate('CoachConversation', {
      assignmentId: client.id,
      clientId: client.id,
      clientName: client.full_name || 'Premium member',
    })
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E5C35" />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Go back to coach dashboard"
          >
            <Text style={styles.backButtonText}>‹ Dashboard</Text>
          </TouchableOpacity>

          <Text style={styles.topBarTitle}>My Clients</Text>

          <View style={styles.topBarSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#1E5C35"
            />
          }
        >
          <View style={styles.heroCard}>
            <View>
              <Text style={styles.heroLabel}>COACH DASHBOARD</Text>
              <Text style={styles.heroTitle}>Assigned Premium users</Text>
              <Text style={styles.heroText}>
                Review each client&apos;s goals and open a private coaching
                chat.
              </Text>
            </View>

            <View style={styles.countCircle}>
              <Text style={styles.countText}>{clients.length}</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>
            {clients.length === 1
              ? '1 assigned user'
              : `${clients.length} assigned users`}
          </Text>

          {clients.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconCircle}>
                <Text style={styles.emptyIcon}>👥</Text>
              </View>

              <Text style={styles.emptyTitle}>No users assigned yet</Text>
              <Text style={styles.emptyText}>
                Premium users assigned to your coach account through
                profiles.assigned_coach_id will appear here.
              </Text>
            </View>
          ) : (
            clients.map((client) => {
              const name = client.full_name || 'Premium member'
              const goal = client.fitness_goal || 'Goal not set'
              const activity =
                client.activity_level || 'Activity level not set'

              return (
                <View key={client.id} style={styles.clientCard}>
                  <View style={styles.clientHeader}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {getInitials(client.full_name)}
                      </Text>
                    </View>

                    <View style={styles.clientIdentity}>
                      <Text style={styles.clientName}>{name}</Text>
                      <Text style={styles.clientStatus}>
                        ✦ Premium member
                      </Text>
                    </View>
                  </View>

                  <View style={styles.clientDetailRow}>
                    <Text style={styles.clientDetailLabel}>Fitness goal</Text>
                    <Text style={styles.clientDetailValue} numberOfLines={1}>
                      {goal}
                    </Text>
                  </View>

                  <View style={styles.clientDetailRow}>
                    <Text style={styles.clientDetailLabel}>
                      Activity level
                    </Text>
                    <Text style={styles.clientDetailValue} numberOfLines={1}>
                      {activity}
                    </Text>
                  </View>

                  <Text style={styles.assignedDate}>
                    Assigned {formatAssignedDate(client.updated_at)}
                  </Text>

                  <TouchableOpacity
                    style={styles.chatButton}
                    onPress={() => openClientChat(client)}
                    accessibilityRole="button"
                    accessibilityLabel={`Open chat with ${name}`}
                  >
                    <Text style={styles.chatButtonText}>
                      💬 Open Coaching Chat
                    </Text>
                  </TouchableOpacity>
                </View>
              )
            })
          )}
        </ScrollView>
      </SafeAreaView>

      <SafeAreaView edges={['bottom']} style={styles.bottomTabSafeArea}>
        <View style={styles.bottomTabBar}>
          <CoachTab
            label="Home"
            icon="🏠"
            onPress={() => navigation.navigate('CoachHome')}
          />

          <CoachTab
            label="Content"
            icon="📋"
            onPress={() => navigation.navigate('CoachContent')}
          />

          <CoachTab
            label="Clients"
            icon="👥"
            active
            onPress={() => {}}
          />

          <CoachTab
            label="Messages"
            icon="💬"
            onPress={() => navigation.navigate('CoachChat')}
          />

          <CoachTab
            label="Profile"
            icon="👤"
            onPress={() => navigation.navigate('CoachProfile')}
          />
        </View>
      </SafeAreaView>
    </View>
  )
}

type CoachTabProps = {
  label: string
  icon: string
  active?: boolean
  onPress: () => void
}

function CoachTab({
  label,
  icon,
  active = false,
  onPress,
}: CoachTabProps) {
  const color = active ? '#1E5C35' : '#7C8F83'

  return (
    <Pressable
      style={styles.tabItem}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.tabIcon, { color }]}>{icon}</Text>

      <Text style={[styles.tabLabel, { color }]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F5FAF6',
    flex: 1,
  },
  safeArea: {
    backgroundColor: '#F5FAF6',
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 56,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButton: {
    justifyContent: 'center',
    minHeight: 44,
    width: 92,
  },
  backButtonText: {
    color: '#1E5C35',
    fontSize: 14,
    fontWeight: '800',
  },
  topBarTitle: {
    color: '#16281D',
    fontSize: 17,
    fontWeight: '800',
  },
  topBarSpacer: {
    width: 92,
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  heroCard: {
    alignItems: 'center',
    backgroundColor: '#1E5C35',
    borderRadius: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 18,
  },
  heroLabel: {
    color: '#CFE4D6',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
    marginTop: 5,
  },
  heroText: {
    color: '#D8EADF',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
    maxWidth: 220,
  },
  countCircle: {
    alignItems: 'center',
    backgroundColor: '#F4C95D',
    borderRadius: 26,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  countText: {
    color: '#4E3907',
    fontSize: 21,
    fontWeight: '900',
  },
  sectionTitle: {
    color: '#5C7267',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 11,
    marginTop: 24,
    textTransform: 'uppercase',
  },
  clientCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2ECE6',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
  clientHeader: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#D9ECDF',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  avatarText: {
    color: '#1E5C35',
    fontSize: 15,
    fontWeight: '900',
  },
  clientIdentity: {
    flex: 1,
    marginLeft: 12,
  },
  clientName: {
    color: '#16281D',
    fontSize: 16,
    fontWeight: '800',
  },
  clientStatus: {
    color: '#8A6410',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
  },
  clientDetailRow: {
    alignItems: 'center',
    borderTopColor: '#EEF4F0',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
  },
  clientDetailLabel: {
    color: '#7C8F83',
    fontSize: 12,
  },
  clientDetailValue: {
    color: '#16281D',
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 18,
    textAlign: 'right',
  },
  assignedDate: {
    color: '#708277',
    fontSize: 11,
    marginTop: 13,
  },
  chatButton: {
    alignItems: 'center',
    backgroundColor: '#1E5C35',
    borderRadius: 12,
    justifyContent: 'center',
    marginTop: 15,
    minHeight: 46,
  },
  chatButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2ECE6',
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
  },
  emptyIconCircle: {
    alignItems: 'center',
    backgroundColor: '#EAF3EC',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  emptyIcon: {
    fontSize: 25,
  },
  emptyTitle: {
    color: '#16281D',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 14,
  },
  emptyText: {
    color: '#708277',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
    textAlign: 'center',
  },
  bottomTabSafeArea: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2ECE6',
  },
  bottomTabBar: {
    minHeight: 60,
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  tabItem: {
    flex: 1,
    minHeight: 44,
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
