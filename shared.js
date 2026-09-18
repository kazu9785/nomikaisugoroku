'use strict';
const SharedCatalog = (()=>{
  let revision=null,token='',ready=false,pending=false;
  const $=id=>document.getElementById(id);
  function status(text){$('sync-status').textContent=text;}
  function canApply(){return !EventEngine.isBusy()&&!$('catalog-dialog').open;}
  async function request(url,options={}){
    let response;
    try{response=await fetch(new URL(url,window.NOMI_API_BASE||location.origin),{...options,credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(10000)});}catch(e){throw Error('共有サーバーに接続できません。通信状態を確認してください。');}
    let value;try{value=await response.json();}catch(e){throw Error('共有サーバーから開いてください。index.htmlの直接起動や静的公開だけでは共有できません。');}
    if(!response.ok)throw Error(value.error||'共有データを読み込めませんでした。');return value;
  }
  function apply(value){EventEngine.editor.receive(value.data);revision=value.revision;ready=true;
    const n=EventEngine.getCatalog().length;$('topic-total').textContent=`全${n}種類 · ${Math.min(6,n)}枚から選ぼう`;
    $('setup-form').querySelector('button').disabled=false;status('共有データに接続中');
  }
  async function refresh(force=false){
    if(pending||!canApply())return;
    pending=true;
    try{const value=await request('/api/catalog');if(!canApply())return;if(revision!==value.revision||force)apply(value);else status('共有データに接続中');}
    catch(e){status(e.message);}finally{pending=false;}
  }
  async function login(password){
    const value=await request('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});token=value.token;
    // 一覧を開く直前に最新版を取得（編集前なので差し替え可能）。
    const current=await request('/api/catalog');apply(current);
  }
  async function save(data){
    if(!ready)throw Error('共有データの読み込みを待ってください。');
    const value=await request('/api/catalog',{method:'PUT',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({revision,data})});
    apply(value);
  }
  $('setup-form').querySelector('button').disabled=true;
  $('sync-refresh').addEventListener('click',()=>refresh(true));
  if(location.protocol==='file:'){
    status('共有するには公開されたゲームのURLを開いてください。');
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
  else {refresh();setInterval(()=>refresh(),5000);}
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
  return {login,save,refresh,isReady:()=>ready,logout:()=>{token='';}};
})();
