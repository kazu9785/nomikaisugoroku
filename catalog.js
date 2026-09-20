'use strict';
// 静的アプリの簡易ロック。編集データは共有サーバーに保存します。
(() => {
  const $ = id => document.getElementById(id);
  let unlocked = false, dirty = false, saving = false;
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
    unlocked=false;dirty=false;SharedCatalog.logout();
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
    boardCount();
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
    const save=make('button','変更を保存','primary');save.type='submit';save.id='editor-save';
    form.append(status,save,make('p','保存するとゲームに反映します。共有サーバーに保存し、他の端末にも反映します。','note'));
    if(!isNew)form.append(button('このカードを削除',async()=>{
      if(saving||!window.confirm(`「${draft.topics[index][0]}」を削除しますか？`))return;
      saving=true;form.inert=true;
      const next=EventEngine.editor.getData();next.topics.splice(index,1);
      try{await EventEngine.editor.save(next);dirty=false;render();$('catalog-notice').textContent='カードを削除しました。';}
      catch(e){status.textContent=e.message;}finally{saving=false;form.inert=false;}
    },'text-button danger-button'));
    form.addEventListener('submit',async event=>{
      event.preventDefault();if(!unlocked||saving)return;
      topic[0]=topic[0].trim();topic[1]=topic[1].trim();topic[2]=topic[2].trim();
      draft.topics[index]=topic;
      const candidate=JSON.parse(JSON.stringify(draft));
      for(const [key,meta] of Object.entries(poolMeta))candidate.pools[key]=candidate.pools[key].map(row=>meta.width===1?row.trim():row.map(v=>v.trim()));
      save.disabled=true;saving=true;form.inert=true;
      try{await EventEngine.editor.save(candidate);dirty=false;render();$('catalog-notice').textContent='保存しました。次に引くカードから反映されます。';}
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
    if(!window.confirm('ファイルの内容で、全端末の共有お題を置き換えますか？')){event.target.value='';return;}
    saving=true;
    try{
      if(file.size>2*1024*1024)throw Error('ファイルは2MB以下にしてください。');
      const data=JSON.parse(await file.text());await EventEngine.editor.save(data);render();$('catalog-notice').textContent='以前のお題を共有サーバーへ移しました。';
    }catch(e){$('catalog-notice').textContent='取り込みできませんでした：'+e.message;}
    finally{saving=false;event.target.value='';}
  });
  $('catalog-add').addEventListener('click',()=>editCard(null));
  $('catalog-close').addEventListener('click',close);
  $('catalog-dialog').addEventListener('cancel',e=>{e.preventDefault();close();});
  $('catalog-dialog').addEventListener('close',lock);
  lock();boardCount();
})();
