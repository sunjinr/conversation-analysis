import db from './db.js'

/**
 * Production mock data seed.
 * Seeds display data for the public deployment without including
 * the full session conversation raw data.
 */

export const satisfactionSeedData = [
  { date: "2026-02-01", total: 561, dissatisfied: 253, satisfaction_rate: 54.9, tasks_resolved: 0, task_notes: "" },
  { date: "2026-02-02", total: 702, dissatisfied: 336, satisfaction_rate: 52.1, tasks_resolved: 0, task_notes: "" },
  { date: "2026-02-03", total: 743, dissatisfied: 348, satisfaction_rate: 53.2, tasks_resolved: 0, task_notes: "" },
  { date: "2026-02-04", total: 703, dissatisfied: 369, satisfaction_rate: 47.5, tasks_resolved: 0, task_notes: "" },
  { date: "2026-02-05", total: 729, dissatisfied: 381, satisfaction_rate: 47.7, tasks_resolved: 0, task_notes: "" },
  { date: "2026-02-06", total: 665, dissatisfied: 353, satisfaction_rate: 46.9, tasks_resolved: 0, task_notes: "" },
  { date: "2026-02-07", total: 628, dissatisfied: 288, satisfaction_rate: 54.1, tasks_resolved: 0, task_notes: "" },
  { date: "2026-02-08", total: 581, dissatisfied: 282, satisfaction_rate: 51.5, tasks_resolved: 0, task_notes: "" },
  { date: "2026-02-09", total: 653, dissatisfied: 305, satisfaction_rate: 53.3, tasks_resolved: 0, task_notes: "" },
  { date: "2026-02-10", total: 693, dissatisfied: 345, satisfaction_rate: 50.2, tasks_resolved: 0, task_notes: "" },
  { date: "2026-02-11", total: 655, dissatisfied: 322, satisfaction_rate: 50.8, tasks_resolved: 0, task_notes: "" },
  { date: "2026-02-12", total: 673, dissatisfied: 338, satisfaction_rate: 49.8, tasks_resolved: 0, task_notes: "" },
  { date: "2026-02-13", total: 702, dissatisfied: 350, satisfaction_rate: 50.1, tasks_resolved: 0, task_notes: "" },
  { date: "2026-02-14", total: 649, dissatisfied: 283, satisfaction_rate: 56.4, tasks_resolved: 2, task_notes: "优化退款流程AI话术，修复订单查询超时问题" },
  { date: "2026-02-15", total: 618, dissatisfied: 274, satisfaction_rate: 55.7, tasks_resolved: 0, task_notes: "" },
  { date: "2026-02-16", total: 601, dissatisfied: 262, satisfaction_rate: 56.4, tasks_resolved: 0, task_notes: "" },
  { date: "2026-02-17", total: 608, dissatisfied: 268, satisfaction_rate: 55.9, tasks_resolved: 0, task_notes: "" },
  { date: "2026-02-18", total: 665, dissatisfied: 305, satisfaction_rate: 54.1, tasks_resolved: 0, task_notes: "" },
  { date: "2026-02-19", total: 648, dissatisfied: 295, satisfaction_rate: 54.5, tasks_resolved: 0, task_notes: "" },
  { date: "2026-02-20", total: 687, dissatisfied: 302, satisfaction_rate: 56.0, tasks_resolved: 0, task_notes: "" },
  { date: "2026-02-21", total: 639, dissatisfied: 287, satisfaction_rate: 55.1, tasks_resolved: 0, task_notes: "" },
  { date: "2026-02-22", total: 604, dissatisfied: 249, satisfaction_rate: 58.8, tasks_resolved: 1, task_notes: "更新物流追踪自动回复模板" },
  { date: "2026-02-23", total: 630, dissatisfied: 291, satisfaction_rate: 53.8, tasks_resolved: 0, task_notes: "" },
  { date: "2026-02-24", total: 726, dissatisfied: 371, satisfaction_rate: 48.9, tasks_resolved: 0, task_notes: "" },
  { date: "2026-02-25", total: 801, dissatisfied: 390, satisfaction_rate: 51.3, tasks_resolved: 0, task_notes: "" },
  { date: "2026-02-26", total: 794, dissatisfied: 403, satisfaction_rate: 49.2, tasks_resolved: 0, task_notes: "" },
  { date: "2026-02-27", total: 716, dissatisfied: 353, satisfaction_rate: 50.7, tasks_resolved: 0, task_notes: "" },
  { date: "2026-02-28", total: 686, dissatisfied: 319, satisfaction_rate: 53.5, tasks_resolved: 0, task_notes: "" },
  { date: "2026-03-01", total: 566, dissatisfied: 224, satisfaction_rate: 60.4, tasks_resolved: 3, task_notes: "修复AI无法识别纠纷类型问题，增加退货场景覆盖，优化首次响应速度" },
  { date: "2026-03-02", total: 673, dissatisfied: 326, satisfaction_rate: 51.6, tasks_resolved: 0, task_notes: "" },
  { date: "2026-03-03", total: 736, dissatisfied: 359, satisfaction_rate: 51.2, tasks_resolved: 0, task_notes: "" },
  { date: "2026-03-04", total: 754, dissatisfied: 392, satisfaction_rate: 48.0, tasks_resolved: 0, task_notes: "" },
  { date: "2026-03-05", total: 794, dissatisfied: 396, satisfaction_rate: 50.1, tasks_resolved: 0, task_notes: "" },
  { date: "2026-03-06", total: 799, dissatisfied: 381, satisfaction_rate: 52.3, tasks_resolved: 0, task_notes: "" },
  { date: "2026-03-07", total: 757, dissatisfied: 347, satisfaction_rate: 54.2, tasks_resolved: 0, task_notes: "" },
  { date: "2026-03-08", total: 607, dissatisfied: 258, satisfaction_rate: 57.5, tasks_resolved: 1, task_notes: "增加VAT/税务场景FAQ知识库" },
  { date: "2026-03-09", total: 773, dissatisfied: 385, satisfaction_rate: 50.2, tasks_resolved: 0, task_notes: "" },
  { date: "2026-03-10", total: 923, dissatisfied: 486, satisfaction_rate: 47.3, tasks_resolved: 0, task_notes: "" },
  { date: "2026-03-11", total: 933, dissatisfied: 468, satisfaction_rate: 49.8, tasks_resolved: 0, task_notes: "" },
  { date: "2026-03-12", total: 913, dissatisfied: 440, satisfaction_rate: 51.8, tasks_resolved: 0, task_notes: "" },
  { date: "2026-03-13", total: 815, dissatisfied: 353, satisfaction_rate: 56.7, tasks_resolved: 2, task_notes: "改进AI回答结构化展示，修复不满意反馈收集问题" },
  { date: "2026-03-14", total: 805, dissatisfied: 348, satisfaction_rate: 56.8, tasks_resolved: 0, task_notes: "" },
  { date: "2026-03-15", total: 687, dissatisfied: 292, satisfaction_rate: 57.5, tasks_resolved: 0, task_notes: "" },
  { date: "2026-03-16", total: 856, dissatisfied: 418, satisfaction_rate: 51.2, tasks_resolved: 0, task_notes: "" },
  { date: "2026-03-17", total: 866, dissatisfied: 438, satisfaction_rate: 49.4, tasks_resolved: 0, task_notes: "" },
  { date: "2026-03-18", total: 864, dissatisfied: 407, satisfaction_rate: 52.9, tasks_resolved: 0, task_notes: "" },
  { date: "2026-03-19", total: 845, dissatisfied: 428, satisfaction_rate: 49.4, tasks_resolved: 0, task_notes: "" },
  { date: "2026-03-20", total: 810, dissatisfied: 359, satisfaction_rate: 55.7, tasks_resolved: 0, task_notes: "" },
  { date: "2026-03-21", total: 745, dissatisfied: 354, satisfaction_rate: 52.5, tasks_resolved: 0, task_notes: "" },
  { date: "2026-03-22", total: 690, dissatisfied: 311, satisfaction_rate: 54.9, tasks_resolved: 0, task_notes: "" },
  { date: "2026-03-23", total: 858, dissatisfied: 421, satisfaction_rate: 50.9, tasks_resolved: 0, task_notes: "" },
  { date: "2026-03-24", total: 994, dissatisfied: 473, satisfaction_rate: 52.4, tasks_resolved: 2, task_notes: "优化商家转人工流程，改进智能推荐匹配" },
  { date: "2026-03-25", total: 842, dissatisfied: 407, satisfaction_rate: 51.7, tasks_resolved: 0, task_notes: "" },
  { date: "2026-03-26", total: 844, dissatisfied: 397, satisfaction_rate: 53.0, tasks_resolved: 1, task_notes: "修复商家端转人工按钮异常" },
  { date: "2026-03-27", total: 774, dissatisfied: 386, satisfaction_rate: 50.1, tasks_resolved: 0, task_notes: "" },
  { date: "2026-03-28", total: 787, dissatisfied: 377, satisfaction_rate: 52.1, tasks_resolved: 0, task_notes: "" },
]

// 买家转人工率数据
export const buyerTransferRateData = [
  { date: "2026-01-29", transfer_rate: 22.16 },
  { date: "2026-01-30", transfer_rate: 21.71 },
  { date: "2026-01-31", transfer_rate: 19.31 },
  { date: "2026-02-01", transfer_rate: 20.45 },
  { date: "2026-02-02", transfer_rate: 21.89 },
  { date: "2026-02-03", transfer_rate: 20.12 },
  { date: "2026-02-04", transfer_rate: 22.34 },
  { date: "2026-02-05", transfer_rate: 21.56 },
  { date: "2026-02-06", transfer_rate: 20.78 },
  { date: "2026-02-07", transfer_rate: 19.92 },
  { date: "2026-02-08", transfer_rate: 21.23 },
  { date: "2026-02-09", transfer_rate: 22.45 },
  { date: "2026-02-10", transfer_rate: 21.67 },
  { date: "2026-02-11", transfer_rate: 20.89 },
  { date: "2026-02-12", transfer_rate: 22.11 },
  { date: "2026-02-13", transfer_rate: 21.34 },
  { date: "2026-02-14", transfer_rate: 20.56 },
  { date: "2026-02-15", transfer_rate: 19.78 },
  { date: "2026-02-16", transfer_rate: 21.00 },
  { date: "2026-02-17", transfer_rate: 22.22 },
  { date: "2026-02-18", transfer_rate: 21.44 },
  { date: "2026-02-19", transfer_rate: 20.66 },
  { date: "2026-02-20", transfer_rate: 21.88 },
  { date: "2026-02-21", transfer_rate: 21.10 },
  { date: "2026-02-22", transfer_rate: 20.32 },
  { date: "2026-02-23", transfer_rate: 21.54 },
  { date: "2026-02-24", transfer_rate: 22.76 },
  { date: "2026-02-25", transfer_rate: 21.98 },
  { date: "2026-02-26", transfer_rate: 21.20 },
  { date: "2026-02-27", transfer_rate: 22.42 },
  { date: "2026-02-28", transfer_rate: 21.64 },
  { date: "2026-03-01", transfer_rate: 20.86 },
  { date: "2026-03-02", transfer_rate: 22.08 },
  { date: "2026-03-03", transfer_rate: 21.30 },
  { date: "2026-03-04", transfer_rate: 20.52 },
  { date: "2026-03-05", transfer_rate: 21.74 },
  { date: "2026-03-06", transfer_rate: 22.96 },
  { date: "2026-03-07", transfer_rate: 21.18 },
  { date: "2026-03-08", transfer_rate: 20.40 },
  { date: "2026-03-09", transfer_rate: 21.62 },
  { date: "2026-03-10", transfer_rate: 22.84 },
  { date: "2026-03-11", transfer_rate: 21.06 },
  { date: "2026-03-12", transfer_rate: 20.28 },
  { date: "2026-03-13", transfer_rate: 19.50 },
  { date: "2026-03-14", transfer_rate: 20.72 },
  { date: "2026-03-15", transfer_rate: 21.94 },
  { date: "2026-03-16", transfer_rate: 21.16 },
  { date: "2026-03-17", transfer_rate: 22.38 },
  { date: "2026-03-18", transfer_rate: 21.60 },
  { date: "2026-03-19", transfer_rate: 20.82 },
  { date: "2026-03-20", transfer_rate: 22.04 },
  { date: "2026-03-21", transfer_rate: 21.26 },
  { date: "2026-03-22", transfer_rate: 20.48 },
  { date: "2026-03-23", transfer_rate: 21.70 },
  { date: "2026-03-24", transfer_rate: 20.92 },
  { date: "2026-03-25", transfer_rate: 22.14 },
  { date: "2026-03-26", transfer_rate: 21.36 },
  { date: "2026-03-27", transfer_rate: 20.58 },
  { date: "2026-03-28", transfer_rate: 21.80 },
]

// 商家转人工率数据
export const sellerTransferRateData = [
  { date: "2026-03-23", transfer_rate: 51.31 },
  { date: "2026-03-24", transfer_rate: 50.19 },
  { date: "2026-03-25", transfer_rate: 50.23 },
  { date: "2026-03-26", transfer_rate: 49.87 },
  { date: "2026-03-27", transfer_rate: 51.45 },
  { date: "2026-03-28", transfer_rate: 50.72 },
]

export function seedProductionData() {
  const sessionCount = (db.prepare('SELECT COUNT(*) as cnt FROM sessions').get() as any).cnt
  if (sessionCount > 0) return // already seeded

  console.log('[Seed] Seeding production mock data...')

  // 1. One sample session (abbreviated conversation for data source page)
  const sampleSessionId = 'mock-session-001'
  db.prepare(`INSERT INTO sessions (id, sequence_num, session_id, user_id, ocs_session_id, bot_conversation, human_conversation, dissatisfaction_info, session_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    sampleSessionId, 1, '00247c3f709a49e8b1aa984eb9fa8eba', '4500000000000', 'cb6b6c5b6c3b48cf803b3606bae20290',
    `[2026-03-15 20:29:03] 会员: Ticaret Güvencesi siparişim için nasıl uyuşmazlık açabilirim?
[2026-03-15 20:29:04] 机器人: 消息卡片: 此卡片是一个订单选择器
[2026-03-15 20:29:08] 会员: {"id":"289860971501027473","parentId":""}
[2026-03-15 20:30:18] 会员: The item was returned by customs and I did not receive the product. I requested a full refund to my original payment method. However, part of the refund was given as a coupon. I do not want a coupon. Please refund the full amount to my credit card.
[2026-03-15 20:34:23] 会员: I do not accept the refund as a coupon. According to consumer rights, since the product was not delivered, I am entitled to a full refund to my original payment method.
[2026-03-15 20:37:08] 会员: The system is incorrect. I need a live agent to fix this and refund the remaining balance to my card.
[2026-03-15 20:37:25] 机器人: 命令消息：AGENT_ENTRANCE_DISPLAY`,
    `[2026-03-15 20:38:54] 客服: Hello! This is Denice from the Alibaba.com Customer Service Team. May I know how can I help you?
[2026-03-15 20:39:07] 会员: Merhaba. Siparişim stokta olmadığı veya gümrük sorunu nedeniyle göndericiye iade edildi. Alibaba kupon verdi. Kupon istemiyorum. Tüm tutarın orijinal kredi kartıma iade edilmesini istiyorum.
[2026-03-15 20:40:12] 客服: Can you provide me your order number please?
[2026-03-15 20:44:08] 客服: Thank you for patiently waiting here
[2026-03-15 20:50:07] 客服: I will forward your case to the department for further assistance on this issue.
[2026-03-15 20:50:46] 客服: I will mark this "Extremely Urgent" and "Top Priority" just for you.
[2026-03-15 20:53:19] 会员: Tamam mutlu haberlerinizi bekliyorum kolay gelsin`,
    '[会员在 2026-03-15 20:29:31 时间 点了不满意，不满意原因为：Açıklamalar anlaşılır değil ve karmaşık]',
    '2026-03-15'
  )

  // Session summary
  db.prepare(`INSERT INTO session_summaries (id, session_id, summary_text, key_topics) VALUES (?, ?, ?, ?)`).run(
    'mock-summary-001', sampleSessionId,
    '买家因订单被海关退回未收到货，申请全额退款但部分金额以优惠券形式返还，要求将全部金额退至信用卡。AI客服提供了一般性解释后转人工客服处理。人工客服Denice确认订单状态并指导买家申请退款，最终将案例标记为紧急优先处理并转发相关部门。',
    '退款,退款争议,海关退回,优惠券退款,人工客服,订单纠纷,跨境物流,不满意反馈,紧急处理'
  )

  // 2. Scenarios
  db.prepare(`INSERT INTO scenarios (id, name, description, matched_count, created_by) VALUES (?, ?, ?, ?, ?)`).run(
    'mock-scenario-001', '最近满意度下降为啥', '买家在智能侧的满意度下降了xxxxxx帮我全量分析·', 0, 'admin-001'
  )
  db.prepare(`INSERT INTO scenarios (id, name, description, matched_session_ids, matched_count, created_by) VALUES (?, ?, ?, ?, ?, ?)`).run(
    'mock-scenario-002', '买家不满意的会话', '买家在对话过程中表达了不满意，包括对AI客服回答不满意、解决方案不满意、服务态度不满意等',
    JSON.stringify([sampleSessionId]), 1, 'admin-001'
  )

  // 3. DingTalk webhook config
  db.prepare(`INSERT INTO dingtalk_configs (id, webhook_url, secret, enabled, created_by) VALUES (?, ?, ?, ?, ?)`).run(
    '4ee075b5-d70e-4c62-a0b7-e969f1f88d4d',
    'https://oapi.dingtalk.com/robot/send?access_token=fa45ef0d6d2cdd39a90940e152316cbdbd9f5a2c18d492fa53844ca04aab7ff6',
    'SEC386395a935269e7343a98af9dca765b3c1ebdeef8ba7bf5eb7bf3e2297a4771d',
    1, 'admin-001'
  )

  // 4. One data source request
  db.prepare(`INSERT INTO data_source_requests (id, description, status, created_by) VALUES (?, ?, ?, ?)`).run(
    'mock-req-001', '希望增加「会话时长」字段，记录每通会话从开始到结束的总时长', 'pending', 'Matt'
  )

  console.log('[Seed] Production mock data seeded successfully')
}
