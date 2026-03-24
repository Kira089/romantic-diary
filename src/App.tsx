import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, useNavigate, useParams } from "react-router-dom";
import { db } from "./firebase";
import { ref, push, onValue, set, remove } from "firebase/database";

// --- Константы и Типы ---
const START_DATE = "2026-03-12";
const NAMES = { Max: "Макс", Aydana: "Айдана" };

type Entry = {
  id?: string;
  author: "Max" | "Aydana";
  text: string;
  mood: string;
  mediaBase64: string[];
  createdAt: number;
};

// --- Хелперы ---
const getDaysTogether = () => {
  const start = new Date(START_DATE);
  const diff = Date.now() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

const compressImage = (base64Str: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const MAX_WIDTH = 800;
      const scale = MAX_WIDTH / img.width;
      canvas.width = MAX_WIDTH;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.7));
    };
  });
};

// --- Компоненты ---

const Splash = ({ onClose }: { onClose: () => void }) => (
  <div className="splash-screen" onClick={onClose}>
    <div className="splash-content">
      <h1 className="text-5xl font-serif text-white animate-pulse">Наш Дневник ❤️</h1>
      <p className="text-white mt-4 opacity-80">Нажми на сердце, чтобы войти...</p>
    </div>
  </div>
);

const Diary = () => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [filter, setFilter] = useState<"all" | "Max" | "Aydana">("all");
  const navigate = useNavigate();

  useEffect(() => {
    const entriesRef = ref(db, 'entries');
    return onValue(entriesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([id, val]: any) => ({ id, ...val }));
        setEntries(list.sort((a, b) => b.createdAt - a.createdAt));
      } else {
        setEntries([]);
      }
    });
  }, []);

  const copyToObsidian = (e: Entry) => {
    const date = new Date(e.createdAt).toLocaleDateString();
    const content = `## ${date} | От: ${NAMES[e.author]}\n\n${e.text}\n\nНастроение: ${e.mood}`;
    navigator.clipboard.writeText(content);
    alert("Скопировано для Obsidian! 📝");
  };

  const deleteEntry = (id: string) => {
    if (window.confirm("Удалить это мгновение? 💔")) {
      remove(ref(db, `entries/${id}`));
    }
  };

  const filteredEntries = filter === "all" ? entries : entries.filter(e => e.author === filter);

  return (
    <div className="container fade-in-up">
        <div className="floating-hearts">
            <div className="heart-1" style={{left: '10%'}}>❤️</div>
            <div className="heart-2" style={{left: '80%'}}>💖</div>
        </div>

      <header className="mb-10 text-center">
        <h1 className="text-4xl font-serif text-gradient mb-2">Наши моменты</h1>
        <p className="text-gray-500 italic">
          Мы вместе уже <span className="text-[#ff85a1] font-bold">{getDaysTogether()}</span> дней ✨
        </p>
        
        <div className="flex justify-center gap-3 mt-6">
          {["all", "Max", "Aydana"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-5 py-2 rounded-full text-sm transition-all ${
                filter === f ? "btn-primary" : "bg-white text-gray-400"
              }`}
            >
              {f === "all" ? "Всё" : NAMES[f as "Max" | "Aydana"]}
            </button>
          ))}
        </div>
      </header>

      <div className="space-y-8">
        {filteredEntries.map((e) => (
          <div key={e.id} className="enhanced-card">
            <div className="flex justify-between items-center mb-4">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${e.author === 'Max' ? 'bg-blue-50 text-blue-400' : 'bg-pink-50 text-pink-400'}`}>
                {NAMES[e.author]}
              </span>
              <div className="flex gap-3 opacity-40 hover:opacity-100 transition">
                <button onClick={() => copyToObsidian(e)} title="Copy for Obsidian">💎</button>
                <button onClick={() => navigate(`/edit/${e.id}`)}>✏️</button>
                <button onClick={() => deleteEntry(e.id!)}>🗑️</button>
              </div>
            </div>
            
            <p className="text-[#5d4146] text-lg leading-relaxed mb-4">{e.text}</p>
            
            {e.mediaBase64 && e.mediaBase64.length > 0 && (
              <div className="photo-grid">
                {e.mediaBase64.map((src, i) => (
                  <div key={i} className="photo-item">
                    <img src={src} alt="memory" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex justify-between items-center mt-6 pt-4 border-t border-pink-50">
              <span className="text-2xl">{e.mood}</span>
              <span className="text-[10px] text-gray-300 uppercase tracking-widest">
                {new Date(e.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • {new Date(e.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      <button onClick={() => navigate("/add")} className="fab">+</button>
    </div>
  );
};

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
          setText(val.text);
          setAuthor(val.author);
          setMood(val.mood);
          setMedia(val.mediaBase64 || []);
        }
      }, { onlyOnce: true });
    }
  }, [id, mode]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setLoading(true);
      const files = Array.from(e.target.files);
      for (const file of files) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
          const compressed = await compressImage(reader.result as string);
          setMedia(prev => [...prev, compressed]);
        };
      }
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!text.trim()) return;
    const entryData = {
      author, text, mood, mediaBase64: media,
      createdAt: mode === "add" ? Date.now() : Date.now() // можно хранить старую дату при желании
    };

    if (mode === "add") {
      await push(ref(db, 'entries'), entryData);
    } else {
      await set(ref(db, `entries/${id}`), entryData);
    }
    navigate("/diary");
  };

  return (
    <div className="container fade-in-up">
      <div className="enhanced-card max-w-lg mx-auto">
        <h2 className="text-2xl font-serif text-center mb-6 text-gradient">
          {mode === "add" ? "Новое воспоминание" : "Правка истории"}
        </h2>
        
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full h-48 p-4 rounded-2xl bg-pink-50/30 border-none focus:ring-2 focus:ring-pink-200 text-lg mb-4"
          placeholder="Напиши что-нибудь милое..."
        />

        <div className="flex gap-3 mb-6">
          {(["Max", "Aydana"] as const).map(p => (
            <button 
              key={p}
              onClick={() => setAuthor(p)}
              className={`flex-1 py-3 rounded-2xl border-2 transition-all ${author === p ? 'border-[#ff85a1] bg-[#fff5f7]' : 'border-transparent bg-gray-50'}`}
            >
              {NAMES[p]} {p === 'Max' ? '👨' : '👩'}
            </button>
          ))}
        </div>

        <div className="mb-6">
            <p className="text-xs text-gray-400 mb-2">Настроение:</p>
            <div className="flex justify-between bg-gray-50 p-2 rounded-2xl">
                {["😊", "🥰", "💌", "✨", "🧸"].map(m => (
                    <button key={m} onClick={() => setMood(m)} className={`text-2xl p-2 rounded-xl ${mood === m ? 'bg-white shadow-sm' : ''}`}>{m}</button>
                ))}
            </div>
        </div>

        <input type="file" multiple accept="image/*" onChange={handleFile} className="hidden" id="file-upload" />
        <label htmlFor="file-upload" className="block text-center p-4 border-2 border-dashed border-pink-200 rounded-2xl mb-6 cursor-pointer text-pink-400 hover:bg-pink-50 transition">
          {loading ? "Сжимаем фото..." : "📸 Добавить фото (они сжаты для памяти)"}
        </label>

        <button onClick={handleSave} className="w-full btn-primary py-4 rounded-2xl text-lg shadow-xl">
          {mode === "add" ? "Сохранить в сердце ❤️" : "Обновить момент ❤️"}
        </button>
      </div>
    </div>
  );
};

const AppInner = () => {
  const [showSplash, setShowSplash] = useState(true);
  return (
    <div className="min-h-screen pb-20">
      {showSplash && <Splash onClose={() => setShowSplash(false)} />}
      <Routes>
        <Route path="/" element={<Diary />} />
        <Route path="/diary" element={<Diary />} />
        <Route path="/add" element={<EntryForm mode="add" />} />
        <Route path="/edit/:id" element={<EntryForm mode="edit" />} />
      </Routes>
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  );
}