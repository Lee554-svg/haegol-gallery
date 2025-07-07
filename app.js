const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' }); // multer 임시 저장용

// Cloudinary 설정
cloudinary.config({
  cloud_name: 'dd6xtxudi',
  api_key: '732873783656938',
  api_secret: 'D5CptXx43n1qBQjbGkQ7HTv1bqA'
});

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
}));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

let posts = [];

// 메인 - 글 목록 + 검색폼
app.get('/', (req, res) => {
  res.render('index', { posts, searchQuery: '' });
});

// 검색 결과 페이지
app.get('/search', (req, res) => {
  const { q } = req.query;
  if (!q) {
    // 검색어 없으면 전체글 보여주기
    return res.render('index', { posts, searchQuery: '' });
  }

  const lowerQ = q.toLowerCase();

  const filtered = posts.filter(post => {
    return (
      post.title.toLowerCase().includes(lowerQ) ||
      post.author.toLowerCase().includes(lowerQ) ||
      post.content.toLowerCase().includes(lowerQ)
    );
  });

  res.render('index', { posts: filtered, searchQuery: q });
});

// 골념글 페이지 (갈추 5개 이상 글만)
app.get('/golnym', (req, res) => {
  const filtered = posts.filter(post => post.upvotes >= 5);
  res.render('golnym', { posts: filtered });
});

app.get('/write', (req, res) => {
  res.render('write');
});

// 글쓰기 - 사진 업로드 포함
app.post('/write', upload.single('image'), async (req, res) => {
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

  let imageUrl = null;
  try {
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path);
      imageUrl = result.secure_url;
      fs.unlinkSync(req.file.path);
    }
  } catch (err) {
    console.error("Cloudinary 업로드 오류:", err);
  }

  posts.unshift({
    id: Date.now(),
    title,
    content,
    author,
    createdAt: now,
    imageUrl,
    comments: [],
    upvotes: 0,
    downvotes: 0
  });

  res.redirect('/');
});

app.get('/post/:id', (req, res) => {
  const post = posts.find(p => p.id === parseInt(req.params.id));
  if (!post) return res.status(404).send('글이 없습니다.');
  res.render('post', { post });
});

// 갈추(좋아요) - 세션 중복 방지
app.post('/post/:id/upvote', (req, res) => {
  const id = parseInt(req.params.id);
  if (!req.session.voted) req.session.voted = {};

  if (req.session.voted[id]?.upvote) {
    return res.send("<script>alert('이미 갈추를 눌렀습니다!'); history.back();</script>");
  }

  const post = posts.find(p => p.id === id);
  if (post) {
    post.upvotes++;
    req.session.voted[id] = { ...req.session.voted[id], upvote: true };
  }
  res.redirect(`/post/${id}`);
});

// 문추(싫어요) - 세션 중복 방지
app.post('/post/:id/downvote', (req, res) => {
  const id = parseInt(req.params.id);
  if (!req.session.voted) req.session.voted = {};

  if (req.session.voted[id]?.downvote) {
    return res.send("<script>alert('이미 문추를 눌렀습니다!'); history.back();</script>");
  }

  const post = posts.find(p => p.id === id);
  if (post) {
    post.downvotes++;
    req.session.voted[id] = { ...req.session.voted[id], downvote: true };
  }
  res.redirect(`/post/${id}`);
});

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

app.post('/comment/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { name, text } = req.body;

  const post = posts.find(p => p.id === id);
  if (post) {
    post.comments.push({ name, text });
  }

  res.redirect(`/post/${id}`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`해골방 갤러리 실행 중: http://localhost:${PORT}`);
});




