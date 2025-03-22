const express = require('express');
const fetch = require('node-fetch');
const app = express();
const port = process.env.PORT || 3000;

// Lấy URL từ biến môi trường hoặc mặc định localhost
const APP_URL = process.env.APP_URL || `http://localhost:${port}`;

app.use(express.static('public'));
const indexRouter = require('./routers/index'); // Sửa 'routers' thành 'routes'
app.use('/', indexRouter);

// Tự ping để giữ server không ngủ
const keepAlive = () => {
    setInterval(async () => {
        try {
            const url = `${APP_URL}/ping`;
            await fetch(url);
            console.log(`Pinged ${url} to keep alive`);
        } catch (err) {
            console.error('Ping failed:', err);
        }
    }, 14 * 60 * 1000); // Ping mỗi 14 phút
};

app.listen(port, () => {
    console.log(`Server đang chạy tại ${APP_URL}`);
    keepAlive(); // Bắt đầu tự ping
});