import { useCallback } from 'react'
import { useDispatch } from 'react-redux'
import {
    streamMessage,
    getChats,
    getMessages,
    updateChat,
    shareChat
} from '../service/chat.api'

import {
    createNewChat,
    addNewMessage,
    setMessages,
    setChats,
    updateChatMeta,
    removePendingUserMessage,
    setCurrentChatId,
    setLoading,
    setError,
    setQuotaError,
    appendAiChunk,
    finalizeAiMessage,
    stopAiStreaming
} from '../chat.slice'

const errorMessage = (error) =>
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    'Something went wrong.'

const errorCode = (error) =>
    error?.response?.data?.code || error?.code || null

const errorStatus = (error) =>
    error?.response?.status || error?.status || null

const useChat = () => {
    const dispatch = useDispatch()

    const handleSendMessage = async ({ message, chatId }) => {
        let streamChatId = chatId || null
        let streamCompleted = false
        let streamFailed = false
        let quotaExceeded = false
        let failureMessage = ""

        try {
            dispatch(setLoading(true))
            dispatch(setError(null))
            dispatch(setQuotaError(null))

            const activeChatId = chatId || "temp"
            dispatch(addNewMessage({
                chatId: activeChatId,
                message: { role: "user", content: message }
            }))

            if (!chatId) dispatch(setCurrentChatId("temp"))

            await streamMessage({
                message,
                chatId,
                onEvent: (event) => {
                    if (event.type === 'start' && event.newChat) {
                        streamChatId = event.newChat._id
                        dispatch(createNewChat({
                            chatId: event.newChat._id,
                            title: event.title || event.newChat.title
                        }))
                        dispatch(setMessages({
                            chatId: event.newChat._id,
                            messages: [event.userMessage]
                        }))
                        dispatch(setCurrentChatId(event.newChat._id))
                    }

                    if (event.type === 'chunk') {
                        streamChatId = event.chatId || streamChatId
                        dispatch(appendAiChunk({
                            chatId: event.chatId || chatId,
                            chunk: event.chunk
                        }))
                    }

                    if (event.type === 'done') {
                        streamChatId = event.message?.chat || streamChatId
                        streamCompleted = true
                        dispatch(finalizeAiMessage({
                            chatId: event.message.chat,
                            message: event.message
                        }))
                        dispatch(setLoading(false))
                    }

                    if (event.type === 'error') {
                        streamFailed = true
                        dispatch(setError(event.error || 'The answer stream stopped unexpectedly.'))
                        dispatch(stopAiStreaming({ chatId: streamChatId || activeChatId }))
                        dispatch(setLoading(false))
                    }

                    if (event.type === 'start' && event.chatId) {
                        streamChatId = event.chatId
                    }
                }
            })

            // A dropped SSE connection can end the reader without a done event.
            // Surface it instead of leaving a permanently "composing" answer.
            if (!streamCompleted && !streamFailed) {
                dispatch(setError('The answer stream ended before it finished. Ask again.'))
                dispatch(stopAiStreaming({ chatId: streamChatId || activeChatId }))
            }
        } catch (error) {
            console.error("Failed to send message:", error)

            const status = errorStatus(error)
            const code = errorCode(error)
            const requestChatId = streamChatId || chatId || "temp"

            dispatch(stopAiStreaming({ chatId: requestChatId }))

            if (status === 429 || code === 'DAILY_QUOTA_EXCEEDED') {
                // The answer never started, so do not leave an optimistic
                // question stranded in a thread the server does not have.
                quotaExceeded = true
                failureMessage = errorMessage(error)
                dispatch(removePendingUserMessage({ chatId: requestChatId }))
                dispatch(setQuotaError(failureMessage))
            } else {
                failureMessage = errorMessage(error)
                dispatch(setError(failureMessage))
            }
        } finally {
            dispatch(setLoading(false))
        }

        return {
            ok: streamCompleted,
            quotaExceeded,
            message: failureMessage
        }
    }

    const handleGetChats = useCallback(async () => {
        try {
            dispatch(setLoading(true))
            const data = await getChats()
            const chatsMap = (data?.chats || []).reduce((acc, chat) => {
                acc[chat._id] = {
                    _id: chat._id,
                    title: chat.title,
                    messages: [],
                    pinned: Boolean(chat.pinned),
                    shared: Boolean(chat.shared),
                    shareId: chat.shareId || null,
                    createdAt: chat.createdAt,
                    updatedAt: chat.updatedAt
                }
                return acc
            }, {})
            dispatch(setChats(chatsMap))
        } catch (error) {
            console.error("Failed to fetch chats:", error)
            dispatch(setError(error?.response?.data?.error || error.message))
        } finally {
            dispatch(setLoading(false))
        }
    }, [dispatch])

    const handleOpenChats = async (chatId, chats) => {
        dispatch(setCurrentChatId(chatId))
        if (chats && chats[chatId]?.messages?.length > 0) return

        try {
            dispatch(setLoading(true))
            const data = await getMessages(chatId)
            dispatch(setMessages({
                chatId,
                messages: data?.messages || []
            }))
        } catch (error) {
            console.error("Failed to fetch chat messages:", error)
            dispatch(setError(error?.response?.data?.error || error.message))
        } finally {
            dispatch(setLoading(false))
        }
    }

    const handleRenameChat = async (chatId, title) => {
        const cleanTitle = String(title || "").trim()
        if (!chatId || !cleanTitle) return { ok: false }

        try {
            const data = await updateChat(chatId, { title: cleanTitle })
            dispatch(updateChatMeta({
                chatId,
                patch: { title: data?.chat?.title || cleanTitle }
            }))
            return { ok: true }
        } catch (error) {
            dispatch(setError(errorMessage(error)))
            return { ok: false, message: errorMessage(error) }
        }
    }

    const handleTogglePin = async (chatId, pinned) => {
        if (!chatId) return { ok: false }

        // Optimistic: the rail reorders immediately, the server confirms.
        dispatch(updateChatMeta({ chatId, patch: { pinned } }))

        try {
            await updateChat(chatId, { pinned })
            return { ok: true }
        } catch (error) {
            dispatch(updateChatMeta({ chatId, patch: { pinned: !pinned } }))
            dispatch(setError(errorMessage(error)))
            return { ok: false, message: errorMessage(error) }
        }
    }

    const handleShareChat = async (chatId) => {
        if (!chatId) return { ok: false }

        try {
            const data = await shareChat(chatId)
            dispatch(updateChatMeta({
                chatId,
                patch: {
                    shared: Boolean(data?.shared),
                    shareId: data?.shareId || null
                }
            }))
            return { ok: true, ...data }
        } catch (error) {
            dispatch(setError(errorMessage(error)))
            return { ok: false, message: errorMessage(error) }
        }
    }

    return {
        handleSendMessage,
        handleGetChats,
        handleOpenChats,
        handleRenameChat,
        handleTogglePin,
        handleShareChat
    }
}

export default useChat
