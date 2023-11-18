const express = require('express');
const fs = require('fs');
const imgRouter = require('./server/routes/img');

const app = express();

app.use('/', imgRouter);
app.use(express.static('public'));

app.get('/', function (req, res) {
    fs.readFile('index.html', 'utf8', function (err, data) {
        if (err) {
            console.error(err);
            res.status(500).send('Internal Server Error');
        } else {
            res.send(data);
        }
    });
  })

// port number
app.listen(80, () => {
    console.log("listening...");
});