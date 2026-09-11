import type { NavigatorScreenParams } from '@react-navigation/native'

export type MainTabParamList = {
  Home: undefined
  Meals: undefined
  Wellness: undefined
  Reports: undefined
  Profile: undefined
}

export type PremiumTabParamList = {
  PuHome: undefined
  Meals: undefined
  Wellness: undefined
  Reports: undefined
  PuProfile: undefined
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

  CoachHome: undefined
  CoachContent: undefined
  CoachProfile: undefined

  AdminHome: undefined
  AdminMore: undefined
}