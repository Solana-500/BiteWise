import { useEffect, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import type { Session } from '@supabase/supabase-js'

import LoginScreen from './screens/LoginScreen'
import SignUpScreen from './screens/SignUpScreen'
import OnboardingScreen from './screens/OnboardingScreen'
import HomeScreen from './screens/HomeScreen'
import MealsScreen from './screens/MealsScreen'
import WellnessScreen from './screens/WellnessScreen'
import ReportsScreen from './screens/ReportsScreen'
import { supabase } from './services/supabase'
import type { RootStackParamList } from './types/navigation'

const Stack = createNativeStackNavigator<RootStackParamList>()

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasProfile, setHasProfile] = useState(false)

  useEffect(() => {
    let mounted = true

    async function initialiseApp() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!mounted) return

      setSession(session)

      if (session?.user) {
        await checkProfile(session.user.id)
      } else {
        setHasProfile(false)
      }

      setLoading(false)
    }

    async function checkProfile(userId: string) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.error('Profile check failed:', error.message)
        setHasProfile(false)
        return
      }

      setHasProfile(Boolean(data))
    }

    initialiseApp()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, updatedSession) => {
      setSession(updatedSession)

      if (updatedSession?.user) {
        await checkProfile(updatedSession.user.id)
      } else {
        setHasProfile(false)
      }

      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#1E5C35" />
      </View>
    )
  }

  return (
    <NavigationContainer>
            <Stack.Navigator
        screenOptions={{
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
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
          </>
        ) : !hasProfile ? (
          <Stack.Screen
            name="Onboarding"
            component={OnboardingScreen}
          />
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'BiteWise' }}/>
            <Stack.Screen name="Meals" component={MealsScreen} options={{ title: 'Meal Management' }}/>
            <Stack.Screen name="Wellness" component={WellnessScreen} options={{ title: 'Wellness' }}/>
            <Stack.Screen name="Reports" component={ReportsScreen} options={{ title: 'Reports' }}/>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}