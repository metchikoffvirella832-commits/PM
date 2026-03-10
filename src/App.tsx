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
                在这个模拟器中，你将从一名职场新人开始，面对真实的职场抉择。
                你的目标：在不崩溃、不失去团队信任、不做出垃圾产品的前提下，最终晋升为 CPO。
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
                          {userProfile.gender === 'female' 
                            ? "面试官想考察你的逻辑与记忆。请在规定时间内完成‘连连看’挑战，匹配所有相同图标。" 
                            : "面试官想考察你的应变与执行。请操控‘坦克’击毁所有入侵的系统Bug。"}
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
                            <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
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
                            
                            {userProfile.gender === 'female' ? (
                              <div className="grid grid-cols-4 gap-2 p-4 h-full">
                                {linkupGrid.map((tile, i) => (
                                  <motion.button
                                    key={tile.id}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleLinkupClick(i)}
                                    className={cn(
                                      "aspect-square rounded-xl flex items-center justify-center text-2xl transition-all",
                                      tile.cleared ? "bg-emerald-50 opacity-0 pointer-events-none" : 
                                      selectedIndices.includes(i) ? "bg-pink-100 border-2 border-pink-400 shadow-inner scale-110 z-10" : "bg-white border border-slate-200 shadow-sm hover:border-pink-200"
                                    )}
                                  >
                                    {tile.cleared ? '' : tile.type}
                                  </motion.button>
                                ))}
                              </div>
                            ) : (
                              <div className="relative w-full h-full bg-slate-900 overflow-hidden">
                                {/* Tank */}
                                <motion.div 
                                  animate={{ left: `${tankX}%` }}
                                  className="absolute bottom-4 -translate-x-1/2 text-3xl"
                                >
                                  🚜
                                </motion.div>
                                
                                {/* Bullets */}
                                {bullets.map(b => (
                                  <div 
                                    key={b.id}
                                    style={{ left: `${b.x}%`, top: `${b.y}%` }}
                                    className="absolute w-1.5 h-4 bg-yellow-400 rounded-full shadow-[0_0_8px_rgba(250,204,21,0.6)]"
                                  />
                                ))}
                                
                                {/* Enemies */}
                                {enemies.map(e => (
                                  <div 
                                    key={e.id}
                                    style={{ left: `${e.x}%`, top: `${e.y}%` }}
                                    className="absolute -translate-x-1/2 -translate-y-1/2 text-2xl"
                                  >
                                    👾
                                  </div>
                                ))}

                                {/* Mobile Controls */}
                                <div className="absolute bottom-2 right-2 flex gap-2">
                                  <button onClick={() => handleTankMove('left')} className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white border border-white/20">⬅️</button>
                                  <button onClick={() => handleTankMove('right')} className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white border border-white/20">➡️</button>
                                  <button onClick={handleTankShoot} className="w-12 h-12 bg-rose-500 rounded-full flex items-center justify-center text-white shadow-lg">🔥</button>
                                </div>
                              </div>
                            )}
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
                                <p className="text-sm text-slate-500 mb-4">你用实力证明了学历不是唯一的标准。</p>
                                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 mb-6">
                                  <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">入职身份确认</div>
                                  <div className="text-lg font-black text-indigo-700">
                                    {userProfile.background === '在校大学生' ? '产品实习生' : '初级产品经理 (Junior PM)'}
                                  </div>
                                </div>
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
                        * 提示：{userProfile.gender === 'female' ? "点击两个相同的图标进行消除。" : "使用 A/D 或 左右方向键移动，空格键射击。"}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">性别</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => setUserProfile({ ...userProfile, gender: 'male' })}
                        className={cn(
                          "p-3 rounded-xl border transition-all flex items-center justify-center gap-2",
                          userProfile.gender === 'male' ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600"
                        )}
                      >
                        <span>👨‍💼</span>
                        <span className="text-xs font-bold">男士</span>
                      </button>
                      <button 
                        onClick={() => setUserProfile({ ...userProfile, gender: 'female' })}
                        className={cn(
                          "p-3 rounded-xl border transition-all flex items-center justify-center gap-2",
                          userProfile.gender === 'female' ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600"
                        )}
                      >
                        <span>👩‍💼</span>
                        <span className="text-xs font-bold">女士</span>
                      </button>
                    </div>
                  </div>
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
                          } else if (userProfile.selectedCompanyId === 'campus-intern') {
                            newProfile.selectedCompanyId = 'big-tech';
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
                      const isDisabled = (isStudent && company.id !== 'campus-intern') || (!isStudent && company.id === 'campus-intern');
                      
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
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col h-[85vh]"
            >
              {/* Window Title Bar */}
              <div className="bg-slate-900 px-6 py-3 flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-rose-500" />
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  </div>
                  <div className="h-4 w-px bg-slate-700 mx-2" />
                  <span className="text-xs font-bold tracking-widest uppercase opacity-70">PM Workplace v1.0</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">
                    <Calendar size={12} className="text-slate-400" />
                    <span className="text-[10px] font-bold">WEEK {stats.tenureWeeks}</span>
                  </div>
                  <div className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20">
                    {stats.stage}
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex border-b border-slate-100 bg-slate-50/50">
                {[
                  { id: 'home', label: '工作主页', icon: Home },
                  { id: 'resume', label: '我的简历', icon: FileText },
                  { id: 'dynamics', label: '职场动态', icon: Activity },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setCurrentTab(tab.id as any)}
                    className={cn(
                      "flex items-center gap-2 px-8 py-4 text-sm font-bold transition-all relative",
                      currentTab === tab.id 
                        ? "text-indigo-600 bg-white" 
                        : "text-slate-400 hover:text-slate-600 hover:bg-slate-100/50"
                    )}
                  >
                    <tab.icon size={16} />
                    {tab.label}
                    {currentTab === tab.id && (
                      <motion.div 
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"
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
                        <div className="h-full flex flex-col items-center justify-center gap-4">
                          <Loader2 className="animate-spin text-indigo-600" size={40} />
                          <p className="text-slate-500 font-medium animate-pulse">正在同步本周工作任务...</p>
                        </div>
                      ) : (
                        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                          {/* Left: Tasks */}
                          <div className="lg:col-span-2 space-y-8">
                            {currentScenario ? (
                              <div className="space-y-8">
                                <div className="space-y-4">
                                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-bold uppercase tracking-wider border border-indigo-100">
                                    <Target size={12} />
                                    本周核心任务
                                  </div>
                                  <h2 className="text-3xl font-black text-slate-900 leading-tight">
                                    {currentScenario.title}
                                  </h2>
                                  <p className="text-lg text-slate-600 leading-relaxed bg-slate-50 p-6 rounded-2xl border border-slate-100 italic">
                                    “{currentScenario.description}”
                                  </p>
                                </div>

                                {feedback && (
                                  <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex gap-3 items-start"
                                  >
                                    <Info className="text-amber-600 shrink-0 mt-0.5" size={18} />
                                    <p className="text-sm text-amber-800 leading-relaxed font-medium">{feedback}</p>
                                  </motion.div>
                                )}

                                <div className="space-y-4">
                                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">做出你的抉择</div>
                                  <div className="grid grid-cols-1 gap-3">
                                    {currentScenario.choices.map((choice, idx) => (
                                      <button
                                        key={idx}
                                        onClick={() => handleChoice(choice)}
                                        className="group relative w-full p-5 text-left bg-white hover:bg-indigo-600 border border-slate-200 hover:border-indigo-600 rounded-2xl transition-all shadow-sm hover:shadow-xl hover:shadow-indigo-100"
                                      >
                                        <div className="flex items-center justify-between">
                                          <span className="text-slate-700 group-hover:text-white font-bold transition-colors pr-8">
                                            {choice.text}
                                          </span>
                                          <ChevronRight className="text-slate-300 group-hover:text-white transition-colors" size={20} />
                                        </div>
                                      </button>
                                    ))}
                                  </div>

                                  <div className="relative mt-8">
                                    <div className="absolute inset-0 flex items-center">
                                      <div className="w-full border-t border-slate-100"></div>
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                      <span className="bg-white px-4 text-slate-400 font-bold tracking-widest">或者：自定义回复</span>
                                    </div>
                                  </div>

                                  <div className="flex gap-2 mt-4">
                                    <input 
                                      type="text" 
                                      value={userInput}
                                      onChange={(e) => setUserInput(e.target.value)}
                                      onKeyDown={(e) => e.key === 'Enter' && handleDialogueSubmit()}
                                      placeholder="输入你的想法，看看会发生什么..."
                                      className="flex-1 p-4 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm"
                                    />
                                    <button 
                                      onClick={handleDialogueSubmit}
                                      disabled={!userInput.trim() || evaluating}
                                      className={cn(
                                        "px-6 rounded-xl font-bold transition-all flex items-center gap-2",
                                        userInput.trim() && !evaluating
                                          ? "bg-slate-900 text-white shadow-lg" 
                                          : "bg-slate-100 text-slate-400 cursor-not-allowed"
                                      )}
                                    >
                                      {evaluating ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />}
                                      发送
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="h-full flex items-center justify-center">
                                <p className="text-slate-400">暂无任务，请稍后再试。</p>
                              </div>
                            )}
                          </div>

                          {/* Right: Actions */}
                          <div className="space-y-6">
                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-6">
                              <div className="flex items-center justify-between">
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">自由行动</h3>
                                <div className="text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded font-bold">不消耗周数</div>
                              </div>
                              
                              <div className="grid grid-cols-1 gap-3">
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

                            <div className="bg-indigo-600 text-white p-6 rounded-3xl shadow-xl shadow-indigo-100 space-y-4">
                              <div className="flex items-center gap-2">
                                <Trophy size={18} />
                                <h3 className="text-sm font-black uppercase tracking-widest">当前目标</h3>
                              </div>
                              {milestones.find(m => !m.isCompleted) ? (
                                <div className="space-y-2">
                                  <p className="text-sm font-bold">{milestones.find(m => !m.isCompleted)?.title}</p>
                                  <p className="text-xs text-indigo-100 leading-relaxed opacity-80">{milestones.find(m => !m.isCompleted)?.description}</p>
                                  <div className="pt-2">
                                    <div className="text-[10px] uppercase font-black text-indigo-200 mb-1">达成条件</div>
                                    <div className="text-[10px] bg-white/10 p-2 rounded border border-white/10 font-mono">
                                      {milestones.find(m => !m.isCompleted)?.target}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm font-bold">恭喜！你已达成所有目标。</p>
                              )}
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
                      className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar"
                    >
                      <div className="max-w-3xl mx-auto space-y-8">
                        {/* Profile Header */}
                        <div className="flex flex-col md:flex-row gap-8 items-start bg-slate-900 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                          <div className="w-24 h-24 bg-indigo-600 rounded-2xl flex items-center justify-center text-5xl font-black shrink-0 shadow-2xl border-4 border-white/10">
                            {userProfile.gender === 'male' ? '👨‍💼' : '👩‍💼'}
                          </div>
                          <div className="space-y-4 flex-1">
                            <div>
                              <h2 className="text-3xl font-black mb-1">{userProfile.name || '无名产品人'}</h2>
                              <div className="flex flex-wrap gap-2">
                                <span className="px-2 py-0.5 bg-white/10 rounded text-[10px] font-bold uppercase tracking-wider border border-white/5">{userProfile.background}</span>
                                <span className="px-2 py-0.5 bg-white/10 rounded text-[10px] font-bold uppercase tracking-wider border border-white/5">{userProfile.education} · {userProfile.schoolTier}</span>
                                <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded text-[10px] font-bold uppercase tracking-wider border border-indigo-500/30">{selectedCompany.name}</span>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/10">
                              <div>
                                <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">当前职级</div>
                                <div className="text-sm font-bold text-indigo-400">{stats.stage}</div>
                              </div>
                              <div>
                                <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">入职时长</div>
                                <div className="text-sm font-bold">{stats.tenureWeeks} 周</div>
                              </div>
                              <div>
                                <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">职业进度</div>
                                <div className="text-sm font-bold">{stats.careerProgress}%</div>
                              </div>
                              <div>
                                <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">精神状态</div>
                                <div className={cn(
                                  "text-sm font-bold",
                                  stats.stress > 80 ? "text-rose-400" : stats.stress > 50 ? "text-amber-400" : "text-emerald-400"
                                )}>
                                  {stats.stress > 80 ? '极度焦虑' : stats.stress > 50 ? '压力山大' : '心态平稳'}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Milestones Section */}
                        <div className="space-y-6">
                          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Flag size={16} />
                            职业里程碑
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {milestones.map((m) => (
                              <div 
                                key={m.id} 
                                className={cn(
                                  "p-5 rounded-2xl border transition-all flex items-start gap-4",
                                  m.isCompleted 
                                    ? "bg-emerald-50 border-emerald-100" 
                                    : "bg-white border-slate-100 opacity-60"
                                )}
                              >
                                <div className={cn(
                                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                                  m.isCompleted ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"
                                )}>
                                  {m.isCompleted ? <Check size={20} /> : <Lock size={18} />}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={cn("font-bold", m.isCompleted ? "text-emerald-700" : "text-slate-600")}>{m.title}</span>
                                    {m.isCompleted && <span className="text-[10px] bg-emerald-200 text-emerald-700 px-1.5 py-0.5 rounded font-bold">已达成</span>}
                                  </div>
                                  <p className="text-xs text-slate-500 leading-relaxed">{m.description}</p>
                                  {!m.isCompleted && (
                                    <div className="mt-2 text-[10px] font-mono text-slate-400 bg-slate-50 p-1.5 rounded border border-slate-100">
                                      目标: {m.target}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Detailed Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-6">
                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                              <TrendingUp size={16} />
                              核心能力指标
                            </h3>
                            <div className="space-y-4">
                              <StatCard icon={Zap} label="产品质量" value={stats.productQuality} color="text-indigo-600" />
                              <StatCard icon={Users} label="团队信任" value={stats.teamTrust} color="text-emerald-600" />
                              <StatCard icon={AlertCircle} label="压力值" value={stats.stress} color="text-rose-600" />
                            </div>
                          </div>
                          <div className="space-y-6">
                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                              <Heart size={16} />
                              人际与认可
                            </h3>
                            <div className="space-y-4">
                              <StatCard icon={Star} label="领导认可度" value={stats.leadershipRecognition} color="text-amber-600" />
                              <StatCard icon={Heart} label="同事喜爱度" value={stats.colleagueLikability} color="text-rose-500" />
                              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <div className="text-xs font-bold text-slate-500 mb-2">公司评价</div>
                                <p className="text-xs text-slate-400 leading-relaxed italic">
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
                      className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar"
                    >
                      <div className="max-w-2xl mx-auto">
                        <div className="flex items-center justify-between mb-8">
                          <h3 className="text-xl font-black text-slate-900">职场动态</h3>
                          <div className="text-xs text-slate-400 font-bold">实时同步中...</div>
                        </div>

                        <div className="space-y-6">
                          {feed.length > 0 ? feed.map((item) => (
                            <div key={item.id} className="relative pl-8 pb-6 border-l border-slate-100 last:pb-0">
                              <div className={cn(
                                "absolute left-0 top-0 -translate-x-1/2 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center shadow-sm",
                                item.type === 'choice' ? "bg-indigo-600 text-white" : 
                                item.type === 'social' ? "bg-amber-500 text-white" : "bg-slate-900 text-white"
                              )}>
                                {item.type === 'choice' ? <Check size={12} /> : 
                                 item.type === 'social' ? <Users size={12} /> : 
                                 item.type === 'chat' ? <MessageSquare size={12} /> : <Search size={12} />}
                              </div>
                              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between mb-2">
                                  <span className={cn(
                                    "text-[10px] font-black uppercase tracking-widest",
                                    item.type === 'choice' ? "text-indigo-600" : 
                                    item.type === 'social' ? "text-amber-600" : 
                                    item.type === 'chat' ? "text-emerald-600" : "text-rose-500"
                                  )}>
                                    {item.type === 'choice' ? '我的决策' : 
                                     item.type === 'social' ? '职场见闻' : 
                                     item.type === 'chat' ? '群聊通知' : '小道消息'}
                                  </span>
                                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold">
                                    <Clock size={10} />
                                    第 {item.week} 周
                                  </div>
                                </div>
                                <p className="text-sm text-slate-700 leading-relaxed">{item.content}</p>
                              </div>
                            </div>
                          )) : (
                            <div className="text-center py-20">
                              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Activity size={24} className="text-slate-300" />
                              </div>
                              <p className="text-slate-400 text-sm">暂无动态，开始工作以产生记录。</p>
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
              
              <h2 className="text-4xl font-black mb-4">
                {status === GameStatus.WIN ? "职业巅峰！" : "职业终局"}
              </h2>
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-8 max-w-lg mx-auto italic text-slate-600 leading-relaxed">
                “{gameOverReason || (status === GameStatus.WIN ? "你凭借卓越的表现赢得了所有人的尊重。" : "你的职业生涯在此告一段落。")}”
              </div>

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
      className="w-full p-4 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-2xl transition-all text-left group flex items-center gap-4 disabled:opacity-50"
    >
      <div className="w-10 h-10 bg-slate-50 group-hover:bg-white rounded-xl flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0">
        <Icon size={20} />
      </div>
      <div>
        <div className="text-sm font-bold text-slate-700 group-hover:text-indigo-700 transition-colors">{label}</div>
        <div className="text-[10px] text-slate-400 group-hover:text-indigo-400 transition-colors">{desc}</div>
      </div>
    </button>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any, label: string, value: number, color: string }) {
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
      <div className={cn("w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center", color)}>
        <Icon size={20} />
      </div>
      <div className="flex-1">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</div>
        <div className="flex items-center justify-between">
          <div className="text-lg font-black text-slate-800">{value}</div>
          <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${value}%` }}
              className={cn("h-full", color.replace('text-', 'bg-'))}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200"
      >
        <div className="bg-slate-900 p-6 text-white flex items-center justify-between">
          <h3 className="text-xl font-black tracking-tight">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-8 space-y-8">
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 italic text-slate-600 leading-relaxed">
            “{message}”
          </div>
          
          <div className="space-y-4">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">属性变动</div>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(impact).map(([key, value]) => {
                if (typeof value !== 'number' || value === 0) return null;
                const isPositive = (key === 'stress') ? value < 0 : value > 0;
                return (
                  <div key={key} className={cn(
                    "flex items-center justify-between p-3 rounded-xl border",
                    isPositive ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100"
                  )}>
                    <span className="text-xs font-bold text-slate-600">{statLabels[key] || key}</span>
                    <span className={cn(
                      "text-sm font-black",
                      isPositive ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {value > 0 ? '+' : ''}{value}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-slate-200"
          >
            收到，继续工作
          </button>
        </div>
      </motion.div>
    </div>
  );
}
