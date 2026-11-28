import crypto from "crypto"
import { libraryChunkModel, libraryDocumentModel } from "../models/library.model.js"

const DIMENSIONS = 256

const STOP_WORDS = new Set([
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has", "have",
    "he", "her", "his", "i", "in", "is", "it", "its", "of", "on", "or", "that",
    "the", "their", "this", "to", "was", "were", "will", "with", "you", "your"
])

export const tokenize = (text) =>
    String(text || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((token) => token.length >= 2 && !STOP_WORDS.has(token))

const hashToken = (token) => {
    let hash = 2166136261
    for (let index = 0; index < token.length; index += 1) {
        hash ^= token.charCodeAt(index)
        hash = Math.imul(hash, 16777619)
    }
    return Math.abs(hash) % DIMENSIONS
}

export const embedText = (text) => {
    const vector = new Array(DIMENSIONS).fill(0)
    const terms = tokenize(text)
    for (const term of terms) {
        const index = hashToken(term)
        vector[index] += 1
        // A second hash reduces collision damage without external services.
        vector[(index * 31 + 7) % DIMENSIONS] += 0.5
    }
    const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1
    return vector.map((value) => Math.round((value / norm) * 10000) / 10000)
}

export const chunkText = (content, maxChars = 900, overlap = 120) => {
    const normalized = String(content || "").replace(/\r\n/g, "\n").trim()
    if (!normalized) return []

    const paragraphs = normalized.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean)
    const chunks = []
    let current = ""

    const pushCurrent = () => {
        if (current.trim()) chunks.push(current.trim())
        current = ""
    }

    for (const paragraph of paragraphs) {
        if (paragraph.length > maxChars) {
            pushCurrent()
            let start = 0
            while (start < paragraph.length) {
                const end = Math.min(paragraph.length, start + maxChars)
                chunks.push(paragraph.slice(start, end).trim())
                if (end === paragraph.length) break
                start = Math.max(end - overlap, start + 1)
            }
            continue
        }

        if (!current) {
            current = paragraph
        } else if (current.length + paragraph.length + 2 <= maxChars) {
            current += `\n\n${paragraph}`
        } else {
            pushCurrent()
            current = paragraph
        }
    }
    pushCurrent()

    return chunks.filter(Boolean)
}

export const cosine = (left, right) => {
    if (!left?.length || !right?.length) return 0
    const length = Math.min(left.length, right.length)
    let dot = 0
    let leftNorm = 0
    let rightNorm = 0
    for (let index = 0; index < length; index += 1) {
        dot += left[index] * right[index]
        leftNorm += left[index] * left[index]
        rightNorm += right[index] * right[index]
    }
    if (!leftNorm || !rightNorm) return 0
    return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm))
}

const keywordScore = (queryTerms, terms) => {
    if (!queryTerms.length || !terms.length) return 0
    const unique = new Set(terms)
    const hits = queryTerms.filter((term) => unique.has(term)).length
    return hits / queryTerms.length
}

export const searchLibrary = async (userId, query, limit = 5) => {
    const queryTerms = tokenize(query)
    if (!queryTerms.length) return []

    const documents = await libraryDocumentModel
        .find({ user: userId, status: "ready" })
        .select("title shareId")
        .lean()
    if (!documents.length) return []

    const byId = new Map(documents.map((document) => [document._id.toString(), document]))
    const chunks = await libraryChunkModel
        .find({ user: userId, document: { $in: documents.map((document) => document._id) } })
        .limit(2000)
        .lean()

    const queryEmbedding = embedText(query)
    const ranked = chunks
        .map((chunk) => {
            const semantic = cosine(queryEmbedding, chunk.embedding)
            const keyword = keywordScore(queryTerms, chunk.terms)
            const title = byId.get(chunk.document.toString())?.title || ""
            const titleBoost = keywordScore(queryTerms, tokenize(title)) * 0.15
            return {
                chunk,
                document: byId.get(chunk.document.toString()),
                score: Number((semantic * 0.65 + keyword * 0.35 + titleBoost).toFixed(4))
            }
        })
        .filter((entry) => entry.score > 0)
        .sort((left, right) => right.score - left.score)
        .slice(0, limit)

    return ranked.map((entry) => ({
        documentId: entry.document?._id?.toString() || "",
        documentTitle: entry.document?.title || "Untitled document",
        shareId: entry.document?.shareId || "",
        chunkIndex: entry.chunk.index,
        text: entry.chunk.text,
        score: entry.score
    }))
}

export const makeShareId = () => crypto.randomBytes(12).toString("hex")
