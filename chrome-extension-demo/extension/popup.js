const D = { enabled: true, sensitivity: 1.0, demoMode: false, trail: false, autoPrompt: true };
const keys = Object.keys(D);
chrome.storage.local.get(D, s => {
  keys.forEach(k => { const el = document.getElementById(k); if (el.type === 'checkbox') el.checked = s[k]; else el.value = s[k]; });
  document.getElementById('sv').textContent = '×' + s.sensitivity;
});
keys.forEach(k => document.getElementById(k).addEventListener('input', e => {
  const v = e.target.type === 'checkbox' ? e.target.checked : parseFloat(e.target.value);
  if (k === 'sensitivity') document.getElementById('sv').textContent = '×' + v;
  chrome.storage.local.set({ [k]: v });
}));
function send(cmd, cb) { chrome.tabs.query({ active: true, currentWindow: true }, ([t]) => t && chrome.tabs.sendMessage(t.id, { cmd }, r => { void chrome.runtime.lastError; cb && cb(r); })); }
['focus', 'ruler', 'chunk', 'break', 'reset'].forEach(c => document.getElementById(c).onclick = () => send(c));
const poll = () => send('state', r => { document.getElementById('score').textContent = r ? r.score : '–'; });
poll(); setInterval(poll, 500);
