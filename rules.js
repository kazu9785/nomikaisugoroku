const PartyRules=(()=>{
 const defaults={"山手線ゲーム": "① テーマ・順番・答えるテンポを決めます。\n② テーマに合う言葉を1人ずつ答えます。\n③ 同じ答え・テーマ違い・答えに詰まった人が負けです。\n④ 判定後、ゲーム終了ボタンで盤面に戻ります。", "ジャックポット": "数字の板とサイコロを使う遊び方の例です。道具や別のゲームアプリを用意してください。\n① 1〜9の数字をすべて開き、サイコロ2個を振ります。\n② 出目の合計と同じになるよう、開いている数字を1個以上選んで閉じます。\n③ 閉じられなくなるまで繰り返し、残った数字の合計を記録。数字を全部開いて次の人に交代します。\n④ 全員が1回ずつ挑戦し、残りの合計が最大の人が負け。同点は再挑戦。全部閉じたらジャックポット！", "どすこい": "文字と言葉を使う遊び方の例です。\n① 親を決め、親が最初のひらがな1文字を指定します。\n② 合図に合わせ、全員が親指を上げるか下げるか選びます。上がった本数が言葉の文字数です。0本ならやり直します。\n③ 指定された文字で始まり、その文字数に合う言葉を早い者勝ちで答えます。\n④ 最後まで答えられなかった人が負け。使える言葉・小さい文字の数え方は始める前に決めましょう。", "わっしょい": "", "二者択一": "少数派を当てる遊び方の例です。\n① 親が「海か山」など2つの選択肢を出します。\n② 全員が同時にA・Bのどちらかを指や声で示します。\n③ 人数が少ない側が負け。同数・全員同じなら別のお題でやり直します。\n④ 2人のときは少数派が決まらないため、親が相手の答えを先に予想し、当たれば相手・外れれば親の負けにします。", "これ以外でやりたい飲みゲーム": ""};const KEY='nomi-party-rules-v1';let saved={};
 try{const d=JSON.parse(localStorage.getItem(KEY)||'{}');if(d&&typeof d==='object')saved=d;}catch{}
 function text(name){return typeof saved[name]==='string'?saved[name]:defaults[name]||'';}
 function mount(container,name){
  const box=document.createElement('details');box.open=true;const title=document.createElement('summary');title.textContent='遊び方・負けの条件';
  const body=document.createElement('p');body.className='rule-copy';body.textContent=text(name)||'このゲームのルールは未登録です。下の欄に、順番・手順・負けの条件を登録してください。';
  const note=document.createElement('p');note.className='note';note.textContent='ルール例です。いつもの遊び方に変更できます。保存先はこの端末のみです。';
  const editor=document.createElement('details'),label=document.createElement('summary');label.textContent='ルールを編集';
  const input=document.createElement('textarea');input.value=text(name);input.maxLength=3000;input.rows=8;input.setAttribute('aria-label',name+'のルール');input.placeholder='① 順番・準備\n② 遊び方\n③ 負けの条件';
  const save=document.createElement('button');save.type='button';save.className='text-button';save.textContent='この端末にルールを保存';const status=document.createElement('p');status.setAttribute('role','status');
  save.onclick=()=>{const value=input.value.trim();if(!value){status.textContent='ルールを入力してください。';return;}try{const next={...saved,[name]:value};localStorage.setItem(KEY,JSON.stringify(next));saved=next;body.textContent=value;status.textContent='保存しました';editor.open=false;}catch{status.textContent='保存できませんでした。入力内容を控えてください。';}};
  editor.append(label,input,save,status);box.append(title,body,note,editor);container.append(box);
 }
 return {mount};
})();
