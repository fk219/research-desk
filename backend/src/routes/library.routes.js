import express from "express"
import { identifyUser } from "../middleware/auth.middleware.js"
import {
    createDocument,
    deleteDocument,
    getDocument,
    getJob,
    listDocuments,
    reingestDocument,
    searchDocuments
} from "../controllers/library.controller.js"

const libraryRouter = express.Router()

libraryRouter.use(identifyUser)

libraryRouter.get("/search", searchDocuments)
libraryRouter.get("/documents", listDocuments)
libraryRouter.post("/documents", createDocument)
libraryRouter.get("/documents/:documentId", getDocument)
libraryRouter.delete("/documents/:documentId", deleteDocument)
libraryRouter.post("/documents/:documentId/reingest", reingestDocument)
libraryRouter.get("/jobs/:jobId", getJob)

export default libraryRouter
