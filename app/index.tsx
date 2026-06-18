import { useState, useRef, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SectionList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  SafeAreaView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSiaContext } from '@/context/SiaContext'
import { signOut } from '@/sia/client'
import { useTodos } from '@/hooks/useTodos'
import { getKnownDates } from '@/storage/todos'
import TodoItem from '@/components/TodoItem'
import CalendarPicker from '@/components/CalendarPicker'
import type { Todo, Priority } from '@/types/todo'
import { nextPriority, PRIORITY_COLOR } from '@/types/todo'

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + n)
  return toYMD(dt)
}

const SYNC_LABEL: Record<string, string> = {
  idle: '', syncing: '☁ Syncing…', synced: '☁ Synced', error: '⚠ Sync failed',
}
const SYNC_COLOR: Record<string, string> = {
  idle: '#aaa', syncing: '#1a8cff', synced: '#22a55a', error: '#e03131',
}

export default function TodoScreen() {
  const { state, setDisconnected } = useSiaContext()
  const router = useRouter()
  const today = toYMD(new Date())
  const [date, setDate] = useState(today)
  const [calVisible, setCalVisible] = useState(false)
  const [markedDates, setMarkedDates] = useState<Set<string>>(new Set())
  const [newText, setNewText] = useState('')
  const [newPriority, setNewPriority] = useState<Priority>('none')
  const [showCompleted, setShowCompleted] = useState(true)
  const inputRef = useRef<TextInput>(null)

  const {
    pending, completed, loading, syncStatus,
    addTodo, toggleTodo, editTodo, setPriority, deleteTodo, clearCompleted,
  } = useTodos(date)

  const isToday = date === today
  const total = pending.length + completed.length

  function handleAccountMenu() {
    Alert.alert('Account', undefined, [
      {
        text: 'View Sia Storage',
        onPress: () => router.push('/storage'),
      },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Sign out', 'Your todos stay on this device. Sign back in any time.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Sign out',
              style: 'destructive',
              onPress: async () => {
                await signOut()
                setDisconnected()
                router.replace('/connect')
              },
            },
          ]),
      },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  function openCalendar() {
    getKnownDates().then((dates) => setMarkedDates(new Set(dates)))
    setCalVisible(true)
  }

  function submitAdd() {
    const t = newText.trim()
    if (!t) return
    addTodo(t, newPriority)
    setNewText('')
    setNewPriority('none')
  }

  const sections = [
    ...(pending.length > 0 ? [{ title: 'Tasks', data: pending }] : []),
    ...(showCompleted && completed.length > 0
      ? [{ title: `Completed (${completed.length})`, data: completed }]
      : []),
  ]

  const renderItem = useCallback(({ item }: { item: Todo }) => (
    <TodoItem
      todo={item}
      onToggle={() => toggleTodo(item.id)}
      onDelete={() => deleteTodo(item.id)}
      onEdit={(text) => editTodo(item.id, text)}
      onPriority={() => setPriority(item.id, nextPriority(item.priority))}
    />
  ), [toggleTodo, deleteTodo, editTodo, setPriority])

  if (state.status === 'initializing') {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.dimText}>Connecting to Sia…</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.root}>
      {/* ── App + Date header ── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.appName}>SiTasks</Text>
          <View style={styles.headerRight}>
            {syncStatus !== 'idle' && (
              <Text style={[styles.syncBadge, { color: SYNC_COLOR[syncStatus] }]}>
                {SYNC_LABEL[syncStatus]}
              </Text>
            )}
            <TouchableOpacity onPress={handleAccountMenu} style={styles.accountBtn} hitSlop={10}>
              <Text style={styles.accountIcon}>⊙</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.dateRow}>
          <TouchableOpacity onPress={() => setDate(addDays(date, -1))} style={styles.arrowBtn}>
            <Text style={styles.arrow}>‹</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dateCenter} onPress={openCalendar} activeOpacity={0.7}>
            {isToday && <Text style={styles.todayBadge}>TODAY</Text>}
            <Text style={styles.dateText}>{formatDay(date)}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setDate(addDays(date, 1))} style={styles.arrowBtn}>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Progress bar */}
        {total > 0 && (
          <View style={styles.progressRow}>
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, { width: `${Math.round((completed.length / total) * 100)}%` as any }]} />
            </View>
            <Text style={styles.progressLabel}>{completed.length}/{total}</Text>
          </View>
        )}
      </View>

      {/* ── Task list ── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <SectionList
          style={{ flex: 1 }}
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <TouchableOpacity
                onPress={section.title.startsWith('Completed') ? () => setShowCompleted(v => !v) : undefined}
                activeOpacity={section.title.startsWith('Completed') ? 0.6 : 1}
              >
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </TouchableOpacity>
              {section.title.startsWith('Completed') && completed.length > 0 && (
                <TouchableOpacity
                  onPress={() =>
                    Alert.alert('Clear completed', 'Remove all completed tasks?', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Clear', style: 'destructive', onPress: clearCompleted },
                    ])
                  }
                >
                  <Text style={styles.clearBtn}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>✦</Text>
                <Text style={styles.emptyTitle}>No tasks yet</Text>
                <Text style={styles.emptyHint}>Add one below to get started</Text>
              </View>
            ) : null
          }
          contentContainerStyle={{ paddingBottom: 16 }}
          stickySectionHeadersEnabled={false}
        />

        {/* ── Add task bar ── */}
        <View style={styles.addBar}>
          <TouchableOpacity
            onPress={() => setNewPriority(nextPriority(newPriority))}
            hitSlop={10}
          >
            <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLOR[newPriority] }]} />
          </TouchableOpacity>
          <TextInput
            ref={inputRef}
            style={styles.addInput}
            value={newText}
            onChangeText={setNewText}
            placeholder="Add a task…"
            placeholderTextColor="#bbb"
            returnKeyType="done"
            onSubmitEditing={submitAdd}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[styles.addBtn, !newText.trim() && styles.addBtnDisabled]}
            onPress={submitAdd}
            disabled={!newText.trim()}
          >
            <Text style={styles.addBtnIcon}>+</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <CalendarPicker
        visible={calVisible}
        selected={date}
        markedDates={markedDates}
        onSelect={setDate}
        onClose={() => setCalVisible(false)}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f7f8fa' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f7f8fa' },
  dimText: { color: '#888', fontSize: 15 },

  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  appName: { fontSize: 22, fontWeight: '800', color: '#111', letterSpacing: -0.5 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  syncBadge: { fontSize: 12, fontWeight: '500' },
  accountBtn: { padding: 2 },
  accountIcon: { fontSize: 22, color: '#bbb' },

  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  arrowBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  arrow: { fontSize: 28, color: '#1a8cff', lineHeight: 34 },
  dateCenter: { flex: 1, alignItems: 'center' },
  todayBadge: { fontSize: 10, fontWeight: '800', color: '#1a8cff', letterSpacing: 1.5, marginBottom: 1 },
  dateText: { fontSize: 18, fontWeight: '700', color: '#111' },

  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  progressBg: { flex: 1, height: 5, backgroundColor: '#ebebeb', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#22a55a', borderRadius: 3 },
  progressLabel: { fontSize: 12, color: '#999', width: 36, textAlign: 'right' },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#bbb', textTransform: 'uppercase', letterSpacing: 1 },
  clearBtn: { fontSize: 12, color: '#e03131', fontWeight: '600' },

  empty: { alignItems: 'center', paddingTop: 72, gap: 8 },
  emptyIcon: { fontSize: 30, color: '#ddd', marginBottom: 4 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: '#ccc' },
  emptyHint: { fontSize: 13, color: '#ddd' },

  addBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e8e8e8',
    paddingHorizontal: 16,
    paddingVertical: 11,
    gap: 12,
  },
  priorityDot: { width: 14, height: 14, borderRadius: 7 },
  addInput: { flex: 1, fontSize: 16, color: '#111', paddingVertical: 6 },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1a8cff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDisabled: { backgroundColor: '#c8deff' },
  addBtnIcon: { color: '#fff', fontSize: 24, lineHeight: 28, fontWeight: '300' },
})
