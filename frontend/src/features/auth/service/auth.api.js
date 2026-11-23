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
