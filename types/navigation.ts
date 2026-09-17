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
  Profile: undefined
}

export type PremiumTabParamList = {
  PuHome: undefined
  Meals: undefined
  Wellness: undefined
  Progress: undefined
  PuProfile: undefined
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

export type RootStackParamList = {
  Login: undefined
  SignUp: undefined
  CoachSignUp: undefined
  Onboarding: undefined

  MainTabs: NavigatorScreenParams<MainTabParamList>
  PremiumTabs: NavigatorScreenParams<PremiumTabParamList>

  PuCoach: undefined
  FoodLogging: undefined
  FavoriteList: undefined
  Feedback: undefined

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
  CoachProfile: undefined

  AdminHome: undefined
  AdminMore: undefined
  AdminTabs: NavigatorScreenParams<AdminTabParamList> | undefined
  AdminUsers: undefined
  AdminCoaches: undefined
  AdminReports: undefined
}