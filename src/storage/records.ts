import AsyncStorage from '@react-native-async-storage/async-storage'
import type { UploadRecord } from '@/sia/types'

const KEY = 'upload_records'

export async function getRecords(): Promise<UploadRecord[]> {
  const raw = await AsyncStorage.getItem(KEY)
  return raw ? (JSON.parse(raw) as UploadRecord[]) : []
}

export async function addRecord(record: UploadRecord): Promise<void> {
  const existing = await getRecords()
  await AsyncStorage.setItem(KEY, JSON.stringify([record, ...existing]))
}

export async function removeRecord(id: string): Promise<void> {
  const existing = await getRecords()
  await AsyncStorage.setItem(KEY, JSON.stringify(existing.filter((r) => r.id !== id)))
}

export async function clearRecords(): Promise<void> {
  await AsyncStorage.removeItem(KEY)
}
