import React, { useState } from 'react';
import {
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

type AuditFilter = 'Audit' | 'Auth.' | 'Failures' | 'Status';

type AuditLog = {
  id: string;
  time: string;
  action: string;
  actor: string;
  status: 'Success' | 'Failed';
};

type SystemService = {
  name: string;
  status: 'Online' | 'Degraded' | 'Offline';
};

export default function AdminMoreScreen({ navigation }: Props) {
  const [selectedFilter, setSelectedFilter] = useState<AuditFilter>('Audit');
  const [searchQuery, setSearchQuery] = useState('');

  const [auditLogs] = useState<AuditLog[]>([
    { id: '1', time: '18:35', action: 'Admin Login', actor: 'admin01', status: 'Success' },
    { id: '2', time: '18:20', action: 'Coach Approved', actor: 'admin01', status: 'Success' },
    { id: '3', time: '17:58', action: 'Payment API Failure', actor: 'System', status: 'Failed' },
    { id: '4', time: '17:42', action: 'Review Hidden', actor: 'admin02', status: 'Success' },
    { id: '5', time: '17:10', action: 'MFA Challenge', actor: 'admin01', status: 'Success' },
  ]);

  const [systemServices] = useState<SystemService[]>([
    { name: 'Database', status: 'Online' },
    { name: 'Application API', status: 'Online' },
    { name: 'AI Service', status: 'Online' },
    { name: 'Payment Integration', status: 'Degraded' },
  ]);

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

  const filteredLogs = auditLogs.filter((log) => {
    if (selectedFilter === 'Failures' && log.status !== 'Failed') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        log.action.toLowerCase().includes(q) ||
        log.actor.toLowerCase().includes(q) ||
        log.status.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Audit & System Monitoring</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Filter Pills */}
        <View style={styles.filterBar}>
          {(['Audit', 'Auth.', 'Failures', 'Status'] as AuditFilter[]).map((filter) => {
            const isActive = selectedFilter === filter;
            return (
              <TouchableOpacity
                key={filter}
                style={[styles.filterPill, isActive && styles.filterPillActive]}
                onPress={() => setSelectedFilter(filter)}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    isActive && styles.filterPillTextActive,
                  ]}
                >
                  {filter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Search Bar + Filter Button */}
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Filter actor, action or status"
            placeholderTextColor="#7C8F83"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity
            style={styles.filterSubmitBtn}
            onPress={() => Alert.alert('Filter Applied', `Filtering by: ${searchQuery || 'All'}`)}
          >
            <Text style={styles.filterSubmitText}>FILTER</Text>
          </TouchableOpacity>
        </View>

        {/* Audit Logs Section */}
        <Text style={styles.sectionTitle}>AUDIT LOGS</Text>
        <View style={styles.cardContainer}>
          {filteredLogs.map((item, index) => (
            <React.Fragment key={item.id}>
              <View style={styles.logRow}>
                <Text style={styles.logTime}>{item.time}</Text>
                <Text style={styles.logAction}>{item.action}</Text>
                <Text style={styles.logActor}>{item.actor}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    item.status === 'Failed' ? styles.statusFailed : styles.statusSuccess,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      item.status === 'Failed'
                        ? styles.statusFailedText
                        : styles.statusSuccessText,
                    ]}
                  >
                    {item.status}
                  </Text>
                </View>
              </View>
              {index < filteredLogs.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </View>

        {/* System Status Section */}
        <Text style={styles.sectionTitle}>SYSTEM STATUS</Text>
        <View style={styles.cardContainer}>
          {systemServices.map((service, index) => (
            <React.Fragment key={service.name}>
              <View style={styles.serviceRow}>
                <Text style={styles.serviceName}>{service.name}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    service.status === 'Degraded'
                      ? styles.statusDegraded
                      : service.status === 'Offline'
                      ? styles.statusFailed
                      : styles.statusSuccess,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      service.status === 'Degraded'
                        ? styles.statusDegradedText
                        : service.status === 'Offline'
                        ? styles.statusFailedText
                        : styles.statusSuccessText,
                    ]}
                  >
                    {service.status}
                  </Text>
                </View>
              </View>
              {index < systemServices.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomTabBar}>
        <AdminTab
          label="Home"
          icon="🏠"
          onPress={() => navigation.navigate('AdminHome')}
        />
        <AdminTab
          label="Users"
          icon="👥"
          onPress={() => navigation.navigate('AdminUsers')}
        />
        <AdminTab
          label="Coach"
          icon="🏋️"
          onPress={() => navigation.navigate('AdminCoaches')}
        />
        <AdminTab
          label="Reports"
          icon="📊"
          onPress={() => navigation.navigate('AdminReports')}
        />
        <AdminTab label="More" icon="⚙️" active onPress={() => {}} />
      </View>
    </SafeAreaView>
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
  screen: {
    flex: 1,
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

  filterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  filterPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginHorizontal: 3,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#16281D',
  },
  filterPillActive: {
    backgroundColor: '#1E5C35',
    borderColor: '#1E5C35',
  },
  filterPillText: {
    color: '#16281D',
    fontSize: 12,
    fontWeight: '700',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#16281D',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
    color: '#16281D',
    marginRight: 10,
  },
  filterSubmitBtn: {
    backgroundColor: '#1E5C35',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  filterSubmitText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  sectionTitle: {
    marginBottom: 10,
    color: '#5C7267',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2ECE6',
  },

  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  logTime: {
    color: '#7C8F83',
    fontSize: 12,
    fontWeight: '600',
    width: 48,
  },
  logAction: {
    flex: 1,
    color: '#16281D',
    fontSize: 13,
    fontWeight: '700',
  },
  logActor: {
    color: '#7C8F83',
    fontSize: 12,
    marginRight: 10,
  },

  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  serviceName: {
    color: '#16281D',
    fontSize: 14,
    fontWeight: '700',
  },

  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    minWidth: 72,
    alignItems: 'center',
  },
  statusSuccess: {
    backgroundColor: '#1E5C35',
  },
  statusSuccessText: {
    color: '#FFFFFF',
  },
  statusFailed: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#16281D',
  },
  statusFailedText: {
    color: '#16281D',
  },
  statusDegraded: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#16281D',
  },
  statusDegradedText: {
    color: '#16281D',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },

  divider: {
    height: 1,
    backgroundColor: '#E2ECE6',
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