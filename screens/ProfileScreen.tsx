import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'

import { supabase } from '../services/supabase'

type Props = {
  navigation: any
}

type ProfileData = {
  full_name: string | null
  email: string | null
  age: number | null
  sex: string | null
  height_cm: number | null
  weight_kg: number | null
  allergies: string[] | null
  activity_level: string | null
  fitness_goal: string | null
  daily_calorie_target: number | null
  subscription_tier: string | null
}

type EditSection = 'personal' | 'goals' | null

type FitnessGoalRow = {
  name: string
  display_order: number
}

type ActivityLevelRow = {
  name: string
  display_order: number
}

const EMPTY_PROFILE: ProfileData = {
  full_name: null,
  email: null,
  age: null,
  sex: null,
  height_cm: null,
  weight_kg: null,
  allergies: null,
  activity_level: null,
  fitness_goal: null,
  daily_calorie_target: null,
  subscription_tier: 'free',
}

const SEX_OPTIONS = ['Male', 'Female', 'Prefer not to say']

const DEFAULT_ACTIVITY_LEVELS = [
  'Sedentary',
  'Lightly Active',
  'Moderately Active',
  'Very Active',
]

function PremiumFeature({
  icon,
  title,
  subtitle,
}: {
  icon: string
  title: string
  subtitle: string
}) {
  return (
    <View style={styles.premiumFeatureRow}>
      <View style={styles.premiumFeatureIconCircle}>
        <Text style={styles.premiumFeatureIcon}>{icon}</Text>
      </View>
      <View style={styles.premiumFeatureTextContainer}>
        <Text style={styles.premiumFeatureTitle}>{title}</Text>
        <Text style={styles.premiumFeatureSubtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.premiumFeatureCheck}>✓</Text>
    </View>
  )
}

function calculateBmi(
  heightCm: number | null,
  weightKg: number | null
) {
  if (heightCm == null || weightKg == null) return null
  if (heightCm <= 0 || weightKg <= 0) return null

  const bmi = (weightKg / heightCm / heightCm) * 10000

  return Number(bmi.toFixed(1))
}

function getBmiLabel(bmi: number | null) {
  if (bmi == null) return 'Add height and weight'
  if (bmi < 18.5) return 'Underweight'
  if (bmi < 25) return 'Healthy weight'
  if (bmi < 30) return 'Overweight'
  return 'Obesity range'
}

/**
 * Calculates recommended Daily Calorie Target based on Mifflin-St Jeor equation + TDEE multiplier + Goal offset.
 */
function calculateRecommendedCalories(
  weightKgStr: string | number | null | undefined,
  heightCmStr: string | number | null | undefined,
  ageStr: string | number | null | undefined,
  sex: string | null | undefined,
  activityLevel: string | null | undefined,
  fitnessGoal: string | null | undefined
): number | null {
  const weight = typeof weightKgStr === 'number' ? weightKgStr : parseFloat(String(weightKgStr || ''))
  const height = typeof heightCmStr === 'number' ? heightCmStr : parseFloat(String(heightCmStr || ''))
  const age = typeof ageStr === 'number' ? ageStr : parseInt(String(ageStr || ''), 10)

  // Use default fallbacks if personal metrics are not fully populated
  const validWeight = !isNaN(weight) && weight > 0 ? weight : 70
  const validHeight = !isNaN(height) && height > 0 ? height : 170
  const validAge = !isNaN(age) && age > 0 ? age : 25

  // 1. Calculate Basal Metabolic Rate (BMR) - Mifflin-St Jeor
  let bmr: number
  if (sex?.toLowerCase() === 'female') {
    bmr = 10 * validWeight + 6.25 * validHeight - 5 * validAge - 161
  } else {
    // Default to male equation for male or unspecified
    bmr = 10 * validWeight + 6.25 * validHeight - 5 * validAge + 5
  }

  // 2. Activity Level Multiplier
  let activityMultiplier = 1.2
  const act = activityLevel?.toLowerCase() || ''
  if (act.includes('very active')) {
    activityMultiplier = 1.725
  } else if (act.includes('moderately active')) {
    activityMultiplier = 1.55
  } else if (act.includes('lightly active')) {
    activityMultiplier = 1.375
  } else {
    activityMultiplier = 1.2 // Sedentary
  }

  const tdee = bmr * activityMultiplier

  // 3. Goal Calorie Adjustment
  let goalOffset = 0
  const goal = fitnessGoal?.toLowerCase() || ''
  if (goal.includes('fat loss') || goal.includes('weight loss')) {
    goalOffset = -500 // Deficit for fat loss
  } else if (goal.includes('bodybuilding') || goal.includes('body building') || goal.includes('muscle')) {
    goalOffset = 350 // Surplus for hypertrophy / muscle building
  } else if (goal.includes('powerlifting') || goal.includes('power lifting') || goal.includes('hyrox') || goal.includes('crossfit') || goal.includes('marathon')) {
    goalOffset = 400 // Athletic performance surplus
  } else {
    goalOffset = 0 // Maintenance / general wellness
  }

  const target = Math.round(tdee + goalOffset)

  // Bound target within safe, realistic daily limits
  return Math.max(1200, Math.min(4500, target))
}

export default function ProfileScreen({ navigation }: Props) {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editSection, setEditSection] = useState<EditSection>(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [passwordModalVisible, setPasswordModalVisible] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [sendingResetEmail, setSendingResetEmail] = useState(false)
  const [editAge, setEditAge] = useState('')
  const [editSex, setEditSex] = useState('')
  const [showSexMenu, setShowSexMenu] = useState(false)
  const [editHeightCm, setEditHeightCm] = useState('')
  const [editWeightKg, setEditWeightKg] = useState('')
  const [editFitnessGoal, setEditFitnessGoal] = useState('')
  const [editAllergies, setEditAllergies] = useState('')
  const [fitnessGoals, setFitnessGoals] = useState<string[]>([])
  const [showFitnessGoalMenu, setShowFitnessGoalMenu] = useState(false)
  const [editActivityLevel, setEditActivityLevel] = useState('')
  const [activityLevels, setActivityLevels] = useState<string[]>(DEFAULT_ACTIVITY_LEVELS)
  const [showActivityLevelMenu, setShowActivityLevelMenu] = useState(false)
  const [editCalorieTarget, setEditCalorieTarget] = useState('')

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true)
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) throw userError
      if (!user) {
        Alert.alert('Login required', 'Please log in again.')
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select(
          'full_name, age, sex, height_cm, weight_kg, allergies, activity_level, fitness_goal, daily_calorie_target, subscription_tier'
        )
        .eq('id', user.id)
        .maybeSingle()

      if (error) throw error

      setProfile({
        ...EMPTY_PROFILE,
        ...(data ?? {}),
        email: user.email ?? null,
      })
    } catch (error: any) {
      console.error('Load profile error:', error)
      setProfile(EMPTY_PROFILE)
      Alert.alert(
        'Profile error',
        error?.message ?? 'Unable to load your profile. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      void loadProfile()
    }, [loadProfile])
  )

  function goHome() {
    const routes = navigation.getState().routeNames
    if (routes.includes('PuHome')) {
      navigation.navigate('PuHome')
      return
    }
    navigation.navigate('Home', { screen: 'HomeMain' })
  }

  async function handleLogout() {
    Alert.alert('Log out', 'Are you sure you want to log out of BiteWise?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.auth.signOut()
          if (error) Alert.alert('Logout failed', error.message)
        },
      },
    ])
  }

  function openEditPersonal() {
    setEditAge(profile?.age != null ? String(profile.age) : '')
    setEditSex(profile?.sex ?? '')
    setShowSexMenu(false)
    setEditHeightCm(profile?.height_cm != null ? String(profile.height_cm) : '')
    setEditWeightKg(profile?.weight_kg != null ? String(profile.weight_kg) : '')
    setEditAllergies(profile?.allergies?.join(', ') ?? '')
    setEditSection('personal')
  }

  async function loadFitnessGoals() {
    try {
      const { data, error } = await supabase
        .from('fitness_goals')
        .select('name, display_order')
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      if (error) throw error
      setFitnessGoals(
        ((data ?? []) as FitnessGoalRow[]).map((goal) => goal.name)
      )
    } catch (error: any) {
      console.error('Load fitness goals error:', error)
      Alert.alert(
        'Could not load fitness goals',
        error?.message ?? 'Please try again.'
      )
    }
  }

  async function loadActivityLevels() {
    try {
      const { data, error } = await supabase
        .from('activity_levels')
        .select('name, display_order')
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      if (error) {
        setActivityLevels(DEFAULT_ACTIVITY_LEVELS)
        return
      }

      if (data && data.length > 0) {
        setActivityLevels(
          ((data ?? []) as ActivityLevelRow[]).map((item) => item.name)
        )
      } else {
        setActivityLevels(DEFAULT_ACTIVITY_LEVELS)
      }
    } catch (error) {
      setActivityLevels(DEFAULT_ACTIVITY_LEVELS)
    }
  }

  async function openEditGoals() {
    const currentGoal = profile?.fitness_goal ?? ''
    const currentActivity = profile?.activity_level ?? ''
    setEditFitnessGoal(currentGoal)
    setEditActivityLevel(currentActivity)

    // If target is already set, use it; otherwise compute recommended calories
    if (profile?.daily_calorie_target != null) {
      setEditCalorieTarget(String(profile.daily_calorie_target))
    } else {
      const rec = calculateRecommendedCalories(
        profile?.weight_kg,
        profile?.height_cm,
        profile?.age,
        profile?.sex,
        currentActivity,
        currentGoal
      )
      setEditCalorieTarget(rec != null ? String(rec) : '')
    }

    setShowFitnessGoalMenu(false)
    setShowActivityLevelMenu(false)
    setEditSection('goals')
    await Promise.all([loadFitnessGoals(), loadActivityLevels()])
  }

  function handleSelectGoal(selectedGoal: string) {
    setEditFitnessGoal(selectedGoal)
    setShowFitnessGoalMenu(false)

    // Automatically recalculate recommended calories based on selected fitness goal and active activity level
    const recalculated = calculateRecommendedCalories(
      profile?.weight_kg,
      profile?.height_cm,
      profile?.age,
      profile?.sex,
      editActivityLevel,
      selectedGoal
    )
    if (recalculated != null) {
      setEditCalorieTarget(String(recalculated))
    }
  }

  function handleSelectActivityLevel(selectedLevel: string) {
    setEditActivityLevel(selectedLevel)
    setShowActivityLevelMenu(false)

    // Automatically recalculate recommended calories based on selected activity level and active fitness goal
    const recalculated = calculateRecommendedCalories(
      profile?.weight_kg,
      profile?.height_cm,
      profile?.age,
      profile?.sex,
      selectedLevel,
      editFitnessGoal
    )
    if (recalculated != null) {
      setEditCalorieTarget(String(recalculated))
    }
  }

  function closeEditModal() {
    if (savingProfile) return
    setShowSexMenu(false)
    setShowFitnessGoalMenu(false)
    setShowActivityLevelMenu(false)
    setEditSection(null)
  }

  function getOptionalNumber(value: string) {
    const trimmed = value.trim()
    if (!trimmed) return null
    const numberValue = Number(trimmed)
    return Number.isFinite(numberValue) ? numberValue : null
  }

  function getAllergyArray(value: string): string[] | null {
    const items = value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)

    return items.length > 0 ? items : null
  }

  async function saveProfileChanges() {
    if (!editSection) return

    try {
      setSavingProfile(true)
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) throw userError
      if (!user) {
        Alert.alert(
          'Login required',
          'Your session is no longer available. Please log in again.'
        )
        return
      }

      // If user is editing personal info (height/weight/age/sex), also re-evaluate calorie target if goals are set
      let targetToSave = getOptionalNumber(editCalorieTarget)
      if (editSection === 'personal' && profile?.fitness_goal && profile?.activity_level) {
        const recalculated = calculateRecommendedCalories(
          getOptionalNumber(editWeightKg) ?? profile?.weight_kg,
          getOptionalNumber(editHeightCm) ?? profile?.height_cm,
          getOptionalNumber(editAge) ?? profile?.age,
          editSex.trim() || profile?.sex,
          profile?.activity_level,
          profile?.fitness_goal
        )
        if (recalculated != null) {
          targetToSave = recalculated
        }
      }

      const updates =
        editSection === 'personal'
          ? {
              age: getOptionalNumber(editAge),
              sex: editSex.trim() || null,
              height_cm: getOptionalNumber(editHeightCm),
              weight_kg: getOptionalNumber(editWeightKg),
              allergies: getAllergyArray(editAllergies),
              ...(targetToSave != null ? { daily_calorie_target: targetToSave } : {}),
            }
          : {
              fitness_goal: editFitnessGoal.trim() || null,
              activity_level: editActivityLevel.trim() || null,
              daily_calorie_target: getOptionalNumber(editCalorieTarget),
            }

      const { data: existingProfile, error: existingProfileError } =
        await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle()

      if (existingProfileError) throw existingProfileError

      const { data, error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, ...updates }, { onConflict: 'id' })
        .select(
          'full_name, age, sex, height_cm, weight_kg, allergies, activity_level, fitness_goal, daily_calorie_target, subscription_tier'
        )
        .single()

      if (error) throw error

      setProfile({
        ...EMPTY_PROFILE,
        ...data,
        email: user.email ?? null,
      })
      setShowSexMenu(false)
      setShowFitnessGoalMenu(false)
      setShowActivityLevelMenu(false)
      setEditSection(null)
      await loadProfile()

      if (!existingProfile) {
        Alert.alert('Profile created', 'Welcome to BiteWise!', [
          { text: 'Continue', onPress: goHome },
        ])
      } else {
        Alert.alert('Profile updated', 'Your changes have been saved.')
      }
    } catch (error: any) {
      console.error('Profile upsert error:', error)
      Alert.alert(
        'Could not save profile',
        error?.message ?? 'Please try again.'
      )
    } finally {
      setSavingProfile(false)
    }
  }

  function openChangePassword() {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setPasswordModalVisible(true)
  }

  function closePasswordModal() {
    if (savingPassword || sendingResetEmail) {
      return
    }

    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setPasswordModalVisible(false)
  }

  async function changePassword() {
    const current = currentPassword.trim()
    const password = newPassword.trim()
    const confirmation = confirmPassword.trim()

    if (!current) {
      Alert.alert(
        'Current password required',
        'Enter your current password before choosing a new password.'
      )
      return
    }

    if (password.length < 8) {
      Alert.alert(
        'Password too short',
        'Your new password must contain at least 8 characters.'
      )
      return
    }

    if (password === current) {
      Alert.alert(
        'Choose a different password',
        'Your new password must be different from your current password.'
      )
      return
    }

    if (password !== confirmation) {
      Alert.alert(
        'Passwords do not match',
        'Enter the same new password in both fields.'
      )
      return
    }

    try {
      setSavingPassword(true)

      const { error } = await supabase.auth.updateUser({
        current_password: current,
        password,
      })

      if (error) {
        throw error
      }

      Alert.alert(
        'Password updated',
        'Your password has been changed successfully.',
        [
          {
            text: 'Done',
            onPress: closePasswordModal,
          },
        ]
      )
    } catch (error: any) {
      console.error('Change password error:', error)

      Alert.alert(
        'Could not update password',
        error?.message ||
          'Your current password may be incorrect. Please try again.'
      )
    } finally {
      setSavingPassword(false)
    }
  }

  async function sendForgotPasswordEmail() {
    try {
      setSendingResetEmail(true)

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        throw userError
      }

      if (!user?.email) {
        Alert.alert(
          'Email unavailable',
          'We could not find an email address for this account.'
        )
        return
      }

      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: 'bitewise://reset-password',
      })

      if (error) {
        throw error
      }

      Alert.alert(
        'Reset email sent',
        `A password-reset link has been sent to ${user.email}. Check your inbox and spam folder.`
      )
    } catch (error: any) {
      console.error('Forgot password email error:', error)

      Alert.alert(
        'Could not send reset email',
        error?.message || 'Please try again later.'
      )
    } finally {
      setSendingResetEmail(false)
    }
  }

  function openSubscription() {
    navigation.getParent()?.navigate('SubPremium' as never)
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E5C35" />
      </View>
    )
  }

  const isPremium = profile?.subscription_tier === 'premium'
  const initials = (profile?.full_name || 'BiteWise User')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  const bmi = calculateBmi(
    profile?.height_cm ?? null,
    profile?.weight_kg ?? null
  )
  const bmiText = bmi == null ? 'Not available' : String(bmi)
  const bmiLabel = getBmiLabel(bmi)

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.backHomeButton}
          onPress={goHome}
          accessibilityRole="button"
          accessibilityLabel="Go to Home"
        >
          <Text style={styles.backHomeText}>‹ Home</Text>
        </TouchableOpacity>

        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{profile?.full_name || 'BiteWise User'}</Text>
          <Text style={styles.email}>{profile?.email || 'No email'}</Text>
          <View
            style={[
              styles.tierBadge,
              isPremium ? styles.premiumTierBadge : styles.freeTierBadge,
            ]}
          >
            <Text
              style={[
                styles.tierText,
                isPremium ? styles.premiumTierText : styles.freeTierText,
              ]}
            >
              {isPremium ? '✦ PREMIUM MEMBER' : 'FREE USER'}
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <TouchableOpacity
            style={styles.editSectionButton}
            onPress={openEditPersonal}
            accessibilityRole="button"
            accessibilityLabel="Edit personal information"
          >
            <Text style={styles.editSectionButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <InfoRow
            label="Age"
            value={profile?.age != null ? `${profile.age} years old` : 'Not set'}
          />
          <InfoRow label="Sex" value={profile?.sex || 'Not set'} />
          <InfoRow
            label="Height"
            value={
              profile?.height_cm != null ? `${profile.height_cm} cm` : 'Not set'
            }
          />
          <InfoRow
            label="Weight"
            value={
              profile?.weight_kg != null ? `${profile.weight_kg} kg` : 'Not set'
            }
          />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>BMI</Text>

            <View style={styles.bmiValueContainer}>
              <Text style={styles.infoValue}>{bmiText}</Text>
              <Text style={styles.bmiLabel}>{bmiLabel}</Text>
            </View>
          </View>

          <InfoRow
            label="Allergies"
            value={
              profile?.allergies && profile.allergies.length > 0
                ? profile.allergies.join(', ')
                : 'Not set'
            }
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Health Goals</Text>
          <TouchableOpacity
            style={styles.editSectionButton}
            onPress={() => void openEditGoals()}
            accessibilityRole="button"
            accessibilityLabel="Edit health goals"
          >
            <Text style={styles.editSectionButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>

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
              profile?.daily_calorie_target != null
                ? `${profile.daily_calorie_target} kcal`
                : 'Not set'
            }
          />
        </View>

        {isPremium ? (
          <>
            <Text style={styles.sectionTitle}>Premium Benefits</Text>
            <View style={styles.premiumBenefitsCard}>
              <PremiumFeature
                icon="✦"
                title="Personalised meal plans"
                subtitle="Plans tailored to your goals and preferences"
              />
              <View style={styles.premiumDivider} />
              <PremiumFeature
                icon="◉"
                title="Advanced progress reports"
                subtitle="Track nutrition, weight, and wellness trends"
              />
              <View style={styles.premiumDivider} />
              <PremiumFeature
                icon="♛"
                title="Priority coach support"
                subtitle="Get priority access to your health coach"
              />
            </View>
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Upgrade Your Experience</Text>
            <View style={styles.freePremiumPreviewCard}>
              <Text style={styles.freePremiumPreviewTitle}>
                Unlock BiteWise Premium
              </Text>
              <Text style={styles.freePremiumPreviewText}>
                Get AI meal planning, voice food logging, personal coach access,
                advanced nutrition insights, progress reports, and exercise
                tutorial videos for $9.90/month.
              </Text>
              <TouchableOpacity
                style={styles.upgradeButton}
                onPress={openSubscription}
                accessibilityRole="button"
                accessibilityLabel="Go Premium"
              >
                <Text style={styles.upgradeButtonText}>✦ Go Premium</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity
          style={[
            styles.accountRow,
            isPremium && styles.premiumSubscriptionRow,
          ]}
          onPress={openSubscription}
          accessibilityRole="button"
          accessibilityLabel="Manage subscription"
        >
          <View style={styles.subscriptionLeft}>
            <View
              style={[
                styles.subscriptionIcon,
                isPremium
                  ? styles.premiumSubscriptionIcon
                  : styles.freeSubscriptionIcon,
              ]}
            >
              <Text
                style={[
                  styles.subscriptionIconText,
                  isPremium
                    ? styles.premiumSubscriptionIconText
                    : styles.freeSubscriptionIconText,
                ]}
              >
                {isPremium ? '✦' : '○'}
              </Text>
            </View>
            <View>
              <Text style={styles.accountTitle}>
                {isPremium ? 'Premium Subscription' : 'Subscription'}
              </Text>
              <Text style={styles.accountSub}>
                {isPremium
                  ? 'Manage plan and Premium benefits'
                  : 'Free plan · Upgrade when ready'}
              </Text>
            </View>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.accountRow}
          onPress={openChangePassword}
          accessibilityRole="button"
          accessibilityLabel="Change password"
        >
          <View style={styles.subscriptionLeft}>
            <View style={styles.passwordIcon}>
              <Text style={styles.passwordIconText}>🔒</Text>
            </View>
            <View>
              <Text style={styles.accountTitle}>Change Password</Text>
              <Text style={styles.accountSub}>
                Update the password used to sign in
              </Text>
            </View>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          accessibilityRole="button"
          accessibilityLabel="Log out"
        >
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={editSection !== null}
        transparent
        animationType="slide"
        onRequestClose={closeEditModal}
      >
        <KeyboardAvoidingView
          style={styles.modalKeyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.editModal}>
              <View style={styles.editModalHeader}>
                <Text style={styles.editModalTitle}>
                  {editSection === 'personal'
                    ? 'Edit Personal Information'
                    : 'Edit Health Goals'}
                </Text>
                <TouchableOpacity
                  style={styles.closeModalButton}
                  disabled={savingProfile}
                  onPress={closeEditModal}
                  accessibilityRole="button"
                  accessibilityLabel="Close edit profile form"
                >
                  <Text style={styles.closeModalText}>×</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.editModalScrollContent}
              >
                {editSection === 'personal' ? (
                  <>
                    <Text style={styles.fieldLabel}>Age</Text>
                    <TextInput
                      style={styles.editInput}
                      value={editAge}
                      onChangeText={setEditAge}
                      editable={!savingProfile}
                      keyboardType="number-pad"
                      placeholder="For example, 25"
                      placeholderTextColor="#8D8A9A"
                    />

                    <Text style={styles.fieldLabel}>Sex</Text>
                    <TouchableOpacity
                      style={[
                        styles.dropdownButton,
                        savingProfile && styles.dropdownButtonDisabled,
                      ]}
                      disabled={savingProfile}
                      onPress={() => setShowSexMenu((value) => !value)}
                      accessibilityRole="button"
                      accessibilityLabel="Choose sex"
                      accessibilityState={{ expanded: showSexMenu }}
                    >
                      <Text
                        style={[
                          styles.dropdownText,
                          !editSex && styles.dropdownPlaceholder,
                        ]}
                      >
                        {editSex || 'Select sex'}
                      </Text>
                      <Text
                        style={[
                          styles.dropdownArrow,
                          showSexMenu && styles.dropdownArrowOpen,
                        ]}
                      >
                        {showSexMenu ? '⌃' : '⌄'}
                      </Text>
                    </TouchableOpacity>

                    {showSexMenu ? (
                      <View style={styles.dropdownOptionsContainer}>
                        {SEX_OPTIONS.map((option) => {
                          const isSelected = editSex === option
                          return (
                            <TouchableOpacity
                              key={option}
                              style={[
                                styles.dropdownOption,
                                isSelected && styles.dropdownOptionSelected,
                              ]}
                              disabled={savingProfile}
                              onPress={() => {
                                setEditSex(option)
                                setShowSexMenu(false)
                              }}
                              accessibilityRole="button"
                              accessibilityLabel={`Choose ${option}`}
                              accessibilityState={{ selected: isSelected }}
                            >
                              <Text
                                style={[
                                  styles.dropdownOptionText,
                                  isSelected && styles.dropdownOptionTextSelected,
                                ]}
                              >
                                {option}
                              </Text>
                              {isSelected ? (
                                <Text style={styles.dropdownOptionCheck}>✓</Text>
                              ) : null}
                            </TouchableOpacity>
                          )
                        })}
                      </View>
                    ) : null}

                    <Text style={styles.fieldLabel}>Height (cm)</Text>
                    <TextInput
                      style={styles.editInput}
                      value={editHeightCm}
                      onChangeText={setEditHeightCm}
                      editable={!savingProfile}
                      keyboardType="decimal-pad"
                      placeholder="For example, 170"
                      placeholderTextColor="#8D8A9A"
                    />

                    <Text style={styles.fieldLabel}>Weight (kg)</Text>
                    <TextInput
                      style={styles.editInput}
                      value={editWeightKg}
                      onChangeText={setEditWeightKg}
                      editable={!savingProfile}
                      keyboardType="decimal-pad"
                      placeholder="For example, 65"
                      placeholderTextColor="#8D8A9A"
                    />

                    <Text style={styles.fieldLabel}>Allergies</Text>
                    <TextInput
                      style={[styles.editInput, styles.multilineInput]}
                      value={editAllergies}
                      onChangeText={setEditAllergies}
                      editable={!savingProfile}
                      multiline
                      textAlignVertical="top"
                      maxLength={300}
                      placeholder="For example, Peanuts, shellfish, milk"
                      placeholderTextColor="#8D8A9A"
                      accessibilityLabel="Food allergies"
                    />

                    <Text style={styles.fieldHint}>
                      Separate multiple allergies with commas. Enter “None” if you
                      have no known food allergies.
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.fieldLabel}>Fitness goal</Text>
                    <TouchableOpacity
                      style={[
                        styles.dropdownButton,
                        savingProfile && styles.dropdownButtonDisabled,
                      ]}
                      disabled={savingProfile}
                      onPress={() => {
                        setShowFitnessGoalMenu((value) => !value)
                        setShowActivityLevelMenu(false)
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Choose fitness goal"
                      accessibilityState={{ expanded: showFitnessGoalMenu }}
                    >
                      <Text
                        style={[
                          styles.dropdownText,
                          !editFitnessGoal && styles.dropdownPlaceholder,
                        ]}
                      >
                        {editFitnessGoal || 'Select a fitness goal'}
                      </Text>
                      <Text
                        style={[
                          styles.dropdownArrow,
                          showFitnessGoalMenu && styles.dropdownArrowOpen,
                        ]}
                      >
                        {showFitnessGoalMenu ? '⌃' : '⌄'}
                      </Text>
                    </TouchableOpacity>

                    {showFitnessGoalMenu ? (
                      <View style={styles.dropdownOptionsContainer}>
                        {fitnessGoals.length === 0 ? (
                          <View style={styles.dropdownOptionsLoading}>
                            <ActivityIndicator size="small" color="#1E5C35" />
                            <Text style={styles.dropdownOptionsLoadingText}>
                              Loading available goals...
                            </Text>
                          </View>
                        ) : (
                          fitnessGoals.map((goal) => {
                            const isSelected = editFitnessGoal === goal
                            return (
                              <TouchableOpacity
                                key={goal}
                                style={[
                                  styles.dropdownOption,
                                  isSelected && styles.dropdownOptionSelected,
                                ]}
                                disabled={savingProfile}
                                onPress={() => handleSelectGoal(goal)}
                                accessibilityRole="button"
                                accessibilityLabel={`Choose ${goal}`}
                                accessibilityState={{ selected: isSelected }}
                              >
                                <Text
                                  style={[
                                    styles.dropdownOptionText,
                                    isSelected &&
                                      styles.dropdownOptionTextSelected,
                                  ]}
                                >
                                  {goal}
                                </Text>
                                {isSelected ? (
                                  <Text style={styles.dropdownOptionCheck}>✓</Text>
                                ) : null}
                              </TouchableOpacity>
                            )
                          })
                        )}
                      </View>
                    ) : null}

                    <Text style={styles.fieldLabel}>Activity level</Text>
                    <TouchableOpacity
                      style={[
                        styles.dropdownButton,
                        savingProfile && styles.dropdownButtonDisabled,
                      ]}
                      disabled={savingProfile}
                      onPress={() => {
                        setShowActivityLevelMenu((value) => !value)
                        setShowFitnessGoalMenu(false)
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Choose activity level"
                      accessibilityState={{ expanded: showActivityLevelMenu }}
                    >
                      <Text
                        style={[
                          styles.dropdownText,
                          !editActivityLevel && styles.dropdownPlaceholder,
                        ]}
                      >
                        {editActivityLevel || 'Select activity level'}
                      </Text>
                      <Text
                        style={[
                          styles.dropdownArrow,
                          showActivityLevelMenu && styles.dropdownArrowOpen,
                        ]}
                      >
                        {showActivityLevelMenu ? '⌃' : '⌄'}
                      </Text>
                    </TouchableOpacity>

                    {showActivityLevelMenu ? (
                      <View style={styles.dropdownOptionsContainer}>
                        {activityLevels.map((level) => {
                          const isSelected = editActivityLevel === level
                          return (
                            <TouchableOpacity
                              key={level}
                              style={[
                                styles.dropdownOption,
                                isSelected && styles.dropdownOptionSelected,
                              ]}
                              disabled={savingProfile}
                              onPress={() => handleSelectActivityLevel(level)}
                              accessibilityRole="button"
                              accessibilityLabel={`Choose ${level}`}
                              accessibilityState={{ selected: isSelected }}
                            >
                              <Text
                                style={[
                                  styles.dropdownOptionText,
                                  isSelected &&
                                    styles.dropdownOptionTextSelected,
                                ]}
                              >
                                {level}
                              </Text>
                              {isSelected ? (
                                <Text style={styles.dropdownOptionCheck}>✓</Text>
                              ) : null}
                            </TouchableOpacity>
                          )
                        })}
                      </View>
                    ) : null}

                    <Text style={styles.fieldLabel}>
                      Daily calorie target (kcal)
                    </Text>
                    <TextInput
                      style={styles.editInput}
                      value={editCalorieTarget}
                      onChangeText={setEditCalorieTarget}
                      editable={!savingProfile}
                      keyboardType="number-pad"
                      placeholder="For example, 2000"
                      placeholderTextColor="#8D8A9A"
                    />
                    <Text style={styles.fieldHint}>
                      Calculated automatically using your personal metrics and activity level. You can also customize it manually.
                    </Text>
                  </>
                )}

                <TouchableOpacity
                  style={[
                    styles.saveChangesButton,
                    savingProfile && styles.saveChangesButtonDisabled,
                  ]}
                  disabled={savingProfile}
                  onPress={() => void saveProfileChanges()}
                  accessibilityRole="button"
                  accessibilityLabel="Save profile changes"
                >
                  {savingProfile ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveChangesButtonText}>
                      Save Changes
                    </Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={passwordModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closePasswordModal}
      >
        <KeyboardAvoidingView
          style={styles.modalKeyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.editModal}>
              <View style={styles.editModalHeader}>
                <Text style={styles.editModalTitle}>Change Password</Text>
                <TouchableOpacity
                  style={styles.closeModalButton}
                  disabled={savingPassword}
                  onPress={closePasswordModal}
                  accessibilityRole="button"
                  accessibilityLabel="Close change password form"
                >
                  <Text style={styles.closeModalText}>×</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.passwordModalDescription}>
                Enter your current password to confirm it is you, then choose a
                new password.
              </Text>

              <Text style={styles.fieldLabel}>Current password</Text>
              <TextInput
                style={styles.editInput}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                editable={!savingPassword && !sendingResetEmail}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="Enter your current password"
                placeholderTextColor="#8D8A9A"
                accessibilityLabel="Current password"
              />

              <Text style={styles.fieldLabel}>New password</Text>
              <TextInput
                style={styles.editInput}
                value={newPassword}
                onChangeText={setNewPassword}
                editable={!savingPassword && !sendingResetEmail}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="At least 8 characters"
                placeholderTextColor="#8D8A9A"
                accessibilityLabel="New password"
              />

              <Text style={styles.fieldLabel}>Confirm new password</Text>
              <TextInput
                style={styles.editInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                editable={!savingPassword && !sendingResetEmail}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="Enter the new password again"
                placeholderTextColor="#8D8A9A"
                accessibilityLabel="Confirm new password"
              />

              <TouchableOpacity
                style={[
                  styles.saveChangesButton,
                  (savingPassword || sendingResetEmail) &&
                    styles.saveChangesButtonDisabled,
                ]}
                disabled={savingPassword || sendingResetEmail}
                onPress={() => void changePassword()}
                accessibilityRole="button"
                accessibilityLabel="Update password"
              >
                {savingPassword ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveChangesButtonText}>
                    Update Password
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.forgotPasswordButton}
                disabled={savingPassword || sendingResetEmail}
                onPress={() => void sendForgotPasswordEmail()}
                accessibilityRole="button"
                accessibilityLabel="Send a password reset email"
              >
                {sendingResetEmail ? (
                  <ActivityIndicator size="small" color="#1E5C35" />
                ) : (
                  <Text style={styles.forgotPasswordText}>
                    Forgot your current password?
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
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
    alignItems: 'center',
    backgroundColor: '#F5FAF6',
    flex: 1,
    justifyContent: 'center',
  },
  container: {
    backgroundColor: '#F5FAF6',
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
    paddingTop: 71,
  },
  backHomeButton: {
    alignSelf: 'flex-start',
    marginBottom: 8,
    paddingRight: 14,
    paddingVertical: 8,
  },
  backHomeText: {
    color: '#1E5C35',
    fontSize: 15,
    fontWeight: '800',
  },
  profileHeader: {
    alignItems: 'center',
    backgroundColor: '#1E5C35',
    borderRadius: 18,
    marginBottom: 24,
    padding: 22,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#D9ECDF',
    borderRadius: 36,
    height: 72,
    justifyContent: 'center',
    marginBottom: 10,
    width: 72,
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
    borderRadius: 999,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  tierText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  freeTierBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  premiumTierBadge: {
    backgroundColor: '#D8B45A',
  },
  freeTierText: {
    color: '#FFFFFF',
  },
  premiumTierText: {
    color: '#163E25',
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#5C7267',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  editSectionButton: {
    alignItems: 'center',
    backgroundColor: '#EAF3EC',
    borderRadius: 8,
    justifyContent: 'center',
    marginBottom: 10,
    minHeight: 32,
    paddingHorizontal: 12,
  },
  editSectionButtonText: {
    color: '#1E5C35',
    fontSize: 12,
    fontWeight: '800',
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
  bmiValueContainer: {
    alignItems: 'flex-end',
    flex: 1,
    marginLeft: 14,
  },
  bmiLabel: {
    color: '#7C8F83',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
  },
  premiumBenefitsCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E7EFE9',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 22,
    paddingHorizontal: 16,
  },
  premiumFeatureRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 78,
  },
  premiumFeatureIconCircle: {
    alignItems: 'center',
    backgroundColor: '#FFF4D6',
    borderRadius: 19,
    height: 38,
    justifyContent: 'center',
    marginRight: 12,
    width: 38,
  },
  premiumFeatureIcon: {
    color: '#9D7518',
    fontSize: 18,
    fontWeight: '800',
  },
  premiumFeatureTextContainer: {
    flex: 1,
  },
  premiumFeatureTitle: {
    color: '#16281D',
    fontSize: 14,
    fontWeight: '800',
  },
  premiumFeatureSubtitle: {
    color: '#7C8F83',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  premiumFeatureCheck: {
    color: '#1E5C35',
    fontSize: 20,
    fontWeight: '800',
    marginLeft: 8,
  },
  premiumDivider: {
    backgroundColor: '#E2ECE6',
    height: 1,
  },
  freePremiumPreviewCard: {
    backgroundColor: '#FFF7DC',
    borderColor: '#F4C95D',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 22,
    padding: 18,
  },
  freePremiumPreviewTitle: {
    color: '#4E3907',
    fontSize: 17,
    fontWeight: '900',
  },
  freePremiumPreviewText: {
    color: '#69511D',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
  },
  upgradeButton: {
    alignItems: 'center',
    backgroundColor: '#F4C95D',
    borderRadius: 12,
    justifyContent: 'center',
    marginTop: 16,
    minHeight: 46,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  upgradeButtonText: {
    color: '#16281D',
    fontSize: 14,
    fontWeight: '900',
  },
  accountRow: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2ECE6',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    padding: 16,
  },
  premiumSubscriptionRow: {
    borderColor: '#E8C86D',
  },
  subscriptionLeft: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
  },
  subscriptionIcon: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    marginRight: 12,
    width: 40,
  },
  freeSubscriptionIcon: {
    backgroundColor: '#EAF3EC',
  },
  premiumSubscriptionIcon: {
    backgroundColor: '#FFF4D6',
  },
  subscriptionIconText: {
    fontSize: 19,
    fontWeight: '900',
  },
  freeSubscriptionIconText: {
    color: '#1E5C35',
  },
  premiumSubscriptionIconText: {
    color: '#9D7518',
  },
  passwordIcon: {
    alignItems: 'center',
    backgroundColor: '#EAF3EC',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    marginRight: 12,
    width: 40,
  },
  passwordIconText: {
    fontSize: 17,
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
    marginTop: 6,
    paddingVertical: 14,
  },
  logoutText: {
    color: '#B3261E',
    fontSize: 14,
    fontWeight: '800',
  },
  modalKeyboardAvoidingView: {
    flex: 1,
  },
  modalBackdrop: {
    backgroundColor: 'rgba(22, 40, 29, 0.45)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  editModal: {
    backgroundColor: '#F5FAF6',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: '90%',
    paddingBottom: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  editModalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  editModalTitle: {
    color: '#16281D',
    fontSize: 19,
    fontWeight: '800',
  },
  editModalScrollContent: {
    paddingBottom: 24,
  },
  closeModalButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  closeModalText: {
    color: '#1E5C35',
    fontSize: 30,
    fontWeight: '300',
    lineHeight: 34,
  },
  passwordModalDescription: {
    color: '#5C7267',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  forgotPasswordButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    marginTop: 8,
  },
  forgotPasswordText: {
    color: '#1E5C35',
    fontSize: 13,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  fieldLabel: {
    color: '#16281D',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 7,
    marginTop: 14,
  },
  fieldHint: {
    color: '#7C8F83',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 7,
  },
  editInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#C9DBD0',
    borderRadius: 12,
    borderWidth: 1,
    color: '#16281D',
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  multilineInput: {
    minHeight: 100,
    paddingTop: 13,
  },
  saveChangesButton: {
    alignItems: 'center',
    backgroundColor: '#1E5C35',
    borderRadius: 12,
    justifyContent: 'center',
    marginTop: 24,
    minHeight: 52,
  },
  saveChangesButtonDisabled: {
    opacity: 0.7,
  },
  saveChangesButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  dropdownButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#C9DBD0',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: 14,
  },
  dropdownButtonDisabled: {
    opacity: 0.7,
  },
  dropdownText: {
    color: '#16281D',
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  dropdownPlaceholder: {
    color: '#8D8A9A',
    fontWeight: '400',
  },
  dropdownArrow: {
    color: '#1E5C35',
    fontSize: 23,
    fontWeight: '800',
    lineHeight: 23,
    marginLeft: 12,
    marginTop: -4,
  },
  dropdownArrowOpen: {
    marginTop: 0,
  },
  dropdownOptionsContainer: {
    backgroundColor: '#FFFFFF',
    borderColor: '#C9DBD0',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
    overflow: 'hidden',
  },
  dropdownOptionsLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 70,
    paddingVertical: 12,
  },
  dropdownOptionsLoadingText: {
    color: '#708277',
    fontSize: 12,
    marginTop: 8,
  },
  dropdownOption: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#E2ECE6',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dropdownOptionSelected: {
    backgroundColor: '#EAF3EC',
  },
  dropdownOptionText: {
    color: '#16281D',
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  dropdownOptionTextSelected: {
    color: '#1E5C35',
    fontWeight: '800',
  },
  dropdownOptionCheck: {
    color: '#1E5C35',
    fontSize: 19,
    fontWeight: '900',
    marginLeft: 10,
  },
})
