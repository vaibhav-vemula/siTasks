import { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Pressable,
} from 'react-native'

type Props = {
  visible: boolean
  selected: string   // YYYY-MM-DD
  markedDates: Set<string>
  onSelect: (date: string) => void
  onClose: () => void
}

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function CalendarPicker({ visible, selected, markedDates, onSelect, onClose }: Props) {
  const selParts = selected.split('-').map(Number)
  const [viewYear, setViewYear] = useState(selParts[0])
  const [viewMonth, setViewMonth] = useState(selParts[1] - 1) // 0-indexed

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const today = toYMD(new Date())
  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // pad to full rows
  while (cells.length % 7 !== 0) cells.push(null)

  function dateStr(day: number) {
    return `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {/* Month navigation */}
          <View style={styles.header}>
            <TouchableOpacity onPress={prevMonth} hitSlop={12}>
              <Text style={styles.navBtn}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.monthTitle}>{MONTHS[viewMonth]} {viewYear}</Text>
            <TouchableOpacity onPress={nextMonth} hitSlop={12}>
              <Text style={styles.navBtn}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Day-of-week headers */}
          <View style={styles.grid}>
            {DAYS.map((d) => (
              <Text key={d} style={styles.dayLabel}>{d}</Text>
            ))}

            {/* Calendar cells */}
            {cells.map((day, i) => {
              if (!day) return <View key={`e-${i}`} style={styles.cell} />
              const ds = dateStr(day)
              const isSelected = ds === selected
              const isToday = ds === today
              const isMarked = markedDates.has(ds)
              return (
                <TouchableOpacity
                  key={ds}
                  style={[styles.cell, isSelected && styles.cellSelected, isToday && !isSelected && styles.cellToday]}
                  onPress={() => { onSelect(ds); onClose() }}
                >
                  <Text style={[styles.cellText, isSelected && styles.cellTextSelected, isToday && !isSelected && styles.cellTextToday]}>
                    {day}
                  </Text>
                  {isMarked && <View style={[styles.dot, isSelected && styles.dotSelected]} />}
                </TouchableOpacity>
              )
            })}
          </View>

          <TouchableOpacity style={styles.todayBtn} onPress={() => { onSelect(today); onClose() }}>
            <Text style={styles.todayBtnText}>Jump to Today</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const CELL = 40

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sheet: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navBtn: { fontSize: 28, color: '#1a8cff', lineHeight: 32, paddingHorizontal: 4 },
  monthTitle: { fontSize: 17, fontWeight: '700', color: '#111' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 0,
  },
  dayLabel: {
    width: CELL,
    textAlign: 'center',
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
    marginBottom: 4,
  },
  cell: {
    width: CELL,
    height: CELL,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: CELL / 2,
    marginBottom: 2,
  },
  cellSelected: { backgroundColor: '#1a8cff' },
  cellToday: { backgroundColor: '#e8f0fe' },
  cellText: { fontSize: 15, color: '#222' },
  cellTextSelected: { color: '#fff', fontWeight: '700' },
  cellTextToday: { color: '#1a8cff', fontWeight: '700' },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#1a8cff', marginTop: 1 },
  dotSelected: { backgroundColor: '#fff' },
  todayBtn: {
    marginTop: 14,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#f0f6ff',
    alignItems: 'center',
  },
  todayBtnText: { color: '#1a8cff', fontWeight: '600', fontSize: 15 },
})
