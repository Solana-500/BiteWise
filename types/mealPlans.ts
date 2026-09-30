export type MealPlanStatus =
  | 'draft'
  | 'pending_review'
  | 'changes_requested'
  | 'approved'
  | 'active'
  | 'archived'

export type MealPlanRow = {
  id: string
  coach_id: string
  client_id: string
  title: string
  goal: string
  duration: string
  daily_calorie_target: number
  coach_notes: string | null
  status: MealPlanStatus
  admin_feedback: string | null
  submitted_at: string | null
  reviewed_at: string | null
  reviewed_by: string | null
  start_date: string | null
  end_date: string | null
  created_at: string
  updated_at: string
}