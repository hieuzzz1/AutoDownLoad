const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream');

// Logic tải file APK
const downloadApk = (req, res) => {
    const fileName = req.params.fileName || 'Text'; // Nếu không có params thì mặc định là 'Text'
    const filePath = path.join(__dirname, '../apk', `${fileName}.apk`);
    // Kiểm tra file tồn tại
    if (!fs.existsSync(filePath)) {
        return res.status(404).send('File không tồn tại.');
    }

    // Lấy thông tin file (stat) chỉ 1 lần
    const stat = fs.statSync(filePath);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}.apk"`);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Content-Encoding', 'identity'); // Tắt nén tự động

    // Tạo stream với buffer size 16MB
    const fileStream = fs.createReadStream(filePath, {
        highWaterMark: 16 * 1024 * 1024 // Buffer 16MB
    });

    // Sử dụng pipeline để truyền dữ liệu
    pipeline(
        fileStream,
        res,
        (err) => {
            if (err) {
                console.error(`Lỗi tải file ${fileName}.apk:`, err);
                if (!res.headersSent) {
                    res.status(500).send('Có lỗi xảy ra khi tải file.');
                }
            } else {
                console.log(`Hoàn tất tải ${fileName}.apk`);
            }
        }
    );
};

// Route cho trang chủ (giữ nguyên)
router.get('/', (req, res) => {
    res.sendFile('index.html', { root: './views' });
});

// Route để tải file APK với tham số fileName
router.get('/download/:fileName?', downloadApk);

// Route cho trang "about" (giữ nguyên)
router.get('/about', (req, res) => {
    res.send('<h1>Trang About</h1>');
});

module.exports = router;