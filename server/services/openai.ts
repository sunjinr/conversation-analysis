import OpenAI from 'openai'

// Chat completion client (Bailian)
const chatClient = new OpenAI({
  apiKey: process.env.LLM_API_KEY || '',
  baseURL: process.env.LLM_BASE_URL || 'https://coding.dashscope.aliyuncs.com/v1',
})
const CHAT_MODEL = process.env.LLM_CHAT_MODEL || 'qwen3-coder-plus'

// Embedding client (SiliconFlow free tier)
const embeddingKey = process.env.EMBEDDING_API_KEY || ''
const embeddingBaseURL = process.env.EMBEDDING_BASE_URL || 'https://api.siliconflow.cn/v1'
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'BAAI/bge-large-zh-v1.5'

const embeddingClient = embeddingKey
  ? new OpenAI({ apiKey: embeddingKey, baseURL: embeddingBaseURL })
  : null

export async function chatComplete(systemPrompt: string, userPrompt: string): Promise<string> {
  const res = await chatClient.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 2000,
  })
  return res.choices[0]?.message?.content || ''
}

export function isEmbeddingAvailable(): boolean {
  return !!embeddingClient
}

// BGE models use asymmetric retrieval: queries need an instruction prefix, documents don't
const BGE_QUERY_PREFIX: Record<string, string> = {
  'BAAI/bge-large-zh-v1.5': '为这个句子生成表示以用于检索中文相关句子：',
  'BAAI/bge-m3': 'Represent this sentence for searching relevant passages: ',
}

/** Embed a document (no instruction prefix) */
export async function getEmbedding(text: string): Promise<number[]> {
  if (!embeddingClient) throw new Error('Embedding API not configured')
  const res = await embeddingClient.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.slice(0, 8000),
  })
  return res.data[0].embedding
}

/** Embed a search query (with BGE instruction prefix for better retrieval) */
export async function getQueryEmbedding(text: string): Promise<number[]> {
  if (!embeddingClient) throw new Error('Embedding API not configured')
  const prefix = BGE_QUERY_PREFIX[EMBEDDING_MODEL] || ''
  const input = prefix ? `${prefix}${text}` : text
  const res = await embeddingClient.embeddings.create({
    model: EMBEDDING_MODEL,
    input: input.slice(0, 8000),
  })
  return res.data[0].embedding
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}
