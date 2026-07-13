/**
 * 微信登录 / 绑定 API（Mock 实现）
 *
 * 当前返回模拟微信用户数据。
 * 接入真实微信开放平台后，替换 mockWechatUser 中的逻辑。
 */

import type { FastifyInstance } from 'fastify';
import { prisma } from '../services/db.js';
import crypto from 'crypto';

/** Mock 微信登录返回 */
function mockWechatUser(code: string) {
  // 模拟微信 openid 和 unionid
  const hash = crypto.createHash('md5').update(code).digest('hex');
  return {
    openid: `wx_openid_${hash.slice(0, 16)}`,
    unionid: `wx_unionid_${hash.slice(0, 20)}`,
    nickname: `微信用户_${code.slice(-4)}`,
    avatar: `https://mock.avatar/${hash.slice(0, 8)}.png`,
  };
}

export function authRoutes(app: FastifyInstance, _opts: unknown, done: () => void) {
  // POST /v1/auth/wechat/login - 微信登录
  app.post<{ Body: { code: string; app_id?: string } }>('/wechat/login', async (req, reply) => {
    const { code } = req.body;
    if (!code) return reply.status(400).send({ error: 'code required' });

    // Mock 微信用户数据
    const wechatUser = mockWechatUser(code);

    // 查找是否已有绑定用户
    let user = await prisma.user.findUnique({ where: { wechatOpenid: wechatUser.openid } });

    if (!user) {
      // 新用户：创建账户
      const id = `wx_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;

      // 首次登录：微信头像/昵称 → APP 资料
      user = await prisma.user.create({
        data: {
          id,
          nickname: wechatUser.nickname,
          avatar: 'wechat',
          avatarUrl: wechatUser.avatar,
          wechatOpenid: wechatUser.openid,
          wechatUnionid: wechatUser.unionid,
          wechatAvatar: wechatUser.avatar,
          wechatNickname: wechatUser.nickname,
          loginType: 'wechat',
          isGuest: false,
          lastLoginAt: new Date(),
        },
      });

      // 创建 APP 个人资料（首次同步微信信息）
      await prisma.userProfile.create({
        data: {
          userId: id,
          appNickname: wechatUser.nickname,
          appAvatar: 'wechat',
          signature: '',
        },
      }).catch(() => {});
    } else {
      // 已有用户：更新登录时间
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date(), loginType: 'wechat' },
      });
    }

    return reply.send({
      user_id: user.id,
      nickname: user.nickname,
      avatar_url: user.avatarUrl,
      is_new: user.createdAt.toISOString() === user.lastLoginAt?.toISOString(),
      token: `mock_token_${crypto.randomBytes(16).toString('hex')}`,
    });
  });

  // POST /v1/auth/wechat/bind - 微信绑定（游客绑定微信）
  app.post<{ Body: { guest_id: string; code: string } }>('/wechat/bind', async (req, reply) => {
    const { guest_id, code } = req.body;
    if (!guest_id || !code) return reply.status(400).send({ error: 'guest_id and code required' });

    const wechatUser = mockWechatUser(code);

    // 检查微信是否已被绑定
    const existing = await prisma.user.findUnique({ where: { wechatOpenid: wechatUser.openid } });
    if (existing) {
      return reply.status(400).send({ error: '该微信已绑定其他账户' });
    }

    // 绑定微信信息到游客账户
    await prisma.user.update({
      where: { id: guest_id },
      data: {
        wechatOpenid: wechatUser.openid,
        wechatUnionid: wechatUser.unionid,
        wechatAvatar: wechatUser.avatar,
        wechatNickname: wechatUser.nickname,
        avatarUrl: wechatUser.avatar,
        loginType: 'wechat',
        isGuest: false,
        lastLoginAt: new Date(),
      },
    });

    // 创建或更新 APP 资料
    await prisma.userProfile.upsert({
      where: { userId: guest_id },
      update: { appNickname: wechatUser.nickname, appAvatar: 'wechat' },
      create: { userId: guest_id, appNickname: wechatUser.nickname, appAvatar: 'wechat' },
    });

    return reply.send({
      success: true,
      user_id: guest_id,
      nickname: wechatUser.nickname,
      token: `mock_token_${crypto.randomBytes(16).toString('hex')}`,
    });
  });

  done();
}
