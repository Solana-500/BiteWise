import type { NavigatorScreenParams } from '@react-navigation/native'

export type HomeStackParamList = {
  HomeMain: undefined
  FavoriteList: undefined
}

export type MainTabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList>
  Meals: undefined
  Wellness: undefined
  Progress: undefined
  FavoriteList: undefined
  Profile: undefined
}

export type PremiumTabParamList = {
  PuHome: undefined
  Meals: undefined
  Wellness: undefined
  PuChat: undefined
  Profile: undefined
}

export type AdminTabParamList = {
  AdminHome: undefined
  AdminUsers: undefined
  AdminCoaches: undefined
  AdminReports: undefined
  AdminMore: undefined
}

export type ExerciseCategory =
  | 'Cardio'
  | 'Strength'
  | 'Workout Routines'

  export type RoutineExerciseDraft = {
  id: string
  name: string
  exerciseType: string
  muscle: string
  equipment: string
}

export type CoachWorkoutPlanDraft = {
  clientId: string
  clientName: string
  title: string
  goal: string
  durationWeeks: number
  sessionsPerWeek: number
  sessionLengthMinutes: number
  trainingLocation: string
  experienceLevel: string
  equipment: string[]
  preferredDays: string[]
  healthNotes: string
  coachNotes: string
  status: 'draft'
}

export type CoachExerciseCategory =
  | 'Strength'
  | 'Cardio'
  | 'Mobility'
  | 'Core'
  | 'Warm-up'
  | 'Cool-down'

export type CoachWorkoutExercise = {
  id: string
  name: string
  category: CoachExerciseCategory
  sets: string
  reps: string
  restSeconds: string
  load: string
  equipment: string
  notes: string
}

export type CoachWorkoutDay = {
  title: string
  focus: string
  exercises: CoachWorkoutExercise[]
}


export type RootStackParamList = {
  Login: undefined
  SignUp: undefined
  CoachSignUp: undefined
  Onboarding: undefined
  ResetPassword: undefined
  SubPremium: undefined
  PUPayment: undefined
  
  MainTabs: NavigatorScreenParams<MainTabParamList>
  PremiumTabs: NavigatorScreenParams<PremiumTabParamList>

  PuCoach: undefined
  PuChat: undefined
  FoodLogging: undefined
  FavoriteList: undefined
  Feedback: undefined
  Progress: undefined

  RateCoach: {
    coachId: string
    coachName: string
  }

  ExerciseLibrary: {
    category: ExerciseCategory
  }

  ExerciseEntry: {
    exerciseName: string
    exerciseType: string
  }

  WorkoutRoutineBuilder: {
    addedExercise?: RoutineExerciseDraft
  } | undefined

  RoutineExerciseSearch: {
    existingExercises: RoutineExerciseDraft[]
  }

  CoachTabs: undefined
  CoachHome: undefined
  CoachContent: undefined
  CoachClients: undefined
  CoachProfile: undefined
  CoachChat: undefined
  CoachWorkoutPlans: undefined
  CoachMealPlans: undefined
  CoachCreateMealPlan: undefined
  
  CoachMealPlanBuilder: {
  planBasics: {
    clientId: string
    clientName: string
    clientGoal: string
    clientDietaryPreference: string
    clientAllergies: string
    planTitle: string
    goal: string
    duration: string
    calorieTarget: number
    coachNotes: string
  }
}

  CoachCreateWorkoutPlan: undefined

  CoachWorkoutPlanBuilder: {
    workoutPlanDraft: CoachWorkoutPlanDraft
  }

  CoachWorkoutPlanReview: {
    workoutPlanDraft: CoachWorkoutPlanDraft
    workoutsByDay: Record<string, CoachWorkoutDay>
  }

CoachMealPlanReview: {
  planId?: string
  planBasics: {
    clientId: string
    clientName: string
    clientGoal: string
    clientDietaryPreference: string
    clientAllergies: string
    planTitle: string
    goal: string
    duration: string
    calorieTarget: number
    coachNotes: string
  }
  mealsByDay: Record<
    string,
    Array<{
      id: string
      mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'
      name: string
      calories: number
      serving: string
      tags: string[]
    }>
  >
}

  CoachConversation: {
  assignmentId: string
  clientId: string
  clientName: string
}

  AdminHome: undefined
  AdminMore: undefined
  AdminTabs: NavigatorScreenParams<AdminTabParamList> | undefined
  AdminUsers: undefined
  AdminCoaches: undefined
  AdminReports: undefined
}
