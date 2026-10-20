'use strict';
(()=>{
 const panel=document.getElementById('install-panel'),button=document.getElementById('install-app'),help=document.getElementById('install-help');let prompt=null;
 const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 if(standalone()){panel.hidden=true;return;}
 if(location.protocol==='file:')help.textContent='ホーム画面に追加するには、公開URLをスマホのブラウザで開いてください。';
 else if(/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1))help.textContent='iPhone・iPad：Safariの共有メニュー →「ホーム画面に追加」。表示される場合は「Webアプリとして開く」をONにしてください。';
 else help.textContent='ブラウザのメニューから「アプリをインストール」または「ホーム画面に追加」を選べます。対応端末では下に追加ボタンが表示されます。';
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();prompt=e;button.hidden=false;});
 button.addEventListener('click',async()=>{if(!prompt)return;const next=prompt;prompt=null;button.hidden=true;try{await next.prompt();await next.userChoice;}catch{help.textContent='ブラウザのメニューからホーム画面への追加をお試しください。';}});
 window.addEventListener('appinstalled',()=>{panel.hidden=true;prompt=null;});
 if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
})();
