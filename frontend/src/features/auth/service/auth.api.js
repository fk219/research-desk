import axios from 'axios'

const API_ORIGIN = import.meta.env.VITE_API_URL || ""

const api = axios.create({
    baseURL: API_ORIGIN,
    withCredentials: true
})

export const register = async ({email, username, password}) => {
    const response = await api.post('/api/auth/register', {username, email, password})
    return response.data
} 

export const login = async ({email, password}) => {
    const response = await api.post('/api/auth/login', {email, password})
    return response.data
}

export const demoLogin = async () => {
    const response = await api.post('/api/auth/demo')
    return response.data
}

export const logout = async () => {
    const response = await api.post('/api/auth/logout')
    return response.data
}

export const getMe = async () => {
    const response = await api.get('/api/auth/get-me')
    return response.data
}

export const changePassword = async ({currentPassword, newPassword}) => {
    const response = await api.patch('/api/auth/password', {currentPassword, newPassword})
    return response.data
}

export const deleteAccount = async ({password}) => {
    const response = await api.delete('/api/auth/account', {data: {password}})
    return response.data
}

export const exportAccount = async () => {
    const response = await fetch(`${API_ORIGIN}/api/auth/export`, {
        method: 'GET',
        credentials: 'include'
    })

    if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        const error = new Error(
            payload.message || payload.error || 'The export could not be prepared.'
        )
        error.response = {data: payload, status: response.status}
        throw error
    }

    return response.blob()
} 
