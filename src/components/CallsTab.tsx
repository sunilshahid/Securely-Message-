import React, { useState } from "react";
import { 
  Search, 
  MoreVertical, 
  Phone, 
  Calendar, 
  Grid, 
  Heart, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ArrowLeft, 
  Link2, 
  UserPlus, 
  Video, 
  Copy, 
  Share2, 
  Bell,
  X
,   PhoneIncoming,   PhoneOutgoing,   PhoneMissed,   PhoneOff} from "lucide-react";
import { Conversation } from "../types";
import { motion, AnimatePresence } from "framer-motion";
import { DecryptedAvatar } from "./DecryptedAvatar";

type ViewState = "main" | "new" | "schedule" | "link" | "keypad";

export function CallsTab({
  conversations,
  onStartCall,
  onClose,
  onMenuClick,
}: {
  conversations: Conversation[];
  onStartCall: (userId: string, isVideo: boolean) => void;
  onClose?: () => void;
  onMenuClick?: () => void;
}) {
  const [view, setView] = useState<ViewState>("main");
  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Mock recent calls
  const recentCalls = conversations.slice(0, 5).map((c, i) => ({
    id: i.toString(),
    userId: c.id,
    type: i % 4 === 0 ? "missed" : i % 4 === 1 ? "incoming" : i % 4 === 2 ? "outgoing" : "rejected",
    timestamp: new Date(Date.now() - i * 3600000 * 5),
    isVideo: i % 4 === 0
  }));

  if (view === "main") {
    return (
      <div className="flex flex-col h-full bg-neutral-950 text-neutral-100 relative">
        {searchActive ? (
          <div className="flex items-center p-4 bg-neutral-950 sticky top-0 z-10 gap-3">
            <button onClick={() => { setSearchActive(false); setSearchQuery(""); }} className="p-2 -ml-2 text-neutral-400 hover:text-neutral-200 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-3 top-2.5 text-neutral-500 pointer-events-none" />
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search calls..."
                className="w-full bg-neutral-900 text-neutral-200 text-[15px] rounded-full pl-10 pr-4 py-2 outline-none focus:ring-1 focus:ring-neutral-700 transition-all placeholder-neutral-500 border border-neutral-800"
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 bg-neutral-950 sticky top-0 z-10">
            <h1 className="text-2xl font-semibold">Calls</h1>
            <div className="flex items-center gap-4 text-neutral-400">
              <Search className="w-6 h-6 cursor-pointer hover:text-white transition-colors" onClick={() => setSearchActive(true)} />
              <MoreVertical className="w-6 h-6 cursor-pointer hover:text-white transition-colors" onClick={onMenuClick} />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto pb-20">
          {/* Top Actions */}
          <div className="flex items-center justify-between px-6 py-4">
            <ActionCircle icon={Phone} label="Call" onClick={() => setView("new")} />
            <ActionCircle icon={Calendar} label="Schedule" onClick={() => setView("schedule")} />
            <ActionCircle icon={Grid} label="Keypad" onClick={() => setView("keypad")} />
            <ActionCircle icon={Heart} label="Favorites" onClick={() => {}} />
          </div>

          <div className="px-4 py-2 text-sm font-semibold text-neutral-400">
            Recent
          </div>

          <div className="flex flex-col">
            {recentCalls.map((call) => {
              const conv = conversations.find(c => c.id === call.userId);
              if (!conv) return null;
              
              const nameMatches = (conv.displayName || "").toLowerCase().includes(searchQuery.toLowerCase());
              const idMatches = conv.id.toLowerCase().includes(searchQuery.toLowerCase());
              if (searchQuery.trim() !== "" && !nameMatches && !idMatches) return null;
              return (
                <div key={call.id} className="flex items-center gap-4 px-4 py-3 hover:bg-neutral-900 cursor-pointer transition-colors" >
                  <div className="w-12 h-12 relative flex-shrink-0">
                    <DecryptedAvatar photoUrl={conv.displayName && conv.displayName !== 'Unknown' ? conv.photoUrl : undefined} fallback={conv.displayName && conv.displayName !== 'Unknown' ? conv.displayName.substring(0, 2).toUpperCase() : "?"} className="w-full h-full text-lg rounded-full shadow-sm object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={"font-medium text-lg truncate " + ((call.type === 'missed' || call.type === 'rejected') ? "text-red-500" : "text-neutral-100")}>
                      {conv.displayName || conv.id}
                    </div>
                    <div className="flex items-center gap-1.5 text-neutral-400 text-sm mt-0.5">
                      {call.type === "outgoing" && <ArrowUpRight className="w-4 h-4 text-green-500" />}
                      {call.type === "incoming" && <ArrowDownLeft className="w-4 h-4 text-green-500" />}
                      {call.type === "missed" && <PhoneMissed className="w-4 h-4 text-red-500" />}
                      {call.type === "rejected" && <PhoneOff className="w-4 h-4 text-red-500" />}
                      <span>
                        {call.timestamp.toLocaleDateString([], { weekday: 'long' })}, {call.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-neutral-400 shrink-0">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onStartCall(call.userId, false); }} 
                      className="p-2 hover:bg-neutral-800 rounded-full transition-colors"
                    >
                      <Phone className="w-5 h-5 text-neutral-300" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onStartCall(call.userId, true); }} 
                      className="p-2 hover:bg-neutral-800 rounded-full transition-colors"
                    >
                      <Video className="w-5 h-5 text-neutral-300" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* FAB */}
        <AnimatePresence>
          <motion.button 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setView("new")}
            className="absolute bottom-4 right-6 w-14 h-14 bg-indigo-500 text-white rounded-2xl flex items-center justify-center shadow-lg hover:bg-indigo-400 transition-colors z-30"
          >
            <Phone className="w-6 h-6 fill-current" />
          </motion.button>
        </AnimatePresence>
      </div>
    );
  }

  if (view === "new") {
    return (
      <div className="flex flex-col h-full bg-neutral-950 text-neutral-100">
        <div className="flex items-center gap-4 p-4 sticky top-0 bg-neutral-950 z-10">
          <button onClick={() => setView("main")} className="p-2 -ml-2 rounded-full hover:bg-neutral-800 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-medium flex-1">New call</h1>
          <MoreVertical className="w-6 h-6 text-neutral-400" />
        </div>

        <div className="px-4 py-2 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3 top-2.5 text-neutral-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by Username..."
              className="w-full bg-neutral-900 text-neutral-200 text-[15px] rounded-full pl-10 pr-4 py-2 outline-none focus:ring-1 focus:ring-neutral-700 transition-all placeholder-neutral-500 border border-neutral-800"
            />
          </div>
          <button className="p-2 text-neutral-400 hover:text-neutral-200" onClick={() => setView("keypad")}>
            <Grid className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-3 mt-2 text-sm font-semibold text-neutral-400 flex items-center justify-between">
             <span>Add up to 31 people</span>
          </div>
          
          <ActionListItem icon={Link2} label="New call link" onClick={() => setView("link")} />
          <ActionListItem icon={Grid} label="Call a number" onClick={() => setView("keypad")} />
          <ActionListItem icon={UserPlus} label="New contact" rightIcon={Grid} />
          <ActionListItem icon={Calendar} label="Schedule call" onClick={() => setView("schedule")} />

          <div className="px-4 py-3 mt-2 text-sm font-semibold text-neutral-400">
            Frequently contacted
          </div>
          <div className="flex flex-col">
            {conversations.map((conv) => (
              <div key={conv.id} className="flex items-center gap-4 px-4 py-3 hover:bg-neutral-900 cursor-pointer transition-colors" onClick={() => onStartCall(conv.id, false)}>
                <div className="w-12 h-12 relative flex-shrink-0">
                  <DecryptedAvatar photoUrl={conv.displayName && conv.displayName !== 'Unknown' ? conv.photoUrl : undefined} fallback={conv.displayName && conv.displayName !== 'Unknown' ? conv.displayName.substring(0, 2).toUpperCase() : "?"} className="w-full h-full text-lg rounded-full shadow-sm object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[17px] text-neutral-100 truncate">
                    {conv.displayName || conv.id}
                  </div>
                </div>
                <div className="w-6 h-6 rounded-full border-2 border-neutral-700" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (view === "schedule") {
    return (
      <div className="flex flex-col h-full bg-neutral-950 text-neutral-100">
        <div className="flex items-center gap-4 p-4 sticky top-0 bg-neutral-950 z-10">
          <button onClick={() => setView("new")} className="p-2 -ml-2 rounded-full hover:bg-neutral-800 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-medium flex-1">Schedule call</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-20">
          <div className="py-2">
             <div className="text-2xl font-bold mb-1">My scheduled call</div>
             <div className="text-neutral-500 text-lg">Description (optional)</div>
          </div>
          
          <div className="mt-8 border-b border-neutral-800 pb-6 relative pl-10">
            <div className="absolute left-0 top-1 bottom-1 w-[2px] bg-neutral-800 ml-3 flex flex-col items-center">
               <div className="absolute top-0 -ml-[9px] bg-neutral-950 text-neutral-400"><Calendar className="w-5 h-5"/></div>
               <div className="absolute bottom-0 -ml-[9px] bg-neutral-950 text-neutral-400"><Calendar className="w-5 h-5"/></div>
            </div>
            
            <div className="flex justify-between items-center mb-8">
              <span className="text-lg">Sep 8, 2026</span>
              <span className="text-lg">1:00 PM</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-lg">Sep 8, 2026</span>
              <span className="text-lg">1:30 PM</span>
            </div>
          </div>
          
          <div className="py-4 border-b border-neutral-800 pl-10">
            <span className="text-lg">Remove end time</span>
          </div>

          <div className="py-4 border-b border-neutral-800 flex items-center gap-4">
            <Video className="w-6 h-6 text-neutral-400 shrink-0" />
            <div>
              <div className="text-lg">Call type</div>
              <div className="text-neutral-500">Video</div>
            </div>
          </div>

          <div className="py-4 border-b border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <UserPlus className="w-6 h-6 text-neutral-400 shrink-0" />
              <div className="text-lg">Require approval to join</div>
            </div>
            <div className="w-12 h-7 bg-indigo-600 rounded-full relative">
               <div className="w-6 h-6 bg-white rounded-full absolute right-0.5 top-0.5" />
            </div>
          </div>
          
          <div className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Bell className="w-6 h-6 text-neutral-400 shrink-0" />
              <div>
                 <div className="text-lg">Reminder</div>
                 <div className="text-neutral-500">15 minutes before</div>
              </div>
            </div>
          </div>
        </div>
        
        <button className="absolute bottom-4 right-6 w-14 h-14 bg-indigo-500 text-white rounded-2xl flex items-center justify-center shadow-lg hover:bg-indigo-400 transition-colors z-30" onClick={() => setView("main")}>
           <ArrowUpRight className="w-7 h-7 stroke-[3px]" />
        </button>
      </div>
    );
  }

  if (view === "link") {
    return (
      <div className="flex flex-col h-full bg-neutral-950 text-neutral-100">
        <div className="flex items-center gap-4 p-4 sticky top-0 bg-neutral-950 z-10">
          <button onClick={() => setView("new")} className="p-2 -ml-2 rounded-full hover:bg-neutral-800 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-medium flex-1">Create call link</h1>
        </div>
        
        <div className="p-4">
           <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex items-start gap-4 mb-6">
              <div className="w-14 h-14 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center shrink-0">
                 <Video className="w-7 h-7" />
              </div>
              <div className="flex-1 min-w-0 pr-2">
                 <div className="text-[17px] font-medium mb-1">Signal call</div>
                 <div className="text-neutral-400 text-sm leading-relaxed break-all">
                    {window.location.origin}/call/#key=nqqdzxdb-txpnmbbf-qkkzzdgh-dhsxmrtx-nc-bbbbbbbb
                 </div>
              </div>
              <button className="px-4 py-2 bg-indigo-500 text-white rounded-full font-medium text-sm">Join</button>
           </div>

           <div className="py-4 border-b border-neutral-800">
             <div className="text-[17px]">Add call name</div>
           </div>
           
           <div className="py-4 border-b border-neutral-800 flex items-center justify-between mb-2">
             <div className="text-[17px]">Require admin approval</div>
             <div className="w-12 h-7 bg-indigo-600 rounded-full relative">
                <div className="w-6 h-6 bg-white rounded-full absolute right-0.5 top-0.5" />
             </div>
           </div>

           <ActionListItem icon={Share2} label="Share link via Signal" onClick={() => {}} />
           <ActionListItem icon={Copy} label="Copy link" onClick={() => {}} />
           <ActionListItem icon={Share2} label="Share link" onClick={() => {}} />
           
        </div>
        
        <div className="mt-auto p-4 flex justify-end">
           <button onClick={() => setView("main")} className="px-6 py-2.5 bg-indigo-500 text-white font-medium rounded-full">Done</button>
        </div>
      </div>
    );
  }

  if (view === "keypad") {
    return (
      <div className="flex flex-col h-full bg-neutral-950 text-neutral-100">
        <div className="flex items-center gap-4 p-4 sticky top-0 bg-neutral-950 z-10">
          <button onClick={() => setView("main")} className="p-2 -ml-2 rounded-full hover:bg-neutral-800 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex-1 flex flex-col justify-end items-center pb-10">
           <div className="text-3xl font-medium mb-8 min-h-10 text-center tracking-widest text-indigo-200">
           </div>
           
           <div className="grid grid-cols-3 gap-6 mb-8 px-8 w-full max-w-sm">
             <DialButton number="1" />
             <DialButton number="2" letters="ABC" />
             <DialButton number="3" letters="DEF" />
             <DialButton number="4" letters="GHI" />
             <DialButton number="5" letters="JKL" />
             <DialButton number="6" letters="MNO" />
             <DialButton number="7" letters="PQRS" />
             <DialButton number="8" letters="TUV" />
             <DialButton number="9" letters="WXYZ" />
             <DialButton number="*" textLg />
             <DialButton number="0" letters="+" />
             <DialButton number="#" textLg />
           </div>

           <button className="w-16 h-16 bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-indigo-400 transition-colors">
             <Phone className="w-8 h-8 fill-current" />
           </button>
        </div>
      </div>
    );
  }

  return null;
}

function ActionCircle({ icon: Icon, label, onClick }: { icon: any, label: string, onClick?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 cursor-pointer" onClick={onClick}>
      <div className="w-14 h-14 rounded-full bg-neutral-900 flex items-center justify-center text-neutral-200 hover:bg-neutral-800 transition-colors">
        <Icon className="w-6 h-6" />
      </div>
      <span className="text-[13px] text-neutral-400 font-medium">{label}</span>
    </div>
  );
}

function ActionListItem({ icon: Icon, label, onClick, rightIcon: RightIcon }: { icon: any, label: string, onClick?: () => void, rightIcon?: any }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5 hover:bg-neutral-900 cursor-pointer transition-colors" onClick={onClick}>
      <div className="w-11 h-11 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-500 flex-shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 text-[17px] font-medium">
        {label}
      </div>
      {RightIcon && <RightIcon className="w-6 h-6 text-neutral-400" />}
    </div>
  );
}

function DialButton({ number, letters, textLg }: { number: string, letters?: string, textLg?: boolean }) {
  return (
    <button className="flex flex-col items-center justify-center w-20 h-20 rounded-full bg-neutral-900 hover:bg-neutral-800 transition-colors active:scale-95">
      <span className={`text-4xl text-neutral-100 font-light ${textLg ? 'translate-y-2' : ''}`}>{number}</span>
      {letters && <span className="text-[10px] text-neutral-500 font-semibold tracking-widest mt-0.5">{letters}</span>}
    </button>
  );
}
