'use strict';
// 静的アプリの簡易ロック。編集データは共有サーバーに保存します。
(() => {
  const $ = id => document.getElementById(id);
  let unlocked = false, dirty = false, saving = false, pendingRestore=null;
  const BACKUP_KEY='nomi-catalog-sets-v1';
  const actions = EventEngine.editor.getActions();
  const poolMeta = EventEngine.editor.getPoolMeta();
  function make(tag, text, cls) {
    const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;
  }
  function button(text, fn, cls='text-button') {
    const b=make('button',text,cls);b.type='button';b.addEventListener('click',fn);return b;
  }
  function boardCount() {
    const count=EventEngine.getCatalog().length;
    $('topic-total').textContent=`全${count}種類 · ${Math.min(6,count)}枚から選ぼう`;
  }
  function lock() {
    unlocked=false;dirty=false;pendingRestore=null;$('restore-review').hidden=true;SharedCatalog.logout();
    $('catalog-password').value='';$('catalog-error').textContent='';
    $('catalog-login').hidden=false;$('catalog-unlocked').hidden=true;
    $('catalog-list').replaceChildren();$('catalog-detail').replaceChildren();
    $('catalog-detail').hidden=true;$('catalog-list-view').hidden=false;
    $('catalog-count').textContent='';$('catalog-filter').value='all';$('catalog-notice').textContent='';
  }
  function mayDiscard(){return !dirty || window.confirm('保存していない変更を破棄しますか？');}
  function close(){if(saving){$('catalog-notice').textContent='保存が終わるまでお待ちください。';return;}if(!mayDiscard())return;lock();$('catalog-dialog').close();$('catalog-open').focus();}
  function render(){
    if(!unlocked)return;
    $('catalog-list-view').hidden=false;$('catalog-detail').hidden=true;
    const all=EventEngine.getCatalog(),kind=$('catalog-filter').value;
    const topics=all.map((topic,index)=>({topic,index})).filter(({topic})=>kind==='all'||topic[3]===kind);
    $('catalog-count').textContent=`${topics.length} / ${all.length}種類（飲む系${all.filter(t=>t[3]==='drink').length}・飲まない系${all.filter(t=>t[3]==='talk').length}）`;
    $('catalog-list').replaceChildren();
    topics.forEach(({topic,index})=>{
      const card=button('',()=>editCard(index),'catalog-card');
      card.setAttribute('aria-label',`${topic[0]}の詳細・編集を開く`);
      card.append(make('span',`${String(index+1).padStart(2,'0')} · ${topic[3]==='drink'?'飲む系':'飲まない系'}`,'eyebrow'),make('strong',topic[0],'catalog-card-title'),make('span',topic[1],'catalog-card-body'),make('span','詳細・テーマ一覧・編集 →','catalog-card-link'));
      $('catalog-list').append(card);
    });
    boardCount();renderBackups();
  }
  function editCard(index){
    if(!unlocked)return;
    const draft=EventEngine.editor.getData();
    const isNew=index===null;
    const topic=isNew?['','','','talk','']:draft.topics[index];
    if(isNew)index=draft.topics.length;
    dirty=false;$('catalog-notice').textContent='';$('catalog-list-view').hidden=true;$('catalog-detail').hidden=false;
    const container=$('catalog-detail');container.replaceChildren();
    const back=button('← 一覧へ戻る',()=>{if(!mayDiscard())return;dirty=false;render();});
    const form=make('form');form.noValidate=true;
    const status=make('p','','input-error');status.setAttribute('role','alert');status.id='editor-error';
    container.append(back,make('h3',isNew?'カードを追加':'カードの詳細・編集','editor-title'),form);
    function field(title,value,max,set,multiline=false){
      const label=make('label',title,'editor-field');
      const input=make(multiline?'textarea':'input');input.value=value;input.maxLength=max;
      if(multiline)input.rows=3;
      input.addEventListener('input',()=>{dirty=true;set(input.value);});label.append(input);form.append(label);return input;
    }
    const titleInput=field('カード名',topic[0],60,v=>topic[0]=v);titleInput.id='edit-title';
    field('お題の本文',topic[1],600,v=>topic[1]=v,true).id='edit-body';
    field('対象・補足（カードに表示する文章）',topic[2],300,v=>topic[2]=v,true).id='edit-target';
    form.append(make('p','例：対象は引いた人／全員／指名した相手。自動対決の勝敗・対象の計算は「動作」のルールに従います。','note'));
    function selectField(title,values,current,change){
      const label=make('label',title,'editor-field'), select=make('select');
      Object.entries(values).forEach(([v,t])=>{const o=make('option',t);o.value=v;select.append(o);});select.value=current;
      select.addEventListener('change',()=>{dirty=true;change(select.value);});label.append(select);form.append(label);return select;
    }
    selectField('カードの種類',{drink:'飲む系',talk:'飲まない系'},topic[3],v=>topic[3]=v).id='edit-kind';
    selectField('動作',actions,topic[4]||'',v=>{
      topic[4]=v;if(v==='nominate'&&!topic[5])topic[5]='other';renderMode();renderThemes();
    }).id='edit-action';
    const modeArea=make('div'),themesArea=make('section');form.append(modeArea,themesArea);
    function renderMode(){
      modeArea.replaceChildren();if(topic[4]!=='nominate')return;
      const label=make('label','指名した後の動作','editor-field'), select=make('select');select.id='edit-nominate-mode';
      Object.entries({other:'指名した相手が飲む',pair:'引いた人と相手が一緒に乾杯',question:'指名した相手に質問する'}).forEach(([v,t])=>{const o=make('option',t);o.value=v;select.append(o);});select.value=topic[5]||'other';
      select.addEventListener('change',()=>{topic[5]=select.value;dirty=true;renderThemes();});label.append(select);modeArea.append(label);
    }
    function renderThemes(){
      themesArea.replaceChildren();const poolKey=topic[4]==='nominate'&&topic[5]==='question'?'question':topic[4];const meta=poolMeta[poolKey];
      if(!meta){themesArea.append(make('p','この動作にはランダムなテーマ一覧はありません。カード名・本文・対象を編集できます。','note'));return;}
      const rows=draft.pools[poolKey];
      themesArea.append(make('h3',`${meta.label}（${rows.length}件）`,'editor-title'),make('p',`追加・書き換え・削除ができます。抽選に必要なため最低${meta.min}件。空欄と同じテーマの重複は保存できません。`,'note'));
      if(draft.topics.filter(t=>t[4]===topic[4]).length>1||['taste','food'].includes(topic[4]))themesArea.append(make('p','同じ動作を使うカード・ゲーム選択画面でも、このテーマ一覧を共有します。','note'));
      const list=make('div',undefined,'theme-editor-list');list.id='theme-editor-list';
      rows.forEach((row,i)=>{
        const group=make('div',undefined,'theme-edit-row');
        group.append(make('strong',`テーマ ${i+1}`));
        const values=meta.width===1?[row]:row;
        values.forEach((value,j)=>{
          const label=make('label',meta.width===1?'テーマ':['質問','選択肢A','選択肢B'][j]);
          const input=make('input');input.value=value;input.maxLength=150;input.setAttribute('aria-label',`テーマ${i+1} ${meta.width===1?'内容':['質問','選択肢A','選択肢B'][j]}`);
          input.addEventListener('input',()=>{dirty=true;if(meta.width===1)rows[i]=input.value;else rows[i][j]=input.value;});
          label.append(input);group.append(label);
        });
        const remove=button('このテーマを削除',()=>{
          if(rows.length<=meta.min){status.textContent=`${meta.label}は最低${meta.min}件必要です。`;return;}
          rows.splice(i,1);dirty=true;renderThemes();
        },'text-button danger-button');
        group.append(remove);list.append(group);
      });
      themesArea.append(list,button('＋ テーマを追加',()=>{
        if(rows.length>=200){status.textContent='テーマは200件までです。';return;}
        rows.push(meta.width===1?'':['','','']);dirty=true;renderThemes();
        const inputs=themesArea.querySelectorAll('input');inputs[inputs.length-meta.width].focus();
      }));
    }
    renderMode();renderThemes();
    const previewArea=make('div',undefined,'preview-tools');
    const countLabel=make('label','お試しの人数');const count=make('select');count.id='preview-count';
    [2,3,4].forEach(n=>{const o=make('option',`${n}人`);o.value=n;count.append(o);});countLabel.append(count);
    const test=button('このカードを試す',()=>{
      if(saving)return;
      try{
        const candidate=JSON.parse(JSON.stringify(draft));candidate.topics[index]=[...topic];
        EventEngine.preview(candidate,index,Number(count.value),()=>{test.focus({preventScroll:true});});
      }catch(e){status.textContent=e.message;}
    });test.id='card-preview';previewArea.append(countLabel,test,make('p','未保存の編集内容でも試せます。本番の駒・杯数・共有設定は変わりません。','note'));
    form.append(previewArea);
    const save=make('button','変更を保存','primary');save.type='submit';save.id='editor-save';
    form.append(status,save,make('p','保存するとゲームに反映します。共有サーバーに保存し、他の端末にも反映します。','note'));
    if(!isNew)form.append(button('このカードを削除',async()=>{
      if(saving||!window.confirm(`「${draft.topics[index][0]}」を削除しますか？`))return;
      saving=true;form.inert=true;
      const next=EventEngine.editor.getData();next.topics.splice(index,1);
      try{await saveWithBackup(next);dirty=false;render();$('catalog-notice').textContent='カードを削除しました。';}
      catch(e){status.textContent=e.message;}finally{saving=false;form.inert=false;}
    },'text-button danger-button'));
    form.addEventListener('submit',async event=>{
      event.preventDefault();if(!unlocked||saving)return;
      topic[0]=topic[0].trim();topic[1]=topic[1].trim();topic[2]=topic[2].trim();
      draft.topics[index]=topic;
      const candidate=JSON.parse(JSON.stringify(draft));
      for(const [key,meta] of Object.entries(poolMeta))candidate.pools[key]=candidate.pools[key].map(row=>meta.width===1?row.trim():row.map(v=>v.trim()));
      save.disabled=true;saving=true;form.inert=true;
      try{await saveWithBackup(candidate);dirty=false;render();$('catalog-notice').textContent='保存しました。次に引くカードから反映されます。';}
      catch(e){status.textContent=e.message;status.scrollIntoView({block:'nearest'});}
      finally{save.disabled=false;saving=false;form.inert=false;}
    });
    $('catalog-dialog').scrollTop=0;titleInput.focus({preventScroll:true});
  }
  $('catalog-open').addEventListener('click',()=>{lock();$('catalog-dialog').showModal();$('catalog-password').focus();});
  $('catalog-login').addEventListener('submit',async event=>{
    event.preventDefault();
    const loginButton=$('catalog-login').querySelector('button');loginButton.disabled=true;
    try {
      await SharedCatalog.login($('catalog-password').value);
      if(!$('catalog-dialog').open){SharedCatalog.logout();return;}
      unlocked=true;$('catalog-password').value='';$('catalog-error').textContent='';$('catalog-login').hidden=true;$('catalog-unlocked').hidden=false;
      render();$('catalog-notice').textContent=EventEngine.editor.getMessage();$('catalog-filter').focus();
    }catch(e){$('catalog-error').textContent=e.message;$('catalog-password').value='';}
    finally{loginButton.disabled=false;}
  });
  $('catalog-filter').addEventListener('change',render);
  $('catalog-import').addEventListener('change',async event=>{
    const file=event.target.files[0];if(!file||!unlocked||saving)return;
    saving=true;pendingRestore=null;$('restore-review').hidden=true;
    try{
      if(file.size>2*1024*1024)throw Error('ファイルは2MB以下にしてください。');
      const data=JSON.parse(await file.text());
      if(unlocked&&$('catalog-dialog').open)reviewRestore(data,file.name);
    }catch(e){$('catalog-notice').textContent='取り込みできませんでした：'+e.message;}
    finally{saving=false;event.target.value='';}
  });
  function readBackups(){
    try{
      const data=JSON.parse(localStorage.getItem(BACKUP_KEY)||'[]');
      if(!Array.isArray(data))return [];
      return data.filter(v=>v&&typeof v.name==='string'&&v.name.length<=80&&typeof v.id==='string'&&v.data).slice(0,15);
    }catch{return [];}
  }
  function storeBackup(data,name,automatic=false){
    EventEngine.editor.validate(data);
    const all=readBackups();
    if(!automatic&&all.filter(v=>!v.automatic).length>=10)throw Error('名前付きセットは10件までです。不要なセットを削除してください。');
    const entry={id:Date.now().toString(36)+Math.random().toString(36).slice(2),name,automatic,data:JSON.parse(JSON.stringify(data)),savedAt:new Date().toISOString()};
    const next=[entry,...all];let auto=0;
    try{localStorage.setItem(BACKUP_KEY,JSON.stringify(next.filter(v=>!v.automatic||++auto<=5)));}
    catch{throw Error('変更前の設定をこの端末に保存できません。不要なセットを削除するか、ブラウザの保存設定を確認してください。');}
    return entry;
  }
  async function saveWithBackup(data){
    EventEngine.editor.validate(data);
    storeBackup(EventEngine.editor.getData(),'変更前 '+new Date().toLocaleString('ja-JP'),true);
    await EventEngine.editor.save(data);
  }
  function download(data){
    const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
    const a=make('a');a.href=url;a.download='nomi-catalog-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function reviewRestore(data,name){
    pendingRestore=null;$('restore-review').hidden=true;
    EventEngine.editor.validate(data);pendingRestore=JSON.parse(JSON.stringify(data));
    $('restore-summary').textContent=`「${name}」：カード${data.topics.length}枚／テーマ計${Object.values(data.pools).reduce((n,v)=>n+v.length,0)}件。現在のカード${EventEngine.getCatalog().length}枚を置き換えます。変更前の設定は履歴に保存します。`;
    $('restore-titles').replaceChildren(...data.topics.map(t=>make('li',t[0])));
    $('restore-review').hidden=false;$('restore-review').scrollIntoView({block:'nearest'});
  }
  function renderBackups(){
    const list=$('backup-list');list.replaceChildren();
    for(const entry of readBackups()){
      const row=make('div',undefined,'backup-row');row.append(make('strong',entry.name));
      row.append(button('内容を確認',()=>{try{reviewRestore(entry.data,entry.name);}catch(e){$('backup-status').textContent=e.message;}}),button('JSON保存',()=>download(entry.data)),button('削除',()=>{
        if(saving||!window.confirm(`「${entry.name}」をこの端末から削除しますか？`))return;
        try{localStorage.setItem(BACKUP_KEY,JSON.stringify(readBackups().filter(v=>v.id!==entry.id)));renderBackups();}catch{$('backup-status').textContent='削除できませんでした。';}
      }));list.append(row);
    }
    if(!list.children.length)list.append(make('p','まだ保存したセット・履歴はありません。','note'));
  }
  $('catalog-export').addEventListener('click',()=>{if(unlocked)download(EventEngine.editor.getData());});
  $('backup-save').addEventListener('click',()=>{
    if(!unlocked||saving)return;
    try{const name=$('backup-name').value.trim();if(!name)throw Error('セット名を入力してください。');storeBackup(EventEngine.editor.getData(),name);$('backup-name').value='';renderBackups();$('backup-status').textContent='この端末にセットを保存しました。別の端末へ移す場合はJSON保存を使ってください。';}
    catch(e){$('backup-status').textContent=e.message;}
  });
  $('restore-cancel').addEventListener('click',()=>{if(saving)return;pendingRestore=null;$('restore-review').hidden=true;});
  $('restore-apply').addEventListener('click',async()=>{
    if(!unlocked||saving||!pendingRestore)return;
    saving=true;$('catalog-unlocked').inert=true;
    try{await saveWithBackup(pendingRestore);pendingRestore=null;$('restore-review').hidden=true;render();$('catalog-notice').textContent='共有お題を復元しました。他の端末にも反映されます。';}
    catch(e){$('catalog-notice').textContent=e.message;}
    finally{saving=false;$('catalog-unlocked').inert=false;}
  });
  $('catalog-add').addEventListener('click',()=>editCard(null));
  $('catalog-close').addEventListener('click',close);
  $('catalog-dialog').addEventListener('cancel',e=>{e.preventDefault();close();});
  $('catalog-dialog').addEventListener('close',lock);
  lock();boardCount();
})();
