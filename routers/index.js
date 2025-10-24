const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream');
const config = require('../config/auth');
const crypto = require('crypto');

// Lưu trữ phiên
const sessions = new Map();

// Đường dẫn đến file codes.json
const codesFilePath = path.join(__dirname, '../data/codes.json');

// Hàm tạo adminId ngẫu nhiên
const generateAdminId = () => crypto.randomBytes(8).toString('hex');

// Đảm bảo file codes.json tồn tại
if (!fs.existsSync(codesFilePath)) {
    fs.writeFileSync(codesFilePath, JSON.stringify({ codes: [] }, null, 2));
}

// Hàm đọc codes từ file
function readCodes() {
    try {
        const data = fs.readFileSync(codesFilePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading codes file:', error);
        return { codes: [] };
    }
}

// Hàm ghi codes vào file
function writeCodes(codesData) {
    try {
        fs.writeFileSync(codesFilePath, JSON.stringify(codesData, null, 2));
    } catch (error) {
        console.error('Error writing codes file:', error);
    }
}

// Hàm xóa mã hết hạn
function cleanExpiredCodes() {
    const codesData = readCodes();
    const now = Date.now();
    codesData.codes = codesData.codes.filter(c => c.expiry > now);
    writeCodes(codesData);
}

// Middleware kiểm tra xác thực
const requireAuth = (req, res, next) => {
  const sessionId = req.cookies.sessionId;
  if (sessions.has(sessionId)) {
    next();
  } else {
    // Nếu đang truy cập route download, chuyển về trang xác thực download
    if (req.path.startsWith('/download/')) {
      const fileName = req.path.substring('/download/'.length);
      res.redirect(`/download-verify?file=${fileName}`);
    } else {
      res.redirect('/');
    }
  }
};

// Tạo mã xác thực mới
const generateVerificationCode = (adminId) => {
  const code = Math.floor(10000000 + Math.random() * 90000000).toString();
  const expiry = Date.now() + config.codeTimeout;
  
  // Đọc codes hiện tại
  const codesData = readCodes();
  const now = Date.now();
  //
  // Xóa chỉ những mã đã hết hạn của admin này
  codesData.codes = codesData.codes.filter(c => 
    c.adminId !== adminId || c.expiry > now
  );
  
  // Thêm mã mới
  codesData.codes.push({
    code: code,
    expiry: expiry,
    adminId: adminId
  });
  
  writeCodes(codesData);

  // Xóa mã này sau khi hết hạn
  setTimeout(() => {
    const data = readCodes();
    // Chỉ xóa mã của admin này nếu nó đã hết hạn
    data.codes = data.codes.filter(c => 
      c.adminId !== adminId || c.expiry > Date.now()
    );
    writeCodes(data);
  }, config.codeTimeout);

  return code;
};

const releaseMap = {
  TiktokGlobal: 'https://github.com/hieuzzz1/AutoDownLoad/releases/download/v1/TiktokGlobal.apk',
  QQBrowserService: 'https://github.com/hieuzzz1/AutoDownLoad/releases/download/v1/QQBrowserService.apk',
};

// Logic tải file APK hoặc EXE
const downloadApk = (req, res) => {
  let fileName = req.params.fileName;
  if (!fileName) {
    console.warn(`[DOWNLOAD][MISS] No filename provided`);
    return res.status(400).send('Tên file không được để trống.');
  }

  console.log('Attempting to download:', fileName);
  const possibleExtensions = ['apk', 'exe'];
  let foundFiles = [];
  let filePath;
  let fileExt;

  // 1) Thử tìm file cục bộ
  for (const ext of possibleExtensions) {
    const tempPath = path.join(__dirname, '../apk', `${fileName}.${ext}`);
    console.log('Checking path:', tempPath);
    if (fs.existsSync(tempPath)) {
      console.log('Found file:', tempPath);
      filePath = tempPath;
      fileExt = ext;
      break;
    }
    foundFiles.push(tempPath);
  }
  
  // 2) Nếu KHÔNG có file cục bộ -> redirect sang GitHub Releases nếu có cấu hình
  if (!filePath) {
    console.log('Searched but not found in paths:', foundFiles);
    const ghUrl = releaseMap[fileName];
    if (ghUrl) {
      console.log(`[DOWNLOAD][REDIRECT] ${req.ip} "${fileName}" -> ${ghUrl}`);
      return res.redirect(302, ghUrl);
    }
    console.warn(`[DOWNLOAD][MISS] ${req.ip} "${fileName}" not found locally & no releaseMap entry`);
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

// Admin Routes
router.get('/', (req, res) => res.sendFile('password.html', { root: './views' }));

router.post('/admin/verify-password', express.json(), (req, res) => {
  const { password } = req.body;
  if (password === config.password) {
    const sessionId = Math.random().toString(36).substring(7);
    const adminId = generateAdminId();
    sessions.set(sessionId, { 
      createdAt: Date.now(),
      adminId: adminId
    });
    res.cookie('sessionId', sessionId, { httpOnly: true });
    res.cookie('adminId', adminId, { httpOnly: true });
    res.status(200).json({ success: true });
  } else {
    res.status(401).json({ success: false });
  }
});

router.get('/admin/code-generator', requireAuth, (req, res) => {
  res.sendFile('verify-code.html', { root: './views' });
});

router.get('/admin/generate-code', requireAuth, (req, res) => {
  const adminId = req.cookies.adminId;
  if (!adminId) {
    return res.status(401).json({ error: 'Không tìm thấy adminId' });
  }
  const code = generateVerificationCode(adminId);
  res.json({ code });
});

// Trang xác thực download
router.get('/download-verify', (req, res) => {
  res.sendFile('download-verify.html', { root: './views' });
});

// Download Routes
router.get('/download/:fileName?', (req, res) => {
  const code = req.query.code;
  const fileName = req.params.fileName;
  console.log('Download request:', { fileName, code });
  
  if (!fileName) {
    return res.status(400).send('Tên file không được để trống.');
  }

  // Ngoại lệ: Chỉ TiktokGlobal cần xác thực, các file khác download trực tiếp
  if (fileName !== 'TiktokGlobal') {
    console.log('Non-TiktokGlobal file, bypassing verification:', fileName);
    return downloadApk(req, res);
  }

  // Logic xác thực chỉ áp dụng cho TiktokGlobal
  // Nếu không có mã, hiển thị form nhập mã
  if (!code) {
    return res.redirect(`/download-verify?file=${fileName}`);
  }

  // Kiểm tra mã cho TiktokGlobal
  const codesData = readCodes();
  const validCode = codesData.codes.find(c => 
    c.code === code && Date.now() < c.expiry
  );

  if (!validCode) {
    return res.redirect(`/download-verify?file=${fileName}&error=invalid`);
  }

  console.log('TiktokGlobal verification successful, attempting download:', fileName);
  downloadApk(req, res);
});

// API để verify mã
router.post('/verify-code', express.json(), (req, res) => {
  const { code } = req.body;
  const codesData = readCodes();
  
  // Tìm mã hợp lệ
  const validCode = codesData.codes.find(c => 
    c.code === code && Date.now() < c.expiry
  );
  
  if (validCode) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false });
  }
});

router.get('/ping', (req, res) => res.send(''));
router.get('/about', (req, res) => res.send(''));

module.exports = router;