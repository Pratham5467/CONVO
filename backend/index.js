const express= require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const Message = require('./models/Message');
require('dotenv').config();
const app = express();
const server =http.createServer(app);
const path = require('path');

const io = socketIo(server,{cors:{origin:'*'}});

app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// Fallback to index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error(err));

// Enhanced private chat logi
const onlineUsers = {};
const User = require('./models/User');

// Helper function to create conversation ID
function createConversationId(user1, user2) {
    return [user1, user2].sort().join('-');
}

io.on('connection', (socket) => {
    console.log('User connected');

    // Listen for user login to track username and socket
    socket.on('loginUser', (username) => {
        onlineUsers[username] = socket.id;
        socket.username = username;
        io.emit('onlineUsers', Object.keys(onlineUsers));
    });

    // Get conversation history between two users
    socket.on('getConversation', async ({ user1, user2 }) => {
        try {
            const conversationId = createConversationId(user1, user2);
            const messages = await Message.find({ conversationId })
                .sort({ createdAt: 1 })
                .limit(100);
            socket.emit('conversationHistory', { messages, conversationId });
        } catch (error) {
            console.error('Error fetching conversation:', error);
        }
    });

    // Search users (both online and offline)
    socket.on('searchUsers', async (searchTerm) => {
        try {
            const users = await User.find({
                username: { $regex: searchTerm, $options: 'i' }
            }).select('username').limit(20);
            
            const userResults = users.map(user => ({
                username: user.username,
                isOnline: !!onlineUsers[user.username]
            }));
            
            socket.emit('searchResults', userResults);
        } catch (error) {
            console.error('Error searching users:', error);
        }
    });

    // Enhanced private message event
    socket.on('privateMessage', async ({ to, from, text }) => {
        try {
            const conversationId = createConversationId(from, to);
            const newMsg = new Message({ 
                from, 
                to, 
                text, 
                conversationId,
                createdAt: new Date() 
            });
            await newMsg.save();
            
            // Send to recipient if online (don't send back to sender)
            if (onlineUsers[to]) {
                io.to(onlineUsers[to]).emit('privateMessage', { 
                    from, 
                    to, 
                    text, 
                    conversationId,
                    createdAt: newMsg.createdAt 
                });
            }
        } catch (error) {
            console.error('Error sending message:', error);
        }
    });

    // Remove user on disconnect
    socket.on('disconnect', () => {
        if (socket.username) {
            delete onlineUsers[socket.username];
        }
        io.emit('onlineUsers', Object.keys(onlineUsers));
        console.log('User Disconnected');
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server started on port ${PORT}`));

