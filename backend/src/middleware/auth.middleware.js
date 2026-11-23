import { userModel } from "../models/user.model.js"
import jwt from "jsonwebtoken"


const identifyUser = async (req, res, next) => {
    const token = req.cookies.token

    if(!token){
        return res.status(401).json({
            message: "No Token Found",
            status: false,
            err: 'No Token Provided'
        })
    }

    try{
        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        const user = await userModel.findById(decoded.id).select("_id username email verified tokenVersion")

        if (!user) {
            return res.status(401).json({
                message: "Session no longer valid. Sign in again.",
                status: false,
                err: "User Not Found"
            })
        }

        // Any cookie issued before the last logout carries an older version.
        if ((decoded.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
            return res.status(401).json({
                message: "Session ended. Sign in again.",
                status: false,
                err: "Session Revoked",
                code: "SESSION_REVOKED"
            })
        }

        req.user = {
            id: user._id.toString(),
            email: user.email,
            username: user.username
        }
        next()

    }catch(err){
        return res.status(401).json({
            message: "Unauthorised",
            status: false,
            err: "Invalid Token"
        })
    }
}


export {identifyUser}
