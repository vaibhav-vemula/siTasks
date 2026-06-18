import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Todo, DayData } from '@/types/todo'

const dayKey = (date: string) => `todos:${date}`
const siaKey = (date: string) => `sia_id:${date}`
const siaMetaKey = (date: string) => `sia_meta:${date}`
const knownDatesKey = 'known_dates'

export type SiaMeta = {
  objectId: string
  size: number
  encodedSize: number
  syncedAt: number
}

export async function loadDay(date: string): Promise<DayData | null> {
  const raw = await AsyncStorage.getItem(dayKey(date))
  return raw ? (JSON.parse(raw) as DayData) : null
}

export async function saveDay(date: string, todos: Todo[]): Promise<void> {
  const data: DayData = { date, todos, syncedAt: 0 }
  await AsyncStorage.setItem(dayKey(date), JSON.stringify(data))
  await addKnownDate(date)
}

export async function getSiaObjectId(date: string): Promise<string | null> {
  return AsyncStorage.getItem(siaKey(date))
}

export async function setSiaObjectId(date: string, id: string): Promise<void> {
  await AsyncStorage.setItem(siaKey(date), id)
}

export async function clearSiaObjectId(date: string): Promise<void> {
  await AsyncStorage.removeItem(siaKey(date))
}

export async function getSiaMeta(date: string): Promise<SiaMeta | null> {
  const raw = await AsyncStorage.getItem(siaMetaKey(date))
  return raw ? (JSON.parse(raw) as SiaMeta) : null
}

export async function setSiaMeta(date: string, meta: SiaMeta): Promise<void> {
  await AsyncStorage.setItem(siaMetaKey(date), JSON.stringify(meta))
}

export async function getKnownDates(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(knownDatesKey)
  return raw ? (JSON.parse(raw) as string[]) : []
}

async function addKnownDate(date: string): Promise<void> {
  const dates = await getKnownDates()
  if (!dates.includes(date)) {
    await AsyncStorage.setItem(knownDatesKey, JSON.stringify([...dates, date].sort()))
  }
}
