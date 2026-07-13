/**
 * 种子脚本：创建 100 名测试用户及其运动记录
 * 运行：npx tsx prisma/seed.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

function pickKm(): number {
  const r = Math.random();
  if (r < 0.1) return Math.round((300 + Math.random() * 1200) * 100) / 100;
  if (r < 0.4) return Math.round((100 + Math.random() * 200) * 100) / 100;
  return Math.round((5 + Math.random() * 95) * 100) / 100;
}

async function seed() {
  console.log('🌱 Seeding 100 test users...');

  for (let i = 0; i < 100; i++) {
    const userId = `seed_u_${String(i + 1).padStart(3, '0')}`;
    const totalKm = pickKm();

    // 创建用户
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        nickname: NICKNAMES[i] || `跑者${i + 1}`,
        avatar: ['🏃', '🏃‍♂️', '🏃‍♀️', '🚶', '🚴'][i % 5],
        isGuest: true,
      },
    });

    // 创建多条跑步记录
    const recordCount = Math.max(1, Math.floor(Math.random() * 10) + 2);
    let cumulativeKm = 0;

    for (let j = 0; j < recordCount; j++) {
      const isLast = j === recordCount - 1;
      const dist = isLast
        ? Math.round((totalKm - cumulativeKm) * 100) / 100
        : Math.round((Math.random() * (totalKm - cumulativeKm) * 0.3 + 1) * 100) / 100;

      if (dist <= 0) break;
      cumulativeKm += dist;

      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 30));
      const pace = 4.5 + Math.random() * 3;

      await prisma.activity.create({
        data: {
          id: `seed_${userId}_${j}`,
          userId,
          source: ['manual', 'apple_health', 'huawei_health', 'garmin'][Math.floor(Math.random() * 4)],
          distanceKm: dist,
          durationSec: Math.round(dist * pace * 60),
          paceSec: Math.round(pace * 60),
          calories: Math.round(dist * 60),
          startTime: date,
          note: `种子数据 #${j + 1}`,
        },
      }).catch(() => {
        // ignore duplicates
      });
    }

    if ((i + 1) % 10 === 0) {
      console.log(`  ✅ ${i + 1}/100 users created`);
    }
  }

  // 验证
  const userCount = await prisma.user.count();
  const activityCount = await prisma.activity.count();
  const totalKm = await prisma.activity.aggregate({ _sum: { distanceKm: true } });

  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('  ✅ 种子数据创建完成');
  console.log('═══════════════════════════════════════');
  console.log(`  用户数: ${userCount}`);
  console.log(`  运动记录: ${activityCount}`);
  console.log(`  全民累计: ${Math.round((totalKm._sum.distanceKm || 0) * 100) / 100} km`);
  console.log('═══════════════════════════════════════');

  await prisma.$disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
