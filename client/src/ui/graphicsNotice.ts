import { checkGraphicsCapability } from './graphicsCapability';
import { loungeText as text } from './loungeText';
import '../styles/graphicsNotice.css';

/** Only called after the login/HOME artwork cover is released. */
export function showGraphicsNotice(): () => void {
  const capability = checkGraphicsCapability();
  if (capability === 'available' || capability === 'unknown') return () => {};
  const ua = navigator.userAgent;
  const desktop = !/Android|iPhone|iPad|iPod/i.test(ua) && !(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const browser = desktop && /Edg\//.test(ua) ? 'Edge' : desktop && /Chrome\//.test(ua) && !/OPR\//.test(ua) ? 'Chrome' : null;
  const url = browser === 'Edge' ? 'edge://settings/system' : 'chrome://settings/system';
  const previous = document.activeElement;
  const dialog = document.createElement('dialog');
  dialog.className = 'graphics-notice';
  dialog.setAttribute('aria-labelledby', 'graphics-notice-title');
  dialog.setAttribute('aria-describedby', 'graphics-notice-description');
  const title = text('快適にプレイするための設定', 'Help LORE run smoothly', '원활한 플레이를 위한 설정');
  const description = text(
    'GPU描画が利用できない、または制限されている可能性があります。この状態では、画面やアニメーションが大きくカクつくことがあります。',
    'GPU rendering may be unavailable or limited. This can cause severe stuttering in the game and its animations.',
    'GPU 렌더링을 사용할 수 없거나 제한된 상태일 수 있습니다. 이 경우 게임 화면과 애니메이션이 심하게 끊길 수 있습니다.');
  dialog.innerHTML = `<small class="graphics-notice-brand">LORE</small>
    <h2 id="graphics-notice-title">${title}</h2><p id="graphics-notice-description">${description}</p>
    ${browser ? `<ol>
      <li>${text('下のアドレスをコピーし、新しいタブのアドレス欄に貼り付けて開いてください。', 'Copy the address below and paste it into the address bar of a new tab.', '아래 주소를 복사해 새 탭의 주소창에 붙여 넣어 주세요.')}</li>
      <li>${text('「グラフィック アクセラレーションが使用可能な場合は使用する」をオンにしてください。', 'Turn on “Use graphics acceleration when available”.', '“가능한 경우 그래픽 가속 사용”을 켜 주세요.')}</li>
      <li>${text(`${browser}を再起動し、LOREを開き直してください。`, `Relaunch ${browser}, then reopen LORE.`, `${browser}을(를) 다시 시작한 뒤 LORE를 다시 열어 주세요.`)}</li>
    </ol><div class="graphics-notice-address"><input aria-label="${text('ブラウザの設定アドレス', 'Browser settings address', '브라우저 설정 주소')}" readonly value="${url}"><button type="button" data-copy>${text('コピー', 'Copy', '복사')}</button></div>
    <p class="graphics-notice-note">${text('すでにオンの場合は、ブラウザとグラフィックドライバーの更新も確認してください。', 'If it is already on, check for browser and graphics driver updates.', '이미 켜져 있다면 브라우저와 그래픽 드라이버 업데이트도 확인해 주세요.')}</p>` : `<p>${text('ブラウザとOSを更新して再起動してください。PCでは、ブラウザのグラフィック アクセラレーション設定も確認してください。', 'Update and restart your browser and operating system. On a computer, also check the browser’s graphics acceleration setting.', '브라우저와 운영체제를 업데이트한 뒤 다시 시작해 주세요. PC에서는 브라우저의 그래픽 가속 설정도 확인해 주세요.')}</p>`}
    <p class="graphics-notice-status" role="status" aria-live="polite"></p>
    <div class="graphics-notice-actions"><button type="button" data-recheck>${text('再確認', 'Check again', '다시 확인')}</button><button type="button" data-continue autofocus>${text('そのまま続ける', 'Continue anyway', '그대로 계속')}</button></div>`;
  const dispose = () => {
    const open = dialog.open;
    if (open) dialog.close();
    dialog.remove();
    if (open && previous instanceof HTMLElement && previous.isConnected) previous.focus();
  };
  dialog.addEventListener('close', () => dialog.remove(), { once: true });
  dialog.querySelector<HTMLButtonElement>('[data-continue]')!.onclick = dispose;
  const status = dialog.querySelector<HTMLElement>('[role="status"]')!;
  dialog.querySelector<HTMLButtonElement>('[data-recheck]')!.onclick = () => {
    const next = checkGraphicsCapability();
    if (next === 'available') {
      status.textContent = text('描画機能を利用できます。続けてプレイできます。', 'Rendering is available. You can continue playing.', '렌더링 기능을 사용할 수 있습니다. 계속 플레이할 수 있습니다.');
      dialog.querySelector<HTMLButtonElement>('[data-continue]')!.textContent = text('続ける', 'Continue', '계속');
    } else {
      status.textContent = text('改善を確認できませんでした。設定変更後はブラウザを再起動してください。', 'We could not confirm an improvement. Relaunch the browser after changing its settings.', '개선 여부를 확인하지 못했습니다. 설정을 변경한 뒤 브라우저를 다시 시작해 주세요.');
    }
  };
  const address = dialog.querySelector<HTMLInputElement>('input');
  if (address) {
    address.onclick = () => address.select();
    dialog.querySelector<HTMLButtonElement>('[data-copy]')!.onclick = async () => {
      try {
        await navigator.clipboard.writeText(url);
        status.textContent = text('コピーしました。新しいタブのアドレス欄に貼り付けてください。', 'Copied. Paste it into the address bar of a new tab.', '복사했습니다. 새 탭의 주소창에 붙여 넣어 주세요.');
      } catch {
        address.focus(); address.select();
        status.textContent = text('アドレスを選択しました。手動でコピーしてください。', 'Address selected. Please copy it manually.', '주소를 선택했습니다. 직접 복사해 주세요.');
      }
    };
  }
  document.body.append(dialog);
  dialog.showModal();
  return dispose;
}
