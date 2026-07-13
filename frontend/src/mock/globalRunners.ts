/**
 * 全民跑者模拟数据
 *
 * 生成 100 名跑者，每人有真实 runRecords 列表。
 * 所有统计数据均由 runRecords 累加得出，
 * 保证 100 人跑量总和 = 全民累计公里。
 */

import type { UserSummary, GlobalRunRecord, RunSource } from '../types/global';

const NICKNAMES = [
  '跑步狂人', '风行者', '晨跑达人', '夜跑者', '马拉松王子',
  '慢跑爱好者', '健步如飞', '城市猎人', '山海奔跑', '自由跑者',
  '追风少年', '跑者无疆', '步频大师', '心率控', '配速高手',
  '北国风光', '南国椰风', '西域行者', '东海踏浪', '中原跑王',
  '山城跑者', '江城浪子', '蓉城漫步', '春城飞花', '泉城跑客',
  '冰城跑者', '江城跑者', '鹏城飞人', '羊城跑手', '魔都跑神',
  '苏州跑者', '徽州跑客', '赣江跑手', '湘江跑者', '滇池跑客',
  '长安跑者', '洛阳跑手', '汴梁跑将', '燕京跑者', '津门跑者',
  '天府跑者', '雾都跑手', '筑城跑客', '邕城跑者', '榕城跑手',
  '鹿城跑者', '鸢都跑客', '彭城跑手', '兰陵跑将', '姑苏跑者',
  '雨花跑者', '钟山跑客', '玄武跑手', '秦淮跑者', '栖霞跑客',
  '钱塘跑者', '西湖跑手', '富春跑客', '剡溪跑将', '会稽跑者',
  '蓬莱跑者', '芝罘跑客', '威海跑手', '日照跑者', '沂蒙跑客',
  '晋阳跑者', '大同跑手', '平遥跑客', '太行跑将', '汾河跑者',
  '凉州跑者', '甘州跑手', '肃州跑客', '瓜州跑将', '沙州跑者',
  '伊犁跑者', '塔城跑手', '阿勒泰跑', '巴州跑客', '龟兹跑将',
  '日光跑者', '月光跑手', '星光跑客', '云海跑将', '天际跑者',
  '乐跑一族', '酷跑达人', '跑团团长', '越野跑者', '路跑先锋',
  '山地跑者', '公路跑手', '跑道跑客', '跑吧跑将', '跑协跑者',
  '随风奔跑', '踏雪寻梅', '追梦跑者', '跑出未来', '健康跑者',
];

const AVATARS = ['🏃', '🏃‍♂️', '🏃‍♀️', '🚶', '🚴', '🧑‍🤝‍🧑', '👨‍👩‍👧', '🧘', '🤸', '⛷️'];
const SOURCES: RunSource[] = ['manual', 'apple_watch', 'garmin', 'huawei_health', 'keep'];

function pickSource(): RunSource {
  const weights = [30, 25, 20, 15, 10];
  const r = Math.random() * 100;
  let cum = 0;
  for (let i = 0; i < SOURCES.length; i++) {
    cum += weights[i];
    if (r <= cum) return SOURCES[i];
  }
  return 'manual';
}

/** 根据层级生成总跑量 */
function pickTotalRunKm(): number {
  const r = Math.random();
  if (r < 0.1) return 300 + Math.random() * 1200;   // top 10%
  if (r < 0.4) return 100 + Math.random() * 200;    // mid 30%
  return 5 + Math.random() * 95;                     // bottom 60%
}

/** 将总跑量拆分为多条跑步记录 */
function splitIntoRecords(totalKm: number, source: RunSource): GlobalRunRecord[] {
  const records: GlobalRunRecord[] = [];
  const count = Math.max(1, Math.floor(Math.random() * 15) + 3); // 3-17 条记录
  const avgDist = totalKm / count;
  const today = new Date();

  let remaining = totalKm;
  for (let i = 0; i < count; i++) {
    const isLast = i === count - 1;
    const dist = isLast
      ? Math.round(remaining * 100) / 100
      : Math.round((avgDist * (0.5 + Math.random())) * 100) / 100;

    const clampedDist = Math.max(0.5, Math.min(dist, remaining));
    remaining -= clampedDist;

    const date = new Date(today);
    date.setDate(date.getDate() - Math.floor(Math.random() * 30));
    const pace = 4.5 + Math.random() * 3; // 4.5'~7.5'/km

    records.push({
      date: date.toISOString().slice(0, 10),
      distanceKm: clampedDist,
      durationMin: Math.round(clampedDist * pace),
      source,
    });
  }

  return records;
}

const CITIES = [
  '深圳', '厦门', '福州', '温州', '宁波', '上海', '南京', '武汉',
  '郑州', '西安', '天津', '北京', '沈阳', '长春', '哈尔滨', '齐齐哈尔',
  '呼伦贝尔', '满洲里', '锡林浩特', '呼和浩特', '包头', '银川', '兰州',
  '西宁', '张掖', '敦煌', '哈密', '乌鲁木齐', '库尔勒', '阿克苏',
  '喀什', '叶城', '阿里（狮泉河）', '日喀则', '拉萨', '林芝',
  '香格里拉', '丽江', '大理', '昆明', '贵阳', '桂林', '南宁',
  '北海', '海口', '三亚', '湛江', '广州',
];

const CITY_DISTANCES = [
  0, 570, 830, 1150, 1410, 1630, 1930, 2470, 2980, 3460, 4600, 4730,
  5414, 5680, 5963, 6263, 6763, 6963, 7993, 8643, 8823, 9373, 9813,
  10033, 10373, 10983, 11403, 12003, 12483, 13033, 13503, 13763, 14863,
  15963, 16233, 16633, 17633, 17813, 17993, 18323, 18833, 19233, 19623,
  19853, 20103, 20403, 20863, 21283,
];

function locateCity(virtualKm: number): string {
  if (virtualKm <= 0) return '深圳';
  for (let i = CITY_DISTANCES.length - 1; i >= 0; i--) {
    if (virtualKm >= CITY_DISTANCES[i]) return CITIES[i] || '广州';
  }
  return '深圳';
}

/** 生成 100 名模拟跑者（每人含 runRecords） */
export function generateMockRunners(): UserSummary[] {
  const runners: UserSummary[] = [];

  for (let i = 0; i < 100; i++) {
    const totalRunKm = pickTotalRunKm();
    const source = pickSource();
    const records = splitIntoRecords(totalRunKm, source);

    // 从 records 重新计算总量（校验）
    const computedTotal = records.reduce((s, r) => s + r.distanceKm, 0);
    const virtualKm = computedTotal * 10;
    const completionRate = Math.min(100, (virtualKm / 21423) * 100);
    const lastDate = records.reduce((latest, r) => r.date > latest ? r.date : latest, '');

    runners.push({
      id: `mock_u_${i + 1}`,
      nickname: NICKNAMES[i] || `跑者${i + 1}`,
      avatar: AVATARS[i % AVATARS.length],
      runRecords: records,
      totalRunKm: Math.round(computedTotal * 100) / 100,
      virtualKm: Math.round(virtualKm),
      currentCity: locateCity(virtualKm),
      completionRate: Math.round(completionRate * 100) / 100,
      source,
      lastRunDate: lastDate,
    });
  }

  // 按跑量降序排列
  runners.sort((a, b) => b.totalRunKm - a.totalRunKm);

  return runners;
}
