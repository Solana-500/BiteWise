import { useCallback, useMemo, useState } from 'react'
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
import {
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { supabase } from '../services/supabase'

type CoachAssignment = {
  id: string
  client_id: string
  created_at: string
}

type ClientProfile = {
  id: string
  full_name: string | null
  fitness_goal: string | null
}

type CoachMessage = {
  id: string
  assignment_id: string
  sender_id: string
  message_text: string
  created_at: string
}

type ConversationItem = {
  assignmentId: string
  clientId: string
  clientName: string
  fitnessGoal: string
  latestMessage: string
  latestMessageAt: string | null
}

function getInitials(name: string) {
  const cleanedName = name.trim()

  if (!cleanedName) {
    return 'BW'
  }

  return cleanedName
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function formatConversationTime(dateString: string | null) {
  if (!dateString) {
    return ''
  }

  const date = new Date(dateString)
  const now = new Date()

  if (date.toDateString() === now.toDateString()) {
    return new Intl.DateTimeFormat('en-SG', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(date)
  }

  return new Intl.DateTimeFormat('en-SG', {
    day: 'numeric',
    month: 'short',
  }).format(date)
}

export default function CoachChatScreen() {
  const navigation = useNavigation<any>()

  const [assignments, setAssignments] = useState<CoachAssignment[]>([])
  const [profiles, setProfiles] = useState<ClientProfile[]>([])
  const [messages, setMessages] = useState<CoachMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadConversations = useCallback(async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        Alert.alert('Login required', 'Please log in again.')
        return
      }

      const { data: assignmentData, error: assignmentError } = await supabase
        .from('coach_assignments')
        .select('id, client_id, created_at')
        .eq('coach_id', user.id)
        .order('created_at', { ascending: false })

      if (assignmentError) {
        throw assignmentError
      }

      const coachAssignments = (assignmentData ?? []) as CoachAssignment[]
      setAssignments(coachAssignments)

      if (coachAssignments.length === 0) {
        setProfiles([])
        setMessages([])
        return
      }

      const clientIds = coachAssignments.map((assignment) => assignment.client_id)
      const assignmentIds = coachAssignments.map((assignment) => assignment.id)

      const [profileResult, messageResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, fitness_goal')
          .in('id', clientIds),

        supabase
          .from('coach_messages')
          .select('id, assignment_id, sender_id, message_text, created_at')
          .in('assignment_id', assignmentIds)
          .order('created_at', { ascending: false }),
      ])

      if (profileResult.error) {
        throw profileResult.error
      }

      if (messageResult.error) {
        throw messageResult.error
      }

      setProfiles((profileResult.data ?? []) as ClientProfile[])
      setMessages((messageResult.data ?? []) as CoachMessage[])
    } catch (error: any) {
      console.error('Load coach conversations error:', error)

      Alert.alert(
        'Could not load messages',
        error?.message || 'Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      void loadConversations()
    }, [loadConversations])
  )

  async function handleRefresh() {
    setRefreshing(true)
    await loadConversations()
    setRefreshing(false)
  }

  const conversations = useMemo<ConversationItem[]>(() => {
    const profilesById = new Map(
      profiles.map((profile) => [profile.id, profile])
    )

    return assignments.map((assignment) => {
      const profile = profilesById.get(assignment.client_id)

      const latestMessage = messages.find(
        (message) => message.assignment_id === assignment.id
      )

      return {
        assignmentId: assignment.id,
        clientId: assignment.client_id,
        clientName: profile?.full_name || 'Premium member',
        fitnessGoal: profile?.fitness_goal || 'Goal not set',
        latestMessage: latestMessage?.message_text || 'No messages yet',
        latestMessageAt: latestMessage?.created_at || null,
      }
    })
  }, [assignments, messages, profiles])

  function openConversation(conversation: ConversationItem) {
  navigation.navigate(
    'CoachConversation' as never,
    {
      assignmentId: conversation.assignmentId,
      clientId: conversation.clientId,
      clientName: conversation.clientName,
    } as never
  )
}

  if (loading) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
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

        <Text style={styles.topBarTitle}>Messages</Text>

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
        <Text style={styles.pageTitle}>Client messages</Text>

        <Text style={styles.pageSubtitle}>
          Select a Premium user to continue their private coaching
          conversation.
        </Text>

        {conversations.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Text style={styles.emptyIcon}>💬</Text>
            </View>

            <Text style={styles.emptyTitle}>No client conversations</Text>

            <Text style={styles.emptyText}>
              Your assigned Premium users will appear here once they are linked
              to your coach account.
            </Text>
          </View>
        ) : (
          conversations.map((conversation) => (
            <TouchableOpacity
              key={conversation.assignmentId}
              style={styles.conversationCard}
              activeOpacity={0.75}
              onPress={() => openConversation(conversation)}
              accessibilityRole="button"
              accessibilityLabel={`Open messages with ${conversation.clientName}`}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {getInitials(conversation.clientName)}
                </Text>
              </View>

              <View style={styles.conversationContent}>
                <View style={styles.conversationTopRow}>
                  <Text style={styles.clientName} numberOfLines={1}>
                    {conversation.clientName}
                  </Text>

                  <Text style={styles.messageTime}>
                    {formatConversationTime(conversation.latestMessageAt)}
                  </Text>
                </View>

                <Text style={styles.goalText} numberOfLines={1}>
                  {conversation.fitnessGoal}
                </Text>

                <Text style={styles.messagePreview} numberOfLines={1}>
                  {conversation.latestMessage}
                </Text>
              </View>

              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))
        )}
              </ScrollView>
      </SafeAreaView>

      <SafeAreaView
        edges={['bottom']}
        style={styles.bottomTabSafeArea}
      >
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
            onPress={() => navigation.navigate('CoachClients')}
          />

          <CoachTab
            label="Messages"
            icon="💬"
            active
            onPress={() => {}}
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
      <Text style={[styles.tabIcon, { color }]}>
        {icon}
      </Text>

      <Text style={[styles.tabLabel, { color }]}>
        {label}
      </Text>
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
    width: 96,
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
    width: 96,
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  pageTitle: {
    color: '#16281D',
    fontSize: 23,
    fontWeight: '800',
  },
  pageSubtitle: {
    color: '#5C7267',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 18,
    marginTop: 6,
  },
  conversationCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2ECE6',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 10,
    padding: 14,
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
  conversationContent: {
    flex: 1,
    marginLeft: 12,
    minWidth: 0,
  },
  conversationTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  clientName: {
    color: '#16281D',
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    marginRight: 8,
  },
  messageTime: {
    color: '#708277',
    fontSize: 10,
  },
  goalText: {
    color: '#8A6410',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
  },
  messagePreview: {
    color: '#708277',
    fontSize: 12,
    marginTop: 5,
  },
  chevron: {
    color: '#1E5C35',
    fontSize: 26,
    fontWeight: '300',
    marginLeft: 8,
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2ECE6',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 12,
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
