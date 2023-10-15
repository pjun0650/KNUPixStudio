const express = require('express');
const router = express.Router(); // app.post, app.get을 이 파일에서도 할 수 있도록 해줍니다. router.post, router.get
const multer = require('multer');
const mysql = require('mysql2');
const { BlobServiceClient, StorageSharedKeyCredential } = require("@azure/storage-blob");
require('dotenv').config();

console.log(process.env.FS_ACCOUNT_NAME);
// Azure blob storage
const accountName = process.env.FS_ACCOUNT_NAME;
const accountKey = process.env.FS_ACCOUNT_KEY;
const containerName = process.env.FS_CONTAINER_NAME;
const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
const blobServiceClient = new BlobServiceClient(`https://${accountName}.blob.core.windows.net`, sharedKeyCredential);
const containerClient = blobServiceClient.getContainerClient(containerName);

// AWS MySQL
const connection = mysql.createConnection({ 
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
});
connection.connect((err) => {
    if (err) {
      console.error('DB 연결 실패: ' + err.message);
      return;
    }
    console.log('DB 연결 성공');
}); 

function generateID() {
  while (true) {
      const id = String(Math.floor(100000 + Math.random() * 900000)); // 100000 ~ 999999
      
      const query = `SELECT COUNT(*) as count FROM TEMP_IMAGE WHERE ID = ?`;
      connection.query(query, [id], (err, results) => {
        if (err) {
          console.error('ID 중복 확인 오류: ' + err);
          return;
        }
        if (results[0].count > 0) {
          id = -1; // 중복일 경우 -1, 다시 시도
        }
      });

      if (id != -1) {
          return id;
      }
  }
}

// post 시 서버 메모리에 이미지 임시 저장
const storage = multer.memoryStorage();
const upload = multer({ storage });

// POST, 이미지 파일 서버에 업로드 후 데이터베이스에 정보 저장
router.post('/upload', upload.single('img'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send('이미지 업로드 실패');
    }
    console.log(req.file);

    const newID = generateID();
    console.log('ID:', newID);

    const blobName = newID + req.file.originalname.substring(req.file.originalname.lastIndexOf('.'));
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.upload(req.file.buffer, req.file.size);
    console.log("azure에 이미지 업로드 성공")

    const insertQuery = 'INSERT INTO TEMP_IMAGE (ID, Save_path, Save_time) VALUES (?, ?, ?)';
    const values = [newID, blobName, new Date()];
    connection.query(insertQuery, values, (err, results) => {
      if (err) {
        console.error('데이터 삽입 실패: ' + err.message);
        return res.status(500).send('이미지 등록 실패');
      }
      console.log('DB 저장 성공');
      res.json({ message: "이미지 저장 성공", newID });
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('이미지 업로드 실패');
  }
});

// GET, 데이터베이스에서 정보 불러온 후 파일 서버에서 이미지 다운로드 및 삭제(DB, 파일 서버 모두)
router.get('/temp_image/:id', async (req, res) => { 
    const { id } = req.params
    console.log('이미지 요청: ', id);

    const selectQuery = 'SELECT * FROM TEMP_IMAGE WHERE id = ?';
    connection.query(selectQuery, [ id ], async (err, results) => {
        if (err) {
          console.error('DB 불러오기 실패: ' + err.message);
          return res.status(500).send('DB 불러오기 실패');
        }
        console.log('DB 불러오기 성공', results);

        try {
          const blockBlobClient = containerClient.getBlockBlobClient(results[0].Save_path);
          temp_image = await blockBlobClient.download();

          if (temp_image.readableStreamBody) {
            temp_image.readableStreamBody.pipe(res);
            console.log('이미지 불러오기 성공');

            // // (else문 이전까지) 호출하면 db와 파일 서버에서 삭제
            // const deleteQuery = 'DELETE FROM TEMP_IMAGE WHERE id = ?';
            // connection.query(deleteQuery, [ id ], async (err, results) => {
            //   if (err) {
            //     console.error('DB에서 삭제 실패: ' + err.message);
            //     return res.status(500).send('DB 처리 실패');
            //   }
            //   console.log('DB에서 삭제 성공');

            //   try {
            //     await blockBlobClient.delete();
            //     console.log("azure에서 삭제 성공")
            //   } catch {
            //     console.log("azure에서 삭제 실패 성공")
            //     res.status(500).send('이미지 파일 처리 실패');
            //   }
            // });
          } else {
            res.status(404).send("이미지 찾기 실패");
          }
        } catch (error) {
          res.status(500).send('해당 ID 없음');
        }
    });
});

module.exports = router;