import crypto from "crypto"
import mongoose from "mongoose"
import {generateResponse} from '../services/ai.services.js'
import { generateTitle } from '../services/ai.services.js'
import {chatModel} from '../models/chat.model.js'
import {messageModel} from '../models/message.model.js'
import {getDailyQuota, quotaExceededResponse} from '../services/quota.service.js'

const shareBaseUrl = () => {
    const base = process.env.SHARE_BASE_URL || process.env.FRONTEND_URL || "http://localhost:5173"
    return base.replace(/\/+$/, "")
}

const sendMessages = async (req, res) => {
    try{
        const {message, chat: chatId, stream} = req.body
        let title = null, newChat = null;

        if (typeof message !== "string" || !message.trim()) {
            return res.status(400).json({
                success: false,
                error: "A question is required."
            })
        }

        // Existing threads must belong to the signed-in user before new
        // messages are appended to them.
        if (chatId) {
            if (!mongoose.Types.ObjectId.isValid(chatId)) {
                return res.status(404).json({
                    success: false,
                    message: "Chat Not Found"
                })
            }

            const ownedChat = await chatModel.findOne({
                _id: chatId,
                user: req.user.id
            })

            if (!ownedChat) {
                return res.status(404).json({
                    success: false,
                    message: "Chat Not Found"
                })
            }
        }

        const quota = await getDailyQuota(req.user.id)

        if (quota.remaining <= 0) {
            return res.status(429).json(quotaExceededResponse(quota))
        }

        // If this is the first message of a chat (no chatId), generate a title
        // and create a brand-new Chat document for the logged-in user.
        if(!chatId){
            title = await generateTitle(message)

            newChat = await chatModel.create({
                title: title,
                user: req.user.id
            })
        }

        const currentChatId = chatId || newChat._id 
        
        // Always save the user's question first so it survives a refresh
        const userMessage = await messageModel.create({
            chat: currentChatId,
            content: message,
            role: "user"
        })

        if (stream) {
            res.status(200)
            res.setHeader('Content-Type', 'text/event-stream')
            res.setHeader('Cache-Control', 'no-cache')
            res.setHeader('Connection', 'keep-alive')
            res.flushHeaders()

            const sendEvent = (data) => {
                res.write(`data: ${JSON.stringify(data)}\n\n`)
            }

            sendEvent({
                type: 'start',
                title,
                newChat,
                userMessage,
                chatId: currentChatId
            })

            let answerSources = []

            const chatMessages = await messageModel.find({chat: currentChatId}).sort({createdAt: 1, _id: 1})
            const result = await generateResponse(chatMessages, (chunk) => {
                sendEvent({ type: 'chunk', chatId: currentChatId, chunk })
            }, (sources) => {
                answerSources = sources
            }, { userId: req.user.id })

            const aiMessage = await messageModel.create({
                chat: currentChatId,
                content: result,
                role: "ai",
                sources: answerSources
            })

            sendEvent({ type: 'done', message: aiMessage })
            return res.end()
        }

        // ===================================================================
        // LEGACY MODE (waits for full answer, returns everything at once)
        // ===================================================================
        let answerSources = []

        const chatMessages = await messageModel.find({chat: currentChatId}).sort({createdAt: 1, _id: 1})
        
        const result = await generateResponse(chatMessages, undefined, (sources) => {
            answerSources = sources
        }, { userId: req.user.id })

        const aiMessage = await messageModel.create({
            chat: currentChatId,
            content: result,
            role: "ai",
            sources: answerSources
        })

        res.status(201).json({
            title: title,
            newChat: newChat,
            userMessage: userMessage,
            aiMessage: aiMessage
        })

    }catch(error){
        if (res.headersSent) {
            res.write(`data: ${JSON.stringify({type: 'error', error: error.message})}\n\n`)
            return res.end()
        }
        res.status(500).json({error: error.message})
    }
}

const getChats = async (req, res) => {
    const user = req.user

    // Pinned threads first; the rail keeps date grouping for everything else.
    const chats = await chatModel
        .find({user: user.id})
        .sort({pinned: -1, updatedAt: -1})

    res.status(200).json({
        message: "Chats Fetched Succeesully",
        chats: chats
    })
}

const getMessages = async (req, res) => {
    const {chatId} = req.params

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
        return res.status(404).json({
            success: false,
            message: "Chat Not Found"
        })
    }

    const chat = await chatModel.findOne({
        user: req.user.id,
        _id: chatId
    })

    if(!chat){
        return res.status(404).json({
            success: false,
            message: "Chat Not Found"
        })
    }


    // IMPORTANT: sort by createdAt so the chat thread always renders in
    // chronological order (user -> AI -> user -> AI ...) and never jumbled
    const messages = await messageModel.find({
        chat: chatId
    }).sort({createdAt: 1, _id: 1})

    return res.status(200).json({
        message: "Messages Fetched Succeesully",
        success: true,
        messages: messages
    })
}

const updateChat = async (req, res) => {
    const {chatId} = req.params
    const {title, pinned} = req.body || {}

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
        return res.status(404).json({
            success: false,
            message: "Chat Not Found"
        })
    }

    if (title === undefined && pinned === undefined) {
        return res.status(400).json({
            success: false,
            message: "Provide a title or a pinned value."
        })
    }

    const update = {}

    if (title !== undefined) {
        if (typeof title !== "string" || !title.trim() || title.trim().length > 120) {
            return res.status(400).json({
                success: false,
                message: "Title must be between 1 and 120 characters."
            })
        }
        update.title = title.trim()
    }

    if (pinned !== undefined) {
        if (typeof pinned !== "boolean") {
            return res.status(400).json({
                success: false,
                message: "Pinned must be true or false."
            })
        }
        update.pinned = pinned
    }

    const chat = await chatModel.findOneAndUpdate(
        {_id: chatId, user: req.user.id},
        {$set: update},
        {new: true}
    )

    if (!chat) {
        return res.status(404).json({
            success: false,
            message: "Chat Not Found"
        })
    }

    return res.status(200).json({
        success: true,
        message: "Chat updated.",
        chat
    })
}

const shareChat = async (req, res, next) => {
    try {
        const {chatId} = req.params

        if (!mongoose.Types.ObjectId.isValid(chatId)) {
            return res.status(404).json({
                success: false,
                message: "Chat Not Found"
            })
        }

        const chat = await chatModel.findOne({
            _id: chatId,
            user: req.user.id
        })

        if (!chat) {
            return res.status(404).json({
                success: false,
                message: "Chat Not Found"
            })
        }

        if (!chat.shareId) {
            chat.shareId = crypto.randomBytes(12).toString("base64url")
        }

        chat.shared = !chat.shared
        await chat.save()

        const path = `/share/${chat.shareId}`

        return res.status(200).json({
            success: true,
            message: chat.shared ? "Sharing is on." : "Sharing is off.",
            shared: chat.shared,
            shareId: chat.shareId,
            path,
            url: chat.shared ? `${shareBaseUrl()}${path}` : null
        })
    } catch (error) {
        next(error)
    }
}

const getPublicChat = async (req, res) => {
    const {shareId} = req.params

    if (typeof shareId !== "string" || shareId.length < 8) {
        return res.status(404).json({
            success: false,
            message: "This shared report was not found."
        })
    }

    const chat = await chatModel.findOne({
        shareId,
        shared: true
    }).select("title createdAt updatedAt").lean()

    if (!chat) {
        return res.status(404).json({
            success: false,
            message: "This shared report was not found or is no longer public."
        })
    }

    const messages = await messageModel
        .find({chat: chat._id})
        .sort({createdAt: 1, _id: 1})
        .select("role content sources createdAt")
        .lean()

    return res.status(200).json({
        success: true,
        thread: {
            title: chat.title,
            createdAt: chat.createdAt,
            updatedAt: chat.updatedAt,
            messages: messages.map((message) => ({
                role: message.role,
                content: message.content,
                sources: message.role === "ai" ? (message.sources || []) : [],
                createdAt: message.createdAt
            }))
        }
    })
}

const deleteChat = async (req, res) => {
    const userId = req.user.id
    const {chatId} = req.params

    const chat = await chatModel.findOneAndDelete({
        _id: chatId,
        user: userId
    })

    if(!chat){
        return res.status(404).json({
            message: "Chat Not Found",
            success: false
        })
    }

    await messageModel.deleteMany({
        chat: chatId
    })

    res.status(200).json({
        message: "Chat Delleted Successfuly!",
        success: true,
        chat: chatId
    })

    
}

export {sendMessages, getChats, getMessages, updateChat, shareChat, getPublicChat, deleteChat}
