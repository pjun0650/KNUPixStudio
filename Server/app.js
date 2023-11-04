const express = require('express');
const fs = require('fs');
const imgRouter = require('./routes/img');

const app = express();

app.use('/', imgRouter);

app.get('/', function (req, res) {
    fs.readFile('test.html', 'utf8', function (err, data) {
        if (err) {
            console.error(err);
            res.status(500).send('Internal Server Error');
        } else {
            res.send(data);
        }
    });
  })

// 3000 port
app.listen(3000, () => {
    console.log("listening...");
});