const API = `http://localhost:55440`;
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
    const res = await fetch(`${API}/health`);
    const data = await res.json();
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

downloadBtn.onclick = async () => {
  downloadBtn.textContent = 'Downloading...';
  downloadBtn.disabled = true;
  progressBar.style.width = '0%';

  try {
    const eventSource = new EventSource(`${API}/download-model`);

    eventSource.onmessage = (event) => {
      console.log('Received:', event.data); 
      
      const data = event.data.trim();

      if (data.startsWith('error|')) {
        const error = data.substring(6);
        eventSource.close();
        addMsg('ai', 'Download failed: ' + error);
        downloadBtn.textContent = 'Download Model';
        downloadBtn.disabled = false;
        return;
      }

      try {
        const progress = parseInt(data);
        if (!isNaN(progress)) {
          progressBar.style.width = progress + '%';
          
          if (progress >= 100) {
            eventSource.close();
            addMsg('ai', 'Model downloaded successfully!');
            downloadBtn.textContent = 'Downloaded';
            load.disabled = false;
            
            setTimeout(checkHealth, 1000);
          }
        }
      } catch (e) {
        console.error('Error parsing progress:', e);
      }
    };

    eventSource.onerror = (error) => {
      console.error('EventSource error:', error);
      eventSource.close();
      addMsg('ai', 'Download connection lost. Please check if the backend is running.');
      downloadBtn.textContent = 'Download Model';
      downloadBtn.disabled = false;
    };

  } catch (e) {
    console.error('Download error:', e);
    addMsg('ai', 'Error: ' + e.message);
    downloadBtn.textContent = 'Download Model';
    downloadBtn.disabled = false;
  }
};

load.onclick = async () => {
  load.textContent = 'Loading...';
  load.disabled = true;
  try {
    const res = await fetch(`${API}/load-model`, { method: 'POST' });
    const data = await res.json();
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
    const res = await fetch(`${API}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: text, max_tokens: 512, temperature: 0.7 }),
    });
    const data = await res.json();
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