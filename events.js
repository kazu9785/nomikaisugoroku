'use strict';
// お題の追加・変更は TOPICS、相性二択のお題は PAIRS を編集します。
const EventEngine = (() => {
  // 各お題は [タイトル, 内容, 対象または補足, 種別]。drink 15個 / talk 16個。5番目の値は起動するゲームID（省略可）。
  const TOPICS = [
    ['ご指名入りました', '引いた人が好きな相手を1人指名。指名された人が飲む番！', '対象：指名された1人', 'drink', 'nominate'],
    ['自分におつかれ！', 'このカードを引いたあなたが飲む番。今日の自分へひとこと言って乾杯！', '対象：引いた人', 'drink'],
    ['乾杯の主役', '引いた人が乾杯のひとことを考えて、みんなで乾杯！', '対象：全員', 'drink'],
    ['相棒を選べ', '引いた人が乾杯したい相手を1人選ぶ。2人で一緒に乾杯！', '対象：引いた人＋選んだ相手', 'drink', 'nominate'],
    ['あなた以外で乾杯', '引いた人は今回お休み。それ以外のメンバーで乾杯！', '対象：引いた人以外', 'drink'],
    ['じゃんけん指名戦', '引いた人が相手を1人選んでじゃんけん。負けた人が飲む番。あいこならもう一度！', '対象：じゃんけんの敗者', 'drink', 'rps'],
    ['右隣へバトンタッチ', '引いた人の右隣に座っている人が飲む番。2人ならもう1人！', '対象：右隣の人', 'drink', 'nominate'],
    ['ほめてご指名', '誰か1人のいいところを伝えてから、その人を乾杯役に指名しよう！', '対象：褒められた相手', 'drink', 'nominate'],
    ['せーので数字', '全員で順番に、画面で1〜3を秘密に選ぼう。引いた人と同じ数字を出した人が飲む番。誰もいなければ引いた人！', '対象：数字が一致した相手／いなければ引いた人', 'drink', 'numbers'],
    ['運命のコイントス', '引いた人が相手を1人選んでから、画面のコインを投げよう。表なら相手、裏なら自分が飲む番！', '対象：コインで決定', 'drink', 'coin'],
    ['あなたのほめられタイム', '引いた人以外の全員が、引いた人のいいところを1つずつ伝えよう！', '引いた人は「ありがとう」で受け取ろう。', 'talk'],
    ['第一印象ビフォーアフター', 'ほかのメンバーが、引いた人の第一印象と今の印象を教えてあげよう！', 'ポジティブな変化や意外な一面を。', 'talk'],
    ['あなたに似合う役', '引いた人が映画の主人公なら、どんな役が似合う？ ほかのメンバーが考えよう！', '探偵・料理人・冒険家など、自由に想像。', 'talk'],
    ['きゅんポイント', '引いた人が、人のどんな仕草や言葉にきゅんとするか話そう！', '恋愛でも、日常のちょっとした優しさでもOK。', 'talk'],
    ['理想のデートプラン', '引いた人が、行ってみたいデートのプランを発表！', '相手の名前は出さなくてOK。', 'talk'],
    ['質問はひとつだけ', '引いた人は、好きな相手1人に聞いてみたいことを1つ質問できる！', '答えにくい質問は別のお題に変更しよう。', 'talk', 'nominate'],
    ['意外な一面', '引いた人が、みんなにまだ話していない趣味・特技・こだわりを1つ発表！', '小さなことでもOK。', 'talk'],
    ['あなたのキャッチコピー', 'ほかのメンバーが相談して、引いた人のキャッチコピーを考えよう！', '本人がうれしくなる紹介文にしよう。', 'talk'],
    ['次のお出かけ会議', '引いた人が、このメンバーで次にやってみたいことを提案！', '旅行・ごはん・ゲーム大会など何でも。', 'talk'],
    ['ありがとうを受け取って', 'ほかのメンバーが、引いた人に感謝していることや、助かったことを1つずつ伝えよう！', '初対面なら今日うれしかったことを。', 'talk'],
    ['好きな飲みゲームで勝負', '引いた人が、アプリ内のゲームから1つ選んで勝負しよう。負けた人が飲む番！', '画面でゲームを選択して開始', 'drink', 'free'],
    ['10秒ストップ対決', '全員で順番に10秒ストップ！ 10秒から最も遠かった人が飲む番。下のボタンでゲームを開始。', '画面内でプレイ・結果を自動判定', 'drink', 'timer'],
    ['金庫破りで勝負', '全員で交互に数字を選んで、隠れたハズレを避けよう。ハズレを引いた人が飲む番！', '画面内でプレイ・結果を自動判定', 'drink', 'safe'],
    ['山手線ゲーム', 'ランダムで出たテーマで山手線ゲーム！ 負けた人が飲む番。', '画面にはテーマを表示', 'drink', 'food'],
    ['相手の好みを当てろ', '引いた人が相手を1人選び「甘い／しょっぱい」のどちらが好きか予想。答えを決めてもらってから予想を発表！ 当たれば相手、外れたら自分が飲む番。', '画面で秘密の回答・予想・自動判定', 'drink', 'taste'],
    ['相性二択チャレンジ', '相手1人を選んで3問に秘密で回答。どれだけ同じ答えになるか試そう！ 結果を見ながら理由も話してみて。', '画面内でプレイ・飲まないお題', 'talk', 'pairs'],
    ['ジェスチャー・映画館', '引いた人だけがお題を見て、声なしのジェスチャーで表現。ほかの人は何の動きか当てよう！', '秘密のお題表示・20秒タイマー付き', 'talk', 'gesture'],
    ['お絵描き・理想の休日', 'アプリのキャンバスに、引いた人が理想の休日を絵だけで描こう。ほかのメンバーは何をして過ごす休日か当てて！', '指・マウスで描画・30秒タイマー付き', 'talk', 'drawing'],
    ['ほめ言葉リレー', '引いた人以外が順番に、その人のいいところを1つずつ言おう。同じ褒め言葉は使わず1周！', '引いた人は、最後にみんなへお礼をひとこと', 'talk', 'praise'],
    ['以心伝心チャレンジ', '引いた人が「おにぎりの具」「デートの行き先」「夏の風物詩」からお題を選ぶ。画面で順番に秘密の答えを入力し、一斉公開！ 最大3回で全員一致を目指そう。', '画面内でテーマ選択・秘密の入力・一斉公開', 'talk', 'sync'],
    ['誰のエピソード？', '3つのテーマから1つ選ぼう。2人なら本当か作り話か、3〜4人なら誰の話かを予想！', '画面内で入力・予想・答え合わせ', 'talk', 'story']
  ];
  const PAIRS = [
    ['初デートなら？', '水族館', '遊園地'], ['休日の過ごし方は？', 'お出かけ', 'おうちでのんびり'],
    ['旅行するなら？', '温泉でゆっくり', '街で食べ歩き'], ['連絡するなら？', 'メッセージ', '電話'],
    ['好きな人に気持ちを伝えるなら？', '自分から', '相手を待つ'], ['映画を見るなら？', '恋愛・コメディ', 'アクション・ホラー'],
    ['旅行の計画は？', '事前にしっかり', '現地で気分次第'], ['うれしいプレゼントは？', '形に残るもの', '一緒に過ごす体験'],
    ['夜食はどっち？', '甘いもの', 'しょっぱいもの'], ['待ち合わせは？', '早めに到着', 'ぴったりに到着'],
    ['一緒に料理するなら？', '得意料理を披露', '初めての料理に挑戦'], ['気になる人と話すなら？', '聞くほう', '話すほう']
  ];
  let members = [], owner = 0, done = null, serial = 0;
  let drinkBag = [], talkBag = [], pairBag = [];
  const el = id => document.getElementById(id);
  const shuffle = values => {
    const array = [...values];
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };
  function tileType(position) {
    if (position === 0 || position === 30) return 'special';
    return 'card';
  }
  function node(tag, text, cls) {
    const n = document.createElement(tag);
    if (text !== undefined) n.textContent = text;
    if (cls) n.className = cls;
    return n;
  }
  function button(text, action, cls = 'primary') {
    const n = node('button', text, cls); n.type = 'button';
    const token = serial;
    n.addEventListener('click', () => { if (token === serial && done) action(n); });
    return n;
  }
  function screen(title, description) {
    stopClock();
    el('event-title').textContent = title;
    el('event-description').textContent = description;
    el('event-content').replaceChildren(); el('event-actions').replaceChildren();
    el('event-dialog').scrollTop = 0;
  }
  function focusFirst() {
    const control = el('event-content').querySelector('button, input') || el('event-actions').querySelector('button');
    if (control) control.focus({preventScroll: true});
  }
  function finish() {
    if (!done) return;
    stopClock();
    const callback = done; done = null; serial++;
    el('event-dialog').close(); callback();
  }
  function reset() {
    stopClock();
    serial++; done = null; drinkBag = []; talkBag = []; pairBag = [];
    if (el('event-dialog').open) el('event-dialog').close();
  }
  function result(title, description, toast, details = []) {
    screen(title, description);
    if (details.length) {
      const list = node('ul', undefined, 'score-list');
      details.forEach(text => list.append(node('li', text)));
      el('event-content').append(list);
    }
    el('event-content').append(node('p', toast, 'toast-result'));
    el('event-actions').append(button('終了して盤面に戻る →', finish)); focusFirst();
  }
  function open(type, players, current, callback) {
    serial++; members = players; owner = current; done = callback;
    el('event-label').textContent = 'PICK A CARD / お題マス';
    cards();
    el('event-dialog').showModal(); focusFirst();
  }
  function cards() {
    screen(`${members[owner].name}、1枚選んで！`, '6枚の裏向きカードから、気になる1枚をタップ。何が出るかは開いてからのお楽しみ。');
    // 毎回、飲む系3枚＋飲まない系3枚を混ぜる。裏面は全て同じ。
    function draw(kind, count) {
      const bag = kind === 'drink' ? drinkBag : talkBag;
      const picked = [];
      while (picked.length < count) {
        if (!bag.length) bag.push(...shuffle(TOPICS.filter(t => t[3] === kind && !picked.includes(t))));
        picked.push(bag.pop());
      }
      return picked;
    }
    const hand = shuffle([...draw('drink', 3), ...draw('talk', 3)]);
    const grid = node('div', undefined, 'card-grid');
    let selected = false;
    hand.forEach((topic, i) => {
      const card = button('', () => {
        if (selected) return; selected = true;
        Array.from(grid.children).forEach(other => { other.disabled = true; });
        card.classList.add('revealed');
        card.setAttribute('aria-label', `選んだカード：${topic[0]}`);
        card.replaceChildren(node('span', topic[3] === 'drink' ? '♠' : '♥', 'card-suit'), node('strong', topic[0]), node('span', 'OPEN', 'card-index'));
        // 選んだカードの内容は大きく下に表示。残り5枚は裏向きのまま。
        const detail = node('div', undefined, 'revealed-topic');
        detail.append(node('span', topic[3] === 'drink' ? 'DRINK / 飲む系' : 'TALK / 飲まない系', 'eyebrow'), node('h3', topic[0]), node('p', topic[1]), node('p', topic[2], 'toast-result'));
        el('event-content').append(detail);
        if (topic[4]) {
          el('event-actions').append(button('このお題を始める →', () => {
            el('event-label').textContent = 'CARD CHALLENGE / お題カードの対決';
            const games = {timer:timerIntro, safe:safeIntro, pairs:pairIntro, story:storyIntro, nominate:()=>nominateIntro(topic), rps:rpsIntro, numbers:numberIntro, coin:coinIntro, free:freeGameIntro, food:foodIntro, taste:tasteIntro, gesture:gestureIntro, drawing:drawingIntro, praise:praiseIntro, sync:syncIntro};
            games[topic[4]](); focusFirst();
          }));
        } else {
          el('event-actions').append(button('お題おわり！ →', finish));
        }
        el('event-actions').querySelector('button').focus({preventScroll:true});
        detail.scrollIntoView({block:'nearest'});
      }, 'playing-card');
      card.setAttribute('aria-label', `裏向きのカード${i + 1}を選ぶ`);
      card.append(node('span', '✦', 'card-corner'), node('span', '♠', 'card-emblem'), node('span', `CARD 0${i + 1}`, 'card-index'));
      grid.append(card);
    });
    el('event-content').append(grid);
  }
  function participantOrder() {
    // ゴールした人もイベントには参加し、待ち時間を減らします。
    return members.map((_, i) => (owner + i) % members.length);
  }
  function timerIntro() {
    screen('10秒ストップ対決', '全員が順番に挑戦！ スタート後は数字が見えません。10秒だと思ったらストップ。結果は全員が終わってから発表。');
    el('event-content').append(node('div', '10.00', 'big-number'));
    el('event-actions').append(button('挑戦する →', () => timerTurn(participantOrder(), [], 0)));
  }
  function timerTurn(order, scores, turn) {
    const index = order[turn];
    screen(`${members[index].name}の挑戦`, `${turn + 1} / ${order.length}人目。端末を受け取って、準備ができたらスタート！`);
    const display = node('div', '10.00', 'big-number'); el('event-content').append(display);
    let began = null, locked = false;
    el('event-actions').append(button('スタート', b => {
      if (locked) return;
      if (began === null) {
        began = performance.now(); display.textContent = '？.？？';
        el('event-description').textContent = '自分の感覚で10秒を数えよう。'; b.textContent = 'ストップ！';
      } else {
        locked = true;
        const seconds = Math.round((performance.now() - began) / 10) / 100;
        scores.push({index, seconds, difference:Math.abs(Math.round(seconds * 100) - 1000)});
        if (turn + 1 < order.length) {
          screen('記録したよ！', `結果は最後に発表。${members[order[turn + 1]].name}に端末を渡してください。`);
          el('event-actions').append(button('受け取った →', () => timerTurn(order, scores, turn + 1))); focusFirst();
        } else {
          const worst = Math.max(...scores.map(s => s.difference));
          const last = scores.filter(s => s.difference === worst).map(s => members[s.index].name);
          result('タイムを発表！', '10秒との差が小さいほど好成績。同じ差は同順位です。', `${last.join('・')}：10秒から最も遠かった人に乾杯のお題`, [...scores].sort((a,b)=>a.difference-b.difference).map(s=>`${members[s.index].name}：${s.seconds.toFixed(2)}秒（差 ${(s.difference/100).toFixed(2)}秒）`));
        }
      }
    })); focusFirst();
  }
  function pairIntro() {
    screen('相性二択チャレンジ', `${members[owner].name}と、相手ひとりが挑戦。3問にこっそり回答して、どれだけ一致するか答え合わせ！ 相手を選んでね。`);
    const grid = node('div', undefined, 'choice-grid');
    members.forEach((p,i)=>{if(i!==owner)grid.append(button(p.name,()=>{
      if(pairBag.length<3) pairBag=shuffle(PAIRS);
      pairHandoff([owner,i],pairBag.splice(0,3),[[],[]],0);
    },'choice-button'));});
    el('event-content').append(grid);
  }
  function pairHandoff(team, questions, answers, turn) {
    screen(`${members[team[turn]].name}に端末を渡してね`, '相手は画面を見ずに待っていてね。3問の回答は最後まで秘密！');
    el('event-actions').append(button('自分だけで画面を見る →',()=>pairQuestion(team,questions,answers,turn,0)));focusFirst();
  }
  function pairQuestion(team, questions, answers, turn, q) {
    screen(questions[q][0], `${members[team[turn]].name}の回答 · ${q+1} / 3問`);
    const grid=node('div',undefined,'choice-grid'); let locked=false;
    [1,2].forEach(choice=>grid.append(button(questions[q][choice],()=>{
      if(locked)return;locked=true;answers[turn].push(choice);
      if(q<2) pairQuestion(team,questions,answers,turn,q+1);
      else if(turn===0) pairHandoff(team,questions,answers,1);
      else {
        const matches=answers[0].filter((v,i)=>v===answers[1][i]).length;
        result(`${matches} / 3問 一致！`, matches===3?'息ぴったり！ どの答えが一番意外だった？':'違いも話のタネに。どうしてそっちを選んだ？','飲まないお題：お互いの答えを見て、理由も話してみよう！',questions.map((question,i)=>`${question[0]} ${members[team[0]].name}：${question[answers[0][i]]} ／ ${members[team[1]].name}：${question[answers[1][i]]}`));
      }
    },'choice-button')));el('event-content').append(grid);focusFirst();
  }
  function safeIntro() {
    screen('金庫破り', '全員で順番に1〜30の数字を選ぼう。隠れたハズレに向かって範囲が狭まります。ハズレを当てたら決着！');
    el('event-content').append(node('div','01 — 30','big-number'));
    el('event-actions').append(button('挑戦する →',()=>safeTurn({low:1,high:30,secret:Math.floor(Math.random()*30)+1,order:participantOrder(),turn:0})));
  }
  function safeTurn(state) {
    const index=state.order[state.turn % state.order.length];
    screen(`${members[index].name}の番`, `${state.low}〜${state.high}から数字をタップ。どこまで避けられる？`);
    const grid=node('div',undefined,'number-grid');let locked=false;
    for(let n=state.low;n<=state.high;n++)grid.append(button(String(n),()=>{
      if(locked)return;locked=true;
      if(n===state.secret){result('金庫が開いた！',`ハズレは「${n}」。${members[index].name}が引き当てました。`,`${members[index].name}に乾杯のお題`);return;}
      if(n<state.secret)state.low=n+1;else state.high=n-1;
      state.turn++;
      screen('セーフ！', `次の範囲は${state.low}〜${state.high}。${members[state.order[state.turn%state.order.length]].name}に交代。`);
      el('event-actions').append(button('次の人へ →',()=>safeTurn(state)));focusFirst();
    },'number-button'));
    el('event-content').append(grid);focusFirst();
  }
  // エピソードカード：テーマは3候補。2人と3〜4人で自動的に分岐。
  const STORY_THEMES = [
    '最近やってしまった小さな失敗', '人にきゅんとした出来事',
    '初対面で勘違いされたこと', '小さい頃、本気で信じていたこと',
    '今なら笑える恥ずかしかった出来事', 'みんなが知らなそうな自分の経験',
    '学校やバイト先で起きた面白い出来事', '誰かにしてもらってうれしかったこと',
    '偶然すぎてびっくりした出来事', '自分では普通だと思っていた変わった習慣'
  ];
  function storyIntro() {
    screen(`${members[owner].name}、テーマを選ぼう！`, members.length === 2
      ? '2人用「本当？ 作り話？」。カードを引いた人が話を入力し、相手が本当か作り話かを当てます。'
      : '3〜4人用「誰のエピソード？」。全員が同じテーマで秘密の話を入力。ランダムな1件について、誰の話か当てます。');
    const grid = node('div', undefined, 'theme-grid'); let selected = false;
    shuffle(STORY_THEMES).slice(0, 3).forEach(theme => {
      grid.append(button(theme, () => {
        if (selected) return; selected = true;
        const state = {theme, order:participantOrder(), entries:[], guesses:[], turn:0};
        storyHandoff(state);
      }, 'choice-button'));
    });
    el('event-content').append(grid); focusFirst();
  }
  function storyHandoff(state) {
    const index = state.order[state.turn];
    screen(`${members[index].name}に端末を渡してね`, `テーマ：${state.theme}。ほかの人は画面を見ずに待っていてね。`);
    el('event-actions').append(button('受け取った・入力する →', () => storyInput(state)));
    focusFirst();
  }
  function storyInput(state) {
    const index = state.order[state.turn];
    screen(`${members[index].name}の秘密の入力`, `テーマ：${state.theme}`);
    const label = node('label', members.length === 2 ? '本当の話でも、作り話でもOK（120文字まで）' : '自分のエピソードを入力（120文字まで・名前は書かないでね）');
    label.htmlFor = 'story-text';
    const input = node('textarea'); input.id = 'story-text'; input.maxLength = 120; input.rows = 4;
    input.setAttribute('autocomplete', 'off'); input.setAttribute('spellcheck','false');
    input.placeholder = '短い一文でもOK！';
    const error = node('p', '', 'input-error'); error.setAttribute('role', 'alert');
    el('event-content').append(label, input, error);
    let submitted = false;
    function submit(truth) {
      if (submitted) return;
      const text = input.value.trim();
      if (!text) { error.textContent = 'エピソードを入力してね。'; input.focus(); return; }
      if (text.length > 120) { error.textContent = '120文字以内にしてね。'; input.focus(); return; }
      submitted = true;
      state.entries.push({index, text, truth}); input.value = '';
      if (members.length === 2) {
        state.selected = state.entries[0]; state.turn = 1; storyGuessHandoff(state);
      } else if (++state.turn < state.order.length) {
        storyHandoff(state);
      } else {
        state.selected = state.entries[Math.floor(Math.random() * state.entries.length)];
        state.turn = 0; storyGuessHandoff(state);
      }
    }
    if (members.length === 2) {
      el('event-description').textContent += ' 入力した話の正解を選んで保存。相手にはまだ見せないでね。';
      const choices = node('div', undefined, 'choice-grid');
      choices.append(button('本当の話として保存', () => submit(true), 'choice-button'), button('作り話として保存', () => submit(false), 'choice-button'));
      el('event-actions').append(choices);
    } else {
      el('event-actions').append(button('秘密で保存して次へ →', () => submit(null)));
    }
    input.focus();
  }
  function storyGuessHandoff(state) {
    const index = state.order[state.turn];
    screen(`${members[index].name}に端末を渡してね`, members.length === 2
      ? '入力した内容と正解を隠しました。相手のエピソードを読んで予想しよう！'
      : '入力・予想は隠しています。全員が順番に予想します。自分の話が出たら自分を選んでね（得点対象外）。');
    el('event-actions').append(button('受け取った・予想する →', () => storyGuess(state)));
    focusFirst();
  }
  function storyGuess(state) {
    const index = state.order[state.turn];
    screen(members.length === 2 ? '本当？ それとも作り話？' : 'これは誰のエピソード？', `${members[index].name}の予想 · テーマ：${state.theme}`);
    el('event-content').append(node('blockquote', state.selected.text, 'story-quote'));
    const choices = node('div', undefined, 'choice-grid'); let submitted = false;
    function guess(answer) {
      if (submitted) return; submitted = true;
      state.guesses.push({index, answer});
      if (members.length === 2 || ++state.turn === state.order.length) storyResult(state);
      else storyGuessHandoff(state);
    }
    if (members.length === 2) choices.append(button('本当の話！', () => guess(true), 'choice-button'),button('作り話！', () => guess(false), 'choice-button'));
    else members.forEach((p,i)=>choices.append(button(p.name,()=>guess(i),'choice-button')));
    el('event-content').append(choices); focusFirst();
  }
  function storyResult(state) {
    const author = members[state.selected.index].name;
    if (members.length === 2) {
      const g = state.guesses[0], correct = g.answer === state.selected.truth;
      result(correct ? '見抜いた！ 正解！' : '残念！ 予想ははずれ！',
        `正解は「${state.selected.truth ? '本当の話' : '作り話'}」。テーマ：${state.theme}`,
        'どこが本当っぽかった？ 話の続きも聞いてみよう！',
        [`${author}の話：${state.selected.text}`, `${members[g.index].name}の予想：${g.answer ? '本当の話' : '作り話'}`]);
    } else {
      const voters = state.guesses.filter(g=>g.index !== state.selected.index);
      const correct = voters.filter(g=>g.answer === state.selected.index).length;
      result(`${author}のエピソードでした！`, `${voters.length}人中${correct}人が正解！ テーマ：${state.theme}`,
        '意外だったところや、話の続きも聞いてみよう！',
        [state.selected.text, ...voters.map(g=>`${members[g.index].name} → ${members[g.answer].name}：${g.answer === state.selected.index ? '正解！' : 'はずれ'}`)]);
    }
  }

  let liveClock = null;
  function stopClock() { if (liveClock !== null) clearInterval(liveClock); liveClock = null; }
  function countdown(seconds, display, expired) {
    stopClock();
    const end = performance.now() + seconds * 1000;
    const token = serial;
    display.textContent = `${seconds}秒`;
    liveClock = setInterval(() => {
      if (token !== serial || !done) { stopClock(); return; }
      const left = Math.max(0, Math.ceil((end-performance.now())/1000));
      display.textContent = `${left}秒`;
      if (!left) { stopClock(); expired(); }
    }, 100);
  }
  function choosePartner(title, callback) {
    screen(title, `${members[owner].name}が相手を選んでね。`);
    const grid = node('div', undefined, 'choice-grid'); let selected = false;
    members.forEach((p,i)=> {if(i!==owner) grid.append(button(p.name,()=>{
      if(selected)return; selected=true; callback(i);
    },'choice-button'));});
    el('event-content').append(grid); focusFirst();
  }
  function nominateIntro(topic) {
    choosePartner(topic[0], other => result('相手が決まりました！',topic[1],
      topic[0] === '相棒を選べ' ? `${members[owner].name}と${members[other].name}で乾杯！`
      : topic[0] === '質問はひとつだけ' ? `${members[other].name}に質問しよう！`
      : `${members[other].name}が飲む番！`));
  }
  function coinIntro() {
    choosePartner('コイントスの相手を選ぼう', other => {
      screen('運命のコイントス', `表なら${members[other].name}、裏なら${members[owner].name}が飲む番。`);
      const coin = node('div','？','coin-disc'); el('event-content').append(coin);
      const status = node('p','','toast-result'); status.setAttribute('role','status');
      el('event-content').append(status); let tossed=false;
      el('event-actions').append(button('コインを投げる', b=>{
        if(tossed)return;tossed=true;b.disabled=true;
        const heads=Math.random()<.5;coin.textContent=heads?'表':'裏';coin.classList.add('coin-flipped');
        status.textContent=`${members[heads?other:owner].name}が飲む番！`;
        el('event-actions').append(button('結果を確認して戻る →',finish));
      }));focusFirst();
    });
  }
  // 秘密の選択は毎回引き渡し画面を挟む。前の回答を残さない。
  function secretChoices(order, title, options, complete, answers=[], turn=0) {
    screen(`${members[order[turn]].name}に端末を渡してね`,title+'。ほかの人に見えないように選ぼう。');
    el('event-actions').append(button('受け取った →',()=>{
      screen(title,`${members[order[turn]].name}の選択`);
      const grid=node('div',undefined,'choice-grid');let locked=false;
      options.forEach((option,i)=>grid.append(button(option,()=>{
        if(locked)return;locked=true;answers.push(i);
        if(turn+1===order.length)complete(answers);
        else secretChoices(order,title,options,complete,answers,turn+1);
      },'choice-button')));
      el('event-content').append(grid);focusFirst();
    }));focusFirst();
  }
  function rpsIntro() { choosePartner('じゃんけんの相手を選ぼう',rpsRound); }
  function rpsRound(other) {
    const hands=['✊ グー','✌ チョキ','✋ パー'];
    secretChoices([owner,other],'じゃんけんの手を選ぼう',hands,answers=>{
      const details=[`${members[owner].name}：${hands[answers[0]]}`,`${members[other].name}：${hands[answers[1]]}`];
      if(answers[0]===answers[1]) {
        screen('あいこ！',details.join(' ／ '));
        el('event-actions').append(button('もう一度勝負 →',()=>rpsRound(other)));focusFirst();
      } else {
        const winner=(answers[0]+1)%3===answers[1]?owner:other;
        const loser=winner===owner?other:owner;
        result(`${members[winner].name}の勝ち！`,'じゃんけんの結果',`${members[loser].name}が飲む番！`,details);
      }
    });
  }
  function numberIntro() {
    const order=participantOrder();
    secretChoices(order,'1〜3の数字を選ぼう',['1','2','3'],answers=>{
      const same=order.filter((id,i)=>i>0&&answers[i]===answers[0]);
      const targets=same.length?same:[owner];
      result('せーので、公開！',same.length?'引いた人と同じ数字だった相手はこちら！':'同じ数字の相手がいなかったので、引いた人！',
        `${targets.map(i=>members[i].name).join('・')}が飲む番！`,order.map((id,i)=>`${members[id].name}：${answers[i]+1}`));
    });
  }
  function tasteIntro() {
    choosePartner('好みを当てる相手を選ぼう',other=>{
      secretChoices([other],'自分の本当の好みは？',['甘いもの','しょっぱいもの'],truth=>{
        secretChoices([owner],`${members[other].name}の好みを予想！`,['甘いもの','しょっぱいもの'],guess=>{
          const correct=truth[0]===guess[0];
          result(correct?'正解！':'はずれ！',`${members[other].name}の好みは「${truth[0]===0?'甘いもの':'しょっぱいもの'}」`,`${members[correct?other:owner].name}が飲む番！`);
        });
      });
    });
  }
  function freeGameIntro() {
    screen('好きなゲームを選ぼう',`${members[owner].name}が選択。すべてこの画面で遊べます。`);
    const grid=node('div',undefined,'choice-grid');
    [['10秒ストップ',timerIntro],['金庫破り',safeIntro],['じゃんけん',rpsIntro],['山手線ゲーム',foodIntro],['好み当て',tasteIntro]].forEach(([name,fn])=>grid.append(button(name,fn,'choice-button')));
    el('event-content').append(grid);focusFirst();
  }
  const YAMANOTE_THEMES = [
    '食べ物', '飲み物', 'コンビニで買えるもの', 'お菓子', '果物',
    '野菜', '動物', '都道府県', '国の名前', 'スポーツ',
    'アニメ・漫画のタイトル', '映画のタイトル', '曲のタイトル', '有名人',
    '学校にあるもの', '夏といえば', '冬といえば', 'デートで行く場所',
    '居酒屋のメニュー', 'カタカナの言葉'
  ];
  function foodIntro() {
    const theme = YAMANOTE_THEMES[Math.floor(Math.random() * YAMANOTE_THEMES.length)];
    screen('山手線ゲーム', '今回のテーマ');
    el('event-content').append(node('div', theme, 'yamanote-theme'));
    el('event-actions').append(button('ゲーム終了・盤面に戻る →', finish));
    focusFirst();
  }
  function gestureIntro() {
    screen(`${members[owner].name}だけ画面を見てね`,'ほかの人は画面を見ずに待っていてね。準備ができたらお題を表示。');
    el('event-actions').append(button('お題を見る →',()=>{
      const theme=shuffle(['映画館でポップコーンをこぼした人','寝坊して急いで準備する人','釣った魚が大きすぎた人','熱いラーメンを食べる人','遊園地で怖がる人'])[0];
      screen('ジェスチャーのお題',theme);
      el('event-actions').append(button('お題を隠して20秒スタート',()=>{
        screen('何のジェスチャー？',`${members[owner].name}が声を使わずに表現！ みんなで答えを言おう。`);
        const clock=node('div','20秒','big-number');el('event-content').append(clock);
        el('event-actions').append(button('当たった・答え合わせ',()=>result('答え合わせ',theme,'みんなに拍手！')));
        countdown(20,clock,()=>result('時間です！',theme,'どこが難しかった？ みんなで答え合わせ！'));
      }));focusFirst();
    }));focusFirst();
  }
  function praiseIntro() {
    const order=participantOrder().slice(1);
    function turn(i) {
      if(i===order.length){result('ほめ言葉リレー完了！',`${members[owner].name}から、みんなへお礼をひとこと。`,'拍手！');return;}
      screen(`${members[order[i]].name}の番`,`${members[owner].name}のいいところを、前の人と違う言葉でひとつ！ ${i+1} / ${order.length}人目`);
      el('event-actions').append(button('伝えた・次へ →',()=>turn(i+1)));focusFirst();
    }
    turn(0);
  }
  function syncIntro(round=1) {
    screen('以心伝心チャレンジ',`${round} / 3回目。${members[owner].name}がお題を選ぼう。全員が秘密で入力して、最後に同時公開！`);
    const grid=node('div',undefined,'theme-grid');
    ['おにぎりの具','デートの行き先','夏の風物詩'].forEach(theme=>grid.append(button(theme,()=>syncInput(theme,round,[],0),'choice-button')));
    el('event-content').append(grid);focusFirst();
  }
  function syncInput(theme,round,answers,turn) {
    const order=participantOrder(),index=order[turn];
    screen(`${members[index].name}に端末を渡してね`,'前の答えは隠しています。');
    el('event-actions').append(button('受け取った →',()=>{
      screen(theme,`${members[index].name}の答え（30文字まで）`);
      const input=node('input');input.maxLength=30;input.setAttribute('aria-label','答え');input.setAttribute('autocomplete','off');
      const error=node('p','','input-error');error.setAttribute('role','alert');el('event-content').append(input,error);let locked=false;
      el('event-actions').append(button('秘密で保存 →',()=>{
        if(locked)return;
        const value=input.value.trim();if(!value||value.length>30){error.textContent='1〜30文字で入力してね。';return;}
        locked=true;answers.push(value);input.value='';
        if(turn+1<order.length){syncInput(theme,round,answers,turn+1);return;}
        screen('せーので、公開！',`${theme} · ${round} / 3回目`);
        const list=node('ul',undefined,'score-list');answers.forEach((a,i)=>list.append(node('li',`${members[order[i]].name}：${a}`)));el('event-content').append(list);
        const normalize=s=>s.normalize('NFKC').replace(/\s/g,'').toLowerCase();
        const same=answers.every(a=>normalize(a)===normalize(answers[0]));
        el('event-content').append(node('p',same?'全員一致！':'表記が違っても意味が同じなら「一致」を選んでね。','toast-result'));
        el('event-actions').append(button('一致！ 終了して戻る →',finish));
        if(!same)el('event-actions').append(button(round<3?'不一致・次のお題へ →':'不一致・3回終了 →',round<3?()=>syncIntro(round+1):finish,'text-button'));
        focusFirst();
      }));input.focus();
    }));focusFirst();
  }
  function drawingIntro() {
    screen('お絵描き・理想の休日',`${members[owner].name}が画面に指やマウスで描こう。制限30秒。描き終わったら、ほかの人が何をする休日か予想！`);
    el('event-actions').append(button('キャンバスを開く →',drawingCanvas));
  }
  function drawingCanvas() {
    screen('理想の休日を描こう！','色・太さを選んで、指やマウスで描けます。');
    const toolbar=node('div',undefined,'drawing-toolbar');
    const canvas=node('canvas');canvas.id='drawing-canvas';canvas.width=900;canvas.height=600;
    canvas.setAttribute('aria-label','お絵描きキャンバス。指やマウスで描いてください');
    const ctx=canvas.getContext('2d');
    if(!ctx){result('キャンバスを開けませんでした','このブラウザーでは描画機能が使えません。','別のブラウザーで開いてください。');return;}
    let color='#22243b',width=6,strokes=[],active=null,pointer=null,ended=false;
    function repaint() {
      ctx.fillStyle='#fffaf4';ctx.fillRect(0,0,900,600);
      strokes.forEach(stroke=>{
        ctx.strokeStyle=stroke.color;ctx.fillStyle=stroke.color;ctx.lineWidth=stroke.width;ctx.lineCap='round';ctx.lineJoin='round';
        const points=stroke.points;if(!points.length)return;
        if(points.length===1){ctx.beginPath();ctx.arc(points[0].x,points[0].y,stroke.width/2,0,Math.PI*2);ctx.fill();}
        else {ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);points.slice(1).forEach(p=>ctx.lineTo(p.x,p.y));ctx.stroke();}
      });
    }
    function point(e){const r=canvas.getBoundingClientRect();return{x:Math.max(0,Math.min(900,(e.clientX-r.left)*900/r.width)),y:Math.max(0,Math.min(600,(e.clientY-r.top)*600/r.height))};}
    function endStroke(){if(pointer!==null&&canvas.hasPointerCapture(pointer))canvas.releasePointerCapture(pointer);active=null;pointer=null;}
    ['#22243b','#e44891','#277fa8','#31956c'].forEach((c,i)=>{
      const b=button(['黒','ピンク','青','緑'][i],()=>{color=c;Array.from(toolbar.children).filter(x=>x.dataset.color).forEach(x=>x.setAttribute('aria-pressed',String(x===b)));},'tool-button');b.dataset.color=c;b.style.borderColor=c;b.setAttribute('aria-pressed',String(i===0));toolbar.append(b);
    });
    const thickness=node('select');thickness.setAttribute('aria-label','線の太さ');
    [['3','細い'],['6','ふつう'],['14','太い']].forEach(([v,t])=>{const o=node('option',t);o.value=v;thickness.append(o);});thickness.value='6';thickness.addEventListener('change',()=>{width=Number(thickness.value);});
    toolbar.append(thickness,button('戻す',()=>{endStroke();strokes.pop();repaint();},'tool-button'),button('全消し',()=>{endStroke();strokes=[];repaint();},'tool-button'));
    const clock=node('p','30秒','drawing-clock');
    el('event-content').append(toolbar,clock,canvas);repaint();
    canvas.addEventListener('pointerdown',e=>{
      if(ended||pointer!==null||e.button!==0)return;e.preventDefault();
      pointer=e.pointerId;canvas.setPointerCapture(pointer);active={color,width,points:[point(e)]};strokes.push(active);repaint();
    });
    canvas.addEventListener('pointermove',e=>{if(!active||e.pointerId!==pointer||ended)return;e.preventDefault();active.points.push(point(e));repaint();});
    ['pointerup','pointercancel','lostpointercapture'].forEach(name=>canvas.addEventListener(name,e=>{if(e.pointerId===pointer)endStroke();}));
    function reveal(){
      if(ended)return;ended=true;stopClock();endStroke();toolbar.hidden=true;
      canvas.style.touchAction='auto';clock.textContent='完成！';
      el('event-title').textContent='これはどんな休日？';el('event-description').textContent='みんなで絵を見て予想しよう。描いた人が最後に答えを教えてね。';
      el('event-actions').replaceChildren(button('答え合わせできた！ →',finish));focusFirst();
    }
    el('event-actions').append(button('描き終わった・公開する →',reveal));countdown(30,clock,reveal);
  }

  el('event-skip').addEventListener('click', finish);
  el('event-dialog').addEventListener('cancel', event => {event.preventDefault();finish();});
  return {tileType,open,reset};
})();
