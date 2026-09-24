import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../services/supabase';

type Props = {
  navigation: any;
};

type CoachProfile = {
  full_name: string | null;
  email: string | null;
  age: number | string | null;
  gender: string | null;
  height_cm: number | string | null;
  weight_kg: number | string | null;
  coaching_specialty: string | null;
  years_experience: string | null;
  approval_status: string | null;
};

export default function CoachProfileScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<CoachProfile | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigation.replace('Login');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select(
          'full_name, age, gender, height_cm, weight_kg, coaching_specialty, years_experience, approval_status'
        )
        .eq('id', user.id)
        .single();

      if (error) throw error;

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
      });
    } catch (error) {
      console.error('Unable to load coach profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#1E5C35" />
      </SafeAreaView>
    );
  }

  const fullName = profile?.full_name || 'Coach';
  const initials = fullName
    .trim()
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const specialty = profile?.coaching_specialty || 'Not set';
  const experience = profile?.years_experience || 'Not set';
  const approvalLabel =
    profile?.approval_status === 'approved'
      ? 'APPROVED COACH'
      : profile?.approval_status === 'pending'
      ? 'PENDING APPROVAL'
      : 'COACH';

  const ageText = profile?.age ? `${profile.age} years old` : 'Not set';
  const sexText = profile?.gender ? String(profile.gender) : 'Not set';
  const heightText = profile?.height_cm ? `${profile.height_cm} cm` : 'Not set';
  const weightText = profile?.weight_kg ? `${profile.weight_kg} kg` : 'Not set';

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <Text style={styles.topBarTitle}>Profile</Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <TouchableOpacity
            style={styles.backHomeButton}
            onPress={() => navigation.navigate('CoachHome')}
          >
            <Text style={styles.backHomeText}>‹ Home</Text>
          </TouchableOpacity>

          <View style={styles.heroCard}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>

            <Text style={styles.heroName}>{fullName}</Text>
            <Text style={styles.heroEmail}>{profile?.email}</Text>

            <View style={styles.planChip}>
              <Text style={styles.planChipText}>{approvalLabel}</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Personal Information</Text>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Age</Text>
              <Text style={styles.infoValue}>{ageText}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Sex</Text>
              <Text style={styles.infoValue}>{sexText}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Height</Text>
              <Text style={styles.infoValue}>{heightText}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Weight</Text>
              <Text style={styles.infoValue}>{weightText}</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Coaching Information</Text>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Specialty</Text>
              <Text style={styles.infoValue}>{specialty}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Years of experience</Text>
              <Text style={styles.infoValue}>{experience}</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Account</Text>

          <Pressable
            style={styles.accountCard}
            onPress={() =>
              Alert.alert(
                'Credentials',
                'Certificate upload will be connected next.'
              )
            }
          >
            <View>
              <Text style={styles.accountTitle}>Credentials</Text>
              <Text style={styles.accountSubtitle}>
                Manage your uploaded certificate
              </Text>
            </View>

            <Text style={styles.chevron}>›</Text>
          </Pressable>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

      {/* Tab bar outside SafeAreaView to stretch flush to device bottom */}
      <View style={styles.bottomTabBar}>
        <CoachTab
          label="Home"
          icon="🏠"
          onPress={() => navigation.navigate('CoachHome')}
        />
        <CoachTab
          label="Content"
          icon="📋"
          onPress={() => navigation.navigate('CoachContent')}
        />
        <CoachTab
          label="Clients"
          icon="👥"
          onPress={() => navigation.navigate('CoachClients')}
        />
        <CoachTab
          label="Messages"
          icon="💬"
          onPress={() => navigation.navigate('CoachChat')}
        />
        <CoachTab label="Profile" icon="👤" active onPress={() => {}} />
      </View>
    </View>
  );
}

type CoachTabProps = {
  label: string;
  icon: string;
  active?: boolean;
  onPress: () => void;
};

function CoachTab({ label, icon, active, onPress }: CoachTabProps) {
  const color = active ? '#1E5C35' : '#7C8F83';

  return (
    <Pressable style={styles.tabItem} onPress={onPress}>
      <Text style={[styles.tabIcon, { color }]}>{icon}</Text>
      <Text style={[styles.tabLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5FAF6',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#F5FAF6',
  },
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5FAF6',
  },

  topBar: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: '#F5FAF6',
    borderBottomWidth: 1,
    borderBottomColor: '#E2ECE6',
  },
  topBarTitle: {
    color: '#1E5C35',
    fontSize: 17,
    fontWeight: '800',
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },

  backHomeButton: {
    alignSelf: 'flex-start',
    marginBottom: 12,
    paddingRight: 14,
    paddingVertical: 8,
  },
  backHomeText: {
    color: '#1E5C35',
    fontSize: 15,
    fontWeight: '800',
  },

  heroCard: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 26,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: '#1E5C35',
  },
  avatarCircle: {
    width: 78,
    height: 78,
    marginBottom: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 39,
    backgroundColor: '#D8EADF',
  },
  avatarText: {
    color: '#1E5C35',
    fontSize: 26,
    fontWeight: '800',
  },
  heroName: {
    color: '#FFFFFF',
    fontSize: 22,
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
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  planChipText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
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

  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
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
    fontSize: 24,
    fontWeight: '300',
  },

  logoutButton: {
    alignItems: 'center',
    marginTop: 4,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#FDE3E3',
  },
  logoutText: {
    color: '#B3261E',
    fontSize: 15,
    fontWeight: '800',
  },

  bottomTabBar: {
    height: 78,
    paddingTop: 8,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2ECE6',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    fontSize: 19,
  },
  tabLabel: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '700',
  },
});