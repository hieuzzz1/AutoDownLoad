const express = require('express');
const fetch = require('node-fetch'); // Đảm bảo dùng node-fetch@2
const app = express();
const port = process.env.PORT || 3000;

// Dùng biến môi trường APP_URL hoặc mặc định localhost khi chạy local
const APP_URL = process.env.APP_URL || `http://localhost:${port}`;

app.use(express.static('public'));
const cookieParser = require('cookie-parser');
app.use(cookieParser());

const indexRouter = require('./routers/index');
app.use('/', indexRouter);

const keepAlive = () => {
    setInterval(async () => {
        try {
            // Dùng URL cố định khi chạy trên Render
            const url = 'https://down-file.onrender.com';
            const response = await fetch(url);
            if (response.ok) {
                console.log(`Pinged ${url} to keep alive`);
            } else {
                console.error(`Ping failed with status: ${response.status}`);
            }
        } catch (err) {
            console.error('Ping failed:', err.message);
        }
    }, 13 * 60 * 1000); // Ping mỗi 14 phút
};

app.listen(port, () => {
    console.log(`Server đang chạy tại ${APP_URL}`);
    keepAlive();
});