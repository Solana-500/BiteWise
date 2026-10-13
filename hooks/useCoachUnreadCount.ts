import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'

export function useCoachUnreadCount() {
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    let isActive = true

    async function loadUnreadCount() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    setUnreadCount(0)
    return
  }

  const { data: assignments, error: assignmentError } = await supabase
    .from('coach_assignments')
    .select('id, client_last_read_at')
    .eq('client_id', user.id)

  if (assignmentError || !assignments) {
    console.error('Unable to load chat assignments:', assignmentError)
    return
  }

  let total = 0

  for (const assignment of assignments) {
    const lastRead = assignment.client_last_read_at
      ? new Date(assignment.client_last_read_at).toISOString()
      : null

    let query = supabase
      .from('coach_messages')
      .select('id', { count: 'exact', head: true })
      .eq('assignment_id', assignment.id)
      .neq('sender_id', user.id)

    if (lastRead) {
      query = query.gt('created_at', lastRead)
    }

    const { count, error } = await query

    if (error) {
      console.error('Unable to count unread messages:', error)
      continue
    }

    total += count ?? 0
  }

  if (isActive) {
    setUnreadCount(total)
  }
}

    void loadUnreadCount()

    const channel = supabase
      .channel('pu-chat-unread-badge')
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
      .subscribe()

    return () => {
      isActive = false
      void supabase.removeChannel(channel)
    }
  }, [])

  return unreadCount
}