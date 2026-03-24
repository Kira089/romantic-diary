import React, { useEffect, useState, useRef } from "react";
import { BrowserRouter, Routes, Route, useNavigate, useParams } from "react-router-dom";
import { db } from "./firebase";
import { ref, push, onValue, set, remove, update } from "firebase/database";

// --- Константы ---
const START_DATE = "2026-03-12";
const NEXT_MEETING = "2026-04-23"; // ЗАМЕНИ НА СВОЮ ДАТУ ВСТРЕЧИ
const NAMES = { Max: "Макс", Aydana: "Айдана" };

type Entry = {
  id?: string;
  author: "Max" | "Aydana";
  text: string;
  mood: string;
  mediaBase64: string[];
  createdAt: number;
  likes?: number;
};

// --- Хелперы ---
const getDaysTogether = () => {
  const start = new Date(START_DATE);
  return Math.floor((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24));
};

const getDaysUntil = (dateStr: string) => {
  const target = new Date(dateStr);
  const diff = target.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

const compressImage = (base64Str: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const MAX_WIDTH = 600; 
      const scale = MAX_WIDTH / img.width;
      canvas.width = MAX_WIDTH;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.5)); 
    };
  });
};

// --- Основные компоненты ---

const Diary = () => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [filter, setFilter] = useState<"all" | "Max" | "Aydana">("all");
  const [isDark, setIsDark] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const entriesRef = ref(db, 'entries');
    onValue(entriesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([id, val]: any) => ({ id, ...val }));
        setEntries(list.sort((a, b) => b.createdAt - a.createdAt));
      }
    });
    document.body.classList.toggle('dark-mode', isDark);
  }, [isDark]);

  const toggleLike = (id: string, currentLikes: number = 0) => {
    update(ref(db, `entries/${id}`), { likes: currentLikes + 1 });
  };

  const toggleMusic = () => {
    if (audioRef.current) {
      audioRef.current.paused ? audioRef.current.play() : audioRef.current.pause();
    }
  };

  return (
    <div className={`container min-h-screen pb-20 pt-8 transition-colors duration-500`}>
      {/* Скрытый плеер (вставь прямую ссылку на mp3) */}
      <audio ref={audioRef} loop src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" />

      <header className="text-center mb-8 relative">
        <div className="flex justify-between px-4 mb-4">
          <button onClick={() => setIsDark(!isDark)} className="text-2xl">{isDark ? "☀️" : "🌙"}</button>
          <button onClick={toggleMusic} className="text-2xl animate-spin-slow">🎵</button>
        </div>

        <h1 className="text-4xl font-serif text-gradient">Наши моменты</h1>
        
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="bg-white/50 p-3 rounded-2xl shadow-sm">
            <p className="text-[10px] uppercase text-gray-400">Вместе</p>
            <p className="text-xl font-bold text-pink-400">{getDaysTogether()} дней</p>
          </div>
          <div className="bg-white/50 p-3 rounded-2xl shadow-sm border-2 border-pink-100">
            <p className="text-[10px] uppercase text-gray-400">До встречи</p>
            <p className="text-xl font-bold text-indigo-400">{getDaysUntil(NEXT_MEETING)} дней</p>
          </div>
        </div>

        <div className="flex justify-center gap-2 mt-6 overflow-x-auto pb-2">
          {["all", "Max", "Aydana"].map((f) => (
            <button key={f} onClick={() => setFilter(f as any)} className={`px-5 py-2 rounded-full text-sm transition-all ${filter === f ? "btn-primary shadow-lg" : "bg-white text-gray-400"}`}>
              {f === "all" ? "Всё" : NAMES[f as "Max" | "Aydana"]}
            </button>
          ))}
        </div>
      </header>

      <div className="space-y-6">
        {entries.filter(e => filter === "all" || e.author === filter).map((e) => (
          <div key={e.id} className="enhanced-card relative overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${e.author === 'Max' ? 'bg-blue-100 text-blue-500' : 'bg-pink-100 text-pink-500'}`}>
                {NAMES[e.author]}
              </span>
              <div className="flex gap-4 opacity-40 hover:opacity-100">
                <button onClick={() => navigate(`/edit/${e.id}`)}>✏️</button>
                <button onClick={() => remove(ref(db, `entries/${e.id}`))}>🗑️</button>
              </div>
            </div>
            
            <p className="text-lg mb-4 whitespace-pre-wrap">{e.text}</p>
            
            {e.mediaBase64?.map((src, i) => (
              <img key={i} src={src} className="w-full rounded-2xl mb-2 object-cover max-h-[400px]" alt="memory" />
            ))}
            
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-pink-50">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{e.mood}</span>
                <button 
                   onClick={() => toggleLike(e.id!, e.likes)}
                   className="flex items-center gap-1 bg-pink-50 px-3 py-1 rounded-full text-pink-500 hover:scale-110 transition active:scale-95"
                >
                  <span className={e.likes ? "like-animation" : ""}>❤️</span>
                  <span className="text-sm font-bold">{e.likes || 0}</span>
                </button>
              </div>
              <span className="text-[10px] text-gray-300">
                {new Date(e.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>
      <button onClick={() => navigate("/add")} className="fab shadow-2xl">+</button>
    </div>
  );
};

// --- Форма остается почти такой же, добавим только лоадер ---
const EntryForm = ({ mode }: { mode: "add" | "edit" }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [text, setText] = useState("");
  const [author, setAuthor] = useState<"Max" | "Aydana">("Max");
  const [mood, setMood] = useState("😊");
  const [media, setMedia] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mode === "edit" && id) {
      onValue(ref(db, `entries/${id}`), (snapshot) => {
        const val = snapshot.val();
        if (val) {
          setText(val.text); setAuthor(val.author); setMood(val.mood); setMedia(val.mediaBase64 || []);
        }
      }, { onlyOnce: true });
    }
  }, [id, mode]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setLoading(true);
      for (const file of Array.from(e.target.files)) {
        const reader = new FileReader();
        const p = new Promise<void>(res => {
          reader.onload = async () => {
            const comp = await compressImage(reader.result as string);
            setMedia(prev => [...prev, comp]);
            res();
          };
        });
        reader.readAsDataURL(file);
        await p;
      }
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!text.trim()) return;
    setLoading(true);
    const data = { author, text, mood, mediaBase64: media, createdAt: Date.now(), likes: 0 };
    mode === "add" ? await push(ref(db, 'entries'), data) : await set(ref(db, `entries/${id}`), data);
    navigate("/diary");
  };

  return (
    <div className="container py-10">
      <div className="enhanced-card max-w-lg mx-auto shadow-2xl">
        <h2 className="text-2xl font-serif text-center mb-6 text-gradient">
          {mode === "add" ? "Новое воспоминание" : "Правка момента"}
        </h2>
        <textarea value={text} onChange={(e) => setText(e.target.value)} className="w-full h-40 p-4 rounded-2xl bg-pink-50/30 mb-4 outline-none focus:ring-2 focus:ring-pink-200" placeholder="Что на душе?" />
        
        <div className="flex gap-2 mb-6">
          {["Max", "Aydana"].map(p => (
            <button key={p} onClick={() => setAuthor(p as any)} className={`flex-1 py-3 rounded-2xl border-2 transition ${author === p ? 'border-pink-400 bg-pink-50' : 'border-transparent bg-gray-50'}`}>
              {NAMES[p as "Max" | "Aydana"]}
            </button>
          ))}
        </div>

        <input type="file" multiple accept="image/*" onChange={handleFile} className="hidden" id="f" />
        <label htmlFor="f" className="block text-center p-4 border-2 border-dashed border-pink-200 rounded-2xl mb-6 cursor-pointer text-pink-400">
          {loading ? "Магия сжатия..." : "📸 Добавить фото"}
        </label>

        <button onClick={handleSave} disabled={loading} className="w-full btn-primary py-4 rounded-2xl text-lg shadow-xl">
          {loading ? "Загружаем..." : "Сохранить ❤️"}
        </button>
      </div>
    </div>
  );
};

// --- Роутинг ---
export default function App() {
  const [splash, setSplash] = useState(true);
  return (
    <BrowserRouter>
      <div className="min-h-screen">
        {splash && (
          <div className="splash-screen flex flex-col items-center justify-center bg-pink-400 text-white z-50 fixed inset-0" onClick={() => setSplash(false)}>
            <h1 className="text-6xl mb-4 animate-bounce">❤️</h1>
            <p className="text-xl font-serif">Нажми, чтобы открыть наше сердце</p>
          </div>
        )}
        <Routes>
          <Route path="/" element={<Diary />} />
          <Route path="/diary" element={<Diary />} />
          <Route path="/add" element={<EntryForm mode="add" />} />
          <Route path="/edit/:id" element={<EntryForm mode="edit" />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}