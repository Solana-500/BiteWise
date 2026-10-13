import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'

import { supabase } from '../services/supabase'

type PaymentMethod = 'card' | 'paynow'

export default function PUPaymentScreen() {
  const navigation = useNavigation<any>()

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card')
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')
  const [cardHolder, setCardHolder] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  // Format Card Number (XXXX XXXX XXXX XXXX)
  function handleCardNumberChange(text: string) {
    const cleaned = text.replace(/\D/g, '').slice(0, 16)
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned
    setCardNumber(formatted)
  }

  // Format Expiry (MM/YY)
  function handleExpiryChange(text: string) {
    const cleaned = text.replace(/\D/g, '').slice(0, 4)
    if (cleaned.length >= 3) {
      setExpiry(`${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`)
    } else {
      setExpiry(cleaned)
    }
  }

  async function handleConfirmPayment() {
  if (paymentMethod === 'card') {
    const rawCard = cardNumber.replace(/\s/g, '')
    if (rawCard.length < 16) {
      Alert.alert('Invalid Card', 'Please enter a valid 16-digit card number.')
      return
    }
    if (expiry.length < 5) {
      Alert.alert('Invalid Expiry', 'Please enter a valid expiration date (MM/YY).')
      return
    }
    if (cvv.length < 3) {
      Alert.alert('Invalid CVV', 'Please enter a 3-digit security code.')
      return
    }
  }

  try {
    setIsProcessing(true)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      throw new Error('Please log in again before completing your subscription.')
    }

    // Simulate payment delay
    await new Promise((resolve) => setTimeout(resolve, 1200))

    // 1. Update database
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        subscription_tier: 'premium',
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (updateError) throw updateError

    // 2. Refresh session so App.tsx immediately switches isPremium to true
    await supabase.auth.refreshSession()

    Alert.alert(
      '🎉 Payment Successful!',
      'Welcome to BiteWise Premium! All premium features, AI logging, and coach tools are now unlocked.'
    )
  } catch (error: any) {
    console.error('Payment processing error:', error)
    Alert.alert('Payment Failed', error?.message || 'Unable to complete transaction.')
  } finally {
    setIsProcessing(false)
  }
}

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          disabled={isProcessing}
        >
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>

        <Text style={styles.pageTitle}>Confirm Subscription</Text>
        <Text style={styles.pageSubtitle}>Review order details and choose your payment method.</Text>

        {/* ORDER SUMMARY */}
        <Text style={styles.sectionHeading}>Order Summary</Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Plan</Text>
            <Text style={styles.summaryValue}>BiteWise Premium</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Billing Cycle</Text>
            <Text style={styles.summaryValue}>Monthly (Auto-renews)</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>$9.90 SGD</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total Due Today</Text>
            <Text style={styles.totalAmount}>$9.90</Text>
          </View>
        </View>

        {/* PAYMENT METHOD SELECTOR */}
        <Text style={styles.sectionHeading}>Payment Method</Text>

        <TouchableOpacity
          style={[styles.methodOption, paymentMethod === 'card' && styles.methodOptionSelected]}
          onPress={() => setPaymentMethod('card')}
          activeOpacity={0.8}
        >
          <View style={styles.methodLeft}>
            <View style={styles.methodIconCircle}><Text style={styles.methodIcon}>💳</Text></View>
            <View>
              <Text style={styles.methodTitle}>Credit or Debit Card</Text>
              <Text style={styles.methodSubtitle}>Visa, Mastercard, AMEX</Text>
            </View>
          </View>
          <View style={[styles.radioOuter, paymentMethod === 'card' && styles.radioOuterSelected]}>
            {paymentMethod === 'card' && <View style={styles.radioInner} />}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.methodOption, paymentMethod === 'paynow' && styles.methodOptionSelected]}
          onPress={() => setPaymentMethod('paynow')}
          activeOpacity={0.8}
        >
          <View style={styles.methodLeft}>
            <View style={styles.methodIconCircle}><Text style={styles.methodIcon}>📱</Text></View>
            <View>
              <Text style={styles.methodTitle}>PayNow QR</Text>
              <Text style={styles.methodSubtitle}>Instant bank transfer (Singapore)</Text>
            </View>
          </View>
          <View style={[styles.radioOuter, paymentMethod === 'paynow' && styles.radioOuterSelected]}>
            {paymentMethod === 'paynow' && <View style={styles.radioInner} />}
          </View>
        </TouchableOpacity>

        {/* CARD INPUT FORM */}
        {paymentMethod === 'card' ? (
          <View style={styles.cardFormContainer}>
            <Text style={styles.fieldLabel}>Name on Card</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Edmund Koh"
              placeholderTextColor="#8D8A9A"
              value={cardHolder}
              onChangeText={setCardHolder}
              editable={!isProcessing}
            />

            <Text style={styles.fieldLabel}>Card Number</Text>
            <TextInput
              style={styles.input}
              placeholder="1234 5678 9012 3456"
              placeholderTextColor="#8D8A9A"
              keyboardType="number-pad"
              maxLength={19}
              value={cardNumber}
              onChangeText={handleCardNumberChange}
              editable={!isProcessing}
            />

            <View style={styles.dualRow}>
              <View style={styles.dualCol}>
                <Text style={styles.fieldLabel}>Expiry Date</Text>
                <TextInput
                  style={styles.input}
                  placeholder="MM/YY"
                  placeholderTextColor="#8D8A9A"
                  keyboardType="number-pad"
                  maxLength={5}
                  value={expiry}
                  onChangeText={handleExpiryChange}
                  editable={!isProcessing}
                />
              </View>

              <View style={styles.dualCol}>
                <Text style={styles.fieldLabel}>CVV / CVC</Text>
                <TextInput
                  style={styles.input}
                  placeholder="123"
                  placeholderTextColor="#8D8A9A"
                  keyboardType="number-pad"
                  maxLength={4}
                  secureTextEntry
                  value={cvv}
                  onChangeText={(t) => setCvv(t.replace(/\D/g, ''))}
                  editable={!isProcessing}
                />
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.payNowBox}>
            <Text style={styles.payNowTitle}>Scan & Pay with PayNow</Text>
            <View style={styles.qrPlaceholder}>
              <Text style={styles.qrIcon}>📷</Text>
              <Text style={styles.qrText}>UEN: 2026BITEWISE01</Text>
              <Text style={styles.qrSub}>Simulated PayNow QR Gateway</Text>
            </View>
          </View>
        )}

        {/* SECURITY NOTE */}
        <View style={styles.securityNote}>
          <Text style={styles.securityIcon}>🔒</Text>
          <Text style={styles.securityText}>
            256-bit SSL encrypted. Cancel anytime in Profile Settings.
          </Text>
        </View>

        {/* PAY BUTTON */}
        <TouchableOpacity
          style={[styles.payButton, isProcessing && styles.payButtonDisabled]}
          onPress={handleConfirmPayment}
          disabled={isProcessing}
          activeOpacity={0.85}
        >
          {isProcessing ? (
            <ActivityIndicator color="#16281D" />
          ) : (
            <Text style={styles.payButtonText}>Pay $9.90 & Upgrade</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5FAF6',
  },
  container: {
    padding: 20,
    paddingTop: 54,
    paddingBottom: 40,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 8,
    paddingRight: 14,
    paddingVertical: 8,
  },
  backText: {
    color: '#1E5C35',
    fontSize: 15,
    fontWeight: '800',
  },
  pageTitle: {
    color: '#16281D',
    fontSize: 24,
    fontWeight: '900',
  },
  pageSubtitle: {
    color: '#5C7267',
    fontSize: 13,
    marginTop: 4,
    marginBottom: 20,
  },
  sectionHeading: {
    color: '#5C7267',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 8,
    textTransform: 'uppercase',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2ECE6',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  summaryLabel: {
    color: '#7C8F83',
    fontSize: 13,
  },
  summaryValue: {
    color: '#16281D',
    fontSize: 13,
    fontWeight: '700',
  },
  summaryDivider: {
    backgroundColor: '#F0F5F2',
    height: 1,
  },
  totalLabel: {
    color: '#16281D',
    fontSize: 15,
    fontWeight: '800',
  },
  totalAmount: {
    color: '#1E5C35',
    fontSize: 18,
    fontWeight: '900',
  },
  methodOption: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2ECE6',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    padding: 14,
  },
  methodOptionSelected: {
    borderColor: '#1E5C35',
    backgroundColor: '#F0F8F3',
  },
  methodLeft: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  methodIconCircle: {
    alignItems: 'center',
    backgroundColor: '#EAF3EC',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    marginRight: 12,
    width: 36,
  },
  methodIcon: {
    fontSize: 18,
  },
  methodTitle: {
    color: '#16281D',
    fontSize: 14,
    fontWeight: '800',
  },
  methodSubtitle: {
    color: '#7C8F83',
    fontSize: 11,
    marginTop: 2,
  },
  radioOuter: {
    alignItems: 'center',
    borderColor: '#C9DBD0',
    borderRadius: 10,
    borderWidth: 2,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  radioOuterSelected: {
    borderColor: '#1E5C35',
  },
  radioInner: {
    backgroundColor: '#1E5C35',
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  cardFormContainer: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2ECE6',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 6,
    marginBottom: 16,
    padding: 16,
  },
  fieldLabel: {
    color: '#16281D',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#FBFDFB',
    borderColor: '#C9DBD0',
    borderRadius: 10,
    borderWidth: 1,
    color: '#16281D',
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dualRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dualCol: {
    flex: 1,
  },
  payNowBox: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2ECE6',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 6,
    marginBottom: 16,
    padding: 20,
  },
  payNowTitle: {
    color: '#16281D',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 12,
  },
  qrPlaceholder: {
    alignItems: 'center',
    backgroundColor: '#F5FAF6',
    borderColor: '#C9DBD0',
    borderRadius: 12,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    padding: 20,
    width: '100%',
  },
  qrIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  qrText: {
    color: '#1E5C35',
    fontSize: 13,
    fontWeight: '800',
  },
  qrSub: {
    color: '#7C8F83',
    fontSize: 11,
    marginTop: 4,
  },
  securityNote: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  securityIcon: {
    fontSize: 13,
    marginRight: 6,
  },
  securityText: {
    color: '#7C8F83',
    fontSize: 11,
  },
  payButton: {
    alignItems: 'center',
    backgroundColor: '#F4C95D',
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 52,
    paddingVertical: 14,
  },
  payButtonDisabled: {
    opacity: 0.7,
  },
  payButtonText: {
    color: '#16281D',
    fontSize: 16,
    fontWeight: '900',
  },
})
