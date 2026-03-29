// ===== Database entity types =====

export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'member'
}

export interface Session {
  id: string
  sequence_num: number
  session_id: string
  user_id: string
  ocs_session_id: string
  bot_conversation: string
  human_conversation: string
  dissatisfaction_info: string
  session_date: string
  summary_text?: string
  key_topics?: string
}

export interface Scenario {
  id: string
  name: string
  description: string
  date_from: string | null
  date_to: string | null
  matched_session_ids: string
  matched_count: number
  created_by: string
  created_at: string
}

export interface DimensionCategory {
  name: string
  description: string
}

export interface Dimension {
  id: string
  name: string
  definition: string
  categories_json: string
  auto_discover: number
  sub_skill_ref: string
  sort_order: number
  enabled: number
  created_by: string
  created_at: string
}

export interface AnalysisRun {
  id: string
  config_id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  total_sessions: number
  processed_sessions: number
  started_at: string
  completed_at: string
  summary_json: string
  triggered_by: string
  created_at: string
}

export interface AnalysisResult {
  id: string
  run_id: string
  session_id: string
  dimension_id: string
  dimension_name?: string
  original_session_id?: string
  category: string
  confidence: number
  reasoning: string
  is_auto_discovered: number
}

export interface Task {
  id: string
  run_id: string
  dimension_id: string
  dimension_name?: string
  assignee_name?: string
  title: string
  description: string
  priority: 'urgent' | 'high' | 'medium' | 'low'
  status: 'open' | 'claimed' | 'resolved' | 'ignored'
  assignee_id: string | null
  resolution_text: string
  resolved_at: string | null
  related_session_ids: string
  created_at: string
  updated_at: string
}

export interface TeamMember {
  id: string
  name: string
  role_description: string
  email: string
}

export interface DingTalkConfig {
  webhook_url: string
  secret: string
  enabled: boolean
}

export interface DashboardSummary {
  total_sessions: number
  summarized_sessions: number
  total_runs: number
  open_tasks: number
  claimed_tasks: number
  resolved_tasks: number
  dissatisfied_sessions: number
  satisfaction_rate: string
  latest_run: AnalysisRun | null
}

export interface SatisfactionPoint {
  date: string
  total: number
  dissatisfied: number
  satisfaction_rate: number
  tasks_resolved: number
  task_notes: string
}

export interface ReportDimension {
  id: string
  name: string
  definition: string
  total: number
  stats: { category: string; count: number; avg_confidence: number; percentage: string }[]
}

export interface SearchResult {
  sessionId: string
  similarity: number
  summary: string
}
