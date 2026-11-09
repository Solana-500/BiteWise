import { type ComponentType, useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, AppState, Linking, StyleSheet, Text, View } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import type { Session } from '@supabase/supabase-js'
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context'
import LoginScreen from './screens/LoginScreen'
import SignUpScreen from './screens/SignUpScreen'
import OnboardingScreen from './screens/OnboardingScreen'
import HomeScreen from './screens/HomeScreen'
import MealsScreen from './screens/MealsScreen'
import WellnessScreen from './screens/WellnessScreen'
import ProgressScreen from './screens/ProgressScreen'
import ProfileScreen from './screens/ProfileScreen'
import FoodLoggingScreen from './screens/FoodLoggingScreen'
import CoachSignUpScreen from './screens/CoachSignUpScreen'
import CoachHomeScreen from './screens/CoachHomeScreen'
import CoachContentScreen from './screens/CoachContentScreen'
import CoachProfileScreen from './screens/CoachProfileScreen'
import AdminHomeScreen from './screens/AdminHomeScreen'
import AdminMoreScreen from './screens/AdminMoreScreen'
import AdminUsersScreen from './screens/AdminUserListScreen'
import PuHomeScreen from './screens/PuHomeScreen'
import AiMealPlanningScreen from './screens/AiMealPlanningScreen'
import PuCoachScreen from './screens/PuCoachScreen'
import PuCoachMealPlansScreen from './screens/PuCoachMealPlansScreen'
import PuCoachRecipesScreen from './screens/PuCoachRecipesScreen'
import PuCoachWorkoutPlansScreen from './screens/PuCoachWorkoutPlansScreen'
import ExerciseLibraryScreen from './screens/ExerciseLibraryScreen'
import ExerciseEntryScreen from './screens/ExerciseEntryScreen'
import WorkoutRoutineBuilderScreen from './screens/WorkoutRoutineBuilderScreen'
import FavoriteListScreen from './screens/FavoriteListScreen'
import FeedbackScreen from './screens/FeedbackScreen'
import SubPremiumScreen from './screens/SubPremiumScreen'
import PuChatScreen from './screens/PuChatScreen'
import CoachChatScreen from './screens/CoachChatScreen'
import CoachClientsScreen from './screens/CoachClientsScreen'
import CoachConversationScreen from './screens/CoachConversationScreen'
import CoachMealPlansScreen from './screens/CoachMealPlansScreen'
import CoachCreateMealPlanScreen from './screens/CoachCreateMealPlanScreen'
import CoachMealPlanBuilderScreen from './screens/CoachMealPlanBuilderScreen'
import CoachMealPlanReviewScreen from './screens/CoachMealPlanReviewScreen'
import CoachWorkoutPlansScreen from './screens/CoachWorkoutPlansScreen'
import CoachCreateWorkoutPlanScreen from './screens/CoachCreateWorkoutPlanScreen'
import CoachWorkoutPlanBuilderScreen from './screens/CoachWorkoutPlanBuilderScreen'
import CoachWorkoutPlanReviewScreen from './screens/CoachWorkoutPlanReviewScreen'
import ResetPasswordScreen from './screens/ResetPasswordScreen'
import PUPaymentScreen from './screens/PUPaymentScreen'
import RateCoachScreen from './screens/RateCoachScreen'
import CoachRecipesScreen from './screens/CoachRecipesScreen'
import CoachRecipesBuilderScreen from './screens/CoachRecipesBuilderScreen'
import CoachRecipesReviewScreen from './screens/CoachRecipesReviewScreen'
import CoachRatingScreen from './screens/CoachRatingScreen'
import CoachContentStatusScreen from './screens/CoachContentStatusScreen'
import CoachCredentialsScreen from './screens/CoachCredentialsScreen'

import { useCoachUnreadCount } from './hooks/useCoachUnreadCount'
import { supabase } from './services/supabase'
import { CoachUnreadProvider } from './context/CoachUnreadContext'
import type {
  HomeStackParamList,
  MainTabParamList,
  PremiumTabParamList,
  RootStackParamList,
} from './types/navigation'

const Stack = createNativeStackNavigator<RootStackParamList>()
const Tab = createBottomTabNavigator<MainTabParamList>()
const PremiumTab = createBottomTabNavigator<PremiumTabParamList>()
const AdminTabNav = createBottomTabNavigator()
const CoachTabNav = createBottomTabNavigator()
const HomeStack = createNativeStackNavigator<HomeStackParamList>()

type PremiumHomeStackParamList = {
  PuHomeMain: undefined
  Progress: undefined
}

const PremiumHomeStack =
  createNativeStackNavigator<PremiumHomeStackParamList>()

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator
      screenOptions={{
        animation: 'none',
        headerShown: false,
      }}
    >
      <HomeStack.Screen name="HomeMain" component={HomeScreen} />

      <HomeStack.Screen
        name="FavoriteList"
        component={FavoriteListScreen}
        options={{
          animation: 'none',
        }}
      />
    </HomeStack.Navigator>
  )
}

function MainTabs() {
  const insets = useSafeAreaInsets()
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'none',
        tabBarActiveTintColor: '#1E5C35',
        tabBarInactiveTintColor: '#7C8F83',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
        tabBarItemStyle: {
          alignItems: 'center',
          flex: 1,
          justifyContent: 'center',
        },
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E2ECE6',
          height: 60 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 7,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStackNavigator}
        options={{
          headerShown: false,
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 19 }}>🏠</Text>
          ),
        }}
      />

      <Tab.Screen
        name="Meals"
        component={MealsScreen}
        options={{
          tabBarLabel: 'Meals',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 19 }}>🍽️</Text>
          ),
        }}
      />

      <Tab.Screen
        name="Wellness"
        component={WellnessScreen}
        options={{
          tabBarLabel: 'Wellness',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 19 }}>💧</Text>
          ),
        }}
      />

      <Tab.Screen
        name="Progress"
        component={ProgressScreen}
        options={{
          tabBarLabel: 'Progress',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 19 }}>📈</Text>
          ),
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 19 }}>👤</Text>
          ),
        }}
      />
    </Tab.Navigator>
  )
}

function PremiumHomeStackNavigator() {
  return (
    <PremiumHomeStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'none',
      }}
    >
      <PremiumHomeStack.Screen
        name="PuHomeMain"
        component={PuHomeScreen}
      />

      <PremiumHomeStack.Screen name="Progress">
        {() => <ProgressScreen {...({ isPremium: true } as any)} />}
      </PremiumHomeStack.Screen>
    </PremiumHomeStack.Navigator>
  )
}

function PremiumTabs() {
  const unreadCount = useCoachUnreadCount()
  const insets = useSafeAreaInsets()

  return (
    <PremiumTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E2ECE6',
          height: 60 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 7,
        },
      }}
    >

      <PremiumTab.Screen
        name="PuHome"
        component={PremiumHomeStackNavigator}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 19 }}>🏠</Text>
          ),
        }}
      />

      <PremiumTab.Screen
        name="Meals"
        component={MealsScreen}
        options={{
          tabBarLabel: 'Meals',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 19 }}>🍽️</Text>
          ),
        }}
      />

      <PremiumTab.Screen
        name="Wellness"
        component={WellnessScreen}
        options={{
          tabBarLabel: 'Wellness',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 19 }}>💧</Text>
          ),
        }}
      />

      <PremiumTab.Screen
        name="PuChat"
        component={PuChatScreen}
        options={{
          tabBarLabel: 'Chat',
          tabBarIcon: ({ color }) => (
            <View style={styles.tabIconContainer}>
              <Text style={{ color, fontSize: 19 }}>💬</Text>

              {unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />

      <PremiumTab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 19 }}>👤</Text>
          ),
        }}
      />
    </PremiumTab.Navigator>
  )
}

function AdminTabs() {
  return (
    <AdminTabNav.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
      }}
    >
      <AdminTabNav.Screen name="AdminHome" component={AdminHomeScreen} />
      <AdminTabNav.Screen name="AdminMore" component={AdminMoreScreen} />
      <AdminTabNav.Screen name="AdminUsers" component={AdminUsersScreen} />
    </AdminTabNav.Navigator>
  )
}

function CoachTabs() {
  return (
    <CoachTabNav.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
      }}
    >
      <CoachTabNav.Screen name="CoachHome" component={CoachHomeScreen} />
      <CoachTabNav.Screen name="CoachContent" component={CoachContentScreen} />
      <CoachTabNav.Screen name="CoachClients" component={CoachClientsScreen} />
      <CoachTabNav.Screen name="CoachChat" component={CoachChatScreen} />
      <CoachTabNav.Screen name="CoachProfile" component={CoachProfileScreen} />
    </CoachTabNav.Navigator>
  )
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasProfile, setHasProfile] = useState(false)
  const [userRole, setUserRole] = useState<'user' | 'coach' | 'admin' | null>(null)
  const [isPremium, setIsPremium] = useState(false)
  const [recoveryMode, setRecoveryMode] = useState(false)
  const [checkingRecoveryLink, setCheckingRecoveryLink] = useState(true)

  useEffect(() => {
    let active = true

    async function handleRecoveryLink(url: string | null) {
      if (!url || !active) return

      if (!url.startsWith('bitewise://reset-password')) return

      try {
        const fragment = url.split('#')[1]

        if (!fragment) {
          console.warn('Recovery link has no token fragment')
          return
        }

        const params = new URLSearchParams(fragment)

        if (params.get('type') !== 'recovery') return

        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')

        if (!accessToken || !refreshToken) {
          console.warn('Recovery link is missing tokens')
          return
        }

        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })

        if (error) throw error

        if (active) {
          setRecoveryMode(true)
        }
      } catch (error) {
        console.error('Password recovery link could not be validated')
      }
    }

    async function checkInitialRecoveryLink() {
  try {
    const initialUrl = await Linking.getInitialURL()

    if (!active) {
      return
    }

    await handleRecoveryLink(initialUrl ?? null)
  } catch (error) {
    console.warn('Unable to check initial recovery link', error)
  } finally {
    if (active) {
      setCheckingRecoveryLink(false)
    }
  }
}

void checkInitialRecoveryLink()

    const subscription = Linking.addEventListener('url', ({ url }) => {
      void handleRecoveryLink(url)
    })

    return () => {
      active = false
      subscription.remove()
    }
  }, [])

 
const checkProfile = useCallback(async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      app_role,
      subscription_tier,
      subscription_status,
      subscription_end_date,
      is_suspended
    `)
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.error('Profile check failed:', error.message)

    setHasProfile(false)
    setUserRole(null)
    setIsPremium(false)
    return
  }

  if (data) {
    setHasProfile(true)

    const role = (data.app_role ?? 'user') as
      | 'user'
      | 'coach'
      | 'admin'

    setUserRole(role)

    // Check subscription expiry
    const expiryDate = data.subscription_end_date
      ? new Date(data.subscription_end_date).getTime()
      : NaN

    const hasValidExpiry =
      Number.isFinite(expiryDate) &&
      expiryDate > Date.now()

    // Cancelled subscriptions retain access until expiry.
    const validSubscriptionStatus =
      data.subscription_status === 'active' ||
      data.subscription_status === 'cancelled'

    const hasPremiumAccess =
      role === 'user' &&
      data.is_suspended !== true &&
      data.subscription_tier === 'premium' &&
      validSubscriptionStatus &&
      hasValidExpiry

    setIsPremium(hasPremiumAccess)

  } else {
    setHasProfile(false)
    setUserRole(null)
    setIsPremium(false)
  }
}, [])

useEffect(() => {
  if (!session?.user?.id) return

  const subscription = AppState.addEventListener(
    'change',
    (nextAppState) => {
      if (nextAppState === 'active') {
        void checkProfile(session.user.id)
      }
    }
  )

  return () => {
    subscription.remove()
  }
}, [session?.user?.id, checkProfile])


  useEffect(() => {
    const channel = supabase
      .channel('bitewise-subscription-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${session?.user?.id}`,
        },
        (payload) => {
          if (session?.user?.id && payload.new.id === session.user.id) {
            void checkProfile(session.user.id)
          }
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [session?.user?.id, checkProfile])

  useEffect(() => {
    let mounted = true

    async function initialiseApp() {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession()

      if (!mounted) return

      setSession(currentSession)

      if (currentSession?.user) {
        await checkProfile(currentSession.user.id)
      } else {
        setHasProfile(false)
        setUserRole(null)
      }

      if (mounted) {
        setLoading(false)
      }
    }

    initialiseApp()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, updatedSession) => {
      setLoading(true)
      setSession(updatedSession)

      if (updatedSession?.user) {
        await checkProfile(updatedSession.user.id)
      } else {
        setHasProfile(false)
        setUserRole(null)
      }

      if (mounted) {
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [checkProfile])

  if (loading || checkingRecoveryLink) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#F5FAF6',
        }}
      >
        <ActivityIndicator size="large" color="#1E5C35" />
      </View>
    )
  }

   return (
      <SafeAreaProvider>
        <SafeAreaView
          edges={['top']}
          style={{ flex: 1, backgroundColor: '#F5FAF6' }}
        >
          <CoachUnreadProvider>
            <NavigationContainer>
          <Stack.Navigator
            screenOptions={{
              animation: 'none',
              headerShown: true,
              headerStyle: {
              backgroundColor: '#F5FAF6',
            },
            headerTintColor: '#1E5C35',
            headerTitleStyle: {
              fontWeight: '800',
            },
            headerBackButtonDisplayMode: 'minimal',
          }}
        >
          {recoveryMode ? (
            <Stack.Screen
              name="ResetPassword"
              options={{
                title: 'Reset Password',
                headerShown: false,
              }}
            >
              {() => (
                <ResetPasswordScreen
                  onComplete={() => setRecoveryMode(false)}
                />
              )}
            </Stack.Screen>
          ) : !session ? (
            <>
              <Stack.Screen
                name="Login"
                component={LoginScreen}
                options={{ title: 'Log In' }}
              />
              <Stack.Screen
                name="SignUp"
                component={SignUpScreen}
                options={{ title: 'Create Account' }}
              />
              <Stack.Screen
                name="CoachSignUp"
                component={CoachSignUpScreen}
                options={{ title: 'Coach Registration' }}
              />
            </>
          ) : !hasProfile ? (
            <Stack.Screen
              name="Onboarding"
              options={{ title: 'Create Profile' }}
            >
              {() => (
                <OnboardingScreen
                  onComplete={() => {
                    if (session?.user) {
                      checkProfile(session.user.id)
                    }
                  }}
                />
              )}
            </Stack.Screen>
          ) : userRole === 'admin' ? (
            <Stack.Screen
              name="AdminTabs"
              component={AdminTabs}
              options={{ headerShown: false }}
            />
          ) : userRole === 'coach' ? (
            <>
              <Stack.Screen
                name="CoachTabs"
                component={CoachTabs}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="CoachChat"
                component={CoachChatScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="CoachConversation"
                component={CoachConversationScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="CoachMealPlans"
                component={CoachMealPlansScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="CoachCreateMealPlan"
                component={CoachCreateMealPlanScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="CoachMealPlanBuilder"
                component={CoachMealPlanBuilderScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="CoachMealPlanReview"
                component={CoachMealPlanReviewScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="CoachWorkoutPlans"
                component={CoachWorkoutPlansScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="CoachCreateWorkoutPlan"
                component={CoachCreateWorkoutPlanScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="CoachWorkoutPlanBuilder"
                component={CoachWorkoutPlanBuilderScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="CoachWorkoutPlanReview"
                component={CoachWorkoutPlanReviewScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="CoachRecipes"
                component={CoachRecipesScreen}
                options={{ headerShown: false }}
              />

              <Stack.Screen
                name="CoachRecipesBuilder"
                component={CoachRecipesBuilderScreen}
                options={{ headerShown: false }}
              />

              <Stack.Screen
                name="CoachRecipesReview"
                component={CoachRecipesReviewScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="CoachRatings"
                component={CoachRatingScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="CoachContentStatus"
                component={CoachContentStatusScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="CoachCredentials"
                component={CoachCredentialsScreen}
                options={{ headerShown: false }}
              />
            </>
          ) : isPremium ? (
            <>
              <Stack.Screen
                name="PremiumTabs"
                component={PremiumTabs}
                options={{ headerShown: false }}
              />
              
              <Stack.Screen
                name="AiMealPlanning"
                component={AiMealPlanningScreen}
                options={{
                  title: 'AI Meal Planning',
                  headerShown: true,
                }}
              />

              <Stack.Screen
                name="SubPremium"
                component={SubPremiumScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="PuCoach"
                component={PuCoachScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="PuCoachMealPlans"
                component={PuCoachMealPlansScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="PuCoachRecipes"
                component={PuCoachRecipesScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="PuCoachWorkoutPlans"
                component={PuCoachWorkoutPlansScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="RateCoach"
                component={RateCoachScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="FoodLogging"
                component={FoodLoggingScreen}
                options={{
                  headerShown: false,
                  presentation: 'card',
                }}
              />
              <Stack.Screen
                name="Feedback"
                component={FeedbackScreen}
                options={{
                  animation: 'none',
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="ExerciseLibrary"
                component={ExerciseLibraryScreen}
                options={{
                  headerShown: false,
                  presentation: 'card',
                }}
              />
              
            <Stack.Screen
              name="ExerciseEntry"
              component={ExerciseEntryScreen}
              options={{
                headerShown: false,
                presentation: 'card',
              }}
            />

            <Stack.Screen
              name="WorkoutRoutineBuilder"
              component={WorkoutRoutineBuilderScreen}
              options={{
                headerShown: false,
                presentation: 'card',
              }}
            />

            </>
          ) : (
            <>
              <Stack.Screen
                name="MainTabs"
                component={MainTabs}
                options={{ headerShown: false }}
              />

              <Stack.Screen
                name="FoodLogging"
                component={FoodLoggingScreen}
                options={{
                  animation: 'none',
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="SubPremium"
                component={SubPremiumScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="PUPayment"
                component={PUPaymentScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Feedback"
                component={FeedbackScreen}
                options={{
                  animation: 'none',
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="ExerciseLibrary"
                component={ExerciseLibraryScreen}
                options={{
                  headerShown: false,
                  presentation: 'card',
                }}
              />
              <Stack.Screen
                name="ExerciseEntry"
                component={ExerciseEntryScreen}
                options={{
                  headerShown: false,
                  presentation: 'card',
                }}
              />
              <Stack.Screen
                name="WorkoutRoutineBuilder"
                component={WorkoutRoutineBuilderScreen}
                options={{
                  headerShown: false,
                  presentation: 'card',
                }}
              />
            </>
          )}
               </Stack.Navigator>
        </NavigationContainer>
      </CoachUnreadProvider>
    </SafeAreaView>
</SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  tabIconContainer: {
    position: 'relative',
  },
  unreadBadge: {
    position: 'absolute',
    top: -7,
    right: -11,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
})
