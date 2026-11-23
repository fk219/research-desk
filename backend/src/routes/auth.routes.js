import express from 'express'

import {
    registerController,
    verifyEmailController,
    loginController,
    demoLoginController,
    logoutController,
    getMeController
} from '../controllers/auth.controller.js'
import { validateRegister, validateLogin } from '../validator/auth.validator.js'
import { identifyUser } from '../middleware/auth.middleware.js'
import { demoLimiter } from '../middleware/rateLimit.middleware.js'

const authRouter = express.Router()

authRouter.post('/register', validateRegister, registerController)
authRouter.get('/verify-email', verifyEmailController)
authRouter.post('/login', validateLogin, loginController)
authRouter.post('/demo', demoLimiter, demoLoginController)
authRouter.post('/logout', logoutController)
authRouter.get('/get-me', identifyUser, getMeController)


export default authRouter
