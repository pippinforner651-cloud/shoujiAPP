// GPX/TCX 解析器真实测试（node + tsx 运行）：npx tsx scripts/gpx_test.ts
import { parseTrackFile, downsample, TRACK_UPLOAD_LIMIT } from '../src/lib/gpx';

let passed = 0;
let failed = 0;
function assert(cond: boolean, name: string, extra = '') {
  if (cond) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name} ${extra}`); }
}

// ---- 构造样例：沿纬度线向北 1000 个点，每秒 1 点，约 5km ----
function buildGpx(n: number): string {
  const start = Date.parse('2026-07-15T06:00:00.000Z');
  let trkpts = '';
  for (let i = 0; i < n; i++) {
    const lat = 22.53 + i * 0.000045; // 每点约 5m
    const t = new Date(start + i * 5000).toISOString(); // 每 5 秒一点
    trkpts += `      <trkpt lat="${lat.toFixed(6)}" lon="113.950000"><ele>12.5</ele><time>${t}</time></trkpt>\n`;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Joyrun" xmlns="http://www.topografix.com/GPX/1/1">
  <trk><name>晨跑</name><trkseg>
${trkpts}  </trkseg></trk>
</gpx>`;
}

function buildTcx(n: number): string {
  const start = Date.parse('2026-07-15T06:00:00.000Z');
  let tps = '';
  for (let i = 0; i < n; i++) {
    const lat = 22.53 + i * 0.000045;
    const t = new Date(start + i * 5000).toISOString();
    tps += `        <Trackpoint><Time>${t}</Time><Position><LatitudeDegrees>${lat.toFixed(6)}</LatitudeDegrees><LongitudeDegrees>113.950000</LongitudeDegrees></Position><DistanceMeters>${i * 5}</DistanceMeters><HeartRateBpm><Value>142</Value></HeartRateBpm></Trackpoint>\n`;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">
  <Activities><Activity Sport="Running"><Id>2026-07-15T06:00:00Z</Id>
    <Lap StartTime="2026-07-15T06:00:00Z"><Track>
${tps}    </Track></Lap>
  </Activity></Activities>
</TrainingCenterDatabase>`;
}

console.log('GPX/TCX 解析器测试');
const N = 1000;

// GPX
const g = parseTrackFile(buildGpx(N));
assert(g !== null, 'GPX 解析成功');
if (g) {
  assert(g.format === 'gpx', 'GPX 格式识别');
  assert(g.points.length === N, `GPX 点数 ${g.points.length}=${N}`);
  // 1000 点 × 5m ≈ 4995m，haversine 误差容忍 ±3%
  assert(Math.abs(g.distanceM - (N - 1) * 5) / ((N - 1) * 5) < 0.03, `GPX 距离 ${g.distanceM}m ≈ ${(N - 1) * 5}m`);
  assert(g.durationSec === (N - 1) * 5, `GPX 时长 ${g.durationSec}s = ${(N - 1) * 5}s`);
  assert(g.startedAt === '2026-07-15T06:00:00.000Z', 'GPX 开始时间');
}

// TCX
const t = parseTrackFile(buildTcx(N));
assert(t !== null, 'TCX 解析成功');
if (t) {
  assert(t.format === 'tcx', 'TCX 格式识别');
  assert(t.points.length === N, `TCX 点数`);
  assert(Math.abs(t.distanceM - (N - 1) * 5) / ((N - 1) * 5) < 0.03, `TCX 距离 ${t.distanceM}m`);
  assert(t.durationSec === (N - 1) * 5, 'TCX 时长');
}

// 异常输入
assert(parseTrackFile('') === null, '空文本 → null');
assert(parseTrackFile('<html>not a track</html>') === null, '非轨迹 XML → null');
assert(parseTrackFile(buildGpx(1)) === null, '单点 GPX → null（点不足）');

// 抽稀
const big = Array.from({ length: 50000 }, (_, i) => i);
const ds = downsample(big, TRACK_UPLOAD_LIMIT);
assert(ds.length === TRACK_UPLOAD_LIMIT, `抽稀 50000 → ${ds.length}`);
assert(ds[0] === 0 && ds[ds.length - 1] === 49999, '抽稀保留首尾');

// 大文件 GPX 解析（超限自动抽稀）
const g2 = parseTrackFile(buildGpx(30000));
assert(g2 !== null && g2.points.length === TRACK_UPLOAD_LIMIT && g2.pointCountRaw === 30000, '30000 点 GPX → 抽稀上传点 + 记录原始点数');

console.log(`\n结果：${passed} 通过 / ${failed} 失败`);
process.exit(failed > 0 ? 1 : 0);
