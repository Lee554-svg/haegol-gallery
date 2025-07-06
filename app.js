const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const app = express();

// EJS 설정
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Cloudinary 설정
cloudinary.config({
  cloud_name: 'YOUR_CLOUD_NAME',
  api_key: 'YOUR_API_KEY',
  api_secret: 'YOUR_API_SECRET'
});

// Multer + Cloudinary 설정
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'haegol-gallery',
    allowed_formats: ['jpg', 'png', 'jpeg', 'gif']
  }
});
const upload = multer({ storage: storage });

// 게시물 데이터
let posts = [];

// 홈 화면
app.get('/', (req, res) => {
  res.render('index', { posts });
});

// 글쓰기 화면
app.get('/write', (req, res) => {
  res.render('write');
});

// 글 등록 (이미지 포함)
app.post('/write', upload.single('image'), (req, res) => {
  const { title, content, author } = req.body;
  const now = new Date().toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  posts.unshift({
    id: Date.now(),
    title,
    content,
    author,
    imageUrl: req.file ? req.file.path : null,
    createdAt: now,
    comments: []
  });

  res.redirect('/');
});

// 게시글 상세
app.get('/post/:id', (req, res) => {
  const post = posts.find(p => p.id === parseInt(req.params.id));
  if (!post) return res.status(404).send('글이 없습니다.');
  res.render('post', { post });
});

// 댓글 등록
app.post('/comment/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { name, text } = req.body;

  const post = posts.find(p => p.id === id);
  if (post) {
    post.comments.push({ name, text });
  }

  res.redirect(`/post/${id}`);
});

// 관리자 삭제
const ADMIN_PASSWORD = "doki3864";

app.post('/delete/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { adminPassword } = req.body;

  if (adminPassword !== ADMIN_PASSWORD) {
    return res.send("<script>alert('비밀번호가 틀렸습니다.'); history.back();</script>");
  }

  posts = posts.filter(post => post.id !== id);
  res.redirect('/');
});

// 서버 시작
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`해골방 갤러리 실행 중: http://localhost:${PORT}`);
});

