const fs = require('fs');
let content = fs.readFileSync('src/components/ChatLayout.tsx', 'utf8');

// 1. Remove the old FAB from the bottom of ChatLayout
const oldFabFull = /<AnimatePresence>\s*\{activeTab === "chats" && \(\s*<motion\.button[\s\S]*?<\/motion\.button>\s*\)\}\s*<\/AnimatePresence>/;
content = content.replace(oldFabFull, '');

// 2. Insert the FAB into the Chats tab branch
const chatsEnd = `                  )}
                </>
              )}
            </div>
            </div>`;

const chatsEndReplacement = `                  )}
                </>
              )}
            </div>
            <AnimatePresence>
              <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                onClick={() => setShowAdd(!showAdd)}
                className="absolute bottom-4 right-6 w-14 h-14 bg-indigo-500 text-white rounded-2xl flex items-center justify-center shadow-lg hover:bg-indigo-400 transition-colors z-40"
                title="New Chat"
              >
                <Pencil className="w-6 h-6 fill-current" />
              </motion.button>
            </AnimatePresence>
            </div>`;

content = content.replace(chatsEnd, chatsEndReplacement);

fs.writeFileSync('src/components/ChatLayout.tsx', content);
