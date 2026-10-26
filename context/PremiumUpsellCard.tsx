import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

type PremiumUpsellCardProps = {
  onPress: () => void
}

export default function PremiumUpsellCard({ onPress }: PremiumUpsellCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Unlock BiteWise Premium</Text>

      <Text style={styles.description}>
        Get AI meal planning, voice-assisted food search, personal coach access,
        advanced nutrition insights, progress reports, and exercise tutorial
        videos for $9.90/month.
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={onPress}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Go Premium"
        accessibilityHint="View BiteWise Premium plans"
      >
        <Text style={styles.buttonText}>✦ Go Premium</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
    card: {
    backgroundColor: '#FFF7DC',
    borderColor: '#F4C95D',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 22,
    marginTop: 24,
    padding: 18,
    },
  title: {
    color: '#4E3907',
    fontSize: 17,
    fontWeight: '900',
  },
  description: {
    color: '#69511D',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#F4C95D',
    borderRadius: 12,
    justifyContent: 'center',
    marginTop: 16,
    minHeight: 46,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  buttonText: {
    color: '#16281D',
    fontSize: 14,
    fontWeight: '900',
  },
})
