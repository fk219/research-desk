import express from 'express'

import {
    registerController,
    verifyEmailController,
    loginController,
    demoLoginController,
    logoutController,
    getMeController
} from '../controllers/auth.controller.js'
import {
    changePasswordController,
    exportAccountController,
    deleteAccountController,
    quotaController
} from '../controllers/account.controller.js'
import { validateRegister, validateLogin } from '../validator/auth.validator.js'
import { identifyUser } from '../middleware/auth.middleware.js'
import { demoLimiter, accountLimiter } from '../middleware/rateLimit.middleware.js'

const authRouter = express.Router()

authRouter.post('/register', validateRegister, registerController)
authRouter.get('/verify-email', verifyEmailController)
authRouter.post('/login', validateLogin, loginController)
authRouter.post('/demo', demoLimiter, demoLoginController)
authRouter.post('/logout', logoutController)
authRouter.get('/get-me', identifyUser, getMeController)
authRouter.get('/quota', identifyUser, quotaController)
authRouter.patch('/password', identifyUser, accountLimiter, changePasswordController)
authRouter.get('/export', identifyUser, accountLimiter, exportAccountController)
authRouter.delete('/account', identifyUser, accountLimiter, deleteAccountController)


export default authRouter
