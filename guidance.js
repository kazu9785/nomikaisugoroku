(()=>{
 const VERSION="v-8786bfd3ef1e";const $=id=>document.getElementById(id),guide=$('help-dialog');
 $('app-version').textContent='バージョン '+VERSION;
 $('help-open').onclick=()=>guide.showModal();
 function closeGuide(){try{localStorage.setItem('nomi-guide-seen-v1','1');}catch{}guide.close();}
 $('help-close').onclick=closeGuide;guide.addEventListener('cancel',e=>{e.preventDefault();closeGuide();});
 try{if(!localStorage.getItem('nomi-guide-seen-v1'))guide.showModal();}catch{}
 $('game-update').onclick=async()=>{
  const status=$('update-status'),button=$('game-update');
  if(location.protocol==='file:'){status.textContent='ファイル版は自動更新できません。最新版ZIPを上書きするか公開URLから開いてください。';return;}
  if($('catalog-dialog').open||EventEngine.isPreview()){status.textContent='編集・お試しを終了してから更新してください。';return;}
  button.disabled=true;status.textContent='最新版を確認中…';const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),10000);
  try{
   const response=await fetch(new URL('version.json?check='+Date.now(),location.href),{cache:'no-store',signal:controller.signal});
   if(!response.ok)throw Error();const latest=await response.json();if(typeof latest.version!=='string'||!/^v-[a-f0-9]{12}$/.test(latest.version))throw Error();
   if(latest.version===VERSION){status.textContent='すでに最新バージョンです（'+VERSION+'）';return;}
   const active=phase!=='setup';
   if(!confirm('新しいバージョン '+latest.version+' を開きます。'+(active?'進行を保存します。お題は同じカードの最初から再開し、入力途中の回答や絵は保存しません。':'')+'更新しますか？')){status.textContent='更新をキャンセルしました。';return;}
   if(active&&!saveGame()){status.textContent='進行を保存できないため、更新を中止しました。';return;}
   const registration=await navigator.serviceWorker?.getRegistration();if(registration)registration.update().catch(()=>{});
   const url=new URL(location.href);url.searchParams.set('app-version',latest.version);location.replace(url.href);
  }catch{status.textContent='最新版を確認できませんでした。通信を確認して再試行してください。';}
  finally{clearTimeout(timeout);button.disabled=false;}
 };
})();
