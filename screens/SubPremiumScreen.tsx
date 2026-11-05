import { useEffect, useState } from 'react'
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

  const [checkingSubscription, setCheckingSubscription] = useState(true)
  const [isPremium, setIsPremium] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null)
  const [subscriptionEndDate, setSubscriptionEndDate] = useState<string | null>(null)

  useEffect(() => {
    void loadSubscriptionStatus()
  }, [])

  async function loadSubscriptionStatus() {
    try {
      setCheckingSubscription(true)

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        throw userError
      }

      if (!user) {
        setIsPremium(false)
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('subscription_tier, subscription_status, subscription_end_date')
        .eq('id', user.id)
        .maybeSingle<{
          subscription_tier: string | null
          subscription_status: string | null
          subscription_end_date: string | null
        }>()

      if (error) {
        throw error
      }

      const tier = data?.subscription_tier
      const status = data?.subscription_status
      const endDate = data?.subscription_end_date

      setSubscriptionStatus(status ?? null)
      setSubscriptionEndDate(endDate ?? null)

      const endDateTime = endDate ? new Date(endDate).getTime() : null
      const stillWithinPaidPeriod =
        tier === 'premium' && (!endDateTime || endDateTime > Date.now())

      setIsPremium(stillWithinPaidPeriod)
    } catch (error) {
      console.error('Unable to load subscription status:', error)
      setIsPremium(false)
    } finally {
      setCheckingSubscription(false)
    }
  }

  async function handleCancelSubscription() {
    Alert.alert(
      'Cancel Premium Subscription',
      'Your premium benefits will remain active until the end of your current billing period.',
      [
        {
          text: 'Keep Premium',
          style: 'cancel',
        },
        {
          text: 'Cancel Subscription',
          style: 'destructive',
          onPress: async () => {
            try {
              setCancelling(true)

              const {
                data: { user },
                error: userError,
              } = await supabase.auth.getUser()

              if (userError) {
                throw userError
              }

              if (!user) {
                Alert.alert('Login required', 'Please log in again.')
                return
              }

             
              const { data, error } = await supabase.rpc(
                'cancel_demo_premium'
              )
              
              if (error) {
                throw error
              }
              
              if (!data?.success) {
                throw new Error('Subscription cancellation was unsuccessful.')
              }
              
              const cancelledExpiry = data.expires_at as string
              
              // Update the screen after successful backend cancellation
              setSubscriptionStatus('cancelled')
              setSubscriptionEndDate(cancelledExpiry)
              
              Alert.alert(
                'Subscription Cancelled',
                `Your Premium access will remain active until ${new Date(
                  cancelledExpiry
                ).toLocaleDateString()}.`
              )


              const currentEndDate = profile?.subscription_end_date
              const nextBillingDate = currentEndDate
                ? new Date(currentEndDate)
                : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

              const { error } = await supabase
                .from('profiles')
                .update({
                  subscription_status: 'cancelled',
                  subscription_end_date: nextBillingDate.toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq('id', user.id)

              if (error) {
                throw error
              }

              setSubscriptionStatus('cancelled')
              setSubscriptionEndDate(nextBillingDate.toISOString())

              Alert.alert(
                'Subscription Cancelled',
                `Premium access will remain active until ${nextBillingDate.toLocaleDateString()}.`
              )
            } catch (error: any) {
              console.error('Cancel subscription error:', error)
              Alert.alert(
                'Cancellation Failed',
                error?.message || 'Unable to cancel subscription.'
              )
            } finally {
              setCancelling(false)
            }
          },
        },
      ]
    )
  }

  function handleBack() {
    if (navigation.canGoBack()) {
      navigation.goBack()
    } else {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' as never }],
      })
    }
  }

  if (checkingSubscription) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#1E5C35" />
      </SafeAreaView>
    )
  }

  if (isPremium) {
    return (
      <SafeAreaView style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={styles.backButtonText}>‹ Back</Text>
          </TouchableOpacity>

          <View style={styles.manageCard}>
            <View style={styles.manageIconCircle}>
              <Text style={styles.manageIcon}>✦</Text>
            </View>

            <Text style={styles.manageTitle}>
              {subscriptionStatus === 'cancelled'
                ? 'Premium ending soon'
                : 'You are a Premium member'}
            </Text>

            <Text style={styles.manageText}>
              {subscriptionStatus === 'cancelled' && subscriptionEndDate
                ? `Your premium benefits will remain active until ${new Date(
                    subscriptionEndDate
                  ).toLocaleDateString()}.`
                : 'You currently have access to AI meal planning, personal coach support, advanced nutrition insights, and premium progress tracking.'}
            </Text>

            <View
              style={[
                styles.manageStatusChip,
                subscriptionStatus === 'cancelled' &&
                  styles.cancelledStatusChip,
              ]}
            >
              <Text
                style={[
                  styles.manageStatusText,
                  subscriptionStatus === 'cancelled' &&
                    styles.cancelledStatusText,
                ]}
              >
                {subscriptionStatus === 'cancelled'
                  ? 'CANCELLED — ACTIVE UNTIL PERIOD END'
                  : 'ACTIVE PREMIUM'}
              </Text>
            </View>

            {subscriptionStatus !== 'cancelled' ? (
              <TouchableOpacity
                style={[
                  styles.cancelButton,
                  cancelling && styles.disabledButton,
                ]}
                onPress={handleCancelSubscription}
                disabled={cancelling}
                accessibilityRole="button"
                accessibilityLabel="Cancel premium subscription"
              >
                {cancelling ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.cancelButtonText}>
                    Cancel Subscription
                  </Text>
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.cancelledNotice}>
                <Text style={styles.cancelledNoticeText}>
                  Your subscription will not renew. You will return to the
                  free plan after your current billing period ends.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
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
            Unlock AI-powered logging, personalised recommendations, coaching
            tools, advanced nutrition analytics, and progress tracking.
          </Text>

          <Text style={styles.demoText}>
            Demo mode: Premium activates instantly for testing.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.goPremiumButton}
          onPress={() => navigation.navigate('PUPayment' as never)}
        >
          <Text style={styles.goPremiumButtonText}>Go Premium</Text>
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
  loadingScreen: {
    alignItems: 'center',
    backgroundColor: '#F5FAF6',
    flex: 1,
    justifyContent: 'center',
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

  manageCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2ECE6',
    borderRadius: 22,
    borderWidth: 1,
    marginTop: 12,
    padding: 24,
  },
  manageIconCircle: {
    alignItems: 'center',
    backgroundColor: '#EAF3EC',
    borderRadius: 38,
    height: 76,
    justifyContent: 'center',
    marginBottom: 18,
    width: 76,
  },
  manageIcon: {
    color: '#1E5C35',
    fontSize: 34,
  },
  manageTitle: {
    color: '#16281D',
    fontSize: 21,
    fontWeight: '900',
    textAlign: 'center',
  },
  manageText: {
    color: '#5C7267',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
    textAlign: 'center',
  },
  manageStatusChip: {
    backgroundColor: '#EAF3EC',
    borderColor: '#73B987',
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 18,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  manageStatusText: {
    color: '#1E5C35',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  cancelledStatusChip: {
    backgroundColor: '#FFF4D6',
    borderColor: '#F4C95D',
  },
  cancelledStatusText: {
    color: '#957115',
  },
  cancelButton: {
    alignItems: 'center',
    backgroundColor: '#C0392B',
    borderRadius: 12,
    justifyContent: 'center',
    marginTop: 26,
    minHeight: 52,
    width: '100%',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  cancelledNotice: {
    backgroundColor: '#FFF7DC',
    borderColor: '#F4C95D',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 26,
    padding: 14,
    width: '100%',
  },
  cancelledNoticeText: {
    color: '#69511D',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  cancelNote: {
    color: '#708277',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 14,
    textAlign: 'center',
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
  goPremiumButton: {
    alignItems: 'center',
    backgroundColor: '#F4C95D',
    borderRadius: 14,
    justifyContent: 'center',
    marginTop: 24,
    minHeight: 54,
    paddingVertical: 15,
  },
  goPremiumButtonText: {
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
  disabledButton: {
    opacity: 0.65,
  },
})
