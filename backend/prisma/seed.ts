// 种子数据：路线版本 + 管理员 + 初始邀请码（不含任何伪造运动数据）
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // 路线版本与前端 src/data/route.ts 冻结数据一致
  const rv = await prisma.routeVersion.upsert({
    where: { packId_version: { packId: 'china-border-loop-v2', version: '2.2.0' } },
    create: {
      packId: 'china-border-loop-v2',
      version: '2.2.0',
      status: 'DRAFT',
      totalKm: 27171,
      nodeCount: 176,
      checksum: 'fnv1a-见前端路线校验报告',
    },
    update: {},
  });
  console.log('routeVersion:', rv.packId, rv.version, rv.status);

  const adminPhone = process.env.SEED_ADMIN_PHONE ?? '13800000001';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'admin123456';
  const existing = await prisma.user.findUnique({ where: { phone: adminPhone } });
  if (!existing) {
    const admin = await prisma.user.create({
      data: {
        phone: adminPhone,
        nickname: 'E23管理员',
        passwordHash: await bcrypt.hash(adminPassword, 10),
        role: 'admin',
        status: 'approved',
      },
    });
    console.log('admin created:', admin.phone);
  } else {
    console.log('admin exists:', adminPhone);
  }

  const code = process.env.SEED_INVITE_CODE ?? 'E23-GOBI2026';
  const inv = await prisma.inviteCode.findUnique({ where: { code } });
  if (!inv) {
    await prisma.inviteCode.create({ data: { code, note: 'E23班初始邀请码', maxUses: 200 } });
    console.log('invite created:', code);
  } else {
    console.log('invite exists:', code);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
