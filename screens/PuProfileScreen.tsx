// screens/PuProfileScreen.tsx
import React, { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { supabase } from '../services/supabase'

type InfoRowProps = {
  label: string
  value: string
  showDivider?: boolean
}

type PremiumFeatureProps = {
  icon: string
  title: string
  subtitle: string
}

const InfoRow = ({ label, value, showDivider = true }: InfoRowProps) => {
  return (
    <>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>

      {showDivider ? <View style={styles.divider} /> : null}
    </>
  )
}

const PremiumFeature = ({
  icon,
  title,
  subtitle,
}: PremiumFeatureProps) => {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureIconCircle}>
        <Text style={styles.featureIcon}>{icon}</Text>
      </View>

      <View style={styles.featureTextContainer}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureSubtitle}>{subtitle}</Text>
      </View>

      <Text style={styles.featureCheck}>✓</Text>
    </View>
  )
}

const PuProfileScreen = () => {
  const navigation = useNavigation()
  const [loggingOut, setLoggingOut] = useState(false)

  // Replace this mock object with real authenticated profile data later.
  const user = {
    name: 'Edmund Koh',
    email: 'edmundkoh120723@gmail.com',
    age: '25 years',
    sex: 'Male',
    height: '173 cm',
    weight: '78 kg',
    fitnessGoal: 'Body Building',
    activityLevel: 'Very Active',
    dailyCalories: '3254 kcal',
    planName: 'PREMIUM MEMBER',
    renewalDate: 'Renews on 12 Oct 2026',
  }

  const initials = user.name
    .split(' ')
    .map((name) => name.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const handleLogout = () => {
    if (loggingOut) return

    Alert.alert(
      'Log out',
      'Are you sure you want to log out of your account?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoggingOut(true)

              const { error } = await supabase.auth.signOut({
                scope: 'local',
              })

              if (error) {
                Alert.alert('Log out failed', error.message)
                return
              }

              // Do not use navigation.replace('Login') here.
              // App.tsx receives the SIGNED_OUT auth event and shows LoginScreen.
            } catch (error: any) {
              console.error('Logout error:', error)

              Alert.alert(
                'Log out failed',
                error?.message || 'Unable to log out. Please try again.'
              )
            } finally {
              setLoggingOut(false)
            }
          },
        },
      ]
    )
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5FAF6" />

      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Profile</Text>

        <Pressable
          hitSlop={12}
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.premiumTopRow}>
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumBadgeIcon}>✦</Text>
              <Text style={styles.premiumBadgeText}>PREMIUM</Text>
            </View>
          </View>

          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>

          <Text style={styles.heroName}>{user.name}</Text>
          <Text style={styles.heroEmail}>{user.email}</Text>

          <View style={styles.planChip}>
            <Text style={styles.planChipText}>{user.planName}</Text>
          </View>

          <Text style={styles.renewalText}>{user.renewalDate}</Text>
        </View>

        <Text style={styles.sectionTitle}>Personal Information</Text>

        <View style={styles.infoCard}>
          <InfoRow label="Age" value={user.age} />
          <InfoRow label="Sex" value={user.sex} />
          <InfoRow label="Height" value={user.height} />
          <InfoRow label="Weight" value={user.weight} showDivider={false} />
        </View>

        <Text style={styles.sectionTitle}>Health Goals</Text>

        <View style={styles.infoCard}>
          <InfoRow label="Fitness goal" value={user.fitnessGoal} />
          <InfoRow label="Activity level" value={user.activityLevel} />
          <InfoRow
            label="Daily calorie target"
            value={user.dailyCalories}
            showDivider={false}
          />
        </View>

        <Text style={styles.sectionTitle}>Premium Benefits</Text>

        <View style={styles.featureCard}>
          <PremiumFeature
            icon="✦"
            title="Personalised meal plans"
            subtitle="Plans tailored to your goals and preferences"
          />

          <View style={styles.divider} />

          <PremiumFeature
            icon="◉"
            title="Advanced progress reports"
            subtitle="Track nutrition, weight, and wellness trends"
          />

          <View style={styles.divider} />

          <PremiumFeature
            icon="♛"
            title="Priority coach support"
            subtitle="Get priority access to your health coach"
          />
        </View>

        <Text style={styles.sectionTitle}>Account</Text>

        <Pressable
          style={({ pressed }) => [
            styles.accountCard,
            pressed && styles.pressedCard,
          ]}
          onPress={() => {
            // Add your premium subscription screen navigation here later.
          }}
        >
          <View style={styles.accountLeft}>
            <View style={styles.accountPremiumIcon}>
              <Text style={styles.accountPremiumIconText}>✦</Text>
            </View>

            <View>
              <Text style={styles.accountTitle}>Premium Subscription</Text>
              <Text style={styles.accountSubtitle}>
                Manage plan, billing, and renewal
              </Text>
            </View>
          </View>

          <Text style={styles.chevron}>›</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.editProfileButton,
            pressed && styles.pressedButton,
          ]}
          onPress={() => {
            // Add your edit-profile screen navigation here later.
          }}
        >
          <Text style={styles.editProfileText}>Edit Profile</Text>
        </Pressable>

        <Pressable
          disabled={loggingOut}
          style={({ pressed }) => [
            styles.logoutButton,
            (pressed || loggingOut) && styles.pressedLogoutButton,
          ]}
          onPress={handleLogout}
        >
          {loggingOut ? (
            <ActivityIndicator color="#B3261E" />
          ) : (
            <Text style={styles.logoutText}>Log Out</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

export default PuProfileScreen

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5FAF6',
  },

  topBar: {
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F5FAF6',
    borderBottomWidth: 1,
    borderBottomColor: '#E2ECE6',
  },
  topBarTitle: {
    color: '#1E5C35',
    fontSize: 17,
    fontWeight: '800',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    top: 8,
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: '#1E5C35',
    fontSize: 36,
    fontWeight: '300',
    lineHeight: 38,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
  },

  heroCard: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 22,
    paddingHorizontal: 18,
    paddingBottom: 24,
    borderRadius: 22,
    backgroundColor: '#1E5C35',
    overflow: 'hidden',
  },
  premiumTopRow: {
    width: '100%',
    alignItems: 'flex-end',
    minHeight: 24,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#D8B45A',
  },
  premiumBadgeIcon: {
    color: '#163E25',
    fontSize: 12,
    fontWeight: '900',
  },
  premiumBadgeText: {
    color: '#163E25',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  avatarCircle: {
    width: 82,
    height: 82,
    marginTop: 2,
    marginBottom: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 41,
    borderWidth: 3,
    borderColor: '#E8C86D',
    backgroundColor: '#D8EADF',
  },
  avatarText: {
    color: '#1E5C35',
    fontSize: 27,
    fontWeight: '800',
  },
  heroName: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '800',
  },
  heroEmail: {
    marginTop: 4,
    color: '#D8EADF',
    fontSize: 13,
  },
  planChip: {
    marginTop: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(216, 180, 90, 0.24)',
    borderWidth: 1,
    borderColor: 'rgba(232, 200, 109, 0.65)',
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  planChipText: {
    color: '#FFF4CC',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  renewalText: {
    marginTop: 10,
    color: '#C4D9CB',
    fontSize: 12,
  },

  sectionTitle: {
    marginBottom: 10,
    color: '#5C7267',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  infoCard: {
    marginBottom: 20,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EDF3EE',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
  },
  infoLabel: {
    color: '#5C7267',
    fontSize: 14,
  },
  infoValue: {
    color: '#16281D',
    fontSize: 15,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2ECE6',
  },

  featureCard: {
    marginBottom: 20,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7EFE9',
  },
  featureRow: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIconCircle: {
    width: 38,
    height: 38,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: '#FFF4D6',
  },
  featureIcon: {
    color: '#9D7518',
    fontSize: 18,
    fontWeight: '800',
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    color: '#16281D',
    fontSize: 14,
    fontWeight: '800',
  },
  featureSubtitle: {
    marginTop: 3,
    color: '#7C8F83',
    fontSize: 11,
    lineHeight: 16,
  },
  featureCheck: {
    marginLeft: 8,
    color: '#1E5C35',
    fontSize: 20,
    fontWeight: '800',
  },

  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7EFE9',
  },
  accountLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountPremiumIcon: {
    width: 40,
    height: 40,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#FFF4D6',
  },
  accountPremiumIconText: {
    color: '#9D7518',
    fontSize: 19,
    fontWeight: '900',
  },
  accountTitle: {
    color: '#16281D',
    fontSize: 15,
    fontWeight: '800',
  },
  accountSubtitle: {
    marginTop: 3,
    color: '#7C8F83',
    fontSize: 12,
  },
  chevron: {
    color: '#1E5C35',
    fontSize: 28,
    fontWeight: '300',
  },

  editProfileButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#1E5C35',
    backgroundColor: '#F5FAF6',
  },
  editProfileText: {
    color: '#1E5C35',
    fontSize: 15,
    fontWeight: '800',
  },

  logoutButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#FDE3E3',
  },
  logoutText: {
    color: '#B3261E',
    fontSize: 15,
    fontWeight: '800',
  },

  pressedCard: {
    opacity: 0.82,
  },
  pressedButton: {
    backgroundColor: '#E7F1E9',
  },
  pressedLogoutButton: {
    opacity: 0.78,
  },
})