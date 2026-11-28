import express from "express"
import cookieParser from "cookie-parser"
import morgan from "morgan"
import cors from "cors"
import helmet from "helmet"
import compression from "compression"
import mongoose from "mongoose"

import authRouter from "./routes/auth.routes.js"
import chatRouter from "./routes/chat.routes.js"
import libraryRouter from "./routes/library.routes.js"
import publicRouter from "./routes/public.routes.js"
import { authLimiter } from "./middleware/rateLimit.middleware.js"
import { requestId } from "./middleware/requestId.js"

const app = express()

// Render sits behind a proxy, so req.ip (and therefore per-IP rate limits)
// needs the forwarded address.
app.set("trust proxy", 1)

app.use(helmet({
    // The email verification pages use inline styles, so keep those working.
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:"],
            scriptSrc: ["'self'"]
        }
    },
    crossOriginResourcePolicy: { policy: "cross-origin" }
}))
app.use(express.json({ limit: "1mb" }))
app.use(cookieParser())
app.use(requestId())
app.use(morgan("dev"))
app.use(compression())

const allowedOrigins = (
    process.env.CORS_ORIGINS ||
    "https://researchdesk.furqankhan.dev,http://localhost:5173"
)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)

app.use(cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "DELETE", "PUT", "PATCH"]
}))

app.use((req, res, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next()
    const origin = req.headers.origin
    if (origin && !allowedOrigins.includes(origin)) {
        return res.status(403).json({ error: "Origin not allowed." })
    }
    return next()
})

app.use("/api/auth", authLimiter, authRouter)
app.use("/api/chats", chatRouter)
app.use("/api/library", libraryRouter)
app.use("/api/public", publicRouter)

app.get("/", (req, res) => {
    res.send("Hello World")
})

app.get("/health", (req, res) => {
    res.status(200).json({
        ok: true,
        service: "research-desk-api",
        database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
        uptimeSeconds: Math.round(process.uptime())
    })
})

app.get("/health/ready", async (req, res) => {
    const startedAt = Date.now()
    try {
        if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
            return res.status(503).json({
                ok: false,
                service: "research-desk-api",
                database: "not-connected"
            })
        }

        await mongoose.connection.db.admin().ping()

        return res.status(200).json({
            ok: true,
            service: "research-desk-api",
            database: "up",
            latencyMs: Date.now() - startedAt,
            uptimeSeconds: Math.round(process.uptime())
        })
    } catch (error) {
        return res.status(503).json({
            ok: false,
            service: "research-desk-api",
            database: "unreachable",
            error: error instanceof Error ? error.message : "unknown"
        })
    }
})

app.use((req, res) => {
    res.status(404).json({ error: "Route not found." })
})

app.use((error, _req, res, _next) => {
    console.error("Unhandled API error:", error)
    if (res.headersSent) return
    res.status(error?.status || 500).json({
        error: "Something went wrong. Try again in a moment.",
        requestId: req.requestId
    })
})

export {app}
