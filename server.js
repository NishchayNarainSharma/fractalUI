const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'fractal-reality-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fractal-blog', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('MongoDB connection error:', err);
});

// Models
const Thought = mongoose.model('Thought', {
    content: String,
    author: { type: String, default: 'Anonymous' },
    createdAt: { type: Date, default: Date.now },
    upvotes: { type: Number, default: 0 },
    downvotes: { type: Number, default: 0 },
    comments: [{
        content: String,
        author: String,
        createdAt: { type: Date, default: Date.now }
    }]
});

const Comment = mongoose.model('Comment', {
    content: String,
    author: { type: String, default: 'Anonymous' },
    createdAt: { type: Date, default: Date.now },
    postId: mongoose.Schema.Types.ObjectId
});

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/thoughts', async (req, res) => {
    try {
        const thoughts = await Thought.find().sort({ createdAt: -1 });
        res.sendFile(path.join(__dirname, 'public', 'thoughts.html'));
    } catch (err) {
        res.status(500).json({ error: 'Error fetching thoughts' });
    }
});

app.post('/api/thoughts', async (req, res) => {
    try {
        const thought = new Thought({
            content: req.body.content,
            author: req.body.author || 'Anonymous'
        });
        await thought.save();
        res.json(thought);
    } catch (err) {
        res.status(500).json({ error: 'Error creating thought' });
    }
});

app.post('/api/thoughts/:id/vote', async (req, res) => {
    try {
        const { id } = req.params;
        const { voteType } = req.body;
        
        const thought = await Thought.findById(id);
        if (!thought) {
            return res.status(404).json({ error: 'Thought not found' });
        }

        if (voteType === 'up') {
            thought.upvotes += 1;
        } else if (voteType === 'down') {
            thought.downvotes += 1;
        }

        await thought.save();
        res.json(thought);
    } catch (err) {
        res.status(500).json({ error: 'Error updating vote' });
    }
});

app.post('/api/thoughts/:id/comments', async (req, res) => {
    try {
        const { id } = req.params;
        const thought = await Thought.findById(id);
        
        if (!thought) {
            return res.status(404).json({ error: 'Thought not found' });
        }

        thought.comments.push({
            content: req.body.content,
            author: req.body.author || 'Anonymous'
        });

        await thought.save();
        res.json(thought);
    } catch (err) {
        res.status(500).json({ error: 'Error adding comment' });
    }
});

// Serve static pages
app.get('/blog', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'blog.html'));
});

app.get('/death', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'death.html'));
});

app.get('/fractals', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'fractals.html'));
});

// API endpoints for getting data
app.get('/api/thoughts', async (req, res) => {
    try {
        const thoughts = await Thought.find().sort({ createdAt: -1 });
        res.json(thoughts);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching thoughts' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 