import { supabase } from './supabase'

import type {
  CoachWorkoutPlanDraft,
  CoachWorkoutDay,
} from '../types/navigation'

export async function saveCoachWorkoutPlan(
  requestKey: string,
  plan: CoachWorkoutPlanDraft,
  workoutsByDay: Record<string, CoachWorkoutDay>,
  submit: boolean
): Promise<string> {
  const { data, error } = await supabase.rpc(
    'save_coach_workout_plan',
    {
      p_request_key: requestKey,
      p_plan: plan,
      p_workouts: workoutsByDay,
      p_submit: submit,
    }
  )

  if (error) {
    throw error
  }

  if (typeof data !== 'string') {
    throw new Error('The save did not return a plan ID.')
  }

  return data
}