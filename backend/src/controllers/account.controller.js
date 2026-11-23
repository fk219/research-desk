import { userModel } from '../models/user.model.js'
import { chatModel } from '../models/chat.model.js'
import { messageModel } from '../models/message.model.js'
import { DEMO_EMAIL } from '../services/demo.service.js'

const isProduction = () => process.env.NODE_ENV === 'production'

const cookieOptions = () => ({
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax"
})

const clearSessionCookie = (res) => res.clearCookie("token", cookieOptions())

const passwordLengthIsValid = (value) =>
    typeof value === 'string' && value.length >= 8 && value.length <= 72

const changePasswordController = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body || {}

        // Registration and login trim passwords, so the change flow does the
        // same to keep every account able to sign back in.
        const currentPasswordValue =
            typeof currentPassword === 'string' ? currentPassword.trim() : ''
        const newPasswordValue =
            typeof newPassword === 'string' ? newPassword.trim() : ''

        if (currentPasswordValue.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Enter your current password."
            })
        }

        if (!passwordLengthIsValid(newPasswordValue)) {
            return res.status(400).json({
                success: false,
                message: "The new password must be between 8 and 72 characters."
            })
        }

        const user = await userModel.findById(req.user.id).select("+password")

        if (!user) {
            clearSessionCookie(res)
            return res.status(401).json({
                success: false,
                message: "Session no longer valid. Sign in again."
            })
        }

        const currentPasswordMatches = await user.comparePassword(currentPasswordValue)

        if (!currentPasswordMatches) {
            return res.status(401).json({
                success: false,
                message: "The current password is incorrect."
            })
        }

        user.password = newPasswordValue
        // Revoke every JWT issued before this change. identifyUser compares
        // the cookie's version with this stored value.
        user.tokenVersion = (user.tokenVersion ?? 0) + 1
        await user.save()

        clearSessionCookie(res)

        return res.status(200).json({
            success: true,
            signedOut: true,
            message: "Password changed. All sessions were signed out."
        })
    } catch (error) {
        next(error)
    }
}

const exportAccountController = async (req, res, next) => {
    try {
        const userId = req.user.id

        const user = await userModel
            .findById(userId)
            .select("username email verified createdAt")
            .lean()

        if (!user) {
            clearSessionCookie(res)
            return res.status(401).json({
                success: false,
                message: "Session no longer valid. Sign in again."
            })
        }

        // Only the signed-in user's threads are selected. Messages are then
        // restricted to those thread ids, so no other account can leak in.
        const chats = await chatModel
            .find({ user: userId })
            .sort({ createdAt: 1, _id: 1 })
            .lean()

        const chatIds = chats.map((chat) => chat._id)

        const messages = chatIds.length
            ? await messageModel
                .find({ chat: { $in: chatIds } })
                .sort({ createdAt: 1, _id: 1 })
                .lean()
            : []

        const messagesByChat = messages.reduce((grouped, message) => {
            const key = String(message.chat)
            if (!grouped[key]) grouped[key] = []
            grouped[key].push({
                id: message._id,
                role: message.role,
                content: message.content,
                sources: (Array.isArray(message.sources)
                    ? message.sources
                    : []
                ).map((source) => ({
                    title: source.title || "",
                    url: source.url || "",
                    snippet: source.snippet || ""
                })),
                createdAt: message.createdAt,
                updatedAt: message.updatedAt
            })
            return grouped
        }, {})

        const payload = {
            format: "research-desk-account-export",
            version: 1,
            exportedAt: new Date().toISOString(),
            account: {
                id: user._id,
                username: user.username,
                email: user.email,
                verified: user.verified,
                joinedAt: user.createdAt
            },
            threadCount: chats.length,
            threads: chats.map((chat) => ({
                id: chat._id,
                title: chat.title,
                pinned: Boolean(chat.pinned),
                shared: Boolean(chat.shared),
                shareId: chat.shareId || null,
                createdAt: chat.createdAt,
                updatedAt: chat.updatedAt,
                messages: messagesByChat[String(chat._id)] || []
            }))
        }

        const fileDate = new Date().toISOString().slice(0, 10)

        res.setHeader("Content-Type", "application/json; charset=utf-8")
        res.setHeader("Cache-Control", "private, no-store")
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="research-desk-export-${fileDate}.json"`
        )

        return res.status(200).send(JSON.stringify(payload, null, 2))
    } catch (error) {
        next(error)
    }
}

const deleteAccountController = async (req, res, next) => {
    try {
        // The shared demo identity is entered by every visitor, so it must
        // survive for the desk to keep working. The middleware already knows
        // the email, so reject before asking for a password.
        if (req.user.email === DEMO_EMAIL) {
            return res.status(403).json({
                success: false,
                message: "The shared demo account cannot be deleted."
            })
        }

        const { password } = req.body || {}
        const passwordValue = typeof password === 'string' ? password.trim() : ''

        if (passwordValue.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Enter your password to delete the account."
            })
        }

        const user = await userModel.findById(req.user.id).select("+password")

        if (!user) {
            clearSessionCookie(res)
            return res.status(401).json({
                success: false,
                message: "Session no longer valid. Sign in again."
            })
        }

        const passwordMatches = await user.comparePassword(passwordValue)

        if (!passwordMatches) {
            return res.status(401).json({
                success: false,
                message: "The password is incorrect. The account was not deleted."
            })
        }

        const chats = await chatModel
            .find({ user: user._id })
            .select("_id")
            .lean()

        const chatIds = chats.map((chat) => chat._id)

        if (chatIds.length > 0) {
            await messageModel.deleteMany({ chat: { $in: chatIds } })
        }

        // Share ids live on the chats, so public links stop resolving as soon
        // as the threads are removed.
        await chatModel.deleteMany({ user: user._id })
        await userModel.deleteOne({ _id: user._id })

        clearSessionCookie(res)

        return res.status(200).json({
            success: true,
            message: "Account deleted. Your threads, messages and share links were removed."
        })
    } catch (error) {
        next(error)
    }
}

export {
    changePasswordController,
    exportAccountController,
    deleteAccountController
}
