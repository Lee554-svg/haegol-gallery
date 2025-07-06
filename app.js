const express = require('express');
const bodyParser = require('body-parser');
const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

let posts = [];

app.get('/', (req, res) => {
  res.render('index', { posts });
});

app.get('/write', (req, res) => {
  res.render('write');
});

app.post('/write', (req, res) => {
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
    createdAt: now,
    comments: [],
    upvotes: 0,    // 좋아요 수
    downvotes: 0   // 싫어요 수
  });
  res.redirect('/');
});

app.get('/post/:id', (req, res) => {
  const post = posts.find(p => p.id === parseInt(req.params.id));
  if (!post) return res.status(404).send('글이 없습니다.');
  res.render('post', { post });
});

// 좋아요(갈추) 버튼
app.post('/post/:id/upvote', (req, res) => {
  const id = parseInt(req.params.id);
  const post = posts.find(p => p.id === id);
  if (post) {
    post.upvotes += 1;
  }
  res.redirect(`/post/${id}`);
});

// 싫어요(문추) 버튼
app.post('/post/:id/downvote', (req, res) => {
  const id = parseInt(req.params.id);
  const post = posts.find(p => p.id === id);
  if (post) {
    post.downvotes += 1;
  }
  res.redirect(`/post/${id}`);
});

const ADMIN_PASSWORD = "doki3864"; // 관리자 비번

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



