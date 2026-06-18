import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { SiaSdk } from '@/sia/types'

type SiaState =
  | { status: 'initializing' }
  | { status: 'disconnected' }
  | { status: 'connecting' }
  | { status: 'connected'; sdk: SiaSdk }

type SiaContextValue = {
  state: SiaState
  setSdk: (sdk: SiaSdk) => void
  setConnecting: () => void
  setDisconnected: () => void
}

const SiaContext = createContext<SiaContextValue | null>(null)

export function SiaProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SiaState>({ status: 'initializing' })

  const setSdk = useCallback((sdk: SiaSdk) => {
    setState({ status: 'connected', sdk })
  }, [])

  const setConnecting = useCallback(() => {
    setState({ status: 'connecting' })
  }, [])

  const setDisconnected = useCallback(() => {
    setState({ status: 'disconnected' })
  }, [])

  return (
    <SiaContext.Provider value={{ state, setSdk, setConnecting, setDisconnected }}>
      {children}
    </SiaContext.Provider>
  )
}

export function useSiaContext(): SiaContextValue {
  const ctx = useContext(SiaContext)
  if (!ctx) throw new Error('useSiaContext must be used inside SiaProvider')
  return ctx
}

export function useSdk(): SiaSdk | null {
  const { state } = useSiaContext()
  if (state.status !== 'connected') return null
  return state.sdk
}
