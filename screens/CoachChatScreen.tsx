import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { supabase } from '../services/supabase'

type CoachAssignment = {
  id: string
  client_id: string
  coach_id: string
}

type CoachMessage = {
  id: string
  assignment_id: string
  sender_id: string
  message_text: string
  created_at: string
}

type ClientProfile = {
  full_name: string | null
}

function formatMessageTime(createdAt: string) {
  return new Intl.DateTimeFormat('en-SG', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(createdAt))
}

export default function CoachChatScreen() {
  const navigation = useNavigation<any>()

  const [assignment, setAssignment] = useState<CoachAssignment | null>(null)
  const [clientName, setClientName] = useState('Premium member')
  const [messages, setMessages] = useState<CoachMessage[]>([])
  const [messageText, setMessageText] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  const listRef = useRef<FlatList<CoachMessage>>(null)

  const loadCoachChat = useCallback(async () => {
    try {
      setLoading(true)

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        Alert.alert('Login required', 'Please log in again.')
        return
      }

      setCurrentUserId(user.id)

      const { data: assignmentData, error: assignmentError } = await supabase
        .from('coach_assignments')
        .select('id, client_id, coach_id')
        .eq('coach_id', user.id)
        .maybeSingle()

      if (assignmentError) {
        throw assignmentError
      }

      if (!assignmentData) {
        setAssignment(null)
        setMessages([])
        return
      }

      const typedAssignment = assignmentData as CoachAssignment
      setAssignment(typedAssignment)

      const [messagesResult, clientProfileResult] = await Promise.all([
        supabase
          .from('coach_messages')
          .select('id, assignment_id, sender_id, message_text, created_at')
          .eq('assignment_id', typedAssignment.id)
          .order('created_at', { ascending: true }),

        supabase
          .from('profiles')
          .select('full_name')
          .eq('id', typedAssignment.client_id)
          .maybeSingle(),
      ])

      if (messagesResult.error) {
        throw messagesResult.error
      }

      if (!clientProfileResult.error) {
        const clientProfile = clientProfileResult.data as ClientProfile | null
        setClientName(clientProfile?.full_name || 'Premium member')
      }

      setMessages((messagesResult.data ?? []) as CoachMessage[])
    } catch (error: any) {
      console.error('Load coach chat error:', error)

      Alert.alert(
        'Could not load coach chat',
        error?.message || 'Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      void loadCoachChat()
    }, [loadCoachChat])
  )

  useEffect(() => {
    if (!assignment?.id) {
      return
    }

    const channel = supabase
      .channel(`coach-chat-${assignment.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'coach_messages',
          filter: `assignment_id=eq.${assignment.id}`,
        },
        (payload) => {
          const newMessage = payload.new as CoachMessage

          setMessages((currentMessages) => {
            if (currentMessages.some((message) => message.id === newMessage.id)) {
              return currentMessages
            }

            return [...currentMessages, newMessage]
          })

          setTimeout(() => {
            listRef.current?.scrollToEnd({ animated: true })
          }, 100)
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [assignment?.id])

  async function sendMessage() {
    const trimmedMessage = messageText.trim()

    if (!trimmedMessage || !assignment || !currentUserId) {
      return
    }

    try {
      setSending(true)

      const { error } = await supabase.from('coach_messages').insert({
        assignment_id: assignment.id,
        sender_id: currentUserId,
        message_text: trimmedMessage,
      })

      if (error) {
        throw error
      }

      setMessageText('')
    } catch (error: any) {
      console.error('Send coach message error:', error)

      Alert.alert(
        'Message not sent',
        error?.message || 'Please try again.'
      )
    } finally {
      setSending(false)
    }
  }

  function renderMessage({ item }: { item: CoachMessage }) {
    const isMine = item.sender_id === currentUserId

    return (
      <View
        style={[
          styles.messageRow,
          isMine ? styles.messageRowMine : styles.messageRowClient,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isMine ? styles.messageBubbleMine : styles.messageBubbleClient,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isMine ? styles.messageTextMine : styles.messageTextClient,
            ]}
          >
            {item.message_text}
          </Text>

          <Text
            style={[
              styles.messageTime,
              isMine ? styles.messageTimeMine : styles.messageTimeClient,
            ]}
          >
            {formatMessageTime(item.created_at)}
          </Text>
        </View>
      </View>
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

  if (!assignment) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={styles.backButtonText}>‹ Back</Text>
          </TouchableOpacity>

          <Text style={styles.topBarTitle}>Coach Chat</Text>

          <View style={styles.topBarSpacer} />
        </View>

        <View style={styles.emptyContainer}>
          <View style={styles.iconCircle}>
            <Text style={styles.icon}>💬</Text>
          </View>

          <Text style={styles.emptyTitle}>No client assigned yet</Text>

          <Text style={styles.emptyText}>
            A Premium user must be linked to this coach in the coach_assignments
            table before a conversation can be opened.
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={styles.backButtonText}>‹ Back</Text>
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.topBarTitle}>{clientName}</Text>
            <Text style={styles.roleText}>Premium member</Text>
          </View>

          <View style={styles.topBarSpacer} />
        </View>

        <View style={styles.noticeCard}>
          <Text style={styles.noticeTitle}>Coach conversation</Text>
          <Text style={styles.noticeText}>
            Provide supportive wellness guidance. Do not use this chat for
            medical emergencies.
          </Text>
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={[
            styles.messagesContent,
            messages.length === 0 && styles.messagesContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: false })
          }
          ListEmptyComponent={
            <View style={styles.emptyChatCard}>
              <Text style={styles.emptyChatTitle}>Start coaching</Text>
              <Text style={styles.emptyChatText}>
                Send your Premium member a welcome message or ask about their
                health goals.
              </Text>
            </View>
          }
        />

        <View style={styles.composer}>
          <TextInput
            style={styles.messageInput}
            value={messageText}
            onChangeText={setMessageText}
            placeholder={`Message ${clientName}...`}
            placeholderTextColor="#8D8A9A"
            multiline
            maxLength={1000}
            editable={!sending}
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              (!messageText.trim() || sending) && styles.sendButtonDisabled,
            ]}
            disabled={!messageText.trim() || sending}
            onPress={() => void sendMessage()}
            accessibilityRole="button"
            accessibilityLabel="Send message"
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.sendButtonText}>↑</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F5FAF6',
    flex: 1,
  },
  keyboardContainer: {
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
    width: 72,
  },
  backButtonText: {
    color: '#1E5C35',
    fontSize: 15,
    fontWeight: '800',
  },
  topBarTitle: {
    color: '#16281D',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  topBarSpacer: {
    width: 72,
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  roleText: {
    color: '#1E5C35',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  noticeCard: {
    backgroundColor: '#EAF3EC',
    borderColor: '#C9DBD0',
    borderRadius: 14,
    borderWidth: 1,
    marginHorizontal: 20,
    padding: 14,
  },
  noticeTitle: {
    color: '#1E5C35',
    fontSize: 13,
    fontWeight: '800',
  },
  noticeText: {
    color: '#5C7267',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  messagesContent: {
    padding: 20,
    paddingBottom: 12,
  },
  messagesContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  messageRowMine: {
    justifyContent: 'flex-end',
  },
  messageRowClient: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    borderRadius: 16,
    maxWidth: '82%',
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  messageBubbleMine: {
    backgroundColor: '#1E5C35',
    borderBottomRightRadius: 4,
  },
  messageBubbleClient: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderColor: '#DCE9E0',
    borderWidth: 1,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageTextMine: {
    color: '#FFFFFF',
  },
  messageTextClient: {
    color: '#16281D',
  },
  messageTime: {
    fontSize: 10,
    marginTop: 5,
  },
  messageTimeMine: {
    color: '#D8EADF',
    textAlign: 'right',
  },
  messageTimeClient: {
    color: '#708277',
  },
  emptyChatCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2ECE6',
    borderRadius: 16,
    borderWidth: 1,
    padding: 22,
  },
  emptyChatTitle: {
    color: '#16281D',
    fontSize: 15,
    fontWeight: '800',
  },
  emptyChatText: {
    color: '#708277',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 80,
    paddingHorizontal: 28,
  },
  iconCircle: {
    alignItems: 'center',
    backgroundColor: '#EAF3EC',
    borderRadius: 36,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  icon: {
    fontSize: 30,
  },
  emptyTitle: {
    color: '#16281D',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 18,
  },
  emptyText: {
    color: '#5C7267',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 9,
    textAlign: 'center',
  },
  composer: {
    alignItems: 'flex-end',
    backgroundColor: '#FFFFFF',
    borderTopColor: '#DCE9E0',
    borderTopWidth: 1,
    flexDirection: 'row',
    padding: 12,
  },
  messageInput: {
    backgroundColor: '#F5FAF6',
    borderColor: '#C9DBD0',
    borderRadius: 18,
    borderWidth: 1,
    color: '#16281D',
    flex: 1,
    fontSize: 14,
    maxHeight: 110,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: '#1E5C35',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    marginLeft: 9,
    width: 44,
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 25,
    marginTop: -2,
  },
})
