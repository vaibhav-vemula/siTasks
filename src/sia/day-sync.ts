import { PinnedObject } from 'react-native-sia'
import { logger } from '@/logger'
import type { SiaSdk } from '@/sia/types'
import type { DayData, Todo } from '@/types/todo'

const UPLOAD_TIMEOUT_MS = 30_000

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms),
    ),
  ])
}

export type UploadResult = {
  id: string
  size: number
  encodedSize: number
  syncedAt: number
}

function jsonReader(data: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(data))
  let sent = false
  return {
    async read(): Promise<ArrayBuffer> {
      if (sent) return new ArrayBuffer(0)
      sent = true
      return bytes.buffer as ArrayBuffer
    },
  }
}

export async function uploadDayToSia(
  sdk: SiaSdk,
  date: string,
  todos: Todo[],
): Promise<UploadResult> {
  const syncedAt = Date.now()
  const payload: DayData = { date, todos, syncedAt }
  logger.info('DaySync', 'Uploading day to Sia', { date, count: todos.length })
  const object = await withTimeout(
    sdk.upload(new PinnedObject(), jsonReader(payload), {}),
    UPLOAD_TIMEOUT_MS,
    'upload',
  )
  await withTimeout(sdk.pinObject(object), UPLOAD_TIMEOUT_MS, 'pin')
  const result: UploadResult = {
    id: object.id(),
    size: Number(object.size()),
    encodedSize: Number(object.encodedSize()),
    syncedAt,
  }
  logger.info('DaySync', 'Day uploaded', { date, id: result.id, size: result.size })
  return result
}

export async function downloadDayFromSia(
  sdk: SiaSdk,
  objectId: string,
): Promise<DayData | null> {
  try {
    logger.info('DaySync', 'Downloading day from Sia', { objectId })
    const pinned = await sdk.object(objectId)
    const download = sdk.download(pinned, {})
    const chunks: ArrayBuffer[] = []
    while (true) {
      const chunk = await download.read()
      if (chunk.byteLength === 0) break
      chunks.push(chunk)
    }
    const total = chunks.reduce((n, c) => n + c.byteLength, 0)
    const buf = new Uint8Array(total)
    let off = 0
    for (const chunk of chunks) {
      buf.set(new Uint8Array(chunk), off)
      off += chunk.byteLength
    }
    const data = JSON.parse(new TextDecoder().decode(buf)) as DayData
    logger.info('DaySync', 'Day downloaded', { date: data.date, count: data.todos.length })
    return data
  } catch (err) {
    logger.error('DaySync', 'Download failed', err)
    return null
  }
}

export async function deleteDayFromSia(sdk: SiaSdk, objectId: string): Promise<void> {
  try {
    await sdk.deleteObject(objectId)
    logger.info('DaySync', 'Old day object deleted', { objectId })
  } catch (err) {
    logger.warn('DaySync', 'Could not delete old day object', err)
  }
}
