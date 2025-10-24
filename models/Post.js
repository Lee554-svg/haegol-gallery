const mongoose = require('mongoose');

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
  comments: Array,
  upvotes: Number,
  downvotes: Number,
  views: Number,
  isNotice: { type: Boolean, default: false } // ✅ 공지글 여부 추가
});

module.exports = mongoose.model('Post', postSchema);

const postSchema = new mongoose.Schema({
  title: String,
  safeTitle: String,
  content: String,
  safeContent: String,
  author: String,
  createdAt: String,
  imageUrl: String,
  comments: [commentSchema],
  upvotes: Number,
  downvotes: Number,
  views: Number
});

module.exports = mongoose.model('Post', postSchema);

