const fs = require('fs');
let content = fs.readFileSync('src/components/CallsTab.tsx', 'utf8');

// The main FAB (view === "main")
const mainFabRegex = /<button \n              onClick=\{\(\) => setView\("new"\)\}\n              className="absolute bottom-5 right-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-500 rounded-full flex items-center justify-center text-white shadow-xl transition-transform hover:scale-105 z-30"\n            >\n              <Phone className="w-6 h-6 fill-current" \/>\n            <\/button>/g;

const newMainFab = `<button 
          onClick={() => setView("new")}
          className="absolute bottom-4 right-6 w-14 h-14 bg-indigo-500 text-white rounded-2xl flex items-center justify-center shadow-lg hover:bg-indigo-400 transition-colors z-30"
        >
          <Phone className="w-6 h-6 fill-current" />
        </button>`;

content = content.replace(mainFabRegex, newMainFab);

// In case the replacement failed because of spacing differences, let's use a simpler regex
const oldFab1 = 'className="absolute bottom-5 right-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-500 rounded-full flex items-center justify-center text-white shadow-xl transition-transform hover:scale-105 z-30"';
const newFab1 = 'className="absolute bottom-4 right-6 w-14 h-14 bg-indigo-500 text-white rounded-2xl flex items-center justify-center shadow-lg hover:bg-indigo-400 transition-colors z-30"';
content = content.replace(newFab1, newFab1); // wait, oldFab1

fs.writeFileSync('src/components/CallsTab.tsx', content.replace(new RegExp(oldFab1.replace(/[.*+?^$\/{}()|[\\]\\\\]/g, '\\\\$&'), 'g'), newFab1));
