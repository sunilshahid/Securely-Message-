const fs = require('fs');
let content = fs.readFileSync('src/components/ChatLayout.tsx', 'utf8');

const regex = /                  \)\}\n                <\/>\n              \)\}\n            <\/div>\n            <AnimatePresence>[\s\S]*?\) : activeTab === "calls" \? \(/;

const newString = `                  )}
                </>
              )}
            </div>
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
          </>
        ) : activeTab === "calls" ? (`;

content = content.replace(regex, newString);

fs.writeFileSync('src/components/ChatLayout.tsx', content);
