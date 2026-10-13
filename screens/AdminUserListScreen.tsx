import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../services/supabase';

type Props = {
  navigation: any;
};

type UserAccount = {
  id: string;
  full_name: string | null;
  app_role: string | null;
  subscription_tier: string | null;
  tier: string | null;
  is_suspended?: boolean;
};

export default function AdminUserListScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'USER' | 'COACH'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');

  const [users, setUsers] = useState<UserAccount[]>([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
  setLoading(true);
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, app_role, subscription_tier, tier, is_suspended')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase Query Error:', error.message);
      Alert.alert('Database Error', error.message);
      return;
    }

    console.log('RAW DB RESPONSE:', data);

    if (data) {
      // Filter out admin and coach roles in JavaScript
      const regularUsers = data.filter(
        (p) => p.app_role !== 'admin');
      setUsers(regularUsers as UserAccount[]);
    }
  } catch (error: any) {
    console.error('Error fetching users from Supabase:', error.message);
  } finally {
    setLoading(false);
  }
};

  const toggleUserStatus = (id: string, currentlySuspended: boolean = false) => {
    const nextStatus = !currentlySuspended;
    const actionLabel = currentlySuspended ? 'reactivate' : 'suspend';

    Alert.alert(
      `${currentlySuspended ? 'Reactivate' : 'Suspend'} User`,
      `Are you sure you want to ${actionLabel} this user account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: currentlySuspended ? 'Reactivate' : 'Suspend',
          style: currentlySuspended ? 'default' : 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('profiles')
                .update({ is_suspended: nextStatus })
                .eq('id', id);

              if (error) throw error;

              setUsers((prev) =>
                prev.map((user) =>
                  user.id === id ? { ...user, is_suspended: nextStatus } : user
                )
              );
            } catch (err: any) {
              Alert.alert('Update Failed', err.message);
            }
          },
        },
      ]
    );
  };

  const deleteUser = (id: string, name: string) => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${name}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('profiles')
                .delete()
                .eq('id', id);

              if (error) throw error;

              setUsers((prev) => prev.filter((user) => user.id !== id));
            } catch (err: any) {
              Alert.alert('Delete Failed', err.message);
            }
          },
        },
      ]
    );
  };

  const filteredUsers = users.filter((u) => {
  const isSuspended = !!u.is_suspended;
  const role = (u.app_role || 'user').toLowerCase();

  // 1. Exclude ONLY System Admins (Coaches and Regular Users remain)
  if (role === 'admin') return false;

  // 2. Filter by Status pill (ACTIVE / SUSPENDED)
  if (statusFilter === 'ACTIVE' && isSuspended) return false;
  if (statusFilter === 'SUSPENDED' && !isSuspended) return false;

  // 3. Filter by Role pill (ALL / USER / COACH)
  if (roleFilter === 'USER' && role !== 'user') return false;
  if (roleFilter === 'COACH' && role !== 'coach') return false;

  // 4. Search Query matching full_name or id
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    const name = (u.full_name || '').toLowerCase();
    return name.includes(q) || u.id.toLowerCase().includes(q);
  }

  return true;
});

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
          <Text style={styles.topBarTitle}>User Management</Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {/* Search Bar */}
          <TextInput
            style={styles.searchInput}
            placeholder="Search name or user ID"
            placeholderTextColor="#7C8F83"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          {/* Filter Bar */}
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={styles.filterPill}
              onPress={() =>
                setRoleFilter((prev) =>
                  prev === 'ALL' ? 'USER' : prev === 'USER' ? 'COACH' : 'ALL'
                )
              }
            >
              <Text style={styles.filterPillText}>ROLE: {roleFilter}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.filterPill}
              onPress={() =>
                setStatusFilter((prev) =>
                  prev === 'ALL'
                    ? 'ACTIVE'
                    : prev === 'ACTIVE'
                    ? 'SUSPENDED'
                    : 'ALL'
                )
              }
            >
              <Text style={styles.filterPillText}>STATUS: {statusFilter}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.filterSubmitBtn}
              onPress={fetchUsers}
            >
              <Text style={styles.filterSubmitText}>REFRESH</Text>
            </TouchableOpacity>
          </View>

          {/* User Card List */}
          {filteredUsers.length === 0 ? (
            <Text style={styles.emptyText}>No users found.</Text>
          ) : (
            filteredUsers.map((item) => {
              const isSuspended = !!item.is_suspended;
              const isPremium = item.subscription_tier === 'premium';
              const name = item.full_name || 'Unnamed User';

              return (
                <View key={item.id} style={styles.userCard}>
                  <View style={styles.userHeader}>
                    <View>
                        <Text style={styles.userName}>{name}</Text>
                        <Text style={styles.userEmail}>ID: {item.id.slice(0, 16)}...</Text>
                        
                        {/* Tier + Role Display */}
                        <Text style={styles.userTier}>
                        {(item.subscription_tier || 'free').toUpperCase()} TIER • {(item.app_role || 'user').toUpperCase()}
                        </Text>
                    </View>

                    <View
                        style={[
                        styles.statusBadge,
                        !isSuspended ? styles.badgeActive : styles.badgeSuspended,
                        ]}
                    >
                        <Text
                        style={[
                            styles.statusBadgeText,
                            !isSuspended
                            ? styles.badgeTextActive
                            : styles.badgeTextSuspended,
                        ]}
                        >
                        {isSuspended ? 'Suspended' : 'Active'}
                        </Text>
                    </View>
                    </View>

                  {/* Action Buttons */}
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.btnOutline}
                      onPress={() =>
                        Alert.alert('View Profile', `Viewing ${name}'s profile details`)
                      }
                    >
                      <Text style={styles.btnOutlineText}>VIEW PROFILE</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.btnOutline,
                        isSuspended && styles.btnSolidGreen,
                      ]}
                      onPress={() => toggleUserStatus(item.id, isSuspended)}
                    >
                      <Text
                        style={[
                          styles.btnOutlineText,
                          isSuspended && styles.btnSolidGreenText,
                        ]}
                      >
                        {isSuspended ? 'REACTIVATE' : 'SUSPEND'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.btnDestructive}
                      onPress={() => deleteUser(item.id, name)}
                    >
                      <Text style={styles.btnDestructiveText}>DELETE</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomTabBar}>
        <AdminTab
          label="Home"
          icon="🏠"
          onPress={() => navigation.navigate('AdminHome')}
        />
        <AdminTab label="Users" icon="👥" active onPress={() => {}} />
        <AdminTab
          label="Coach"
          icon="💪"
          onPress={() => navigation.navigate('AdminCoaches')}
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

  emptyText: {
    color: '#7C8F83',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
    fontWeight: '600',
  },

  searchInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#16281D',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 13,
    color: '#16281D',
    marginBottom: 12,
  },

  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  filterPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#16281D',
  },
  filterPillText: {
    color: '#16281D',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  filterSubmitBtn: {
    backgroundColor: '#1E5C35',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  filterSubmitText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2ECE6',
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  userName: {
    color: '#16281D',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  userEmail: {
    color: '#7C8F83',
    fontSize: 12,
    marginBottom: 8,
  },
  userTier: {
    color: '#16281D',
    fontSize: 12,
    fontWeight: '700',
  },

  statusBadge: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeActive: {
    backgroundColor: '#1E5C35',
  },
  badgeTextActive: {
    color: '#FFFFFF',
  },
  badgeSuspended: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#16281D',
  },
  badgeTextSuspended: {
    color: '#16281D',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },

  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  btnOutline: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#16281D',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginRight: 6,
  },
  btnOutlineText: {
    color: '#16281D',
    fontSize: 10,
    fontWeight: '800',
  },
  btnSolidGreen: {
    backgroundColor: '#1E5C35',
    borderColor: '#1E5C35',
  },
  btnSolidGreenText: {
    color: '#FFFFFF',
  },
  btnDestructive: {
    flex: 1,
    backgroundColor: '#FDE3E3',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F8B4B4',
  },
  btnDestructiveText: {
    color: '#B3261E',
    fontSize: 10,
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
