import { NextRequest, NextResponse } from 'next/server'
import { transcribeAudioChunks } from '@/lib/services/transcription'
import { extractTextFromImage } from '@/lib/services/vision'
import { structureContent } from '@/lib/services/structuring'
import { createEntry, getEntriesByUser } from '@/lib/db/entries'

const TEMP_USER_ID = process.env.TEMP_USER_ID!

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const sourceType = formData.get('sourceType') as string

    if (sourceType !== 'audio' && sourceType !== 'image') {
      return NextResponse.json(
        { error: 'sourceType deve ser "audio" ou "image"' },
        { status: 400 }
      )
    }

    let rawText: string

    if (sourceType === 'audio') {
      const audioChunks = formData.getAll('audioChunks') as File[]

      if (audioChunks.length === 0) {
        return NextResponse.json(
          { error: 'Nenhum chunk de áudio recebido' },
          { status: 400 }
        )
      }

      rawText = await transcribeAudioChunks(audioChunks)
    } else {
      const imageFile = formData.get('image') as File | null

      if (!imageFile) {
        return NextResponse.json(
          { error: 'Nenhuma imagem recebida' },
          { status: 400 }
        )
      }

      rawText = await extractTextFromImage(imageFile)
    }

    const structured = await structureContent(rawText)

    const entry = await createEntry({
      userId: TEMP_USER_ID,
      type: structured.type,
      rawTranscript: rawText,
      summary: structured.summary,
      dueDate: structured.dueDate ?? undefined,
      sourceType: sourceType as 'audio' | 'image',
    })

    return NextResponse.json({ entry }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/entries] Erro ao processar entrada:', error)

    return NextResponse.json(
      {
        error: 'Falha ao processar a entrada',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const entries = await getEntriesByUser(TEMP_USER_ID)
    return NextResponse.json({ entries })
  } catch (error) {
    console.error('[GET /api/entries] Erro ao buscar entradas:', error)

    return NextResponse.json(
      { error: 'Falha ao buscar entradas' },
      { status: 500 }
    )
  }
}