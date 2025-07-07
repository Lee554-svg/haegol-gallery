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

const POSTS_PER_PAGE = 20;

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
}));
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
    const imgTag = `<img src="/emotes/${emoteMap[key]}" alt="${key}" style="height: 20px;" />`;
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    safeText = safeText.replace(new RegExp(escapedKey, 'g'), imgTag);
  }

  return safeText;
}
app.locals.replaceEmotes = replaceEmotes;

app.get('/', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const totalPages = Math.ceil(posts.length / POSTS_PER_PAGE);
  const startIdx = (page - 1) * POSTS_PER_PAGE;
  const paginatedPosts = posts.slice(startIdx, startIdx + POSTS_PER_PAGE)
    .map(post => ({ ...post, safeTitle: replaceEmotes(post.title) }));

  res.render('index', {
    posts: paginatedPosts,
    currentPage: page,
    totalPages,
    searchQuery: ''
  });
});

app.get('/write', (req, res) => {
  res.render('write');
});

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
    safeTitle: replaceEmotes(title),
    safeContent: replaceEmotes(content),
    comments: [],
    upvotes: 0,
    downvotes: 0,
    views: 0
  });

  res.redirect('/');
});

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

app.post('/comment/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { name, text } = req.body;
  const post = posts.find(p => p.id === id);
  if (post) {
    post.comments.push({ name, text, safeText: replaceEmotes(text) });
  }
  res.redirect(`/post/${id}`);
});

app.get('/search', (req, res) => {
  const keyword = (req.query.q || '').trim().toLowerCase();
  const page = parseInt(req.query.page) || 1;

  if (!keyword) {
    return res.render('search', { posts: [], keyword, currentPage: 1, totalPages: 1 });
  }

  const matched = posts.filter(post =>
    post.title.toLowerCase().includes(keyword) ||
    post.content.toLowerCase().includes(keyword) ||
    post.author.toLowerCase().includes(keyword)
  );

  const totalPages = Math.ceil(matched.length / POSTS_PER_PAGE);
  const startIdx = (page - 1) * POSTS_PER_PAGE;
  const paginatedPosts = matched.slice(startIdx, startIdx + POSTS_PER_PAGE)
    .map(post => ({ ...post, safeTitle: replaceEmotes(post.title) }));

  res.render('search', {
    posts: paginatedPosts,
    keyword: req.query.q,
    currentPage: page,
    totalPages
  });
});

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

app.get('/golnym', (req, res) => {
  const page = parseInt(req.query.page) || 1;

  const golnymAll = posts.filter(p => p.upvotes >= 10);
  const totalPages = Math.ceil(golnymAll.length / POSTS_PER_PAGE);
  const startIdx = (page - 1) * POSTS_PER_PAGE;
  const paginated = golnymAll.slice(startIdx, startIdx + POSTS_PER_PAGE)
    .map(post => ({ ...post, safeTitle: replaceEmotes(post.title) }));

  res.render('golnym', {
    posts: paginated,
    currentPage: page,
    totalPages
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`해골방 갤러리 실행 중: http://localhost:${PORT}`);
});



