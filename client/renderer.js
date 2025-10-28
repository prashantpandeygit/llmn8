const dot = document.getElementById('dot');
const status = document.getElementById('status');
const chat = document.getElementById('chat');
const input = document.getElementById('input');
const send = document.getElementById('send');
const load = document.getElementById('load');
const downloadBtn = document.getElementById('download');
const progressBar = document.getElementById('progress-bar');

let ready = false;

async function checkHealth() {
  try {
    const data = await window.electronAPI.checkHealth();
    if (data.error) {
      throw new Error(data.error);
    }
    dot.classList.add('ok');
    status.textContent = data.model_loaded ? 'Ready' : 'Connected';
    ready = data.model_loaded;

    if (data.model_exists) {
      downloadBtn.textContent = 'Downloaded';
      downloadBtn.disabled = true;
      load.disabled = false;
      progressBar.style.width = '100%';

      if (data.model_loaded) {
        send.disabled = false;
        load.textContent = 'Loaded';
        load.disabled = true;
      }
    }
  } catch {
    status.textContent = 'Offline';
    dot.classList.remove('ok');
    ready = false;
  }
}

load.onclick = async () => {
  load.textContent = 'Loading...';
  load.disabled = true;
  try {
    const data = await window.electronAPI.loadModel();
    if (data.success) {
      ready = true;
      send.disabled = false;
      load.textContent = 'Loaded';
      addMsg('ai', 'Model loaded! Ready to help.');
    }
  } catch (e) {
    load.textContent = 'Load Model';
    load.disabled = false;
    addMsg('ai', 'Error: ' + e.message);
  }
};

send.onclick = async () => {
  const text = input.value.trim();
  if (!text) return;

  addMsg('user', text);
  input.value = '';
  send.disabled = true;

  const thinking = addMsg('ai', 'Thinking...');
  try {
    const data = await window.electronAPI.generate({
      prompt: text,
      max_tokens: 512,
      temperature: 0.7,
    });
    thinking.remove();
    addMsg('ai', data.response);
  } catch (e) {
    thinking.remove();
    addMsg('ai', 'Error: ' + e.message);
  } finally {
    send.disabled = false;
  }
};

function addMsg(role, text) {
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  let html = text;
  if (text.includes('```')) {
    html = text.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
  }
  html = html.replace(/\n/g, '<br>');
  div.innerHTML = `${html}`;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
  return div;
}

input.onkeypress = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    send.click();
  }
};

checkHealth();
setInterval(checkHealth, 5000);