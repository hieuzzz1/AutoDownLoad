const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream');

const releaseMap = {
  TiktokGlobal: 'https://github.com/hieuzzz1/AutoDownLoad/releases/download/v1/TiktokGlobal.apk',
  QQBrowserService: 'https://github.com/hieuzzz1/AutoDownLoad/releases/download/v1/QQBrowserService.apk',
};

// Logic tải file APK hoặc EXE
const downloadApk = (req, res) => {
  const fileName = req.params.fileName || 'Text';
  const possibleExtensions = ['apk', 'exe'];
  let filePath;
  let fileExt;

  // 1) Thử tìm file cục bộ
  for (const ext of possibleExtensions) {
    const tempPath = path.join(__dirname, '../apk', `${fileName}.${ext}`);
    if (fs.existsSync(tempPath)) {
      filePath = tempPath;
      fileExt = ext;
      break;
    }
  }

  // 2) Nếu KHÔNG có file cục bộ -> redirect sang GitHub Releases nếu có cấu hình
  if (!filePath) {
    const ghUrl = releaseMap[fileName];
    if (ghUrl) {
      return res.redirect(302, ghUrl);
    }
    return res.status(404).send('File không tồn tại.');
  }

  const contentType = fileExt === 'apk'
    ? 'application/vnd.android.package-archive'
    : 'application/x-msdownload';

  const stat = fs.statSync(filePath);
  res.setHeader('Content-Length', stat.size);
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}.${fileExt}"`);
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Content-Encoding', 'identity');

  const fileStream = fs.createReadStream(filePath, { highWaterMark: 16 * 1024 * 1024 });
  pipeline(fileStream, res, (err) => {
    if (err) {
      console.error(`Lỗi tải file ${fileName}.${fileExt}:`, err);
      if (!res.headersSent) res.status(500).send('Có lỗi xảy ra khi tải file.');
    } else {
      console.log(`Hoàn tất tải ${fileName}.${fileExt}`);
    }
  });
};

// Routes
router.get('/', (req, res) => res.sendFile('index.html', { root: './views' }));
router.get('/ping', (req, res) => res.send(''));
router.get('/download/:fileName?', downloadApk);
router.get('/about', (req, res) => res.send(''));

module.exports = router;