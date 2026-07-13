/**
 * 分享卡片 Canvas 渲染工具
 *
 * 使用 Canvas 2D 生成分享图片。
 * 卡片尺寸：360×540（适合手机竖屏分享）
 */

import type { ShareCardTheme } from './types';

/** 绘制圆角矩形 */
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/** 格式化数字 */
function fmt(n: number): string {
  if (n >= 100000) return (n / 10000).toFixed(0) + '万';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return n.toFixed(0);
}

/**
 * 渲染个人分享卡片
 * @returns Canvas 元素的 DataURL
 */
export function renderPersonalShareCard(params: {
  nickname: string;
  avatar: string;
  currentCity: string;
  roadName: string;
  totalRunKm: number;
  completionPct: number;
  totalVirtualKm: number;
  rank: number;
}): Promise<string> {
  const { nickname, avatar, currentCity, roadName, totalRunKm, completionPct, rank } = params;
  const theme: ShareCardTheme = {
    bgColor: '#0f2027', headerColor: '#ffd54f', accentColor: '#4fc3f7',
    textColor: '#ffffff', mutedColor: 'rgba(255,255,255,0.5)', barColor: '#ffd54f',
  };

  const W = 360, H = 540;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // 背景
  ctx.fillStyle = theme.bgColor;
  roundRect(ctx, 0, 0, W, H, 16);
  ctx.fill();

  // 边框
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1;
  roundRect(ctx, 0, 0, W, H, 16);
  ctx.stroke();

  // === 顶部标题 ===
  ctx.fillStyle = theme.headerColor;
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🏃 我的环游旅程', W / 2, 50);

  // === 分隔线 ===
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.moveTo(30, 70);
  ctx.lineTo(W - 30, 70);
  ctx.stroke();

  // === 头像 + 昵称 ===
  ctx.fillStyle = theme.textColor;
  ctx.font = '40px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(avatar, W / 2, 130);

  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(nickname, W / 2, 165);

  // === 当前信息 ===
  ctx.font = '14px sans-serif';
  ctx.fillStyle = theme.accentColor;
  ctx.fillText(`📍 ${currentCity}`, W / 2, 200);

  ctx.font = '12px sans-serif';
  ctx.fillStyle = theme.mutedColor;
  ctx.fillText(`🛣️ ${roadName || '真实道路'}`, W / 2, 222);

  // === 分隔线 ===
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.moveTo(30, 240);
  ctx.lineTo(W - 30, 240);
  ctx.stroke();

  // === 数据行 ===
  const dataY = 270;
  ctx.textAlign = 'center';

  // 累计跑量
  ctx.fillStyle = theme.mutedColor;
  ctx.font = '11px sans-serif';
  ctx.fillText('累计跑量', 90, dataY);
  ctx.fillStyle = theme.textColor;
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(`${totalRunKm.toFixed(0)}`, 90, dataY + 28);
  ctx.fillStyle = theme.mutedColor;
  ctx.font = '10px sans-serif';
  ctx.fillText('km', 90, dataY + 44);

  // 完成比例
  ctx.fillStyle = theme.mutedColor;
  ctx.font = '11px sans-serif';
  ctx.fillText('完成进度', W / 2, dataY);
  ctx.fillStyle = theme.headerColor;
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(`${completionPct.toFixed(1)}%`, W / 2, dataY + 28);

  // 排名
  ctx.fillStyle = theme.mutedColor;
  ctx.font = '11px sans-serif';
  ctx.fillText('排名', 270, dataY);
  ctx.fillStyle = theme.textColor;
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(`#${rank}`, 270, dataY + 28);

  // === 进度条 ===
  const barY = 350;
  const barW = 280;
  const barH = 8;
  const barX = (W - barW) / 2;

  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  roundRect(ctx, barX, barY, barW, barH, barH / 2);
  ctx.fill();

  ctx.fillStyle = theme.barColor;
  const fillW = Math.min(barW, (completionPct / 100) * barW);
  roundRect(ctx, barX, barY, fillW, barH, barH / 2);
  ctx.fill();

  // 进度标签
  ctx.fillStyle = theme.mutedColor;
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`已完成 ${completionPct.toFixed(1)}%  剩余 ${(100 - completionPct).toFixed(1)}%`, W / 2, barY + 25);

  // === 底部 ===
  ctx.fillStyle = theme.mutedColor;
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('全民环游中国虚拟跑步地图', W / 2, H - 40);
  ctx.font = '9px sans-serif';
  ctx.fillText('跑遍中国 · 足不出户', W / 2, H - 22);

  return Promise.resolve(canvas.toDataURL('image/png'));
}

/**
 * 渲染全民分享卡片
 */
export function renderGlobalShareCard(params: {
  participantCount: number;
  totalRealKm: number;
  totalVirtualKm: number;
  currentCity: string;
  completionPct: number;
  topRunnerName: string;
  topRunnerKm: number;
}): Promise<string> {
  const { participantCount, totalRealKm, currentCity, completionPct, topRunnerName, topRunnerKm } = params;
  const theme: ShareCardTheme = {
    bgColor: '#0f2027', headerColor: '#81c784', accentColor: '#66bb6a',
    textColor: '#ffffff', mutedColor: 'rgba(255,255,255,0.5)', barColor: '#66bb6a',
  };

  const W = 360, H = 540;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // 背景
  ctx.fillStyle = theme.bgColor;
  roundRect(ctx, 0, 0, W, H, 16);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1;
  roundRect(ctx, 0, 0, W, H, 16);
  ctx.stroke();

  // === 标题 ===
  ctx.fillStyle = theme.headerColor;
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🌍 全民环游中国', W / 2, 50);

  // === 分隔线 ===
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.moveTo(30, 70);
  ctx.lineTo(W - 30, 70);
  ctx.stroke();

  // === 参与人数 ===
  ctx.fillStyle = theme.textColor;
  ctx.font = 'bold 36px sans-serif';
  ctx.fillText(`${participantCount}`, W / 2, 130);
  ctx.fillStyle = theme.mutedColor;
  ctx.font = '14px sans-serif';
  ctx.fillText('人共同参与', W / 2, 155);

  // === 分隔线 ===
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.moveTo(30, 175);
  ctx.lineTo(W - 30, 175);
  ctx.stroke();

  // === 数据行 ===
  ctx.textAlign = 'center';

  // 总跑量
  ctx.fillStyle = theme.mutedColor;
  ctx.font = '11px sans-serif';
  ctx.fillText('全民总跑量', 90, 210);
  ctx.fillStyle = theme.textColor;
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(fmt(totalRealKm), 90, 240);
  ctx.fillStyle = theme.mutedColor;
  ctx.font = '10px sans-serif';
  ctx.fillText('公里', 90, 258);

  // 当前位置
  ctx.fillStyle = theme.mutedColor;
  ctx.font = '11px sans-serif';
  ctx.fillText('全民位置', W / 2, 210);
  ctx.fillStyle = theme.headerColor;
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(currentCity, W / 2, 240);
  ctx.fillStyle = theme.mutedColor;
  ctx.font = '10px sans-serif';
  ctx.fillText('当前到达', W / 2, 258);

  // 完成进度
  ctx.fillStyle = theme.mutedColor;
  ctx.font = '11px sans-serif';
  ctx.fillText('完成比例', 270, 210);
  ctx.fillStyle = theme.accentColor;
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(`${completionPct.toFixed(2)}%`, 270, 240);

  // === 进度条 ===
  const barY = 300;
  const barW = 280;
  const barH = 8;
  const barX = (W - barW) / 2;

  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  roundRect(ctx, barX, barY, barW, barH, barH / 2);
  ctx.fill();

  ctx.fillStyle = theme.barColor;
  const fillW = Math.min(barW, (completionPct / 100) * barW);
  roundRect(ctx, barX, barY, fillW, barH, barH / 2);
  ctx.fill();

  ctx.fillStyle = theme.mutedColor;
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${completionPct.toFixed(2)}% · 仍需努力`, W / 2, barY + 25);

  // === 分隔线 ===
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.moveTo(30, 355);
  ctx.lineTo(W - 30, 355);
  ctx.stroke();

  // === 第一名 ===
  ctx.fillStyle = theme.textColor;
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🏆 跑量第一名', W / 2, 390);

  ctx.font = 'bold 20px sans-serif';
  ctx.fillStyle = theme.headerColor;
  ctx.fillText(topRunnerName, W / 2, 420);

  ctx.font = '14px sans-serif';
  ctx.fillStyle = theme.textColor;
  ctx.fillText(`${topRunnerKm.toFixed(0)} km`, W / 2, 445);

  // === 底部 ===
  ctx.fillStyle = theme.mutedColor;
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('全民环游中国虚拟跑步地图', W / 2, H - 40);
  ctx.font = '9px sans-serif';
  ctx.fillText('跑遍中国 · 足不出户', W / 2, H - 22);

  return Promise.resolve(canvas.toDataURL('image/png'));
}
