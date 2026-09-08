const fs = require('fs');
let content = fs.readFileSync('src/components/ChatLayout.tsx', 'utf8');

// 1. Fix missing brace for the first ternary
content = content.replace(
  '<div className="flex-1 overflow-y-auto h-full w-full">\n            !isSearchActive',
  '<div className="flex-1 overflow-y-auto h-full w-full">\n            {!isSearchActive'
);

// 2. Fix the extra parenthesis at the end
const badEndRegex = /          <\/div>\n          \)\n          \) : activeTab === "calls" \? \(/;
content = content.replace(badEndRegex, '          </div>\n          ) : activeTab === "calls" ? (');

fs.writeFileSync('src/components/ChatLayout.tsx', content);
