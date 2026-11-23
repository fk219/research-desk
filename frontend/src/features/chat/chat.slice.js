import { createSlice } from '@reduxjs/toolkit'

const chatSlice = createSlice({
    name: "chat",
    initialState: {
        chats: {},
        currentChatId: null,
        loading: false,
        error: null,
        quotaError: null
    },
    reducers: {
        createNewChat: (state, action) => {
            const { chatId, title } = action.payload
            state.chats[chatId] = {
                _id: chatId,
                title: title || "New Thread",
                messages: [],
                pinned: false,
                shared: false,
                shareId: null
            }
        },
        addNewMessage: (state, action) => {
            const { chatId, message } = action.payload
            if (!state.chats[chatId]) {
                state.chats[chatId] = {
                    _id: chatId,
                    title: "New Thread",
                    messages: [],
                    pinned: false,
                    shared: false,
                    shareId: null
                }
            }
            state.chats[chatId].messages.push(message)
        },
        appendAiChunk: (state, action) => {
            const { chatId, chunk } = action.payload
            const chat = state.chats[chatId]
            if (!chat) return

            const last = chat.messages[chat.messages.length - 1]
            if (last && last.role === "ai" && last.streaming) {
                last.content += chunk
            } else {
                chat.messages.push({ role: "ai", content: chunk, streaming: true })
            }
        },
        finalizeAiMessage: (state, action) => {
            const { chatId, message } = action.payload
            const chat = state.chats[chatId]
            if (!chat) return

            const index = chat.messages.findIndex((item) => item.streaming)
            if (index !== -1) {
                chat.messages[index] = { ...message, streaming: false }
            } else {
                chat.messages.push(message)
            }
        },
        stopAiStreaming: (state, action) => {
            const { chatId } = action.payload
            const chat = state.chats[chatId]
            if (!chat) return

            const last = chat.messages[chat.messages.length - 1]
            if (last && last.role === "ai" && last.streaming) {
                last.streaming = false
            }
        },
        setMessages: (state, action) => {
            const { chatId, messages } = action.payload
            if (!state.chats[chatId]) {
                state.chats[chatId] = {
                    _id: chatId,
                    title: "New Thread",
                    messages: [],
                    pinned: false,
                    shared: false,
                    shareId: null
                }
            }
            state.chats[chatId].messages = messages
        },
        setChats: (state, action) => {
            state.chats = action.payload
        },
        updateChatMeta: (state, action) => {
            const { chatId, patch } = action.payload
            const chat = state.chats[chatId]
            if (!chat || !patch) return
            Object.assign(chat, patch)
        },
        removePendingUserMessage: (state, action) => {
            const { chatId } = action.payload
            const chat = state.chats[chatId]
            if (!chat) return

            for (let index = chat.messages.length - 1; index >= 0; index -= 1) {
                const message = chat.messages[index]
                if (message.role === "user" && !message._id) {
                    chat.messages.splice(index, 1)
                    break
                }
            }

            if (chatId === "temp" && chat.messages.length === 0) {
                delete state.chats.temp
                if (state.currentChatId === "temp") state.currentChatId = null
            }
        },
        setCurrentChatId: (state, action) => {
            state.currentChatId = action.payload
        },
        setLoading: (state, action) => {
            state.loading = action.payload
        },
        setError: (state, action) => {
            state.error = action.payload
        },
        setQuotaError: (state, action) => {
            state.quotaError = action.payload
        }
    }
})

export const {
    createNewChat,
    addNewMessage,
    appendAiChunk,
    finalizeAiMessage,
    stopAiStreaming,
    setMessages,
    setChats,
    updateChatMeta,
    removePendingUserMessage,
    setCurrentChatId,
    setLoading,
    setError,
    setQuotaError
} = chatSlice.actions

export default chatSlice.reducer