import { useCallback, useEffect, useMemo, useState } from 'react'
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
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { SafeAreaView } from 'react-native-safe-area-context'

import CoachBottomTabBar from '../components/CoachBottomTabBar'
import { useCoachUnread } from '../context/CoachUnreadContext'
import { supabase } from '../services/supabase'

type CoachStackParamList = {
  CoachChat: undefined
  CoachConversation: {
    assignmentId: string
    clientId: string
    clientName: string
  }
  CoachHome: undefined
  CoachContent: undefined
  CoachClients: undefined
  CoachProfile: undefined
}

type CoachChatNavigationProp = NativeStackNavigationProp<
  CoachStackParamList,
  'CoachChat'
>

type CoachAssignment = {
  id: string
  client_id: string
  created_at: string
  coach_last_read_at: string | null
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
  unreadCount: number
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
  const navigation = useNavigation<CoachChatNavigationProp>()
  const {
    unreadCounts,
    refreshUnreadCounts,
  } = useCoachUnread()

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
        .select('id, client_id, created_at, coach_last_read_at')
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
      void refreshUnreadCounts()
    }, [loadConversations, refreshUnreadCounts])
  )

  const assignmentIdsKey = useMemo(() => {
    return assignments
      .map((assignment) => assignment.id)
      .sort()
      .join(',')
  }, [assignments])

  useEffect(() => {
    if (!assignmentIdsKey) {
      return
    }

    const assignmentIds = assignmentIdsKey.split(',')

    const channel = supabase
      .channel('coach-chat-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'coach_messages',
        },
        (payload) => {
          const newMessage = payload.new as CoachMessage

          if (!assignmentIds.includes(newMessage.assignment_id)) {
            return
          }

          setMessages((currentMessages) => {
            if (
              currentMessages.some((message) => message.id === newMessage.id)
            ) {
              return currentMessages
            }

            return [newMessage, ...currentMessages]
          })
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [assignmentIdsKey])

  async function handleRefresh() {
    setRefreshing(true)
    await Promise.all([
      loadConversations(),
      refreshUnreadCounts(),
    ])
    setRefreshing(false)
  }

  const conversations = useMemo(() => {
    const profilesById = new Map(
      profiles.map((profile) => [profile.id, profile])
    )

    return assignments.map((assignment) => {
      const profile = profilesById.get(assignment.client_id)

      const assignmentMessages = messages.filter(
        (message) => message.assignment_id === assignment.id
      )

      const latestMessage = assignmentMessages[0]

      return {
        assignmentId: assignment.id,
        clientId: assignment.client_id,
        clientName: profile?.full_name || 'Premium member',
        fitnessGoal: profile?.fitness_goal || 'Goal not set',
        latestMessage: latestMessage?.message_text || 'No messages yet',
        latestMessageAt: latestMessage?.created_at || null,
        unreadCount: unreadCounts[assignment.id] ?? 0,
      }
    })
  }, [assignments, messages, profiles, unreadCounts])

  function openConversation(conversation: ConversationItem) {
    navigation.navigate('CoachConversation', {
      assignmentId: conversation.assignmentId,
      clientId: conversation.clientId,
      clientName: conversation.clientName,
    })
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E5C35" />
      </View>
    )
  }

  return (
  <SafeAreaView
    edges={['top', 'left', 'right']}
    style={styles.safeArea}
  >
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
            <Pressable
              key={conversation.assignmentId}
              style={styles.conversationCard}
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
                  <Text style={styles.clientName}>
                    {conversation.clientName}
                  </Text>

                  <Text style={styles.messageTime}>
                    {formatConversationTime(conversation.latestMessageAt)}
                  </Text>
                </View>

                <Text style={styles.goalText}>
                  {conversation.fitnessGoal}
                </Text>

                <Text
                  style={[
                    styles.messagePreview,
                    conversation.unreadCount > 0 &&
                      styles.messagePreviewUnread,
                  ]}
                  numberOfLines={1}
                >
                  {conversation.latestMessage}
                </Text>
              </View>

              {conversation.unreadCount > 0 ? (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>
                    {conversation.unreadCount > 99
                      ? '99+'
                      : conversation.unreadCount}
                  </Text>
                </View>
              ) : null}

              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))
        )}
      </ScrollView>

      <CoachBottomTabBar
        activeTab="CoachChat"
        onNavigate={(route) => navigation.navigate(route)}
      />
    </SafeAreaView>
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
  messagePreviewUnread: {
    color: '#16281D',
    fontWeight: '700',
  },
  unreadBadge: {
    alignItems: 'center',
    backgroundColor: '#D9482B',
    borderRadius: 999,
    justifyContent: 'center',
    marginLeft: 8,
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
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
})
