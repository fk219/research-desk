import mongoose from "mongoose"

const chatSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        title: {
            type: String,
            required: true,
            trim: true,
            default: "New Chat"
        },
        pinned: {
            type: Boolean,
            default: false
        },
        shared: {
            type: Boolean,
            default: false
        },
        // Created lazily on the first share so old chats need no migration.
        shareId: {
            type: String,
            unique: true,
            sparse: true,
            index: true
        },
    },  {timestamps: true}
)

const chatModel = mongoose.model("Chats", chatSchema)

export {chatModel}