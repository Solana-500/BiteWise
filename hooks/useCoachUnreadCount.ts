import { useEffect, useState } from 'react'
import { AppState } from 'react-native'
import { supabase } from '../services/supabase'

let unreadChannelSequence = 0

export function useCoachUnreadCount() {
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    let isActive = true
    let latestRequestId = 0

    unreadChannelSequence += 1

    const channelName =
      `pu-chat-unread-badge-${Date.now()}-${unreadChannelSequence}`

    async function loadUnreadCount() {
      const requestId = ++latestRequestId

      function canUpdateState() {
        return isActive && requestId === latestRequestId
      }

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError) {
          throw userError
        }

        if (!user) {
          if (canUpdateState()) {
            setUnreadCount(0)
          }

          return
        }

        const {
          data: assignments,
          error: assignmentError,
        } = await supabase
          .from('coach_assignments')
          .select('id, client_last_read_at')
          .eq('client_id', user.id)

        if (assignmentError) {
          throw assignmentError
        }

        let total = 0

        for (const assignment of assignments ?? []) {
          if (!isActive) {
            return
          }

          let query = supabase
            .from('coach_messages')
            .select('id', {
              count: 'exact',
              head: true,
            })
            .eq('assignment_id', assignment.id)
            .neq('sender_id', user.id)

          if (assignment.client_last_read_at) {
            query = query.gt(
              'created_at',
              assignment.client_last_read_at
            )
          }

          const { count, error } = await query

          if (error) {
            throw error
          }

          total += count ?? 0
        }

        if (canUpdateState()) {
          setUnreadCount(total)
        }
      } catch (error) {
        if (isActive) {
          console.error(
            'Unable to load coach unread count:',
            error
          )
        }
      }
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'coach_messages',
        },
        () => {
          void loadUnreadCount()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'coach_assignments',
        },
        () => {
          void loadUnreadCount()
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void loadUnreadCount()
        }

        if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT'
        ) {
          console.warn(
            'Premium chat unread subscription:',
            status
          )
        }
      })

    void loadUnreadCount()

    const appStateSubscription = AppState.addEventListener(
      'change',
      (state) => {
        if (state === 'active') {
          void loadUnreadCount()
        }
      }
    )

    return () => {
      isActive = false
      latestRequestId += 1

      appStateSubscription.remove()
      void supabase.removeChannel(channel)
    }
  }, [])

  return unreadCount
}