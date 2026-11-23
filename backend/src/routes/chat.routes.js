import express from 'express'
import { identifyUser } from '../middleware/auth.middleware.js'
import { messageLimiter } from '../middleware/rateLimit.middleware.js'
import {
    sendMessages,
    getChats,
    getMessages,
    updateChat,
    shareChat,
    deleteChat
} from '../controllers/chat.controller.js'


const chatRouter = express.Router()

chatRouter.post('/message', identifyUser, messageLimiter, sendMessages)
chatRouter.get('/', identifyUser, getChats)
chatRouter.patch('/:chatId', identifyUser, updateChat)
chatRouter.post('/:chatId/share', identifyUser, shareChat)
chatRouter.get('/:chatId/messages', identifyUser, getMessages)
chatRouter.delete('/delete/:chatId', identifyUser, deleteChat)

export default chatRouter
