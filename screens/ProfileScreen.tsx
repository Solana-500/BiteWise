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
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'

import { supabase } from '../services/supabase'
import type {
  MainTabParamList,
  PremiumTabParamList,
} from '../types/navigation'

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

const EMPTY_PROFILE: ProfileData = {
  full_name: null,
  email: null,
  age: null,
  sex: null,
  height_cm: null,
  weight_kg: null,
  activity_level: null,
  fitness_goal: null,
  daily_calorie_target: null,
  subscription_tier: 'free',
}

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

export default function ProfileScreen({ navigation }: Props) {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)

  const [editSection, setEditSection] = useState<EditSection>(null)
  const [savingProfile, setSavingProfile] = useState(false)

  const [editAge, setEditAge] = useState('')
  const [editSex, setEditSex] = useState('')
  const [editHeightCm, setEditHeightCm] = useState('')
  const [editWeightKg, setEditWeightKg] = useState('')

  const [editFitnessGoal, setEditFitnessGoal] = useState('')
  const [fitnessGoals, setFitnessGoals] = useState<string[]>([])
  const [showFitnessGoalMenu, setShowFitnessGoalMenu] = useState(false)

  const [editActivityLevel, setEditActivityLevel] = useState('')
  const [editCalorieTarget, setEditCalorieTarget] = useState('')

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true)

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        throw userError
      }

      if (!user) {
        Alert.alert('Login required', 'Please log in again.')
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select(
          'full_name, age, sex, height_cm, weight_kg, activity_level, fitness_goal, daily_calorie_target, subscription_tier'
        )
        .eq('id', user.id)
        .maybeSingle()

      if (error) {
        throw error
      }

      if (!data) {
        setProfile({
          ...EMPTY_PROFILE,
          email: user.email ?? null,
        })
        return
      }

      setProfile({
        ...EMPTY_PROFILE,
        ...data,
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
  const currentTabRoutes = navigation.getState().routeNames

  const tabNavigation = navigation as any

  if (currentTabRoutes.includes('PuHome')) {
    tabNavigation.navigate('PuHome')
    return
  }

  tabNavigation.navigate('Home', {
    screen: 'HomeMain',
  })
}

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

  function openEditPersonal() {
    setEditAge(
      profile?.age !== null && profile?.age !== undefined
        ? String(profile.age)
        : ''
    )
    setEditSex(profile?.sex ?? '')
    setEditHeightCm(
      profile?.height_cm !== null && profile?.height_cm !== undefined
        ? String(profile.height_cm)
        : ''
    )
    setEditWeightKg(
      profile?.weight_kg !== null && profile?.weight_kg !== undefined
        ? String(profile.weight_kg)
        : ''
    )
    setEditSection('personal')
  }

  async function loadFitnessGoals() {
    try {
      const { data, error } = await supabase
        .from('fitness_goals')
        .select('name, display_order')
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      if (error) {
        throw error
      }

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

  async function openEditGoals() {
    setEditFitnessGoal(profile?.fitness_goal ?? '')
    setEditActivityLevel(profile?.activity_level ?? '')
    setEditCalorieTarget(
      profile?.daily_calorie_target !== null &&
        profile?.daily_calorie_target !== undefined
        ? String(profile.daily_calorie_target)
        : ''
    )

    setShowFitnessGoalMenu(false)
    setEditSection('goals')

    await loadFitnessGoals()
  }

  function closeEditModal() {
    if (savingProfile) {
      return
    }

    setShowFitnessGoalMenu(false)
    setEditSection(null)
  }

  function getOptionalNumber(value: string) {
    const trimmedValue = value.trim()

    if (!trimmedValue) {
      return null
    }

    const numberValue = Number(trimmedValue)

    return Number.isFinite(numberValue) ? numberValue : null
  }

  async function saveProfileChanges() {
    if (!editSection) {
      return
    }

    try {
      setSavingProfile(true)

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        throw userError
      }

      if (!user) {
        Alert.alert(
          'Login required',
          'Your session is no longer available. Please log in again.'
        )
        return
      }

      const updates =
        editSection === 'personal'
          ? {
              age: getOptionalNumber(editAge),
              sex: editSex.trim() || null,
              height_cm: getOptionalNumber(editHeightCm),
              weight_kg: getOptionalNumber(editWeightKg),
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

      if (existingProfileError) {
        throw existingProfileError
      }

      const isFirstProfileSave = !existingProfile

      const { data, error } = await supabase
        .from('profiles')
        .upsert(
          {
            id: user.id,
            ...updates,
          },
          {
            onConflict: 'id',
          }
        )
        .select(
          'full_name, age, sex, height_cm, weight_kg, activity_level, fitness_goal, daily_calorie_target, subscription_tier'
        )
        .single()

      if (error) {
        throw error
      }

      setProfile({
        ...EMPTY_PROFILE,
        ...data,
        email: user.email ?? null,
      })

      setShowFitnessGoalMenu(false)
      setEditSection(null)

      await loadProfile()

      if (isFirstProfileSave) {
      Alert.alert('Profile created', 'Welcome to BiteWise!', [
        {
          text: 'Continue',
          onPress: goHome,
        },
      ])
      return
    }

      Alert.alert('Profile updated', 'Your changes have been saved.')
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

          <Text style={styles.name}>
            {profile?.full_name || 'BiteWise User'}
          </Text>

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
            value={
              profile?.age !== null && profile?.age !== undefined
                ? `${profile.age} years old`
                : 'Not set'
            }
          />
          <InfoRow label="Sex" value={profile?.sex || 'Not set'} />
          <InfoRow
            label="Height"
            value={
              profile?.height_cm !== null &&
              profile?.height_cm !== undefined
                ? `${profile.height_cm} cm`
                : 'Not set'
            }
          />
          <InfoRow
            label="Weight"
            value={
              profile?.weight_kg !== null &&
              profile?.weight_kg !== undefined
                ? `${profile.weight_kg} kg`
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
              profile?.daily_calorie_target !== null &&
              profile?.daily_calorie_target !== undefined
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
              advanced nutrition insights, progress reports, and exercise tutorial
              videos for $9.90/month.
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
                    <TextInput
                      style={styles.editInput}
                      value={editSex}
                      onChangeText={setEditSex}
                      editable={!savingProfile}
                      placeholder="For example, Female"
                      placeholderTextColor="#8D8A9A"
                    />

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
                  </>
                ) : (
                  <>
                    <Text style={styles.fieldLabel}>Fitness goal</Text>

                    <TouchableOpacity
                      style={[
                        styles.goalDropdownButton,
                        savingProfile && styles.goalDropdownButtonDisabled,
                      ]}
                      disabled={savingProfile}
                      onPress={() =>
                        setShowFitnessGoalMenu(
                          (currentValue) => !currentValue
                        )
                      }
                      accessibilityRole="button"
                      accessibilityLabel="Choose fitness goal"
                      accessibilityState={{
                        expanded: showFitnessGoalMenu,
                      }}
                    >
                      <Text
                        style={[
                          styles.goalDropdownText,
                          !editFitnessGoal && styles.goalDropdownPlaceholder,
                        ]}
                      >
                        {editFitnessGoal || 'Select a fitness goal'}
                      </Text>

                      <Text
                        style={[
                          styles.goalDropdownArrow,
                          showFitnessGoalMenu &&
                            styles.goalDropdownArrowOpen,
                        ]}
                      >
                        {showFitnessGoalMenu ? '⌃' : '⌄'}
                      </Text>
                    </TouchableOpacity>

                    {showFitnessGoalMenu ? (
                      <View style={styles.goalOptionsContainer}>
                        {fitnessGoals.length === 0 ? (
                          <View style={styles.goalOptionsLoading}>
                            <ActivityIndicator size="small" color="#1E5C35" />
                            <Text style={styles.goalOptionsLoadingText}>
                              Loading available goals...
                            </Text>
                          </View>
                        ) : (
                          <ScrollView
                            nestedScrollEnabled
                            showsVerticalScrollIndicator
                            style={styles.goalOptionsScroll}
                            contentContainerStyle={
                              styles.goalOptionsScrollContent
                            }
                          >
                            {fitnessGoals.map((goal) => {
                              const isSelected = editFitnessGoal === goal

                              return (
                                <TouchableOpacity
                                  key={goal}
                                  style={[
                                    styles.goalOption,
                                    isSelected && styles.goalOptionSelected,
                                  ]}
                                  disabled={savingProfile}
                                  onPress={() => {
                                    setEditFitnessGoal(goal)
                                    setShowFitnessGoalMenu(false)
                                  }}
                                  accessibilityRole="button"
                                  accessibilityLabel={`Choose ${goal}`}
                                  accessibilityState={{ selected: isSelected }}
                                >
                                  <Text
                                    style={[
                                      styles.goalOptionText,
                                      isSelected &&
                                        styles.goalOptionTextSelected,
                                    ]}
                                  >
                                    {goal}
                                  </Text>

                                  {isSelected ? (
                                    <Text style={styles.goalOptionCheck}>✓</Text>
                                  ) : null}
                                </TouchableOpacity>
                              )
                            })}
                          </ScrollView>
                        )}
                      </View>
                    ) : null}

                    <Text style={styles.fieldLabel}>Activity level</Text>
                    <TextInput
                      style={styles.editInput}
                      value={editActivityLevel}
                      onChangeText={setEditActivityLevel}
                      editable={!savingProfile}
                      placeholder="For example, Moderately active"
                      placeholderTextColor="#8D8A9A"
                    />

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
    marginBottom: 20,
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
    maxHeight: '88%',
    paddingBottom: 32,
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
  fieldLabel: {
    color: '#16281D',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 7,
    marginTop: 14,
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
  goalDropdownButton: {
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
  goalDropdownButtonDisabled: {
    opacity: 0.7,
  },
  goalDropdownText: {
    color: '#16281D',
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  goalDropdownPlaceholder: {
    color: '#8D8A9A',
    fontWeight: '400',
  },
  goalDropdownArrow: {
    color: '#1E5C35',
    fontSize: 23,
    fontWeight: '800',
    lineHeight: 23,
    marginLeft: 12,
    marginTop: -4,
  },
  goalDropdownArrowOpen: {
    marginTop: 0,
  },
  goalOptionsContainer: {
    backgroundColor: '#FFFFFF',
    borderColor: '#C9DBD0',
    borderRadius: 12,
    borderWidth: 1,
    height: 190,
    marginTop: 8,
    overflow: 'hidden',
  },
  goalOptionsScroll: {
    flex: 1,
  },
  goalOptionsScrollContent: {
    paddingBottom: 1,
  },
  goalOptionsLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 90,
  },
  goalOptionsLoadingText: {
    color: '#708277',
    fontSize: 12,
    marginTop: 8,
  },
  goalOption: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#E2ECE6',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: 14,
  },
  goalOptionSelected: {
    backgroundColor: '#EAF3EC',
  },
  goalOptionText: {
    color: '#16281D',
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  goalOptionTextSelected: {
    color: '#1E5C35',
    fontWeight: '800',
  },
  goalOptionCheck: {
    color: '#1E5C35',
    fontSize: 19,
    fontWeight: '900',
    marginLeft: 10,
  },
})
