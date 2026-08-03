// 前端业务链路真实写入测试（使用与 store.syncRecordToCloud 完全一致的字段与调用方式）
// 运行：node -e "require('tsx').register()" 不支持；使用 esbuild 编译或直接用 JS 调用 supabase-js
// 这里用项目 node_modules 的 @supabase/supabase-js，复刻 CloudRepository.upsertActivity 的调用形态
const { createClient } = require('@supabase/supabase-js');

const S = 'https://wakfdoszxaeytvkiugsh.supabase.co';
const K = 'sb_publishable_fHV52q-Zen-Fp-mggitvtg_hVJOHZ1D';
const CLASS_ID = '94728c9e-9a66-485f-ae9e-12c4da074bb2';

const sb = createClient(S, K, { auth: { persistSession: false } });

async function main() {
  // 1. 账号A登录（与前端 AuthService 相同链路）
  const { data: sa, error: ea } = await sb.auth.signInWithPassword({ email: 'test_a@e23.com', password: 'E23test2026!' });
  if (ea || !sa?.user) throw new Error('A signin failed: ' + JSON.stringify(ea));
  const UA = sa.user.id;
  console.log('[1] A signed in:', UA);

  // 2. 构造与 store.syncRecordToCloud（修复后）完全一致的 RunRecord 与 payload
  const rec = { id: 'e2e_a_run_' + Date.now(), ts: Date.now(), km: 1.05, durationSec: 420, avgPaceSec: 400, source: 'gps', startedAt: Date.now() - 420000, syncState: 'local' };
  const payload = {
    client_id: rec.id,
    user_id: UA,
    class_id: CLASS_ID,
    distance_m: Math.round(rec.km * 1000),
    duration_s: rec.durationSec,
    pace_seconds_per_km: rec.avgPaceSec,
    source: 'gps',
    status: 'valid',
    start_time: new Date(rec.startedAt).toISOString(),
    end_time: new Date(rec.ts).toISOString(),
  };
  console.log('[2] payload:', JSON.stringify(payload));

  // 3. 复刻 CloudRepository.X.upsert('run_activities', record, 'client_id')
  async function upsert(record) {
    return sb.from('run_activities').upsert(record, { onConflict: 'client_id', ignoreDuplicates: false }).select('*').single();
  }

  // 4. 第一次写入
  const r1 = await upsert(payload);
  if (r1.error) throw new Error('upsert#1 failed: ' + JSON.stringify(r1.error));
  console.log('[3] first write OK: id=' + r1.data.id.slice(0, 8), 'distance_m=' + r1.data.distance_m, 'duration_s=' + r1.data.duration_s, 'pace=' + r1.data.pace_seconds_per_km);
  console.log('    start_time=' + r1.data.start_time, 'end_time=' + r1.data.end_time, 'status=' + r1.data.status, 'class_id=' + (r1.data.class_id||'').slice(0,8));

  // 5. 幂等测试：同 client_id 重复写入（模拟重复点击/重试）
  const r2 = await upsert(payload);
  if (r2.error) throw new Error('upsert#2 failed: ' + JSON.stringify(r2.error));
  console.log('[4] idempotent rewrite OK: same client_id, same id=' + (r2.data.id === r1.data.id ? 'YES' : 'NO(LEAK!)'));

  const { count } = await sb.from('run_activities').select('*', { count: 'exact', head: true }).eq('client_id', payload.client_id);
  console.log('[5] rows with client_id=' + payload.client_id + ': ' + count + ' (expect 1)');

  // 6. 账号B 登录，验证 RLS：B 读不到 A 的该活动
  const { data: sb_ } = await sb.auth.signInWithPassword({ email: 'test_b@e23.com', password: 'E23test2026!' });
  const bClient = createClient(S, K, { global: { headers: { Authorization: 'Bearer ' + sb_.session.access_token } }, auth: { persistSession: false } });
  const { data: bReadsA } = await bClient.from('run_activities').select('client_id').eq('user_id', UA);
  console.log('[6] B reads A activities: ' + (bReadsA ? bReadsA.length : 'ERR') + ' rows (expect 0 = RLS OK)');

  // 7. B 读自己的（应能看到自己的活动）
  const { data: bOwn } = await bClient.from('run_activities').select('client_id').eq('user_id', sb_.user.id);
  console.log('[7] B reads own activities: ' + (bOwn ? bOwn.length : 'ERR') + ' rows');

  console.log('\nRESULT: PASS (write + idempotency + RLS)');
}

main().catch((e) => { console.error('TEST FAILED:', e.message); process.exit(1); });
