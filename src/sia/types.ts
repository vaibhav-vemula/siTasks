import type { Builder } from 'react-native-sia'

export type SiaSdk = Awaited<ReturnType<InstanceType<typeof Builder>['register']>>

export type MediaType = 'screenshot' | 'recording'

export type UploadRecord = {
  id: string         // Sia object content hash
  name: string       // human filename e.g. Screenshot_2026-06-10_20-25.png
  type: MediaType
  size: number       // bytes
  createdAt: number  // unix ms
  localUri?: string  // persistent local copy
}
