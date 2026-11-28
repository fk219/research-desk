import { ingestionJobModel, libraryChunkModel, libraryDocumentModel } from "../models/library.model.js"
import { chunkText, embedText, makeShareId, tokenize } from "./library.service.js"

const processJob = async (jobId) => {
    const job = await ingestionJobModel.findById(jobId)
    if (!job) return

    const document = await libraryDocumentModel.findOne({
        _id: job.document,
        user: job.user
    })
    if (!document) {
        job.status = "failed"
        job.error = "Document no longer exists."
        job.finishedAt = new Date()
        await job.save()
        return
    }

    try {
        job.status = "processing"
        job.attempts += 1
        job.startedAt = new Date()
        job.error = ""
        await job.save()

        document.status = "processing"
        document.error = ""
        await document.save()

        const chunks = chunkText(document.content)
        if (!chunks.length) throw new Error("Document has no readable text.")

        await libraryChunkModel.deleteMany({ document: document._id })
        await libraryChunkModel.insertMany(
            chunks.map((text, index) => ({
                user: document.user,
                document: document._id,
                index,
                text,
                terms: [...new Set(tokenize(text))].slice(0, 500),
                embedding: embedText(text)
            }))
        )

        document.status = "ready"
        document.chunkCount = chunks.length
        document.charCount = document.content.length
        document.shareId = document.shareId || makeShareId()
        document.error = ""
        await document.save()

        job.status = "ready"
        job.finishedAt = new Date()
        await job.save()
    } catch (error) {
        const message = error instanceof Error ? error.message : "Ingestion failed."
        document.status = "failed"
        document.error = message
        await document.save().catch(() => undefined)

        job.status = "failed"
        job.error = message
        job.finishedAt = new Date()
        await job.save().catch(() => undefined)
        console.error("Library ingestion failed:", message)
    }
}

export const enqueueDocument = async ({ documentId, userId }) => {
    const job = await ingestionJobModel.create({
        user: userId,
        document: documentId,
        status: "queued"
    })

    // In-process worker: the API returns immediately, while chunks are built
    // in the background. A durable queue is the next scale step.
    setImmediate(() => {
        void processJob(job._id)
    })

    return job
}

export const resumeQueuedJobs = async () => {
    const jobs = await ingestionJobModel.find({
        status: { $in: ["queued", "processing"] }
    })
    for (const job of jobs) {
        if (job.status === "processing") {
            job.status = "queued"
            await job.save()
        }
        setImmediate(() => {
            void processJob(job._id)
        })
    }
    return jobs.length
}
