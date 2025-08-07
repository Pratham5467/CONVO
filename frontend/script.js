let socket;
let username = '';
let token = '';
let selectedUser = '';
let currentConversationId = '';
let conversations = {}; // Store conversations per user

function register() {
  const user = document.getElementById('username').value;
  const pass = document.getElementById('password').value;
  fetch('https://your-app-name.onrender.com/api/auth/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: user, password: pass })
  })
  .then(res => res.json())
  .then(data => document.getElementById('authMsg').innerText = data.message || data.error);
}

function login() {
  const user = document.getElementById('username').value;
  const pass = document.getElementById('password').value;
  fetch('https://your-app-name.onrender.com/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: user, password: pass })
  })
  .then(res => res.json())
  .then(data => {
    if (data.token) {
      token = data.token;
      username = data.username;
      document.getElementById('auth').style.display = 'none';
      document.getElementById('chat').style.display = 'flex'; 
      startChat();
    } else {
      document.getElementById('authMsg').innerText = data.error || "Login failed";
    }
  });
}

function startChat() {
  socket = io('https://your-app-name.onrender.com');
  socket.emit('loginUser', username);


  const searchInput = document.getElementById('userSearch');
  let searchTimeout;
  
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const searchTerm = e.target.value.trim();
    
    if (searchTerm.length > 0) {
      searchTimeout = setTimeout(() => {
        socket.emit('searchUsers', searchTerm);
      }, 300);
    } else {
      document.getElementById('searchResults').innerHTML = '';
    }
  });

  socket.on('onlineUsers', users => {
    renderUserList(users);
  });

  socket.on('searchResults', results => {
    renderSearchResults(results);
  });

  socket.on('privateMessage', msg => {
    handleIncomingMessage(msg);
  });

  socket.on('conversationHistory', ({ messages, conversationId }) => {
    loadConversationHistory(messages, conversationId);
  });
  
  
  document.getElementById('currentChatUser').textContent = 'Select a user to start chatting';
}

function renderSearchResults(results) {
  const searchResults = document.getElementById('searchResults');
  searchResults.innerHTML = '';
  
  results.forEach(user => {
    if (user.username !== username) {
      const div = document.createElement('div');
      div.className = 'search-result';
      div.innerHTML = `
        <span>${user.username}</span>
        <span class="user-status ${user.isOnline ? 'online' : 'offline'}">
          ${user.isOnline ? 'Online' : 'Offline'}
        </span>
      `;
      div.onclick = () => selectUser(user.username);
      searchResults.appendChild(div);
    }
  });
}

function renderUserList(users) {
  const userList = document.getElementById('userList');
  userList.innerHTML = '';
  
  users.forEach(user => {
    if (user !== username) {
      const li = document.createElement('li');
      li.textContent = user;
      li.className = user === selectedUser ? 'selected' : '';
      li.onclick = () => selectUser(user);
      userList.appendChild(li);
    }
  });
}

function selectUser(user) {
  selectedUser = user;
  currentConversationId = createConversationId(username, user);
  
  
  document.getElementById('currentChatUser').textContent = `Chat with ${user}`;
  
 
  document.getElementById('userSearch').value = '';
  document.getElementById('searchResults').innerHTML = '';
  
  
  const userListItems = document.querySelectorAll('#userList li');
  userListItems.forEach(li => {
    li.className = li.textContent === user ? 'selected' : '';
  });
  
 
  socket.emit('getConversation', { user1: username, user2: user });
}

function createConversationId(user1, user2) {
  return [user1, user2].sort().join('-');
}

function loadConversationHistory(messages, conversationId) {
  const messagesDiv = document.getElementById('messages');
  messagesDiv.innerHTML = '';
  
  messages.forEach(msg => {
    appendMessage(msg);
  });
  
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function handleIncomingMessage(msg) {

  if (msg.from !== username) {
 
    if (selectedUser === msg.from) {
      appendMessage(msg);
    }
  }
  
  // Store all messages for future reference
  const msgConversationId = createConversationId(msg.from, msg.to);
  if (!conversations[msgConversationId]) {
    conversations[msgConversationId] = [];
  }
  conversations[msgConversationId].push(msg);
}

function sendMsg() {
  const text = document.getElementById('msgInput').value.trim();
  if (!selectedUser) {
    alert('Select a user to chat with!');
    return;
  }
  if (!text) return;
  
  // Display the message immediately - simplified
  const messageObj = {
    from: username,
    to: selectedUser,
    text: text,
    createdAt: new Date()
  };
  
  appendMessage(messageObj);
  
  // Send to server
  socket.emit('privateMessage', { to: selectedUser, from: username, text });
  document.getElementById('msgInput').value = '';
}

function appendMessage(msg) {
  const msgDiv = document.createElement('div');
  const isOwnMessage = msg.from === username;
  
  
  msgDiv.className = `message ${isOwnMessage ? 'own' : 'other'}`;
  msgDiv.innerHTML = `
    <div class="bubble">
      ${msg.text}
      <div class="timestamp">${new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
    </div>
  `;
  
  document.getElementById('messages').appendChild(msgDiv);
  document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
}


document.addEventListener('DOMContentLoaded', () => {
  const msgInput = document.getElementById('msgInput');
  if (msgInput) {
    msgInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendMsg();
      }
    });
  }
});

function logout() {
  document.getElementById('chat').style.display = 'none';
  document.getElementById('auth').style.display = 'block';
  token = '';
  username = '';
  selectedUser = '';
  currentConversationId = '';
  conversations = {};
  if (socket) {
    socket.disconnect();
  }
  document.getElementById('username').value = '';
  document.getElementById('password').value = '';
  document.getElementById('authMsg').innerText = '';
}
