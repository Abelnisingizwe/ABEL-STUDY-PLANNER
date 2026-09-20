const { google } = require("googleapis");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

app.use(cors());
app.use(express.json());

app.get("/auth/google", (req, res) => {
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        scope: [
            "https://www.googleapis.com/auth/drive"
        ]
    });

    res.redirect(authUrl);
});

app.get("/oauth2callback", async (req, res) => {
    try {
        const { code } = req.query;

        if (!code) {
            return res.status(400).send("Authorization code is missing");
        }

        const { tokens } = await oauth2Client.getToken(code);

        console.log("Google OAuth successful");
        console.log("Refresh token received:", !!tokens.refresh_token);

        res.send(`
            <h2>Google Drive connected successfully</h2>
            <p>You can close this window.</p>
        `);

    } catch (error) {
        console.error("OAuth callback error:", error);
        res.status(500).send("Google OAuth failed");
    }
});

app.get("/", (req, res) => {
    res.json({
        message: "Abel Study Planner Backend is running"
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);
});