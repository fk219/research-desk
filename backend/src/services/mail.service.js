import nodemailer from "nodemailer"

const hasMailConfig = Boolean(process.env.GOOGLE_USER && process.env.GOOGLE_PASSWORD)

const transporter = hasMailConfig
    ? nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.GOOGLE_USER,
            pass: process.env.GOOGLE_PASSWORD
        }
    })
    : null

if (transporter) {
    transporter.verify()
    .then(() => {console.log("Email transporter is ready to send emails")})
    .catch((error) => {console.error("Error occurred while verifying email transporter:", error)})
}

const sendEmail = async (to, subject, html, text) => {
    if (!transporter) {
        console.warn("Email is not configured. Skipping message:", subject)
        return
    }

    const mailOptions = {
        from: process.env.GOOGLE_USER,
        to,
        subject,
        html,
        text
    }

    const details = await transporter.sendMail(mailOptions)

    console.log("Email sent successfully:", details)
}

export {sendEmail}