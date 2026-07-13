/**
 * OSRM 路线几何生成脚本
 * 
 * 读取 route_master_v1.json + segment_config.json
 * 批量调用 OSRM API 生成真实道路几何
 * 输出: route_geometry_v1.json
 */
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ===== 配置 =====
const BASE_DIR = path.resolve(__dirname, '..');
const ROUTE_FILE = path.join(BASE_DIR, 'route_master_v1.json');
const CONFIG_FILE = path.join(__dirname, 'segment_config.json');
const OUTPUT_FILE = path.join(__dirname, 'route_geometry_v1.json');
const OSRM_BASE = 'router.project-osrm.org';
const REQUEST_INTERVAL_MS = 800; // 请求间隔
const MAX_RETRIES = 3;

// ===== 读取数据 =====
const routeData = JSON.parse(fs.readFileSync(ROUTE_FILE, 'utf8'));
const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
const nodes = routeData.nodes;

// nodes 索引: id→node
const nodeMap = {};
nodes.forEach(n => { nodeMap[n.id] = n; });

// ===== 工具 =====
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function osrmRequest(coordsStr) {
  return new Promise((resolve, reject) => {
    const path = `/route/v1/driving/${coordsStr}?overview=simplified&geometries=geojson&steps=false`;
    const opts = { hostname: OSRM_BASE, path, method: 'GET', timeout: 15000 };

    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.code !== 'Ok') {
            reject(new Error(`OSRM error: ${parsed.code} - ${JSON.stringify(parsed.message || '')}`));
            return;
          }
          resolve(parsed);
        } catch (e) {
          reject(new Error(`Parse error: ${e.message}`));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

async function fetchWithRetry(coordsStr, label) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`  [${label}] 请求OSRM... (尝试 ${attempt}/${MAX_RETRIES})`);
      const result = await osrmRequest(coordsStr);
      const route = result.routes[0];
      const distKm = (route.distance / 1000).toFixed(1);
      const pts = route.geometry.coordinates.length;
      console.log(`  ✅ ${distKm} km, ${pts} 坐标点`);
      return {
        distance_km: parseFloat(distKm),
        duration_min: Math.round(route.duration / 60 * 10) / 10,
        geometry: route.geometry,
      };
    } catch (err) {
      console.log(`  ❌ 尝试 ${attempt} 失败: ${err.message}`);
      if (attempt < MAX_RETRIES) {
        const wait = attempt * 2000;
        console.log(`  等待 ${wait}ms 后重试...`);
        await sleep(wait);
      }
    }
  }
  throw new Error(`[${label}] 所有重试均失败`);
}

// ===== 海渡段：生成直线几何 =====
function makeSeaTransfer(fromNode, toNode) {
  const distance = fromNode.next_distance_km || 0;
  return {
    distance_km: distance,
    duration_min: Math.round(distance / 30 * 60), // 假设 30km/h 轮渡
    geometry: {
      type: 'LineString',
      coordinates: [
        [fromNode.longitude, fromNode.latitude],
        [toNode.longitude, toNode.latitude],
      ],
    },
    note: 'sea_transfer - 直线近似，非真实道路',
  };
}

// ===== 主流程 =====
async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  OSRM 路线几何生成器');
  console.log('  城市节点数:', nodes.length);
  console.log('  路线段数:', config.segments.length);
  console.log('═══════════════════════════════════════════\n');

  const results = [];
  let success = 0;
  let failed = 0;
  let totalApiTime = 0;

  for (let i = 0; i < config.segments.length; i++) {
    const seg = config.segments[i];
    const fromNode = nodeMap[seg.from];
    const toNode = nodeMap[seg.to];

    if (!fromNode || !toNode) {
      console.log(`❌ [${i + 1}/${config.segments.length}] 节点缺失: ${seg.from}→${seg.to}`);
      failed++;
      continue;
    }

    const label = `${seg.from}→${seg.to} (${fromNode.city}→${toNode.city})`;
    console.log(`\n--- [${i + 1}/${config.segments.length}] ${label} ---`);
    console.log(`  类型: ${seg.type} | 来源: ${seg.route_source}`);

    if (seg.type === 'sea_transfer') {
      // 海渡段：直接生成直线
      const seaData = makeSeaTransfer(fromNode, toNode);
      results.push({
        id: `seg_${i + 1}`,
        order: i + 1,
        type: 'sea_transfer',
        from: seg.from,
        from_city: fromNode.city,
        to: seg.to,
        to_city: toNode.city,
        ...seaData,
      });
      console.log(`  ✅ 海渡段 (直线): ${seaData.distance_km} km`);
      success++;
      continue;
    }

    // 道路段 / G219：调用 OSRM
    const coords = `${fromNode.longitude},${fromNode.latitude};${toNode.longitude},${toNode.latitude}`;
    const startTime = Date.now();

    try {
      const roadData = await fetchWithRetry(coords, label);
      const elapsed = Date.now() - startTime;
      totalApiTime += elapsed;

      results.push({
        id: `seg_${i + 1}`,
        order: i + 1,
        type: seg.type,
        from: seg.from,
        from_city: fromNode.city,
        to: seg.to,
        to_city: toNode.city,
        route_source: seg.route_source,
        ...roadData,
      });
      success++;

      // 请求间隔
      if (i < config.segments.length - 1) {
        console.log(`  等待 ${REQUEST_INTERVAL_MS}ms...`);
        await sleep(REQUEST_INTERVAL_MS);
      }
    } catch (err) {
      console.log(`  ❌ 失败: ${err.message}`);
      failed++;
      // 失败的段用直线回退
      const fallbackDist = fromNode.next_distance_km || 0;
      results.push({
        id: `seg_${i + 1}`,
        order: i + 1,
        type: 'fallback_linear',
        from: seg.from,
        from_city: fromNode.city,
        to: seg.to,
        to_city: toNode.city,
        distance_km: fallbackDist,
        duration_min: Math.round(fallbackDist),
        geometry: {
          type: 'LineString',
          coordinates: [
            [fromNode.longitude, fromNode.latitude],
            [toNode.longitude, toNode.latitude],
          ],
        },
        note: 'OSRM请求失败，回退到直线近似',
      });
      await sleep(REQUEST_INTERVAL_MS);
    }
  }

  // ===== 汇总 =====
  console.log('\n═══════════════════════════════════════════');
  console.log('  生成完成');
  console.log('═══════════════════════════════════════════');
  console.log(`  总段数: ${config.segments.length}`);
  console.log(`  成功: ${success}`);
  console.log(`  失败(回退直线): ${failed}`);
  console.log(`  API总耗时: ${(totalApiTime / 1000).toFixed(0)}s`);

  // 统计总距离
  const totalDist = results.reduce((s, r) => s + r.distance_km, 0);
  console.log(`  总距离: ${totalDist.toFixed(0)} km`);

  // 统计坐标点
  const totalPoints = results.reduce((s, r) => s + (r.geometry?.coordinates?.length || 0), 0);
  console.log(`  总坐标点: ${totalPoints}`);

  // ===== 写文件 =====
  const output = {
    route_version: routeData.route_version || '1.0',
    geometry_version: '1.0',
    meta: {
      name: '中国环游经典自驾路线 - 真实道路几何',
      source: `OSRM ${OSRM_BASE}`,
      profile: 'driving',
      overview: 'simplified',
      total_segments: results.length,
      total_distance_km: Math.round(totalDist),
      road_segments: results.filter(r => r.type === 'road' || r.type === 'special_g219').length,
      sea_transfer_segments: results.filter(r => r.type === 'sea_transfer').length,
      fallback_segments: results.filter(r => r.type === 'fallback_linear').length,
      generated_at: new Date().toISOString(),
    },
    segments: results,
  };

  const jsonStr = JSON.stringify(output, null, 2);
  fs.writeFileSync(OUTPUT_FILE, jsonStr, 'utf8');
  const fileSize = Buffer.byteLength(jsonStr, 'utf8');
  console.log(`\n  输出文件: ${OUTPUT_FILE}`);
  console.log(`  文件大小: ${(fileSize / 1024).toFixed(1)} KB`);

  // 检查各段
  console.log('\n--- 各段明细 ---');
  results.forEach((r, i) => {
    const pts = r.geometry?.coordinates?.length || 0;
    const icons = { road: '🛣️', special_g219: '⛰️', sea_transfer: '🚢', fallback_linear: '⚠️' };
    console.log(`  ${icons[r.type] || '❓'} seg_${i + 1} ${r.from_city.padEnd(6)}→${r.to_city.padEnd(6)}  ${r.distance_km.toFixed(0).padStart(5)} km  ${pts.toString().padStart(4)} pts  ${r.type}`);
  });
}

main().catch(err => {
  console.error('\n❌ 脚本错误:', err);
  process.exit(1);
});
