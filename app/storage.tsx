import { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native'
import { useRouter } from 'expo-router'
import { getKnownDates, getSiaObjectId, getSiaMeta, type SiaMeta } from '@/storage/todos'
import { downloadDayFromSia } from '@/sia/day-sync'
import { useSdk } from '@/context/SiaContext'
import type { DayData } from '@/types/todo'

type DayRow = {
  date: string
  objectId: string | null
  meta: SiaMeta | null
  fetchState: 'idle' | 'loading' | 'done' | 'error'
  fetched?: DayData | null
  errorMsg?: string
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function fmtDate(ts: number): string {
  const d = new Date(ts)
  const today = new Date()
  const isToday = d.toDateString() === today.toDateString()
  if (isToday) return `Today ${fmtTime(ts)}`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + fmtTime(ts)
}

export default function StorageScreen() {
  const router = useRouter()
  const sdk = useSdk()
  const [rows, setRows] = useState<DayRow[]>([])
  const [loading, setLoading] = useState(true)
  const [preview, setPreview] = useState<{ date: string; data: DayData } | null>(null)

  const totalSynced = rows.filter((r) => r.objectId).length
  const totalBytes = rows.reduce((sum, r) => sum + (r.meta?.size ?? 0), 0)

  useEffect(() => {
    async function load() {
      const dates = await getKnownDates()
      const built: DayRow[] = await Promise.all(
        dates.map(async (date) => ({
          date,
          objectId: await getSiaObjectId(date),
          meta: await getSiaMeta(date),
          fetchState: 'idle' as const,
        })),
      )
      setRows(built.reverse())
      setLoading(false)
    }
    load()
  }, [])

  const fetchFromSia = useCallback(async (date: string) => {
    if (!sdk) return
    const row = rows.find((r) => r.date === date)
    if (!row?.objectId) return

    setRows((prev) => prev.map((r) => r.date === date ? { ...r, fetchState: 'loading' } : r))

    const data = await downloadDayFromSia(sdk, row.objectId)
    setRows((prev) =>
      prev.map((r) =>
        r.date === date
          ? {
              ...r,
              fetchState: data ? 'done' : 'error',
              fetched: data,
              errorMsg: data ? undefined : 'Could not download from Sia',
            }
          : r,
      ),
    )
    if (data) setPreview({ date, data })
  }, [sdk, rows])

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.backBtn}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Sia Storage</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Summary bar */}
      {!loading && rows.length > 0 && (
        <View style={styles.summaryBar}>
          <StatPill label="Days synced" value={String(totalSynced)} />
          <View style={styles.divider} />
          <StatPill label="Total stored" value={totalBytes > 0 ? fmtBytes(totalBytes) : '—'} />
          <View style={styles.divider} />
          <StatPill label="Total days" value={String(rows.length)} />
        </View>
      )}

      <Text style={styles.subheading}>
        Tap <Text style={{ fontWeight: '700' }}>Fetch</Text> on any row to download it live from Sia and confirm it's really stored there.
      </Text>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#1a8cff" />
      ) : rows.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>☁</Text>
          <Text style={styles.emptyText}>No synced days yet</Text>
          <Text style={styles.emptyHint}>Add todos and wait for "☁ Synced"</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
          {rows.map((row) => (
            <DayCard
              key={row.date}
              row={row}
              canFetch={!!sdk}
              onFetch={() => fetchFromSia(row.date)}
              onPreview={() => row.fetched && setPreview({ date: row.date, data: row.fetched })}
            />
          ))}
        </ScrollView>
      )}

      <Modal visible={!!preview} transparent animationType="slide" onRequestClose={() => setPreview(null)}>
        <Pressable style={styles.overlay} onPress={() => setPreview(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>{preview?.date}</Text>
                {preview?.data && (
                  <Text style={styles.sheetSub}>{preview.data.todos.length} todos</Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setPreview(null)} hitSlop={12}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            {preview?.data && (
              <ScrollView style={styles.jsonScroll}>
                <Text style={styles.json}>{JSON.stringify(preview.data, null, 2)}</Text>
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  )
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

function DayCard({
  row, canFetch, onFetch, onPreview,
}: {
  row: DayRow
  canFetch: boolean
  onFetch: () => void
  onPreview: () => void
}) {
  const synced = !!row.objectId

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <View style={[styles.dot, { backgroundColor: synced ? '#22a55a' : '#ddd' }]} />
          <Text style={styles.cardDate}>{row.date}</Text>
        </View>

        <View style={styles.cardRight}>
          {row.fetchState === 'loading' ? (
            <ActivityIndicator size="small" color="#1a8cff" />
          ) : row.fetchState === 'done' ? (
            <TouchableOpacity onPress={onPreview} style={styles.viewBtn}>
              <Text style={styles.viewBtnText}>View JSON ›</Text>
            </TouchableOpacity>
          ) : row.fetchState === 'error' ? (
            <Text style={styles.errorLabel}>⚠ Failed</Text>
          ) : (
            <TouchableOpacity
              onPress={onFetch}
              style={[styles.fetchBtn, (!canFetch || !synced) && styles.fetchBtnDisabled]}
              disabled={!canFetch || !synced}
            >
              <Text style={styles.fetchBtnText}>Fetch</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Metadata row */}
      {row.objectId && (
        <View style={styles.metaRow}>
          <Text style={styles.objectId} numberOfLines={1}>
            {row.objectId.slice(0, 16)}…{row.objectId.slice(-8)}
          </Text>
        </View>
      )}

      {row.meta && (
        <View style={styles.sizeRow}>
          <MetaChip icon="📦" text={`${fmtBytes(row.meta.size)} raw`} />
          <MetaChip icon="🔒" text={`${fmtBytes(row.meta.encodedSize)} encoded`} />
          <MetaChip icon="🕐" text={`Synced ${fmtDate(row.meta.syncedAt)}`} />
        </View>
      )}

      {!synced && (
        <Text style={styles.noId}>Not yet synced to Sia</Text>
      )}
    </View>
  )
}

function MetaChip({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipIcon}>{icon}</Text>
      <Text style={styles.chipText}>{text}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f7f8fa' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  backBtn: { fontSize: 16, color: '#1a8cff', width: 60 },
  title: { fontSize: 17, fontWeight: '700', color: '#111' },

  summaryBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  statPill: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 18, fontWeight: '800', color: '#111' },
  statLabel: { fontSize: 11, color: '#aaa', fontWeight: '500' },
  divider: { width: StyleSheet.hairlineWidth, backgroundColor: '#eee', marginVertical: 4 },

  subheading: {
    fontSize: 13,
    color: '#888',
    paddingHorizontal: 16,
    paddingVertical: 10,
    lineHeight: 18,
  },

  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyIcon: { fontSize: 40, color: '#ddd' },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#bbb' },
  emptyHint: { fontSize: 13, color: '#ccc' },

  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    gap: 8,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  cardDate: { fontSize: 15, fontWeight: '700', color: '#111' },
  cardRight: { alignItems: 'flex-end' },

  metaRow: { paddingLeft: 20 },
  objectId: { fontSize: 11, color: '#bbb', fontFamily: 'monospace' },

  sizeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingLeft: 20 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4f6f9',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  chipIcon: { fontSize: 11 },
  chipText: { fontSize: 11, color: '#555', fontWeight: '500' },

  noId: { fontSize: 12, color: '#ccc', paddingLeft: 20 },

  fetchBtn: {
    backgroundColor: '#1a8cff',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  fetchBtnDisabled: { backgroundColor: '#dde9ff' },
  fetchBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  viewBtn: { paddingHorizontal: 4 },
  viewBtnText: { color: '#1a8cff', fontSize: 13, fontWeight: '600' },
  errorLabel: { fontSize: 12, color: '#e03131' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 32,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
  sheetSub: { fontSize: 12, color: '#aaa', marginTop: 2 },
  closeBtn: { fontSize: 18, color: '#aaa' },
  jsonScroll: { padding: 20 },
  json: { fontSize: 12, color: '#333', fontFamily: 'monospace', lineHeight: 18 },
})
