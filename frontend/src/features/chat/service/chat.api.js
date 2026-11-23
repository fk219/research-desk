import axios from 'axios'

const API_ORIGIN = import.meta.env.VITE_API_URL || "https://perplexity-clone-7nda.onrender.com"

const api = axios.create({
    baseURL: API_ORIGIN,
    withCredentials: true
})

const sendMessage = async ({ message, chatId }) => {
    const response = await api.post('/api/chats/message', {
        message,
        chat: chatId
    })
    return response.data
}

const streamMessage = async ({ message, chatId, onEvent }) => {
    const response = await fetch(`${api.defaults.baseURL}/api/chats/message`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, chat: chatId, stream: true })
    })

    if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        const error = new Error(
            payload.message || payload.error || 'Failed to send message',
        )
        error.status = response.status
        error.code = payload.code
        error.data = payload
        throw error
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
        const { value, done } = await reader.read()
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done })

        const events = buffer.split('\n\n')
        buffer = events.pop() || ''

        events.forEach((event) => {
            const data = event
                .split('\n')
                .find((line) => line.startsWith('data: '))

            if (data) onEvent(JSON.parse(data.slice(6)))
        })

        if (done) break
    }
}

const getChats = async () => {
    const response = await api.get('/api/chats')
    return response.data
}

const getMessages = async (chatId) => {
    const response = await api.get(`/api/chats/${chatId}/messages`)
    return response.data
}

const deleteChat = async (chatId) => {
    const response = await api.delete(`/api/chats/delete/${chatId}`)
    return response.data
}

const updateChat = async (chatId, patch) => {
    const response = await api.patch(`/api/chats/${chatId}`, patch)
    return response.data
}

const shareChat = async (chatId) => {
    const response = await api.post(`/api/chats/${chatId}/share`)
    return response.data
}

const getPublicChat = async (shareId) => {
    const response = await api.get(`/api/public/chats/${encodeURIComponent(shareId)}`)
    return response.data
}

export {
    sendMessage,
    streamMessage,
    getChats,
    getMessages,
    deleteChat,
    updateChat,
    shareChat,
    getPublicChat
}