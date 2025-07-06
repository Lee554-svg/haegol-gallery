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
  const now = new Date().toLocaleString('ko-KR', { hour12: false });
  posts.unshift({
    id: posts.length + 1,
    title,
    content,
    author,
    createdAt: now,
    comments: []   // 여기에 댓글 배열 추가
  });
  res.redirect('/');
});

app.get('/post/:id', (req, res) => {
  const post = posts.find(p => p.id === parseInt(req.params.id));
  if (!post) return res.status(404).send('글이 없습니다.');
  res.render('post', { post });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`해골방 갤러리 실행 중: http://localhost:${PORT}`);
});
const ADMIN_PASSWORD = "doki3864"; // 너만 아는 관리자 비번

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
