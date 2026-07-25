const { createClient } = require('@supabase/supabase-js');
const URL = 'https://wakfdoszxaeytvkiugsh.supabase.co';
const KEY = 'sb_publishable_fHV52q-Zen-Fp-mggitvtg_hVJOHZ1D';

async function main() {
  const sb = createClient(URL, KEY);
  const { data: si } = await sb.auth.signInWithPassword({ email: 'e23test.a@example.com', password: 'TestPass123!' });
  if (!si?.session) { console.log('SIGNIN FAIL'); return; }
  const auth = createClient(URL, KEY, { auth: { persistSession: false }, global: { headers: { Authorization: 'Bearer ' + si.session.access_token } } });

  const tables = { classes: null, profiles: null, class_members: null, run_activities: null, class_stats: null, route_progress: null, route_unlocks: null, sync_queue: null, user_stats: null, daily_stats: null, run_track_points: null };
  
  for (const name of Object.keys(tables)) {
    const { data, error } = await auth.from(name).select('*').limit(3);
    if (error) console.log(name + ': BLOCKED (' + error.message.slice(0, 60) + ')');
    else if (!data || data.length === 0) console.log(name + ': 0 rows');
    else console.log(name + ': ' + data.length + ' rows | cols: ' + Object.keys(data[0]).join(', '));
  }
}
main().catch(e => console.error(e));
