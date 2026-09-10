import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'

import type { RootStackParamList } from '../types/navigation'
import { useState } from 'react'

type Props = NativeStackScreenProps<RootStackParamList, 'Landing'>

export default function LandingScreen({ navigation }: Props) {
  const [menuVisible, setMenuVisible] = useState(false)

  return (
  <SafeAreaView style={styles.safeArea}>
    <Modal
      visible={menuVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setMenuVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <Pressable
          style={styles.modalBackground}
          onPress={() => setMenuVisible(false)}
        />

        <View style={styles.menuPanel}>
          <View style={styles.menuHeader}>
            <Text style={styles.menuTitle}>BiteWise Menu</Text>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setMenuVisible(false)}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setMenuVisible(false)
              navigation.navigate('SignUp')
            }}
          >
            <Text style={styles.menuItemText}>Register Account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setMenuVisible(false)
            }}
          >
            <Text style={styles.menuItemText}>Features</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setMenuVisible(false)
            }}
          >
            <Text style={styles.menuItemText}>Subscription Plan</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setMenuVisible(false)
            }}
          >
            <Text style={styles.menuItemText}>Customer Reviews</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setMenuVisible(false)
            }}
          >
            <Text style={styles.menuItemText}>Coach Ratings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuLoginButton}
            onPress={() => {
              setMenuVisible(false)
              navigation.navigate('Login')
            }}
          >
            <Text style={styles.menuLoginText}>Log In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>

    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.navbar}>
  <Text style={styles.logo}>BiteWise</Text>

  <ScrollView
    horizontal
    style={styles.navLinksScroll}
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.navLinks}
  >
    <TouchableOpacity
      style={styles.navLink}
      onPress={() => navigation.navigate('SignUp')}
    >
      <Text style={styles.navLinkText}>Register Account</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={styles.navLink}
      onPress={() => setMenuVisible(false)}
    >
      <Text style={styles.navLinkText}>Features</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={styles.navLink}
      onPress={() => setMenuVisible(false)}
    >
      <Text style={styles.navLinkText}>Subscription Plan</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={styles.navLink}
      onPress={() => setMenuVisible(false)}
    >
      <Text style={styles.navLinkText}>Customer Reviews</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={styles.navLink}
      onPress={() => setMenuVisible(false)}
    >
      <Text style={styles.navLinkText}>Coach Ratings</Text>
    </TouchableOpacity>
  </ScrollView>

  <TouchableOpacity
    accessibilityLabel="Open menu"
    accessibilityRole="button"
    style={styles.menuButton}
    onPress={() => setMenuVisible(true)}
  >
    <View style={styles.menuLine} />
    <View style={styles.menuLine} />
    <View style={styles.menuLine} />
  </TouchableOpacity>
</View>

      <View style={styles.hero}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>PERSONALISED NUTRITION</Text>
        </View>

        <Text style={styles.heroTitle}>
          Healthy choices,{'\n'}better you.
        </Text>

        <Text style={styles.heroSubtitle}>
          Track calories, plan meals, and meet your health goals with
          nutrition guidance tailored to you.
        </Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('SignUp')}
        >
          <Text style={styles.primaryButtonText}>Get Started Free</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.secondaryButtonText}>
            I already have an account
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.previewCard}>
        <View style={styles.previewHeader}>
          <View>
            <Text style={styles.previewGreeting}>Good afternoon</Text>
            <Text style={styles.previewName}>Hello, BiteWise User</Text>
          </View>

          <View style={styles.freeBadge}>
            <Text style={styles.freeBadgeText}>FREE PLAN</Text>
          </View>
        </View>

        <View style={styles.goalCard}>
          <Text style={styles.goalLabel}>Daily Calorie Goal</Text>
          <Text style={styles.goalValue}>1,260 / 1,900 kcal</Text>

          <View style={styles.progressBackground}>
            <View style={styles.progressFill} />
          </View>
        </View>

        <Text style={styles.previewSectionTitle}>Your Features</Text>

        <View style={styles.featureGrid}>
          <FeaturePreview icon="◉" label="BMI" />
          <FeaturePreview icon="◈" label="Wellness" />
          <FeaturePreview icon="＋" label="Meals" />
          <FeaturePreview icon="▦" label="Reports" />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Why use BiteWise?</Text>

      <FeatureCard
        icon="✦"
        title="Personalised Guidance"
        description="Nutrition targets based on your body details, activity level, and fitness goal."
      />

      <FeatureCard
        icon="＋"
        title="Nutrition Tracking"
        description="Log meals and monitor calories, protein, carbohydrates, fat, and hydration."
      />

      <FeatureCard
        icon="↗"
        title="Progress Tracking"
        description="Review your nutrition habits and work towards your health goals over time."
      />

      <View style={styles.howItWorks}>
        <Text style={styles.sectionTitle}>How it works</Text>

        <Step
          number="1"
          title="Create your profile"
          description="Enter your body information and lifestyle details."
        />

        <Step
          number="2"
          title="Select your goal"
          description="Choose Fat Loss, Body Building, Power Lifting, or Hyrox."
        />

        <Step
          number="3"
          title="Track your nutrition"
          description="Log meals, monitor your daily intake, and stay consistent."
        />
      </View>

      <View style={styles.ctaCard}>
        <Text style={styles.ctaTitle}>
          Start your personalised nutrition journey today.
        </Text>

        <Text style={styles.ctaText}>Healthy choices, better you.</Text>

        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() => navigation.navigate('SignUp')}
        >
          <Text style={styles.ctaButtonText}>Create Free Account</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>
        BiteWise · Diet and Nutrition Tracking
      </Text>
    </ScrollView>
  </SafeAreaView>
)
}

type FeaturePreviewProps = {
  icon: string
  label: string
}

function FeaturePreview({ icon, label }: FeaturePreviewProps) {
  return (
    <View style={styles.featurePreview}>
      <Text style={styles.featurePreviewIcon}>{icon}</Text>
      <Text style={styles.featurePreviewText}>{label}</Text>
    </View>
  )
}

type FeatureCardProps = {
  icon: string
  title: string
  description: string
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <View style={styles.featureCard}>
      <View style={styles.featureIconCircle}>
        <Text style={styles.featureCardIcon}>{icon}</Text>
      </View>

      <View style={styles.featureCardContent}>
        <Text style={styles.featureCardTitle}>{title}</Text>
        <Text style={styles.featureCardDescription}>{description}</Text>
      </View>
    </View>
  )
}

type StepProps = {
  number: string
  title: string
  description: string
}

function Step({ number, title, description }: StepProps) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>{number}</Text>
      </View>

      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepDescription}>{description}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({

    navbar: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingVertical: 17,
},

    navLinksScroll: {
    flex: 1,
},


    navLinks: {
  alignItems: 'center',
  flexGrow: 1,
  gap: 18,
  marginHorizontal: 12,
  paddingRight: 8,
},


navLink: {
  paddingVertical: 8,
},

navLinkText: {
  color: '#1E5C35',
  fontSize: 13,
  fontWeight: '700',
},


    menuButton: {
  alignItems: 'center',
  justifyContent: 'center',
  padding: 8,
  width: 42,
},

menuLine: {
  backgroundColor: '#1E5C35',
  borderRadius: 3,
  height: 3,
  marginVertical: 3,
  width: 26,
},

modalOverlay: {
  flex: 1,
  flexDirection: 'row',
},

modalBackground: {
  backgroundColor: 'rgba(0, 0, 0, 0.35)',
  flex: 1,
},

menuPanel: {
  backgroundColor: '#FFFFFF',
  elevation: 8,
  paddingHorizontal: 20,
  paddingTop: 24,
  shadowColor: '#000000',
  shadowOffset: {
    width: -3,
    height: 0,
  },
  shadowOpacity: 0.18,
  shadowRadius: 12,
  width: '78%',
},

menuHeader: {
  alignItems: 'center',
  borderBottomColor: '#DCE9E0',
  borderBottomWidth: 1,
  flexDirection: 'row',
  justifyContent: 'space-between',
  paddingBottom: 18,
},

menuTitle: {
  color: '#1E5C35',
  fontSize: 21,
  fontWeight: '900',
},

closeButton: {
  alignItems: 'center',
  height: 34,
  justifyContent: 'center',
  width: 34,
},

closeButtonText: {
  color: '#5C7267',
  fontSize: 30,
  fontWeight: '300',
  lineHeight: 30,
},

menuItem: {
  borderBottomColor: '#E7F0E9',
  borderBottomWidth: 1,
  paddingVertical: 18,
},

menuItemText: {
  color: '#16281D',
  fontSize: 16,
  fontWeight: '700',
},

menuLoginButton: {
  alignItems: 'center',
  backgroundColor: '#1E5C35',
  borderRadius: 10,
  marginTop: 28,
  paddingVertical: 14,
},

menuLoginText: {
  color: '#FFFFFF',
  fontSize: 15,
  fontWeight: '800',
},

  safeArea: {
    backgroundColor: '#F5FAF6',
    flex: 1,
  },
  container: {
    backgroundColor: '#F5FAF6',
    paddingBottom: 42,
  },
  
  logo: {
    color: '#1E5C35',
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  loginTopButton: {
    borderColor: '#1E5C35',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  loginTopText: {
    color: '#1E5C35',
    fontSize: 13,
    fontWeight: '800',
  },
  hero: {
    alignItems: 'center',
    backgroundColor: '#E4F1E7',
    paddingHorizontal: 25,
    paddingTop: 52,
    paddingBottom: 42,
  },
  badge: {
    backgroundColor: '#D1E7D6',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  badgeText: {
    color: '#1E5C35',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  heroTitle: {
    color: '#16281D',
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -1,
    lineHeight: 43,
    marginTop: 20,
    textAlign: 'center',
  },
  heroSubtitle: {
    color: '#4F6658',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 16,
    maxWidth: 340,
    textAlign: 'center',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#1E5C35',
    borderRadius: 12,
    marginTop: 28,
    paddingVertical: 16,
    width: '100%',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    alignItems: 'center',
    marginTop: 14,
    padding: 8,
  },
  secondaryButtonText: {
    color: '#1E5C35',
    fontSize: 14,
    fontWeight: '700',
  },
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D3E3D7',
    borderRadius: 20,
    borderWidth: 1,
    elevation: 2,
    marginHorizontal: 22,
    marginTop: -22,
    padding: 17,
    shadowColor: '#1E5C35',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  previewHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  previewGreeting: {
    color: '#708277',
    fontSize: 11,
  },
  previewName: {
    color: '#16281D',
    fontSize: 17,
    fontWeight: '800',
    marginTop: 3,
  },
  freeBadge: {
    backgroundColor: '#E4F1E7',
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  freeBadgeText: {
    color: '#1E5C35',
    fontSize: 9,
    fontWeight: '900',
  },
  goalCard: {
    backgroundColor: '#F5FAF6',
    borderRadius: 14,
    marginTop: 18,
    padding: 14,
  },
  goalLabel: {
    color: '#16281D',
    fontSize: 13,
    fontWeight: '800',
  },
  goalValue: {
    color: '#1E5C35',
    fontSize: 17,
    fontWeight: '900',
    marginTop: 5,
  },
  progressBackground: {
    backgroundColor: '#D3E3D7',
    borderRadius: 999,
    height: 7,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: '#1E5C35',
    borderRadius: 999,
    height: '100%',
    width: '66%',
  },
  previewSectionTitle: {
    color: '#16281D',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 18,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  featurePreview: {
    alignItems: 'center',
    backgroundColor: '#F5FAF6',
    borderRadius: 10,
    flexBasis: '47%',
    padding: 11,
  },
  featurePreviewIcon: {
    color: '#1E5C35',
    fontSize: 18,
  },
  featurePreviewText: {
    color: '#16281D',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 5,
  },
  sectionTitle: {
    color: '#16281D',
    fontSize: 25,
    fontWeight: '900',
    marginBottom: 16,
    marginTop: 38,
    paddingHorizontal: 22,
    textAlign: 'center',
  },
  featureCard: {
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderColor: '#DCE9E0',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    marginHorizontal: 22,
    marginTop: 11,
    padding: 16,
  },
  featureIconCircle: {
    alignItems: 'center',
    backgroundColor: '#E4F1E7',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    marginRight: 13,
    width: 44,
  },
  featureCardIcon: {
    color: '#1E5C35',
    fontSize: 21,
    fontWeight: '900',
  },
  featureCardContent: {
    flex: 1,
  },
  featureCardTitle: {
    color: '#16281D',
    fontSize: 15,
    fontWeight: '900',
  },
  featureCardDescription: {
    color: '#5C7267',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
  howItWorks: {
    backgroundColor: '#EAF4EC',
    marginTop: 38,
    paddingBottom: 28,
    paddingHorizontal: 22,
  },
  stepRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    marginTop: 18,
  },
  stepNumber: {
    alignItems: 'center',
    backgroundColor: '#1E5C35',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    marginRight: 13,
    width: 36,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  stepContent: {
    flex: 1,
    paddingTop: 2,
  },
  stepTitle: {
    color: '#16281D',
    fontSize: 15,
    fontWeight: '900',
  },
  stepDescription: {
    color: '#5C7267',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  ctaCard: {
    alignItems: 'center',
    backgroundColor: '#1E5C35',
    borderRadius: 20,
    marginHorizontal: 22,
    marginTop: 38,
    padding: 25,
  },
  ctaTitle: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '900',
    lineHeight: 29,
    textAlign: 'center',
  },
  ctaText: {
    color: '#D8EADF',
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
  },
  ctaButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginTop: 22,
    paddingVertical: 14,
    width: '100%',
  },
  ctaButtonText: {
    color: '#1E5C35',
    fontSize: 15,
    fontWeight: '900',
  },
  footer: {
    color: '#708277',
    fontSize: 12,
    marginTop: 27,
    textAlign: 'center',
  },
})