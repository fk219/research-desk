
Features:
-Authentication System (verified email, JWT cookie, token-version revocation)
-Account settings (password change with full session revocation, JSON data export, account deletion with thread and message cleanup)
-Chat with AI (Mistral + Tavily search)
-Chat History
-Message Storage with source cards
-AI with Internet Research Feature
-Demo desk (shared account, seeded example threads)
-Thread rename + pin
-Read-only public share links
-Markdown export
-Daily quota (25 answered questions / user / UTC day) + per-IP rate limits


DATA MODELLING:
- User{
    id,
    username,
    email,
    password,
    verified: yes or no,
    tokenVersion: number (incremented on logout and password change),
    createdAt,
    updatedAt,
}

-Chat{
    id,
    user (Kis User ki chat hai),
    title,
    pinned: boolean,
    shared: boolean,
    shareId: unique string (created on first share),
    createdAt,
    updatedAt
}

-Message{
    id,
    chat (Kis chat ka message hai),
    Content (Message ke andar ka content),
    role: [user/ ai],
    sources: [{ title, url, snippet }] (AI answers)
}
