'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface Entry {
  id: string
  type: 'aula' | 'tarefa' | 'prova'
  summary: string
  due_date: string | null
  status: 'pending' | 'done'
  source_type: 'audio' | 'image' | 'text'
  created_at: string
}

export default function Home() {
  const [isRecording, setIsRecording] = useState(false)
  const [status, setStatus] = useState<string>('')
  const [entries, setEntries] = useState<Entry[]>([])
  const [loadingEntries, setLoadingEntries] = useState(true)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const fetchEntries = useCallback(async () => {
    setLoadingEntries(true)
    try {
      const response = await fetch('/api/entries')
      const data = await response.json()
      setEntries(data.entries ?? [])
    } catch (error) {
      console.error('Erro ao buscar entries:', error)
    } finally {
      setLoadingEntries(false)
    }
  }, [])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  async function startRecording() {
    setStatus('Solicitando acesso ao microfone...')

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })

    chunksRef.current = []

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data)
      }
    }

    mediaRecorder.start()
    mediaRecorderRef.current = mediaRecorder
    setIsRecording(true)
    setStatus('Gravando...')
  }

  async function stopRecording() {
    const mediaRecorder = mediaRecorderRef.current
    if (!mediaRecorder) return

    setStatus('Processando áudio...')

    await new Promise<void>((resolve) => {
      mediaRecorder.onstop = () => resolve()
      mediaRecorder.stop()
    })

    setIsRecording(false)

    const formData = new FormData()
    formData.append('sourceType', 'audio')
    chunksRef.current.forEach((chunk, index) => {
      formData.append('audioChunks', chunk, `chunk-${index}.webm`)
    })

    await submitEntry(formData)
  }

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setStatus('Processando imagem...')

    const formData = new FormData()
    formData.append('sourceType', 'image')
    formData.append('image', file)

    await submitEntry(formData)

    event.target.value = ''
  }

  async function submitEntry(formData: FormData) {
    try {
      const response = await fetch('/api/entries', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        setStatus(`Erro: ${data.error}`)
        console.error(data)
        return
      }

      setStatus('Concluído!')
      await fetchEntries()
    } catch (error) {
      setStatus('Erro ao enviar')
      console.error(error)
    }
  }

  const typeLabels: Record<Entry['type'], string> = {
    aula: 'Aula',
    tarefa: 'Tarefa',
    prova: 'Prova',
  }

  const typeColors: Record<Entry['type'], string> = {
    aula: '#4a90d9',
    tarefa: '#e0a020',
    prova: '#d94a4a',
  }

  return (
    <main style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 700, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24 }}>MemorAI</h1>

      <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
        <button
          onClick={isRecording ? stopRecording : startRecording}
          style={{
            padding: '14px 20px',
            fontSize: 16,
            flex: 1,
            background: isRecording ? '#d94a4a' : '#1a1a1a',
            color: 'white',
            border: 'none',
            borderRadius: 8,
          }}
        >
          {isRecording ? 'Parar Gravação' : 'Gravar Áudio'}
        </button>

        <label
          style={{
            padding: '14px 20px',
            fontSize: 16,
            flex: 1,
            border: '1px solid #ccc',
            borderRadius: 8,
            textAlign: 'center',
            cursor: 'pointer',
          }}
        >
          Enviar Foto
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageUpload}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      {status && <p style={{ marginTop: 16, color: '#666' }}>{status}</p>}

      <hr style={{ margin: '32px 0', border: 'none', borderTop: '1px solid #eee' }} />

      <h2 style={{ fontSize: 18, marginBottom: 16 }}>Histórico</h2>

      {loadingEntries && <p style={{ color: '#666' }}>Carregando...</p>}

      {!loadingEntries && entries.length === 0 && (
        <p style={{ color: '#666' }}>Nenhuma entrada ainda. Grave uma aula ou envie uma foto pra começar.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {entries.map((entry) => (
          <div
            key={entry.id}
            style={{
              border: '1px solid #eee',
              borderRadius: 8,
              padding: 16,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'white',
                  background: typeColors[entry.type],
                  padding: '2px 10px',
                  borderRadius: 999,
                }}
              >
                {typeLabels[entry.type]}
              </span>
              <span style={{ fontSize: 12, color: '#999' }}>
                {new Date(entry.created_at).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5 }}>{entry.summary}</p>

            {entry.due_date && (
              <p style={{ marginTop: 8, fontSize: 13, color: '#d94a4a', fontWeight: 600 }}>
                Prazo: {new Date(entry.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}
              </p>
            )}
          </div>
        ))}
      </div>
    </main>
  )
}