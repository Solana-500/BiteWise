import React from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type Props = {
  navigation: any;
};

export default function CoachContentScreen({ navigation }: Props) {
  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
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

          <Text style={styles.pageHeading}>Content Management</Text>

          <View style={styles.grid}>
            <Pressable
              style={styles.gridCard}
              onPress={() => navigation.navigate('CoachMealPlans')}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Meal Plans</Text>
                <Text style={styles.chevron}>›</Text>
              </View>

              <View style={styles.iconWrap}>
                <Text style={styles.emoji}>🥗</Text>
              </View>
            </Pressable>

            <Pressable
              style={styles.gridCard}
              onPress={() => navigation.navigate('CoachWorkoutPlans')}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Workout Plans</Text>
                <Text style={styles.chevron}>›</Text>
              </View>

              <View style={styles.iconWrap}>
                <Text style={styles.emoji}>🏋️</Text>
              </View>
            </Pressable>

            <Pressable
              style={[styles.gridCard, styles.wideCard]}
              onPress={() => navigation.navigate('CoachRecipes')}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Recipes</Text>
                <Text style={styles.chevron}>›</Text>
              </View>

              <View style={styles.iconWrap}>
                <Text style={styles.emoji}>🍲</Text>
              </View>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Tab bar outside SafeAreaView to stretch flush to device bottom */}
      <View style={styles.bottomTabBar}>
        <CoachTab
          label="Home"
          icon="🏠"
          onPress={() => navigation.navigate('CoachHome')}
        />
        <CoachTab label="Content" icon="📋" active onPress={() => {}} />
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

  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },

  backHomeButton: {
    alignSelf: 'flex-start',
    marginBottom: 4,
    paddingRight: 14,
    paddingVertical: 8,
  },
  backHomeText: {
    color: '#1E5C35',
    fontSize: 15,
    fontWeight: '800',
  },

  pageHeading: {
    marginBottom: 18,
    color: '#16281D',
    fontSize: 26,
    fontWeight: '800',
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridCard: {
    width: '48%',
    marginBottom: 14,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2ECE6',
  },
  wideCard: {
    width: '48%',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  cardTitle: {
    color: '#16281D',
    fontSize: 15,
    fontWeight: '800',
  },
  chevron: {
    color: '#1E5C35',
    fontSize: 20,
    fontWeight: '300',
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 34,
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