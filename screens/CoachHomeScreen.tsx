import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { supabase } from '../services/supabase';

type Props = {
  navigation: any;
};

type CoachProfile = {
  full_name: string | null;
  coaching_specialty: string | null;
};

export default function CoachHomeScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [coachName, setCoachName] = useState('Coach');
  const [specialty, setSpecialty] = useState('');

  const [stats, setStats] = useState({
    clients: 0,
    pendingContent: 0,
    approvedContent: 0,
    unreadMessages: 0,
    recentRatings: 0,
  });

  useEffect(() => {
    loadCoachHome();
  }, []);

  const loadCoachHome = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigation.replace('Login');
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('full_name, coaching_specialty')
        .eq('id', user.id)
        .single<CoachProfile>();

      if (error) throw error;

      setCoachName(profile?.full_name || 'Coach');
      setSpecialty(profile?.coaching_specialty || '');

      // Temporary values until the coach-related tables are created.
      setStats({
        clients: 0,
        pendingContent: 0,
        approvedContent: 0,
        unreadMessages: 0,
        recentRatings: 0,
      });
    } catch (error) {
      console.error('Unable to load coach dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const firstName = coachName.trim().split(' ')[0] || 'Coach';

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#1E5C35" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Dashboard</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.headerRow}>
          <Text style={styles.pageHeading}>Dashboard</Text>

          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>COACH</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <Text style={styles.heroGreeting}>Good afternoon</Text>

            <View style={styles.planChip}>
              <Text style={styles.planChipText}>
                {specialty ? specialty.toUpperCase() : 'HEALTH COACH'}
              </Text>
            </View>
          </View>

          <Text style={styles.heroName}>Hello, {firstName} 👋</Text>

          <Text style={styles.heroSubtext}>
            Here&apos;s what&apos;s happening with your clients today.
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Clients Assigned</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryNumber}>{stats.clients}</Text>

            <Pressable
              style={styles.viewUsersButton}
              onPress={() => navigation.navigate('CoachClients')}
            >
              <Text style={styles.viewUsersText}>View User List</Text>
            </Pressable>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: stats.clients > 0 ? '45%' : '0%' },
              ]}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Your Coaching Tools</Text>

        <View style={styles.featureGrid}>
          <Pressable
            style={styles.featureCard}
            onPress={() => navigation.navigate('CoachContent')}
          >
            <Text style={styles.featureEmoji}>📝</Text>
            <Text style={styles.featureTitle}>Content Status</Text>
            <Text style={styles.featureSubtitle}>
              {stats.pendingContent} pending · {stats.approvedContent} approved
            </Text>
          </Pressable>

          <Pressable
            style={styles.featureCard}
            onPress={() => navigation.navigate('CoachContent')}
          >
            <Text style={styles.featureEmoji}>📋</Text>
            <Text style={styles.featureTitle}>Content</Text>
            <Text style={styles.featureSubtitle}>
              Manage meal plans, workouts &amp; recipes
            </Text>
          </Pressable>

          <Pressable
            style={styles.featureCard}
            onPress={() => navigation.navigate('CoachMessages')}
          >
            <Text style={styles.featureEmoji}>💬</Text>
            <Text style={styles.featureTitle}>Messages</Text>
            <Text style={styles.featureSubtitle}>
              {stats.unreadMessages} unread
            </Text>
          </Pressable>

          <Pressable
            style={styles.featureCard}
            onPress={() => navigation.navigate('CoachRatings')}
          >
            <Text style={styles.featureEmoji}>⭐</Text>
            <Text style={styles.featureTitle}>Recent Ratings</Text>
            <Text style={styles.featureSubtitle}>
              {stats.recentRatings} new
            </Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Recent Activity</Text>

        <Pressable
          style={styles.activityCard}
          onPress={() => navigation.navigate('CoachMessages')}
        >
          <Text style={styles.activityEmoji}>💬</Text>

          <View style={styles.activityTextBlock}>
            <Text style={styles.activityTitle}>
              {stats.unreadMessages} Unread Messages
            </Text>
            <Text style={styles.activitySubtitle} numberOfLines={1}>
              From User: Coach, what&apos;s my meal plan for this week?
            </Text>
          </View>

          <Text style={styles.chevron}>›</Text>
        </Pressable>

        <Pressable
          style={styles.activityCard}
          onPress={() => navigation.navigate('CoachRatings')}
        >
          <Text style={styles.activityEmoji}>⭐</Text>

          <View style={styles.activityTextBlock}>
            <Text style={styles.activityTitle}>
              {stats.recentRatings} Recent Ratings
            </Text>
            <Text style={styles.activitySubtitle} numberOfLines={1}>
              User rated you 4 · Coach has been so supportive in my journey.
            </Text>
          </View>

          <Text style={styles.chevron}>›</Text>
        </Pressable>
      </ScrollView>

      {/*
        Tab bar values matched to MainTabs in App.tsx:
        icon 19px, label 11px/700, bar height 68, active #1E5C35, inactive #7C8F83
      */}
      <View style={styles.bottomTabBar}>
        <CoachTab label="Home" icon="🏠" active onPress={() => {}} />
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
          onPress={() => navigation.navigate('CoachMessages')}
        />
        <CoachTab
          label="Profile"
          icon="👤"
          onPress={() => navigation.navigate('CoachProfile')}
        />
      </View>
    </SafeAreaView>
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
    paddingTop: 18,
    paddingBottom: 24,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  pageHeading: {
    color: '#16281D',
    fontSize: 26,
    fontWeight: '800',
  },
  roleBadge: {
    borderRadius: 999,
    backgroundColor: '#FBE8A6',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  roleBadgeText: {
    color: '#7A5A00',
    fontSize: 12,
    fontWeight: '800',
  },

  heroCard: {
    marginBottom: 18,
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#1E5C35',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  heroGreeting: {
    color: '#CFE4D6',
    fontSize: 12,
  },
  planChip: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  planChipText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  heroName: {
    marginTop: 4,
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  heroSubtext: {
    marginTop: 8,
    color: '#D8EADF',
    fontSize: 13,
  },

  summaryCard: {
    marginBottom: 22,
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
  },
  summaryLabel: {
    color: '#5C7267',
    fontSize: 14,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 10,
  },
  summaryNumber: {
    color: '#16281D',
    fontSize: 30,
    fontWeight: '800',
  },
  viewUsersButton: {
    borderRadius: 999,
    backgroundColor: '#1E5C35',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  viewUsersText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#E2ECE6',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#1E5C35',
  },

  sectionTitle: {
    marginBottom: 12,
    color: '#16281D',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  featureCard: {
    width: '48%',
    marginBottom: 14,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
  },
  featureEmoji: {
    fontSize: 24,
    marginBottom: 10,
  },
  featureTitle: {
    color: '#16281D',
    fontSize: 15,
    fontWeight: '800',
  },
  featureSubtitle: {
    marginTop: 4,
    color: '#7C8F83',
    fontSize: 12,
  },

  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
  },
  activityEmoji: {
    fontSize: 22,
    marginRight: 12,
  },
  activityTextBlock: {
    flex: 1,
  },
  activityTitle: {
    color: '#16281D',
    fontSize: 14,
    fontWeight: '700',
  },
  activitySubtitle: {
    marginTop: 3,
    color: '#7C8F83',
    fontSize: 12,
  },
  chevron: {
    marginLeft: 8,
    color: '#B7C6BC',
    fontSize: 22,
  },

  bottomTabBar: {
    height: 68,
    paddingTop: 7,
    paddingBottom: 8,
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
