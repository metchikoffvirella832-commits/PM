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
  ArrowRight,
  RefreshCcw,
  Trophy,
  Skull,
  User,
  Building2,
  Info,
  Check,
  X,
  Loader2,
  BookOpen,
  Target,
  Activity,
  FileText,
  Home,
  Heart,
  Star,
  MessageSquare,
  Clock,
  Flag,
  Lock,
  Coffee,
  Search
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { cn } from './lib/utils';
import { GameStatus, GameStats, Scenario, Choice, GameHistoryItem, UserProfile, CompanyType, FeedItem } from './types';
import { INITIAL_SCENARIOS, INITIAL_STATS, COMPANY_TYPES, MILESTONES } from './constants';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function App() {
  const [status, setStatus] = useState<GameStatus>(GameStatus.START);
  const [stats, setStats] = useState<GameStats>(INITIAL_STATS);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: '',
    background: '应届毕业生',
    education: '本科',
    schoolTier: '普通本科',
    selectedCompanyId: COMPANY_TYPES[0].id,
    gender: 'female'
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
  const [gameItems, setGameItems] = useState<{ id: string; x: number; y: number; type: 'good' | 'bad'; speed: number; icon: string }[]>([]);
  const [gameTimer, setGameTimer] = useState(0);
  const [tankX, setTankX] = useState(50);
  const [bullets, setBullets] = useState<{ id: string; x: number; y: number }[]>([]);
  const [enemies, setEnemies] = useState<{ id: string; x: number; y: number; speed: number }[]>([]);
  const [linkupGrid, setLinkupGrid] = useState<{ id: string; type: string; cleared: boolean }[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [userInput, setUserInput] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [currentTab, setCurrentTab] = useState<'home' | 'resume' | 'dynamics'>('home');
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [milestones, setMilestones] = useState(MILESTONES);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionResult, setActionResult] = useState<{
    title: string;
    message: string;
    impact: Partial<GameStats>;
  } | null>(null);
  const [gameOverReason, setGameOverReason] = useState<string | null>(null);

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
        - 领导认可度：${currentStats.leadershipRecognition}/100
        - 同事喜爱度：${currentStats.colleagueLikability}/100
        - 任期：${currentStats.tenureWeeks} 周

        上一次行动：${lastHistory.length > 0 ? lastHistory[lastHistory.length - 1].choice.text : '刚刚入职'}
        上一次反馈：${lastHistory.length > 0 ? lastHistory[lastHistory.length - 1].choice.feedback : '无'}

        任务：生成一个挑战场景。
        
        特别说明：如果这是玩家的第一个场景（上一次行动为“刚刚入职”），请生成一个与玩家背景高度相关的“入职第一天”或“第一个任务”场景。
        例如：
        - 技术转产品：第一个任务可能是写 PRD 或与老同事对齐逻辑。
        - 创业失败者：可能是被分配到一个边缘项目，考验心态。
        - 校园实习生：可能是领电脑、找导师、或者被老员工使唤。
        - 大厂背景：可能是复杂的入职培训或权限申请流程。
        
        设计指南：
        1. 混合交互模式：每个场景都必须提供 2-3 个预设选项 (CHOICE)，同时玩家也可以选择在对话框中输入自定义回复 (DIALOGUE)。
        2. 深度结合公司特质：
           - 大厂：强调流程、对齐、PPT、政治、OKR。
           - 初创：强调速度、混乱、多面手、生存、技术债。
           - 传统：强调业务逻辑、线下复杂度、沟通代沟、数字化阻力。
           - 外包：强调客户需求、交付期、成本、多项目切换。
           - 校园/实习：强调学业与工作的平衡、转正压力、导师关系、校园思维与职场思维的碰撞。
        3. 结合玩家背景、学历与学校层次：
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
              "impact": { "productQuality": 数字, "teamTrust": 数字, "stress": 数字, "careerProgress": 数字, "leadershipRecognition": 数字, "colleagueLikability": 数字 },
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
      console.log("Generated Scenario:", newScenario);
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
    setGameOverReason(null);
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
    setGameTimer(30); // 30 seconds for more fun
    
    if (userProfile.gender === 'female') {
      // Initialize Link-up (4x4 grid, 8 pairs)
      const icons = ['✨', '❤️', '⭐', '💎', '🍀', '🍎', '🌈', '🎁'];
      const pairs = [...icons, ...icons];
      const shuffled = pairs.sort(() => Math.random() - 0.5);
      setLinkupGrid(shuffled.map((type, i) => ({ id: `tile-${i}`, type, cleared: false })));
      setSelectedIndices([]);
    } else {
      // Initialize Tank Battle
      setTankX(50);
      setBullets([]);
      setEnemies([]);
    }
  };

  const handleLinkupClick = (index: number) => {
    if (!gameActive || linkupGrid[index].cleared || selectedIndices.includes(index)) return;
    
    const newSelected = [...selectedIndices, index];
    setSelectedIndices(newSelected);
    
    if (newSelected.length === 2) {
      const [first, second] = newSelected;
      if (linkupGrid[first].type === linkupGrid[second].type) {
        // Match!
        setTimeout(() => {
          setLinkupGrid(prev => prev.map((tile, i) => 
            (i === first || i === second) ? { ...tile, cleared: true } : tile
          ));
          setGameScore(prev => prev + 10);
          setSelectedIndices([]);
          
          // Check if all cleared
          setLinkupGrid(current => {
            const allCleared = current.every(t => t.cleared || current.indexOf(t) === first || current.indexOf(t) === second);
            if (allCleared) {
              setGameActive(false);
              setChallengeResult(prev => prev ? { ...prev, success: true } : null);
            }
            return current;
          });
        }, 300);
      } else {
        // No match
        setTimeout(() => setSelectedIndices([]), 500);
      }
    }
  };

  const handleTankMove = (dir: 'left' | 'right') => {
    if (!gameActive) return;
    setTankX(prev => Math.max(5, Math.min(95, prev + (dir === 'left' ? -5 : 5))));
  };

  const handleTankShoot = () => {
    if (!gameActive) return;
    setBullets(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), x: tankX, y: 90 }]);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameActive || userProfile.gender === 'female') return;
      if (e.key === 'ArrowLeft' || e.key === 'a') handleTankMove('left');
      if (e.key === 'ArrowRight' || e.key === 'd') handleTankMove('right');
      if (e.key === ' ' || e.key === 'Enter') handleTankShoot();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameActive, tankX, userProfile.gender]);

  useEffect(() => {
    let interval: any;
    if (gameActive && gameTimer > 0) {
      interval = setInterval(() => {
        setGameTimer(prev => {
          if (prev <= 0.1) {
            setGameActive(false);
            // Success if score is high enough
            const requiredScore = userProfile.gender === 'female' ? 80 : 50;
            setChallengeResult(prevRes => prevRes ? { ...prevRes, success: gameScore >= requiredScore } : null);
            return 0;
          }
          return prev - 0.1;
        });

        if (userProfile.gender === 'male') {
          // Tank Battle Logic
          setBullets(prev => prev.map(b => ({ ...b, y: b.y - 5 })).filter(b => b.y > 0));
          
          setEnemies(prev => {
            let nextEnemies = prev.map(e => ({ ...e, y: e.y + e.speed })).filter(e => e.y < 100);
            
            // Spawn new enemies
            if (Math.random() > 0.9) {
              nextEnemies.push({
                id: Math.random().toString(36).substr(2, 9),
                x: Math.random() * 90 + 5,
                y: -10,
                speed: Math.random() * 1 + 0.5
              });
            }
            
            // Collision detection
            setBullets(currentBullets => {
              const hitEnemies: string[] = [];
              const hitBullets: string[] = [];
              
              currentBullets.forEach(b => {
                nextEnemies.forEach(e => {
                  const dist = Math.sqrt(Math.pow(b.x - e.x, 2) + Math.pow(b.y - e.y, 2));
                  if (dist < 8) {
                    hitEnemies.push(e.id);
                    hitBullets.push(b.id);
                    setGameScore(s => s + 10);
                  }
                });
              });
              
              if (hitEnemies.length > 0) {
                nextEnemies = nextEnemies.filter(e => !hitEnemies.includes(e.id));
                return currentBullets.filter(b => !hitBullets.includes(b.id));
              }
              return currentBullets;
            });
            
            return nextEnemies;
          });
          
          // Check win condition for tank
          if (gameScore >= 50) {
            setGameActive(false);
            setChallengeResult(prev => prev ? { ...prev, success: true } : null);
          }
        }
      }, 100);
    }
    return () => clearInterval(interval);
  }, [gameActive, gameTimer, userProfile.gender, gameScore]);

  const proceedToGame = async () => {
    if (!challengeResult?.success) {
      setStatus(GameStatus.SETUP);
      setChallengeResult(null);
      return;
    }

    const initialStatsWithCompany: GameStats = {
      ...INITIAL_STATS,
      ...selectedCompany.initialStats,
      stage: userProfile.background === '在校大学生' ? '实习生' : '初级产品经理'
    } as GameStats;
    setStats(initialStatsWithCompany);
    setHistory([]);
    setMilestones(MILESTONES);
    setFeed([{
      id: 'init',
      type: 'social',
      content: `[公司群通知] 欢迎新同事 ${userProfile.name} 加入 ${selectedCompany.name}！大家欢迎一下。👏`,
      timestamp: Date.now(),
      week: 0
    }]);
    setFeedback(null);
    setStatus(GameStatus.ONBOARDING);
    
    // Generate the first scenario dynamically based on background
    await generateNextScenario(initialStatsWithCompany, []);
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
    else nextStage = userProfile.background === '在校大学生' ? '实习生' : '初级产品经理';

    const newStats: GameStats = {
      productQuality: Math.max(0, Math.min(100, stats.productQuality + (choice.impact.productQuality || 0))),
      teamTrust: Math.max(0, Math.min(100, stats.teamTrust + (choice.impact.teamTrust || 0))),
      stress: Math.max(0, Math.min(100, stats.stress + (choice.impact.stress || 0))),
      careerProgress: Math.max(0, Math.min(100, nextProgress)),
      leadershipRecognition: Math.max(0, Math.min(100, stats.leadershipRecognition + (choice.impact.leadershipRecognition || 0))),
      colleagueLikability: Math.max(0, Math.min(100, stats.colleagueLikability + (choice.impact.colleagueLikability || 0))),
      tenureWeeks: stats.tenureWeeks + Math.floor(Math.random() * 4) + 1,
      stage: nextStage,
    };

    setStats(newStats);
    setFeedback(choice.feedback);
    setActionResult({
      title: "决策反馈",
      message: choice.feedback,
      impact: choice.impact
    });
    const newHistoryItem = { scenario: currentScenario, choice };
    const newHistory = [...history, newHistoryItem];
    setHistory(newHistory);

    // Update milestones
    setMilestones(prev => prev.map(m => {
      if (m.isCompleted) return m;
      let completed = false;
      if (m.id === 'probation' && newStats.careerProgress > 20 && newStats.teamTrust > 40) completed = true;
      if (m.id === 'recognition' && newStats.leadershipRecognition > 50 && newStats.productQuality > 50) completed = true;
      if (m.id === 'promotion' && newStats.careerProgress > 60 && newStats.leadershipRecognition > 70) completed = true;
      if (m.id === 'cpo' && newStats.careerProgress > 90) completed = true;
      
      if (completed) {
        setFeed(f => [{
          id: Math.random().toString(36).substr(2, 9),
          type: 'social',
          content: `[成就达成] 恭喜你达成了阶段性目标：${m.title}！`,
          timestamp: Date.now() + 200,
          week: newStats.tenureWeeks
        }, ...f]);
      }
      return { ...m, isCompleted: completed || m.isCompleted };
    }));

    // Add to feed
    const newFeedItem: FeedItem = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'choice',
      content: `[我的决策] ${choice.text}。${choice.feedback}`,
      timestamp: Date.now(),
      week: newStats.tenureWeeks
    };
    
    // Random social event
    const socialEvents = [
      "听说隔壁组的 PM 又被老板骂了，真是伴君如伴虎。",
      "研发老王在茶水间吐槽：‘现在的 PM 需求写得跟天书一样’。",
      "公司群通知：本周五下午全员参加‘敏捷开发’培训，不得缺席。",
      "HR 悄悄告诉你：最近公司可能有架构调整，注意站队。",
      "你在电梯里偶遇了 CEO，他竟然对你点了点头，虽然可能只是认错人了。",
      "设计小李发朋友圈：‘改了18稿，最后还是回到了第一版，心累’。",
      "听到两个同事在走廊小声议论：‘那个新来的 ${userProfile.name} 好像挺有想法的。’",
      "[群消息] 行政：‘由于空调维修，今天下午大家可以提前一小时下班。’",
      "[私聊] 研发老王：‘那个逻辑我改好了，下次别这么急了哈。’"
    ];
    
    const newFeed = [newFeedItem, ...feed];
    if (Math.random() > 0.6) {
      newFeed.unshift({
        id: Math.random().toString(36).substr(2, 9),
        type: 'social',
        content: socialEvents[Math.floor(Math.random() * socialEvents.length)],
        timestamp: Date.now() + 100,
        week: newStats.tenureWeeks
      });
    }
    setFeed(newFeed.slice(0, 50));

    // Check for game over
    if (newStats.stress >= 100) {
      setGameOverReason("你感到精疲力竭，压力已经超出了承受极限。在连续一周的失眠后，你递交了辞职信，决定彻底裸辞休息一段时间。");
      setStatus(GameStatus.GAME_OVER);
      return;
    }
    if (newStats.teamTrust <= 0) {
      setGameOverReason("研发和设计团队对你彻底失去了信任。你的需求再也没有人愿意配合，甚至在开会时被公开质疑。HR 约谈了你，建议你寻找更适合的机会。");
      setStatus(GameStatus.GAME_OVER);
      return;
    }
    if (newStats.productQuality <= 20) {
      setGameOverReason("你负责的产品因为质量问题频发，导致大量用户流失和严重的公关危机。老板对你的专业能力彻底失望，你被劝退了。");
      setStatus(GameStatus.GAME_OVER);
      return;
    }
    if (newStats.leadershipRecognition <= 5) {
      setGameOverReason("领导认为你完全无法胜任目前的工作，甚至怀疑你的入职动机。在试用期结束前，你收到了不予转正的通知。");
      setStatus(GameStatus.GAME_OVER);
      return;
    }

    if (newStats.careerProgress >= 100) {
      setGameOverReason("恭喜！你凭借卓越的产品直觉和出色的职场手腕，一路披荆斩棘。今天，你正式被任命为首席产品官 (CPO)，开启了职业生涯的新篇章。");
      setStatus(GameStatus.WIN);
      return;
    }

    await generateNextScenario(newStats, newHistory);
  };

  const handleAction = async (actionType: 'chat' | 'report' | 'study' | 'relax') => {
    if (actionLoading || loading) return;
    setActionLoading(true);
    
    let impact: Partial<GameStats> = {};
    let content = "";
    let type: 'chat' | 'social' | 'gossip' = 'chat';

    switch (actionType) {
      case 'chat':
        impact = { colleagueLikability: 5, teamTrust: 2, stress: -5 };
        const gossips = [
          "老王悄悄告诉你：‘听说老板最近在看新的融资，公司可能有大动作。’",
          "小李抱怨：‘设计稿又被毙了，这周得加班到深夜。’",
          "你和同事聊了聊最近的热门产品，大家觉得你的见解很独到。",
          "闲聊中，你发现研发团队其实对目前的排期非常有意见。"
        ];
        content = gossips[Math.floor(Math.random() * gossips.length)];
        type = 'gossip';
        break;
      case 'report':
        impact = { leadershipRecognition: 8, careerProgress: 3, stress: 10 };
        content = "你整理了本周的工作进展向领导做了汇报。领导点了点头，表示‘知道了，继续努力’。";
        type = 'social';
        break;
      case 'study':
        impact = { productQuality: 5, stress: 15 };
        content = "你利用业余时间研究了竞品分析和最新的交互趋势，感觉专业能力有所提升。";
        type = 'social';
        break;
      case 'relax':
        impact = { stress: -20, leadershipRecognition: -2, careerProgress: -1 };
        content = "你偷偷刷了会儿短视频，心情舒畅了不少，但总觉得背后有一双眼睛在盯着你。";
        type = 'social';
        break;
    }

    const newStats: GameStats = {
      ...stats,
      productQuality: Math.max(0, Math.min(100, stats.productQuality + (impact.productQuality || 0))),
      teamTrust: Math.max(0, Math.min(100, stats.teamTrust + (impact.teamTrust || 0))),
      stress: Math.max(0, Math.min(100, stats.stress + (impact.stress || 0))),
      careerProgress: Math.max(0, Math.min(100, stats.careerProgress + (impact.careerProgress || 0))),
      leadershipRecognition: Math.max(0, Math.min(100, stats.leadershipRecognition + (impact.leadershipRecognition || 0))),
      colleagueLikability: Math.max(0, Math.min(100, stats.colleagueLikability + (impact.colleagueLikability || 0))),
      tenureWeeks: stats.tenureWeeks + 0.5 // Half week for small actions
    };

    setStats(newStats);
    setActionResult({
      title: actionType === 'chat' ? "闲聊结果" : actionType === 'report' ? "汇报反馈" : actionType === 'study' ? "学习成果" : "休息效果",
      message: content,
      impact: impact
    });
    setFeed([{
      id: Math.random().toString(36).substr(2, 9),
      type,
      content: `[我的行动] ${content}`,
      timestamp: Date.now(),
      week: Math.floor(newStats.tenureWeeks)
    }, ...feed]);

    // Check for game over in free actions
    if (newStats.stress >= 100) {
      setGameOverReason("在一次高强度的‘自我充电’或‘汇报’后，你紧绷的神经终于断了。你发现自己再也无法面对电脑屏幕，只能选择离开。");
      setStatus(GameStatus.GAME_OVER);
    } else if (newStats.leadershipRecognition <= 5) {
      setGameOverReason("由于你在职场中的表现持续低迷，领导层最终决定终止你的合同。");
      setStatus(GameStatus.GAME_OVER);
    }

    setTimeout(() => setActionLoading(false), 800);
  };

  const handleDialogueSubmit = async () => {
    if (!userInput.trim() || !currentScenario) return;
    
    setEvaluating(true);
    try {
      const prompt = `
        你是一个产品经理职业模拟器的评价引擎。
        
        场景描述：${currentScenario.description}
        玩家回复：${userInput}
        
        玩家背景：${userProfile.name}, ${userProfile.background}, ${userProfile.education}, ${userProfile.schoolTier}
        当前职位：${stats.stage}
        
        请根据玩家的回复，评估其对职场属性的影响。
        评估标准：
        - 团队信任：回复是否得体、是否尊重他人、是否能解决冲突。
        - 压力值：回复是否给自己揽了太多活、是否在推诿责任导致后续麻烦。
        - 产品质量：回复是否专业、是否考虑了业务逻辑。
        - 职业进度：回复是否展现了领导力、专业度或向上管理能力。
        
        请仅返回一个 JSON 对象：
        {
          "impact": { 
            "productQuality": 数字(-15到15), 
            "teamTrust": 数字(-15到15), 
            "stress": 数字(-15到15), 
            "careerProgress": 数字(-15到15),
            "leadershipRecognition": 数字(-15到15),
            "colleagueLikability": 数字(-15到15)
          },
          "feedback": "一段简短的评价，说明为什么你的回复产生了这些影响。"
        }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const result = JSON.parse(response.text || '{}');
      const choice: Choice = {
        text: userInput,
        impact: result.impact || {},
        feedback: result.feedback || "面试官对你的回复不置可否。"
      };
      
      setUserInput('');
      await handleChoice(choice);
    } catch (error) {
      console.error("Failed to evaluate dialogue:", error);
      // Fallback
      await handleChoice({
        text: userInput,
        impact: { stress: 5 },
        feedback: "回复已发出，但似乎没激起什么水花。"
      });
    } finally {
      setEvaluating(false);
    }
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
          {status === GameStatus.ONBOARDING && (
            <motion.div 
              key="onboarding"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white p-8 md:p-12 rounded-3xl border border-slate-200 shadow-xl max-w-2xl mx-auto"
            >
              <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-100">
                <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                  <BookOpen size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">入职指南</h2>
                  <p className="text-slate-500 text-sm">欢迎加入 {selectedCompany.name}，开启你的产品之旅</p>
                </div>
              </div>

              <div className="space-y-8 max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
                <section>
                  <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-slate-800">
                    <Target size={18} className="text-indigo-600" />
                    一、核心目标
                  </h3>
                  <div className="space-y-2 text-sm text-slate-600 leading-relaxed">
                    <p><span className="font-bold text-slate-800">持续进化：</span>作为产品经理，你的核心价值在于解决问题。通过不断学习和实践，从执行者成长为决策者。</p>
                    <div className="bg-rose-50 p-4 rounded-xl border border-rose-100 mt-2">
                      <p className="font-bold text-rose-700 mb-1">需要警惕的状态：</p>
                      <ul className="list-disc list-inside space-y-1 text-rose-600">
                        <li>身心俱疲：压力值满格 (≥ 100)</li>
                        <li>孤军奋战：团队信任降至冰点 (≤ 0)</li>
                        <li>口碑崩盘：产品质量跌破底线 (≤ 30)</li>
                        <li>职业危机：做出极其不专业的决策</li>
                      </ul>
                    </div>
                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 mt-2">
                      <p className="font-bold text-emerald-700 mb-1">终极梦想：</p>
                      <ul className="list-disc list-inside space-y-1 text-emerald-600">
                        <li>登顶职场：最终晋升为 首席产品官 (CPO)</li>
                      </ul>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-slate-800">
                    <Zap size={18} className="text-indigo-600" />
                    二、关键资源
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="font-bold text-slate-800 text-sm mb-1">产品质量</div>
                      <p className="text-xs text-slate-500">你的勋章。好的产品会说话，它是你职场最好的名片。</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="font-bold text-slate-800 text-sm mb-1">团队信任</div>
                      <p className="text-xs text-slate-500">你的后盾。产品不是一个人做的，信任是团队的粘合剂。</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="font-bold text-slate-800 text-sm mb-1">压力值</div>
                      <p className="text-xs text-slate-500">你的晴雨表。适度压力是动力，过度则需要及时调节。</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="font-bold text-slate-800 text-sm mb-1">职业进度</div>
                      <p className="text-xs text-slate-500">你的足迹。每一步成长都算数，它是你晋升的阶梯。</p>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-slate-800">
                    <Users size={18} className="text-indigo-600" />
                    三、职场生存法则
                  </h3>
                  <ul className="space-y-3 text-sm text-slate-600">
                    <li className="flex gap-2">
                      <span className="text-indigo-600 font-bold">·</span>
                      <span><span className="font-bold text-slate-800">尊重专业：</span>研发和设计是你的亲密战友，多听听他们的专业建议。</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-indigo-600 font-bold">·</span>
                      <span><span className="font-bold text-slate-800">真诚沟通：</span>PM 的工作 80% 在于连接他人。真诚是最高级的套路。</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-indigo-600 font-bold">·</span>
                      <span><span className="font-bold text-slate-800">权衡利弊：</span>没有完美的方案，只有在当前限制下的最优解。</span>
                    </li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-slate-800">
                    <TrendingUp size={18} className="text-indigo-600" />
                    四、晋升路线
                  </h3>
                  <div className="flex items-center justify-between px-4 py-3 bg-indigo-50 rounded-xl border border-indigo-100 text-xs font-bold text-indigo-700">
                    <span>实习/初级 PM</span>
                    <ChevronRight size={14} />
                    <span>高级 PM</span>
                    <ChevronRight size={14} />
                    <span>产品总监</span>
                    <ChevronRight size={14} />
                    <span>CPO</span>
                  </div>
                </section>

                <section>
                  <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-slate-800">
                    <Info size={18} className="text-indigo-600" />
                    五、职场奇遇
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    在模拟过程中会触发各种抉择事件。包括：需求评审、上线事故、团队冲突、老板的突发奇想等。
                    <span className="block mt-2 font-bold text-slate-800 italic">记住：职场没有标准答案，只有你的选择。</span>
                  </p>
                </section>
              </div>

              <button 
                onClick={() => setStatus(GameStatus.PLAYING)}
                className="w-full mt-8 bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
              >
                我已了解，开始职业生涯
                <ChevronRight size={20} />
              </button>
            </motion.div>
          )}

          {status === GameStatus.START && (
            <motion.div 
              key="start"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="glass-panel p-8 md:p-16 rounded-[2.5rem] text-center relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50" />
              
              <div className="w-24 h-24 bg-emerald-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                <TrendingUp size={48} className="text-emerald-500" />
              </div>
              
              <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tighter text-white">
                开启你的<span className="text-emerald-500">产品经理</span>之路
              </h2>
              
              <p className="text-slate-400 mb-12 max-w-xl mx-auto leading-relaxed text-lg">
                在这个模拟器中，你将从一名职场新人开始，面对真实的职场抉择。
                你的目标：在不崩溃、不失去团队信任、不做出垃圾产品的前提下，最终晋升为 <span className="text-white font-bold">CPO</span>。
              </p>
              
              <button 
                onClick={() => setStatus(GameStatus.SETUP)}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-10 py-5 rounded-2xl font-black text-lg transition-all shadow-[0_0_40px_rgba(16,185,129,0.3)] flex items-center gap-3 mx-auto group"
              >
                INITIALIZE CAREER
                <ChevronRight size={24} className="group-hover:translate-x-1 transition-transform" />
              </button>
              
              <div className="mt-12 flex items-center justify-center gap-8 opacity-30 grayscale">
                <div className="flex items-center gap-2 text-xs font-mono"><Zap size={14}/> REAL-TIME ENGINE</div>
                <div className="flex items-center gap-2 text-xs font-mono"><Users size={14}/> SOCIAL DYNAMICS</div>
                <div className="flex items-center gap-2 text-xs font-mono"><Briefcase size={14}/> CAREER PATHING</div>
              </div>
            </motion.div>
          )}

          {status === GameStatus.CHALLENGE && challengeResult && (
            <motion.div 
              key="challenge"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel p-10 md:p-16 rounded-[3rem] border border-white/10 text-center max-w-2xl mx-auto relative overflow-hidden"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
              
              <h2 className="text-3xl font-black mb-2 tracking-tight text-white">RECRUITMENT_PROTOCOL_ACTIVE</h2>
              <p className="text-emerald-500/60 font-black uppercase tracking-[0.2em] text-xs mb-10">Target_Entity: {selectedCompany.name}</p>

              <div className="relative w-56 h-56 mx-auto mb-12">
                {/* Circular Progress for Probability */}
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="112"
                    cy="112"
                    r="100"
                    stroke="currentColor"
                    strokeWidth="16"
                    fill="transparent"
                    className="text-white/5"
                  />
                  <motion.circle
                    cx="112"
                    cy="112"
                    r="100"
                    stroke="currentColor"
                    strokeWidth="16"
                    fill="transparent"
                    strokeDasharray={628.32}
                    initial={{ strokeDashoffset: 628.32 }}
                    animate={{ strokeDashoffset: 628.32 - (628.32 * challengeResult.probability) / 100 }}
                    transition={{ duration: 2, ease: "easeOut" }}
                    className="text-emerald-500"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl font-black text-white font-mono">{challengeResult.probability}%</span>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1">Success_Rate</span>
                </div>
                <div className="absolute inset-0 blur-2xl bg-emerald-500/10 rounded-full -z-10" />
              </div>

              <div className="max-w-sm mx-auto mb-12 space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <span>Resume_Sync_Quality</span>
                    <span className="text-emerald-500">70%</span>
                  </div>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: "70%" }}
                    className="h-1.5 bg-white/5 rounded-full w-full overflow-hidden border border-white/5"
                  >
                    <div className="h-full bg-emerald-500 w-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                  </motion.div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <span>Interview_Simulation_Score</span>
                    <span className="text-emerald-500">85%</span>
                  </div>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: "85%" }}
                    transition={{ delay: 0.5 }}
                    className="h-1.5 bg-white/5 rounded-full w-full overflow-hidden border border-white/5"
                  >
                    <div className="h-full bg-emerald-500 w-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                  </motion.div>
                </div>
              </div>

              {!challengeAnimating ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {!showMiniGame ? (
                    <div className="space-y-8">
                      <div className="bg-white/5 p-8 rounded-3xl border border-white/10 backdrop-blur-md relative group overflow-hidden">
                        <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <h3 className="font-black text-white mb-3 uppercase tracking-wider">Phase_02: Technical_Evaluation</h3>
                        <p className="text-xs text-slate-400 leading-relaxed font-medium">
                          {userProfile.gender === 'female' 
                            ? "面试官想考察你的逻辑与记忆。请在规定时间内完成‘连连看’挑战，匹配所有相同图标。" 
                            : "面试官想考察你的应变与执行。请操控‘坦克’击毁所有入侵的系统Bug。"}
                        </p>
                      </div>
                      <button 
                        onClick={startInterviewGame}
                        className="w-full bg-emerald-500 hover:bg-emerald-400 text-black py-5 rounded-2xl font-black transition-all shadow-[0_0_30px_rgba(16,185,129,0.2)] flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-sm"
                      >
                        Initiate_Challenge
                        <Zap size={20} />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Evaluation_Progress</div>
                        <div className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">Target: {Math.ceil((100 - challengeResult.probability) / 5) + 5} PTS</div>
                      </div>
                      
                      <div className="relative w-full h-80 bg-black/40 rounded-3xl border border-white/10 overflow-hidden cursor-crosshair backdrop-blur-xl">
                        {gameActive ? (
                          <>
                            <div className="absolute top-4 left-4 flex items-center gap-3 z-10">
                              <div className="px-3 py-1.5 bg-white/5 rounded-lg border border-white/10 text-[10px] font-black text-white uppercase tracking-widest">
                                SCORE: {gameScore}
                              </div>
                              <div className={cn(
                                "px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest",
                                gameTimer < 5 ? "bg-rose-500/20 border-rose-500/50 text-rose-500 animate-pulse" : "bg-white/5 border-white/10 text-slate-400"
                              )}>
                                TIME: {gameTimer.toFixed(1)}S
                              </div>
                            </div>
                            
                            {userProfile.gender === 'female' ? (
                              <div className="grid grid-cols-4 gap-3 p-6 h-full">
                                {linkupGrid.map((tile, i) => (
                                  <motion.button
                                    key={tile.id}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleLinkupClick(i)}
                                    className={cn(
                                      "aspect-square rounded-2xl flex items-center justify-center text-3xl transition-all relative overflow-hidden",
                                      tile.cleared ? "opacity-0 pointer-events-none" : 
                                      selectedIndices.includes(i) ? "bg-emerald-500/20 border-2 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)] scale-110 z-10" : "bg-white/5 border border-white/10 hover:border-emerald-500/30 hover:bg-white/10"
                                    )}
                                  >
                                    {tile.cleared ? '' : tile.type}
                                  </motion.button>
                                ))}
                              </div>
                            ) : (
                              <div className="relative w-full h-full bg-[#050505] overflow-hidden">
                                <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)', backgroundSize: '24px 24px' }} />
                                {/* Tank */}
                                <motion.div 
                                  animate={{ left: `${tankX}%` }}
                                  className="absolute bottom-6 -translate-x-1/2 text-4xl drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                                >
                                  🚜
                                </motion.div>
                                
                                {/* Bullets */}
                                {bullets.map(b => (
                                  <div 
                                    key={b.id}
                                    style={{ left: `${b.x}%`, top: `${b.y}%` }}
                                    className="absolute w-1.5 h-5 bg-emerald-400 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.8)]"
                                  />
                                ))}
                                
                                {/* Enemies */}
                                {enemies.map(e => (
                                  <div 
                                    key={e.id}
                                    style={{ left: `${e.x}%`, top: `${e.y}%` }}
                                    className="absolute -translate-x-1/2 -translate-y-1/2 text-3xl drop-shadow-[0_0_10px_rgba(244,63,94,0.5)]"
                                  >
                                    👾
                                  </div>
                                ))}

                                {/* Mobile Controls */}
                                <div className="absolute bottom-4 right-4 flex gap-3">
                                  <button onClick={() => handleTankMove('left')} className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-white border border-white/10 backdrop-blur-md active:bg-white/20 transition-colors">⬅️</button>
                                  <button onClick={() => handleTankMove('right')} className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-white border border-white/10 backdrop-blur-md active:bg-white/20 transition-colors">➡️</button>
                                  <button onClick={handleTankShoot} className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-black shadow-[0_0_20px_rgba(16,185,129,0.4)] active:scale-90 transition-transform">🔥</button>
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-10">
                            {challengeResult.success ? (
                              <motion.div 
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="text-center"
                              >
                                <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center text-black mx-auto mb-6 shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                                  <Check size={40} strokeWidth={3} />
                                </div>
                                <h3 className="text-2xl font-black text-white mb-3 tracking-tight">EVALUATION_SUCCESS</h3>
                                <p className="text-sm text-slate-400 mb-8 font-medium">你用实力证明了学历不是唯一的标准。</p>
                                <div className="bg-emerald-500/10 p-6 rounded-3xl border border-emerald-500/20 mb-10 backdrop-blur-md">
                                  <div className="text-[10px] font-black text-emerald-500/60 uppercase tracking-[0.3em] mb-2">Designated_Role</div>
                                  <div className="text-xl font-black text-emerald-500 tracking-tight">
                                    {userProfile.background === '在校大学生' ? '产品实习生' : '初级产品经理 (Junior PM)'}
                                  </div>
                                </div>
                                <button 
                                  onClick={proceedToGame}
                                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-black py-4 px-10 rounded-2xl font-black transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] uppercase tracking-widest text-xs"
                                >
                                  Finalize_Onboarding
                                </button>
                              </motion.div>
                            ) : (
                              <motion.div 
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="text-center"
                              >
                                <div className="w-20 h-20 bg-rose-500 rounded-3xl flex items-center justify-center text-white mx-auto mb-6 shadow-[0_0_30px_rgba(244,63,94,0.4)]">
                                  <X size={40} strokeWidth={3} />
                                </div>
                                <h3 className="text-2xl font-black text-white mb-3 tracking-tight">EVALUATION_FAILED</h3>
                                <p className="text-sm text-slate-400 mb-10 font-medium">面试官认为你的反应速度和产品直觉仍需磨练。</p>
                                <button 
                                  onClick={proceedToGame}
                                  className="w-full bg-white/5 hover:bg-white/10 text-white py-4 px-10 rounded-2xl font-black transition-all border border-white/10 uppercase tracking-widest text-xs"
                                >
                                  Return_To_Simulation_Setup
                                </button>
                              </motion.div>
                            )}
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-600 italic font-mono tracking-wider">
                        // HINT: {userProfile.gender === 'female' ? "点击两个相同的图标进行消除。" : "使用 A/D 或 左右方向键移动，空格键射击。"}
                      </p>
                    </div>
                  )}
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-6 py-10">
                  <div className="relative">
                    <Loader2 className="animate-spin text-emerald-500" size={48} />
                    <div className="absolute inset-0 blur-xl bg-emerald-500/20 animate-pulse" />
                  </div>
                  <span className="text-emerald-500/60 font-black tracking-[0.3em] uppercase text-xs animate-pulse">Processing_Interview_Results...</span>
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
              className="glass-panel p-10 md:p-12 rounded-[3rem] border border-white/10 max-w-4xl mx-auto relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
              
              <h2 className="text-3xl font-black mb-10 flex items-center gap-4 text-white uppercase tracking-tight">
                <User className="text-emerald-500" size={32} />
                Profile_Initialization
              </h2>
              
              <div className="space-y-10">
                {/* Name Input */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Subject_Designation</label>
                    <div className="relative group">
                      <input 
                        type="text" 
                        value={userProfile.name}
                        onChange={(e) => setUserProfile({...userProfile, name: e.target.value})}
                        placeholder="ENTER_NAME..."
                        className="w-full bg-white/5 p-4 rounded-2xl border border-white/10 focus:border-emerald-500/50 focus:bg-white/10 outline-none transition-all text-white font-mono placeholder:text-slate-700"
                      />
                      <div className="absolute inset-0 rounded-2xl bg-emerald-500/5 opacity-0 group-focus-within:opacity-100 pointer-events-none transition-opacity blur-xl" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Biological_Marker</label>
                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => setUserProfile({ ...userProfile, gender: 'male' })}
                        className={cn(
                          "p-4 rounded-2xl border transition-all flex items-center justify-center gap-3 group relative overflow-hidden",
                          userProfile.gender === 'male' 
                            ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.1)]" 
                            : "border-white/5 bg-white/5 text-slate-500 hover:border-white/20"
                        )}
                      >
                        <span className="text-xl">👨‍💼</span>
                        <span className="text-xs font-black uppercase tracking-widest">MALE</span>
                        {userProfile.gender === 'male' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500" />}
                      </button>
                      <button 
                        onClick={() => setUserProfile({ ...userProfile, gender: 'female' })}
                        className={cn(
                          "p-4 rounded-2xl border transition-all flex items-center justify-center gap-3 group relative overflow-hidden",
                          userProfile.gender === 'female' 
                            ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.1)]" 
                            : "border-white/5 bg-white/5 text-slate-500 hover:border-white/20"
                        )}
                      >
                        <span className="text-xl">👩‍💼</span>
                        <span className="text-xs font-black uppercase tracking-widest">FEMALE</span>
                        {userProfile.gender === 'female' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Education Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Academic_Tier</label>
                    <div className="flex flex-wrap gap-3">
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
                            "px-5 py-2.5 rounded-xl border text-[10px] font-black transition-all uppercase tracking-widest",
                            userProfile.education === edu 
                              ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)]" 
                              : "border-white/5 bg-white/5 text-slate-500 hover:border-white/20"
                          )}
                        >
                          {edu}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Institution_Rating</label>
                    <div className="flex flex-wrap gap-3">
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
                              "px-5 py-2.5 rounded-xl border text-[10px] font-black transition-all uppercase tracking-widest",
                              userProfile.schoolTier === tier 
                                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)]" 
                                : "border-white/5 bg-white/5 text-slate-500 hover:border-white/20",
                              isDisabled && "opacity-10 cursor-not-allowed grayscale"
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
                <div className="space-y-4">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Experience_Matrix</label>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {['在校大学生', '应届毕业生', '转行小白', '技术转产品', '创业失败者'].map((bg) => (
                      <button
                        key={bg}
                        onClick={() => {
                          const newProfile = { ...userProfile, background: bg };
                          if (bg === '在校大学生') {
                            newProfile.selectedCompanyId = 'campus-intern';
                          } else if (userProfile.selectedCompanyId === 'campus-intern') {
                            newProfile.selectedCompanyId = 'big-tech';
                          }
                          setUserProfile(newProfile);
                        }}
                        className={cn(
                          "p-4 rounded-2xl border text-[10px] font-black transition-all uppercase tracking-widest text-center",
                          userProfile.background === bg 
                            ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)]" 
                            : "border-white/5 bg-white/5 text-slate-500 hover:border-white/20"
                        )}
                      >
                        {bg}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Company Selection */}
                <div className="space-y-4">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Target_Corporation</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {COMPANY_TYPES.map((company) => {
                      const isStudent = userProfile.background === '在校大学生';
                      const isDisabled = (isStudent && company.id !== 'campus-intern') || (!isStudent && company.id === 'campus-intern');
                      
                      return (
                        <button
                          key={company.id}
                          disabled={isDisabled}
                          onClick={() => setUserProfile({...userProfile, selectedCompanyId: company.id})}
                          className={cn(
                            "w-full p-6 rounded-[2rem] border text-left transition-all flex items-start gap-5 relative group overflow-hidden",
                            userProfile.selectedCompanyId === company.id 
                              ? "border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_30px_rgba(16,185,129,0.1)]" 
                              : "border-white/5 bg-white/5 hover:border-white/20",
                            isDisabled && "opacity-20 grayscale cursor-not-allowed"
                          )}
                        >
                          <div className={cn(
                            "p-3 rounded-2xl transition-colors",
                            userProfile.selectedCompanyId === company.id ? "bg-emerald-500 text-black" : "bg-white/5 text-slate-500"
                          )}>
                            <Building2 size={24} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <span className={cn("font-black tracking-tight uppercase text-sm", userProfile.selectedCompanyId === company.id ? "text-white" : "text-slate-400")}>
                                {company.name}
                              </span>
                              <div className="flex items-center gap-2">
                                {isDisabled && (
                                  <span className="text-[8px] text-rose-500 font-black uppercase tracking-widest">RESTRICTED</span>
                                )}
                                <span className={cn(
                                  "text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest border",
                                  company.difficulty === '简单' ? "border-emerald-500/30 text-emerald-500" :
                                  company.difficulty === '普通' ? "border-blue-500/30 text-blue-500" : "border-rose-500/30 text-rose-500"
                                )}>
                                  {company.difficulty}
                                </span>
                              </div>
                            </div>
                            <p className="text-[10px] text-slate-500 leading-relaxed font-medium">{company.description}</p>
                          </div>
                          {userProfile.selectedCompanyId === company.id && (
                            <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 blur-2xl rounded-full" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-6">
                  <button 
                    onClick={startGame}
                    disabled={!userProfile.name}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-600 text-black py-5 rounded-2xl font-black transition-all shadow-[0_0_40px_rgba(16,185,129,0.2)] flex items-center justify-center gap-3 uppercase tracking-[0.3em] text-sm"
                  >
                    Initialize_Career_Simulation
                    <ArrowRight size={20} />
                  </button>
                  {!userProfile.name && (
                    <p className="text-center text-[10px] text-rose-500 mt-4 font-black uppercase tracking-widest animate-pulse">Error: Subject_Designation_Required</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {status === GameStatus.PLAYING && (
            <motion.div 
              key="playing"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-panel rounded-[2.5rem] overflow-hidden flex flex-col h-[85vh] relative"
            >
              {/* Window Title Bar */}
              <div className="bg-white/5 px-6 py-4 flex items-center justify-between border-b border-white/10">
                <div className="flex items-center gap-4">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500/50" />
                    <div className="w-3 h-3 rounded-full bg-amber-500/50" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/50" />
                  </div>
                  <div className="h-4 w-px bg-white/10 mx-2" />
                  <span className="text-[10px] font-black tracking-[0.2em] uppercase text-emerald-500/60">SIMULATION_ACTIVE // {selectedCompany.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-emerald-500/5 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                    <Calendar size={12} className="text-emerald-500" />
                    <span className="text-[10px] font-black text-emerald-500">WEEK {stats.tenureWeeks}</span>
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex bg-white/2 border-b border-white/5">
                {[
                  { id: 'home', label: '工作主页', icon: Home },
                  { id: 'resume', label: '我的简历', icon: FileText },
                  { id: 'dynamics', label: '职场动态', icon: Activity },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setCurrentTab(tab.id as any)}
                    className={cn(
                      "flex items-center gap-2 px-10 py-5 text-xs font-black transition-all relative uppercase tracking-widest",
                      currentTab === tab.id 
                        ? "text-emerald-500 bg-white/5" 
                        : "text-slate-500 hover:text-slate-300 hover:bg-white/2"
                    )}
                  >
                    <tab.icon size={14} />
                    {tab.label}
                    {currentTab === tab.id && (
                      <motion.div 
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                      />
                    )}
                  </button>
                ))}
              </div>

              {/* Main Content Area */}
              <div className="flex-1 overflow-hidden flex flex-col">
                <AnimatePresence mode="wait">
                  {currentTab === 'home' && (
                    <motion.div 
                      key="home-tab"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar"
                    >
                      {loading ? (
                        <div className="h-full flex flex-col items-center justify-center gap-6">
                          <div className="relative">
                            <Loader2 className="animate-spin text-emerald-500" size={48} />
                            <div className="absolute inset-0 blur-xl bg-emerald-500/20 animate-pulse" />
                          </div>
                          <p className="text-emerald-500/60 font-black tracking-[0.3em] uppercase text-xs animate-pulse">Synchronizing_Workplace_Data...</p>
                        </div>
                      ) : (
                        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-10">
                          {/* Left: Tasks */}
                          <div className="lg:col-span-2 space-y-10">
                            {currentScenario ? (
                              <div className="space-y-10">
                                <div className="space-y-6">
                                  <div className="inline-flex items-center gap-3 px-4 py-1.5 bg-emerald-500/10 text-emerald-500 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-emerald-500/20">
                                    <Target size={14} />
                                    CORE_TASK_IDENTIFIED
                                  </div>
                                  <h2 className="text-4xl font-black text-white leading-tight tracking-tight">
                                    {currentScenario.title}
                                  </h2>
                                  <div className="relative group">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-indigo-500/20 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                                    <p className="relative text-xl text-slate-300 leading-relaxed bg-white/5 p-8 rounded-3xl border border-white/10 italic backdrop-blur-sm">
                                      “{currentScenario.description}”
                                    </p>
                                  </div>
                                </div>

                                {feedback && (
                                  <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-2xl flex gap-4 items-start backdrop-blur-sm"
                                  >
                                    <Info className="text-amber-500 shrink-0 mt-0.5" size={20} />
                                    <p className="text-sm text-amber-200/80 leading-relaxed font-medium">{feedback}</p>
                                  </motion.div>
                                )}

                                <div className="space-y-6">
                                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Execute_Decision_Protocol</div>
                                  <div className="grid grid-cols-1 gap-4">
                                    {currentScenario.choices.map((choice, idx) => (
                                      <button
                                        key={idx}
                                        onClick={() => handleChoice(choice)}
                                        className="group relative w-full p-6 text-left bg-white/5 hover:bg-emerald-500/10 border border-white/10 hover:border-emerald-500/40 rounded-2xl transition-all overflow-hidden"
                                      >
                                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                                        <div className="flex items-center justify-between relative z-10">
                                          <span className="text-slate-300 group-hover:text-white font-black transition-colors pr-8 uppercase tracking-wide">
                                            {choice.text}
                                          </span>
                                          <ChevronRight className="text-slate-600 group-hover:text-emerald-500 transition-all group-hover:translate-x-1" size={24} />
                                        </div>
                                      </button>
                                    ))}
                                  </div>

                                  <div className="relative mt-12 mb-8">
                                    <div className="absolute inset-0 flex items-center">
                                      <div className="w-full border-t border-white/5"></div>
                                    </div>
                                    <div className="relative flex justify-center text-[10px] uppercase">
                                      <span className="bg-[#050505] px-6 text-slate-600 font-black tracking-[0.4em]">Alternative_Input_Override</span>
                                    </div>
                                  </div>

                                  <div className="flex gap-3 mt-6">
                                    <div className="flex-1 relative group">
                                      <div className="absolute -inset-0.5 bg-emerald-500/20 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition duration-500"></div>
                                      <input 
                                        type="text" 
                                        value={userInput}
                                        onChange={(e) => setUserInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleDialogueSubmit()}
                                        placeholder="输入你的想法，看看会发生什么..."
                                        className="relative w-full p-5 rounded-2xl bg-white/5 border border-white/10 focus:border-emerald-500/50 outline-none transition-all text-sm text-white placeholder:text-slate-600 font-medium"
                                      />
                                    </div>
                                    <button 
                                      onClick={handleDialogueSubmit}
                                      disabled={!userInput.trim() || evaluating}
                                      className={cn(
                                        "px-8 rounded-2xl font-black transition-all flex items-center gap-2 uppercase tracking-widest text-xs",
                                        userInput.trim() && !evaluating
                                          ? "bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-105 active:scale-95" 
                                          : "bg-white/5 text-slate-600 cursor-not-allowed border border-white/5"
                                      )}
                                    >
                                      {evaluating ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />}
                                      发送
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="h-full flex flex-col items-center justify-center gap-4 opacity-40">
                                <Activity size={48} className="text-slate-600" />
                                <p className="text-slate-500 font-black tracking-[0.2em] uppercase text-xs">No_Active_Tasks_In_Queue</p>
                              </div>
                            )}
                          </div>

                          {/* Right: Actions */}
                          <div className="space-y-8">
                            <div className="bg-white/2 p-8 rounded-[2rem] border border-white/5 space-y-8 backdrop-blur-md">
                              <div className="flex items-center justify-between">
                                <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">Free_Actions</h3>
                                <div className="text-[8px] bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-full font-black border border-emerald-500/20 uppercase tracking-tighter">No_Time_Cost</div>
                              </div>
                              
                              <div className="grid grid-cols-1 gap-4">
                                <ActionButton 
                                  icon={MessageSquare} 
                                  label="找同事闲聊" 
                                  desc="增加喜爱度，可能听到八卦" 
                                  onClick={() => handleAction('chat')}
                                  loading={actionLoading}
                                />
                                <ActionButton 
                                  icon={FileText} 
                                  label="向领导汇报" 
                                  desc="增加认可度，但压力会上升" 
                                  onClick={() => handleAction('report')}
                                  loading={actionLoading}
                                />
                                <ActionButton 
                                  icon={BookOpen} 
                                  label="自我充电" 
                                  desc="提升能力，压力大幅上升" 
                                  onClick={() => handleAction('study')}
                                  loading={actionLoading}
                                />
                                <ActionButton 
                                  icon={Coffee} 
                                  label="摸鱼休息" 
                                  desc="大幅缓解压力，但可能影响进度" 
                                  onClick={() => handleAction('relax')}
                                  loading={actionLoading}
                                />
                              </div>
                            </div>

                            <div className="relative group">
                              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-indigo-500 rounded-[2rem] blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                              <div className="relative bg-white/5 text-white p-8 rounded-[2rem] border border-white/10 space-y-6 backdrop-blur-md">
                                <div className="flex items-center gap-3">
                                  <Trophy size={20} className="text-emerald-500" />
                                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500">Active_Milestone</h3>
                                </div>
                                {milestones.find(m => !m.isCompleted) ? (
                                  <div className="space-y-4">
                                    <p className="text-lg font-black tracking-tight">{milestones.find(m => !m.isCompleted)?.title}</p>
                                    <p className="text-xs text-slate-400 leading-relaxed font-medium">{milestones.find(m => !m.isCompleted)?.description}</p>
                                    <div className="pt-4 border-t border-white/5">
                                      <div className="text-[8px] uppercase font-black text-slate-500 mb-2 tracking-[0.2em]">Success_Criteria</div>
                                      <div className="text-[10px] bg-white/5 p-3 rounded-xl border border-white/5 font-mono text-emerald-500/80">
                                        {milestones.find(m => !m.isCompleted)?.target}
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-sm font-black text-emerald-500 uppercase tracking-widest">All_Objectives_Secured</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {currentTab === 'resume' && (
                    <motion.div 
                      key="resume-tab"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar"
                    >
                      <div className="max-w-4xl mx-auto space-y-12">
                        {/* Profile Header */}
                        <div className="relative group">
                          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-indigo-500/20 rounded-[2.5rem] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                          <div className="relative flex flex-col md:flex-row gap-10 items-start bg-white/5 backdrop-blur-xl p-10 rounded-[2.5rem] border border-white/10 overflow-hidden">
                            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-[100px]" />
                            <div className="w-32 h-32 bg-white/5 rounded-3xl flex items-center justify-center text-6xl font-black shrink-0 shadow-2xl border border-white/10 relative z-10">
                              {userProfile.gender === 'male' ? '👨‍💼' : '👩‍💼'}
                            </div>
                            <div className="space-y-6 flex-1 relative z-10">
                              <div>
                                <h2 className="text-4xl font-black mb-3 tracking-tight text-white">{userProfile.name || 'UNNAMED_OPERATIVE'}</h2>
                                <div className="flex flex-wrap gap-3">
                                  <span className="px-3 py-1 bg-white/5 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] border border-white/10 text-slate-400">{userProfile.background}</span>
                                  <span className="px-3 py-1 bg-white/5 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] border border-white/10 text-slate-400">{userProfile.education} · {userProfile.schoolTier}</span>
                                  <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] border border-emerald-500/20">{selectedCompany.name}</span>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 border-t border-white/5">
                                <div>
                                  <div className="text-[10px] text-slate-500 font-black uppercase mb-2 tracking-[0.2em]">Current_Grade</div>
                                  <div className="text-sm font-black text-emerald-500 font-mono">{stats.stage}</div>
                                </div>
                                <div>
                                  <div className="text-[10px] text-slate-500 font-black uppercase mb-2 tracking-[0.2em]">Tenure_Duration</div>
                                  <div className="text-sm font-black text-white font-mono">{stats.tenureWeeks} WEEKS</div>
                                </div>
                                <div>
                                  <div className="text-[10px] text-slate-500 font-black uppercase mb-2 tracking-[0.2em]">Career_Sync</div>
                                  <div className="text-sm font-black text-white font-mono">{stats.careerProgress}%</div>
                                </div>
                                <div>
                                  <div className="text-[10px] text-slate-500 font-black uppercase mb-2 tracking-[0.2em]">Mental_Stability</div>
                                  <div className={cn(
                                    "text-sm font-black font-mono",
                                    stats.stress > 80 ? "text-rose-500" : stats.stress > 50 ? "text-amber-500" : "text-emerald-500"
                                  )}>
                                    {stats.stress > 80 ? 'CRITICAL' : stats.stress > 50 ? 'UNSTABLE' : 'OPTIMAL'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Milestones Section */}
                        <div className="space-y-8">
                          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] flex items-center gap-3">
                            <Flag size={18} className="text-emerald-500" />
                            Career_Milestones_Log
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {milestones.map((m) => (
                              <div 
                                key={m.id} 
                                className={cn(
                                  "p-6 rounded-3xl border transition-all flex items-start gap-5 relative overflow-hidden group",
                                  m.isCompleted 
                                    ? "bg-emerald-500/5 border-emerald-500/20" 
                                    : "bg-white/2 border-white/5 opacity-40"
                                )}
                              >
                                {m.isCompleted && (
                                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                                )}
                                <div className={cn(
                                  "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-all group-hover:scale-110",
                                  m.isCompleted 
                                    ? "bg-emerald-500 text-black border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]" 
                                    : "bg-white/5 text-slate-600 border-white/5"
                                )}>
                                  {m.isCompleted ? <Check size={24} strokeWidth={3} /> : <Lock size={20} />}
                                </div>
                                <div className="relative z-10">
                                  <div className="flex items-center gap-3 mb-2">
                                    <span className={cn("font-black uppercase tracking-wider", m.isCompleted ? "text-emerald-500" : "text-slate-400")}>{m.title}</span>
                                    {m.isCompleted && <span className="text-[8px] bg-emerald-500/20 text-emerald-500 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter border border-emerald-500/30">Verified</span>}
                                  </div>
                                  <p className="text-xs text-slate-500 leading-relaxed font-medium">{m.description}</p>
                                  {!m.isCompleted && (
                                    <div className="mt-4 text-[9px] font-mono text-slate-600 bg-white/2 p-2 rounded-lg border border-white/5 uppercase tracking-widest">
                                      Req: {m.target}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Detailed Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                          <div className="space-y-8">
                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] flex items-center gap-3">
                              <TrendingUp size={18} className="text-emerald-500" />
                              Core_Competency_Matrix
                            </h3>
                            <div className="space-y-4">
                              <StatCard icon={Zap} label="产品质量" value={stats.productQuality} color="text-emerald-500" />
                              <StatCard icon={Users} label="团队信任" value={stats.teamTrust} color="text-emerald-500" />
                              <StatCard icon={AlertCircle} label="压力值" value={stats.stress} color="text-rose-500" />
                            </div>
                          </div>
                          <div className="space-y-8">
                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] flex items-center gap-3">
                              <Heart size={18} className="text-emerald-500" />
                              Social_Recognition_Index
                            </h3>
                            <div className="space-y-4">
                              <StatCard icon={Star} label="领导认可度" value={stats.leadershipRecognition} color="text-amber-500" />
                              <StatCard icon={Heart} label="同事喜爱度" value={stats.colleagueLikability} color="text-rose-500" />
                              <div className="bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-sm">
                                <div className="text-[8px] font-black text-slate-500 mb-3 uppercase tracking-[0.2em]">Corp_Evaluation_Summary</div>
                                <p className="text-xs text-slate-400 leading-relaxed italic font-medium">
                                  “{stats.leadershipRecognition > 70 ? '老板眼中的明日之星' : stats.leadershipRecognition > 40 ? '一个靠谱的执行者' : '还需要更多亮眼的产出'}”
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {currentTab === 'dynamics' && (
                    <motion.div 
                      key="dynamics-tab"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar"
                    >
                      <div className="max-w-3xl mx-auto">
                        <div className="flex items-center justify-between mb-10">
                          <h3 className="text-2xl font-black text-white tracking-tight">职场动态</h3>
                          <div className="text-[10px] text-emerald-500/60 font-black uppercase tracking-[0.2em] animate-pulse">Real_Time_Sync_Active</div>
                        </div>

                        <div className="space-y-8">
                          {feed.length > 0 ? feed.map((item) => (
                            <div key={item.id} className="relative pl-10 pb-8 border-l border-white/5 last:pb-0">
                              <div className={cn(
                                "absolute left-0 top-0 -translate-x-1/2 w-10 h-10 rounded-2xl border border-white/10 flex items-center justify-center shadow-2xl backdrop-blur-xl",
                                item.type === 'choice' ? "bg-emerald-500 text-black" : 
                                item.type === 'social' ? "bg-amber-500 text-black" : "bg-white/10 text-white"
                              )}>
                                {item.type === 'choice' ? <Check size={16} strokeWidth={3} /> : 
                                 item.type === 'social' ? <Users size={16} /> : 
                                 item.type === 'chat' ? <MessageSquare size={16} /> : <Search size={16} />}
                              </div>
                              <div className="bg-white/5 p-6 rounded-3xl border border-white/10 hover:bg-white/[0.08] transition-all group backdrop-blur-sm">
                                <div className="flex items-center justify-between mb-3">
                                  <span className={cn(
                                    "text-[10px] font-black uppercase tracking-[0.2em]",
                                    item.type === 'choice' ? "text-emerald-500" : 
                                    item.type === 'social' ? "text-amber-500" : 
                                    item.type === 'chat' ? "text-emerald-400" : "text-rose-400"
                                  )}>
                                    {item.type === 'choice' ? 'Decision_Logged' : 
                                     item.type === 'social' ? 'Social_Intel' : 
                                     item.type === 'chat' ? 'Comm_Channel' : 'Rumor_Intercept'}
                                  </span>
                                  <div className="flex items-center gap-2 text-[10px] text-slate-500 font-black uppercase tracking-widest">
                                    <Clock size={12} className="text-slate-600" />
                                    WEEK {item.week}
                                  </div>
                                </div>
                                <p className="text-sm text-slate-300 leading-relaxed font-medium group-hover:text-white transition-colors">{item.content}</p>
                              </div>
                            </div>
                          )) : (
                            <div className="text-center py-24 opacity-40">
                              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/5">
                                <Activity size={32} className="text-slate-600" />
                              </div>
                              <p className="text-slate-500 font-black tracking-[0.2em] uppercase text-xs">No_Dynamics_Detected</p>
                            </div>
                          )}
                        </div>
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
              className="glass-panel p-12 md:p-20 rounded-[3.5rem] border border-white/10 text-center max-w-2xl mx-auto relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none" />
              
              <div className={cn(
                "w-28 h-28 rounded-[2rem] flex items-center justify-center mx-auto mb-10 border relative z-10",
                status === GameStatus.WIN 
                  ? "bg-emerald-500 text-black border-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.3)]" 
                  : "bg-rose-500 text-white border-rose-400 shadow-[0_0_40px_rgba(244,63,94,0.3)]"
              )}>
                {status === GameStatus.WIN ? (
                  <Trophy size={56} strokeWidth={2.5} />
                ) : (
                  <Skull size={56} strokeWidth={2.5} />
                )}
              </div>
              
              <h2 className="text-5xl font-black mb-6 tracking-tighter text-white uppercase">
                {status === GameStatus.WIN ? "Simulation_Success" : "Simulation_Terminated"}
              </h2>
              
              <div className="relative group mb-12">
                <div className="absolute -inset-1 bg-white/5 rounded-3xl blur opacity-20" />
                <div className="relative bg-white/5 p-8 rounded-3xl border border-white/10 italic text-slate-300 leading-relaxed font-medium text-lg backdrop-blur-sm">
                  “{gameOverReason || (status === GameStatus.WIN ? "你凭借卓越的表现赢得了所有人的尊重。" : "你的职业生涯在此告一段落。")}”
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-12 max-w-md mx-auto">
                <div className="p-6 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm">
                  <div className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] mb-2">Total_Tenure</div>
                  <div className="text-3xl font-black text-white font-mono">{stats.tenureWeeks} <span className="text-xs text-slate-500">WKS</span></div>
                </div>
                <div className="p-6 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm">
                  <div className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] mb-2">Final_Grade</div>
                  <div className="text-xl font-black text-emerald-500 font-mono">{stats.stage}</div>
                </div>
              </div>

              <button 
                onClick={startGame}
                className="group relative bg-emerald-500 hover:bg-emerald-400 text-black px-12 py-5 rounded-2xl font-black transition-all flex items-center gap-3 mx-auto uppercase tracking-[0.2em] text-sm shadow-[0_0_30px_rgba(16,185,129,0.2)]"
              >
                <RefreshCcw size={20} className="group-hover:rotate-180 transition-transform duration-500" />
                Restart_Simulation
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {actionResult && (
            <ResultModal 
              title={actionResult.title}
              message={actionResult.message}
              impact={actionResult.impact}
              onClose={() => setActionResult(null)}
            />
          )}
        </AnimatePresence>

        {/* Footer */}
        <footer className="mt-12 text-center text-slate-400 text-xs">
          <p>© 2024 PM 职业模拟器 | 专为职场新人设计的职业初体验</p>
        </footer>
      </div>
    </div>
  );
}

function ActionButton({ icon: Icon, label, desc, onClick, loading }: { icon: any, label: string, desc: string, onClick: () => void, loading: boolean }) {
  return (
    <button 
      onClick={onClick}
      disabled={loading}
      className="w-full p-5 bg-white/5 hover:bg-emerald-500/10 border border-white/10 hover:border-emerald-500/30 rounded-2xl transition-all text-left group flex items-center gap-5 disabled:opacity-50"
    >
      <div className="w-12 h-12 bg-white/5 group-hover:bg-emerald-500/20 rounded-xl flex items-center justify-center text-slate-500 group-hover:text-emerald-500 transition-all shrink-0 border border-white/5 group-hover:border-emerald-500/30">
        <Icon size={24} />
      </div>
      <div>
        <div className="text-sm font-black text-slate-200 group-hover:text-white transition-colors uppercase tracking-wider">{label}</div>
        <div className="text-[10px] text-slate-500 group-hover:text-emerald-500/60 transition-colors font-mono">{desc}</div>
      </div>
    </button>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any, label: string, value: number, color: string }) {
  return (
    <div className="bg-white/5 p-5 rounded-2xl border border-white/10 flex items-center gap-5 group hover:bg-white/[0.08] transition-colors">
      <div className={cn("w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 transition-all group-hover:scale-110", color)}>
        <Icon size={24} />
      </div>
      <div className="flex-1">
        <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1.5">{label}</div>
        <div className="flex items-center justify-between gap-4">
          <div className="text-2xl font-black text-white font-mono">{value}</div>
          <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${value}%` }}
              className={cn("h-full shadow-[0_0_10px_rgba(0,0,0,0.5)]", color.replace('text-', 'bg-'))}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultModal({ title, message, impact, onClose }: { title: string, message: string, impact: Partial<GameStats>, onClose: () => void }) {
  const statLabels: Record<string, string> = {
    productQuality: '产品质量',
    teamTrust: '团队信任',
    stress: '压力值',
    careerProgress: '职业进度',
    leadershipRecognition: '领导认可',
    colleagueLikability: '同事喜爱'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050505]/80 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="glass-panel w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10 relative"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
        
        <div className="bg-white/5 p-8 text-white flex items-center justify-between border-b border-white/10">
          <h3 className="text-xl font-black tracking-tight uppercase tracking-[0.1em]">{title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-8 space-y-8">
          <div className="bg-white/5 p-6 rounded-2xl border border-white/5 italic text-slate-300 leading-relaxed font-medium relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/30" />
            “{message}”
          </div>
          
          <div className="space-y-4">
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Impact_Analysis</div>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(impact).map(([key, value]) => {
                if (typeof value !== 'number' || value === 0) return null;
                const isPositive = (key === 'stress') ? value < 0 : value > 0;
                return (
                  <div key={key} className={cn(
                    "flex items-center justify-between p-4 rounded-xl border transition-all",
                    isPositive 
                      ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-500" 
                      : "bg-rose-500/5 border-rose-500/20 text-rose-500"
                  )}>
                    <span className="text-[10px] font-black uppercase tracking-wider">{statLabels[key] || key}</span>
                    <span className="text-sm font-black font-mono">
                      {value > 0 ? '+' : ''}{value}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-black py-5 rounded-2xl font-black transition-all shadow-[0_0_30px_rgba(16,185,129,0.2)] uppercase tracking-[0.2em] text-xs"
          >
            Acknowledge_&_Continue
          </button>
        </div>
      </motion.div>
    </div>
  );
}
