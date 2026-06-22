/* Builds the "tasks due" email from tasks.json.
   Runs on GitHub Actions (Node 20). No dependencies.
   Reminders are computed in Malaysia time (Asia/Kuala_Lumpur). */
import { readFileSync, appendFileSync } from 'node:fs';

const TZ = 'Asia/Kuala_Lumpur';
const SITE = 'https://jorvixgeniushub.github.io/marketing-tracker/';
const CATS = { codetrace:'CODETRACE', jorvix:'JORVIX', director:'DIRECTOR', nvidia:'NVIDIA' };

function todayInTZ(){
  return new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
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
const open = tasks.filter(t => t && t.status !== 'done' && t.due);
const overdue  = open.filter(t => daysTo(t.due, today) < 0).sort((a,b)=> a.due < b.due ? -1 : 1);
const dueToday = open.filter(t => daysTo(t.due, today) === 0);
const total = overdue.length + dueToday.length;

const txtLine  = t => `  • [${cat(t)}] ${t.title} (due ${t.due})`;
const htmlLine = t => `<li style="margin:6px 0"><strong>[${cat(t)}]</strong> ${esc(t.title)} <span style="color:#888">— due ${t.due}</span></li>`;

let text = '', html = '';
if (total){
  text = `Emily's Prime Deck — reminders for ${today}\n\n`;
  if (overdue.length)  text += `OVERDUE (${overdue.length}):\n${overdue.map(txtLine).join('\n')}\n\n`;
  if (dueToday.length) text += `DUE TODAY (${dueToday.length}):\n${dueToday.map(txtLine).join('\n')}\n\n`;
  text += `Open the tracker: ${SITE}\n`;

  html = `<div style="font-family:system-ui,Segoe UI,Roboto,sans-serif;max-width:560px">
    <h2 style="margin:0 0 4px">Emily's Prime Deck</h2>
    <p style="margin:0 0 16px;color:#666">Reminders for ${today}</p>`;
  if (overdue.length)  html += `<h3 style="color:#C92A2A;margin:14px 0 4px">Overdue (${overdue.length})</h3><ul style="padding-left:18px;margin:0">${overdue.map(htmlLine).join('')}</ul>`;
  if (dueToday.length) html += `<h3 style="color:#A07A12;margin:14px 0 4px">Due today (${dueToday.length})</h3><ul style="padding-left:18px;margin:0">${dueToday.map(htmlLine).join('')}</ul>`;
  html += `<p style="margin-top:18px"><a href="${SITE}" style="color:#154BA1">Open the tracker →</a></p></div>`;
}

const out = process.env.GITHUB_OUTPUT;
const set = (k,v) => appendFileSync(out, `${k}=${v}\n`);
const setMulti = (k,v) => { const d = 'EOF_'+Math.random().toString(36).slice(2); appendFileSync(out, `${k}<<${d}\n${v}\n${d}\n`); };

set('send', total > 0 ? 'true' : 'false');
set('count', String(total));
set('subject', total ? `⏰ ${total} task${total>1?'s':''} due — Emily's Prime Deck` : 'No tasks due today');
setMulti('text_body', text || 'Nothing due today.');
setMulti('html_body', html || '<p>Nothing due today.</p>');

console.log(`today=${today} overdue=${overdue.length} dueToday=${dueToday.length} send=${total>0}`);
