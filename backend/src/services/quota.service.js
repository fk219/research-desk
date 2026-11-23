import { chatModel } from "../models/chat.model.js"
import { messageModel } from "../models/message.model.js"

const DAILY_QUESTION_LIMIT = 25

const startOfUtcDay = () => {
    const now = new Date()
    return new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate()
    ))
}

const nextUtcDay = () => {
    const start = startOfUtcDay()
    return new Date(start.getTime() + 24 * 60 * 60 * 1000)
}

/**
 * Counts answered questions for the user since 00:00 UTC. One AI message is
 * written per answered question, so this is the audit-friendly source of truth
 * (no counter to drift out of sync).
 */
const getDailyQuota = async (userId) => {
    const chats = await chatModel.find({ user: userId }).select("_id").lean()
    const chatIds = chats.map((chat) => chat._id)

    const used = chatIds.length === 0
        ? 0
        : await messageModel.countDocuments({
            role: "ai",
            chat: { $in: chatIds },
            createdAt: { $gte: startOfUtcDay() }
        })

    return {
        limit: DAILY_QUESTION_LIMIT,
        used,
        remaining: Math.max(0, DAILY_QUESTION_LIMIT - used),
        resetsAt: nextUtcDay().toISOString()
    }
}

const quotaExceededResponse = (quota) => ({
    success: false,
    code: "DAILY_QUOTA_EXCEEDED",
    message: `Daily research limit reached. You can ask ${quota.limit} questions per UTC day. The desk resets at ${quota.resetsAt}.`,
    quota
})

export { DAILY_QUESTION_LIMIT, getDailyQuota, quotaExceededResponse }
