const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' }); // 임시 업로드 폴더

// Cloudinary 설정
cloudinary.config({
  cloud_name: 'dd6xtxudi',
  api_key: '732873783656938',
  api_secret: 'D5CptXx43n1qBQjbGkQ7HTv1bqA'
});

// 기본 설정
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
}));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

let posts = [];

// 메인 페이지
app.get('/', (req, res) => {
  res.render('index', { posts });
});

// 글쓰기 페이지
app.get('/write', (req, res) => {
  res.render('write');
});

// 글쓰기 처리 (이미지 업로드 포함)
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
    downvotes: 0,
    views: 0
  });

  res.redirect('/');
});

// 글 상세 보기 + 조회수 증가
app.get('/post/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const post = posts.find(p => p.id === id);
  if (!post) return res.status(404).send('글이 없습니다.');

  if (!req.session.viewed) req.session.viewed = {};
  if (!req.session.viewed[id]) {
    post.views++;
    req.session.viewed[id] = true;
  }

  res.render('post', { post });
});

// 갈추(좋아요)
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

// 문추(싫어요)
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

// 댓글 작성
app.post('/comment/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { name, text } = req.body;
  const post = posts.find(p => p.id === id);
  if (post) {
    post.comments.push({ name, text });
  }
  res.redirect(`/post/${id}`);
});

// 검색 폼
app.get('/search', (req, res) => {
  res.render('search', { posts: [], keyword: '' });
});

// 검색 처리
app.post('/search', (req, res) => {
  const keyword = req.body.keyword.trim().toLowerCase();
  if (!keyword) return res.render('search', { posts: [], keyword: '' });

  const filtered = posts.filter(post =>
    post.title.toLowerCase().includes(keyword) ||
    post.content.toLowerCase().includes(keyword) ||
    post.author.toLowerCase().includes(keyword)
  );

  res.render('search', { posts: filtered, keyword });
});

// 글 삭제
const ADMIN_PASSWORD = "doki3864";
app.post('/delete/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { adminPassword } = req.body;
  if (adminPassword !== ADMIN_PASSWORD) {
    return res.send("<script>alert('비밀번호가 틀렸습니다.'); history.back();</script>");
  }

  posts = posts.filter(p => p.id !== id);
  res.redirect('/');
});

// 서버 시작
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`해골방 갤러리 실행 중: http://localhost:${PORT}`);
});
