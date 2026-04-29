import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  MapPin, 
  User, 
  MessageSquare, 
  Image as ImageIcon, 
  Navigation,
  Send
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken,
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot
} from 'firebase/firestore';

// --- Firebase 配置與初始化 ---
// ⚠️ 請在這裡替換為您真實的 Firebase 專案設定
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.warn("Firebase尚未正確設定，這可能會導致資料庫與驗證功能無法運行：", error);
}

const appId = 'yongchun-street-project';

// --- 模擬資料：角色故事與路線 ---
const PERSONAS = {
  resident: {
    title: '資深住戶：王伯伯',
    route: '活動中心 -> 巷弄老樹 -> 遺址轉角',
    story: '我在這裡住了四十年，看著圍牆一塊塊疊起。對我來說，移動不是困難，而是習慣了窄路中的人情味。',
    color: 'bg-amber-100',
    borderColor: 'border-amber-500'
  },
  student: {
    title: '實習學生：小林',
    route: 'd-school -> 臨時便道 -> 生活合作宅預定地',
    story: '帶著捲尺與筆記本，我試圖在非正式聚落的紋理中，尋找社會住宅的另一種可能性。',
    color: 'bg-blue-100',
    borderColor: 'border-blue-500'
  },
  outsider: {
    title: '好奇訪客：阿強',
    route: '捷運站 -> 永春街入口 -> 展場核心',
    story: '第一次踏入這裡，導航似乎失靈了。這種「迷路感」正是聚落最迷人的屏障。',
    color: 'bg-green-100',
    borderColor: 'border-green-500'
  }
};

const App = () => {
  const [view, setView] = useState('landing'); // landing, persona, gallery, forum
  const [user, setUser] = useState(null);
  const [activePersona, setActivePersona] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [artworks, setArtworks] = useState([]);

  // 1. 初始化 Auth
  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Authentication failed:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  // 2. 處理 URL 參數 (現場掃描 QR Code 觸發角色)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const role = params.get('role');
    if (role && PERSONAS[role]) {
      setActivePersona(PERSONAS[role]);
      setView('persona');
    }
  }, []);

  // 3. 獲取討論版資料
  useEffect(() => {
    if (!user || !db) return;

    // 獲取評論
    const commentsRef = collection(db, 'artifacts', appId, 'public', 'data', 'comments');
    const unsubscribeComments = onSnapshot(commentsRef, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // 在前端排序：最新的在上面
      setMessages(msgs.sort((a, b) => b.timestamp - a.timestamp));
    }, (err) => console.error("Firestore comments error:", err));

    // 獲取寫生作品
    const galleryRef = collection(db, 'artifacts', appId, 'public', 'data', 'gallery');
    const unsubscribeGallery = onSnapshot(galleryRef, (snapshot) => {
      const arts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setArtworks(arts);
    }, (err) => console.error("Firestore gallery error:", err));

    return () => {
      unsubscribeComments();
      unsubscribeGallery();
    };
  }, [user]);

  const postMessage = async () => {
    if (!newMessage.trim() || !user || !db) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'comments'), {
        text: newMessage,
        authorId: user.uid,
        timestamp: Date.now()
      });
      setNewMessage('');
    } catch (err) {
      console.error("Failed to post message:", err);
    }
  };

  // --- UI 子組件 ---
  const Nav = () => (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around p-3 z-50">
      <button onClick={() => setView('landing')} className={`flex flex-col items-center ${view === 'landing' ? 'text-blue-600' : 'text-gray-400'}`}>
        <Info size={20} />
        <span className="text-xs mt-1">資訊</span>
      </button>
      <button onClick={() => setView('persona')} className={`flex flex-col items-center ${view === 'persona' ? 'text-blue-600' : 'text-gray-400'}`}>
        <User size={20} />
        <span className="text-xs mt-1">角色</span>
      </button>
      <button onClick={() => setView('gallery')} className={`flex flex-col items-center ${view === 'gallery' ? 'text-blue-600' : 'text-gray-400'}`}>
        <ImageIcon size={20} />
        <span className="text-xs mt-1">藝廊</span>
      </button>
      <button onClick={() => setView('forum')} className={`flex flex-col items-center ${view === 'forum' ? 'text-blue-600' : 'text-gray-400'}`}>
        <MessageSquare size={20} />
        <span className="text-xs mt-1">討論</span>
      </button>
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans text-slate-800">
      {/* Header */}
      <header className="bg-white p-4 shadow-sm sticky top-0 z-40">
        <h1 className="font-bold text-lg text-center tracking-tight">永春街：移動與聚落展覽</h1>
      </header>

      <main className="max-w-md mx-auto p-4">
        
        {/* 展前資訊階段 */}
        {view === 'landing' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-lg">
              <h2 className="text-2xl font-bold mb-2">穿梭永春街的記憶線</h2>
              <p className="opacity-90 mb-4">這是一個關於歷史、移動困境與未來居住想像的互動展覽。</p>
              <div className="flex items-center gap-2 text-sm mb-1">
                <Calendar size={16} /> 展覽期間：即將公布
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin size={16} /> 永春街活動中心 / D-School
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <Navigation size={18} className="text-blue-500" /> 參展指南
              </h3>
              <ol className="text-sm space-y-3 text-slate-600">
                <li className="flex gap-2">
                  <span className="bg-blue-100 text-blue-600 w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0">1</span>
                  從 D-School 出發，沿著指定路線進行觀察與寫生。
                </li>
                <li className="flex gap-2">
                  <span className="bg-blue-100 text-blue-600 w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0">2</span>
                  到達現場掃描 QR Code，領取您的專屬角色身分。
                </li>
                <li className="flex gap-2">
                  <span className="bg-blue-100 text-blue-600 w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0">3</span>
                  跟隨角色視角探索聚落，並參與拼貼工作坊。
                </li>
              </ol>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setView('gallery')} className="bg-white p-4 rounded-xl border border-slate-200 text-center shadow-sm hover:border-blue-300 transition-colors">
                <ImageIcon className="mx-auto mb-2 text-slate-400" />
                <span className="text-sm font-medium">觀看寫生牆</span>
              </button>
              <button onClick={() => setView('forum')} className="bg-white p-4 rounded-xl border border-slate-200 text-center shadow-sm hover:border-blue-300 transition-colors">
                <MessageSquare className="mx-auto mb-2 text-slate-400" />
                <span className="text-sm font-medium">參與未來討論</span>
              </button>
            </div>
          </div>
        )}

        {/* 角色導覽階段 */}
        {view === 'persona' && (
          <div className="animate-fade-in space-y-4">
            {!activePersona ? (
              <div className="text-center py-10 bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
                <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="text-slate-400" />
                </div>
                <h3 className="font-bold text-lg">準備好開始您的旅程了嗎？</h3>
                <p className="text-slate-500 text-sm mt-2 mb-6">請掃描展場各處的 QR Code 以領取身分。</p>
                <div className="space-y-2">
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">快速預覽模式</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <button onClick={() => setActivePersona(PERSONAS.resident)} className="px-3 py-1 bg-amber-50 text-amber-700 text-xs rounded-full border border-amber-200">王伯伯</button>
                    <button onClick={() => setActivePersona(PERSONAS.student)} className="px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200">小林</button>
                    <button onClick={() => setActivePersona(PERSONAS.outsider)} className="px-3 py-1 bg-green-50 text-green-700 text-xs rounded-full border border-green-200">阿強</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className={`rounded-2xl border-2 ${activePersona.borderColor} overflow-hidden shadow-md bg-white animate-fade-in`}>
                <div className={`${activePersona.color} p-6`}>
                  <div className="flex justify-between items-start mb-4">
                    <span className="bg-white/80 text-xs px-2 py-1 rounded font-bold uppercase tracking-wider text-slate-600">已解鎖角色</span>
                    <button onClick={() => setActivePersona(null)} className="text-slate-400 hover:text-slate-600 text-sm font-medium">切換身分</button>
                  </div>
                  <h2 className="text-2xl font-black mb-2">{activePersona.title}</h2>
                  <p className="text-sm leading-relaxed italic text-slate-700">"{activePersona.story}"</p>
                </div>
                <div className="p-6 space-y-6">
                  <section>
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-1">
                      <Navigation size={14} /> 專屬移動路線
                    </h4>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white flex-shrink-0">
                        <MapPin size={16} />
                      </div>
                      <p className="text-sm font-bold text-blue-900 leading-tight">{activePersona.route}</p>
                    </div>
                  </section>
                  
                  <div className="p-10 bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-sm text-slate-400 text-center">
                    <Navigation className="mx-auto mb-2 opacity-20" size={32} />
                    互動地圖載入中...
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 寫生藝廊階段 */}
        {view === 'gallery' && (
          <div className="animate-fade-in space-y-4">
            <h2 className="text-xl font-bold px-2">共創寫生牆</h2>
            <p className="text-sm text-slate-500 px-2 mb-4">這裡展示了觀眾在移動過程中的田野記錄與畫作。</p>
            
            <div className="grid grid-cols-2 gap-3">
              {artworks.length > 0 ? artworks.map(art => (
                <div key={art.id} className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200">
                  <div className="aspect-square bg-slate-100 overflow-hidden">
                    <img src={art.url} alt={art.title} className="object-cover w-full h-full hover:scale-105 transition-transform" />
                  </div>
                  <div className="p-2 bg-white">
                    <p className="text-xs font-bold truncate">{art.title || '無標題'}</p>
                    <p className="text-[10px] text-slate-400">by {art.author || '匿名觀者'}</p>
                  </div>
                </div>
              )) : (
                <>
                  {[1,2,3,4].map(i => (
                    <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200 p-4">
                      <div className="aspect-square bg-slate-50 rounded-lg mb-2 flex flex-col items-center justify-center text-slate-300 border border-dashed">
                        <ImageIcon size={24} />
                        <span className="text-[10px] mt-1">作品整理中</span>
                      </div>
                      <div className="h-3 bg-slate-100 rounded w-3/4 mb-1"></div>
                      <div className="h-2 bg-slate-50 rounded w-1/2"></div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        {/* 討論版階段 */}
        {view === 'forum' && (
          <div className="animate-fade-in flex flex-col h-[75vh]">
            <div className="px-2 mb-4">
              <h2 className="text-xl font-bold">聚落想像對話框</h2>
              <p className="text-sm text-slate-500 mt-1">關於這裡的未來，你希望留下什麼？</p>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 px-2 pb-4">
              {messages.length > 0 ? messages.map(msg => (
                <div key={msg.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 animate-fade-in">
                  <p className="text-sm text-slate-700 leading-relaxed">{msg.text}</p>
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500">
                      ID: {msg.authorId ? msg.authorId.substring(0, 6) : 'Anonymous'}
                    </span>
                    <span className="text-[10px] text-slate-300">
                      {new Date(msg.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )) : (
                <div className="text-center py-20 text-slate-300 text-sm">暫無討論，成為第一個分享想法的人吧！</div>
              )}
            </div>

            <div className="sticky bottom-4 bg-white/80 backdrop-blur-md p-2 rounded-2xl shadow-lg border border-slate-200 flex items-center gap-2 m-2">
              <input 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="輸入您的觀點..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm p-3"
                onKeyPress={(e) => e.key === 'Enter' && postMessage()}
              />
              <button 
                onClick={postMessage} 
                disabled={!newMessage.trim()}
                className={`p-3 rounded-xl shadow-md transition-all ${newMessage.trim() ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-200 text-slate-400'}`}
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        )}

      </main>

      <Nav />


    </div>
  );
};

export default App;
