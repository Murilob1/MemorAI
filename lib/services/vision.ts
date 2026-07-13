function bufferToBase64(buffer: ArrayBuffer): string {
  return Buffer.from(buffer).toString('base64')
}

export async function extractTextFromImage(imageFile: File | Blob): Promise<string> {
  const arrayBuffer = await imageFile.arrayBuffer()
  const base64Image = bufferToBase64(arrayBuffer)
  const mimeType = imageFile.type || 'image/jpeg'

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Transcreva EXCLUSIVAMENTE o que está literalmente visível nesta imagem de caderno, lousa ou material escolar. Não complete, não corrija e não adicione informação que não esteja fisicamente escrita ou desenhada na imagem, mesmo que você reconheça o assunto e saiba que algo "deveria" estar lá. Preserve fórmulas, símbolos, estrutura e disposição espacial exatamente como aparecem. Se algum trecho estiver ilegível, marque como [ilegível] em vez de adivinhar. Retorne APENAS o texto extraído, sem comentários adicionais.',
            },
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${base64Image}` },
            },
          ],
        },
      ],
      temperature: 0.1,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Groq vision request failed (${response.status}): ${errorBody}`)
  }

  const data = await response.json()
  const extractedText = data.choices?.[0]?.message?.content

  if (!extractedText) {
    throw new Error('Groq returned no text for vision request')
  }

  return extractedText
}