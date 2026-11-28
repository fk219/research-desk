import mongoose from "mongoose"

const documentSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 160
        },
        kind: {
            type: String,
            enum: ["text", "markdown"],
            default: "text"
        },
        content: {
            type: String,
            required: true
        },
        status: {
            type: String,
            enum: ["queued", "processing", "ready", "failed"],
            default: "queued",
            index: true
        },
        shareId: {
            type: String,
            unique: true,
            sparse: true,
            index: true
        },
        charCount: {
            type: Number,
            default: 0
        },
        chunkCount: {
            type: Number,
            default: 0
        },
        error: {
            type: String,
            default: ""
        }
    },
    { timestamps: true }
)

documentSchema.index({ user: 1, createdAt: -1 })
documentSchema.index({ user: 1, status: 1 })

const libraryDocumentModel = mongoose.model("LibraryDocument", documentSchema)

const libraryChunkSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        document: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "LibraryDocument",
            required: true,
            index: true
        },
        index: {
            type: Number,
            required: true
        },
        text: {
            type: String,
            required: true
        },
        terms: {
            type: [String],
            default: []
        },
        embedding: {
            type: [Number],
            default: []
        }
    },
    { timestamps: true }
)

libraryChunkSchema.index({ document: 1, index: 1 }, { unique: true })
libraryChunkSchema.index({ user: 1, document: 1 })

const libraryChunkModel = mongoose.model("LibraryChunk", libraryChunkSchema)

const ingestionJobSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        document: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "LibraryDocument",
            required: true,
            index: true
        },
        status: {
            type: String,
            enum: ["queued", "processing", "ready", "failed"],
            default: "queued",
            index: true
        },
        attempts: {
            type: Number,
            default: 0
        },
        error: {
            type: String,
            default: ""
        },
        startedAt: Date,
        finishedAt: Date
    },
    { timestamps: true }
)

ingestionJobSchema.index({ document: 1, createdAt: -1 })
ingestionJobSchema.index({ status: 1, createdAt: 1 })

const ingestionJobModel = mongoose.model("IngestionJob", ingestionJobSchema)

export { libraryDocumentModel, libraryChunkModel, ingestionJobModel }
