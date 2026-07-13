import { z } from 'zod'

const structuredEntrySchema = z.object({
  type: z.enum(['aula', 'tarefa', 'prova']),
  subject: z.string().nullable().describe('Nome da matéria identificada, ex: Física, Química, Programação. null se não for possível identificar'),
  summary: z.string().describe('Resumo didático completo do conteúdo'),
  dueDate: z.string().nullable().describe('Data no formato YYYY-MM-DD se houver prova ou entrega mencionada, senão null'),
})

export type StructuredEntry = z.infer<typeof structuredEntrySchema>

const SYSTEM_PROMPT = `Você é um assistente que estrutura conteúdo escolar a partir de transcrições de aula ou texto extraído de fotos de caderno/lousa, com o objetivo de ajudar o aluno a estudar e revisar depois.

Analise o texto e retorne APENAS um JSON válido (sem markdown, sem explicação) no formato:
{
  "type": "aula" | "tarefa" | "prova",
  "subject": "nome da matéria" ou null se não identificável,
  "summary": "resumo didático completo",
  "dueDate": "YYYY-MM-DD" ou null
}

Regras:
- "type" é "prova" se o texto menciona avaliação/prova/teste com data. É "tarefa" se menciona exercício ou entrega pendente. Caso contrário é "aula".
- "subject" deve ser null se o texto não permitir identificar claramente a matéria escolar.
- "dueDate" só é preenchido se houver data explícita ou claramente inferível (ex: "sexta que vem"). Se não houver menção de prazo, retorne null.
- A data de hoje é ${new Date().toISOString().split('T')[0]}, use isso como referência para datas relativas.

Sobre o "summary", ele é a parte mais importante — o aluno vai usar isso pra estudar, então capriche na profundidade e clareza:
- Explique o conteúdo de forma completa e didática, como um bom professor explicaria de novo o assunto para alguém que perdeu a aula. Não seja telegráfico — desenvolva o raciocínio, contextualize por que o conteúdo importa, conecte os conceitos entre si quando fizer sentido.
- Você PODE e DEVE adicionar contexto educacional genérico e correto que ajude a entender o assunto (para que serve, onde se aplica, por que é relevante, como se relaciona com outros temas) — isso enriquece o estudo e é bem-vindo.
- O que é PROIBIDO é inventar ou presumir detalhes ESPECÍFICOS do material original que não estavam no texto — como valores exatos, componentes de uma fórmula específica, datas, nomes ou resultados que não foram mencionados. Se o texto extraído for incompleto (ex: uma fórmula parcial, uma frase cortada), explique o que está visível com profundidade, mas não invente a parte que falta como se estivesse lá.
- Regra prática: contexto geral sobre o assunto = sempre bem-vindo. Afirmação específica sobre o que está no material = só se realmente estiver lá. Na dúvida sobre um detalhe específico, omita ele, mas sinta-se livre para expandir com explicação geral do conceito.`

export async function structureContent(rawText: string): Promise<StructuredEntry> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: rawText },
      ],
      temperature: 0.4,
      max_tokens: 1024,
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Groq structuring request failed (${response.status}): ${errorBody}`)
  }

  const data = await response.json()
  const rawContent = data.choices?.[0]?.message?.content

  if (!rawContent) {
    throw new Error('Groq returned no content for structuring request')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(rawContent)
  } catch {
    throw new Error(`Failed to parse Groq response as JSON: ${rawContent}`)
  }

  const result = structuredEntrySchema.safeParse(parsed)
  if (!result.success) {
    throw new Error(`Groq response did not match expected schema: ${result.error.message}`)
  }

  return result.data
}