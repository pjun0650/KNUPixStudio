# PixStudio
종합설계프로젝트: 빅데이터 활용 웹 기반 이미지 편집 솔루션  
<br>
![preview](https://github.com/pjun0650/PixStudio/assets/58252317/72f1068d-dd86-4832-acc2-c8dc8d91c153)

***

## 편집기 바로 사용
http://pixstudio.r-e.kr/ 
- **2024년 1월 이후로 서버를 폐쇄할 예정이며, 더이상 서비스를 이용하실 수 없습니다.**
- 아래 실행 방법을 참고하셔서 직접 편집기를 구동할 수 있습니다.
***

## 실행 방법
1. **Node.js 설치**
   - https://nodejs.org/en/download/ 에서 LTS 최신 버전을 다운 받아 설치하시면 됩니다.
   - v18.18.0 보다 낮은 버전이 설치되어 있는 경우, 그 이상의 버전으로 업데이트를 해주셔야 합니다.
2. **소스 코드 다운로드**
3. **pixstudioApp 폴더 내에서 터미널 실행**
4. **node app.js 입력**  
   ![image](https://github.com/pjun0650/PixStudio/assets/58252317/04b6592b-e53b-4602-9071-0fb298a455f6)
5. **인터넷 브라우저로 http://localhost/ 접속**  
   ![image](https://github.com/pjun0650/PixStudio/assets/58252317/3184d263-672c-4612-b3f8-ca4db672dce7)
<br>

- **프로젝트 저장하기 및 불러오기는 작동하지 않습니다.**
- 아래 추가 작업을 하셔야 기능을 사용할 수 있습니다.

***

## 프로젝트 임시저장 활성화 방법
1. **사전 준비**
   - **(유료!) Microsoft Azure Blob 컨테이너**
     - Microsoft Azure 서비스 중, 스토리지 계정을 하나 생성합니다.
     - 생성한 스토리지 계정 내에 컨테이터를 하나 생성하며, 엑세스 수준은 Blob으로 설정합니다.
   - **MySQL 데이터베이스**
     - 로컬 컴퓨터나 웹 서비스를 이용해 MySQL 데이터베이스 계졍을 생성합니다.
     - 계정에 접속해 데이터베이스를 하나 생성하고(create database), 아래 명령대로 테이블을 하나 생성합니다.  
       create table TEMP_IMAGE(ID int unsigned not null primary key, Save_path varchar(255), Save_time datetime);
2. **.env 파일 수정**
   - (다운 받은 소스 코드 내) 최상위 폴더에서 .env 파일을 텍스트 편집기로 열어 아래 예시처럼 수정해 줍니다.  
      ![image](https://github.com/pjun0650/PixStudio/assets/58252317/b39fd941-378a-4757-8eae-96a0146f4138)
      ![image](https://github.com/pjun0650/PixStudio/assets/58252317/63348a17-c9be-43b0-9c12-42e101c418e2)
3. **수정한 .env 파일을 pixstudioApp 폴더로 이동**  
   ![image](https://github.com/pjun0650/PixStudio/assets/58252317/927b3f2e-d808-4d2d-873f-0ffe7bcd1726)


***

## 사용 팁
- 작업 영역에서 마우스 휠을 조작하여 확대/축소가 가능합니다.
     - Alt를 누른 상태에서 스크롤 하시면 상/하 스크롤이 됩니다.
     - Shift를 누른 상태에서 스크롤 하시면 좌/우 스크롤이 됩니다.
