import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import { supabase } from '../services/supabase'
import type { RootStackParamList } from '../types/navigation'

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'SubPremium'
>

const PREMIUM_FEATURES = [
  'AI meal planning and recommendations',
  'AI voice recognition for food logging',
  'Personal coach access',
  'Advanced nutrition insights',
  'Advanced progress reports and tracking',
  'Quick access to exercise tutorial videos',
]

export default function SubPremiumScreen() {
  const navigation = useNavigation<NavigationProp>()
  const [loading, setLoading] = useState(false)

  async function handleStartPremium() {
    try {
      setLoading(true)

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        Alert.alert('Login required', 'Please log in again.')
        return
      }

      /*
       * DEMO / FYP MODE:
       * This changes the current user to Premium in Supabase.
       *
       * For a real production app, replace this with Apple/Google
       * in-app subscription payment verification.
       */
      const { error } = await supabase
        .from('profiles')
        
      .update({
        subscription_tier: 'premium',
        tier: 'premium',
        updated_at: new Date().toISOString(),
      })

        .eq('id', user.id)

      if (error) {
        throw error
      }

      Alert.alert(
        'Welcome to BiteWise Premium!',
        'Your Premium access is now active.',
        [
          
      {
        text: 'Continue',
        onPress: () => {
          if (navigation.canGoBack()) {
            navigation.goBack()
          }
        },
      },

        ]
      )
    } catch (error: any) {
      console.error('Premium activation error:', error)

      Alert.alert(
        'Could not activate Premium',
        error?.message ?? 'Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backButtonText}>‹ Back</Text>
        </TouchableOpacity>

        <View style={styles.heroCard}>
          <Text style={styles.crown}>✦</Text>

          <Text style={styles.heroTitle}>BiteWise Premium</Text>

          <Text style={styles.heroSubtitle}>
            Get more insight from your nutrition, wellness, and fitness
            journey.
          </Text>

          <View style={styles.priceBadge}>
            <Text style={styles.priceAmount}>$9.90</Text>
            <Text style={styles.pricePeriod}>/ month</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>What you get</Text>

        <View style={styles.featuresCard}>
          {PREMIUM_FEATURES.map((feature) => (
            <View key={feature} style={styles.featureRow}>
              <View style={styles.checkCircle}>
                <Text style={styles.checkText}>✓</Text>
              </View>

              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        <View style={styles.planCard}>
          <View style={styles.planTopRow}>
            <View>
              <Text style={styles.planLabel}>BITEWISE PREMIUM</Text>
              <Text style={styles.planTitle}>Monthly membership</Text>
            </View>

            <View style={styles.planPriceContainer}>
              <Text style={styles.planPriceAmount}>$9.90</Text>
              <Text style={styles.planPricePeriod}>/ month</Text>
            </View>
          </View>

          <Text style={styles.planDescription}>
            Unlock AI-powered logging, personalised recommendations, coaching tools,
            advanced nutrition analytics, and progress tracking.
          </Text>

          <Text style={styles.demoText}>
            Demo mode: Premium activates instantly for testing.
          </Text>
        </View>

        <TouchableOpacity
          disabled={loading}
          onPress={() => void handleStartPremium()}
          style={[styles.subscribeButton, loading && styles.disabledButton]}
          accessibilityRole="button"
          accessibilityLabel="Start BiteWise Premium"
        >
          {loading ? (
            <ActivityIndicator color="#16281D" />
          ) : (
            <Text style={styles.subscribeButtonText}>Go Premium</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.footerText}>
          You can continue using BiteWise Free at any time.
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F5FAF6',
    flex: 1,
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 16,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  backButtonText: {
    color: '#1E5C35',
    fontSize: 16,
    fontWeight: '800',
  },
  heroCard: {
    alignItems: 'center',
    backgroundColor: '#1E5C35',
    borderRadius: 22,
    paddingHorizontal: 24,
    paddingVertical: 30,
  },
  crown: {
    color: '#F4C95D',
    fontSize: 40,
    marginBottom: 8,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 27,
    fontWeight: '900',
    textAlign: 'center',
  },
  heroSubtitle: {
    color: '#D8EADF',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
    textAlign: 'center',
  },
    priceBadge: {
    alignItems: 'baseline',
    backgroundColor: 'rgba(244, 201, 93, 0.2)',
    borderColor: '#F4C95D',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 18,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  priceAmount: {
    color: '#FDE9A9',
    fontSize: 20,
    fontWeight: '900',
  },
  pricePeriod: {
    color: '#FDE9A9',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  sectionTitle: {
    color: '#16281D',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 12,
    marginTop: 28,
  },
  featuresCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2ECE6',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  featureRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 14,
  },
  checkCircle: {
    alignItems: 'center',
    backgroundColor: '#D9ECDF',
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    marginRight: 12,
    width: 24,
  },
  checkText: {
    color: '#1E5C35',
    fontSize: 14,
    fontWeight: '900',
  },
  featureText: {
    color: '#294234',
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  planCard: {
    backgroundColor: '#FFF7DC',
    borderColor: '#F4C95D',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 20,
    padding: 18,
  },
    planTopRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  planPriceContainer: {
    alignItems: 'flex-end',
  },
  planPriceAmount: {
    color: '#4E3907',
    fontSize: 23,
    fontWeight: '900',
  },
  planPricePeriod: {
    color: '#8A6410',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
  },
  planLabel: {
    color: '#8A6410',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  planTitle: {
    color: '#4E3907',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 7,
  },
  planDescription: {
    color: '#69511D',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 7,
  },
  demoText: {
    color: '#8A6410',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 12,
  },
  subscribeButton: {
    alignItems: 'center',
    backgroundColor: '#F4C95D',
    borderRadius: 14,
    justifyContent: 'center',
    marginTop: 24,
    minHeight: 54,
    paddingVertical: 15,
  },
  disabledButton: {
    opacity: 0.65,
  },
  subscribeButtonText: {
    color: '#16281D',
    fontSize: 16,
    fontWeight: '900',
  },
  footerText: {
    color: '#708277',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 14,
    textAlign: 'center',
  },
})
