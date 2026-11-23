import rateLimit from "express-rate-limit"

const rateLimitHandler = (message) => (req, res) => {
    res.status(429).json({
        success: false,
        message,
        code: "RATE_LIMITED"
    })
}

// Applied to the whole auth router in app.js.
const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: rateLimitHandler(
        "Too many account attempts from this address. Wait a minute and try again."
    )
})

// The demo endpoint is stricter because it creates a shared session.
const demoLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 3,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: rateLimitHandler(
        "The demo desk is being opened too often from this address. Wait a minute and try again."
    )
})

// One line of defence in front of the daily question quota.
const messageLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: rateLimitHandler(
        "That is a lot of questions in one minute. Pause a moment, then send again."
    )
})

export { authLimiter, demoLimiter, messageLimiter }
