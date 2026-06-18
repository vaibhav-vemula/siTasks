import { useEffect } from 'react'
import { useRouter } from 'expo-router'
import { bootstrapSia, connectExisting } from '@/sia/client'
import { useSiaContext } from '@/context/SiaContext'
import { logger } from '@/logger'

export function useSiaInit() {
  const { state, setSdk, setDisconnected } = useSiaContext()
  const router = useRouter()

  useEffect(() => {
    let cancelled = false

    async function init() {
      logger.info('useSiaInit', 'App mounted — bootstrapping Sia')
      await bootstrapSia()
      if (cancelled) return

      const sdk = await connectExisting()
      if (cancelled) return

      if (sdk) {
        logger.info('useSiaInit', 'SDK connected — navigating to home')
        setSdk(sdk)
      } else {
        logger.info('useSiaInit', 'No session found — redirecting to connect screen')
        setDisconnected()
        router.replace('/connect')
      }
    }

    init().catch((err) => {
      logger.error('useSiaInit', 'Sia initialization failed', err)
      if (!cancelled) setDisconnected()
    })

    return () => {
      cancelled = true
    }
  }, [])

  return state
}
