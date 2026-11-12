const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
// Shared hosts sit behind a proxy. If /api/myip shows the SERVER's IP instead of yours, tell me.
app.set('trust proxy', 1);
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Spins are saved in spins.json (keep this file safe; deleting it lets everyone spin again)
const DB_FILE = process.env.DB_PATH || path.join(__dirname, 'spins.json');
let spins = {};
try { spins = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch { spins = {}; }

function save() {
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(spins, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

// EDIT: your 10 products + weight (higher = more likely). Weight 0 = never won.
const PRIZES = [
  { name: 'Free Pen',        weight: 20 },
  { name: 'Keychain',        weight: 15 },
  { name: '5% Discount',     weight: 15 },
  { name: 'Sticker Pack',    weight: 15 },
  { name: 'Notebook',        weight: 10 },
  { name: '10% Discount',    weight: 10 },
  { name: 'Water Bottle',    weight: 6 },
  { name: 'Cap',             weight: 4 },
  { name: 'T-Shirt',         weight: 3 },
  { name: 'Gift Voucher',    weight: 2 },
];

function pickPrize() {
  const total = PRIZES.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * total;
  for (let i = 0; i < PRIZES.length; i++) {
    if ((r -= PRIZES[i].weight) < 0) return i;
  }
  return PRIZES.length - 1;
}

app.get('/api/myip', (req, res) => res.json({ ip: req.ip }));

app.get('/api/prizes', (req, res) => {
  const prev = spins[req.ip];
  res.json({ prizes: PRIZES.map(p => p.name), alreadySpun: !!prev, prize: prev?.prize });
});

app.post('/api/spin', (req, res) => {
  const ip = req.ip;
  if (spins[ip]) return res.status(409).json({ error: 'already_spun', prize: spins[ip].prize });

  // Node runs one request at a time here, so check + save cannot overlap
  const index = pickPrize();
  spins[ip] = { prize: PRIZES[index].name, at: new Date().toISOString() };
  save();
  res.json({ index, prize: PRIZES[index].name });
});

app.listen(process.env.PORT || 3000, () => console.log('Running'));
