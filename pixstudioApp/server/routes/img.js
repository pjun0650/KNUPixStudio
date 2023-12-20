const express = require('express');
const router = express.Router(); // app.post, app.get을 이 파일에서도 할 수 있도록 해줍니다. router.post, router.get
const multer = require('multer');
const mysql = require('mysql2');
const { BlobServiceClient, StorageSharedKeyCredential } = require("@azure/storage-blob");
require('dotenv').config();
const schedule = require('node-schedule');
const bodyParser = require('body-parser')

// Azure blob storage
const accountName = process.env.FS_ACCOUNT_NAME;
const accountKey = process.env.FS_ACCOUNT_KEY;
const containerName = process.env.FS_CONTAINER_NAME;
const sharedKeyCredential = accountName ? new StorageSharedKeyCredential(accountName, accountKey) : "";
const blobServiceClient = accountName ? new BlobServiceClient(`https://${accountName}.blob.core.windows.net`, sharedKeyCredential) : "";
const containerClient = containerName ? blobServiceClient.getContainerClient(containerName) : "";

// AWS MySQL
const dbHost = process.env.DB_HOST;
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;
const dbDatabase = process.env.DB_DATABASE;

function generateID(connection) {
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
const upload = multer({ storage, limits: { fieldSize: 1024 * 1024 * 1024 } }); // 1 GB 제한
const uploadFields = upload.fields([{name: "canvas"}, {name: "backgroundImage"}, {name: "icons"}, {name: "imageobjects"}, {name: "canvassize"}]);

// POST, 이미지 파일 서버에 업로드 후 데이터베이스에 정보 저장
router.post('/upload.php', uploadFields, (req, res) => {
  try {
    if (!req.body) {
      return res.status(400).send('프로젝트 업로드 실패');
    }
    if (!dbHost || !containerClient) {
      return res.status(500).send('파일 서버 혹은 데이터베이스 서버 연결 실패');
    }

    const connection = mysql.createConnection({ 
        host: dbHost,
        user: dbUser,
        password: dbPassword,
        database: dbDatabase
    });
    connection.connect((err) => {
        if (err) {
          console.error('DB 연결 실패: ' + err.message);
          return res.status(500).send('DB 연결 실패');
        }
    }); 

    const newID = generateID(connection);
    const blobName = newID + ".json";

    const insertQuery = 'INSERT INTO TEMP_IMAGE (ID, Save_path, Save_time) VALUES (?, ?, ?)';
    const values = [newID, blobName, new Date()];
    connection.query(insertQuery, values, async (err, results) => {
      if (err) {
        console.error('데이터 삽입 실패: ' + err.message);
        return res.status(500).send('프로젝트 등록 실패');
      }

      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      const data = JSON.stringify(req.body);
      await blockBlobClient.upload(data, data.length);

      connection.commit();
      connection.close();
      console.log('새 프로젝트 등록:' + newID);
      res.send(newID);
    });
  } catch (error) {
    console.error(error);
    if (!connection) connection.close();
    res.status(500).send('프로젝트 업로드 실패');
  }
});

router.use(bodyParser.urlencoded({extended:true}));
router.use(bodyParser.json());

// POST, 데이터베이스에서 정보 불러온 후 파일 서버에서 이미지 다운로드
router.post('/retrieve.php',  async (req, res) => { 
  if (!req.body) {
    return res.status(400).send('프로젝트 다운로드 실패');
  }
  if (!dbHost || !containerClient) {
    return res.status(500).send('파일 서버 혹은 데이터베이스 서버 연결 실패');
  }

  const connection = mysql.createConnection({ 
      host: dbHost,
      user: dbUser,
      password: dbPassword,
      database: dbDatabase
  });
  connection.connect((err) => {
      if (err) {
        console.error('DB 연결 실패: ' + err.message);
        return res.status(500).send('DB 연결 실패');
      }
  }); 

  const id = Object.keys(req.body)[0];

  const selectQuery = 'SELECT Save_path FROM TEMP_IMAGE WHERE id = ?';
  connection.query(selectQuery, [ id ], async (err, results) => {
      if (err) {
        console.error('DB 불러오기 실패: ' + err.message);
        return res.status(500).send('DB 불러오기 실패');
      }

      try {
        const blockBlobClient = await containerClient.getBlockBlobClient(results[0].Save_path);
        temp_image = await blockBlobClient.download();

        if (temp_image.readableStreamBody) {
          temp_image.readableStreamBody.pipe(res);
          console.log('프로젝트 호출:' + id);

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
          //   } catch (error) {
          //     console.log("azure에서 삭제 실패 성공")
          //     res.status(500).send('이미지 파일 처리 실패');
          //   }
          // });
        } else {
          res.status(404).send("프로젝트 찾기 실패");
        }

        connection.close();
      } catch (error) {
        if (!connection) connection.close();
        res.status(500).send('해당 ID 없음');
      }
  });
});

// 자정마다 24시간이 지난 파일 삭제
schedule.scheduleJob('0 0 0 * * *', function() {
  console.log("파일 자동 삭제 시작")

  const connection = mysql.createConnection({ 
      host: dbHost,
      user: dbUser,
      password: dbPassword,
      database: dbDatabase
  });
  connection.connect((err) => {
      if (err) {
        console.error('DB 연결 실패: ' + err.message);
        return res.status(500).send('DB 연결 실패');
      }
  }); 

  const selectQuery = 'SELECT Save_path FROM TEMP_IMAGE WHERE Save_time < DATE_SUB(?, INTERVAL 1 DAY)';
  connection.query(selectQuery, [ new Date() ], async (err, results) => {
    if (err) {
      console.error('DB 불러오기 실패: ' + err.message);
    }
    else { 
      console.log('DB 불러오기 성공');

      try {
        if (results.length <= 0) console.log("삭제할 사진 없음");
        for (i of results) {
          blockBlobClient = await containerClient.getBlockBlobClient(i.Save_path);
          await blockBlobClient.delete();
          console.log("Azure에서 프로젝트 삭제:" + i.ID);
        }

        connection.query('set sql_safe_updates=0');
        const deleteQuery = 'DELETE FROM TEMP_IMAGE WHERE Save_time < DATE_SUB(?, INTERVAL 1 DAY)';
        connection.query(deleteQuery, [ new Date() ], async (err, results) => {
          if (err) {
            console.error('DB 정리 실패: ' + err.message);
          } else {
            console.log('DB 정리 완료');
          }
        });
        connection.query('set sql_safe_updates=1');
        connection.commit();
      } catch (error) {
        console.log("azure에서 24시간 지난 파일 삭제 실패")
      }
    }

    if (!connection) connection.close();
  });
});

module.exports = router;