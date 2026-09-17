import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Text, View } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import type { Session } from '@supabase/supabase-js'

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
import PuProfileScreen from './screens/PuProfileScreen'
import PuCoachScreen from './screens/PuCoachScreen'
import ExerciseLibraryScreen from './screens/ExerciseLibraryScreen'
import ExerciseEntryScreen from './screens/ExerciseEntryScreen'
import WorkoutRoutineBuilderScreen from './screens/WorkoutRoutineBuilderScreen'
import FavoriteListScreen from './screens/FavoriteListScreen'
import FeedbackScreen from './screens/FeedbackScreen'
import SubPremiumScreen from './screens/SubPremiumScreen'

import { supabase } from './services/supabase'
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

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator
        screenOptions={{
          animation: 'none',
          headerShown: false,
        }}
      >
      <HomeStack.Screen
        name="HomeMain"
        component={HomeScreen}
      />

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
          height: 68,
          paddingBottom: 8,
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

function PremiumTabs() {
  return (
    <PremiumTab.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#F5FAF6',
        },
        headerTintColor: '#1E5C35',
        headerTitleStyle: {
          fontWeight: '800',
        },
        tabBarActiveTintColor: '#1E5C35',
        tabBarInactiveTintColor: '#7C8F83',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
        tabBarItemStyle: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        },
        tabBarStyle: {
          height: 68,
          paddingBottom: 8,
          paddingTop: 7,
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E2ECE6',
        },
      }}
    >
      <PremiumTab.Screen
        name="PuHome"
        component={PuHomeScreen}
        options={{
          headerShown: false,
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
          title: 'Meals',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 19 }}>🍽️</Text>
          ),
        }}
      />

      <PremiumTab.Screen
        name="Wellness"
        component={WellnessScreen}
        options={{
          title: 'Wellness',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 19 }}>💧</Text>
          ),
        }}
      />

      <PremiumTab.Screen
        name="Progress"
        component={ProgressScreen}
        options={{
          title: 'Progress',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 19 }}>📊</Text>
          ),
        }}
      />

      <PremiumTab.Screen
        name="PuProfile"
        component={PuProfileScreen}
        options={{
          headerShown: false,
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
        tabBarStyle: { display: 'none' }, // Hides default React Navigation tab bar since custom UI is used
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

  const checkProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, app_role, subscription_tier')
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
      setUserRole((data.app_role ?? 'user') as 'user' | 'coach' | 'admin')
      setIsPremium(data.subscription_tier === 'premium')
    } else {
      setHasProfile(false)
      setUserRole(null)
      setIsPremium(false)
    }
  }, [])

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
      // 1. Keep loading active while fetching profile data on auth state updates
      setLoading(true)
      setSession(updatedSession)

      if (updatedSession?.user) {
        await checkProfile(updatedSession.user.id)
      } else {
        setHasProfile(false)
        setUserRole(null)
      }

      // 2. Only unblock UI after checkProfile has fully updated hasProfile and userRole
      if (mounted) {
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [checkProfile])

  if (loading) {
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
        {!session ? (
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
          </>

        ) : isPremium ? (
          <>
            <Stack.Screen
              name="PremiumTabs"
              component={PremiumTabs}
              options={{ headerShown: false }}
            />

            <Stack.Screen
              name="PuCoach"
              component={PuCoachScreen}
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
  )
}