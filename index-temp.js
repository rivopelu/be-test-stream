// Dependencies
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const multer = require("multer");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { PassThrough } = require("stream");
const ffmpeg = require("fluent-ffmpeg");
ffmpeg.setFfmpegPath(ffmpegPath);

// App Initialization
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());
app.use(bodyParser.json());

// Multer Setup for Memory Storage
const upload = multer({
    storage: multer.memoryStorage(),
    // fileFilter: (req, file, cb) => {
    //   if (file.mimetype === 'video/webm' || file.mimetype === 'video/mp4') {
    //     cb(null, true);
    //   } else {
    //     cb(new Error('Only video files are allowed!'), false);
    //   }
    // }
});

app.post("/test", upload.single("video"), (req, res) => {
    if (!req.file || !req.file.buffer) {
        console.error("No video data received from frontend.");
        return res.status(400).send("No video data received.");
    }

    console.log(`Received video buffer of size: ${req.file.buffer.length} bytes`);

    // Determine Input Format Dynamically
    // const mime = req.file.mimetype; // e.g., 'video/webm'
    // const format = mime.split('/')[1]; // Extract 'webm'
    // console.log(`Detected format: ${format}`);

    // Create a PassThrough Stream
    const videoStream = new PassThrough();
    //   videoStream.end(req.file.buffer);
    videoStream.write(req.file.buffer);

    try {
        ffmpeg(videoStream)
            // .inputFormat(format) // Use dynamically detected format
            .inputFormat('webm') // Use dynamically detected format
            .inputOptions(['-re', '-loglevel debug']) // Read input at native frame rate
            .outputOptions([
                '-r 30',             // Frame rate
                '-c:v libx264',      // Video codec
                '-preset veryfast',  // Encoding preset
                '-b:v 2500k',        // Bitrate
                '-maxrate 4500k',
                '-bufsize 9000k',
                '-c:a aac',          // Audio codec
                '-b:a 128k',         // Audio bitrate
                '-ar 44100',         // Audio sample rate
                '-f flv'             // Output format for RTMP
            ])
            .on("start", (commandLine) => {
                console.log("FFmpeg started with command:", commandLine);
            })
            .on("progress", (progress) => {
                console.log(`Processing: ${progress.frames} frames`);
            })
            .on("error", (err) => {
                console.error("FFmpeg Error:", err.message);
                res.status(500).send("Streaming failed.");
            })
            .on("end", () => {
                console.log("Stream ended");
                res.status(200).send("Streaming successful.");
            })
            .save('rtmp://a.rtmp.youtube.com/live2/59sy-wt1h-ptj9-u4h4-9dde');
    } catch (e) {
        console.error("Streaming failed:", e);
        res.status(500).send("Streaming failed.");
    }
});

// Root Endpoint
app.get("/", (req, res) => {
    res.send("Hello World!");
});

// Start Server
app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});