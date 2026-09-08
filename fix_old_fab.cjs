const fs = require('fs');
let content = fs.readFileSync('src/components/ChatLayout.tsx', 'utf8');

const regex = /<AnimatePresence>\s*\{activeTab === "chats" && \(\s*<motion\.button[\s\S]*?<\/motion\.button>\s*\)\}\s*<\/AnimatePresence>/;
content = content.replace(regex, '');
fs.writeFileSync('src/components/ChatLayout.tsx', content);
