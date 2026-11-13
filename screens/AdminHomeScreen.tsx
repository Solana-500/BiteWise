import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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

type AdminStats = {
  usersCount: number;
  coachesCount: number;
  pendingAppsCount: number;
  pendingContentCount: number;
  reportedReviewsCount: number;
};

type ActivityLog = {
  id: string;
  time: string;
  description: string;
};

export default function AdminHomeScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats>({
    usersCount: 12800,
    coachesCount: 186,
    pendingAppsCount: 14,
    pendingContentCount: 9,
    reportedReviewsCount: 7,
  });

  const [activities, setActivities] = useState<ActivityLog[]>([
    { id: '1', time: '10:42', description: 'Coach approved' },
    { id: '2', time: '10:30', description: 'User suspended' },
    { id: '3', time: '09:58', description: 'Landing page published' },
    { id: '4', time: '09:21', description: 'Review hidden' },
  ]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // You can replace these with live database queries when ready:
      // const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      // setStats(prev => ({ ...prev, usersCount: usersCount || 0 }));
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#1E5C35" />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.outerContainer}>
      <SafeAreaView style={styles.screen}>
        <View style={styles.topBar}>
          <Text style={styles.topBarTitle}>Admin Dashboard</Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {/* Overview Section */}
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.gridContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>USERS</Text>
              <Text style={styles.statValue}>
                {stats.usersCount > 1000
                  ? `${(stats.usersCount / 1000).toFixed(1)}K`
                  : stats.usersCount}
              </Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>COACHES</Text>
              <Text style={styles.statValue}>{stats.coachesCount}</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>PENDING COACH APPS</Text>
              <Text style={styles.statValue}>{stats.pendingAppsCount}</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>PENDING CONTENT</Text>
              <Text style={styles.statValue}>{stats.pendingContentCount}</Text>
            </View>
          </View>

          {/* Reported Reviews Section */}
          <Text style={styles.sectionTitle}>Reported Reviews</Text>
          <View style={styles.reportedCard}>
            <Text style={styles.reportedText}>Reviews requiring moderation</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{stats.reportedReviewsCount}</Text>
            </View>
          </View>

          {/* Recent Activity Section */}
          <Text style={styles.sectionTitle}>Recent Admin Activity</Text>
          <View style={styles.activityCard}>
            {activities.map((item, index) => (
              <React.Fragment key={item.id}>
                <View style={styles.activityRow}>
                  <Text style={styles.activityTime}>{item.time}</Text>
                  <Text style={styles.activityDescription}>{item.description}</Text>
                </View>
                {index < activities.length - 1 && <View style={styles.divider} />}
              </React.Fragment>
            ))}
          </View>

          {/* Action Buttons */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('AdminActivityLog')}
          >
            <Text style={styles.actionButtonText}>VIEW ALL RECENT ACTIVITY</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('AdminMore')}
          >
            <Text style={styles.actionButtonText}>OPEN AUDIT & SYSTEM MONITORING</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

      {/* Bottom Navigation Bar positioned flush at screen bottom */}
      <View style={styles.bottomTabBar}>
        <AdminTab label="Home" icon="🏠" active onPress={() => {}} />
        <AdminTab
          label="Users"
          icon="👥"
          onPress={() => navigation.navigate('AdminUsers')}
        />
        <AdminTab
          label="Reports"
          icon="📊"
          onPress={() => navigation.navigate('AdminReports')}
        />
        <AdminTab
          label="More"
          icon="≡"
          onPress={() => navigation.navigate('AdminMore')}
        />
      </View>
    </View>
  );
}

type AdminTabProps = {
  label: string;
  icon: string;
  active?: boolean;
  onPress: () => void;
};

function AdminTab({ label, icon, active, onPress }: AdminTabProps) {
  const color = active ? '#1E5C35' : '#7C8F83';

  return (
    <Pressable style={styles.tabItem} onPress={onPress}>
      <Text style={[styles.tabIcon, { color }]}>{icon}</Text>
      <Text style={[styles.tabLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#F5FAF6',
  },
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
    paddingTop: 16,
    paddingBottom: 24,
  },

  sectionTitle: {
    marginBottom: 10,
    color: '#5C7267',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2ECE6',
  },
  statLabel: {
    color: '#5C7267',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  statValue: {
    color: '#16281D',
    fontSize: 26,
    fontWeight: '800',
  },

  reportedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2ECE6',
  },
  reportedText: {
    color: '#16281D',
    fontSize: 14,
    fontWeight: '700',
  },
  badge: {
    backgroundColor: '#1E5C35',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2ECE6',
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  activityTime: {
    color: '#7C8F83',
    fontSize: 13,
    width: 60,
    fontWeight: '600',
  },
  activityDescription: {
    color: '#16281D',
    fontSize: 14,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2ECE6',
  },

  actionButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2ECE6',
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  actionButtonText: {
    color: '#16281D',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
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
