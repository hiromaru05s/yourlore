/** Small entry module: recovery stays available even if the application graph fails. */
import { startupLanguage } from './startupLanguage';

const shell = document.getElementById('startup');
const message = document.getElementById('startup-status');
const reload = document.getElementById('startup-reload');
const language = (navigator.language || 'en').slice(0, 2);
const copy = language === 'ja'
  ? ['書庫を開いています', '読み込み直す', '接続に時間がかかっています。通信状態を確認し、読み込み直してください。', '起動できませんでした。通信状態を確認し、読み込み直してください。']
  : language === 'ko'
    ? ['서고를 여는 중', '다시 불러오기', '연결이 지연되고 있어요. 연결 상태를 확인하고 다시 불러와 주세요.', '시작하지 못했어요. 연결 상태를 확인하고 다시 불러와 주세요.']
    : ['Opening the library', 'Reload', 'Connecting is taking longer than usual. Check your connection and reload.', 'Could not start LORE. Check your connection and reload.'];
if (message) message.textContent = copy[0];
if (reload) reload.textContent = copy[1];
const slow = setTimeout(() => { if (message) message.textContent = copy[2]; }, 12000);
// Geography is optional and bounded, and overlaps downloading the application.
void Promise.all([import('./main'), startupLanguage()])
  .then(async ([{ start }, language]) => {
    await start(language);
    shell?.remove();
  })
  .catch(error => {
    console.error('LORE startup failed', error);
    if (message) message.textContent = copy[3];
    shell?.setAttribute('data-startup-error', 'true');
  })
  .finally(() => clearTimeout(slow));
