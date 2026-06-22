/* Builds the daily reminder email from tasks.json.
   Runs on GitHub Actions (Node 20). No dependencies.
   Always sends (a daily check-in); dates computed in Asia/Kuala_Lumpur. */
import { readFileSync, appendFileSync } from 'node:fs';

const TZ = 'Asia/Kuala_Lumpur';
const SITE = 'https://jorvixgeniushub.github.io/marketing-tracker/';
const CATS = { codetrace:'CODETRACE', jorvix:'JORVIX', director:'DIRECTOR', nvidia:'NVIDIA' };

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

let data;
try { data = JSON.parse(readFileSync('tasks.json','utf8')); }
catch(e){ data = { tasks:[], meetings:[] }; }
const tasks = Array.isArray(data) ? data : (data.tasks || []);

const today = todayInTZ();
const byDue = (a,b) => a.due < b.due ? -1 : 1;
const open = tasks.filter(t => t && t.status !== 'done' && t.due);
const overdue  = open.filter(t => daysTo(t.due, today) < 0).sort(byDue);
const dueToday = open.filter(t => daysTo(t.due, today) === 0);
const upcoming = open.filter(t => { const d = daysTo(t.due, today); return d > 0 && d <= 7; }).sort(byDue);
const dueCount = overdue.length + dueToday.length;

const txtLine  = t => `  • [${cat(t)}] ${t.title} (due ${t.due})`;
const htmlLine = t => `<li style="margin:6px 0"><strong>[${cat(t)}]</strong> ${esc(t.title)} <span style="color:#888">— due ${t.due}</span></li>`;
const htmlUl   = arr => `<ul style="padding-left:18px;margin:0">${arr.map(htmlLine).join('')}</ul>`;

/* ----- text body ----- */
let text = `Emily's Prime Deck — ${prettyToday()}\n\n`;
if (overdue.length)  text += `OVERDUE (${overdue.length}):\n${overdue.map(txtLine).join('\n')}\n\n`;
if (dueToday.length) text += `DUE TODAY (${dueToday.length}):\n${dueToday.map(txtLine).join('\n')}\n\n`;
if (!dueCount)       text += `You're clear — nothing overdue or due today.\n\n`;
if (upcoming.length) text += `COMING UP (next 7 days):\n${upcoming.map(txtLine).join('\n')}\n\n`;
text += `Open the tracker: ${SITE}\n`;

/* ----- html body ----- */
let html = `<div style="font-family:system-ui,Segoe UI,Roboto,sans-serif;max-width:560px">
  <h2 style="margin:0 0 4px">Emily's Prime Deck</h2>
  <p style="margin:0 0 16px;color:#666">${prettyToday()}</p>`;
if (overdue.length)  html += `<h3 style="color:#C92A2A;margin:14px 0 4px">Overdue (${overdue.length})</h3>${htmlUl(overdue)}`;
if (dueToday.length) html += `<h3 style="color:#A07A12;margin:14px 0 4px">Due today (${dueToday.length})</h3>${htmlUl(dueToday)}`;
if (!dueCount)       html += `<p style="margin:14px 0;color:#2E9E54;font-weight:600">You're clear — nothing overdue or due today.</p>`;
if (upcoming.length) html += `<h3 style="color:#555;margin:14px 0 4px">Coming up (next 7 days)</h3>${htmlUl(upcoming)}`;
html += `<p style="margin-top:18px"><a href="${SITE}" style="color:#154BA1">Open the tracker →</a></p></div>`;

const out = process.env.GITHUB_OUTPUT;
const set = (k,v) => appendFileSync(out, `${k}=${v}\n`);
const setMulti = (k,v) => { const d = 'EOF_'+Math.random().toString(36).slice(2); appendFileSync(out, `${k}<<${d}\n${v}\n${d}\n`); };

set('subject', dueCount ? `⏰ ${dueCount} task${dueCount>1?'s':''} due — Emily's Prime Deck`
                        : `✅ Nothing due today — Emily's Prime Deck`);
setMulti('text_body', text);
setMulti('html_body', html);

console.log(`today=${today} overdue=${overdue.length} dueToday=${dueToday.length} upcoming=${upcoming.length}`);
