'use strict';
const SharedCatalog = (()=>{
  let revision=null,token='',ready=true,pending=false,source='初期のお題';
  const localFile=location.protocol==='file:';
  const cacheKey='nomi-shared-cache-v1:'+(window.NOMI_API_BASE||location.origin);
  const $=id=>document.getElementById(id);
  function status(text){$('sync-status').textContent=text;}
  function canApply(){return !EventEngine.isBusy()&&!$('catalog-dialog').open;}
  async function request(url,options={}){
    let response;const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),10000);
    try{response=await fetch(new URL(url,window.NOMI_API_BASE||location.origin),{...options,credentials:'omit',cache:'no-store',signal:controller.signal});}catch(e){throw Error('共有サーバーに接続できません。');}finally{clearTimeout(timeout);}
    let value;try{value=await response.json();}catch(e){throw Error('共有先の応答が正しくありません。接続設定を確認してください。');}
    if(!response.ok)throw Error(value.error||'共有データを読み込めませんでした。');return value;
  }
  function apply(value){EventEngine.editor.receive(value.data);revision=value.revision;ready=true;
    const n=EventEngine.getCatalog().length;$('topic-total').textContent=`全${n}種類 · ${Math.min(6,n)}枚から選ぼう`;
    source='取得済みのお題';
    try{localStorage.setItem(cacheKey,JSON.stringify(value));}catch{}
    $('setup-form').querySelector('button').disabled=false;status('共有設定を読み込み済み');
  }
  async function refresh(force=false){
    if(localFile){status(`この端末でお試し中（${source}）。設定の共有・編集は公開URLから利用できます。`);return;}
    if(pending||!canApply())return;
    pending=true;
    try{const value=await request('/api/catalog');if(!canApply())return;if(revision!==value.revision||force)apply(value);else status('共有設定を読み込み済み');}
    catch(e){status(`${e.message} ${source}で遊べます。最新の共有設定は未確認です。「共有データを更新」で再試行できます。`);}finally{pending=false;}
  }
  async function login(password){
    if(localFile)throw Error('カードの共有・編集はGitHub Pagesなどの公開URLから開いてください。');
    const value=await request('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});token=value.token;
    // 一覧を開く直前に最新版を取得（編集前なので差し替え可能）。
    const current=await request('/api/catalog');apply(current);
  }
  async function save(data){
    if(localFile||revision===null||!token)throw Error('共有先に接続して、一覧を開き直してください。');
    const value=await request('/api/catalog',{method:'PUT',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({revision,data})});
    apply(value);
  }
  // 共有先の障害でゲーム開始まで止めない。キャッシュは閲覧・プレイ用で、未接続の編集保存はしない。
  try{const cached=JSON.parse(localStorage.getItem(cacheKey)||'null');if(cached){EventEngine.editor.receive(cached.data);source='前回取得したお題';}}catch{}
  const initialCount=EventEngine.getCatalog().length;
  $('topic-total').textContent=`全${initialCount}種類 · ${Math.min(6,initialCount)}枚から選ぼう`;
  $('setup-form').querySelector('button').disabled=false;
  $('sync-refresh').addEventListener('click',()=>refresh(true));
  if(location.protocol==='file:'){
    refresh();
    $('legacy-export').hidden=false;
    $('legacy-export').addEventListener('click',()=>{
      try{
        const raw=localStorage.getItem('nomi-sugoroku-catalog-v1');if(!raw)throw Error('この場所には以前の編集がありません。');
        JSON.parse(raw);const url=URL.createObjectURL(new Blob([raw],{type:'application/json'}));
        const a=document.createElement('a');a.href=url;a.download='nomi-catalog-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
        status('保存したJSONを、共有版のカード一覧から取り込めます。');
      }catch(e){status(e.message);}
    });
  }
  else {status(`${source}で開始できます。共有設定を確認中…`);refresh();setInterval(()=>refresh(),5000);}
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
  return {login,save,refresh,isReady:()=>ready,logout:()=>{token='';}};
})();
