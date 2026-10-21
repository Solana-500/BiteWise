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
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useNavigation } from '@react-navigation/native'

import { supabase } from '../services/supabase'

let puChatChannelSequence = 0

type ChatAssignment = {
  id: string
  client_id: string
  coach_id: string
  client_last_read_at: string | null
}

type ChatMessage = {
  id: string
  assignment_id: string
  sender_id: string
  message_text: string
  created_at: string
}

function formatMessageTime(createdAt: string) {
  return new Intl.DateTimeFormat('en-SG', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(createdAt))
}

export default function PuChatScreen() {
  const navigation = useNavigation()

  const [assignment, setAssignment] = useState<ChatAssignment | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [messageText, setMessageText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const listRef = useRef<FlatList<ChatMessage>>(null)

  const markChatAsRead = useCallback(async (assignmentId: string) => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return
    }

    const { error } = await supabase
      .from('coach_assignments')
      .update({
        client_last_read_at: new Date().toISOString(),
      })
      .eq('id', assignmentId)
      .eq('client_id', user.id)

    if (error) {
      console.error('Unable to mark chat as read:', error)
    }
  }, [])

  const loadChat = useCallback(async () => {
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
        .select('id, client_id, coach_id, client_last_read_at')
        .or(`client_id.eq.${user.id},coach_id.eq.${user.id}`)
        .maybeSingle<ChatAssignment>()

      if (assignmentError) {
        throw assignmentError
      }

      if (!assignmentData) {
        setAssignment(null)
        setMessages([])
        return
      }

      setAssignment(assignmentData)

      const { data: messageData, error: messagesError } = await supabase
        .from('coach_messages')
        .select('id, assignment_id, sender_id, message_text, created_at')
        .eq('assignment_id', assignmentData.id)
        .order('created_at', { ascending: true })

      if (messagesError) {
        throw messagesError
      }

      setMessages((messageData ?? []) as ChatMessage[])

      // Mark the client's chat as read when they open it
      if (assignmentData.client_id === user.id) {
        await markChatAsRead(assignmentData.id)
      }
    } catch (error: any) {
      console.error('Load coach chat error:', error)

      Alert.alert(
        'Could not load chat',
        error?.message || 'Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }, [markChatAsRead])

  useFocusEffect(
    useCallback(() => {
      void loadChat()
    }, [loadChat])
  )

  useFocusEffect(
  useCallback(() => {
    if (!assignment?.id || !currentUserId) {
      return
    }

    let isActive = true

    const assignmentId = assignment.id
    const clientId = assignment.client_id

    puChatChannelSequence += 1

    const channelName =
      `pu-conversation-${assignmentId}-${Date.now()}-${puChatChannelSequence}`

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'coach_messages',
          filter: `assignment_id=eq.${assignmentId}`,
        },
        (payload) => {
          if (!isActive) {
            return
          }

          const newMessage = payload.new as ChatMessage

          setMessages((currentMessages) => {
            const alreadyExists = currentMessages.some(
              (message) => message.id === newMessage.id
            )

            if (alreadyExists) {
              return currentMessages
            }

            return [...currentMessages, newMessage]
          })

          if (
            clientId === currentUserId &&
            newMessage.sender_id !== currentUserId
          ) {
            void markChatAsRead(assignmentId)
          }
        }
      )
      .subscribe()

    return () => {
      isActive = false
      void supabase.removeChannel(channel)
    }
  }, [
    assignment?.id,
    assignment?.client_id,
    currentUserId,
    markChatAsRead,
  ])
)

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

  function renderMessage({ item }: { item: ChatMessage }) {
    const isMine = item.sender_id === currentUserId

    return (
      <View
        style={[
          styles.messageRow,
          isMine ? styles.messageRowMine : styles.messageRowCoach,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isMine ? styles.messageBubbleMine : styles.messageBubbleCoach,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isMine ? styles.messageTextMine : styles.messageTextCoach,
            ]}
          >
            {item.message_text}
          </Text>

          <Text
            style={[
              styles.messageTime,
              isMine ? styles.messageTimeMine : styles.messageTimeCoach,
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
      <SafeAreaView style={styles.screen}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E5C35" />
        </View>
      </SafeAreaView>
    )
  }

  if (!assignment) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack()
              }
            }}
          >
            <Text style={styles.backButtonText}>‹ Back</Text>
          </TouchableOpacity>

          <Text style={styles.topBarTitle}>Your Coach</Text>

          <View style={styles.topBarSpacer} />
        </View>

        <View style={styles.emptyContainer}>
          <View style={styles.iconCircle}>
            <Text style={styles.icon}>💬</Text>
          </View>

          <Text style={styles.emptyTitle}>Coach not assigned yet</Text>

          <Text style={styles.emptyText}>
            Your Premium coach will appear here once one has been assigned to
            your account.
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
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack()
              }
            }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={styles.backButtonText}>‹ Back</Text>
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.topBarTitle}>Your Coach</Text>
            <Text style={styles.onlineText}>● Available</Text>
          </View>

          <View style={styles.topBarSpacer} />
        </View>

        <View style={styles.noticeCard}>
          <Text style={styles.noticeTitle}>Private Premium coaching</Text>
          <Text style={styles.noticeText}>
            Ask about your nutrition, activity, goals, or healthy habits.
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
              <Text style={styles.emptyChatTitle}>Start the conversation</Text>
              <Text style={styles.emptyChatText}>
                Send your coach a message about your health goals or daily
                routine.
              </Text>
            </View>
          }
        />

        <View style={styles.composer}>
          <TextInput
            style={styles.messageInput}
            value={messageText}
            onChangeText={setMessageText}
            placeholder="Message your coach..."
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
  },
  onlineText: {
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
  messageRowCoach: {
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
  messageBubbleCoach: {
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
  messageTextCoach: {
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
  messageTimeCoach: {
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
    paddingHorizontal: 28,
    paddingBottom: 80,
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
