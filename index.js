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

// 📹 **Setup Multer for Memory Storage**
const upload = multer({
	storage: multer.memoryStorage(),
});

// 🎥 **Stream RTMP via FFmpeg**
let videoStream = new PassThrough();
let isStreaming = false;

function startStreaming() {
	if (isStreaming) return;
	isStreaming = true;

	ffmpeg(videoStream)
		.inputFormat('webm') // Match frontend mimeType
		.videoCodec('libx264')
		.audioCodec('aac')
		.outputOptions([
			'-preset veryfast',
			'-b:v 4500k',
			'-maxrate 4500k',
			'-bufsize 9000k',
			'-pix_fmt yuv420p',
			'-r 30',
			'-g 60',
			'-c:a aac',
			'-b:a 128k',
			'-ar 44100',
			'-f flv',
		])
		.on('start', (commandLine) => {
			console.log('FFmpeg started:', commandLine);
		})
		.on('error', (err) => {
			console.error('FFmpeg error:', err);
			isStreaming = false;
		})
		.on('end', () => {
			console.log('Streaming ended');
			isStreaming = false;
		})
		.save('rtmp://a.rtmp.youtube.com/live2/59sy-wt1h-ptj9-u4h4-9dde');
}

// 🎯 **Route to Receive Video Chunks**
app.post('/upload', upload.single('video'), (req, res) => {
	if (!req.file || !req.file.buffer) {
		console.error('No video data received.');
		return res.status(400).send('No video data received.');
	}

	try {
		if (!isStreaming) {
			startStreaming();
		}

		videoStream.write(req.file.buffer);
		res.status(200).send('Chunk received');
	} catch (error) {
		console.error('Error processing chunk:', error);
		res.status(500).send('Error processing chunk');
	}
});

// 🛑 **Stop Streaming**
app.post('/stop', (req, res) => {
	try {
		videoStream.end();
		isStreaming = false;
		console.log('Streaming stopped');
		res.status(200).send('Streaming stopped');
	} catch (error) {
		console.error('Error stopping stream:', error);
		res.status(500).send('Error stopping stream');
	}
});

// 🏠 **Health Check**
app.get('/', (req, res) => {
	res.send('RTMP Backend is running');
});

// 🚀 **Start the Server**
app.listen(port, () => {
	console.log(`🎯 Backend is running on http://localhost:${port}`);
});