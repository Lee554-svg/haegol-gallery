// ⬇ app.js 전체
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });

cloudinary.config({
  cloud_name: 'dd6xtxudi',
  api_key: '732873783656938',
  api_secret: 'D5CptXx43n1qBQjbGkQ7HTv1bqA'
});

const POSTS_PER_PAGE = 10;
const ADMIN_PASSWORD = "doki3864";

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: 'secret', resave: false, saveUninitialized: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static('public'));

let posts = [];

function replaceEmotes(text) {
  const emoteMap = {
    '(갈추)': 'galchu.jpeg',
    '(문추)': 'munchu.jpeg',
    '(영정경고)': 'mun.jpeg',
    '(세벤각)': 'saban.jpeg',
    '(단약)': 'dan.jpeg',
    '(욕)': 'galmun.jpeg',
    '(대해골)': 'bone.jpeg',
    '(세팸)': 'sepam.jpeg',
    '(해팸)': 'hapam.jpeg',
    '(조선전쟁)': 'jo.jpeg',
    '(볼살)': 'bol.jpeg',
    '(갈팸)': 'galpam.jpeg',
    '(탈모)': 'egg.jpeg',
    '(니디티)': 'niditi.jpeg',
    '(그긴거)': 'wa.jpeg'
  };

  let safeText = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  for (const key in emoteMap) {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const imgTag = `<img src="/emotes/${emoteMap[key]}" style="height: 32px;" />`;
    safeText = safeText.replace(new RegExp(escapedKey, 'g'), imgTag);
  }
  return safeText;
}
app.locals.replaceEmotes = replaceEmotes;

// ✅ index route
app.get('/', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const totalPosts = posts.length;
  const totalPages = Math.ceil(totalPosts / POSTS_PER_PAGE);
  const start = (page - 1) * POSTS_PER_PAGE;
  const paginatedPosts = posts.slice(start, start + POSTS_PER_PAGE).map(post => ({
    ...post,
    safeTitle: replaceEmotes(post.title)
  }));

  res.render('index', {
    posts: paginatedPosts,
    currentPage: page,
    totalPages,
    totalPosts,
    searchQuery: ''
  });
});

// ✅ 글쓰기
app.get('/write', (req, res) => res.render('write'));

app.post('/write', upload.single('image'), async (req, res) => {
  try {
    const { title, content, author } = req.body;
    const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    let imageUrl = null;

    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path);
      imageUrl = result.secure_url;
      fs.unlinkSync(req.file.path);
    }

    posts.unshift({
      id: Date.now(),
      title,
      content,
      author,
      createdAt: now,
      imageUrl,
      safeTitle: replaceEmotes(title),
      safeContent: replaceEmotes(content),
      comments: [],
      upvotes: 0,
      downvotes: 0,
      views: 0
    });

    res.redirect('/');
  } catch (err) {
    console.error("글 등록 오류:", err);
    res.status(500).send("글 등록 중 오류 발생");
  }
});

// ✅ post 보기
app.get('/post/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const post = posts.find(p => p.id === id);
  if (!post) return res.status(404).send("글 없음");

  if (!req.session.viewed) req.session.viewed = {};
  if (!req.session.viewed[id]) {
    post.views++;
    req.session.viewed[id] = true;
  }

  res.render('post', { post });
});

// ✅ 투표
app.post('/post/:id/upvote', (req, res) => {
  const id = parseInt(req.params.id);
  const post = posts.find(p => p.id === id);
  if (!post) return res.redirect('/');
  if (!req.session.voted) req.session.voted = {};
  if (req.session.voted[id]?.upvote) return res.send("<script>alert('이미 갈추함'); history.back();</script>");
  post.upvotes++;
  req.session.voted[id] = { ...(req.session.voted[id] || {}), upvote: true };
  res.redirect(`/post/${id}`);
});

app.post('/post/:id/downvote', (req, res) => {
  const id = parseInt(req.params.id);
  const post = posts.find(p => p.id === id);
  if (!post) return res.redirect('/');
  if (!req.session.voted) req.session.voted = {};
  if (req.session.voted[id]?.downvote) return res.send("<script>alert('이미 문추함'); history.back();</script>");
  post.downvotes++;
  req.session.voted[id] = { ...(req.session.voted[id] || {}), downvote: true };
  res.redirect(`/post/${id}`);
});

// ✅ 댓글
app.post('/comment/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { name, text } = req.body;
  const post = posts.find(p => p.id === id);
  if (!post) return res.redirect('/');
  post.comments.push({ name, text, safeText: replaceEmotes(text) });
  res.redirect(`/post/${id}`);
});

// ✅ 검색
app.get('/search', (req, res) => {
  const keyword = (req.query.q || '').toLowerCase();
  const page = parseInt(req.query.page) || 1;
  const matched = posts.filter(p =>
    p.title.toLowerCase().includes(keyword) ||
    p.content.toLowerCase().includes(keyword) ||
    p.author.toLowerCase().includes(keyword)
  );
  const totalPages = Math.ceil(matched.length / POSTS_PER_PAGE);
  const startIdx = (page - 1) * POSTS_PER_PAGE;
  const paginatedPosts = matched.slice(startIdx, startIdx + POSTS_PER_PAGE).map(post => ({
    ...post,
    safeTitle: replaceEmotes(post.title)
  }));

  res.render('search', {
    posts: paginatedPosts,
    keyword: req.query.q,
    currentPage: page,
    totalPages,
    totalPosts: matched.length
  });
});

// ✅ 삭제
app.post('/delete/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { adminPassword } = req.body;
  if (adminPassword !== ADMIN_PASSWORD) return res.send("<script>alert('비번 틀림'); history.back();</script>");
  posts = posts.filter(p => p.id !== id);
  res.redirect('/');
});

// ✅ 골념글
app.get('/golnym', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const golnymAll = posts.filter(p => p.upvotes >= 10);
  const totalPages = Math.ceil(golnymAll.length / POSTS_PER_PAGE);
  const startIdx = (page - 1) * POSTS_PER_PAGE;
  const paginated = golnymAll.slice(startIdx, startIdx + POSTS_PER_PAGE).map(post => ({
    ...post,
    safeTitle: replaceEmotes(post.title)
  }));

  res.render('golnym', {
    posts: paginated,
    currentPage: page,
    totalPages,
    totalPosts: golnymAll.length
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ 서버 실행됨: http://localhost:${PORT}`);
});





