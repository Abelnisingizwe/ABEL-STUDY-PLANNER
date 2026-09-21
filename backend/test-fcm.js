const http = require("http");

const data = JSON.stringify({
    token: "fx5QsULdhjNScVv0l3c9sC:APA91bFwbzf6Vcw11FaUwtc8OkYOdWgqhaXqnWon_scFRb-2blDtW1ezMUtkH2cAJHWmwCJ51zR917ccpSa0IN8b22FNetyXp6C8y5_MRFeL5TvyZhEGXqM",
    title: "Abel Study Planner",
    body: "Test notification yakoze neza!"
});

const options = {
    hostname: "localhost",
    port: 3000,
    path: "/send-notification",
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data)
    }
};

const req = http.request(options, (res) => {
    let body = "";

    res.on("data", chunk => {
        body += chunk;
    });

    res.on("end", () => {
        console.log("Status:", res.statusCode);
        console.log("Response:", body);
    });
});

req.on("error", (error) => {
    console.error("Request error:", error.message);
});

req.write(data);
req.end();