const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bodyParser = require('body-parser');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });
const POSTS_PER_PAGE = 10;
const ADMIN_PASSWORD = "doki3864";

// ✅ MongoDB URI 직접 박음
const MONGODB_URI = "mongodb+srv://mumyoung1144:doki3864@cluster0.4p9segt.mongodb.net/haegol-gallery?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("✅ MongoDB 연결됨"))
  .catch(err => console.error("❌ MongoDB 연결 실패", err));

// ✅ 모델 정의 (분리 X)
const commentSchema = new mongoose.Schema({
  name: String,
  text: String,
  safeText: String
});

const postSchema = new mongoose.Schema({
  title: String,
  content: String,
  author: String,
  createdAt: String,
  imageUrl: String,
  safeTitle: String,
  safeContent: String,
  comments: [commentSchema],
  upvotes: Number,
  downvotes: Number,
  views: Number
});

const Post = mongoose.model('Post', postSchema);

cloudinary.config({
  cloud_name: 'dd6xtxudi',
  api_key: '732873783656938',
  api_secret: 'D5CptXx43n1qBQjbGkQ7HTv1bqA'
});

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: 'secret', resave: false, saveUninitialized: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static('public'));

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
    const imgTag = `<img src="/emotes/${emoteMap[key]}" style="height: 50px;" />`;
    safeText = safeText.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), imgTag);
  }
  return safeText;
}
app.locals.replaceEmotes = replaceEmotes;

// ✅ index
app.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const totalPosts = await Post.countDocuments({});
  const totalPages = Math.ceil(totalPosts / POSTS_PER_PAGE);
  const posts = await Post.find({})
    .sort({ createdAt: -1 })
    .skip((page - 1) * POSTS_PER_PAGE)
    .limit(POSTS_PER_PAGE);

  res.render('index', {
    posts,
    currentPage: page,
    totalPages,
    totalPosts,
    searchQuery: ''
  });
});

// ✅ 글쓰기
app.get('/write', (req, res) => res.render('write'));

app.post('/write', upload.single('image'), async (req, res) => {
  const { title, content, author } = req.body;
  let imageUrl = null;

  if (req.file) {
    const result = await cloudinary.uploader.upload(req.file.path);
    imageUrl = result.secure_url;
    fs.unlinkSync(req.file.path);
  }

  const newPost = new Post({
    title,
    content,
    author,
    createdAt: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
    imageUrl,
    safeTitle: replaceEmotes(title),
    safeContent: replaceEmotes(content),
    comments: [],
    upvotes: 0,
    downvotes: 0,
    views: 0
  });

  await newPost.save();
  res.redirect('/');
});

// ✅ 게시글 보기
app.get('/post/:id', async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).send("글 없음");

  if (!req.session.viewed) req.session.viewed = {};
  if (!req.session.viewed[post.id]) {
    post.views++;
    req.session.viewed[post.id] = true;
    await post.save();
  }

  res.render('post', { post });
});

// ✅ 투표
app.post('/post/:id/upvote', async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.redirect('/');
  if (!req.session.voted) req.session.voted = {};
  if (req.session.voted[post.id]?.upvote) return res.send("<script>alert('이미 갈추함'); history.back();</script>");
  post.upvotes++;
  req.session.voted[post.id] = { ...(req.session.voted[post.id] || {}), upvote: true };
  await post.save();
  res.redirect(`/post/${post.id}`);
});

app.post('/post/:id/downvote', async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.redirect('/');
  if (!req.session.voted) req.session.voted = {};
  if (req.session.voted[post.id]?.downvote) return res.send("<script>alert('이미 문추함'); history.back();</script>");
  post.downvotes++;
  req.session.voted[post.id] = { ...(req.session.voted[post.id] || {}), downvote: true };
  await post.save();
  res.redirect(`/post/${post.id}`);
});

// ✅ 댓글
app.post('/comment/:id', async (req, res) => {
  const { name, text } = req.body;
  const post = await Post.findById(req.params.id);
  if (!post) return res.redirect('/');
  post.comments.push({ name, text, safeText: replaceEmotes(text) });
  await post.save();
  res.redirect(`/post/${post.id}`);
});

// ✅ 골념글
app.get('/golnym', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const all = await Post.find({ upvotes: { $gte: 10 } }).sort({ createdAt: -1 });
  const totalPages = Math.ceil(all.length / POSTS_PER_PAGE);
  const paginated = all.slice((page - 1) * POSTS_PER_PAGE, page * POSTS_PER_PAGE);

  res.render('golnym', {
    posts: paginated,
    currentPage: page,
    totalPages,
    totalPosts: all.length
  });
});

// ✅ 삭제
app.post('/delete/:id', async (req, res) => {
  const { adminPassword } = req.body;
  if (adminPassword !== ADMIN_PASSWORD) return res.send("<script>alert('비번 틀림'); history.back();</script>");
  await Post.findByIdAndDelete(req.params.id);
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ 서버 실행됨 http://localhost:${PORT}`));
