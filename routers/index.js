const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream');

// Logic tải file APK hoặc EXE
const downloadFile = (req, res) => {
    const fileName = req.params.fileName;
    if (!fileName) {
        return res.status(400).send('Thiếu tên file.');
    }

    // Xác định phần mở rộng hợp lệ
    const allowedExtensions = ['apk', 'exe'];
    const fileExtension = path.extname(fileName).toLowerCase().replace('.', '');

    if (!allowedExtensions.includes(fileExtension)) {
        return res.status(400).send('Định dạng file không hợp lệ.');
    }

    // Đường dẫn thư mục chứa file
    const filePath = path.join(__dirname, '../files', fileName);

    // Kiểm tra file tồn tại
    if (!fs.existsSync(filePath)) {
        return res.status(404).send('File không tồn tại.');
    }

    // Lấy thông tin file
    const stat = fs.statSync(filePath);
    res.setHeader('Content-Length', stat.size);

    // Xác định Content-Type
    const contentTypes = {
        apk: 'application/vnd.android.package-archive',
        exe: 'application/octet-stream',
    };

    res.setHeader('Content-Type', contentTypes[fileExtension] || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Content-Encoding', 'identity');

    // Tạo stream với buffer size 16MB
    const fileStream = fs.createReadStream(filePath, { highWaterMark: 16 * 1024 * 1024 });

    // Sử dụng pipeline để truyền dữ liệu
    pipeline(fileStream, res, (err) => {
        if (err) {
            console.error(`Lỗi tải file ${fileName}:`, err);
            if (!res.headersSent) {
                res.status(500).send('Có lỗi xảy ra khi tải file.');
            }
        } else {
            console.log(`Hoàn tất tải ${fileName}`);
        }
    });
};

// Route tải file với cả APK và EXE
router.get('/download/:fileName', downloadFile);

module.exports = router;
