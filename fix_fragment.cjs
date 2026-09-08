const fs = require('fs');
let content = fs.readFileSync('src/components/ChatLayout.tsx', 'utf8');

// 1. Add <Fragment> wrapper
content = content.replace(
  '<div className="flex-1 overflow-y-auto h-full w-full">',
  '<>\n              <div className="flex-1 overflow-y-auto h-full w-full">'
);

// 2. Replace the stray </div> with </Fragment>
content = content.replace(
  '            </AnimatePresence>\n          </div>\n          ) : activeTab === "calls" ? (',
  '            </AnimatePresence>\n            </>\n          ) : activeTab === "calls" ? ('
);

fs.writeFileSync('src/components/ChatLayout.tsx', content);
