// 管理端：邀请码 / 成员审批 / 活动审核与删除
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import { recomputeProgress, getCurrentRouteVersion } from '../services/progress.js';

const reviewSchema = z.object({ action: z.enum(['approve', 'reject']), note: z.string().max(200).optional() });
const inviteSchema = z.object({ note: z.string().max(100).optional(), maxUses: z.number().int().min(1).max(1000).default(1), expiresAt: z.string().datetime().optional() });

export async function adminRoutes(app: FastifyInstance) {
  // 平台接入状态推进：仅允许管理员凭真实事件（如官方凭据获批、沙箱连通）推进，全部留痕
  const STAGES = ['adapter_not_started', 'adapter_implemented', 'mock_verified', 'sandbox_connected', 'production_credentials_ready', 'production_connected', 'pilot_verified', 'generally_available'];
  const markSchema = z.object({
    stage: z.enum(STAGES as [string, ...string[]]),
    note: z.string().min(4).max(500),
    credentialStatus: z.string().max(40).optional(),
    sandboxStatus: z.string().max(40).optional(),
    productionStatus: z.string().max(40).optional(),
  });
  app.post('/integrations/:provider/mark', async (req, reply) => {
    const { provider } = req.params as { provider: string };
    const parsed = markSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'BAD_REQUEST', message: '参数错误（stage/note 必填）' });
    const { stage, note, credentialStatus, sandboxStatus, productionStatus } = parsed.data;
    const row = await app.prisma.integrationState.upsert({
      where: { provider },
      create: { provider, stage, note, credentialStatus: credentialStatus ?? 'not_applied', sandboxStatus: sandboxStatus ?? 'not_connected', productionStatus: productionStatus ?? 'not_connected', updatedBy: req.user.sub },
      update: { stage, note, ...(credentialStatus ? { credentialStatus } : {}), ...(sandboxStatus ? { sandboxStatus } : {}), ...(productionStatus ? { productionStatus } : {}), updatedBy: req.user.sub },
    });
    await app.prisma.auditLog.create({ data: { actorId: req.user.sub, action: 'PROVIDER_SYNCED', targetId: row.provider, detail: `integration-stage→${stage}: ${note.slice(0, 80)}` } });
    return { ok: true, state: row };
  });

  app.addHook('preHandler', app.requireAdmin);

  app.post('/invites', async (req, reply) => {
    const parsed = inviteSchema.safeParse(req.body ?? {});
    if (!parsed.success) return reply.code(400).send({ error: 'BAD_REQUEST', message: '参数错误' });
    const code = 'E23-' + randomBytes(4).toString('hex').toUpperCase();
    const inv = await app.prisma.inviteCode.create({
      data: { code, note: parsed.data.note, maxUses: parsed.data.maxUses, expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null, createdBy: req.user.sub },
    });
    await app.prisma.auditLog.create({ data: { actorId: req.user.sub, action: 'INVITE_CREATED', targetId: inv.id, detail: code } });
    return reply.code(201).send({ invite: inv });
  });

  app.get('/members', async (req) => {
    const { status } = req.query as { status?: string };
    const where = status && ['pending', 'approved', 'rejected'].includes(status) ? { status: status as 'pending' | 'approved' | 'rejected' } : {};
    const members = await app.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: { id: true, phone: true, nickname: true, role: true, status: true, createdAt: true },
    });
    return { members: members.map((m) => ({ ...m, phone: m.phone.slice(0, 3) + '****' + m.phone.slice(-4) })) };
  });

  app.post('/members/:id/review', async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = reviewSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'BAD_REQUEST', message: '参数错误' });
    const target = await app.prisma.user.findUnique({ where: { id } });
    if (!target) return reply.code(404).send({ error: 'NOT_FOUND', message: '用户不存在' });
    if (target.role === 'admin') return reply.code(400).send({ error: 'BAD_REQUEST', message: '不能审批管理员' });

    const newStatus = parsed.data.action === 'approve' ? 'approved' : 'rejected';
    const updated = await app.prisma.user.update({ where: { id }, data: { status: newStatus } });
    await app.prisma.auditLog.create({
      data: { actorId: req.user.sub, action: newStatus === 'approved' ? 'USER_APPROVED' : 'USER_REJECTED', targetId: id, detail: parsed.data.note },
    });

    // 审批通过后：该用户已有 valid 活动纳入全班汇总，重算一次班级进度
    if (newStatus === 'approved') {
      const rv = await getCurrentRouteVersion(app.prisma);
      if (rv) await recomputeProgress(app.prisma, rv.id);
    }
    return { member: { id: updated.id, status: updated.status } };
  });

  // 待审核活动队列
  app.get('/activities', async (req) => {
    const { status } = req.query as { status?: string };
    const st = status && ['pending', 'valid', 'rejected'].includes(status) ? status : 'pending';
    const list = await app.prisma.activity.findMany({
      where: { status: st as 'pending' | 'valid' | 'rejected' },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { user: { select: { nickname: true } }, evidence: true },
    });
    return {
      activities: list.map((a) => ({
        id: a.id,
        userId: a.userId,
        nickname: a.user.nickname,
        source: a.source,
        status: a.status,
        distanceM: a.distanceM,
        durationSec: a.durationSec,
        avgPaceSec: a.avgPaceSec,
        startedAt: a.startedAt.toISOString(),
        rejectReason: a.rejectReason,
        evidence: a.evidence ? { note: a.evidence.note, imageUrl: a.evidence.imageUrl } : null,
      })),
    };
  });

  // 审核活动：approve → valid 并重算；reject → rejected 并重算
  app.post('/activities/:id/review', async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = reviewSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'BAD_REQUEST', message: '参数错误' });
    const a = await app.prisma.activity.findUnique({ where: { id } });
    if (!a) return reply.code(404).send({ error: 'NOT_FOUND', message: '活动不存在' });

    const newStatus = parsed.data.action === 'approve' ? 'valid' : 'rejected';
    await app.prisma.activity.update({
      where: { id },
      data: { status: newStatus, rejectReason: newStatus === 'rejected' ? parsed.data.note ?? '管理员驳回' : null },
    });
    await app.prisma.auditLog.create({
      data: { actorId: req.user.sub, action: newStatus === 'valid' ? 'ACTIVITY_VALIDATED' : 'ACTIVITY_REJECTED', targetId: id, detail: parsed.data.note },
    });
    const rv = await getCurrentRouteVersion(app.prisma);
    if (rv) await recomputeProgress(app.prisma, rv.id, a.userId);
    return { activity: { id, status: newStatus } };
  });

  app.delete('/activities/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const a = await app.prisma.activity.findUnique({ where: { id } });
    if (!a) return reply.code(404).send({ error: 'NOT_FOUND', message: '活动不存在' });
    await app.prisma.activity.delete({ where: { id } });
    await app.prisma.auditLog.create({ data: { actorId: req.user.sub, action: 'ACTIVITY_DELETED', targetId: id, detail: `dist=${a.distanceM}` } });
    const rv = await getCurrentRouteVersion(app.prisma);
    if (rv) await recomputeProgress(app.prisma, rv.id, a.userId);
    return { deleted: true };
  });
}
