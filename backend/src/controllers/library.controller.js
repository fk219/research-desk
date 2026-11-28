import mongoose from "mongoose"
import { ingestionJobModel, libraryChunkModel, libraryDocumentModel } from "../models/library.model.js"
import { enqueueDocument } from "../services/ingestion.service.js"
import { searchLibrary } from "../services/library.service.js"

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value)

const shapeDocument = (document, includeContent = false) => ({
    id: document._id.toString(),
    title: document.title,
    kind: document.kind,
    status: document.status,
    chunkCount: document.chunkCount,
    charCount: document.charCount,
    error: document.error || "",
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
    ...(includeContent ? { content: document.content } : {})
})

const shapeJob = (job) => ({
    id: job._id.toString(),
    documentId: job.document.toString(),
    status: job.status,
    attempts: job.attempts,
    error: job.error || "",
    startedAt: job.startedAt?.toISOString?.() || null,
    finishedAt: job.finishedAt?.toISOString?.() || null,
    createdAt: job.createdAt.toISOString()
})

export const createDocument = async (req, res) => {
    const { title, content, kind = "text" } = req.body || {}

    if (typeof title !== "string" || !title.trim() || title.trim().length > 160) {
        return res.status(400).json({ error: "Title must be between 1 and 160 characters." })
    }
    if (typeof content !== "string" || content.trim().length < 20) {
        return res.status(400).json({ error: "Document content must be at least 20 characters." })
    }
    if (content.length > 200_000) {
        return res.status(413).json({ error: "Document is too large. Limit is 200,000 characters." })
    }
    if (!["text", "markdown"].includes(kind)) {
        return res.status(400).json({ error: "Kind must be text or markdown." })
    }

    try {
        const document = await libraryDocumentModel.create({
            user: req.user.id,
            title: title.trim(),
            content,
            kind,
            status: "queued",
            charCount: content.length
        })
        const job = await enqueueDocument({ documentId: document._id, userId: req.user.id })

        return res.status(202).json({
            document: shapeDocument(document),
            job: shapeJob(job)
        })
    } catch (error) {
        return res.status(500).json({ error: error.message })
    }
}

export const listDocuments = async (req, res) => {
    const documents = await libraryDocumentModel
        .find({ user: req.user.id })
        .sort({ createdAt: -1 })
        .limit(100)

    return res.json({ documents: documents.map((document) => shapeDocument(document)) })
}

export const getDocument = async (req, res) => {
    if (!isObjectId(req.params.documentId)) return res.status(404).json({ error: "Document not found." })

    const document = await libraryDocumentModel.findOne({
        _id: req.params.documentId,
        user: req.user.id
    })
    if (!document) return res.status(404).json({ error: "Document not found." })

    return res.json({ document: shapeDocument(document, true) })
}

export const deleteDocument = async (req, res) => {
    if (!isObjectId(req.params.documentId)) return res.status(404).json({ error: "Document not found." })

    const document = await libraryDocumentModel.findOneAndDelete({
        _id: req.params.documentId,
        user: req.user.id
    })
    if (!document) return res.status(404).json({ error: "Document not found." })

    await Promise.all([
        libraryChunkModel.deleteMany({ document: document._id, user: req.user.id }),
        ingestionJobModel.deleteMany({ document: document._id, user: req.user.id })
    ])

    return res.json({ ok: true })
}

export const reingestDocument = async (req, res) => {
    if (!isObjectId(req.params.documentId)) return res.status(404).json({ error: "Document not found." })

    const document = await libraryDocumentModel.findOne({
        _id: req.params.documentId,
        user: req.user.id
    })
    if (!document) return res.status(404).json({ error: "Document not found." })

    document.status = "queued"
    document.error = ""
    await document.save()
    const job = await enqueueDocument({ documentId: document._id, userId: req.user.id })

    return res.status(202).json({ document: shapeDocument(document), job: shapeJob(job) })
}

export const getJob = async (req, res) => {
    if (!isObjectId(req.params.jobId)) return res.status(404).json({ error: "Job not found." })

    const job = await ingestionJobModel.findOne({
        _id: req.params.jobId,
        user: req.user.id
    })
    if (!job) return res.status(404).json({ error: "Job not found." })

    return res.json({ job: shapeJob(job) })
}

export const searchDocuments = async (req, res) => {
    const query = typeof req.query.q === "string" ? req.query.q.trim() : ""
    if (!query) return res.status(400).json({ error: "A search query is required." })

    const results = await searchLibrary(req.user.id, query, 8)
    return res.json({ query, results })
}

export const getPublicLibraryDocument = async (req, res) => {
    const { shareId } = req.params
    if (typeof shareId !== "string" || shareId.length < 12) {
        return res.status(404).json({ error: "Document not found." })
    }

    const document = await libraryDocumentModel.findOne({
        shareId,
        status: "ready"
    })
    if (!document) return res.status(404).json({ error: "Document not found." })

    return res.json({
        title: document.title,
        kind: document.kind,
        content: document.content,
        chunkCount: document.chunkCount
    })
}
