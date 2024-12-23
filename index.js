const { STREAM_KEY, STREAM_SERVER } = require("./env");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const multer = require("multer");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { PassThrough } = require("stream");
const ffmpeg = require("fluent-ffmpeg");
ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());
app.use(bodyParser.json());
const upload = multer({
  storage: multer.memoryStorage(),
});

app.post("/test", upload.single("video"), (req, res) => {
  if (!req.file || !req.file.buffer) {
    console.error("No video data received from frontend.");
    return res.status(400).send("No video data received.");
  }

  console.log(`Received video buffer of size: ${req.file.buffer.length} bytes`);
  const videoStream = new PassThrough();
  videoStream.end(req.file.buffer);

  var command = ffmpeg(videoStream, { option: "value" });

  try {
    command
      .inputOptions("-stream_loop -1")

      .outputOptions([
        "-r 30",
        "-c:v libx264",
        "-preset veryfast",
        "-b:v 4500k",
        "-maxrate 4500k",
        "-bufsize 9000k",
        "-c:a aac",
        "-b:a 128k",
        "-ar 44100",
        "-f flv",
      ])
      .on("start", (commandLine) => {
        console.log("FFmpeg started with command:", commandLine);
      })
      .on("progress", (progress) => {
        console.log(progress);
        console.log(`Processing: ${progress.frames} frames`);
      })
      .on("error", (err) => {
        console.error("Error:-", err);
      })
      .on("end", () => {
        console.log("Stream ended");
      })
      .save(rtmpUrl);
  } catch (e) {
    console.log("CATCH", e);
  }
});
app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

const rtmpUrl = `rtmp://127.0.0.1/live/Hy90JoVSJg`;
