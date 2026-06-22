/* Builds the daily reminder email from tasks.json.
   Runs on GitHub Actions (Node 20). No dependencies.
   Always sends (a daily check-in); dates computed in Asia/Kuala_Lumpur.
   Leads with Today's Big 3 (focus), marks High priority, sorts priority-first. */
import { readFileSync, appendFileSync } from 'node:fs';

const TZ = 'Asia/Kuala_Lumpur';
const SITE = 'https://jorvixgeniushub.github.io/marketing-tracker/';
const CATS = { codetrace:'CODETRACE', jorvix:'JORVIX', director:'DIRECTOR', nvidia:'NVIDIA' };
const PRANK = { high:0, normal:1, low:2 };

function todayInTZ(){
  return new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
}
function prettyToday(){
  return new Intl.DateTimeFormat('en-GB',{timeZone:TZ,weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date());
}
function daysTo(due, today){
  return Math.round((new Date(due+'T00:00:00') - new Date(today+'T00:00:00'))/86400000);
}
function esc(s){ return String(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function cat(t){ return CATS[t.cat] || String(t.cat||'').toUpperCase() || 'TASK'; }
function prioOf(t){ return t.priority || 'normal'; }
function isHigh(t){ return prioOf(t)==='high'; }
function byPriDue(a,b){ const d=PRANK[prioOf(a)]-PRANK[prioOf(b)]; if(d!==0) return d; if(!a.due) return 1; if(!b.due) return -1; return a.due<b.due?-1:1; }
function duePart(t){ return t.due ? `due ${t.due}` : 'no due date'; }
function subPart(t){ const s=t.subtasks||[]; return s.length ? ` — ${s.filter(x=>x.done).length}/${s.length} steps` : ''; }

let data;
try { data = JSON.parse(readFileSync('tasks.json','utf8')); }
catch(e){ data = { tasks:[], meetings:[] }; }
const tasks = Array.isArray(data) ? data : (data.tasks || []);

const today = todayInTZ();
const open = tasks.filter(t => t && t.status !== 'done');
const focus    = open.filter(t => t.focusDate === today).sort(byPriDue);
const dated    = open.filter(t => t.due);
const overdue  = dated.filter(t => daysTo(t.due, today) < 0).sort(byPriDue);
const dueToday = dated.filter(t => daysTo(t.due, today) === 0).sort(byPriDue);
const upcoming = dated.filter(t => { const d = daysTo(t.due, today); return d > 0 && d <= 7; }).sort(byPriDue);
const dueCount = overdue.length + dueToday.length;

const txtLine  = t => `  • ${isHigh(t)?'🔴 ':''}[${cat(t)}] ${t.title} (${duePart(t)})${subPart(t)}`;
const highTag  = `<span style="background:#FDE0D2;color:#C0440E;font-size:11px;font-weight:700;padding:1px 6px;border-radius:5px;margin-left:6px">HIGH</span>`;
const htmlLine = t => `<li style="margin:6px 0"><strong>[${cat(t)}]</strong> ${esc(t.title)}${isHigh(t)?highTag:''} <span style="color:#888">— ${duePart(t)}${esc(subPart(t))}</span></li>`;
const htmlUl   = arr => `<ul style="padding-left:18px;margin:0">${arr.map(htmlLine).join('')}</ul>`;

/* ----- text body ----- */
let text = `Emily's Prime Deck — ${prettyToday()}\n\n`;
if (focus.length)    text += `🔥 TODAY'S BIG 3:\n${focus.map(txtLine).join('\n')}\n\n`;
if (overdue.length)  text += `OVERDUE (${overdue.length}):\n${overdue.map(txtLine).join('\n')}\n\n`;
if (dueToday.length) text += `DUE TODAY (${dueToday.length}):\n${dueToday.map(txtLine).join('\n')}\n\n`;
if (!dueCount && !focus.length) text += `You're clear — nothing overdue or due today.\n\n`;
if (upcoming.length) text += `COMING UP (next 7 days):\n${upcoming.map(txtLine).join('\n')}\n\n`;
text += `Open the tracker: ${SITE}\n`;

/* ----- html body ----- */
let html = `<div style="font-family:system-ui,Segoe UI,Roboto,sans-serif;max-width:560px">
  <h2 style="margin:0 0 4px">Emily's Prime Deck</h2>
  <p style="margin:0 0 16px;color:#666">${prettyToday()}</p>`;
if (focus.length)    html += `<h3 style="color:#B8860B;margin:14px 0 4px">🔥 Today's Big 3</h3>${htmlUl(focus)}`;
if (overdue.length)  html += `<h3 style="color:#C92A2A;margin:14px 0 4px">Overdue (${overdue.length})</h3>${htmlUl(overdue)}`;
if (dueToday.length) html += `<h3 style="color:#A07A12;margin:14px 0 4px">Due today (${dueToday.length})</h3>${htmlUl(dueToday)}`;
if (!dueCount && !focus.length) html += `<p style="margin:14px 0;color:#2E9E54;font-weight:600">You're clear — nothing overdue or due today.</p>`;
if (upcoming.length) html += `<h3 style="color:#555;margin:14px 0 4px">Coming up (next 7 days)</h3>${htmlUl(upcoming)}`;
html += `<p style="margin-top:18px"><a href="${SITE}" style="color:#154BA1">Open the tracker →</a></p></div>`;

const out = process.env.GITHUB_OUTPUT;
const set = (k,v) => appendFileSync(out, `${k}=${v}\n`);
const setMulti = (k,v) => { const d = 'EOF_'+Math.random().toString(36).slice(2); appendFileSync(out, `${k}<<${d}\n${v}\n${d}\n`); };

const lead = focus.length ? `🔥 ${focus.length} focus` : (dueCount ? `⏰ ${dueCount} due` : '✅ Clear');
set('subject', `${lead} — Emily's Prime Deck`);
setMulti('text_body', text);
setMulti('html_body', html);

console.log(`today=${today} focus=${focus.length} overdue=${overdue.length} dueToday=${dueToday.length} upcoming=${upcoming.length}`);
