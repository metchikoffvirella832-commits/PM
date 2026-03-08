import { Scenario, GameStats, CompanyType } from './types';

export const COMPANY_TYPES: CompanyType[] = [
  {
    id: 'big-tech',
    name: '互联网大厂 (如：鹅厂、猪厂)',
    description: '流程规范，资源丰富，但内部竞争激烈，会议繁多。适合想学习标准流程的同学。',
    cultureTrait: 'OKR导向、赛马机制、跨部门对齐、PPT文化',
    initialStats: { productQuality: 60, teamTrust: 40, stress: 30, careerProgress: 10 },
    difficulty: '普通'
  },
  {
    id: 'startup',
    name: '初创公司 (A轮/B轮)',
    description: '节奏极快，一个人当三个人用。虽然混乱，但你能参与从0到1的每一个环节。',
    cultureTrait: '快速迭代、全能战士、生存压力、扁平化',
    initialStats: { productQuality: 30, teamTrust: 60, stress: 50, careerProgress: 20 },
    difficulty: '困难'
  },
  {
    id: 'traditional',
    name: '传统行业数字化部门',
    description: '节奏较慢，但需要面对复杂的线下业务和对互联网不甚了解的同事。',
    cultureTrait: '业务驱动、线下逻辑、沟通成本高、数字化转型',
    initialStats: { productQuality: 40, teamTrust: 30, stress: 10, careerProgress: 5 },
    difficulty: '简单'
  },
  {
    id: 'agency',
    name: '外包/项目制公司',
    description: '同时处理多个客户需求，锻炼极强的沟通和交付能力，但很难对产品有深度思考。',
    cultureTrait: '交付至上、客户是上帝、多线程操作、成本控制',
    initialStats: { productQuality: 20, teamTrust: 40, stress: 40, careerProgress: 15 },
    difficulty: '普通'
  },
  {
    id: 'campus-intern',
    name: '校园项目/暑期实习',
    description: '在校期间的职场初体验。需要平衡学业与工作，面对转正压力，同时处理导师布置的各种“杂活”。',
    cultureTrait: '学业平衡、导师带教、转正挑战、为爱发电',
    initialStats: { productQuality: 30, teamTrust: 50, stress: 15, careerProgress: 0 },
    difficulty: '简单'
  }
];

export const INITIAL_SCENARIOS: Scenario[] = [
  {
    id: '1',
    title: '入职第一天的“惊喜”',
    description: '你刚坐到工位上，还没来得及领电脑，你的直属领导就急匆匆走过来：“那个，${name}，正好有个紧急的需求评审会，你先去旁听一下，顺便做个会议纪要。”',
    choices: [
      {
        text: '立刻答应，拿出笔记本认真记录每一个细节。',
        impact: { stress: 10, careerProgress: 5, teamTrust: 5 },
        feedback: '虽然听得云里雾里，但你认真的态度让领导觉得你很靠谱。'
      },
      {
        text: '礼貌询问是否有相关的背景文档可以先快速浏览。',
        impact: { careerProgress: 10, productQuality: 5 },
        feedback: '领导愣了一下，随后赞许地看了你一眼，发给你一份50页的PRD。'
      },
      {
        text: '表现出为难，表示自己还没配置好办公环境。',
        impact: { stress: -5, careerProgress: -10, teamTrust: -5 },
        feedback: '领导皱了皱眉：“那你先找IT吧。”第一印象分似乎打了个折扣。'
      }
    ]
  }
];

export const INITIAL_STATS: GameStats = {
  productQuality: 50,
  teamTrust: 50,
  stress: 10,
  careerProgress: 0,
  tenureWeeks: 0,
  stage: '实习生',
};
