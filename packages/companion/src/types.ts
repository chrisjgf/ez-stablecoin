import type { Status } from '@/api'

export interface LogEntry {
  id: number
  input: string
  status: 'pending' | 'completed'
  logs: string[]
}

export interface LogMessage {
  id: number
  text: string
  status: 'pending' | 'completed'
  stepKey: keyof Omit<Status, 'address'>
}
