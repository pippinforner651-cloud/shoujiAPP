// 汇总重算：route_progress 是唯一事实源，只统计 status=valid 的活动
import type { PrismaClient } from '@prisma/client';
import { CONFIG } from '../config.js';

/**
 * 重算某条路线版本下的进度。
 * userId 传入时重算该用户个人进度；同时总是重算班级汇总（CLASS_SENTINEL 行）。
 */
export async function recomputeProgress(
  prisma: PrismaClient,
  routeVersionId: string,
  userId?: string,
): Promise<void> {
  const targets: string[] = userId ? [userId, CONFIG.CLASS_SENTINEL] : [CONFIG.CLASS_SENTINEL];

  for (const uid of targets) {
    const where =
      uid === CONFIG.CLASS_SENTINEL
        ? { status: 'valid' as const, user: { status: 'approved' as const } }
        : { status: 'valid' as const, userId: uid };

    const agg = await prisma.activity.aggregate({
      where,
      _sum: { distanceM: true },
      _count: { _all: true },
      _max: { startedAt: true },
    });

    const totalM = agg._sum.distanceM ?? 0;
    const count = agg._count._all;
    const lastAt = agg._max.startedAt ?? null;

    await prisma.routeProgress.upsert({
      where: { routeVersionId_userId: { routeVersionId, userId: uid } },
      create: { routeVersionId, userId: uid, totalM, activityCount: count, lastActivityAt: lastAt },
      update: { totalM, activityCount: count, lastActivityAt: lastAt, recomputedAt: new Date() },
    });
  }

  await prisma.auditLog.create({
    data: {
      action: 'PROGRESS_RECOMPUTED',
      targetId: routeVersionId,
      detail: userId ? `user=${userId} + class` : 'class only',
    },
  });
}

/** 取当前生效的路线版本（优先 RELEASED，否则最新 DRAFT） */
export async function getCurrentRouteVersion(prisma: PrismaClient) {
  const released = await prisma.routeVersion.findFirst({
    where: { status: 'RELEASED' },
    orderBy: { createdAt: 'desc' },
  });
  if (released) return released;
  return prisma.routeVersion.findFirst({ orderBy: { createdAt: 'desc' } });
}
