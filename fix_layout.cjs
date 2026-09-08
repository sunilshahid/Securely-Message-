const fs = require('fs');
let content = fs.readFileSync('src/components/ChatLayout.tsx', 'utf8');

// 1. Change the flex-1 container to not scroll
content = content.replace(
  '<div className="flex-1 overflow-y-auto min-h-0">',
  '<div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">'
);

// 2. Wrap the Chats content in a scrolling div
const chatsStart = '{activeTab === "chats" ? (';
const chatsReplacement = `{activeTab === "chats" ? (
            <div className="flex-1 overflow-y-auto h-full w-full">`;
content = content.replace(chatsStart, chatsReplacement);

const chatsEnd = `                  )}
                </>
              )}
            </div>
          )
          ) : activeTab === "calls" ? (`;
const chatsEndReplacement = `                  )}
                </>
              )}
            </div>
            </div>
          )
          ) : activeTab === "calls" ? (`;
content = content.replace(chatsEnd, chatsEndReplacement);

// 3. Fix the Chats FAB to rounded-2xl, bg-indigo-500, fill-current, absolute bottom-[90px] right-6
const oldChatsFabRegex = /className="absolute bottom-24 right-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-500 rounded-full flex items-center justify-center text-white shadow-xl transition-transform hover:scale-105 z-30"/;
const newChatsFab = 'className="absolute bottom-[90px] right-6 w-14 h-14 bg-indigo-500 text-white rounded-2xl flex items-center justify-center shadow-lg hover:bg-indigo-400 transition-colors z-40"';
content = content.replace(oldChatsFabRegex, newChatsFab);

const oldPencil = /<Pencil className="w-6 h-6" \/>/;
const newPencil = '<Pencil className="w-6 h-6 fill-current" />';
content = content.replace(oldPencil, newPencil);

fs.writeFileSync('src/components/ChatLayout.tsx', content);
