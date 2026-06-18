import { useRef, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native'
import { Swipeable } from 'react-native-gesture-handler'
import type { Todo } from '@/types/todo'
import { PRIORITY_COLOR, nextPriority } from '@/types/todo'

type Props = {
  todo: Todo
  onToggle: () => void
  onDelete: () => void
  onEdit: (text: string) => void
  onPriority: () => void
}

export default function TodoItem({ todo, onToggle, onDelete, onEdit, onPriority }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(todo.text)
  const swipeRef = useRef<Swipeable>(null)

  function commitEdit() {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== todo.text) onEdit(trimmed)
    else setDraft(todo.text)
    setEditing(false)
  }

  function renderRightActions(progress: Animated.AnimatedInterpolation<number>) {
    const trans = progress.interpolate({ inputRange: [0, 1], outputRange: [80, 0] })
    return (
      <Animated.View style={[styles.deleteAction, { transform: [{ translateX: trans }] }]}>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => {
            swipeRef.current?.close()
            onDelete()
          }}
        >
          <Text style={styles.deleteBtnText}>Delete</Text>
        </TouchableOpacity>
      </Animated.View>
    )
  }

  return (
    <Swipeable ref={swipeRef} renderRightActions={renderRightActions} overshootRight={false}>
      <View style={[styles.row, todo.completed && styles.rowDone]}>
        {/* Checkbox */}
        <TouchableOpacity style={styles.checkWrap} onPress={onToggle} hitSlop={8}>
          <View style={[styles.check, todo.completed && styles.checkDone]}>
            {todo.completed && <Text style={styles.checkMark}>✓</Text>}
          </View>
        </TouchableOpacity>

        {/* Text / Edit input */}
        {editing ? (
          <TextInput
            style={styles.editInput}
            value={draft}
            onChangeText={setDraft}
            onBlur={commitEdit}
            onSubmitEditing={commitEdit}
            autoFocus
            returnKeyType="done"
          />
        ) : (
          <TouchableOpacity style={styles.textWrap} onPress={() => setEditing(true)} activeOpacity={0.7}>
            <Text style={[styles.text, todo.completed && styles.textDone]} numberOfLines={2}>
              {todo.text}
            </Text>
            {todo.notes ? (
              <Text style={styles.notes} numberOfLines={1}>{todo.notes}</Text>
            ) : null}
          </TouchableOpacity>
        )}

        {/* Priority dot */}
        <TouchableOpacity onPress={onPriority} hitSlop={8} style={styles.priorityBtn}>
          <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLOR[todo.priority] }]} />
        </TouchableOpacity>
      </View>
    </Swipeable>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
    gap: 12,
  },
  rowDone: { backgroundColor: '#fafafa' },
  checkWrap: { justifyContent: 'center', alignItems: 'center' },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#bbb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDone: { backgroundColor: '#22a55a', borderColor: '#22a55a' },
  checkMark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  textWrap: { flex: 1 },
  text: { fontSize: 16, color: '#1a1a1a', lineHeight: 22 },
  textDone: { color: '#aaa', textDecorationLine: 'line-through' },
  notes: { fontSize: 12, color: '#999', marginTop: 2 },
  editInput: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
    paddingVertical: 0,
    borderBottomWidth: 1.5,
    borderBottomColor: '#1a8cff',
  },
  priorityBtn: { padding: 4 },
  priorityDot: { width: 10, height: 10, borderRadius: 5 },
  deleteAction: { justifyContent: 'center', backgroundColor: '#e03131' },
  deleteBtn: {
    width: 80,
    height: '100%' as any,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
})
