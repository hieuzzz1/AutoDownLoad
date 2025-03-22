const express = require('express');
const app = express();
const port = process.env.PORT || 3000; // Sử dụng PORT từ biến môi trường hoặc mặc định 3000

app.use(express.static('public'));
const indexRouter = require('./routes/index');
app.use('/', indexRouter);

app.listen(port, () => {
    console.log(`Server đang chạy tại http://localhost:${port}`);
});