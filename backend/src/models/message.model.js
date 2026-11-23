import mongoose from "mongoose"

const messageSchema = new mongoose.Schema(
    {
        chat: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Chats",
            required: true
        },
        content:{
            type: String,
            required: true,
        },
        role: {
            type: String,
            required: true,
            enum: ["user", "ai"]
        },
        // Sources captured from the search tool for this answer. Older
        // messages simply have no sources, which the reader handles.
        sources: {
            type: [
                {
                    _id: false,
                    title: { type: String, trim: true, default: "" },
                    url: { type: String, trim: true, default: "" },
                    snippet: { type: String, trim: true, default: "" }
                }
            ],
            default: undefined
        }

    }, {timestamps: true}
)

const messageModel = mongoose.model("Messages", messageSchema)

export {messageModel}