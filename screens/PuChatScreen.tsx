import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function PuChatScreen() {
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>💬</Text>
        </View>

        <Text style={styles.title}>Chat with Your Coach</Text>

        <Text style={styles.text}>
          Your private conversation with your assigned health coach will
          appear here.
        </Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5FAF6',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingBottom: 80,
  },
  iconCircle: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 36,
    backgroundColor: '#EAF3EC',
  },
  icon: {
    fontSize: 30,
  },
  title: {
    marginTop: 18,
    color: '#16281D',
    fontSize: 20,
    fontWeight: '800',
  },
  text: {
    marginTop: 9,
    color: '#5C7267',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
})