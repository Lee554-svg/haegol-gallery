const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  name: String,
  text: String,
  safeText: String
});

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

