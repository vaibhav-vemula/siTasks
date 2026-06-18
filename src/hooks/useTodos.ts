import { useState, useEffect, useRef, useCallback } from 'react'
import { nanoid } from 'nanoid/non-secure'
import { loadDay, saveDay, getSiaObjectId, setSiaObjectId, setSiaMeta } from '@/storage/todos'
import { uploadDayToSia, deleteDayFromSia } from '@/sia/day-sync'
import { useSdk } from '@/context/SiaContext'
import { logger } from '@/logger'
import type { Todo, Priority } from '@/types/todo'

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error'

const DEBOUNCE_MS = 2500

export function useTodos(date: string) {
  const sdk = useSdk()
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const todosRef = useRef<Todo[]>(todos)
  todosRef.current = todos

  // Load from local storage on date change
  useEffect(() => {
    let active = true
    setLoading(true)
    loadDay(date).then((data) => {
      if (!active) return
      setTodos(data?.todos ?? [])
      setLoading(false)
    })
    return () => { active = false }
  }, [date])

  // Debounced Sia sync whenever todos change
  const scheduleSiaSync = useCallback((updated: Todo[]) => {
    if (!sdk) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setSyncStatus('syncing')
    debounceRef.current = setTimeout(async () => {
      try {
        const oldId = await getSiaObjectId(date)
        const result = await uploadDayToSia(sdk, date, updated)
        await setSiaObjectId(date, result.id)
        await setSiaMeta(date, {
          objectId: result.id,
          size: result.size,
          encodedSize: result.encodedSize,
          syncedAt: result.syncedAt,
        })
        if (oldId && oldId !== result.id) await deleteDayFromSia(sdk, oldId)
        setSyncStatus('synced')
      } catch (err) {
        logger.error('useTodos', 'Sia sync failed', err)
        setSyncStatus('error')
      }
    }, DEBOUNCE_MS)
  }, [sdk, date])

  function persist(updated: Todo[]) {
    setTodos(updated)
    saveDay(date, updated)
    scheduleSiaSync(updated)
  }

  const addTodo = useCallback((text: string, priority: Priority = 'none') => {
    const todo: Todo = {
      id: nanoid(),
      text: text.trim(),
      completed: false,
      priority,
      createdAt: Date.now(),
    }
    persist([...todosRef.current, todo])
  }, [date])

  const toggleTodo = useCallback((id: string) => {
    const updated = todosRef.current.map((t) =>
      t.id === id
        ? { ...t, completed: !t.completed, completedAt: !t.completed ? Date.now() : undefined }
        : t,
    )
    persist(updated)
  }, [date])

  const editTodo = useCallback((id: string, text: string) => {
    const updated = todosRef.current.map((t) =>
      t.id === id ? { ...t, text: text.trim() } : t,
    )
    persist(updated)
  }, [date])

  const setPriority = useCallback((id: string, priority: Priority) => {
    const updated = todosRef.current.map((t) =>
      t.id === id ? { ...t, priority } : t,
    )
    persist(updated)
  }, [date])

  const deleteTodo = useCallback((id: string) => {
    persist(todosRef.current.filter((t) => t.id !== id))
  }, [date])

  const clearCompleted = useCallback(() => {
    persist(todosRef.current.filter((t) => !t.completed))
  }, [date])

  const reorderTodos = useCallback((reordered: Todo[]) => {
    persist(reordered)
  }, [date])

  const pending = todos.filter((t) => !t.completed)
  const completed = todos.filter((t) => t.completed)

  return {
    todos,
    pending,
    completed,
    loading,
    syncStatus,
    addTodo,
    toggleTodo,
    editTodo,
    setPriority,
    deleteTodo,
    clearCompleted,
    reorderTodos,
  }
}
