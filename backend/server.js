const { google } = require("googleapis");
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const admin = require("firebase-admin");
const { cert } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");
const { getFirestore } = require("firebase-admin/firestore");

const serviceAccount = JSON.parse(
    Buffer.from(
        process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,
        "base64"
    ).toString("utf8")
);

admin.initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();
const app = express();
const processingReminders = new Set();

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

app.post("/send-notification", async (req, res) => {
    try {
        const { token, title, body } = req.body;

        if (!token) {
            return res.status(400).json({
                error: "FCM token is required"
            });
        }

        const message = {
            token: token,
            notification: {
                title: title || "Abel Study Planner",
                body: body || "Notification test"
            }
        };

        const response = await getMessaging().send(message);

        res.json({
            success: true,
            messageId: response
        });

    } catch (error) {
        console.error("FCM error:", error);

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =========================
// CREATE REMINDER
// =========================
app.post("/create-reminder", async (req, res) => {
    try {
        const { token, title, dateTime } = req.body;

        if (!token || !title || !dateTime) {
            return res.status(400).json({
                success: false,
                error: "token, title and dateTime are required"
            });
        }

        const existingSnapshot = await db
    .collection("reminders")
    .where("token", "==", token)
    .where("title", "==", title)
    .where("dateTime", "==", dateTime)
    .limit(1)
    .get();

if (!existingSnapshot.empty) {
    const existingDoc = existingSnapshot.docs[0];

    return res.json({
        success: true,
        duplicate: true,
        reminder: {
            id: existingDoc.id,
            ...existingDoc.data()
        }
    });
}

const reminder = {
    token,
    title,
    dateTime,
    createdAt: new Date().toISOString()
};

const docRef = await db.collection("reminders").add(reminder);
        const savedReminder = {
            id: docRef.id,
            ...reminder
        };

        console.log("Reminder saved to Firestore:", savedReminder);

        res.json({
            success: true,
            reminder: savedReminder
        });

    } catch (error) {
        console.error("Reminder error:", error);

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
app.get("/reminders", async (req, res) => {
    try {
        const snapshot = await db
            .collection("reminders")
            .orderBy("dateTime", "asc")
            .get();

        const reminders = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.json({
            success: true,
            reminders
        });

    } catch (error) {
        console.error("Get reminders error:", error);

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =========================
// REMINDER SCHEDULER
// =========================
setInterval(async () => {
    try {
        const now = new Date();

        const snapshot = await db
            .collection("reminders")
            .get();

        for (const doc of snapshot.docs) {
            const reminder = {
                id: doc.id,
                ...doc.data()
            };

            // Prevent duplicate notification
            if (processingReminders.has(reminder.id)) {
                continue;
            }

            const reminderTime = new Date(reminder.dateTime);

            if (now >= reminderTime) {

                processingReminders.add(reminder.id);

                try {
                    const message = {
                        token: reminder.token,
                        notification: {
                            title: reminder.title,
                            body: `Igihe cya reminder yawe kirageze.`
                        }
                    };

                    const response = await getMessaging().send(message);

                    console.log(
                        "Reminder notification sent:",
                        reminder.id,
                        response
                    );

                    // Delete after successful notification
                    await db
                        .collection("reminders")
                        .doc(reminder.id)
                        .delete();

                } catch (error) {
                    console.error(
                        "Reminder notification error:",
                        reminder.id,
                        error.message
                    );

                } finally {
                    processingReminders.delete(reminder.id);
                }
            }
        }

    } catch (error) {
        console.error(
            "Reminder scheduler error:",
            error.message
        );
    }
}, 60000);

// =========================
// SERVER
// =========================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);
});