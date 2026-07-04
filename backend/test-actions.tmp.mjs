import 'dotenv/config';
import jwt from 'jsonwebtoken';
import postgres from 'postgres';

const BASE = 'http://localhost:3001/api';
let bearer = '';

async function mintTestToken() {
  const sql = postgres(process.env.DATABASE_URL);
  const [user] = await sql`SELECT id, gym_id FROM users LIMIT 1`;
  await sql.end();
  bearer = jwt.sign({ userId: user.id, gymId: user.gym_id }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

async function req(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bearer}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  const text = await res.text();
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data };
}

function check(label, cond, extra) {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${label}${extra ? ' -> ' + JSON.stringify(extra) : ''}`);
}

async function main() {
  await mintTestToken();

  let r = await req('GET', '/auth/me');
  check('me', r.status === 200, r.data?.data?.user?.email);

  // --- Offers ---
  r = await req('POST', '/offers', { name: 'Test Offer', discountPercent: 10, startDate: '2026-01-01' });
  check('offer create', r.status === 201, r.data);
  const offerId = r.data?.data?.id;

  r = await req('PUT', `/offers/${offerId}`, { name: 'Test Offer Updated' });
  check('offer update', r.status === 200, r.data);

  // --- Packs ---
  r = await req('POST', '/packs', { name: 'Test Pack', durationMonths: 1, price: 100 });
  check('pack create', r.status === 201, r.data);
  const packId = r.data?.data?.id;

  r = await req('PUT', `/packs/${packId}`, { price: 150 });
  check('pack update', r.status === 200, r.data);

  // --- Equipment ---
  r = await req('POST', '/equipment', { name: 'Test Treadmill', category: 'Cardio' });
  check('equipment create', r.status === 201, r.data);
  const equipmentId = r.data?.data?.id;

  r = await req('PUT', `/equipment/${equipmentId}`, { status: 'Maintenance' });
  check('equipment update', r.status === 200, r.data);

  r = await req('DELETE', `/equipment/${equipmentId}`);
  check('equipment delete', r.status === 204, r.data);

  // --- Staff / Roles ---
  r = await req('POST', '/staff/roles', { name: 'Test Role', permissions: ['clients'] });
  check('role create', r.status === 201, r.data);
  const roleId = r.data?.data?.id;

  r = await req('POST', '/staff', { email: 'teststaff@example.com', password: 'TestPass123', fullName: 'Test Staff', roleId });
  check('staff create', r.status === 201, r.data);
  const staffId = r.data?.data?.id;

  // --- Client (the reported bug) ---
  r = await req('POST', '/clients', {
    fullName: 'Test Client', phone: '0600000000', email: 'testclient@example.com',
    gender: 'Male', joinDate: '2026-01-01', subscriptionType: 'Monthly',
    subscriptionPlanId: packId, subscriptionDurationMonths: 1,
    subscriptionStart: '2026-01-01', subscriptionEnd: '2026-02-01',
    offerId, paymentStatus: 'Paid', amountPaid: 100,
  });
  check('client create', r.status === 201, r.data);
  const clientId = r.data?.data?.id;

  r = await req('PUT', `/clients/${clientId}`, { notes: 'updated note' });
  check('client update', r.status === 200, r.data);

  // --- Payments (attach a payment to the client, then delete client -> should cascade) ---
  r = await req('POST', '/payments', {
    clientId, amount: 100, date: '2026-01-01', periodStart: '2026-01-01', periodEnd: '2026-02-01',
    method: 'Cash', status: 'Paid',
  });
  check('payment create', r.status === 201, r.data);

  // THE BUG: deleting a client with a payment attached used to 500 (no FK cascade)
  r = await req('DELETE', `/clients/${clientId}`);
  check('client delete (with payment attached — the reported bug)', r.status === 204, r.data);

  // --- cleanup ---
  r = await req('DELETE', `/staff/${staffId}`);
  check('staff delete', r.status === 204, r.data);

  r = await req('DELETE', `/staff/roles/${roleId}`);
  check('role delete', r.status === 204, r.data);

  r = await req('DELETE', `/packs/${packId}`);
  check('pack delete', r.status === 204, r.data);

  r = await req('DELETE', `/offers/${offerId}`);
  check('offer delete', r.status === 204, r.data);

  // --- Settings ---
  r = await req('GET', '/settings');
  check('settings get', r.status === 200, r.data);
}

main().catch((e) => { console.error('SCRIPT ERROR', e); process.exit(1); });
