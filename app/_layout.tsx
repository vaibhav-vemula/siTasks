import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SiaProvider } from '@/context/SiaContext'
import { useSiaInit } from '@/hooks/useSia'

function SiaInitializer() {
  useSiaInit()
  return null
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SiaProvider>
        <SiaInitializer />
        <StatusBar style="auto" />
        <Stack>
          <Stack.Screen
            name="index"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="connect"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="storage"
            options={{
              headerShown: false,
            }}
          />
        </Stack>
      </SiaProvider>
    </GestureHandlerRootView>
  )
}
