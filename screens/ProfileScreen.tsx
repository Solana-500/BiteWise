import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'

import { supabase } from '../services/supabase'

import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import type { MainTabParamList } from '../types/navigation'

type Props = BottomTabScreenProps<MainTabParamList, 'Profile'>


type ProfileData = {
  full_name: string | null
  email: string | null
  age: number | null
  sex: string | null
  height_cm: number | null
  weight_kg: number | null
  activity_level: string | null
  fitness_goal: string | null
  daily_calorie_target: number | null
  tier: string | null
}

export default function ProfileScreen({ navigation }: Props) {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async () => {
    setLoading(true)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setLoading(false)
      Alert.alert('Login required', 'Please log in again.')
      return
    }

    const { data, error } = await supabase
      .from('profiles')
      .select(
        'full_name, age, sex, height_cm, weight_kg, activity_level, fitness_goal, daily_calorie_target, tier'
      )
      .eq('id', user.id)
      .single()

    if (error) {
      setLoading(false)
      Alert.alert('Profile error', error.message)
      return
    }

    setProfile({
      ...data,
      email: user.email ?? null,
    })
    setLoading(false)
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadProfile()
    }, [loadProfile])
  )

  async function handleLogout() {
    Alert.alert(
      'Log out',
      'Are you sure you want to log out of BiteWise?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.auth.signOut()

            if (error) {
              Alert.alert('Logout failed', error.message)
            }
          },
        },
      ]
    )
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E5C35" />
      </View>
    )
  }

  const initials = (profile?.full_name || 'BiteWise User')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <ScrollView contentContainerStyle={styles.container}>
       <TouchableOpacity
        style={styles.backHomeButton}
        onPress={() =>
          navigation.navigate('Home', {
            screen: 'HomeMain',
          })
        }
        accessibilityRole="button"
        accessibilityLabel="Go to Home"
      >
        <Text style={styles.backHomeText}>‹ Home</Text>
      </TouchableOpacity>

      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        <Text style={styles.name}>
          {profile?.full_name || 'BiteWise User'}
        </Text>

        <Text style={styles.email}>{profile?.email || 'No email'}</Text>

        <View style={styles.tierBadge}>
          <Text style={styles.tierText}>
            {profile?.tier === 'premium' ? 'PREMIUM USER' : 'FREE USER'}
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Personal Information</Text>

      <View style={styles.infoCard}>
        <InfoRow 
            label="Age" 
            value={profile?.age != null ? `${profile.age} years old` : 'Not set'} 
          />
          <InfoRow label="Sex" value={profile?.sex || 'Not set'} />
        <InfoRow
          label="Height"
          value={profile?.height_cm ? `${profile.height_cm} cm` : 'Not set'}
        />
        <InfoRow
          label="Weight"
          value={profile?.weight_kg ? `${profile.weight_kg} kg` : 'Not set'}
        />
      </View>

      <Text style={styles.sectionTitle}>Health Goals</Text>

      <View style={styles.infoCard}>
        <InfoRow
          label="Fitness goal"
          value={profile?.fitness_goal || 'Not set'}
        />
        <InfoRow
          label="Activity level"
          value={profile?.activity_level || 'Not set'}
        />
        <InfoRow
          label="Daily calorie target"
          value={
            profile?.daily_calorie_target
              ? `${profile.daily_calorie_target} kcal`
              : 'Not set'
          }
        />
      </View>

      <Text style={styles.sectionTitle}>Account</Text>

      <TouchableOpacity style={styles.accountRow}>
        <View>
          <Text style={styles.accountTitle}>Subscription</Text>
          <Text style={styles.accountSub}>
            {profile?.tier === 'premium'
              ? 'Manage your Premium plan'
              : 'Free plan · Upgrade when ready'}
          </Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5FAF6',
  },
  container: {
    flexGrow: 1,
    backgroundColor: '#F5FAF6',
    padding: 20,
    paddingBottom: 44,
  },
  profileHeader: {
    alignItems: 'center',
    backgroundColor: '#1E5C35',
    borderRadius: 18,
    padding: 22,
    marginBottom: 24,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#D9ECDF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarText: {
    color: '#1E5C35',
    fontSize: 24,
    fontWeight: '900',
  },
  name: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  email: {
    color: '#D8EADF',
    fontSize: 13,
    marginTop: 4,
  },
  tierBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 12,
  },
  tierText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  sectionTitle: {
    color: '#5C7267',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2ECE6',
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 22,
    paddingHorizontal: 16,
  },
  infoRow: {
    borderBottomColor: '#EEF4F0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  infoLabel: {
    color: '#7C8F83',
    fontSize: 13,
  },
  infoValue: {
    color: '#16281D',
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 14,
    textAlign: 'right',
  },
  accountRow: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2ECE6',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 20,
  },
  accountTitle: {
    color: '#16281D',
    fontSize: 14,
    fontWeight: '800',
  },
  accountSub: {
    color: '#7C8F83',
    fontSize: 12,
    marginTop: 4,
  },
  chevron: {
    color: '#1E5C35',
    fontSize: 28,
    fontWeight: '300',
  },
  logoutButton: {
    alignItems: 'center',
    backgroundColor: '#FDE3E3',
    borderRadius: 10,
    paddingVertical: 14,
  },
  logoutText: {
    color: '#B3261E',
    fontSize: 14,
    fontWeight: '800',
  },
  backHomeButton: {
  alignSelf: 'flex-start',
  paddingVertical: 8,
  paddingRight: 14,
  marginBottom: 8,
},
backHomeText: {
  color: '#1E5C35',
  fontSize: 15,
  fontWeight: '800',
},
})