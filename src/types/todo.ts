export type Priority = 'none' | 'low' | 'medium' | 'high'

export type Todo = {
  id: string
  text: string
  completed: boolean
  priority: Priority
  createdAt: number
  completedAt?: number
  notes?: string
}

export type DayData = {
  date: string   // YYYY-MM-DD
  todos: Todo[]
  syncedAt: number
}

export const PRIORITY_COLOR: Record<Priority, string> = {
  none: '#ccc',
  low: '#4dabf7',
  medium: '#f59f00',
  high: '#f03e3e',
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  none: 'None',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

export const PRIORITY_ORDER: Priority[] = ['none', 'low', 'medium', 'high']

export function nextPriority(p: Priority): Priority {
  const i = PRIORITY_ORDER.indexOf(p)
  return PRIORITY_ORDER[(i + 1) % PRIORITY_ORDER.length]
}
