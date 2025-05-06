const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const upload = multer({ dest: 'public/images/skins/', limits: { fileSize: 1 * 1024 * 1024 }});

const app = express();
const PORT = 3000;

function deletingFiles(uploadedFileName, resultFileName) {
	setTimeout(() => {
		const filesToDelete = [
			path.join(__dirname, '../public/images/skins', uploadedFileName),
			path.join(__dirname, '../public/images/results', resultFileName)
		];

		filesToDelete.forEach(file => {
			fs.unlink(file, (err) => {
				if (err.code !== 'ENOENT') { console.error(`[!] Error deleting ${file}:`, err); }
			});
		});
	}, 1 * 60 * 1000);
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, '../public')));

app.get('/', (req, res) => res.render('index'));
app.get('/result', (req, res) => res.render('result'));
app.post('/upload', upload.single('file'), (req, res) => {
	if (!req.file) {
		return res.status(400).send('No file uploaded.');
	}

	const skinFilePath = req.file.path;
	const outputFilePath = path.join('public/images/results/', `result_${Date.now()}.png`);

	sharp(skinFilePath)
		.extract({ width: 8, height: 8, left: 8, top: 8 })
		.resize(1280, 1280, { kernel: sharp.kernel.nearest })
		.toBuffer()
		.then((layer1) => {
			return sharp(skinFilePath)
				.extract({
					width: 8,
					height: 8,
					left: 40,
					top: 8
				})
				.resize(1280, 1280, { kernel: sharp.kernel.nearest })
				.toBuffer()
				.then((layer2) => {
					return sharp({
                        create: {
                            width: 1280,
                            height: 1280,
                            channels: 4,
                            background: { r: 0, g: 0, b: 0, alpha: 0 }
                        }
                    })
                    .composite([{ input: layer1 }, { input: layer2 }])
                    .toFile(outputFilePath)
                    .then(() => {
                        res.json({
                            success: true,
                            fileUrl: `/images/results/${path.basename(outputFilePath)}`,
                            fileName: `${path.basename(outputFilePath)}`
                        });
                        deletingFiles(req.file.filename, `${path.basename(outputFilePath)}`);
                    });
				});
		})
		.catch((err) => {
			console.error('Error processing image:', err);
			res.status(500).send('An error occurred during image processing.');
		});
});

app.listen(PORT, () => {
	console.log(`[!] Server running at http://localhost:${PORT}`);
});