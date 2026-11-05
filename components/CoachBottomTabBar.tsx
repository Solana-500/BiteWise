import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

import { useCoachUnread } from '../context/CoachUnreadContext'
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type CoachTabRoute =
  | 'CoachHome'
  | 'CoachContent'
  | 'CoachClients'
  | 'CoachChat'
  | 'CoachProfile'

type CoachBottomTabBarProps = {
  activeTab: CoachTabRoute
  onNavigate: (route: CoachTabRoute) => void
}

type CoachTabItem = {
  route: CoachTabRoute
  label: string
  icon: string
}

const COACH_TABS: CoachTabItem[] = [
  {
    route: 'CoachHome',
    label: 'Home',
    icon: '🏠',
  },
  {
    route: 'CoachContent',
    label: 'Content',
    icon: '📚',
  },
  {
    route: 'CoachClients',
    label: 'Clients',
    icon: '👥',
  },
  {
    route: 'CoachChat',
    label: 'Messages',
    icon: '💬',
  },
  {
    route: 'CoachProfile',
    label: 'Profile',
    icon: '👤',
  },
]

export default function CoachBottomTabBar({
  activeTab,
  onNavigate,
}: CoachBottomTabBarProps) {
  const { totalUnreadCount } = useCoachUnread()
  const insets = useSafeAreaInsets();
    
  return (
    <View
      style={[
        styles.bottomTabSafeArea,
        { paddingBottom: insets.bottom },
      ]}
    >

      <View style={styles.bottomTabBar}>
        {COACH_TABS.map((tab) => {
          const isActive = activeTab === tab.route
          const color = isActive ? '#1E5C35' : '#7C8F83'
          const isMessagesTab = tab.route === 'CoachChat'
          const badgeCount = isMessagesTab ? totalUnreadCount : 0
          const showBadge = badgeCount > 0

          return (
            <TouchableOpacity
              key={tab.route}
              style={styles.tabItem}
              onPress={() => onNavigate(tab.route)}
              accessibilityRole="button"
              accessibilityLabel={`Go to ${tab.label}`}
            >
              <View style={styles.tabIconContainer}>
                <Text style={styles.tabIcon}>{tab.icon}</Text>

                {showBadge ? (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </Text>
                  </View>
                ) : null}
              </View>

              <Text style={[styles.tabLabel, { color }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  bottomTabSafeArea: {
    backgroundColor: '#FFFFFF',
    borderTopColor: '#E2ECE6',
    borderTopWidth: 1,
  },
  bottomTabBar: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    minHeight: 60,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabItem: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  tabIconContainer: {
    position: 'relative',
  },
  tabIcon: {
    fontSize: 19,
  },
  tabBadge: {
    alignItems: 'center',
    backgroundColor: '#D9482B',
    borderRadius: 999,
    justifyContent: 'center',
    minWidth: 17,
    paddingHorizontal: 4,
    paddingVertical: 2,
    position: 'absolute',
    right: -10,
    top: -4,
  },
  tabBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
  },
})
