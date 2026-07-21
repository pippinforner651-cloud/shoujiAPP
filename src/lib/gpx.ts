// 悦跑圈等第三方平台导出的 GPX / TCX 轨迹文件解析器
// 纯字符串解析，不依赖 DOM，浏览器与 Node 测试环境均可运行。
// 悦跑圈导出路径参考：悦跑圈 App → 我的 → 设置 → 数据导出（或网页版导出 GPX）

import type { TrackPointPayload } from '../api/types';

export interface ParsedTrack {
  format: 'gpx' | 'tcx';
  points: TrackPointPayload[];
  distanceM: number;      // 由轨迹点 haversine 累计
  durationSec: number;    // 末点时间 - 首点时间
  startedAt: string;
  endedAt: string;
  pointCountRaw: number;  // 抽稀前原始点数
}

/** 上传给后端的轨迹点上限（留足服务端 MAX_TRACK_POINTS=50000 的余量，超限抽稀） */
export const TRACK_UPLOAD_LIMIT = 20000;

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function validCoord(lat: number, lon: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
}

/** 解析 GPX：提取 <trkpt lat lon><time>…</time></trkpt> */
function parseGpx(text: string): { lat: number; lon: number; t: string }[] {
  const pts: { lat: number; lon: number; t: string }[] = [];
  const re = /<trkpt\s+[^>]*lat="(-?[\d.]+)"[^>]*lon="(-?[\d.]+)"[^>]*>([\s\S]*?)<\/trkpt>/gi;
  // 属性顺序可能为 lon 在前
  const reAlt = /<trkpt\s+[^>]*lon="(-?[\d.]+)"[^>]*lat="(-?[\d.]+)"[^>]*>([\s\S]*?)<\/trkpt>/gi;
  const push = (latS: string, lonS: string, inner: string) => {
    const lat = parseFloat(latS);
    const lon = parseFloat(lonS);
    const tm = /<time>([^<]+)<\/time>/i.exec(inner)?.[1]?.trim();
    if (validCoord(lat, lon) && tm && !Number.isNaN(Date.parse(tm))) {
      pts.push({ lat, lon, t: new Date(tm).toISOString() });
    }
  };
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) push(m[1], m[2], m[3]);
  if (pts.length === 0) {
    while ((m = reAlt.exec(text))) push(m[2], m[1], m[3]);
  }
  return pts;
}

/** 解析 TCX：提取 <Trackpoint> 内的 Time + Position */
function parseTcx(text: string): { lat: number; lon: number; t: string }[] {
  const pts: { lat: number; lon: number; t: string }[] = [];
  const re = /<Trackpoint[^>]*>([\s\S]*?)<\/Trackpoint>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const inner = m[1];
    const tm = /<Time>([^<]+)<\/Time>/i.exec(inner)?.[1]?.trim();
    const lat = parseFloat(/<LatitudeDegrees>(-?[\d.]+)<\/LatitudeDegrees>/i.exec(inner)?.[1] ?? 'NaN');
    const lon = parseFloat(/<LongitudeDegrees>(-?[\d.]+)<\/LongitudeDegrees>/i.exec(inner)?.[1] ?? 'NaN');
    // 心率/圈速等无位置的 Trackpoint 跳过
    if (validCoord(lat, lon) && tm && !Number.isNaN(Date.parse(tm))) {
      pts.push({ lat, lon, t: new Date(tm).toISOString() });
    }
  }
  return pts;
}

/** 等间隔抽稀，保留首尾点 */
export function downsample<T>(arr: T[], limit: number): T[] {
  if (arr.length <= limit) return arr;
  const out: T[] = [];
  const step = (arr.length - 1) / (limit - 1);
  for (let i = 0; i < limit; i++) out.push(arr[Math.round(i * step)]);
  return out;
}

/**
 * 解析 GPX/TCX 文件文本。
 * 成功返回 ParsedTrack；无法识别格式或有效点不足返回 null。
 */
export function parseTrackFile(text: string): ParsedTrack | null {
  if (!text || typeof text !== 'string') return null;
  const isGpx = /<gpx[\s>]/i.test(text) && /<trkpt/i.test(text);
  const isTcx = /<TrainingCenterDatabase/i.test(text) && /<Trackpoint/i.test(text);
  if (!isGpx && !isTcx) return null;

  const raw = isGpx ? parseGpx(text) : parseTcx(text);
  if (raw.length < 2) return null;

  const pts = downsample(raw, TRACK_UPLOAD_LIMIT);
  let distanceM = 0;
  for (let i = 1; i < pts.length; i++) {
    distanceM += haversineM(pts[i - 1].lat, pts[i - 1].lon, pts[i].lat, pts[i].lon);
  }
  const startMs = Date.parse(pts[0].t);
  const endMs = Date.parse(pts[pts.length - 1].t);
  const durationSec = Math.max(1, Math.round((endMs - startMs) / 1000));

  return {
    format: isGpx ? 'gpx' : 'tcx',
    points: pts.map((p) => ({ lat: p.lat, lon: p.lon, timestamp: p.t })),
    distanceM: Math.round(distanceM),
    durationSec,
    startedAt: pts[0].t,
    endedAt: pts[pts.length - 1].t,
    pointCountRaw: raw.length,
  };
}
