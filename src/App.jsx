import React, { useState, useEffect } from 'react';
import ExhibitionMap from './ExhibitionMap';
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

// --- 角色資料 (由測驗結果決定) ---
const PERSONAS = {
  speedster: {
    title: '代號：穿梭者 (外送員)',
    trait: '移動限制：步速極快，但易受地圖誤導與死胡同困擾。',
    route: '【專屬路線】從客家文化公園階梯捷徑快速下坡。進入永春街邊緣時，你會發現導航上的路已被圍籬封死，請尋找實體巷弄縫隙。',
    story: '時間就是金錢。但這座聚落的紋理，從來不在 Google Map 的預測範圍內。',
    color: 'bg-zinc-800',
    textColor: 'text-yellow-400',
    borderColor: 'border-yellow-500/50'
  },
  restricted: {
    title: '代號：受限者 (長者)',
    trait: '移動限制：需依賴輔具，絕對避開階梯與碎石路，步速緩慢。',
    route: '【專屬路線】請從客家文化公園的無障礙坡道出發。避開階梯捷徑，繞過大草皮外圍的柏油路。雖然多花 5 分鐘，但這是你唯一安全的路。',
    story: '幾十步的階梯，對我來說就像是一座跨不過去的山。',
    color: 'bg-zinc-800',
    textColor: 'text-red-400',
    borderColor: 'border-red-500/50'
  },
  heavy: {
    title: '代號：負重者 (調查員/器材組)',
    trait: '移動限制：需要寬闊路面與較大轉彎半徑，路緣石高低差是最大天敵。',
    route: '【專屬路線】沿著公園主幹道直行。遇到路口請注意路緣石高低差。無法穿越樹林小徑，請沿著公園外側實體人行道前往永春街。',
    story: '推著沉重的器材，這座城市的每一個幾公分高的台階，都成了阻礙。',
    color: 'bg-zinc-800',
    textColor: 'text-blue-400',
    borderColor: 'border-blue-500/50'
  }
};

// --- 測驗題目 ---
const QUIZ_QUESTIONS = [
  {
    id: 1,
    question: '當你遇到前方有一道未知的施工圍籬時，你的直覺反應是？',
    options: [
      { label: 'A', text: '快速尋找旁邊的狹窄小巷繞過去。', score: 1 },
      { label: 'B', text: '停下腳步，尋找平緩且無障礙的退路。', score: 2 },
      { label: 'C', text: '煩躁地推著手邊的重物，尋找寬敞的替代道路。', score: 3 },
    ]
  },
  {
    id: 2,
    question: '你目前的身體與裝備狀態最接近下列何者？',
    options: [
      { label: 'A', text: '輕裝上陣，靈活敏捷。', score: 1 },
      { label: 'B', text: '身體略顯疲憊，需要依賴輔助或平坦路面。', score: 2 },
      { label: 'C', text: '帶著沉重背包或推車，需要較大的迴轉空間。', score: 3 },
    ]
  }
];

const App = () => {
  const [view, setView] = useState('landing'); // landing, persona, gallery, forum, compare
  const [user, setUser] = useState(isFirebaseSetup ? null : { uid: 'guest-preview' });
  const [activePersona, setActivePersona] = useState(null);
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const [newMessage, setNewMessage] = useState('');
  const [artworks, setArtworks] = useState(MOCK_ARTWORKS);
  
  // 時間滑桿
  const [sliderPosition, setSliderPosition] = useState(50);

  // 測驗狀態：0=未開始, 1-2=題目, 3=分析中, 4=顯示結果
  const [quizStep, setQuizStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState([]);

  // 測驗：選擇選項
  const handleQuizAnswer = (score) => {
    const newAnswers = [...quizAnswers, score];
    setQuizAnswers(newAnswers);
    if (quizStep < QUIZ_QUESTIONS.length) {
      setQuizStep(quizStep + 1);
    }
    if (quizStep === QUIZ_QUESTIONS.length) {
      // 最後一題答完 → 進入分析中畫面
      setQuizStep(3);
      setTimeout(() => {
        const total = newAnswers.reduce((a, b) => a + b, 0);
        let persona;
        if (total <= 3) persona = PERSONAS.speedster;
        else if (total === 4) persona = PERSONAS.restricted;
        else persona = PERSONAS.heavy;
        setActivePersona(persona);
        setQuizStep(4);
      }, 1500);
    }
  };

  // 重置測驗
  const resetQuiz = () => {
    setQuizStep(0);
    setQuizAnswers([]);
    setActivePersona(null);
  };

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
    <nav className="fixed bottom-0 left-0 right-0 nav-bp flex justify-around p-3 z-50">
      <button onClick={() => setView('landing')} className={`flex flex-col items-center transition-colors ${view === 'landing' ? 'text-[#1C3D78]' : 'text-[#1C3D78]/35'}`}>
        <Info size={20} />
        <span className="text-[10px] mt-1 font-mono">資訊</span>
      </button>
      <button onClick={() => setView('persona')} className={`flex flex-col items-center transition-colors ${view === 'persona' ? 'text-[#1C3D78]' : 'text-[#1C3D78]/35'}`}>
        <User size={20} />
        <span className="text-[10px] mt-1 font-mono">鑑識</span>
      </button>
      <button onClick={() => setView('compare')} className={`flex flex-col items-center transition-colors ${view === 'compare' ? 'text-[#1C3D78]' : 'text-[#1C3D78]/35'}`}>
        <History size={20} />
        <span className="text-[10px] mt-1 font-mono">時空</span>
      </button>
      <button onClick={() => setView('gallery')} className={`flex flex-col items-center transition-colors ${view === 'gallery' ? 'text-[#1C3D78]' : 'text-[#1C3D78]/35'}`}>
        <ImageIcon size={20} />
        <span className="text-[10px] mt-1 font-mono">藝廊</span>
      </button>
      <button onClick={() => setView('forum')} className={`flex flex-col items-center transition-colors ${view === 'forum' ? 'text-[#1C3D78]' : 'text-[#1C3D78]/35'}`}>
        <MessageSquare size={20} />
        <span className="text-[10px] mt-1 font-mono">回報</span>
      </button>
    </nav>
  );

  return (
    <div className="min-h-screen pb-20" style={{ color: '#1C3D78' }}>
      {/* Header */}
      <header className="header-bp sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[9px] font-mono text-[#1C3D78]/50 uppercase tracking-[0.25em]">CASE NO.299-YS // YONGCHUN ST.</span>
            <h1 className="font-display-tc text-base font-black text-[#1C3D78] tracking-tight leading-tight">299 失蹤計畫</h1>
          </div>
          <div className="text-right">
            <div className="barcode-deco w-16 h-4 mb-0.5" />
            <span className="text-[8px] font-mono text-[#1C3D78]/40 uppercase tracking-widest">SIGNAL: WEAK</span>
          </div>
        </div>
        <div className="signal-divider" />
      </header>

      <main className="max-w-md mx-auto p-4">
        
        {/* 展前資訊階段 */}
        {view === 'landing' && (
          <div className="space-y-5 animate-fade-in">
            {/* Hero 主視覺卡片 */}
            <div className="card-bp rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(145deg, #1C3D78 0%, #12213F 100%)' }}>
              <div className="p-6 text-[#D4CFBC]">
                <p className="text-[9px] font-mono uppercase tracking-[0.35em] opacity-50 mb-3">DATA_299-YS // YONGCHUN ST. TAIPEI CITY</p>
                <h2 className="font-display-tc text-3xl font-black leading-tight mb-1" style={{ letterSpacing: '-0.02em' }}>299<br/>失蹤計畫</h2>
                <p className="text-[10px] font-mono uppercase tracking-widest opacity-40 mb-4">299 MISSING PROJECT</p>
                <div className="signal-divider my-4 opacity-40" />
                <p className="text-sm opacity-75 leading-relaxed mb-5 font-mono">永春街302戶，其中299戶為達建。<br/>面對將至的都更，這299戶將何去何從？</p>
                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="card-data rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-2 opacity-60"><Calendar size={12}/><span className="uppercase tracking-widest text-[9px]">展期</span></div>
                    <p className="font-bold text-[#D4CFBC]">5.30 — 6.04</p>
                    <p className="font-bold text-[#D4CFBC]">6.08 — 6.14</p>
                  </div>
                  <div className="card-data rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-2 opacity-60"><MapPin size={12}/><span className="uppercase tracking-widest text-[9px]">展場</span></div>
                    <p className="opacity-80">展場A：客家文化園區</p>
                    <p className="opacity-80">展場B：永春街299號外</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 數據面板 */}
            <div className="card-bp rounded-xl p-5">
              <p className="text-[9px] font-mono uppercase tracking-[0.25em] text-[#1C3D78]/50 mb-4">// CASE_DATA LOG</p>
              <div className="grid grid-cols-3 gap-3 text-center font-mono">
                <div><p className="text-2xl font-black text-[#1C3D78]">302</p><p className="text-[9px] uppercase tracking-widest text-[#1C3D78]/50">TOTAL<br/>HOUSEHOLDS</p></div>
                <div><p className="text-2xl font-black text-[#1C3D78]">299</p><p className="text-[9px] uppercase tracking-widest text-[#1C3D78]/50">ILLEGAL<br/>STRUCTURES</p></div>
                <div><p className="text-2xl font-black text-[#E8873A]">?</p><p className="text-[9px] uppercase tracking-widest text-[#1C3D78]/50">WHERE<br/>WILL THEY GO</p></div>
              </div>
            </div>

            {/* 展場地圖 */}
            <ExhibitionMap />

            {/* 參展指南 */}
            <div className="card-bp rounded-xl p-5">
              <p className="text-[9px] font-mono uppercase tracking-[0.25em] text-[#1C3D78]/50 mb-4">// FIELD_PROTOCOL</p>
              <ol className="text-sm space-y-3 text-[#1C3D78] font-mono">
                <li className="flex gap-3 items-start">
                  <span className="w-5 h-5 rounded border border-[#1C3D78]/40 flex items-center justify-center text-[10px] flex-shrink-0 font-bold">1</span>
                  <span className="text-xs leading-relaxed opacity-80">從 D-School 出發，沿著指定路線進行觀察與寫生。</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="w-5 h-5 rounded border border-[#1C3D78]/40 flex items-center justify-center text-[10px] flex-shrink-0 font-bold">2</span>
                  <span className="text-xs leading-relaxed opacity-80">掃描展場各處的 QR Code，完成空間鑑識程序領取調查身分。</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="w-5 h-5 rounded border border-[#1C3D78]/40 flex items-center justify-center text-[10px] flex-shrink-0 font-bold">3</span>
                  <span className="text-xs leading-relaxed opacity-80">跟隨專屬路線探索聚落，並參與拼貼工作坊。</span>
                </li>
              </ol>
            </div>

            {/* 快捷按鈕 */}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setView('persona')} className="btn-bp p-4 rounded-xl text-center text-xs">
                <User className="mx-auto mb-2" size={20}/>
                <span className="block font-mono uppercase tracking-wider text-[10px]">啟動鑑識</span>
              </button>
              <button onClick={() => setView('compare')} className="btn-bp-ghost p-4 rounded-xl text-center text-xs">
                <History className="mx-auto mb-2" size={20}/>
                <span className="block font-mono uppercase tracking-wider text-[10px]">時空對比</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setView('gallery')} className="btn-bp-ghost p-4 rounded-xl text-center text-xs">
                <ImageIcon className="mx-auto mb-2" size={20}/>
                <span className="block font-mono uppercase tracking-wider text-[10px]">田野紀錄</span>
              </button>
              <button onClick={() => setView('forum')} className="btn-bp-ghost p-4 rounded-xl text-center text-xs">
                <MessageSquare className="mx-auto mb-2" size={20}/>
                <span className="block font-mono uppercase tracking-wider text-[10px]">回報討論</span>
              </button>
            </div>
          </div>
        )}

        {/* --- 新增：時空對比 (Before/After Slider) 階段 --- */}
        {view === 'compare' && (
          <div className="animate-fade-in space-y-6">
            <div className="px-1">
              <h2 className="font-display-tc text-xl font-black text-[#1C3D78]">DATA LOG — 地地對比</h2>
              <p className="text-xs font-mono text-[#1C3D78]/50 mt-1 uppercase tracking-widest">LEFT: 2024 CURRENT // RIGHT: FUTURE PROPOSAL</p>
            </div>

            <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden shadow-xl card-bp group">
              
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
              
              <div className="absolute bottom-4 left-4 bg-[#1C3D78]/85 text-[#D4CFBC] text-[9px] px-3 py-1.5 rounded font-mono uppercase tracking-widest z-10 pointer-events-none">
                2024 現狀
              </div>
              <div className="absolute bottom-4 right-4 bg-[#12213F]/85 text-[#D4CFBC] text-[9px] px-3 py-1.5 rounded font-mono uppercase tracking-widest z-10 pointer-events-none border border-[#E8873A]/40">
                未來提案
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

        {/* 角色導覽階段 — 空間適應性鑑識程序 */}
        {view === 'persona' && (
          <div className="animate-fade-in space-y-4">

            {/* Step 0：測驗入口 */}
            {quizStep === 0 && (
              <div className="rounded-2xl border border-zinc-700 bg-zinc-900 p-8 text-center space-y-6">
                <div className="space-y-1">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-[0.3em] font-mono">299 失蹤計畫 // 身分鑑識模組</p>
                  <h2 className="text-xl font-bold font-mono text-yellow-400 tracking-wider">空間適應性鑑識程序</h2>
                  <p className="text-xs text-zinc-400 leading-relaxed pt-2">根據你的移動模式與身體狀態，系統將分配對應的調查身分。<br/>共 2 題，請誠實作答。</p>
                </div>
                <button
                  onClick={() => setQuizStep(1)}
                  className="w-full py-4 rounded-xl border border-yellow-500/50 bg-yellow-500/10 text-yellow-400 font-bold font-mono text-sm uppercase tracking-widest hover:bg-yellow-500/20 transition-all"
                >
                  ▶ 啟動鑑識程序
                </button>
              </div>
            )}

            {/* Step 1–2：測驗題目 */}
            {(quizStep === 1 || quizStep === 2) && (() => {
              const q = QUIZ_QUESTIONS[quizStep - 1];
              return (
                <div className="rounded-2xl border border-zinc-700 bg-zinc-900 p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Q{quizStep} / {QUIZ_QUESTIONS.length}</span>
                    <div className="flex gap-1">
                      {QUIZ_QUESTIONS.map((_, i) => (
                        <div key={i} className={`w-6 h-1 rounded-full transition-colors ${i < quizStep ? 'bg-yellow-400' : 'bg-zinc-700'}`} />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-zinc-100 font-mono leading-relaxed">{q.question}</p>
                  <div className="space-y-3">
                    {q.options.map((opt) => (
                      <button
                        key={opt.label}
                        onClick={() => handleQuizAnswer(opt.score)}
                        className="w-full text-left p-4 rounded-xl bg-zinc-900 border border-zinc-700 hover:border-yellow-500 hover:bg-zinc-800 transition-all group"
                      >
                        <span className="text-[10px] font-bold font-mono text-yellow-500/70 group-hover:text-yellow-400 block mb-1 uppercase tracking-widest">[{opt.label}]</span>
                        <span className="text-xs text-zinc-300 leading-relaxed">{opt.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Step 3：分析中 Loading */}
            {quizStep === 3 && (
              <div className="rounded-2xl border border-zinc-700 bg-zinc-900 p-16 flex flex-col items-center gap-5">
                <div className="w-10 h-10 rounded-full border-2 border-yellow-500 border-t-transparent animate-spin" />
                <p className="text-xs text-yellow-400 font-mono tracking-widest uppercase">ANALYZING_MOBILITY_PATTERN...</p>
                <p className="text-[10px] text-zinc-600 font-mono">比對移動資料庫中，請稍候</p>
              </div>
            )}

            {/* Step 4：結果顯示 */}
            {quizStep === 4 && activePersona && (
              <div className={`rounded-2xl border ${activePersona.borderColor} overflow-hidden animate-fade-in`}>
                {/* 標頭 */}
                <div className={`${activePersona.color} p-6 space-y-3`}>
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400">// 身分鑑識完成</span>
                    <button onClick={resetQuiz} className="text-[10px] text-zinc-500 hover:text-zinc-300 font-mono transition-colors">[ 重新鑑識 ]</button>
                  </div>
                  <h2 className={`font-mono text-xl font-black ${activePersona.textColor} tracking-wider`}>{activePersona.title}</h2>
                  <p className="text-xs text-zinc-400 italic leading-relaxed">「{activePersona.story}」</p>
                </div>

                <div className="p-5 space-y-5 bg-zinc-950">
                  {/* 移動限制標籤 */}
                  <div>
                    <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">// 移動限制</p>
                    <p className={`text-sm font-mono font-bold ${activePersona.textColor} border-b-2 pb-1`} style={{ borderColor: 'currentColor' }}>
                      {activePersona.trait}
                    </p>
                  </div>

                  {/* 機密任務指示區塊 */}
                  <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900 p-4 space-y-2">
                    <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                      <span className="text-yellow-500">▍</span> 機密任務指示
                    </p>
                    <p className="text-xs text-zinc-300 font-mono leading-relaxed">{activePersona.route}</p>
                  </div>

                  {/* 前往討論 */}
                  <button
                    onClick={() => setView('forum')}
                    className="w-full py-3 rounded-xl border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 font-mono text-xs uppercase tracking-widest transition-all"
                  >
                    前往討論版回報調查結果 →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 寫生藝廊階段 */}
        {view === 'gallery' && (
          <div className="animate-fade-in space-y-4">
            <div className="px-1">
              <h2 className="font-display-tc text-xl font-black text-[#1C3D78]">FIELD RECORDS</h2>
              <p className="text-[10px] font-mono text-[#1C3D78]/50 mt-1 uppercase tracking-widest">田野記錄與實地寫生筆記</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {artworks.length > 0 ? artworks.map(art => (
                <div key={art.id} className="card-bp rounded-xl overflow-hidden group">
                  <div className="aspect-square bg-[#B8B29C] overflow-hidden">
                    <img src={art.url} alt={art.title} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="p-2.5">
                    <p className="text-[10px] font-mono font-bold truncate text-[#1C3D78]">{art.title || '無標題'}</p>
                    <p className="text-[9px] font-mono text-[#1C3D78]/40 uppercase">by {art.author || 'UNKNOWN'}</p>
                  </div>
                </div>
              )) : (
                <>
                  {[1,2,3,4].map(i => (
                    <div key={i} className="card-bp rounded-xl overflow-hidden p-3">
                      <div className="aspect-square rounded mb-2 flex flex-col items-center justify-center text-[#1C3D78]/25 border border-dashed border-[#1C3D78]/20" style={{ backgroundColor: '#B8B29C' }}>
                        <ImageIcon size={20} />
                        <span className="text-[9px] mt-1 font-mono uppercase tracking-widest">DATA_PENDING</span>
                      </div>
                      <div className="h-2 rounded w-3/4 mb-1" style={{ backgroundColor: '#B8B29C' }}></div>
                      <div className="h-1.5 rounded w-1/2" style={{ backgroundColor: '#B8B29C' }}></div>
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
            <div className="px-1 mb-4">
              <h2 className="font-display-tc text-xl font-black text-[#1C3D78]">DATA LOG — 調查回報</h2>
              <p className="text-[10px] font-mono text-[#1C3D78]/50 mt-1 uppercase tracking-widest">WHERE_WILL_THEY_GO // SUBMIT_YOUR_FINDINGS</p>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 px-1 pb-4">
              {messages.length > 0 ? messages.map(msg => (
                <div key={msg.id} className="card-bp p-4 rounded-xl animate-fade-in">
                  <p className="text-sm text-[#1C3D78] font-mono leading-relaxed">{msg.text}</p>
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-[9px] px-2 py-0.5 rounded font-mono bg-[#1C3D78]/10 text-[#1C3D78]/60 uppercase tracking-widest">
                      ID_{msg.authorId ? msg.authorId.substring(0, 6).toUpperCase() : 'ANON'}
                    </span>
                    <span className="text-[9px] text-[#1C3D78]/30 font-mono">
                      {new Date(msg.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )) : (
                <div className="text-center py-20 text-[#1C3D78]/30 text-xs font-mono uppercase tracking-widest">NO_DATA // BE_FIRST_TO_REPORT</div>
              )}
            </div>
            <div className="sticky bottom-4 p-2 rounded-xl flex items-center gap-2 m-1 card-bp">
              <input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="SUBMIT_FINDINGS..."
                className="flex-1 bg-transparent border-none text-xs p-3 outline-none text-[#1C3D78] font-mono placeholder-[#1C3D78]/30"
                onKeyPress={(e) => e.key === 'Enter' && postMessage()}
              />
              <button
                onClick={postMessage}
                disabled={!newMessage.trim()}
                className={`p-3 rounded-lg transition-all ${newMessage.trim() ? 'btn-bp' : 'bg-[#1C3D78]/10 text-[#1C3D78]/20'}`}
              >
                <Send size={16} />
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
