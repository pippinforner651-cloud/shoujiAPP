import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'

// PWA：注册 Service Worker（离线基础资源 + 新版本提示）
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      reg.addEventListener('updatefound', () => {
        const sw = reg.installing;
        if (!sw) return;
        sw.addEventListener('statechange', () => {
          if (sw.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateToast();
          }
        });
      });
    }).catch(() => { /* 离线或不支持时静默降级 */ });
  });
}

function showUpdateToast() {
  const t = document.createElement('div');
  t.textContent = '新版本已就绪，点击刷新';
  t.style.cssText = 'position:fixed;left:50%;bottom:88px;transform:translateX(-50%);background:#FF6B1A;color:#fff;padding:10px 20px;border-radius:999px;font-size:14px;font-weight:700;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,.25);cursor:pointer';
  t.onclick = () => window.location.reload();
  document.body.appendChild(t);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
