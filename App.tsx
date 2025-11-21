import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, Play, Check, X, RotateCcw, FileText, Clock, Trophy, 
  AlertTriangle, ArrowRight, Lock, Unlock, Calendar, Trash2 
} from 'lucide-react';
import { TOPICS_RAW_DATA, WORDS_PER_DAY, THINKING_TIME } from './constants';
import { Topic, VocabItem, PunishmentWord, AppMode, FeedbackType } from './types';

const EnglishLearningApp: React.FC = () => {
  // --- STATE ---
  const [topics, setTopics] = useState<Topic[]>([]);
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [completedDays, setCompletedDays] = useState<string[]>([]);
  
  const [currentDay, setCurrentDay] = useState<number>(1);
  const [dailyVocab, setDailyVocab] = useState<VocabItem[]>([]);
  
  const [mode, setMode] = useState<AppMode>('topic-select'); 
  
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [quizAnswer, setQuizAnswer] = useState<string>('');
  const [score, setScore] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(THINKING_TIME);
  const [feedback, setFeedback] = useState<FeedbackType>(null);

  // Punishment State
  const [wrongWordsQueue, setWrongWordsQueue] = useState<PunishmentWord[]>([]);
  const [currentPunishmentWord, setCurrentPunishmentWord] = useState<PunishmentWord | null>(null);
  const [punishmentInput, setPunishmentInput] = useState<string>('');

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- INIT ---
  useEffect(() => {
    // Load topics from Constants
    const loadedTopics: Topic[] = Object.keys(TOPICS_RAW_DATA).map(key => ({
      id: key,
      name: key,
      data: TOPICS_RAW_DATA[key]
    }));
    setTopics(loadedTopics);

    try {
      const savedProgress = localStorage.getItem('vocabAppProgress');
      if (savedProgress) {
        setCompletedDays(JSON.parse(savedProgress));
      }
    } catch (error) {
      console.error("Could not access localStorage to load progress", error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('vocabAppProgress', JSON.stringify(completedDays));
    } catch (error) {
      console.error("Could not save progress to localStorage", error);
    }
  }, [completedDays]);

  // --- ACTIONS ---
  const selectTopic = (topicId: string) => {
    setActiveTopicId(topicId);
    setMode('plan');
  };

  const startDay = (day: number) => {
    const topic = topics.find(t => t.id === activeTopicId);
    if (!topic) return;

    const startIdx = (day - 1) * WORDS_PER_DAY;
    const endIdx = startIdx + WORDS_PER_DAY;
    const words = topic.data.slice(startIdx, endIdx);
    
    setDailyVocab(words);
    setCurrentDay(day);
    setMode('flashcard');
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const handleResetProgress = () => {
    if (window.confirm("Bạn có chắc muốn xóa toàn bộ tiến độ học tập không? Hành động này không thể hoàn tác.")) {
      setCompletedDays([]);
      try {
        localStorage.removeItem('vocabAppProgress');
      } catch (e) {
        console.error("Error clearing storage", e);
      }
    }
  };

  // --- QUIZ & TIMER LOGIC ---
  useEffect(() => {
    if ((mode === 'quiz' || mode === 'retest') && timeLeft > 0 && !feedback) {
      timerRef.current = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (timeLeft === 0 && (mode === 'quiz' || mode === 'retest') && !feedback) {
      if (mode === 'quiz') handleSubmitQuiz(true);
      if (mode === 'retest') handleRetestSubmit(true);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, mode, feedback]);

  const handleSubmitQuiz = (isTimeout = false) => {
    const currentWord = dailyVocab[currentIndex];
    const isCorrect = !isTimeout && quizAnswer.trim().toLowerCase() === currentWord.term.toLowerCase();

    if (isCorrect) {
      setScore(prev => prev + 1);
      setFeedback('correct');
    } else {
      setFeedback('incorrect');
      setWrongWordsQueue(prev => [...prev, { ...currentWord, requiredCount: 20, currentCount: 0 }]);
    }

    setTimeout(() => {
      if (currentIndex < dailyVocab.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setQuizAnswer('');
        setTimeLeft(THINKING_TIME); // Reset to 10s
        setFeedback(null);
      } else {
        setMode('result');
      }
    }, 1500);
  };

  // --- PUNISHMENT LOGIC ---
  const startPunishment = () => {
    if (wrongWordsQueue.length === 0) return;
    const wordToPunish = wrongWordsQueue[0];
    setCurrentPunishmentWord({ ...wordToPunish, currentCount: 0 });
    setPunishmentInput('');
    setMode('punishment');
  };

  const handlePunishmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPunishmentWord) return;

    const expectedString = `${currentPunishmentWord.term} - ${currentPunishmentWord.definition}`;
    
    if (punishmentInput.trim().toLowerCase() === expectedString.toLowerCase()) {
      const newCount = currentPunishmentWord.currentCount + 1;
      
      if (newCount >= currentPunishmentWord.requiredCount) {
        alert(`Đã chép phạt xong ${currentPunishmentWord.requiredCount} lần. Giờ kiểm tra lại! (Bạn có ${THINKING_TIME}s)`);
        setMode('retest');
        setQuizAnswer('');
        setTimeLeft(THINKING_TIME); // 10s for retest
        setFeedback(null);
      } else {
        setCurrentPunishmentWord(prev => prev ? ({ ...prev, currentCount: newCount }) : null);
        setPunishmentInput('');
      }
    } else {
        // Wrong input logic
        setPunishmentInput(''); // Clear for retry
    }
  };

  const handleRetestSubmit = (isTimeout = false) => {
    if (!currentPunishmentWord) return;

    const isCorrect = !isTimeout && quizAnswer.trim().toLowerCase() === currentPunishmentWord.term.toLowerCase();

    if (isCorrect) {
      setFeedback('correct');
      setTimeout(() => {
        setWrongWordsQueue(prev => prev.slice(1));
        if (wrongWordsQueue.length > 1) {
            const nextWord = wrongWordsQueue[1];
            setCurrentPunishmentWord({ ...nextWord, currentCount: 0 });
            setPunishmentInput('');
            setMode('punishment');
        } else {
            alert("Chúc mừng! Bạn đã hoàn thành hình phạt và thuộc hết bài.");
            setCompletedDays(prev => [...new Set([...prev, `${activeTopicId}-${currentDay}`])]);
            setMode('plan');
        }
        setFeedback(null);
      }, 1500);
    } else {
      setFeedback('incorrect');
      setTimeout(() => {
        alert(`Vẫn chưa thuộc (hoặc hết giờ)! Phạt thêm 10 lần nữa (Tổng: ${currentPunishmentWord.requiredCount + 10} lần).`);
        setCurrentPunishmentWord(prev => prev ? ({
            ...prev,
            requiredCount: prev.requiredCount + 10,
            currentCount: 0
        }) : null);
        setMode('punishment');
        setFeedback(null);
      }, 1500);
    }
  };

  // --- UI RENDER ---

  // 1. TOPIC SELECTION
  if (mode === 'topic-select') {
    return (
      <div className="min-h-screen bg-slate-100 p-8 flex flex-col items-center font-sans">
        <h1 className="text-4xl font-bold text-slate-800 mb-2">Kho Từ Vựng Của Thiên</h1>
        <p className="text-gray-500 mb-8">Chọn chủ đề để bắt đầu lộ trình học</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl w-full">
          {topics.map(topic => (
            <button 
              key={topic.id}
              onClick={() => selectTopic(topic.id)}
              className="bg-white p-6 rounded-xl shadow-sm hover:shadow-xl transition text-left border-l-4 border-indigo-500 group"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-gray-800 group-hover:text-indigo-600 transition">{topic.name}</h3>
                  <span className="inline-block mt-2 px-2 py-1 bg-indigo-50 text-indigo-600 text-xs font-semibold rounded-md">
                    {topic.data.length} từ vựng
                  </span>
                </div>
                <BookOpen className="text-gray-300 group-hover:text-indigo-500 transition" />
              </div>
            </button>
          ))}
        </div>

        <div className="mt-16 text-center">
          <button 
            onClick={handleResetProgress}
            className="text-sm text-gray-400 hover:text-red-500 transition flex items-center gap-2 mx-auto px-4 py-2 rounded-lg hover:bg-red-50"
          >
            <Trash2 size={14} /> Đặt lại toàn bộ tiến độ
          </button>
          <p className="text-xs text-gray-300 mt-2">Dữ liệu được lưu tự động trên trình duyệt này</p>
        </div>
      </div>
    );
  }

  // 2. PLAN
  if (mode === 'plan') {
    const activeTopic = topics.find(t => t.id === activeTopicId);
    if (!activeTopic) return null;
    const totalDays = Math.ceil(activeTopic.data.length / WORDS_PER_DAY);

    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-5xl mx-auto">
          <button onClick={() => setMode('topic-select')} className="mb-6 text-indigo-600 font-semibold hover:underline flex items-center gap-2">
            <RotateCcw size={16}/> Chọn chủ đề khác
          </button>
          
          <div className="bg-white p-8 rounded-2xl shadow-lg mb-8 border-l-8 border-indigo-500">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">{activeTopic.name}</h2>
            <div className="flex items-center gap-4 text-gray-500">
              <span><Calendar className="inline w-4 h-4 mb-1"/> {totalDays} ngày lộ trình</span>
              <span>•</span>
              <span><FileText className="inline w-4 h-4 mb-1"/> {activeTopic.data.length} từ vựng</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: totalDays }).map((_, idx) => {
              const day = idx + 1;
              const isCompleted = completedDays.includes(`${activeTopicId}-${day}`);
              const isLocked = day > 1 && !completedDays.includes(`${activeTopicId}-${day - 1}`);
              
              return (
                <button
                  key={day}
                  disabled={isLocked}
                  onClick={() => startDay(day)}
                  className={`relative p-6 rounded-xl border-2 flex flex-col items-center justify-center h-40 transition-all
                    ${isCompleted ? 'bg-green-50 border-green-500 text-green-700' : 
                      isLocked ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' : 
                      'bg-white border-indigo-500 text-indigo-600 hover:shadow-lg hover:-translate-y-1'}`}
                >
                  {isCompleted && <div className="absolute top-2 right-2 text-green-500"><Check size={20} /></div>}
                  {isLocked && <div className="absolute top-2 right-2 text-gray-400"><Lock size={20} /></div>}
                  {!isLocked && !isCompleted && <div className="absolute top-2 right-2 text-indigo-400"><Unlock size={20} /></div>}
                  
                  <span className="text-2xl font-bold mb-1">Day {day}</span>
                  <div className="text-xs px-2 py-1 bg-white/50 rounded-full">
                    {Math.min((idx + 1) * WORDS_PER_DAY, activeTopic.data.length) - (idx * WORDS_PER_DAY)} từ
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // 3. FLASHCARD
  if (mode === 'flashcard') {
    const currentWord = dailyVocab[currentIndex];
    return (
      <div className="min-h-screen bg-indigo-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md mb-6 flex justify-between items-center">
          <button onClick={() => setMode('plan')} className="text-gray-500 hover:text-gray-800"><X /></button>
          <span className="font-semibold text-gray-600">Ngày {currentDay}: {currentIndex + 1} / {dailyVocab.length}</span>
          <div className="w-6"></div>
        </div>

        <div 
          className="group w-full max-w-md h-80 perspective cursor-pointer"
          onClick={() => setIsFlipped(!isFlipped)}
        >
          <div className={`relative w-full h-full duration-500 preserve-3d transition-transform ${isFlipped ? 'rotate-y-180' : ''}`} style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
            {/* Front */}
            <div className="absolute w-full h-full bg-white rounded-2xl shadow-xl flex flex-col items-center justify-center p-8 backface-hidden" style={{ backfaceVisibility: 'hidden' }}>
              <span className="text-sm text-indigo-500 font-bold tracking-wider mb-4">TỪ VỰNG</span>
              <h2 className="text-4xl font-bold text-gray-800 text-center">{currentWord.term}</h2>
              <span className="mt-3 px-3 py-1 bg-gray-100 text-gray-500 text-sm font-mono rounded-full border border-gray-200">{currentWord.type}</span>
              <p className="text-gray-400 mt-8 text-sm animate-pulse">(Chạm để xem nghĩa)</p>
            </div>
            {/* Back */}
            <div className="absolute w-full h-full bg-indigo-600 rounded-2xl shadow-xl flex flex-col items-center justify-center p-8 backface-hidden rotate-y-180" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
              <span className="text-sm text-indigo-200 font-bold tracking-wider mb-4">ĐỊNH NGHĨA</span>
              <h2 className="text-3xl font-semibold text-white text-center mb-4 leading-relaxed">{currentWord.definition}</h2>
            </div>
          </div>
        </div>

        <div className="flex gap-4 mt-8 w-full max-w-md">
          <button 
            disabled={currentIndex === 0}
            onClick={() => { setCurrentIndex(prev => prev - 1); setIsFlipped(false); }}
            className="flex-1 py-3 bg-white text-gray-700 rounded-xl font-semibold hover:bg-gray-50 disabled:opacity-50 shadow-sm"
          >
            Trước
          </button>
          {currentIndex === dailyVocab.length - 1 ? (
            <button 
              onClick={() => { setMode('quiz'); setCurrentIndex(0); setScore(0); setWrongWordsQueue([]); setTimeLeft(THINKING_TIME); }}
              className="flex-1 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 shadow-lg shadow-green-200 flex items-center justify-center gap-2"
            >
              <Play size={18} /> Vào kiểm tra
            </button>
          ) : (
             <button 
              onClick={() => { setCurrentIndex(prev => prev + 1); setIsFlipped(false); }}
              className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 shadow-lg shadow-indigo-200"
            >
              Tiếp theo
            </button>
          )}
        </div>
      </div>
    );
  }

  // 4. QUIZ & RETEST UI
  if (mode === 'quiz' || mode === 'retest') {
    const word = mode === 'quiz' ? dailyVocab[currentIndex] : currentPunishmentWord;
    if (!word) return null;

    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-4 ${mode === 'retest' ? 'bg-orange-50' : 'bg-slate-50'}`}>
        <div className="w-full max-w-lg mb-8">
            {mode === 'retest' && (
                <div className="bg-orange-100 text-orange-800 px-4 py-2 rounded-lg text-center mb-4 font-bold border border-orange-300 shadow-sm flex items-center justify-center gap-2">
                    <AlertTriangle size={18}/> KIỂM TRA LẠI SAU KHI PHẠT
                </div>
            )}
          <div className="flex justify-between items-end mb-2">
            <span className="text-slate-500 font-medium">
                {mode === 'quiz' ? `Câu hỏi ${currentIndex + 1}/${dailyVocab.length}` : 'Cơ hội chuộc lỗi'}
            </span>
            <div className={`flex items-center gap-1 font-mono font-bold text-xl ${timeLeft < 5 ? 'text-red-500 animate-pulse' : 'text-indigo-600'}`}>
              <Clock size={24} /> {timeLeft}s
            </div>
          </div>
          <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 transition-all duration-1000 linear" style={{ width: `${(timeLeft / THINKING_TIME) * 100}%` }}></div>
          </div>
        </div>

        <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="mb-8 text-center">
            <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold tracking-wide mb-4">
              ĐỊNH NGHĨA LÀ GÌ?
            </span>
            <h3 className="text-2xl font-medium text-gray-800 leading-relaxed">{word.definition}</h3>
          </div>

          <div className="relative">
            <input
              type="text"
              value={quizAnswer}
              onChange={(e) => setQuizAnswer(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !feedback && (mode==='quiz' ? handleSubmitQuiz() : handleRetestSubmit())}
              disabled={feedback !== null}
              placeholder="Nhập từ tiếng Anh..."
              className={`w-full p-4 pl-6 rounded-xl border-2 text-lg outline-none transition-all shadow-inner
                ${feedback === 'correct' ? 'border-green-500 bg-green-50 text-green-700' : 
                  feedback === 'incorrect' ? 'border-red-500 bg-red-50 text-red-700' : 
                  'bg-white text-gray-800 border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100'}`}
              autoFocus
            />
             {feedback === 'correct' && <div className="absolute right-4 top-4 text-green-500 animate-bounce"><Check size={28} /></div>}
             {feedback === 'incorrect' && <div className="absolute right-4 top-4 text-red-500"><X size={28} /></div>}
          </div>

          {feedback && (
            <div className={`mt-6 p-4 rounded-xl text-center font-medium animate-fade-in flex flex-col items-center gap-1
              ${feedback === 'correct' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              <span className="text-lg">{feedback === 'correct' ? 'Chính xác! 🎉' : 'Sai rồi! 😢'}</span>
              {feedback === 'incorrect' && <span className="text-sm opacity-75">Đáp án đúng: <strong className="uppercase">{word.term}</strong></span>}
            </div>
          )}
          
          {!feedback && (
             <div className="mt-4 text-center text-xs text-gray-400">Nhấn Enter để trả lời</div>
          )}
        </div>
      </div>
    );
  }

  // 5. RESULT
  if (mode === 'result') {
    return (
      <div className="min-h-screen bg-indigo-900 flex items-center justify-center p-4 text-white font-sans">
        <div className="w-full max-w-md bg-white/10 backdrop-blur-xl rounded-3xl p-8 text-center border border-white/20 shadow-2xl relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-400 via-red-500 to-purple-600"></div>
          
          <Trophy size={56} className="mx-auto mb-6 text-yellow-400 drop-shadow-lg" />
          <h2 className="text-3xl font-bold mb-2">Kết quả ngày {currentDay}</h2>
          <div className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 mb-6 filter drop-shadow-sm">
            {score}/{dailyVocab.length}
          </div>
          
          {wrongWordsQueue.length > 0 ? (
            <div className="space-y-4 mt-8 animate-fade-in-up">
              <div className="bg-red-500/20 border border-red-500/50 p-5 rounded-2xl text-left backdrop-blur-md">
                <div className="flex items-center gap-2 text-red-200 mb-2 font-bold text-lg">
                  <AlertTriangle size={24} /> HÌNH PHẠT ĐANG CHỜ
                </div>
                <p className="text-red-100 mb-2">
                  Bạn sai <span className="font-bold text-white">{wrongWordsQueue.length}</span> từ.
                </p>
                <ul className="text-sm text-red-200 list-disc list-inside mb-3 opacity-80">
                  <li>Chép phạt 20 lần (Anh - Việt)</li>
                  <li>Sau đó kiểm tra lại trong 10s</li>
                  <li>Nếu sai tiếp: <span className="font-bold text-white">+10 lần phạt</span></li>
                </ul>
              </div>
              <button onClick={startPunishment} className="w-full bg-red-600 text-white py-4 rounded-xl font-bold hover:bg-red-700 transition shadow-lg shadow-red-900/50 animate-pulse flex items-center justify-center gap-2">
                CHẤP NHẬN HÌNH PHẠT <ArrowRight size={20}/>
              </button>
            </div>
          ) : (
            <div className="animate-fade-in-up">
              <div className="bg-green-500/20 border border-green-500/50 p-4 rounded-xl mb-6 text-green-200">
                Xuất sắc! Bạn đã thuộc toàn bộ từ vựng hôm nay.
              </div>
              <button onClick={() => {
                  if (activeTopicId) {
                    setCompletedDays(prev => [...new Set([...prev, `${activeTopicId}-${currentDay}`])]);
                  }
                  setMode('plan');
              }} className="w-full bg-indigo-500 text-white py-4 rounded-xl font-bold hover:bg-indigo-600 transition shadow-lg shadow-indigo-900/50">
                Hoàn thành ngày học
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 6. PUNISHMENT (STRICT)
  if (mode === 'punishment' && currentPunishmentWord) {
    return (
      <div className="min-h-screen bg-red-50 flex flex-col items-center justify-center p-4 font-sans">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border-t-8 border-red-600 p-8">
          <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
            <h2 className="text-2xl font-black text-red-700 uppercase tracking-tight flex items-center gap-2">
              <FileText /> Phòng Kỷ Luật
            </h2>
            <div className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-bold">
              Còn lại: {wrongWordsQueue.length} từ
            </div>
          </div>

          <div className="bg-red-50 p-8 rounded-xl mb-8 text-center border border-red-100">
            <p className="text-gray-500 mb-3 uppercase text-xs font-bold tracking-widest">Hãy gõ chính xác cụm từ sau</p>
            <div className="text-3xl md:text-4xl font-black text-gray-800 select-none tracking-tight">
              {currentPunishmentWord.term} - {currentPunishmentWord.definition}
            </div>
          </div>

          <div className="mb-2 flex justify-between text-sm font-bold text-gray-500">
            <span>Tiến độ từ này</span>
            <span>{currentPunishmentWord.currentCount} / <span className="text-red-600">{currentPunishmentWord.requiredCount}</span></span>
          </div>
          <div className="w-full bg-gray-200 h-4 rounded-full overflow-hidden mb-8 border border-gray-300">
            <div 
              className="h-full bg-red-600 transition-all duration-200 ease-out relative overflow-hidden" 
              style={{ width: `${(currentPunishmentWord.currentCount / currentPunishmentWord.requiredCount) * 100}%` }}
            >
                <div className="absolute inset-0 bg-white/20 w-full h-full animate-pulse"></div>
            </div>
          </div>

          <form onSubmit={handlePunishmentSubmit}>
            <input
              type="text"
              value={punishmentInput}
              onChange={(e) => setPunishmentInput(e.target.value)}
              placeholder="Ví dụ: hello - xin chào"
              className="w-full p-5 rounded-xl border-2 border-red-300 focus:border-red-600 outline-none text-xl mb-4 bg-white shadow-inner text-center font-medium"
              autoFocus
              onPaste={(e) => { e.preventDefault(); alert("Không được copy paste! Hãy trung thực."); }}
            />
            <p className="text-xs text-gray-400 text-center mb-4 flex items-center justify-center gap-1">
              <Lock size={12}/> Bàn phím đã khóa copy/paste. Hãy gõ đúng từng ký tự, dấu cách và dấu gạch ngang.
            </p>
          </form>
        </div>
      </div>
    );
  }

  return <div>Loading...</div>;
};

export default EnglishLearningApp;