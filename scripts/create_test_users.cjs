// E23 Phase 2.1B - Create test users
const { createClient } = require('@supabase/supabase-js');

const URL = 'https://wakfdoszxaeytvkiugsh.supabase.co';
const KEY = 'sb_publishable_fHV52q-Zen-Fp-mggitvtg_hVJOHZ1D';

async function createUser(email, pw, nick) {
  const sb = createClient(URL, KEY);
  const { data, error } = await sb.auth.signUp({ email, password: pw });
  if (error) { console.log('SIGNUP FAIL', email, error.message); return null; }
  const uid = data.user.id;
  console.log('SIGNUP OK', email, '->', uid);

  const { data: si } = await sb.auth.signInWithPassword({ email, password: pw });
  if (!si?.session) { console.log('SIGNIN FAIL', email); return uid; }
  const token = si.session.access_token;

  const auth = createClient(URL, KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: 'Bearer ' + token } }
  });

  await auth.from('profiles').upsert(
    { id: uid, nickname: nick, role: 'member', status: 'approved' },
    { onConflict: 'id' }
  );

  const { data: cls } = await auth.from('classes').select('id').eq('name', 'E23').single();
  if (cls) {
    await auth.from('class_members').upsert(
      { class_id: cls.id, user_id: uid, role: 'member' },
      { onConflict: 'class_id, user_id', ignoreDuplicates: true }
    );
    await auth.from('profiles').update({ class_id: cls.id }).eq('id', uid);
    console.log('CLASS JOINED', email, 'class:', cls.id);
    return { uid, classId: cls.id };
  } else {
    console.log('CLASS NOT FOUND');
  }
  return { uid, classId: null };
}

async function main() {
  console.log('=== Creating User A ===');
  const a = await createUser('e23test.a@example.com', 'TestPass123!', '测试用户A');
  console.log('=== Creating User B ===');
  const b = await createUser('e23test.b@example.com', 'TestPass123!', '测试用户B');
  console.log('\n=== USERS CREATED ===');
  console.log('A UUID:', a?.uid);
  console.log('B UUID:', b?.uid);
  console.log('CLASS ID:', a?.classId);
}
main().catch(e => console.error(e));
