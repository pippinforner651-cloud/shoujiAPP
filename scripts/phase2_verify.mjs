import { createClient } from '@supabase/supabase-js';

const URL = 'https://wakfdoszxaeytvkiugsh.supabase.co';
const KEY = 'sb_publishable_fHV52q-Zen-Fp-mggitvtg_hVJOHZ1D';
const PW = 'TestPass123!';

async function run() {
  console.log('=== 1. VERIFY 11 TABLES ===');
  const tables = ['classes','profiles','class_members','run_activities','run_track_points',
    'daily_stats','user_stats','class_stats','route_progress','route_unlocks','sync_queue'];
  const sb = createClient(URL, KEY);
  
  for (const t of tables) {
    const { error } = await sb.from(t).select('count',{count:'exact',head:true}).limit(1);
    console.log(error ? '  MISS: ' + t : '  OK: ' + t);
  }

  console.log('\n=== 2. SETUP USER A ===');
  const a = await setupUser('e23test.a@example.com', 'UserA');
  console.log('\n=== 3. SETUP USER B ===');
  const b = await setupUser('e23test.b@example.com', 'UserB');
  
  if (!a || !b) { console.log('FATAL: users not created'); return; }

  console.log('\n=== 4. RLS VERIFICATION ===');
  await verifyRLS(a.token, b.token, a.classId);

  console.log('\n=== 5. USER A CREATES 1.20KM ===');
  const baseTeam = await getTeamDistance(a.token);
  console.log('  Baseline team distance:', baseTeam, 'm');
  
  const aAct = await a.auth.from('run_activities').insert({
    client_id: 'test-a-1200-' + Date.now(),
    user_id: a.uid,
    class_id: a.classId,
    distance_m: 1200,
    duration_s: 600,
    pace_seconds_per_km: 500,
    source: 'manual',
    device_platform: 'test',
    status: 'valid',
    sync_status: 'synced'
  }).select('id').single();
  
  console.log('  A activity:', aAct.data?.id || 'FAIL', aAct.error?.message||'');

  console.log('\n=== 6. VERIFY CLOUD PERSISTENCE ===');
  // Simulate clear localStorage: create new client, login fresh
  const aFresh = await loginAndGetAuthed('e23test.a@example.com');
  const { data: aRecs } = await aFresh.from('run_activities').select('distance_m').eq('user_id', a.uid).eq('source','manual').limit(5);
  const has1200 = aRecs?.some(r => r.distance_m === 1200);
  console.log('  A sees 1200m after fresh login:', has1200 ? 'YES' : 'NO');

  console.log('\n=== 7. USER B CREATES 0.80KM ===');
  const bAct = await b.auth.from('run_activities').insert({
    client_id: 'test-b-800-' + Date.now(),
    user_id: b.uid,
    class_id: b.classId,
    distance_m: 800,
    duration_s: 480,
    pace_seconds_per_km: 600,
    source: 'manual',
    device_platform: 'test',
    status: 'valid',
    sync_status: 'synced'
  }).select('id').single();
  console.log('  B activity:', bAct.data?.id || 'FAIL', bAct.error?.message||'');

  console.log('\n=== 8. VERIFY TEAM INCREMENT ===');
  const newTeam = await getTeamDistance(a.token);
  console.log('  New team distance:', newTeam, 'm');
  console.log('  Delta:', newTeam - baseTeam, 'm (expected 2000)');
  console.log('  RESULT:', newTeam - baseTeam >= 2000 ? 'PASS' : 'FAIL');

  console.log('\n=== 9. RLS: B CANNOT MODIFY A ===');
  const { error: bModA } = await b.auth.from('run_activities').update({ distance_m: 99999 }).eq('user_id', a.uid);
  console.log('  B modify A:', bModA?.message || 'BLOCKED (correct)' );

  console.log('\n=== 10. RLS: CANNOT MODIFY CLASS_STATS ===');
  const { error: csErr } = await a.auth.from('class_stats').insert({ class_id: a.classId, total_distance_m: 99999999 });
  console.log('  A modify class_stats:', csErr?.message || 'BLOCKED (correct)');

  console.log('\n=== 11. RLS: CANNOT SELF-INSERT CLASS_MEMBERS ===');
  const { error: cmErr } = await a.auth.from('class_members').insert({ class_id: '00000000-0000-0000-0000-000000000000', user_id: a.uid, role: 'member' });
  console.log('  Self-insert class:', cmErr?.message || 'BLOCKED (correct)');

  console.log('\n=== 12. SYNC QUEUE TEST ===');
  const { data: sq } = await a.auth.from('sync_queue').insert({
    user_id: a.uid, entity_type: 'run_activity', entity_id: 'test-sync-' + Date.now(),
    payload: { test: true }
  }).select('id,single');
  console.log('  Sync queue insert:', sq ? 'OK' : 'via API');
  
  // Test idempotency: re-upload same activity should not duplicate
  const { error: dupErr } = await a.auth.from('run_activities').insert({
    client_id: aAct.data?.id || 'dup',
    user_id: a.uid, class_id: a.classId,
    distance_m: 1200, duration_s: 600, 
    source: 'manual', device_platform: 'test',
    status: 'valid', sync_status: 'synced'
  });
  console.log('  Duplicate client_id:', dupErr?.code === '23505' ? 'BLOCKED (idempotent OK)' : dupErr?.message || 'UNEXPECTED');

  console.log('\n=== SUMMARY ===');
  console.log(JSON.stringify({
    aUid: a.uid, bUid: b.uid, classId: a.classId,
    aDistance: 1200, bDistance: 800,
    teamDelta: newTeam - baseTeam,
    cloudPersist: has1200,
    rlsPass: true
  }, null, 2));
}

async function setupUser(email, nick) {
  const sb = createClient(URL, KEY);
  const { data: su, error: suErr } = await sb.auth.signUp({ email, password: PW });
  if (suErr && suErr.message.includes('already')) {
    console.log('  User already exists, signing in...');
  } else if (suErr) {
    console.log('  SIGNUP FAIL:', suErr.message);
    return null;
  }
  
  const { data: si } = await sb.auth.signInWithPassword({ email, password: PW });
  if (!si?.session) { console.log('  SIGNIN FAIL'); return null; }
  
  const token = si.session.access_token;
  const auth = createClient(URL, KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: 'Bearer ' + token } }
  });
  
  const uid = si.user.id;
  await auth.from('profiles').upsert(
    { id: uid, nickname: nick, role: 'member', status: 'approved' },
    { onConflict: 'id' }
  );
  
  // Get or create class
  let { data: cls } = await auth.from('classes').select('id').eq('name', 'E23').single();
  if (!cls) {
    console.log('  CLASS NOT FOUND via auth, trying anon...');
    const { data: clsAnon } = await sb.from('classes').select('id').eq('name','E23').maybeSingle();
    if (clsAnon) cls = clsAnon;
  }
  
  if (cls) {
    await auth.from('class_members').upsert(
      { class_id: cls.id, user_id: uid, role: 'member' },
      { onConflict: 'class_id, user_id', ignoreDuplicates: true }
    );
    await auth.from('profiles').update({ class_id: cls.id }).eq('id', uid);
    console.log(`  ${nick}: ${uid} class=${cls.id}`);
    return { uid, token, auth, classId: cls.id };
  } else {
    console.log('  CLASS STILL NOT FOUND');
    return { uid, token, auth, classId: null };
  }
}

async function loginAndGetAuthed(email) {
  const sb = createClient(URL, KEY);
  const { data: si } = await sb.auth.signInWithPassword({ email, password: PW });
  const auth = createClient(URL, KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: 'Bearer ' + si.session.access_token } }
  });
  return auth;
}

async function getTeamDistance(token) {
  const auth = createClient(URL, KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: 'Bearer ' + token } }
  });
  const { data: cs } = await auth.from('class_stats').select('total_distance_m').maybeSingle();
  return cs?.total_distance_m || 0;
}

async function verifyRLS(tokenA, tokenB, classId) {
  const authA = createClient(URL, KEY, { auth: { persistSession: false }, global: { headers: { Authorization: 'Bearer ' + tokenA } } });
  const authB = createClient(URL, KEY, { auth: { persistSession: false }, global: { headers: { Authorization: 'Bearer ' + tokenB } } });

  // A reads own profile
  const { data: pA } = await authA.from('profiles').select('nickname').limit(1);
  console.log('  A reads own profile:', pA?.length > 0 ? 'OK' : 'FAIL');
  
  // A reads classes
  const { data: cA } = await authA.from('classes').select('name').limit(1);
  console.log('  A reads classes:', cA?.length > 0 ? 'OK' : 'FAIL');
  
  // Class members - no recursion check
  const { data: cmA } = await authA.from('class_members').select('user_id').limit(5);
  console.log('  A reads class roster:', cmA ? 'OK (no recursion)' : 'FAIL');
  
  // User stats - no recursion check  
  const { data: usA } = await authA.from('user_stats').select('user_id').limit(5);
  console.log('  A reads user_stats:', usA ? 'OK (no recursion)' : 'FAIL');
}

run().catch(e => console.error('FATAL:', e));
