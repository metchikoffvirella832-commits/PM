import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  Users, 
  Zap, 
  Briefcase, 
  Calendar, 
  AlertCircle, 
  ChevronRight, 
  RefreshCcw,
  Trophy,
  Skull,
  User,
  Building2,
  Info,
  Check,
  X,
  Loader2
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { cn } from './lib/utils';
import { GameStatus, GameStats, Scenario, Choice, GameHistoryItem, UserProfile, CompanyType } from './types';
import { INITIAL_SCENARIOS, INITIAL_STATS, COMPANY_TYPES } from './constants';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function App() {
  const [status, setStatus] = useState<GameStatus>(GameStatus.START);
  const [stats, setStats] = useState<GameStats>(INITIAL_STATS);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: '',
    background: '应届毕业生',
    education: '本科',
    schoolTier: '普通本科',
    selectedCompanyId: COMPANY_TYPES[0].id
  });
  const [currentScenario, setCurrentScenario] = useState<Scenario | null>(null);
  const [history, setHistory] = useState<GameHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [challengeResult, setChallengeResult] = useState<{ success: boolean; probability: number } | null>(null);
  const [challengeAnimating, setChallengeAnimating] = useState(false);
  const [showMiniGame, setShowMiniGame] = useState(false);
  const [gameScore, setGameScore] = useState(0);
  const [gameActive, setGameActive] = useState(false);
  const [gameTarget, setGameTarget] = useState({ x: 0, y: 0 });
  const [gameTimer, setGameTimer] = useState(0);

  const selectedCompany = COMPANY_TYPES.find(c => c.id === userProfile.selectedCompanyId) || COMPANY_TYPES[0];

  const generateNextScenario = useCallback(async (currentStats: GameStats, lastHistory: GameHistoryItem[]) => {
    setLoading(true);
    try {
      const prompt = `
        你是一个高度真实的“产品经理职业模拟器”游戏引擎。
        
        玩家信息：
        - 姓名：${userProfile.name}
        - 背景：${userProfile.background}
        - 学历：${userProfile.education}
        - 毕业院校层次：${userProfile.schoolTier}
        - 公司：${selectedCompany.name}
        - 公司特质：${selectedCompany.cultureTrait}
        - 当前职位：${currentStats.stage}
        
        当前属性：
        - 产品质量：${currentStats.productQuality}/100
        - 团队信任：${currentStats.teamTrust}/100
        - 压力值：${currentStats.stress}/100
        - 职业进度：${currentStats.careerProgress}/100
        - 任期：${currentStats.tenureWeeks} 周

        上一次行动：${lastHistory.length > 0 ? lastHistory[lastHistory.length - 1].choice.text : '刚刚开始'}
        上一次反馈：${lastHistory.length > 0 ? lastHistory[lastHistory.length - 1].choice.feedback : '无'}

        任务：生成一个新的挑战场景。
        
        设计指南：
        1. 深度结合公司特质：
           - 大厂：强调流程、对齐、PPT、政治、OKR。
           - 初创：强调速度、混乱、多面手、生存、技术债。
           - 传统：强调业务逻辑、线下复杂度、沟通代沟、数字化阻力。
           - 外包：强调客户需求、交付期、成本、多项目切换。
           - 校园/实习：强调学业与工作的平衡、转正压力、导师关系、校园思维与职场思维的碰撞。
        2. 结合玩家背景、学历与学校层次：
           - 在校生：强调期末考试压力、论文压力、对职场的好奇与畏惧。
           - 学历与学校差异化：
             - 专科/专科院校：强调执行力、技能点的快速应用、可能面临的学历歧视或逆袭机会。
             - C9/985/顶尖海归：自带“光环”，同事期待值极高，但也可能面临“高分低能”的质疑或更复杂的办公室政治。
             - 211/普通本科：标准职场路径，强调稳扎稳打，通才教育与专才需求的博弈。
             - 硕士/博士：强调深度思考、方法论、可能被赋予更高期待或被认为“眼高手低”。
             - 海外留学生：强调跨文化思维、语言优势、对国内职场潜规则的不适应。
           - 应届生：强调学习、被质疑、职场礼仪。
           - 技术转产品：强调逻辑、与开发的沟通、用户思维的转变。
           - 转行小白：强调术语理解、行业知识补齐。
           - 创业失败者：强调心态调整、执行力与战略的博弈。
        3. 真实性：场景要像真实职场一样残酷或荒诞，不要太理想化。
        4. 幽默感：使用职场黑话或幽默的口吻。

        请仅返回一个 JSON 对象，结构如下：
        {
          "id": "unique_id",
          "title": "简短有吸引力的标题",
          "description": "详细的场景描述（2-3句话），请称呼玩家为 ${userProfile.name}",
          "choices": [
            {
              "text": "选项 1",
              "impact": { "productQuality": 数字, "teamTrust": 数字, "stress": 数字, "careerProgress": 数字 },
              "feedback": "选择后的即时反馈文字"
            },
            ... (2-3 个选项)
          ]
        }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const newScenario = JSON.parse(response.text || '{}') as Scenario;
      setCurrentScenario(newScenario);
    } catch (error) {
      console.error("Failed to generate scenario:", error);
      const randomIndex = Math.floor(Math.random() * INITIAL_SCENARIOS.length);
      const fallback = { ...INITIAL_SCENARIOS[randomIndex] };
      fallback.description = fallback.description.replace('${name}', userProfile.name);
      setCurrentScenario(fallback);
    } finally {
      setLoading(false);
    }
  }, [userProfile, selectedCompany]);

  const startGame = () => {
    // Calculate probability
    let prob = 0;
    
    // Base by company
    if (userProfile.selectedCompanyId === 'big-tech') prob = 15;
    else if (userProfile.selectedCompanyId === 'startup') prob = 60;
    else if (userProfile.selectedCompanyId === 'traditional') prob = 50;
    else if (userProfile.selectedCompanyId === 'agency') prob = 85;
    else if (userProfile.selectedCompanyId === 'campus-intern') prob = 70;

    // Education
    const eduMap: any = { '专科': -20, '本科': 10, '硕士': 25, '博士': 35, '海外留学生': 20 };
    prob += eduMap[userProfile.education] || 0;

    // School
    const schoolMap: any = { 'C9/985': 40, '211': 25, '普通本科': 5, '专科院校': -10, '全球顶尖 (QS前50)': 45, '普通海归': 15 };
    prob += schoolMap[userProfile.schoolTier] || 0;

    // Background
    if (userProfile.background === '技术转产品') prob += 15;
    if (userProfile.background === '创业失败者') prob += 10;

    const finalProb = Math.max(5, Math.min(98, prob));
    
    setChallengeResult({ 
      probability: finalProb, 
      success: false // Will be determined by game
    });
    setStatus(GameStatus.CHALLENGE);
    setChallengeAnimating(true);
    setShowMiniGame(false);
    setGameScore(0);
    
    // Auto-resolve screening animation
    setTimeout(() => {
      setChallengeAnimating(false);
    }, 2500);
  };

  const startInterviewGame = () => {
    setShowMiniGame(true);
    setGameActive(true);
    setGameScore(0);
    setGameTimer(15); // 15 seconds
    spawnTarget();
  };

  const spawnTarget = () => {
    setGameTarget({
      x: Math.random() * 80 + 10,
      y: Math.random() * 80 + 10
    });
  };

  const handleGameClick = () => {
    if (!gameActive) return;
    const newScore = gameScore + 1;
    setGameScore(newScore);
    
    const requiredScore = Math.ceil((100 - (challengeResult?.probability || 50)) / 5) + 5;
    if (newScore >= requiredScore) {
      setGameActive(false);
      setChallengeResult(prev => prev ? { ...prev, success: true } : null);
    } else {
      spawnTarget();
    }
  };

  useEffect(() => {
    let interval: any;
    if (gameActive && gameTimer > 0) {
      interval = setInterval(() => {
        setGameTimer(prev => {
          if (prev <= 0.1) {
            setGameActive(false);
            setChallengeResult(prevRes => prevRes ? { ...prevRes, success: false } : null);
            return 0;
          }
          return prev - 0.1;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [gameActive, gameTimer]);

  const proceedToGame = () => {
    if (!challengeResult?.success) {
      setStatus(GameStatus.SETUP);
      setChallengeResult(null);
      return;
    }

    const initialStatsWithCompany = {
      ...INITIAL_STATS,
      ...selectedCompany.initialStats
    };
    setStats(initialStatsWithCompany);
    setHistory([]);
    setStatus(GameStatus.PLAYING);
    const firstScenario = { ...INITIAL_SCENARIOS[0] };
    firstScenario.description = firstScenario.description.replace('${name}', userProfile.name);
    setCurrentScenario(firstScenario);
    setFeedback(null);
  };

  const handleChoice = async (choice: Choice) => {
    if (!currentScenario) return;

    const nextProgress = stats.careerProgress + (choice.impact.careerProgress || 0);
    
    // Determine next stage
    let nextStage = stats.stage;
    if (nextProgress >= 80) nextStage = '首席产品官 (CPO)';
    else if (nextProgress >= 60) nextStage = '产品总监';
    else if (nextProgress >= 40) nextStage = '高级产品经理';
    else if (nextProgress >= 20) nextStage = '初级产品经理';
    else nextStage = '实习生';

    const newStats: GameStats = {
      productQuality: Math.max(0, Math.min(100, stats.productQuality + (choice.impact.productQuality || 0))),
      teamTrust: Math.max(0, Math.min(100, stats.teamTrust + (choice.impact.teamTrust || 0))),
      stress: Math.max(0, Math.min(100, stats.stress + (choice.impact.stress || 0))),
      careerProgress: Math.max(0, Math.min(100, nextProgress)),
      tenureWeeks: stats.tenureWeeks + Math.floor(Math.random() * 4) + 1,
      stage: nextStage,
    };

    setStats(newStats);
    setFeedback(choice.feedback);
    const newHistoryItem = { scenario: currentScenario, choice };
    const newHistory = [...history, newHistoryItem];
    setHistory(newHistory);

    // Check for game over
    if (newStats.stress >= 100 || newStats.teamTrust <= 0 || newStats.productQuality <= 0) {
      setStatus(GameStatus.GAME_OVER);
      return;
    }

    if (newStats.careerProgress >= 100) {
      setStatus(GameStatus.WIN);
      return;
    }

    await generateNextScenario(newStats, newHistory);
  };

  const StatCard = ({ icon: Icon, label, value, color, max = 100 }: any) => (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
          <Icon size={16} />
          <span>{label}</span>
        </div>
        <span className={cn("text-lg font-bold", color)}>{value}</span>
      </div>
      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${(value / max) * 100}%` }}
          className={cn("h-full rounded-full", color.replace('text-', 'bg-'))}
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Briefcase className="text-indigo-600" />
              PM 职业模拟器
            </h1>
            <p className="text-slate-500 text-sm">从小白到 CPO 的进阶之旅</p>
          </div>
          {status === GameStatus.PLAYING && (
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2 bg-white px-4 py-1.5 rounded-full border border-slate-200 shadow-sm">
                <Calendar size={14} className="text-slate-400" />
                <span className="text-xs font-semibold text-slate-600">第 {stats.tenureWeeks} 周</span>
              </div>
              <div className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-md border border-indigo-100">
                当前身份：{stats.stage}
              </div>
              <div className="text-[10px] font-medium text-slate-400 mt-1">
                公司特质：{selectedCompany.cultureTrait}
              </div>
            </div>
          )}
        </header>

        <AnimatePresence mode="wait">
          {status === GameStatus.START && (
            <motion.div 
              key="start"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white p-8 md:p-12 rounded-3xl border border-slate-200 shadow-xl text-center"
            >
              <div className="w-20 h-20 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <TrendingUp size={40} className="text-indigo-600" />
              </div>
              <h2 className="text-3xl font-bold mb-4">开启你的产品经理之路</h2>
              <p className="text-slate-600 mb-8 max-w-md mx-auto leading-relaxed">
                你是一名对产品经理充满好奇的大学生。
                在这个模拟器中，你将从一名实习生开始，面对真实的职场抉择。
                你的目标：在不崩溃、不失去团队信任、不做出垃圾产品的前提下，晋升为 CPO。
              </p>
              <button 
                onClick={() => setStatus(GameStatus.SETUP)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-lg shadow-indigo-200 flex items-center gap-2 mx-auto"
              >
                开始职业生涯
                <ChevronRight size={20} />
              </button>
            </motion.div>
          )}

          {status === GameStatus.CHALLENGE && challengeResult && (
            <motion.div 
              key="challenge"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-8 md:p-12 rounded-3xl border border-slate-200 shadow-xl text-center"
            >
              <h2 className="text-2xl font-bold mb-2">简历筛选与面试中...</h2>
              <p className="text-slate-500 mb-8">目标公司：{selectedCompany.name}</p>

              <div className="relative w-48 h-48 mx-auto mb-8">
                {/* Circular Progress for Probability */}
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="transparent"
                    className="text-slate-100"
                  />
                  <motion.circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="transparent"
                    strokeDasharray={552.92}
                    initial={{ strokeDashoffset: 552.92 }}
                    animate={{ strokeDashoffset: 552.92 - (552.92 * challengeResult.probability) / 100 }}
                    transition={{ duration: 2, ease: "easeOut" }}
                    className="text-indigo-600"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-black text-slate-800">{challengeResult.probability}%</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">录取概率</span>
                </div>
              </div>

              <div className="max-w-sm mx-auto mb-8 space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">简历匹配度</span>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: "70%" }}
                    className="h-1.5 bg-indigo-100 rounded-full w-32 overflow-hidden"
                  >
                    <div className="h-full bg-indigo-500 w-full" />
                  </motion.div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">面试表现 (模拟)</span>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: "85%" }}
                    transition={{ delay: 0.5 }}
                    className="h-1.5 bg-indigo-100 rounded-full w-32 overflow-hidden"
                  >
                    <div className="h-full bg-indigo-500 w-full" />
                  </motion.div>
                </div>
              </div>

              {!challengeAnimating ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {!showMiniGame ? (
                    <div className="space-y-6">
                      <div className="bg-indigo-50 text-indigo-700 p-6 rounded-2xl border border-indigo-100">
                        <h3 className="font-bold mb-2">简历筛选已通过，进入面试环节！</h3>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          基于你的背景，面试官对你的期待值为 {challengeResult.probability}%。
                          你需要通过“压力面试”小游戏来证明你的产品直觉。
                        </p>
                      </div>
                      <button 
                        onClick={startInterviewGame}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
                      >
                        开始面试挑战
                        <Zap size={18} />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-bold text-slate-400 uppercase">面试表现进度</div>
                        <div className="text-xs font-bold text-indigo-600">目标: {Math.ceil((100 - challengeResult.probability) / 5) + 5} 分</div>
                      </div>
                      
                      <div className="relative w-full h-64 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 overflow-hidden cursor-crosshair">
                        {gameActive ? (
                          <>
                            <div className="absolute top-3 left-3 flex items-center gap-2">
                              <div className="px-2 py-1 bg-white rounded-md border border-slate-200 text-[10px] font-bold">
                                得分: {gameScore}
                              </div>
                              <div className={cn(
                                "px-2 py-1 rounded-md border text-[10px] font-bold",
                                gameTimer < 5 ? "bg-rose-50 border-rose-200 text-rose-600 animate-pulse" : "bg-white border-slate-200 text-slate-600"
                              )}>
                                时间: {gameTimer.toFixed(1)}s
                              </div>
                            </div>
                            
                            <motion.button
                              key={`${gameTarget.x}-${gameTarget.y}`}
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              onClick={handleGameClick}
                              style={{ 
                                left: `${gameTarget.x}%`, 
                                top: `${gameTarget.y}%`,
                                width: `${Math.max(30, 60 - (100 - challengeResult.probability) / 2)}px`,
                                height: `${Math.max(30, 60 - (100 - challengeResult.probability) / 2)}px`
                              }}
                              className="absolute -translate-x-1/2 -translate-y-1/2 bg-indigo-600 rounded-full shadow-lg shadow-indigo-200 flex items-center justify-center text-white"
                            >
                              <Zap size={16} />
                            </motion.button>
                          </>
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
                            {challengeResult.success ? (
                              <motion.div 
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="text-center"
                              >
                                <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center text-white mx-auto mb-4">
                                  <Check size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">面试表现优异！</h3>
                                <p className="text-sm text-slate-500 mb-6">你用实力证明了学历不是唯一的标准。</p>
                                <button 
                                  onClick={proceedToGame}
                                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-8 rounded-xl font-bold transition-all"
                                >
                                  正式入职
                                </button>
                              </motion.div>
                            ) : (
                              <motion.div 
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="text-center"
                              >
                                <div className="w-16 h-16 bg-rose-500 rounded-full flex items-center justify-center text-white mx-auto mb-4">
                                  <X size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">面试未通过</h3>
                                <p className="text-sm text-slate-500 mb-6">面试官认为你的反应速度和产品直觉仍需磨练。</p>
                                <button 
                                  onClick={proceedToGame}
                                  className="w-full bg-slate-800 hover:bg-slate-900 text-white py-3 px-8 rounded-xl font-bold transition-all"
                                >
                                  返回修改简历
                                </button>
                              </motion.div>
                            )}
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 italic">
                        * 提示：点击出现的蓝色气泡以获得分数。难度随录取概率降低而增加。
                      </p>
                    </div>
                  )}
                </motion.div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-indigo-600 font-bold animate-pulse">
                  <Loader2 className="animate-spin" size={20} />
                  <span>正在同步面试结果...</span>
                </div>
              )}
            </motion.div>
          )}

          {status === GameStatus.SETUP && (
            <motion.div 
              key="setup"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-8 md:p-10 rounded-3xl border border-slate-200 shadow-xl"
            >
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <User className="text-indigo-600" />
                入职选择
              </h2>
              
              <div className="space-y-6">
                {/* Name Input */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">你的名字</label>
                  <input 
                    type="text" 
                    value={userProfile.name}
                    onChange={(e) => setUserProfile({...userProfile, name: e.target.value})}
                    placeholder="例如：张三"
                    className="w-full p-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                  />
                </div>

                {/* Education Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">学位</label>
                    <div className="flex flex-wrap gap-2">
                      {['专科', '本科', '硕士', '博士', '海外留学生'].map((edu) => (
                        <button
                          key={edu}
                          onClick={() => {
                            const newProfile = { ...userProfile, education: edu };
                            if (edu === '专科') {
                              newProfile.schoolTier = '专科院校';
                            }
                            setUserProfile(newProfile);
                          }}
                          className={cn(
                            "px-4 py-2 rounded-lg border text-xs font-medium transition-all",
                            userProfile.education === edu 
                              ? "border-indigo-600 bg-indigo-50 text-indigo-700" 
                              : "border-slate-200 hover:border-slate-300 text-slate-600"
                          )}
                        >
                          {edu}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">学校</label>
                    <div className="flex flex-wrap gap-2">
                      {['C9/985', '211', '普通本科', '专科院校', '全球顶尖 (QS前50)'].map((tier) => {
                        const isJuniorCollege = userProfile.education === '专科';
                        const isDegreeHolder = ['本科', '硕士', '博士', '海外留学生'].includes(userProfile.education);
                        
                        let isDisabled = false;
                        if (isJuniorCollege && tier !== '专科院校') isDisabled = true;
                        if (isDegreeHolder && tier === '专科院校') isDisabled = true;

                        return (
                          <button
                            key={tier}
                            disabled={isDisabled}
                            onClick={() => setUserProfile({...userProfile, schoolTier: tier})}
                            className={cn(
                              "px-4 py-2 rounded-lg border text-xs font-medium transition-all",
                              userProfile.schoolTier === tier 
                                ? "border-indigo-600 bg-indigo-50 text-indigo-700" 
                                : "border-slate-200 hover:border-slate-300 text-slate-600",
                              isDisabled && "opacity-30 cursor-not-allowed grayscale"
                            )}
                          >
                            {tier}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Background Selection */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">你的背景</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['在校大学生', '应届毕业生', '转行小白', '技术转产品', '创业失败者'].map((bg) => (
                      <button
                        key={bg}
                        onClick={() => {
                          const newProfile = { ...userProfile, background: bg };
                          if (bg === '在校大学生') {
                            newProfile.selectedCompanyId = 'campus-intern';
                          }
                          setUserProfile(newProfile);
                        }}
                        className={cn(
                          "p-3 rounded-xl border text-sm font-medium transition-all",
                          userProfile.background === bg 
                            ? "border-indigo-600 bg-indigo-50 text-indigo-700" 
                            : "border-slate-200 hover:border-slate-300 text-slate-600"
                        )}
                      >
                        {bg}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Company Selection */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">选择入职公司</label>
                  <div className="space-y-3">
                    {COMPANY_TYPES.map((company) => {
                      const isStudent = userProfile.background === '在校大学生';
                      const isDisabled = isStudent && company.id !== 'campus-intern';
                      
                      return (
                        <button
                          key={company.id}
                          disabled={isDisabled}
                          onClick={() => setUserProfile({...userProfile, selectedCompanyId: company.id})}
                          className={cn(
                            "w-full p-4 rounded-xl border text-left transition-all flex items-start gap-4",
                            userProfile.selectedCompanyId === company.id 
                              ? "border-indigo-600 bg-indigo-50" 
                              : "border-slate-200 hover:border-slate-300",
                            isDisabled && "opacity-50 grayscale cursor-not-allowed border-slate-100"
                          )}
                        >
                          <div className={cn(
                            "p-2 rounded-lg",
                            userProfile.selectedCompanyId === company.id ? "bg-indigo-100" : "bg-slate-100"
                          )}>
                            <Building2 size={20} className={userProfile.selectedCompanyId === company.id ? "text-indigo-600" : "text-slate-500"} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className={cn("font-bold", userProfile.selectedCompanyId === company.id ? "text-indigo-900" : "text-slate-800")}>
                                {company.name}
                              </span>
                              <div className="flex items-center gap-2">
                                {isDisabled && (
                                  <span className="text-[10px] text-rose-500 font-bold">仅限毕业生/职场人</span>
                                )}
                                <span className={cn(
                                  "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                                  company.difficulty === '简单' ? "bg-emerald-100 text-emerald-700" :
                                  company.difficulty === '普通' ? "bg-blue-100 text-blue-700" : "bg-rose-100 text-rose-700"
                                )}>
                                  {company.difficulty}
                                </span>
                              </div>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed">{company.description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-400 text-xs">
                  <Info size={14} />
                  <span>选择将影响你的初始属性</span>
                </div>
                <button 
                  disabled={!userProfile.name}
                  onClick={startGame}
                  className={cn(
                    "px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2",
                    userProfile.name 
                      ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100" 
                      : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  )}
                >
                  正式入职
                  <ChevronRight size={18} />
                </button>
              </div>
            </motion.div>
          )}

          {status === GameStatus.PLAYING && (
            <motion.div 
              key="playing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {/* Stats Sidebar */}
              <div className="md:col-span-1 flex flex-col gap-4">
                <StatCard icon={Zap} label="产品质量" value={stats.productQuality} color="text-emerald-600" />
                <StatCard icon={Users} label="团队信任" value={stats.teamTrust} color="text-blue-600" />
                <StatCard icon={AlertCircle} label="压力值" value={stats.stress} color="text-rose-600" />
                <StatCard icon={TrendingUp} label="职业进度" value={stats.careerProgress} color="text-indigo-600" />
              </div>

              {/* Main Game Area */}
              <div className="md:col-span-2 flex flex-col gap-6">
                <AnimatePresence mode="wait">
                  {loading ? (
                    <motion.div 
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="bg-white p-12 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-slate-400"
                    >
                      <RefreshCcw className="animate-spin mb-4" size={32} />
                      <p className="text-sm font-medium">正在分析职场局势...</p>
                    </motion.div>
                  ) : currentScenario && (
                    <motion.div 
                      key={currentScenario.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm"
                    >
                      {feedback && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mb-6 p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-700 text-sm italic"
                        >
                          “{feedback}”
                        </motion.div>
                      )}
                      
                      <h3 className="text-xl font-bold mb-4 text-slate-800">{currentScenario.title}</h3>
                      <p className="text-slate-600 mb-8 leading-relaxed">
                        {currentScenario.description}
                      </p>

                      <div className="flex flex-col gap-3">
                        {currentScenario.choices.map((choice, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleChoice(choice)}
                            className="group text-left p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all flex items-center justify-between"
                          >
                            <span className="text-slate-700 font-medium group-hover:text-indigo-700">{choice.text}</span>
                            <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-400" />
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {(status === GameStatus.GAME_OVER || status === GameStatus.WIN) && (
            <motion.div 
              key="end"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-12 rounded-3xl border border-slate-200 shadow-2xl text-center"
            >
              <div className={cn(
                "w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6",
                status === GameStatus.WIN ? "bg-emerald-100" : "bg-rose-100"
              )}>
                {status === GameStatus.WIN ? (
                  <Trophy size={48} className="text-emerald-600" />
                ) : (
                  <Skull size={48} className="text-rose-600" />
                )}
              </div>
              
              <h2 className="text-4xl font-black mb-2">
                {status === GameStatus.WIN ? "职业巅峰！" : "职业终局"}
              </h2>
              <p className="text-slate-500 mb-8">
                {status === GameStatus.WIN 
                  ? `你成功晋升为 CPO。在 ${stats.tenureWeeks} 周的职业生涯中，你证明了自己是真正的产品领袖。`
                  : stats.stress >= 100 
                    ? "你彻底崩溃了。身体是革命的本钱，或许产品经理并不适合你现在的状态。"
                    : stats.teamTrust <= 0 
                      ? "团队对你彻底失去了信任。没有开发的配合，你只是一个画饼的。你被解雇了。"
                      : "产品质量太差，用户纷纷卸载。公司倒闭了，你也失业了。"
                }
              </p>

              <div className="grid grid-cols-2 gap-4 mb-8 max-w-sm mx-auto">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">职业时长</div>
                  <div className="text-2xl font-bold">{stats.tenureWeeks} 周</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">最终职位</div>
                  <div className="text-lg font-bold">{stats.stage}</div>
                </div>
              </div>

              <button 
                onClick={startGame}
                className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-xl font-bold transition-all flex items-center gap-2 mx-auto"
              >
                <RefreshCcw size={20} />
                重新开始挑战
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <footer className="mt-12 text-center text-slate-400 text-xs">
          <p>© 2024 PM 职业模拟器 | 专为大学生设计的职业初体验</p>
        </footer>
      </div>
    </div>
  );
}
