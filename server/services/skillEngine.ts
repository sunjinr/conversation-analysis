/**
 * Skill 分析服务 - Agent 执行器
 *
 * 架构：
 * 1. 接收用户自然语言问题
 * 2. 调用 Python run_full_analysis() — Python 内部完成：
 *    - LLM 意图解析（提取主题、关键词、自定义维度）
 *    - 关键词粗筛（Python）
 *    - LLM 语义精筛（调用 DashScope API）
 *    - LLM 逐条分类（调用 DashScope API）
 *    - LLM 动态回答用户问题
 *    - 生成 Excel 报告
 * 3. 返回报告路径和摘要
 *
 * 所有智能逻辑在 Python 中，TypeScript 只负责调度和结果包装。
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'

const execAsync = promisify(exec)

const SKILL_PATH = process.env.SKILL_PATH || '/app/skisight_analysis'
const OUTPUT_DIR = process.env.NODE_ENV === 'production' ? '/tmp/data/reports' : path.join(process.cwd(), 'data', 'reports')

export interface SkillAnalysisRequest {
  userQuestion: string
  /** 可选：如果前端已提取了关键词/维度，可以直接传入跳过 LLM 意图解析 */
  topicKeywords?: string[]
  topicLabel?: string
  customDimensions?: Record<string, { definition: string; suggestion: string }>
  dateFrom?: string
  dateTo?: string
}

export interface SkillAnalysisResponse {
  success: boolean
  reportPath: string
  reportUrl: string
  summary: {
    topicLabel: string
    totalSessions: number
    keywordFiltered: number
    llmRefined: number
    analyzed: number
    topDimensions: Array<{ name: string; count: number; percentage: string }>
    keyFindings: string[]
    questionAnswers: Array<{ question: string; answer: string }>
    overview?: string
  }
}

/**
 * 执行 Skill 分析
 *
 * 直接调用 Python 的 run_full_analysis()，所有分析步骤（包括 LLM 调用）
 * 都在 Python 进程内完成。
 */
export async function runSkillAnalysis(request: SkillAnalysisRequest): Promise<SkillAnalysisResponse> {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const sanitizedTopic = (request.topicLabel || 'analysis').replace(/[\/\\]/g, '_')
  const outputPath = path.join(OUTPUT_DIR, `${sanitizedTopic}_${timestamp}.xlsx`)

  // 构建 Python 调用脚本和配置文件
  const { scriptPath, configPath } = buildPythonScript(request, outputPath)

  try {
    const { stdout, stderr } = await execAsync(`python3 "${scriptPath}"`, {
      cwd: SKILL_PATH,
      timeout: 600000, // 10 分钟超时
    })

    if (stderr) {
      console.error('[Skill] stderr:', stderr)
    }

    console.log('[Skill] stdout:', stdout)

    if (!fs.existsSync(outputPath)) {
      throw new Error('报告文件未生成')
    }

    // 解析 Python 输出的结构化结果
    const summary = parsePythonOutput(stdout, request.topicLabel || '客服对话')

    // 清理临时文件
    try { fs.unlinkSync(scriptPath) } catch {}
    try { fs.unlinkSync(configPath) } catch {}

    return {
      success: true,
      reportPath: outputPath,
      reportUrl: `/api/skill/reports/${path.basename(outputPath)}`,
      summary,
    }
  } catch (error: any) {
    // 清理临时文件
    try { fs.unlinkSync(scriptPath) } catch {}
    try { fs.unlinkSync(configPath) } catch {}
    throw error
  }
}

/**
 * 构建 Python 调用脚本
 *
 * 这个脚本只做一件事：导入 skisight_analysis 模块，调用 run_full_analysis()。
 * 所有真正的分析工作（LLM 意图解析、精筛、分类、回答）都在 Python 内部完成。
 */
function buildPythonScript(request: SkillAnalysisRequest, outputPath: string): { scriptPath: string; configPath: string } {
  const { userQuestion, topicKeywords, topicLabel, customDimensions, dateFrom, dateTo } = request

  const keywordsArg = topicKeywords ? JSON.stringify(topicKeywords) : 'None'
  const labelArg = topicLabel ? `'${topicLabel}'` : 'None'
  const dimensionsArg = customDimensions ? JSON.stringify(customDimensions) : 'None'

  // 将用户问题写入临时 JSON 文件，避免字符串转义问题
  const configPath = path.join(OUTPUT_DIR, `config_${Date.now()}.json`)
  fs.writeFileSync(configPath, JSON.stringify({
    user_question: userQuestion,
    output_path: outputPath,
    date_from: dateFrom || null,
    date_to: dateTo || null,
  }), 'utf-8')

  const scriptPath = path.join(OUTPUT_DIR, `temp_${Date.now()}.py`)
  const pythonScript = `#!/usr/bin/env python3
import sys
import json
sys.path.insert(0, '${SKILL_PATH}')
from skisight_analysis import run_full_analysis

# 读取配置文件
with open('${configPath}', 'r', encoding='utf-8') as f:
    config = json.load(f)

# 调用完整的分析流程
result = run_full_analysis(
    user_question=config['user_question'],
    topic_keywords=${keywordsArg},
    topic_label=${labelArg},
    custom_dimensions=${dimensionsArg},
    output_path=config['output_path'],
    date_from=config.get('date_from'),
    date_to=config.get('date_to'),
)

print(f"DONE: {result}")
`
  fs.writeFileSync(scriptPath, pythonScript, 'utf-8')

  return { scriptPath, configPath }
}

/**
 * 解析 Python 输出的结构化结果
 *
 * 从 stdout 中提取关键指标。Python 会打印详细的进度日志，
 * 我们从中提取出数字和关键信息。
 */
function parsePythonOutput(stdout: string, fallbackTopic: string): SkillAnalysisResponse['summary'] {
  const lines = stdout.split('\n')

  let loaded = 0
  let keywordFiltered = 0
  let llmRefined = 0
  let analyzed = 0
  let topicLabel = fallbackTopic
  let overviewLines: string[] = []

  // 提取 Python 打印的关键指标
  for (const line of lines) {
    if (line.includes('加载') && line.includes('条会话')) {
      const match = line.match(/(\d+)\s*条/)
      if (match) loaded = parseInt(match[1])
    }
    if (line.includes('关键词匹配') && line.includes('条会话')) {
      const match = line.match(/(\d+)\s*条/)
      if (match) keywordFiltered = parseInt(match[1])
    }
    if (line.includes('精筛完成')) {
      // 匹配两种格式: "精筛完成: 12/15 条" 或 "✓ 精筛完成: 12 条相关会话"
      const match = line.match(/(\d+)(?:\/(\d+))?\s*条/)
      if (match) llmRefined = parseInt(match[1])
    }
    if (line.includes('分类完成')) {
      // 匹配两种格式: "分类完成: 12/15 条" 或 "✓ 分类完成: 12 条会话"
      const match = line.match(/(\d+)(?:\/(\d+))?\s*条/)
      if (match) analyzed = parseInt(match[1])
    }
    if (line.includes('主题:')) {
      const match = line.match(/主题:\s*(.+)/)
      if (match) topicLabel = match[1].trim()
    }
    // 捕获概述行
    if (line.includes('OVERVIEW:')) {
      overviewLines.push(line.replace('OVERVIEW:', '').trim())
    }
  }

  return {
    topicLabel,
    totalSessions: loaded,
    keywordFiltered,
    llmRefined,
    analyzed,
    topDimensions: [],
    keyFindings: [],
    questionAnswers: [],
    overview: overviewLines.join('\n') || undefined,
  }
}
