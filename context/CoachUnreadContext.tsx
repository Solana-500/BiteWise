import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { supabase } from '../services/supabase'

type CoachAssignment = {
  id: string
  client_id: string
  coach_last_read_at: string | null
}

type CoachMessage = {
  id: string
  assignment_id: string
  sender_id: string
  created_at: string
}

type CoachUnreadContextValue = {
  unreadCounts: Record<string, number>
  totalUnreadCount: number
  refreshUnreadCounts: () => Promise<void>
  markConversationAsRead: (assignmentId: string) => Promise<void>
}

const CoachUnreadContext = createContext<CoachUnreadContextValue | null>(null)

export function CoachUnreadProvider({
  children,
}: {
  children: ReactNode
}) {
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const assignmentsRef = useRef<CoachAssignment[]>([])

  const refreshUnreadCounts = useCallback(async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        assignmentsRef.current = []
        setUnreadCounts({})
        return
      }

      const { data: assignmentData, error: assignmentError } = await supabase
        .from('coach_assignments')
        .select('id, client_id, coach_last_read_at')
        .eq('coach_id', user.id)

      if (assignmentError) {
        throw assignmentError
      }

      const coachAssignments = (assignmentData ?? []) as CoachAssignment[]
      assignmentsRef.current = coachAssignments

      if (coachAssignments.length === 0) {
        setUnreadCounts({})
        return
      }

      const { data: messageData, error: messageError } = await supabase
        .from('coach_messages')
        .select('id, assignment_id, sender_id, created_at')
        .in(
          'assignment_id',
          coachAssignments.map((assignment) => assignment.id)
        )

      if (messageError) {
        throw messageError
      }

      const coachMessages = (messageData ?? []) as CoachMessage[]
      const nextUnreadCounts: Record<string, number> = {}

      coachAssignments.forEach((assignment) => {
        const lastReadAt = assignment.coach_last_read_at
          ? new Date(assignment.coach_last_read_at).getTime()
          : 0

        const unreadMessageCount = coachMessages.filter((message) => {
          const isFromThisClient =
            message.assignment_id === assignment.id &&
            message.sender_id === assignment.client_id

          const isUnread =
            new Date(message.created_at).getTime() > lastReadAt

          return isFromThisClient && isUnread
        }).length

        nextUnreadCounts[assignment.id] = unreadMessageCount
      })

      setUnreadCounts(nextUnreadCounts)
    } catch (error) {
      console.error('Could not refresh coach unread counts:', error)
    }
  }, [])

  useEffect(() => {
    void refreshUnreadCounts()
  }, [refreshUnreadCounts])

  useEffect(() => {
    const channel = supabase
      .channel('coach-unread-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'coach_messages',
        },
        (payload) => {
          const newMessage = payload.new as CoachMessage
          const assignment = assignmentsRef.current.find(
            (item) => item.id === newMessage.assignment_id
          )

          if (!assignment) {
            return
          }

          const isFromClient =
            newMessage.sender_id === assignment.client_id

          if (!isFromClient) {
            return
          }

          setUnreadCounts((currentCounts) => {
            const currentUnreadCount =
              currentCounts[assignment.id] ?? 0

            return {
              ...currentCounts,
              [assignment.id]: currentUnreadCount + 1,
            }
          })
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [])

  const markConversationAsRead = useCallback(
    async (assignmentId: string) => {
      const readAt = new Date().toISOString()

      const { error } = await supabase
        .from('coach_assignments')
        .update({
          coach_last_read_at: readAt,
        })
        .eq('id', assignmentId)

      if (error) {
        console.error(
          'Could not mark coach conversation as read:',
          error
        )
        return
      }

      assignmentsRef.current = assignmentsRef.current.map((assignment) => {
        if (assignment.id !== assignmentId) {
          return assignment
        }

        return {
          ...assignment,
          coach_last_read_at: readAt,
        }
      })

      setUnreadCounts((currentCounts) => ({
        ...currentCounts,
        [assignmentId]: 0,
      }))
    },
    []
  )

  const totalUnreadCount = useMemo(() => {
    return Object.values(unreadCounts).reduce((total, count) => {
      return total + count
    }, 0)
  }, [unreadCounts])

  const value = useMemo(() => {
    return {
      unreadCounts,
      totalUnreadCount,
      refreshUnreadCounts,
      markConversationAsRead,
    }
  }, [
    unreadCounts,
    totalUnreadCount,
    refreshUnreadCounts,
    markConversationAsRead,
  ])

  return (
    <CoachUnreadContext.Provider value={value}>
      {children}
    </CoachUnreadContext.Provider>
  )
}

export function useCoachUnread() {
  const context = useContext(CoachUnreadContext)

  if (!context) {
    throw new Error(
      'useCoachUnread must be used inside a CoachUnreadProvider.'
    )
  }

  return context
}
