const mongoose=require('mongoose');
const MessageSchema=new mongoose.Schema({
    from: String,
    to: String,
    text: String,
    conversationId: String, // Format: "user1-user2" (alphabetically sorted)
    createdAt: { type: Date, default: Date.now },
    isRead: { type: Boolean, default: false }
});
module.exports=mongoose.model('Message',MessageSchema);