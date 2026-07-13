export async function transcribeAudio(audioFile: File | Blob): Promise<string> {
  const formData = new FormData()
  formData.append('file', audioFile, 'audio.webm')
  formData.append('model', 'whisper-large-v3-turbo')
  formData.append('language', 'pt')

  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Groq transcription request failed (${response.status}): ${errorBody}`)
  }

  const data = await response.json()

  if (!data.text) {
    throw new Error('Groq returned no transcription text')
  }

  return data.text
}

export async function transcribeAudioChunks(chunks: (File | Blob)[]): Promise<string> {
  const transcriptions = await Promise.all(
    chunks.map((chunk) => transcribeAudio(chunk))
  )

  return transcriptions.join(' ')
}