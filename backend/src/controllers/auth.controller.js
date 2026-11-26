import {userModel} from '../models/user.model.js'
import {sendEmail} from '../services/mail.service.js'
import {ensureDemoUser, seedDemoThreads, DEMO_EMAIL, DEMO_USERNAME} from '../services/demo.service.js'
import jwt from 'jsonwebtoken'

const frontendUrl = process.env.FRONTEND_URL || 'https://scaling-waddle-q5v7p6gvxj73wrx-5173.app.github.dev'
const backendUrl = process.env.BACKEND_URL || 'https://scaling-waddle-q5v7p6gvxj73wrx-3000.app.github.dev'

const isProduction = () => process.env.NODE_ENV === "production"

const cookieOptions = () => ({
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax"
})

const serializeUser = (user) => ({
    id: user._id,
    username: user.username,
    email: user.email,
    verified: user.verified,
    joinedAt: user.createdAt || null,
    isDemo: user.email === DEMO_EMAIL
})

const issueSession = (res, user) => {
    const token = jwt.sign({
        id: user._id,
        email: user.email,
        // identifyUser compares this with the stored value so a logout can
        // revoke every cookie issued before it.
        tokenVersion: user.tokenVersion ?? 0
    }, process.env.JWT_SECRET, {expiresIn: '1d'})

    res.cookie("token", token, {
        ...cookieOptions(),
        maxAge: 24 * 60 * 60 * 1000
    })
}

const registerController = async (req, res, next) => {
    const {username, email, password} = req.body

    // The shared demo identity is created by POST /api/auth/demo only.
    if (
        String(email).trim().toLowerCase() === DEMO_EMAIL ||
        String(username).trim().toLowerCase() === DEMO_USERNAME
    ) {
        return res.status(400).json({
            message: "That demo identity is reserved. Choose another email or username.",
            success: false,
            err: "Reserved Demo Identity"
        })
    }

    const existingUser = await userModel.findOne({
        $or: [{ email }, { username }]
    })

    if (existingUser) {
        return res.status(400).json({
            message: existingUser.email === email
                ? "User already exists with this email"
                : "User already exists with this username",
            success: false,
            err: "User Already Exists!"
        })
    }

    const user = await userModel.create({
        username, email, password
    })

    const emailVerificationToken = jwt.sign({
        email: user.email
    }, process.env.JWT_SECRET)

    await sendEmail(
        user.email,
        "Welcome to ResearchDesk! Please verify your email",
        `
            <div style="max-width:480px;margin:0 auto;font-family:'Segoe UI',Arial,sans-serif;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
                <div style="background:linear-gradient(135deg,#84cc16,#10b981);padding:32px 24px;text-align:center;">
                    <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">ResearchDesk</h1>
                </div>
                <div style="padding:32px 24px;text-align:center;">
                    <h2 style="margin:0 0 8px;color:#111827;font-size:20px;">Verify your email</h2>
                    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">Tap the button below to confirm your address.</p>
                    <a href="${backendUrl}/api/auth/verify-email?token=${emailVerificationToken}"
                       style="display:inline-block;background:linear-gradient(135deg,#84cc16,#10b981);color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:15px;font-weight:600;">
                        Verify Email
                    </a>
                </div>
                <div style="padding:16px 24px;text-align:center;border-top:1px solid #e5e7eb;">
                    <p style="margin:0;color:#9ca3af;font-size:12px;">If you didn't create an account, you can safely ignore this email.</p>
                </div>
            </div>
        `
    )

    res.status(201).json({
        message: "User Registered Successfully",
        success: true,
        user: {
            id: user._id,
            username: user.username,
            email: user.email,
        }
    })
}

const loginController = async (req, res, next) => {
    const {email, password} = req.body

    const user = await userModel.findOne({email}).select("+password")

    if(!user){
        return res.status(401).json({
            message: "No User Found With this Email. Please Register First!!",
            success: false,
            err: "No User Found"
        })
    }

    const isPasswordValid = await user.comparePassword(password)

    if(!isPasswordValid){
        return res.status(401).json({
            message: "Incorrect Password or Email"
        })
    }

    if(!user.verified){
        return res.status(400).json({
            message: "Please Verify Your Email Before Logging In",
            success: false,
            err: "Email Not Verified"
        })
    }

    issueSession(res, user)

    return res.status(200).json({
        message: "User Logged In Successfully!",
        success: true,
        user: serializeUser(user)
    })
}

const demoLoginController = async (req, res, next) => {
    try {
        const user = await ensureDemoUser()

        if (!user) {
            return res.status(500).json({
                message: "The demo desk could not be prepared. Try again.",
                success: false
            })
        }

        if (!user.verified) {
            user.verified = true
            await user.save()
        }

        // Seed only when the shared demo desk has no threads. Failures here
        // should not block access to the desk itself.
        try {
            await seedDemoThreads(user._id)
        } catch (error) {
            console.error("Demo seed failed:", error.message)
        }

        issueSession(res, user)

        return res.status(200).json({
            message: "Demo desk opened.",
            success: true,
            demo: true,
            user: serializeUser(user)
        })
    } catch (error) {
        next(error)
    }
}

const logoutController = async (req, res, next) => {
    try {
        const token = req.cookies?.token

        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET)
                if (decoded?.id) {
                    await userModel.updateOne(
                        {_id: decoded.id},
                        {$inc: {tokenVersion: 1}}
                    )
                }
            } catch {
                // An already-expired or invalid token still gets its cookie
                // cleared; there is nothing left to revoke.
            }
        }

        res.clearCookie("token", cookieOptions())

        return res.status(200).json({
            message: "Signed out.",
            success: true
        })
    } catch (error) {
        next(error)
    }
}

const verifyEmailController = async (req, res, next) => {
    const { token } = req.query

    try{  
        if (!token) {
            return res.status(400).json({
                message: "Token is required",
                success: false
            })
        }
    
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
    
        const user = await userModel.findOne({ email: decoded.email })
    
        if (!user) {
            return res.status(404).json({
                message: "User not found",
                success: false
            })
        }
    
        if (user.verified) {
            const html = `
                <div style="max-width:480px;margin:50px auto;font-family:'Segoe UI',Arial,sans-serif;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
                    <div style="background:linear-gradient(135deg,#84cc16,#10b981);padding:32px 24px;text-align:center;">
                        <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">ResearchDesk</h1>
                    </div>
                    <div style="padding:32px 24px;text-align:center;">
                        <h2 style="margin:0 0 8px;color:#111827;font-size:20px;">Email Already Verified</h2>
                        <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">Your email has already been verified.</p>
                        <a href="${frontendUrl}/login"
                           style="display:inline-block;background:linear-gradient(135deg,#84cc16,#10b981);color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:15px;font-weight:600;">
                            LOGIN
                        </a>
                    </div>
                    <div style="padding:16px 24px;text-align:center;border-top:1px solid #e5e7eb;">
                        <p style="margin:0;color:#9ca3af;font-size:12px;">© ResearchDesk. All rights reserved.</p>
                    </div>
                </div>
            `
            return res.send(html)
        }
    
        user.verified = true
        await user.save()
    
        const html = `
            <div style="max-width:480px;margin:50px auto;font-family:'Segoe UI',Arial,sans-serif;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
                <div style="background:linear-gradient(135deg,#84cc16,#10b981);padding:32px 24px;text-align:center;">
                    <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">ResearchDesk</h1>
                </div>
                <div style="padding:32px 24px;text-align:center;">
                    <h2 style="margin:0 0 8px;color:#111827;font-size:20px;">Email Verified Successfully</h2>
                    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">Your email is verified. You can now redirect to the login page.</p>
                    <a href="${frontendUrl}/login"
                       style="display:inline-block;background:linear-gradient(135deg,#84cc16,#10b981);color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:15px;font-weight:600;">
                        LOGIN
                    </a>
                </div>
                <div style="padding:16px 24px;text-align:center;border-top:1px solid #e5e7eb;">
                    <p style="margin:0;color:#9ca3af;font-size:12px;">© ResearchDesk. All rights reserved.</p>
                </div>
            </div>
        `
    
        return res.send(html)

    }catch(err){
        res.status(400).json({
            message: "Token Expired",
            err: err.message
        })
    }
}

const getMeController = async (req, res) => {
    const userId = req.user.id

    const user = await userModel.findById(userId)

    if(!user){
        return res.status(404).json({
            message: "User Not Found",
            success: false,
            err: "User Not Found"
        })
    }

    res.status(200).json({
        message: "User Details Fetched Successfully",
        success: true,
        user: serializeUser(user)
    })
}

export {
    registerController,
    verifyEmailController,
    loginController,
    demoLoginController,
    logoutController,
    getMeController
}