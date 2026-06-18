import { initSia, Builder, AppKey, generateRecoveryPhrase } from 'react-native-sia'
import * as SecureStore from 'expo-secure-store'
import { Linking } from 'react-native'
import { logger } from '@/logger'

export const INDEXER_URL = 'https://sia.storage'

const APP_KEY_STORE_KEY = 'sia_app_key'
const PHRASE_STORE_KEY = 'sia_recovery_phrase'

// Stable 32-byte app ID — not secret, must not change between installs
const APP_ID = new Uint8Array(32).fill(0x53).buffer as ArrayBuffer // 0x53 = 'S'

const APP_META = {
  id: APP_ID,
  name: 'SiTasks',
  description: 'Decentralized todo app powered by Sia storage',
  serviceUrl: 'https://myapp.com',
  callbackUrl: 'screenvault://callback',
}

export async function bootstrapSia() {
  logger.info('Sia', 'Initializing Sia SDK')
  await initSia()
  logger.info('Sia', 'Sia SDK initialized')
}

export function makeBuilder() {
  logger.debug('Sia', 'Creating Builder', { indexer: INDEXER_URL })
  return new Builder(INDEXER_URL, APP_META)
}

export async function loadAppKey(): Promise<AppKey | null> {
  const stored = await SecureStore.getItemAsync(APP_KEY_STORE_KEY)
  if (!stored) {
    logger.debug('Sia', 'No saved AppKey found')
    return null
  }
  logger.debug('Sia', 'Loaded AppKey from Keychain')
  const bytes = Uint8Array.from(JSON.parse(stored) as number[])
  return new AppKey(bytes.buffer as ArrayBuffer)
}

export async function persistAppKey(key: AppKey) {
  const bytes = Array.from(new Uint8Array(key.export_()))
  await SecureStore.setItemAsync(APP_KEY_STORE_KEY, JSON.stringify(bytes))
  logger.info('Sia', 'AppKey saved to Keychain')
}

export async function removeAppKey() {
  await SecureStore.deleteItemAsync(APP_KEY_STORE_KEY)
  await SecureStore.deleteItemAsync(PHRASE_STORE_KEY)
  logger.info('Sia', 'AppKey and phrase removed from Keychain')
}

export async function signOut() {
  await removeAppKey()
  logger.info('Sia', 'Signed out — credentials cleared')
}

export async function persistPhrase(phrase: string) {
  await SecureStore.setItemAsync(PHRASE_STORE_KEY, phrase)
  logger.debug('Sia', 'Recovery phrase saved to Keychain')
}

export async function loadPhrase(): Promise<string | null> {
  return SecureStore.getItemAsync(PHRASE_STORE_KEY)
}

export async function connectExisting() {
  const appKey = await loadAppKey()
  if (!appKey) {
    logger.info('Sia', 'No existing session — approval flow required')
    return null
  }
  logger.info('Sia', 'Reconnecting with saved AppKey')
  const builder = makeBuilder()
  const sdk = await builder.connected(appKey)
  if (sdk) {
    logger.info('Sia', 'Reconnected to indexer successfully')
  } else {
    logger.warn('Sia', 'AppKey rejected by indexer — re-auth required')
  }
  return sdk
}

export async function startApprovalFlow(): Promise<{
  url: string
  builder: InstanceType<typeof Builder>
}> {
  logger.info('Sia:Auth', 'Starting approval flow')
  const builder = makeBuilder()
  await builder.requestConnection()
  const url = builder.responseUrl()
  logger.info('Sia:Auth', 'Opening approval URL in browser', { url })
  await Linking.openURL(url)
  return { url, builder }
}

export async function finishApprovalFlow(builder: InstanceType<typeof Builder>) {
  logger.info('Sia:Auth', 'Waiting for user approval')
  await builder.waitForApproval()
  logger.info('Sia:Auth', 'Approval received — registering')
  const phrase = generateRecoveryPhrase()
  const sdk = await builder.register(phrase)
  await persistAppKey(sdk.appKey())
  await persistPhrase(phrase)
  logger.info('Sia:Auth', 'Registration complete — SDK ready')
  return sdk
}
