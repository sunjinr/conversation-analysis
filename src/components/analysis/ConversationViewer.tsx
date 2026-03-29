interface Props { text: string }

interface Message {
  time: string
  role: string
  content: string
}

function parseConversation(text: string): Message[] {
  if (!text) return []
  const msgs: Message[] = []
  const regex = /\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\] (会员|机器人|客服): ([\s\S]*?)(?=\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\]|$)/g
  let match
  while ((match = regex.exec(text)) !== null) {
    const content = match[3].trim()
    if (content.startsWith('命令消息：') || (content.startsWith('{"') && content.includes('"functionCode"'))) continue
    msgs.push({ time: match[1], role: match[2], content })
  }
  return msgs
}

const roleConfig: Record<string, { bg: string; text: string; align: string; label: string }> = {
  '会员': { bg: 'bg-brand/10', text: 'text-brand', align: 'justify-end', label: '买家' },
  '机器人': { bg: 'bg-gray-100', text: 'text-gray-700', align: 'justify-start', label: 'AI' },
  '客服': { bg: 'bg-green-50', text: 'text-green-800', align: 'justify-start', label: '人工' },
}

export default function ConversationViewer({ text }: Props) {
  const msgs = parseConversation(text)
  if (msgs.length === 0) return <p className="text-gray-400 text-sm">无对话内容</p>

  return (
    <div className="space-y-2 max-h-[500px] overflow-auto pr-2">
      {msgs.map((m, i) => {
        const cfg = roleConfig[m.role] || roleConfig['会员']
        const isUser = m.role === '会员'
        return (
          <div key={i} className={`flex ${cfg.align}`}>
            <div className={`max-w-[80%] ${cfg.bg} rounded-xl px-3 py-2`}>
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-xs font-medium ${cfg.text}`}>{cfg.label}</span>
                <span className="text-xs text-gray-400">{m.time.slice(11)}</span>
              </div>
              <p className={`text-sm ${cfg.text} whitespace-pre-wrap break-words`}>
                {m.content.length > 500 ? m.content.slice(0, 500) + '...' : m.content}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
