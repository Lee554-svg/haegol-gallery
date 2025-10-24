const mongoose = require('mongoose');

// 댓글 스키마
const commentSchema = new mongoose.Schema({
  name: String,
  text: String,
  safeText: String
});

// 게시글 스키마
const postSchema = new mongoose.Schema({
  title: String,
  safeTitle: String,
  content: String,
  safeContent: String,
  author: String,
  createdAt: String,
  imageUrl: String,
  comments: [commentSchema], // 댓글 배열
  upvotes: { type: Number, default: 0 },
  downvotes: { type: Number, default: 0 },
  views: { type: Number, default: 0 },
  isNotice: { type: Boolean, default: false } // 공지글 여부
});

// Post 모델 내보내기
module.exports = mongoose.model('Post', postSchema);



