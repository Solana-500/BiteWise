import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'

import { supabase } from '../services/supabase'

type Props = { navigation: any }

type CoachProfile = {
  full_name: string | null
  email: string | null
  age: number | string | null
  gender: string | null
  height_cm: number | string | null
  weight_kg: number | string | null
  coaching_specialty: string | null
  years_experience: string | null
  approval_status: string | null
}

export default function CoachProfileScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<CoachProfile | null>(null)
  const [passwordModalVisible, setPasswordModalVisible] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [sendingResetEmail, setSendingResetEmail] = useState(false)

  useEffect(() => {
    void loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) throw userError

      if (!user) {
        navigation.replace('Login')
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select(
          'full_name, age, gender, height_cm, weight_kg, coaching_specialty, years_experience, approval_status'
        )
        .eq('id', user.id)
        .single()

      if (error) throw error

      setProfile({
        full_name: data?.full_name ?? null,
        age: data?.age ?? null,
        gender: data?.gender ?? null,
        height_cm: data?.height_cm ?? null,
        weight_kg: data?.weight_kg ?? null,
        coaching_specialty: data?.coaching_specialty ?? null,
        years_experience: data?.years_experience ?? null,
        approval_status: data?.approval_status ?? null,
        email: user.email ?? null,
      })
    } catch (error) {
      console.error('Unable to load coach profile:', error)
      Alert.alert('Profile error', 'Unable to load your coach profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
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

  function openChangePassword() {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setPasswordModalVisible(true)
  }

  function closePasswordModal() {
    if (savingPassword || sendingResetEmail) return
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
      Alert.alert('Current password required', 'Enter your current password before choosing a new password.')
      return
    }

    if (password.length < 8) {
      Alert.alert('Password too short', 'Your new password must contain at least 8 characters.')
      return
    }

    if (password === current) {
      Alert.alert('Choose a different password', 'Your new password must be different from your current password.')
      return
    }

    if (password !== confirmation) {
      Alert.alert('Passwords do not match', 'Enter the same new password in both fields.')
      return
    }

    try {
      setSavingPassword(true)

      const { error } = await supabase.auth.updateUser({
        current_password: current,
        password,
      })

      if (error) throw error

      Alert.alert('Password updated', 'Your password has been changed successfully.', [
        { text: 'Done', onPress: closePasswordModal },
      ])
    } catch (error: any) {
      console.error('Change coach password error:', error)
      Alert.alert(
        'Could not update password',
        error?.message || 'Your current password may be incorrect. Please try again.'
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

      if (userError) throw userError

      if (!user?.email) {
        Alert.alert('Email unavailable', 'We could not find an email address for this account.')
        return
      }

      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: 'bitewise://reset-password',
      })

      if (error) throw error

      Alert.alert(
        'Reset email sent',
        `A password-reset link has been sent to ${user.email}. Check your inbox and spam folder.`
      )
    } catch (error: any) {
      console.error('Coach forgot password email error:', error)
      Alert.alert('Could not send reset email', error?.message || 'Please try again later.')
    } finally {
      setSendingResetEmail(false)
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#1E5C35" />
      </SafeAreaView>
    )
  }

  const fullName = profile?.full_name || 'Coach'
  const initials = fullName.trim().split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
  const specialty = profile?.coaching_specialty || 'Not set'
  const experience = profile?.years_experience || 'Not set'
  const approvalLabel = profile?.approval_status === 'approved' ? 'APPROVED COACH' : profile?.approval_status === 'pending' ? 'PENDING APPROVAL' : 'COACH'
  const ageText = profile?.age ? `${profile.age} years old` : 'Not set'
  const sexText = profile?.gender ? String(profile.gender) : 'Not set'
  const heightText = profile?.height_cm ? `${profile.height_cm} cm` : 'Not set'
  const weightText = profile?.weight_kg ? `${profile.weight_kg} kg` : 'Not set'

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}><Text style={styles.topBarTitle}>Profile</Text></View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <TouchableOpacity style={styles.backHomeButton} onPress={() => navigation.navigate('CoachHome')} accessibilityRole="button" accessibilityLabel="Go back to coach home">
            <Text style={styles.backHomeText}>‹ Home</Text>
          </TouchableOpacity>

          <View style={styles.heroCard}>
            <View style={styles.avatarCircle}><Text style={styles.avatarText}>{initials}</Text></View>
            <Text style={styles.heroName}>{fullName}</Text>
            <Text style={styles.heroEmail}>{profile?.email || 'No email'}</Text>
            <View style={styles.planChip}><Text style={styles.planChipText}>{approvalLabel}</Text></View>
          </View>

          <Text style={styles.sectionTitle}>Personal Information</Text>
          <View style={styles.infoCard}>
            <InfoRow label="Age" value={ageText} />
            <View style={styles.divider} />
            <InfoRow label="Sex" value={sexText} />
            <View style={styles.divider} />
            <InfoRow label="Height" value={heightText} />
            <View style={styles.divider} />
            <InfoRow label="Weight" value={weightText} />
          </View>

          <Text style={styles.sectionTitle}>Coaching Information</Text>
          <View style={styles.infoCard}>
            <InfoRow label="Specialty" value={specialty} />
            <View style={styles.divider} />
            <InfoRow label="Years of experience" value={experience} />
          </View>

          <Text style={styles.sectionTitle}>Account</Text>
          <Pressable style={styles.accountCard} onPress={() => Alert.alert('Credentials', 'Certificate upload will be connected next.')} accessibilityRole="button" accessibilityLabel="Manage uploaded certificate">
            <View><Text style={styles.accountTitle}>Credentials</Text><Text style={styles.accountSubtitle}>Manage your uploaded certificate</Text></View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>

          <Pressable style={styles.accountCard} onPress={openChangePassword} accessibilityRole="button" accessibilityLabel="Change password">
            <View style={styles.accountLeft}>
              <View style={styles.passwordIcon}><Text style={styles.passwordIconText}>🔒</Text></View>
              <View><Text style={styles.accountTitle}>Change Password</Text><Text style={styles.accountSubtitle}>Update the password used to sign in</Text></View>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} accessibilityRole="button" accessibilityLabel="Log out">
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

      <View style={styles.bottomTabBar}>
        <CoachTab label="Home" icon="🏠" onPress={() => navigation.navigate('CoachHome')} />
        <CoachTab label="Content" icon="📋" onPress={() => navigation.navigate('CoachContent')} />
        <CoachTab label="Clients" icon="👥" onPress={() => navigation.navigate('CoachClients')} />
        <CoachTab label="Messages" icon="💬" onPress={() => navigation.navigate('CoachChat')} />
        <CoachTab label="Profile" icon="👤" active onPress={() => {}} />
      </View>

      <Modal visible={passwordModalVisible} transparent animationType="slide" onRequestClose={closePasswordModal}>
        <KeyboardAvoidingView style={styles.modalKeyboardAvoidingView} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalBackdrop}>
            <View style={styles.passwordModal}>
              <View style={styles.passwordModalHeader}>
                <Text style={styles.passwordModalTitle}>Change Password</Text>
                <TouchableOpacity style={styles.closeModalButton} disabled={savingPassword || sendingResetEmail} onPress={closePasswordModal} accessibilityRole="button" accessibilityLabel="Close change password form">
                  <Text style={styles.closeModalText}>×</Text>
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={styles.passwordModalDescription}>Enter your current password to confirm it is you, then choose a new password.</Text>
                <Text style={styles.fieldLabel}>Current password</Text>
                <TextInput style={styles.passwordInput} value={currentPassword} onChangeText={setCurrentPassword} editable={!savingPassword && !sendingResetEmail} secureTextEntry autoCapitalize="none" autoCorrect={false} placeholder="Enter your current password" placeholderTextColor="#8D8A9A" accessibilityLabel="Current password" />
                <Text style={styles.fieldLabel}>New password</Text>
                <TextInput style={styles.passwordInput} value={newPassword} onChangeText={setNewPassword} editable={!savingPassword && !sendingResetEmail} secureTextEntry autoCapitalize="none" autoCorrect={false} placeholder="At least 8 characters" placeholderTextColor="#8D8A9A" accessibilityLabel="New password" />
                <Text style={styles.fieldLabel}>Confirm new password</Text>
                <TextInput style={styles.passwordInput} value={confirmPassword} onChangeText={setConfirmPassword} editable={!savingPassword && !sendingResetEmail} secureTextEntry autoCapitalize="none" autoCorrect={false} placeholder="Enter the new password again" placeholderTextColor="#8D8A9A" accessibilityLabel="Confirm new password" />
                <TouchableOpacity style={[styles.updatePasswordButton, (savingPassword || sendingResetEmail) && styles.buttonDisabled]} disabled={savingPassword || sendingResetEmail} onPress={() => void changePassword()} accessibilityRole="button" accessibilityLabel="Update password">
                  {savingPassword ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.updatePasswordButtonText}>Update Password</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.forgotPasswordButton} disabled={savingPassword || sendingResetEmail} onPress={() => void sendForgotPasswordEmail()} accessibilityRole="button" accessibilityLabel="Send a password reset email">
                  {sendingResetEmail ? <ActivityIndicator size="small" color="#1E5C35" /> : <Text style={styles.forgotPasswordText}>Forgot your current password?</Text>}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.infoRow}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View>
}

type CoachTabProps = { label: string; icon: string; active?: boolean; onPress: () => void }

function CoachTab({ label, icon, active, onPress }: CoachTabProps) {
  const color = active ? '#1E5C35' : '#7C8F83'
  return <Pressable style={styles.tabItem} onPress={onPress} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: Boolean(active) }}><Text style={[styles.tabIcon, { color }]}>{icon}</Text><Text style={[styles.tabLabel, { color }]}>{label}</Text></Pressable>
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5FAF6' },
  safeArea: { flex: 1, backgroundColor: '#F5FAF6' },
  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5FAF6' },
  topBar: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, backgroundColor: '#F5FAF6', borderBottomWidth: 1, borderBottomColor: '#E2ECE6' },
  topBarTitle: { color: '#1E5C35', fontSize: 17, fontWeight: '800' },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 },
  backHomeButton: { alignSelf: 'flex-start', marginBottom: 12, paddingRight: 14, paddingVertical: 8 },
  backHomeText: { color: '#1E5C35', fontSize: 15, fontWeight: '800' },
  heroCard: { alignItems: 'center', marginBottom: 24, paddingVertical: 26, paddingHorizontal: 18, borderRadius: 20, backgroundColor: '#1E5C35' },
  avatarCircle: { width: 78, height: 78, marginBottom: 14, alignItems: 'center', justifyContent: 'center', borderRadius: 39, backgroundColor: '#D8EADF' },
  avatarText: { color: '#1E5C35', fontSize: 26, fontWeight: '800' },
  heroName: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
  heroEmail: { marginTop: 4, color: '#D8EADF', fontSize: 13 },
  planChip: { marginTop: 14, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 14, paddingVertical: 6 },
  planChipText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
  sectionTitle: { marginBottom: 10, color: '#5C7267', fontSize: 13, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  infoCard: { marginBottom: 20, paddingHorizontal: 18, borderRadius: 18, backgroundColor: '#FFFFFF' },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 18 },
  infoLabel: { color: '#5C7267', fontSize: 14 },
  infoValue: { color: '#16281D', fontSize: 15, fontWeight: '800', flexShrink: 1, marginLeft: 12, textAlign: 'right' },
  divider: { height: 1, backgroundColor: '#E2ECE6' },
  accountCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, padding: 18, borderRadius: 18, backgroundColor: '#FFFFFF' },
  accountLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  accountTitle: { color: '#16281D', fontSize: 15, fontWeight: '800' },
  accountSubtitle: { marginTop: 3, color: '#7C8F83', fontSize: 12 },
  passwordIcon: { width: 40, height: 40, marginRight: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: '#EAF3EC' },
  passwordIconText: { fontSize: 17 },
  chevron: { color: '#1E5C35', fontSize: 24, fontWeight: '300' },
  logoutButton: { alignItems: 'center', marginTop: 4, paddingVertical: 16, borderRadius: 14, backgroundColor: '#FDE3E3' },
  logoutText: { color: '#B3261E', fontSize: 15, fontWeight: '800' },
  bottomTabBar: { height: 78, paddingTop: 8, paddingBottom: 18, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E2ECE6' },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabIcon: { fontSize: 19 },
  tabLabel: { marginTop: 3, fontSize: 11, fontWeight: '700' },
  modalKeyboardAvoidingView: { flex: 1 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(22, 40, 29, 0.45)' },
  passwordModal: { maxHeight: '88%', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32, borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: '#F5FAF6' },
  passwordModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  passwordModalTitle: { color: '#16281D', fontSize: 19, fontWeight: '800' },
  closeModalButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  closeModalText: { color: '#1E5C35', fontSize: 30, fontWeight: '300', lineHeight: 34 },
  passwordModalDescription: { marginTop: 4, color: '#5C7267', fontSize: 13, lineHeight: 19 },
  fieldLabel: { marginTop: 14, marginBottom: 7, color: '#16281D', fontSize: 13, fontWeight: '800' },
  passwordInput: { paddingHorizontal: 14, paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: '#C9DBD0', backgroundColor: '#FFFFFF', color: '#16281D', fontSize: 15 },
  updatePasswordButton: { minHeight: 52, marginTop: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#1E5C35' },
  updatePasswordButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  buttonDisabled: { opacity: 0.7 },
  forgotPasswordButton: { minHeight: 46, marginTop: 8, alignItems: 'center', justifyContent: 'center' },
  forgotPasswordText: { color: '#1E5C35', fontSize: 13, fontWeight: '800', textDecorationLine: 'underline' },
})
