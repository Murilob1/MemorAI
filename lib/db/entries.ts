import { createClient } from '@/lib/supabase/server'

export type EntryType = 'aula' | 'tarefa' | 'prova'
export type SourceType = 'audio' | 'image' | 'text'
export type EntryStatus = 'pending' | 'done'

export interface Entry {
  id: string
  user_id: string
  subject_id: string | null
  type: EntryType
  raw_transcript: string | null
  summary: string | null
  due_date: string | null
  status: EntryStatus
  source_type: SourceType
  media_url: string | null
  created_at: string
}

export interface CreateEntryInput {
  userId: string
  subjectId?: string
  type: EntryType
  rawTranscript?: string
  summary?: string
  dueDate?: string
  sourceType: SourceType
  mediaUrl?: string
}

export async function createEntry(input: CreateEntryInput): Promise<Entry> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('entries')
    .insert({
      user_id: input.userId,
      subject_id: input.subjectId ?? null,
      type: input.type,
      raw_transcript: input.rawTranscript ?? null,
      summary: input.summary ?? null,
      due_date: input.dueDate ?? null,
      source_type: input.sourceType,
      media_url: input.mediaUrl ?? null,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create entry: ${error.message}`)
  }

  return data
}

export async function getEntriesByUser(userId: string): Promise<Entry[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch entries: ${error.message}`)
  }

  return data
}

export async function getUpcomingDeadlines(userId: string): Promise<Entry[]> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .eq('user_id', userId)
    .not('due_date', 'is', null)
    .gte('due_date', today)
    .order('due_date', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch upcoming deadlines: ${error.message}`)
  }

  return data
}