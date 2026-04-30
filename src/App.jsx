import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  MapPin, 
  User, 
  MessageSquare, 
  Image as ImageIcon, 
  Navigation,
  Send,
  Info,
  Clock,
  Building2,
  History,
  ArrowLeftRight,
  ChevronRight
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

// --- 模擬預覽資料 (當 Firebase 尚未設定時顯示) ---
const MOCK_MESSAGES = [
  { id: 'm1', text: '這裡的巷弄很有味道，希望能保留這份安靜。', authorId: 'user_123', timestamp: Date.now() - 86400000 },
  { id: 'm2', text: '移動路線的設計很有趣，尤其是老樹那個點。', authorId: 'user_456', timestamp: Date.now() - 3600000 },
];

const MOCK_ARTWORKS = [
  { id: 'a1', title: '老樹下的午後', author: '小林', url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&q=80' },
  { id: 'a2', title: '紅磚牆的記憶', author: '阿強', url: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=400&q=80' },
];

// --- Firebase 配置與初始化 ---
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// 檢查是否為真實的 Config
const isFirebaseSetup = firebaseConfig.apiKey !== "YOUR_API_KEY";

let app, auth, db;
if (isFirebaseSetup) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error) {
    console.warn("Firebase 初始化失敗：", error);
  }
}

const appId = 'yongchun-street-project';

// --- 模擬資料：角色故事與路線 ---
const PERSONAS = {
  resident: {
    title: '資深住戶：王伯伯',
    route: '活動中心 -> 巷弄老樹 -> 遺址轉角',
    story: '我在這裡住了四十年，看著圍牆一塊塊疊起。對我來說，移動不是困難，而是習慣了窄路中的人情味。',
    color: 'bg-[#F5F0E8]',
    borderColor: 'border-[#8B4513]',
    accent: 'text-[#8B4513]',
    tag: 'bg-[#8B4513]/10 text-[#8B4513]'
  },
  student: {
    title: '實習學生：小林',
    route: 'd-school -> 臨時便道 -> 生活合作宅預定地',
    story: '帶著捲尺與筆記本，我試圖在非正式聚落的紋理中，尋找社會住宅的另一種可能性。',
    color: 'bg-[#E8F5F1]',
    borderColor: 'border-[#1A6B5A]',
    accent: 'text-[#1A6B5A]',
    tag: 'bg-[#1A6B5A]/10 text-[#1A6B5A]'
  },
  outsider: {
    title: '好奇訪客：阿強',
    route: '捷運站 -> 永春街入口 -> 展場核心',
    story: '第一次踏入這裡，導航似乎失靈了。這種「迷路感」正是聚落最迷人的屏障。',
    color: 'bg-[#EDE8F5]',
    borderColor: 'border-[#5B4A8A]',
    accent: 'text-[#5B4A8A]',
    tag: 'bg-[#5B4A8A]/10 text-[#5B4A8A]'
  }
};

const App = () => {
  const [view, setView] = useState('landing'); // landing, persona, gallery, forum, compare
  const [user, setUser] = useState(isFirebaseSetup ? null : { uid: 'guest-preview' });
  const [activePersona, setActivePersona] = useState(null);
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const [newMessage, setNewMessage] = useState('');
  const [artworks, setArtworks] = useState(MOCK_ARTWORKS);
  
  // 新增：控制時間滑桿的狀態 (0 到 100)
  const [sliderPosition, setSliderPosition] = useState(50);

  // 1. 初始化 Auth
  useEffect(() => {
    if (!auth || !isFirebaseSetup) return;
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

  // 2. 處理 URL 參數
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
    if (!user || !db || !isFirebaseSetup) return;

    // 獲取評論
    const commentsRef = collection(db, 'artifacts', appId, 'public', 'data', 'comments');
    const unsubscribeComments = onSnapshot(commentsRef, (snapshot) => {
      if (snapshot.empty) return;
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs.sort((a, b) => b.timestamp - a.timestamp));
    }, (err) => console.error("Firestore comments error:", err));

    // 獲取寫生作品
    const galleryRef = collection(db, 'artifacts', appId, 'public', 'data', 'gallery');
    const unsubscribeGallery = onSnapshot(galleryRef, (snapshot) => {
      if (snapshot.empty) return;
      const arts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setArtworks(arts);
    }, (err) => console.error("Firestore gallery error:", err));

    return () => {
      unsubscribeComments();
      unsubscribeGallery();
    };
  }, [user]);

  const postMessage = async () => {
    if (!newMessage.trim() || !user) return;
    
    // 如果沒連上 Firebase，僅在本地模擬新增
    if (!isFirebaseSetup) {
      const mockMsg = {
        id: Date.now().toString(),
        text: newMessage,
        authorId: user.uid,
        timestamp: Date.now()
      };
      setMessages([mockMsg, ...messages]);
      setNewMessage('');
      return;
    }

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
    <nav className="fixed bottom-0 left-0 right-0 nav-heritage flex justify-around p-3 z-50">
      <button onClick={() => setView('landing')} className={`flex flex-col items-center transition-colors ${view === 'landing' ? 'text-[#8B4513]' : 'text-[#5C4033]/40'}`}>
        <Info size={20} />
        <span className="text-[10px] mt-1 font-medium">資訊</span>
      </button>
      <button onClick={() => setView('persona')} className={`flex flex-col items-center transition-colors ${view === 'persona' ? 'text-[#8B4513]' : 'text-[#5C4033]/40'}`}>
        <User size={20} />
        <span className="text-[10px] mt-1 font-medium">角色</span>
      </button>
      {/* 新增：時空對比按鈕 */}
      <button onClick={() => setView('compare')} className={`flex flex-col items-center transition-colors ${view === 'compare' ? 'text-[#8B4513]' : 'text-[#5C4033]/40'}`}>
        <History size={20} />
        <span className="text-[10px] mt-1 font-medium">時空</span>
      </button>
      <button onClick={() => setView('gallery')} className={`flex flex-col items-center transition-colors ${view === 'gallery' ? 'text-[#8B4513]' : 'text-[#5C4033]/40'}`}>
        <ImageIcon size={20} />
        <span className="text-[10px] mt-1 font-medium">藝廊</span>
      </button>
      <button onClick={() => setView('forum')} className={`flex flex-col items-center transition-colors ${view === 'forum' ? 'text-[#1A6B5A]' : 'text-[#5C4033]/40'}`}>
        <MessageSquare size={20} />
        <span className="text-[10px] mt-1 font-medium">討論</span>
      </button>
    </nav>
  );

  return (
    <div className="min-h-screen pb-20 text-[#2C1810]" style={{ backgroundColor: '#F5F0E8' }}>
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md" style={{ background: 'linear-gradient(to right, rgba(139,69,19,0.08), rgba(26,107,90,0.06))', borderBottom: '1px solid rgba(139,69,19,0.1)' }}>
        <div className="max-w-md mx-auto p-4 flex items-center justify-center gap-2">
          <h1 className="font-serif-tc font-bold text-lg text-center tracking-wider text-gradient-heritage">永春街：移動與聚落展覽</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4">
        
        {/* 展前資訊階段 */}
        {view === 'landing' && (
          <div className="space-y-5 animate-fade-in">
            {/* Hero 主視覺卡片 */}
            <div className="rounded-2xl overflow-hidden shadow-lg texture-overlay" style={{ background: 'linear-gradient(145deg, #2C1810 0%, #5C4033 40%, #1A6B5A 100%)' }}>
              <div className="relative p-6 text-white z-10">
                <p className="text-[10px] uppercase tracking-[0.3em] opacity-60 mb-3 font-medium">互動展覽 ✦ 永春街聚落</p>
                <h2 className="font-serif-tc text-2xl font-bold mb-2 leading-snug">穿梭永春街的<br/>記憶線</h2>
                <div className="brick-divider my-4 opacity-30"></div>
                <p className="text-sm opacity-80 leading-relaxed mb-5">一個關於歷史、移動困境與未來居住想像的互動展覽。<br/>從老巷弄的人情味，到都市更新的韌性想像。</p>
                
                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-sm">
                    <Calendar size={15} className="mt-0.5 opacity-70 flex-shrink-0" />
                    <div>
                      <p className="font-medium">5月30日 — 6月4日</p>
                      <p className="font-medium">6月8日 — 6月14日</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin size={15} className="mt-0.5 opacity-70 flex-shrink-0" />
                    <div>
                      <p>展場A — 客家文化園區1/F驛站走廊</p>
                      <p>展場B — 永春街299號外</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 參展指南 */}
            <div className="card-heritage rounded-xl p-5">
              <h3 className="font-serif-tc font-bold mb-4 flex items-center gap-2 text-[#6B4226]">
                <Navigation size={18} className="text-[#8B4513]" /> 參展指南
              </h3>
              <ol className="text-sm space-y-3 text-[#5C4033]">
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 font-bold text-white" style={{ background: 'linear-gradient(135deg, #8B4513, #C4956A)' }}>1</span>
                  <span>從 D-School 出發，沿著指定路線進行觀察與寫生。</span>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 font-bold text-white" style={{ background: 'linear-gradient(135deg, #8B4513, #C4956A)' }}>2</span>
                  <span>到達現場掃描 QR Code，領取您的專屬角色身分。</span>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 font-bold text-white" style={{ background: 'linear-gradient(135deg, #1A6B5A, #2D9B83)' }}>3</span>
                  <span>跟隨角色視角探索聚落，並參與拼貼工作坊。</span>
                </li>
              </ol>
            </div>

            {/* 展場資訊 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="card-heritage rounded-xl p-4">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2" style={{ background: 'linear-gradient(135deg, #8B4513, #C4956A)' }}>
                  <Building2 size={18} className="text-white" />
                </div>
                <p className="text-xs font-bold text-[#6B4226] mb-0.5">展場A</p>
                <p className="text-[10px] text-[#5C4033]/70 leading-tight">客家文化園區<br/>1/F驛站走廊</p>
              </div>
              <div className="rounded-xl p-4" style={{ background: 'linear-gradient(135deg, #E8F5F1, #D0EDE5)' , border: '1px solid rgba(26,107,90,0.15)' }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2" style={{ background: 'linear-gradient(135deg, #1A6B5A, #2D9B83)' }}>
                  <MapPin size={18} className="text-white" />
                </div>
                <p className="text-xs font-bold text-[#1A6B5A] mb-0.5">展場B</p>
                <p className="text-[10px] text-[#1A6B5A]/70 leading-tight">永春街299號外<br/>實地聚落現場</p>
              </div>
            </div>

            {/* 快捷按鈕 */}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setView('compare')} className="card-heritage p-4 rounded-xl text-center hover:shadow-md transition-all group border-[#8B4513]/20">
                <History className="mx-auto mb-2 text-[#8B4513]/50 group-hover:text-[#8B4513] transition-colors" />
                <span className="text-sm font-bold text-[#6B4226]">探索時空對比</span>
                <p className="text-[10px] text-[#5C4033]/40 mt-0.5">現況與合作宅提案</p>
              </button>
              <button onClick={() => setView('persona')} className="card-heritage p-4 rounded-xl text-center hover:shadow-md transition-all group border-[#8B4513]/20">
                <User className="mx-auto mb-2 text-[#8B4513]/50 group-hover:text-[#8B4513] transition-colors" />
                <span className="text-sm font-bold text-[#6B4226]">切換觀展角色</span>
                <p className="text-[10px] text-[#5C4033]/40 mt-0.5">開啟專屬路線</p>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setView('gallery')} className="card-heritage p-4 rounded-xl text-center hover:shadow-md transition-all group border-[#8B4513]/20">
                <ImageIcon className="mx-auto mb-2 text-[#8B4513]/50 group-hover:text-[#8B4513] transition-colors" />
                <span className="text-sm font-medium text-[#6B4226]">觀看寫生牆</span>
              </button>
              <button onClick={() => setView('forum')} className="p-4 rounded-xl text-center hover:shadow-md transition-all group" style={{ background: 'linear-gradient(135deg, #E8F5F1, #D0EDE5)', border: '1px solid rgba(26,107,90,0.15)' }}>
                <MessageSquare className="mx-auto mb-2 text-[#1A6B5A]/50 group-hover:text-[#1A6B5A] transition-colors" />
                <span className="text-sm font-medium text-[#1A6B5A]">參與未來討論</span>
              </button>
            </div>
          </div>
        )}

        {/* --- 新增：時空對比 (Before/After Slider) 階段 --- */}
        {view === 'compare' && (
          <div className="animate-fade-in space-y-6">
            <div className="px-2">
              <h2 className="font-serif-tc text-xl font-bold text-[#2C1810]">聚落的過去與未來</h2>
              <p className="text-sm text-[#5C4033]/60 mt-1">左右滑動，對比永春街現狀與生活合作宅提案的可能性。</p>
            </div>

            {/* 滑桿主要容器 */}
            <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-xl border border-[#8B4513]/10 bg-[#E8DFD0] group">
              
              {/* 底層圖片 (After / 未來提案) */}
              <img 
                src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1000&auto=format&fit=crop" 
                alt="生活合作宅提案" 
                className="absolute inset-0 w-full h-full object-cover"
                draggable="false"
              />
              
              {/* 頂層圖片 (Before / 現狀) */}
              <img 
                src="https://images.unsplash.com/photo-1514565131-fce0801e5785?q=80&w=1000&auto=format&fit=crop" 
                alt="永春街現狀" 
                className="absolute inset-0 w-full h-full object-cover"
                style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                draggable="false"
              />

              {/* 分隔線與拖曳按鈕 */}
              <div 
                className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_15px_rgba(0,0,0,0.4)] pointer-events-none z-10"
                style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-2xl flex items-center justify-center border-4 border-[#F5F0E8]">
                  <ArrowLeftRight size={18} className="text-[#8B4513]" />
                </div>
              </div>

              {/* 隱形的 Range Input */}
              <input 
                type="range" 
                min="0" max="100" 
                value={sliderPosition} 
                onChange={(e) => setSliderPosition(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
                aria-label="調整時間軸"
              />
              
              {/* 標籤標示 */}
              <div className="absolute bottom-4 left-4 bg-[#8B4513]/80 text-[#F5F0E8] text-[10px] px-3 py-1.5 rounded-full backdrop-blur-md z-10 pointer-events-none font-bold tracking-widest">
                2024 現狀
              </div>
              <div className="absolute bottom-4 right-4 bg-[#1A6B5A]/80 text-[#E8F5F1] text-[10px] px-3 py-1.5 rounded-full backdrop-blur-md z-10 pointer-events-none font-bold tracking-widest">
                未來合作宅
              </div>
            </div>

            {/* 說明文字 */}
            <div className="card-heritage p-5 rounded-2xl shadow-sm border-[#8B4513]/10">
              <h3 className="font-serif-tc font-bold text-sm mb-2 text-[#8B4513] flex items-center gap-2">
                <Building2 size={16} /> 案例分析：生活合作宅
              </h3>
              <p className="text-xs text-[#5C4033]/80 leading-relaxed mb-4">
                透過「混合收入居住模式」，試圖在不抹除原有聚落紋理的情況下，植入新型態的公共空間。對比現狀的擁擠與移動困境，未來的設計是否能帶來更好的居住適應？
              </p>
              <button onClick={() => setView('forum')} className="w-full py-3 rounded-xl bg-[#1A6B5A]/10 text-[#1A6B5A] text-xs font-bold flex items-center justify-center gap-1 hover:bg-[#1A6B5A]/20 transition-colors">
                前往討論版分享你的看法 <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* 角色導覽階段 */}
        {view === 'persona' && (
          <div className="animate-fade-in space-y-4">
            {!activePersona ? (
              <div className="text-center py-10 card-heritage rounded-2xl p-8">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg, #E8DFD0, #F5F0E8)', border: '2px solid rgba(139,69,19,0.2)' }}>
                  <User className="text-[#8B4513]" />
                </div>
                <h3 className="font-serif-tc font-bold text-lg text-[#2C1810]">準備好開始您的旅程了嗎？</h3>
                <p className="text-[#5C4033]/60 text-sm mt-2 mb-6">請掃描展場各處的 QR Code 以領取身分。</p>
                <div className="space-y-3">
                  <p className="text-[10px] text-[#8B4513]/50 uppercase tracking-widest font-bold">快速預覽模式</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <button onClick={() => setActivePersona(PERSONAS.resident)} className="px-4 py-1.5 bg-[#8B4513]/10 text-[#8B4513] text-xs rounded-full border border-[#8B4513]/20 hover:bg-[#8B4513]/20 transition-colors">王伯伯</button>
                    <button onClick={() => setActivePersona(PERSONAS.student)} className="px-4 py-1.5 bg-[#1A6B5A]/10 text-[#1A6B5A] text-xs rounded-full border border-[#1A6B5A]/20 hover:bg-[#1A6B5A]/20 transition-colors">小林</button>
                    <button onClick={() => setActivePersona(PERSONAS.outsider)} className="px-4 py-1.5 bg-[#5B4A8A]/10 text-[#5B4A8A] text-xs rounded-full border border-[#5B4A8A]/20 hover:bg-[#5B4A8A]/20 transition-colors">阿強</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className={`rounded-2xl border-2 ${activePersona.borderColor} overflow-hidden shadow-md animate-fade-in`} style={{ backgroundColor: '#FFFCF7' }}>
                <div className={`${activePersona.color} p-6`}>
                  <div className="flex justify-between items-start mb-4">
                    <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider ${activePersona.tag}`}>已解鎖角色</span>
                    <button onClick={() => setActivePersona(null)} className="text-[#5C4033]/50 hover:text-[#5C4033] text-sm font-medium transition-colors">切換身分</button>
                  </div>
                  <h2 className={`font-serif-tc text-2xl font-black mb-2 ${activePersona.accent}`}>{activePersona.title}</h2>
                  <p className="text-sm leading-relaxed italic text-[#5C4033]/80">「{activePersona.story}」</p>
                </div>
                <div className="p-6 space-y-6">
                  <section>
                    <h4 className="text-xs font-bold text-[#5C4033]/50 uppercase mb-3 flex items-center gap-1">
                      <Navigation size={14} /> 專屬移動路線
                    </h4>
                    <div className="p-4 rounded-xl flex items-center gap-3" style={{ background: 'linear-gradient(135deg, #F5F0E8, #E8DFD0)', border: '1px solid rgba(139,69,19,0.1)' }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg, #8B4513, #C4956A)' }}>
                        <MapPin size={16} />
                      </div>
                      <p className="text-sm font-bold text-[#6B4226] leading-tight">{activePersona.route}</p>
                    </div>
                  </section>
                  
                  <div className="p-10 rounded-2xl border border-dashed text-sm text-center" style={{ borderColor: 'rgba(139,69,19,0.2)', backgroundColor: '#F5F0E8', color: '#5C4033' }}>
                    <Navigation className="mx-auto mb-2 opacity-20" size={32} />
                    <span className="opacity-50">互動地圖載入中...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 寫生藝廊階段 */}
        {view === 'gallery' && (
          <div className="animate-fade-in space-y-4">
            <h2 className="font-serif-tc text-xl font-bold px-2 text-[#2C1810]">共創寫生牆</h2>
            <p className="text-sm text-[#5C4033]/60 px-2 mb-4">這裡展示了觀眾在移動過程中的田野記錄與畫作。</p>
            
            <div className="grid grid-cols-2 gap-3">
              {artworks.length > 0 ? artworks.map(art => (
                <div key={art.id} className="card-heritage rounded-xl overflow-hidden group">
                  <div className="aspect-square bg-[#E8DFD0] overflow-hidden">
                    <img src={art.url} alt={art.title} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-bold truncate text-[#2C1810]">{art.title || '無標題'}</p>
                    <p className="text-[10px] text-[#8B4513]/50">by {art.author || '匿名觀者'}</p>
                  </div>
                </div>
              )) : (
                <>
                  {[1,2,3,4].map(i => (
                    <div key={i} className="card-heritage rounded-xl overflow-hidden p-4">
                      <div className="aspect-square rounded-lg mb-2 flex flex-col items-center justify-center text-[#8B4513]/30 border border-dashed border-[#8B4513]/20" style={{ backgroundColor: '#F5F0E8' }}>
                        <ImageIcon size={24} />
                        <span className="text-[10px] mt-1">作品整理中</span>
                      </div>
                      <div className="h-3 rounded w-3/4 mb-1" style={{ backgroundColor: '#E8DFD0' }}></div>
                      <div className="h-2 rounded w-1/2" style={{ backgroundColor: '#F5F0E8' }}></div>
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
              <h2 className="font-serif-tc text-xl font-bold text-[#1A6B5A]">聚落想像對話框</h2>
              <p className="text-sm text-[#5C4033]/60 mt-1">關於這裡的未來，你希望留下什麼？</p>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 px-2 pb-4">
              {messages.length > 0 ? messages.map(msg => (
                <div key={msg.id} className="card-heritage p-4 rounded-2xl animate-fade-in">
                  <p className="text-sm text-[#2C1810] leading-relaxed">{msg.text}</p>
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1A6B5A]/10 text-[#1A6B5A]">
                      ID: {msg.authorId ? msg.authorId.substring(0, 6) : 'Anonymous'}
                    </span>
                    <span className="text-[10px] text-[#5C4033]/30">
                      {new Date(msg.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )) : (
                <div className="text-center py-20 text-[#5C4033]/30 text-sm">暫無討論，成為第一個分享想法的人吧！</div>
              )}
            </div>

            <div className="sticky bottom-4 p-2 rounded-2xl shadow-lg flex items-center gap-2 m-2" style={{ background: 'rgba(245,240,232,0.9)', backdropFilter: 'blur(12px)', border: '1px solid rgba(26,107,90,0.15)' }}>
              <input 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="輸入您的觀點..."
                className="flex-1 bg-transparent border-none text-sm p-3 outline-none text-[#2C1810] placeholder-[#5C4033]/30"
                onKeyPress={(e) => e.key === 'Enter' && postMessage()}
              />
              <button 
                onClick={postMessage} 
                disabled={!newMessage.trim()}
                className={`p-3 rounded-xl shadow-md transition-all ${newMessage.trim() ? 'btn-teal' : 'bg-[#E8DFD0] text-[#5C4033]/30'}`}
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
