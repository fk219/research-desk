import 'dotenv/config';

import http from "http"
import { app } from './src/app.js';
import { connectDB } from './src/config/database.js';
import { resumeQueuedJobs } from './src/services/ingestion.service.js';

const port = process.env.PORT || 3000;

const httpServer = http.createServer(app)

connectDB()
.then(async () => {
    const resumed = await resumeQueuedJobs();
    if (resumed) console.log(`Resumed ${resumed} library ingestion job(s).`);
})
.catch((err)=>{
    console.error("MongoDB Connection Failed! ", err)
    process.exit(1)
});

httpServer.listen(port, () => {
    console.log(`Server is running on port http://localhost:${port}`);
});