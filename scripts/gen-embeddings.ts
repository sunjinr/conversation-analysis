import 'dotenv/config'
import { isEmbeddingAvailable, getEmbedding } from '../server/services/openai.js'
import { initDB } from '../server/db.js'
import db from '../server/db.js'

async function main() {
  await initDB()
  console.log('Embedding available:', isEmbeddingAvailable())

  const rows = db.prepare('SELECT id, session_id, summary_text, key_topics, embedding FROM session_summaries').all() as any[]
  const noEmb = rows.filter(r => !r.embedding)
  console.log('Total summaries:', rows.length, '| Without embedding:', noEmb.length)

  for (let i = 0; i < noEmb.length; i++) {
    const row = noEmb[i]
    if (i > 0) await new Promise(r => setTimeout(r, 1000))
    try {
      const text = (row.summary_text || '') + ' ' + (row.key_topics || '')
      const vec = await getEmbedding(text)
      db.prepare('UPDATE session_summaries SET embedding = ? WHERE id = ?').run(JSON.stringify(vec), row.id)
      console.log(`  OK [${i+1}/${noEmb.length}]:`, row.session_id?.slice(0, 16), '- dim:', vec.length)
    } catch (e: any) {
      console.error(`  FAIL [${i+1}]:`, row.session_id, e.message, '- retrying in 3s...')
      await new Promise(r => setTimeout(r, 3000))
      try {
        const text = (row.summary_text || '') + ' ' + (row.key_topics || '')
        const vec = await getEmbedding(text)
        db.prepare('UPDATE session_summaries SET embedding = ? WHERE id = ?').run(JSON.stringify(vec), row.id)
        console.log(`  RETRY OK [${i+1}/${noEmb.length}]`)
      } catch (e2: any) {
        console.error(`  RETRY FAIL [${i+1}]:`, e2.message)
      }
    }
  }
  console.log('Done!')
  process.exit(0)
}

main()
