import * as FileSystem from 'expo-file-system'
import { PinnedObject } from 'react-native-sia'
import type { SiaSdk } from '@/sia/types'
import { logger } from '@/logger'

const CHUNK_SIZE = 256 * 1024 // 256 KB

function fileReader(uri: string) {
  let offset = 0
  let total = -1

  return {
    async read(): Promise<ArrayBuffer> {
      if (total === -1) {
        const info = await FileSystem.getInfoAsync(uri, { size: true })
        total = (info as FileSystem.FileInfo & { size: number }).size ?? 0
      }
      if (offset >= total) return new ArrayBuffer(0)

      const length = Math.min(CHUNK_SIZE, total - offset)
      const b64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
        position: offset,
        length,
      })
      offset += length
      return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer as ArrayBuffer
    },
  }
}

export type UploadResult = {
  id: string
  size: number
  encodedSize: number
  createdAt: Date
}

export async function uploadFile(sdk: SiaSdk, uri: string): Promise<UploadResult> {
  logger.info('Upload', 'Starting upload', { uri })
  const object = await sdk.upload(new PinnedObject(), fileReader(uri), {})
  logger.debug('Upload', 'Upload complete — pinning object')
  await sdk.pinObject(object)
  const result = {
    id: object.id(),
    size: Number(object.size()),
    encodedSize: Number(object.encodedSize()),
    createdAt: object.createdAt(),
  }
  logger.info('Upload', 'Object pinned to Sia', { id: result.id, size: result.size, encodedSize: result.encodedSize })
  return result
}

export async function deleteFile(sdk: SiaSdk, id: string): Promise<void> {
  logger.info('Upload', 'Deleting object from Sia', { id })
  await sdk.deleteObject(id)
  logger.info('Upload', 'Object deleted', { id })
}
