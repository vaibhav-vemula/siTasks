import { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { startApprovalFlow, finishApprovalFlow } from '@/sia/client'
import { useSiaContext } from '@/context/SiaContext'
import type { Builder } from 'react-native-sia'

type Step = 'welcome' | 'browser_open' | 'registering' | 'error'

export default function ConnectScreen() {
  const router = useRouter()
  const { setSdk } = useSiaContext()
  const [step, setStep] = useState<Step>('welcome')
  const [error, setError] = useState<string | null>(null)
  const [builder, setBuilder] = useState<InstanceType<typeof Builder> | null>(null)

  async function handleSignIn() {
    setStep('browser_open')
    setError(null)
    try {
      const result = await startApprovalFlow()
      setBuilder(result.builder)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open sign-in page')
      setStep('error')
    }
  }

  async function handleContinue() {
    if (!builder) return
    setStep('registering')
    setError(null)
    try {
      const sdk = await finishApprovalFlow(builder)
      setSdk(sdk)
      router.replace('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed — please try again')
      setStep('error')
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      {/* ── Brand area ── */}
      <View style={styles.brand}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoMark}>✓</Text>
        </View>
        <Text style={styles.appTitle}>SiTasks</Text>
        <Text style={styles.appTagline}>Your todos, stored on the decentralized web</Text>
      </View>

      {/* ── Content area ── */}
      <View style={styles.content}>
        {step === 'welcome' && (
          <>
            <View style={styles.featureList}>
              <FeatureRow icon="☁" text="Data stored on Sia — only you own it" />
              <FeatureRow icon="🔒" text="No central server, no account data sold" />
              <FeatureRow icon="📅" text="One object per day, synced automatically" />
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={handleSignIn} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Sign in with Sia</Text>
            </TouchableOpacity>

            <Text style={styles.hint}>
              Opens sia.storage — sign in with Google or email, then approve SiTasks.
            </Text>
          </>
        )}

        {step === 'browser_open' && (
          <>
            <View style={styles.stepCard}>
              <Text style={styles.stepNum}>1</Text>
              <View style={styles.stepBody}>
                <Text style={styles.stepTitle}>Approve in your browser</Text>
                <Text style={styles.stepDesc}>
                  Sign in on the sia.storage page that just opened, then approve SiTasks.
                  Once done, come back here and tap Continue.
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={handleContinue} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>I've approved — Continue</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryBtn} onPress={handleSignIn} activeOpacity={0.7}>
              <Text style={styles.secondaryBtnText}>Re-open browser</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'registering' && (
          <View style={styles.loadingArea}>
            <ActivityIndicator size="large" color="#1a8cff" />
            <Text style={styles.loadingText}>Finishing sign-in…</Text>
          </View>
        )}

        {step === 'error' && (
          <>
            <View style={styles.errorCard}>
              <Text style={styles.errorIcon}>⚠</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep('welcome')} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Try again</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* ── Footer ── */}
      <Text style={styles.footer}>
        Powered by{' '}
        <Text style={styles.footerLink}>Sia decentralized storage</Text>
      </Text>
    </SafeAreaView>
  )
}

function FeatureRow({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureRow}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 28,
  },

  brand: {
    flex: 0.45,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#1a8cff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowColor: '#1a8cff',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  logoMark: { fontSize: 38, color: '#fff', lineHeight: 44 },
  appTitle: { fontSize: 32, fontWeight: '800', color: '#111', letterSpacing: -1 },
  appTagline: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 20 },

  content: {
    flex: 0.45,
    justifyContent: 'center',
    gap: 14,
  },

  featureList: { gap: 12, marginBottom: 6 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  featureText: { fontSize: 14, color: '#555', flex: 1, lineHeight: 19 },

  primaryBtn: {
    backgroundColor: '#1a8cff',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#1a8cff',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  secondaryBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
  },
  secondaryBtnText: { color: '#555', fontSize: 15, fontWeight: '500' },

  hint: {
    fontSize: 12,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 2,
  },

  stepCard: {
    flexDirection: 'row',
    backgroundColor: '#f0f7ff',
    borderRadius: 16,
    padding: 16,
    gap: 14,
    alignItems: 'flex-start',
  },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1a8cff',
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 28,
    overflow: 'hidden',
  },
  stepBody: { flex: 1, gap: 4 },
  stepTitle: { fontSize: 15, fontWeight: '700', color: '#111' },
  stepDesc: { fontSize: 13, color: '#666', lineHeight: 19 },

  loadingArea: { alignItems: 'center', gap: 16, paddingVertical: 20 },
  loadingText: { fontSize: 15, color: '#888' },

  errorCard: {
    flexDirection: 'row',
    backgroundColor: '#fff5f5',
    borderRadius: 14,
    padding: 16,
    gap: 12,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#ffd0d0',
  },
  errorIcon: { fontSize: 18 },
  errorText: { flex: 1, fontSize: 14, color: '#c92a2a', lineHeight: 20 },

  footer: {
    flex: 0.1,
    textAlign: 'center',
    fontSize: 12,
    color: '#ccc',
    paddingBottom: 8,
    alignSelf: 'center',
  },
  footerLink: { color: '#1a8cff' },
})
