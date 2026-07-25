import { createClient } from '@supabase/supabase-js';

const URL = 'https://wakfdoszxaeytvkiugsh.supabase.co';
const KEY = 'sb_publishable_fHV52q-Zen-Fp-mggitvtg_hVJOHZ1D';

async function main() {
  const sb = createClient(URL, KEY);
  
  // Try signing in User A
  const { data: si, error: siErr } = await sb.auth.signInWithPassword({
    email: 'e23test.a@example.com',
    password: 'TestPass123!'
  });
  
  if (siErr) {
    console.log('SIGNIN ERROR:', siErr.message);
    return;
  }
  
  console.log('SIGNIN SUCCESS, token type:', si.session?.token_type);
  console.log('User ID:', si.user?.id);
  
  // Try reading classes with this token
  const token = si.session.access_token;
  const auth = createClient(URL, KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: 'Bearer ' + token } }
  });
  
  const { data: classes, error: clsErr } = await auth.from('classes').select('*');
  console.log('CLASSES QUERY:', classes ? JSON.stringify(classes) : 'null');
  if (clsErr) console.log('CLASSES ERROR:', clsErr.message, clsErr.code);
  
  // If classes exist, setup everything
  if (classes && classes.length > 0) {
    const cls = classes[0];
    const uid = si.user.id;
    
    // Create/update profile
    await auth.from('profiles').upsert(
      { id: uid, nickname: '测试用户A', role: 'member', status: 'approved' },
      { onConflict: 'id' }
    );
    
    // Join class
    await auth.from('class_members').upsert(
      { class_id: cls.id, user_id: uid, role: 'member' },
      { onConflict: 'class_id, user_id', ignoreDuplicates: true }
    );
    
    await auth.from('profiles').update({ class_id: cls.id }).eq('id', uid);
    console.log('User A fully setup:', uid, 'class:', cls.id);
    
    // Now do B
    const { data: siB } = await sb.auth.signInWithPassword({
      email: 'e23test.b@example.com',
      password: 'TestPass123!'
    });
    if (siB?.session) {
      const tokenB = siB.session.access_token;
      const authB = createClient(URL, KEY, {
        auth: { persistSession: false },
        global: { headers: { Authorization: 'Bearer ' + tokenB } }
      });
      const uidB = siB.user.id;
      await authB.from('profiles').upsert(
        { id: uidB, nickname: '测试用户B', role: 'member', status: 'approved' },
        { onConflict: 'id' }
      );
      await authB.from('class_members').upsert(
        { class_id: cls.id, user_id: uidB, role: 'member' },
        { onConflict: 'class_id, user_id', ignoreDuplicates: true }
      );
      await authB.from('profiles').update({ class_id: cls.id }).eq('id', uidB);
      console.log('User B fully setup:', uidB, 'class:', cls.id);
    }
  } else {
    console.log('CLASSES TABLE EMPTY - need seed');
  }
}

main().catch(e => console.error(e));
