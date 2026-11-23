import express from 'express'
import { getPublicChat } from '../controllers/chat.controller.js'

const publicRouter = express.Router()

// Read-only shared reports. No cookie, no user identity, no thread ids.
publicRouter.get('/chats/:shareId', getPublicChat)

export default publicRouter
