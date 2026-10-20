'use strict';
// 設定とすごろくの進行。お題とミニゲームは events.js に分離。
const GOAL = 30;
const COLORS = ['#ff70c5', '#57e5fa', '#bef36b', '#ffb76b'];
const AVATARS = ['♟','🐈','👑','🚀','🍸','🎲','👻','⭐'];
const $ = id => document.getElementById(id);
let players = [];
let current = 0;
let phase = 'setup'; // setup → ready → rolling → landed → ready / finished
let pendingRoll = null, turnBannerTimer = null;
let revision = 0; // リセット前のアニメーションが新しいゲームを操作するのを防ぐ
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function renderNameInputs() {
  const previous = Array.from($('names').querySelectorAll('input'), input => input.value);
  const looks=Array.from($('names').querySelectorAll('.name-field'),f=>({icon:f.querySelector('.avatar-select').value,color:f.querySelector('.color-select').value}));
  $('names').replaceChildren();
  for (let i = 0; i < Number($('count').value); i++) {
    const label = document.createElement('label');
    label.htmlFor = `name-${i}`;
    label.textContent = `プレイヤー ${i + 1}`;
    const input = document.createElement('input');
    input.id = label.htmlFor;
    input.maxLength = 12;
    input.placeholder = `プレイヤー${i + 1}`;
    input.value = previous[i] || '';
    const field = document.createElement('div');
    field.className = 'name-field';
    field.append(label, input);
    const preview=document.createElement('span');preview.className='avatar-preview';preview.setAttribute('aria-hidden','true');
    const icon=document.createElement('select');icon.className='avatar-select';icon.setAttribute('aria-label',`プレイヤー${i+1}の駒`);
    AVATARS.forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v;icon.append(o);});icon.value=looks[i]?.icon||AVATARS[i];
    const color=document.createElement('select');color.className='color-select';color.setAttribute('aria-label',`プレイヤー${i+1}の色`);
    COLORS.forEach((v,k)=>{const o=document.createElement('option');o.value=v;o.textContent=['ピンク','シアン','ライム','オレンジ'][k];color.append(o);});color.value=looks[i]?.color||COLORS[i];
    const refreshLook=()=>{preview.textContent=icon.value;preview.style.setProperty('--player-color',color.value);};icon.addEventListener('change',refreshLook);color.addEventListener('change',refreshLook);refreshLook();
    const controls=document.createElement('div');controls.className='avatar-controls';controls.append(preview,icon,color);field.append(controls);
    $('names').append(field);
  }
}

function start(names) {
  revision++;
  pendingRoll=null;hideTurnBanner();
  cancelCharge();closeCelebration();
  EventEngine.reset();
  players = names.map((name, i) => ({name, color: $('names').querySelectorAll('.color-select')[i]?.value||COLORS[i], icon:$('names').querySelectorAll('.avatar-select')[i]?.value||AVATARS[i], drinks:0, position: 0, rank: null}));
  current = 0;
  phase = 'ready';
  $('setup').hidden = true;
  $('game').hidden = false;
  $('results').hidden = true;
  $('resume-panel').hidden = true;
  document.body.classList.add('is-playing');
  document.body.classList.remove('is-finished');
  $('game-settings').open = false;
  $('players').dataset.active = '';
  window.scrollTo(0,0);
  buildBoard();
  setDice(1);
  $('dice-caption').textContent='LUCK IS ROLLING';
  $('dice').classList.remove('dice-reveal');
  GameAudio.unlock();GameAudio.play('start');
  $('dice').classList.remove('rolling');
  render();
  $('message').textContent = 'サイコロを振ってスタート！';
  announceTurn();
}

// 外周24マスから内側へ。座標は [列, 行]。
const ROUTE=[];
for(let x=0;x<5;x++)ROUTE.push([x,0]);
for(let y=1;y<9;y++)ROUTE.push([4,y]);
for(let x=3;x>=0;x--)ROUTE.push([x,8]);
for(let y=7;y>=1;y--)ROUTE.push([0,y]);
ROUTE.push([1,1],[2,1],[3,1],[3,2],[3,3],[3,4],[3,5]);
const reducedMotion=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function setDice(value){
 const patterns=[[4],[0,8],[0,4,8],[0,2,6,8],[0,2,4,6,8],[0,2,3,5,6,8]];
 $('dice').replaceChildren();
 for(let i=0;i<9;i++){const pip=document.createElement('i');pip.className='pip'+(patterns[value-1].includes(i)?' visible':'');pip.setAttribute('aria-hidden','true');$('dice').append(pip);}
 $('dice').setAttribute('aria-label',`サイコロの目：${value}`);
}
function buildBoard(){
 $('board').replaceChildren();
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
 svg.setAttribute('viewBox','0 0 500 900');svg.setAttribute('preserveAspectRatio','none');svg.classList.add('route-lines');svg.setAttribute('aria-hidden','true');
 const points=ROUTE.map(([x,y])=>`${x*100+50},${y*100+50}`).join(' ');
 for(const cls of ['route-glow','route-core','route-flow']){const line=document.createElementNS(ns,'polyline');line.setAttribute('points',points);line.setAttribute('class',cls);svg.append(line);}
 $('board').append(svg);
 const hub=document.createElement('div');hub.className='board-hub';hub.innerHTML='<span class="hub-orbit" aria-hidden="true">✦</span><small>FOLLOW YOUR LUCK</small><strong>NEON<br>NIGHT</strong><span>外周から内側へ<br>ぴったり30でゴール</span>';$('board').append(hub);
 ROUTE.forEach(([x,y],position)=>{
  const cell=document.createElement('div');cell.className='cell'+(position===0||position===GOAL?' special':'');cell.style.gridColumn=x+1;cell.style.gridRow=y+1;cell.dataset.position=position;cell.dataset.type=EventEngine.tileType(position);
  cell.style.setProperty('--tile-color',position===GOAL?'#ffd778':position<10?'#ff70c5':position<20?'#57e5fa':'#b99aff');
  const label=document.createElement('span');label.className='cell-label';label.textContent=position===0?'START':position===GOAL?'GOAL':String(position).padStart(2,'0');
  const arrow=document.createElement('span');arrow.className='direction';const next=ROUTE[position+1];arrow.textContent=!next?'★':next[0]>x?'→':next[0]<x?'←':next[1]>y?'↓':'↑';
  const tokens=document.createElement('div');tokens.className='tokens';cell.append(label,arrow,tokens);$('board').append(cell);
 });
}
function render() {
 if(!$('board').querySelector('.cell'))buildBoard();
 $('board').querySelectorAll('.cell').forEach(cell=>{
  const position=Number(cell.dataset.position);cell.classList.toggle('current',players[current].position===position);
  cell.classList.toggle('goal-near',position===GOAL && players.some(p=>!p.rank&&GOAL-p.position<=5));
  const tokens=cell.querySelector('.tokens');tokens.replaceChildren();
  players.forEach((player,i)=>{if(player.position!==position)return;const token=document.createElement('span');token.className='token'+(i===current&&phase==='rolling'?' hopping':'');token.classList.toggle('near-goal',!player.rank&&GOAL-player.position<=5);token.style.setProperty('--player-color',player.color);token.textContent=player.icon;token.dataset.playerNumber=i+1;token.title=player.name;token.setAttribute('aria-label',player.name);tokens.append(token);});
 });
  const playerScroll = $('players').scrollLeft;
  $('players').replaceChildren();
  players.forEach((player, i) => {
    const li = document.createElement('li');
    li.classList.toggle('active-player', i === current && phase !== 'finished');
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.style.setProperty('--player-color', player.color);
    dot.textContent = player.icon;dot.dataset.playerNumber=i+1;
    const name = document.createElement('span');
    name.className = 'player-name';
    name.textContent = player.name + (i === current && phase !== 'finished' ? ' ◀' : '');
    const place = document.createElement('span');
    place.className = 'place';
    place.textContent = player.rank ? `${player.rank}位 GOAL` : `あと${GOAL-player.position}マス`;
    li.append(dot, name, place, drinkControl(i));
    $('players').append(li);
  });
  $('players').scrollLeft = playerScroll;
  if ($('players').dataset.active !== String(current)) {
    $('players').dataset.active = String(current);
    if (window.matchMedia('(max-width:600px)').matches) {
      const item = $('players').children[current];
      if (item) $('players').scrollLeft += item.getBoundingClientRect().left - $('players').getBoundingClientRect().left;
    }
  }
  document.body.classList.toggle('is-finished', phase === 'finished');
  $('turn').textContent = phase === 'finished' ? 'ゲーム終了' : `${players[current].name}の番`;
  $('roll').hidden = phase === 'landed' || phase === 'event' || phase === 'finished';
  $('roll').disabled = !['ready','charging'].includes(phase);
  $('power-panel').hidden = !['ready','charging','rolling'].includes(phase);
  $('next').hidden = phase !== 'landed';
  $('catalog-open').disabled = phase === 'rolling' || phase === 'charging' || phase === 'event';
  saveGame();
}

// 到着・順位の処理。イベント完了まで次のプレイヤーには進めません。
function onLand(player) {
  if (player.position === GOAL) {
    player.rank = players.filter(p => p.rank !== null).length + 1;
    $('message').textContent = `${player.name}が${player.rank}位でゴール！`;
  } else {
    $('message').textContent = `${player.position}マス目に到着！`;
  }
}

async function roll() {
  if (phase !== 'ready') return;
  cancelCharge();
  hideTurnBanner();
  const value = Math.floor(Math.random() * 6) + 1;
  const raw=players[current].position+value;
  pendingRoll={value,position:raw>GOAL?GOAL-(raw-GOAL):raw};
  phase = 'rolling';
  const thisRevision = revision;
  render();
  $('message').textContent = 'サイコロを振っています…';
  GameAudio.unlock();
  $('dice').classList.remove('dice-reveal');
  $('dice').classList.add('rolling');
  $('dice-caption').textContent='ROLLING…';
  for (let i = 0; i < 16; i++) {
    setDice(Math.floor(Math.random() * 6)+1);GameAudio.play('tick',i);
    await delay(reducedMotion()?35:45+i*i*.9);
    if (thisRevision !== revision) return;
  }
  $('dice').classList.remove('rolling');
  setDice(value);
  $('dice').classList.add('dice-reveal');
  $('dice-caption').textContent=`${value} STEPS!`;
  GameAudio.play('reveal');
  $('dice').setAttribute('aria-label', `サイコロの目：${value}`);
  $('message').textContent = `${value}が出た！`;
  await delay(reducedMotion()?100:650);
  if(thisRevision!==revision)return;
  const player = players[current];
  // 出目の数だけ移動。GOALを通過する場合は余った歩数を戻る。
  let direction = 1;
  for (let step = 0; step < value; step++) {
    await delay(reducedMotion()?90:270);
    if (thisRevision !== revision) return;
    if (player.position === GOAL) {
      direction = -1;GameAudio.play('bounce');
      $('message').textContent = 'ぴったりではないので、残りの目で折り返し！';
    }
    player.position += direction;
    GameAudio.play('step',step);
    render();
  }
  const destination=$('board').querySelector(`[data-position="${player.position}"]`);
  destination.classList.remove('landed-glow');void destination.offsetWidth;destination.classList.add('landed-glow');
  onLand(player);pendingRoll=null;
  phase=player.position===GOAL?(players.every(p=>p.rank!==null)?'finished':'landed'):'event';saveGame();
  phase='rolling';GameAudio.play(player.position===GOAL?'goal':'card');
  if(player.position===GOAL){await celebrate(player);if(thisRevision!==revision)return;}
  await delay(reducedMotion()?100:550);
  if(thisRevision!==revision)return;
  if (players.every(p => p.rank !== null)) {
    phase = 'finished'; render(); showResults(); return;
  }
  const type = EventEngine.tileType(player.position);
  if (type === 'card') {
    phase = 'event'; render();
    openGameEvent();
  } else {
    phase = 'landed'; render();
  }
}

function showResults() {
  $('ranking').replaceChildren();
  [...players].sort((a, b) => a.rank - b.rank).forEach(player => {
    const li = document.createElement('li');
    li.textContent = `${player.rank === 1 ? '🏆 ' : ''}${player.rank}位　${player.icon} ${player.name}　`;
    const cups=document.createElement('span');cups.className='result-drinks';cups.dataset.drinkCount=players.indexOf(player);cups.textContent=`${player.drinks}杯`;li.append(cups);
    $('ranking').append(li);
  });
  $('results').hidden = false;
  $('results').scrollIntoView({block: 'nearest'});
}

let chargeFrame=null,chargeStarted=0,chargePointer=null,chargeKey=null,celebrationDone=null;
function cancelCharge(){if(chargeFrame!==null)cancelAnimationFrame(chargeFrame);chargeFrame=null;chargePointer=null;chargeKey=null;$('power-fill').style.width='0%';$('power-value').textContent='0%';$('power-meter').setAttribute('aria-valuenow','0');$('roll').classList.remove('charging');}
function beginCharge(){
 if(phase!=='ready')return;phase='charging';chargeStarted=performance.now();GameAudio.unlock();GameAudio.play('tap');render();$('roll').classList.add('charging');
 function frame(now){if(phase!=='charging')return;const wave=((now-chargeStarted)%2200)/1100;const power=Math.round((wave<=1?wave:2-wave)*100);$('power-fill').style.width=power+'%';$('power-value').textContent=power+'%';$('power-meter').setAttribute('aria-valuenow',power);chargeFrame=requestAnimationFrame(frame);}chargeFrame=requestAnimationFrame(frame);
}
function releaseCharge(){if(phase!=='charging')return;const power=Number($('power-meter').getAttribute('aria-valuenow'));cancelCharge();phase='ready';$('dice').style.setProperty('--throw-speed',`${.30-power*.0012}s`);roll();}
function drinkControl(index){
 const wrap=document.createElement('div');wrap.className='drink-control';const p=players[index];
 const minus=document.createElement('button');minus.type='button';minus.className='cup-minus';minus.textContent='−';minus.setAttribute('aria-label',`${p.name}の杯数を1減らす`);
 const count=document.createElement('output');count.dataset.drinkCount=index;count.textContent=`${p.drinks}杯`;count.setAttribute('aria-live','polite');
 const plus=document.createElement('button');plus.type='button';plus.textContent='＋';plus.setAttribute('aria-label',`${p.name}の杯数を1増やす`);
 minus.disabled=p.drinks===0;minus.addEventListener('click',()=>changeDrinks(index,-1));plus.addEventListener('click',()=>changeDrinks(index,1));wrap.dataset.drinkControl=index;wrap.append(minus,count,plus);return wrap;
}
function changeDrinks(index,delta){
 const p=players[index];if(!p||!Number.isInteger(delta))return;p.drinks=Math.max(0,p.drinks+delta);
 document.querySelectorAll(`[data-drink-count="${index}"]`).forEach(n=>n.textContent=`${p.drinks}杯`);
 document.querySelectorAll(`[data-drink-control="${index}"] .cup-minus`).forEach(n=>n.disabled=p.drinks===0);
 saveGame();
}
function renderEventDrinks(){
 $('event-drink-counts').replaceChildren();players.forEach((p,i)=>{const row=document.createElement('div');row.className='event-drink-row';const name=document.createElement('span');name.textContent=`${p.icon} ${p.name}`;row.append(name,drinkControl(i));$('event-drink-counts').append(row);});
}
function closeCelebration(){if($('goal-dialog').open)$('goal-dialog').close();$('confetti').replaceChildren();if(celebrationDone){const done=celebrationDone;celebrationDone=null;done();}}
function celebrate(player){
 $('goal-title').textContent=`${player.rank}位でゴール！`;$('goal-person').textContent=player.name;$('goal-avatar').textContent=player.icon;$('goal-dialog').style.setProperty('--winner-color',player.color);
 $('goal-drinks').replaceChildren();const label=document.createElement('p');label.textContent='ここまで飲んだ杯数';$('goal-drinks').append(label,drinkControl(players.indexOf(player)));
 $('confetti').replaceChildren();if(!reducedMotion())for(let i=0;i<42;i++){const piece=document.createElement('i');piece.style.setProperty('--x',`${(i*37)%100}%`);piece.style.setProperty('--delay',`${(i%7)*.08}s`);piece.style.background=COLORS[i%COLORS.length];$('confetti').append(piece);}
 $('goal-dialog').showModal();$('goal-continue').focus();return new Promise(resolve=>{celebrationDone=resolve;});
}
$('goal-continue').addEventListener('click',closeCelebration);$('goal-dialog').addEventListener('cancel',e=>{e.preventDefault();closeCelebration();});
$('setup-form').addEventListener('submit', event => {
  event.preventDefault();
  if(!SharedCatalog.isReady())return;
  if(readSavedGame()&&!window.confirm('前回のゲーム記録を置き換えて、新しく始めますか？'))return;
  start(Array.from($('names').querySelectorAll('input'), (input, i) => input.value.trim() || `プレイヤー${i + 1}`));
});
$('count').addEventListener('change', renderNameInputs);
// マウス・タッチは押して離す。キーボードもSpace/Enterの長押しに対応。
$('roll').addEventListener('pointerdown',e=>{if(e.button!==0||!e.isPrimary||phase!=='ready')return;e.preventDefault();$('roll').setPointerCapture(e.pointerId);chargePointer=e.pointerId;beginCharge();});
$('roll').addEventListener('pointerup',e=>{if(e.pointerId!==chargePointer)return;e.preventDefault();chargePointer=null;releaseCharge();});
$('roll').addEventListener('pointercancel',()=>{cancelCharge();if(phase==='charging'){phase='ready';render();}});
$('roll').addEventListener('lostpointercapture',()=>{if(chargePointer!==null){chargePointer=null;cancelCharge();if(phase==='charging'){phase='ready';render();}}});
$('roll').addEventListener('keydown',e=>{if(![' ','Enter'].includes(e.key))return;e.preventDefault();if(!e.repeat&&phase==='ready'){chargeKey=e.key;beginCharge();}});
$('roll').addEventListener('keyup',e=>{if(e.key!==chargeKey)return;e.preventDefault();chargeKey=null;releaseCharge();});
$('roll').addEventListener('click',e=>{if(e.detail===0&&phase==='ready')roll();});
function abandonCharge(){cancelCharge();if(phase==='charging'){phase='ready';render();}}
window.addEventListener('blur',abandonCharge);document.addEventListener('visibilitychange',()=>{if(document.hidden)abandonCharge();});
$('roll').addEventListener('blur',()=>{if(chargeKey)abandonCharge();});
$('next').addEventListener('click', () => {
  if (phase !== 'landed') return;
  do { current = (current + 1) % players.length; } while (players[current].rank !== null);
  phase = 'ready';
  GameAudio.play('tap');
  $('dice-caption').textContent='YOUR LUCK, YOUR TURN';
  render();
  $('message').textContent = 'サイコロを振ってください。';
  announceTurn();
});
$('reset').addEventListener('click', () => {
  if (!window.confirm('ゲームを終了して、名前登録に戻りますか？')) return;
  revision++;
  pendingRoll=null;hideTurnBanner();
  cancelCharge();closeCelebration();
  EventEngine.reset();
  clearSavedGame();
  phase = 'setup';
  document.body.classList.remove('is-playing','is-finished');
  $('game').hidden = true;
  $('setup').hidden = false;
  $('catalog-open').disabled = false;
});
$('again').addEventListener('click', () => start(players.map(player => player.name)));
renderNameInputs();

// Reserve the actual dock height, including wrapped names and safe-area padding.
const mobileControls = document.querySelector('.controls');
new ResizeObserver(() => {
  document.documentElement.style.setProperty('--controls-height', `${mobileControls.getBoundingClientRect().height}px`);
}).observe(mobileControls);


// Resume only durable game checkpoints; secret answers and drawings never enter storage.
const GAME_SAVE_KEY='nomi-game-session-v1';
function readSavedGame(){
  try{
    const raw=localStorage.getItem(GAME_SAVE_KEY);if(!raw)return null;
    if(raw.length>250000)throw Error('size');
    const d=JSON.parse(raw);
    if(d.version!==1||!Array.isArray(d.players)||d.players.length<2||d.players.length>4||!Number.isInteger(d.current)||d.current<0||d.current>=d.players.length||!['ready','landed','event','finished'].includes(d.phase))throw Error('format');
    d.players.forEach(p=>{if(typeof p.name!=='string'||!p.name.trim()||p.name.length>12||!COLORS.includes(p.color)||!AVATARS.includes(p.icon)||!Number.isInteger(p.position)||p.position<0||p.position>GOAL||!Number.isSafeInteger(p.drinks)||p.drinks<0||!(p.rank===null||Number.isInteger(p.rank)&&p.rank>=1&&p.rank<=d.players.length)||((p.position===GOAL)!==(p.rank!==null)))throw Error('player');});
    const ranks=d.players.filter(p=>p.rank!==null).map(p=>p.rank).sort((a,b)=>a-b);
    if(ranks.some((r,i)=>r!==i+1)||(d.phase==='finished')!==(ranks.length===d.players.length)||(['ready','event'].includes(d.phase)&&d.players[d.current].rank!==null))throw Error('rank');
    if(d.event){
      if(d.phase!=='event'||!Array.isArray(d.event.hand)||d.event.hand.length<1||d.event.hand.length>6||!(d.event.selected===null||Number.isInteger(d.event.selected)&&d.event.selected>=0&&d.event.selected<d.event.hand.length)||!(d.event.roulette===null||Number.isInteger(d.event.roulette)&&d.event.roulette>=0&&d.event.roulette<d.players.length&&d.event.roulette!==d.current)||typeof d.event.rouletteRecorded!=='boolean')throw Error('event');
      EventEngine.editor.validate({...EventEngine.editor.getData(),topics:d.event.hand});
    }
    return d;
  }catch{return null;}
}
function saveGame(){
  if(phase==='setup'||players.length<2||EventEngine.isPreview())return false;
  try{
    const savedPlayers=players.map(p=>({...p}));
    let savedPhase=phase==='charging'?'ready':phase, event=null;
    if(pendingRoll){
      const p=savedPlayers[current];p.position=pendingRoll.position;
      if(p.position===GOAL&&p.rank===null)p.rank=savedPlayers.filter(v=>v.rank!==null).length+1;
      savedPhase=savedPlayers.every(p=>p.rank!==null)?'finished':p.rank!==null?'landed':'event';
    }else if(phase==='rolling'){
      savedPhase=savedPlayers.every(p=>p.rank!==null)?'finished':savedPlayers[current].rank!==null?'landed':'event';
    }else if(phase==='event')event=EventEngine.getCheckpoint();
    const data={version:1,savedAt:new Date().toISOString(),players:savedPlayers,current,phase:savedPhase,event};
    localStorage.setItem(GAME_SAVE_KEY,JSON.stringify(data));
    $('save-status').textContent='この端末に自動保存済み';return true;
  }catch{$('save-status').textContent='この端末に保存できません。再開するにはブラウザの保存設定や空き容量を確認してください。';return false;}
}
function refreshResume(){
  const d=readSavedGame();$('resume-panel').hidden=!d;
  if(d)$('resume-info').textContent=`${d.players.map(p=>p.name).join('・')} ／ ${d.phase==='finished'?'結果を表示':d.players[d.current].name+'の番'}`;
}
function clearSavedGame(){try{localStorage.removeItem(GAME_SAVE_KEY);}catch{}$('resume-panel').hidden=true;}
function openGameEvent(saved=null){
  const token=revision;
  EventEngine.open('card',players,current,()=>{
    if(token!==revision||phase!=='event')return;
    phase='landed';render();$('message').textContent='イベント終了！ 次の人に交代しよう。';$('next').focus();
  },saved);
}
function hideTurnBanner(){clearTimeout(turnBannerTimer);$('turn-banner').hidden=true;}
function announceTurn(){
  const p=players[current];hideTurnBanner();
  $('turn-avatar').textContent=p.icon;$('turn-announcement').textContent=`次は${p.name}の番！`;
  $('turn-banner').style.setProperty('--turn-color',p.color);$('turn-banner').hidden=false;
  turnBannerTimer=setTimeout(hideTurnBanner,1800);
}
$('resume-game').addEventListener('click',()=>{
  const d=readSavedGame();if(!d){refreshResume();return;}
  revision++;cancelCharge();closeCelebration();EventEngine.reset();pendingRoll=null;
  players=d.players;current=d.current;phase=d.phase;
  $('setup').hidden=true;$('game').hidden=false;$('resume-panel').hidden=true;$('results').hidden=true;
  document.body.classList.add('is-playing');$('game-settings').open=false;$('players').dataset.active='';
  setDice(1);$('dice').classList.remove('rolling','dice-reveal');$('dice-caption').textContent='RESUMED';
  buildBoard();render();GameAudio.unlock();
  $('message').textContent=phase==='event'?'前回のお題を再開します。':phase==='landed'?'移動済みの位置から再開。次の人に交代しよう。':'前回の続きから再開！';
  if(phase==='event')openGameEvent(d.event);else if(phase==='finished')showResults();else announceTurn();
});
$('pause-game').addEventListener('click',()=>{
  if(!saveGame())return;
  revision++;pendingRoll=null;cancelCharge();closeCelebration();hideTurnBanner();EventEngine.reset();
  phase='setup';$('game').hidden=true;$('setup').hidden=false;$('catalog-open').disabled=false;
  document.body.classList.remove('is-playing','is-finished');refreshResume();window.scrollTo(0,0);
});
$('discard-game').addEventListener('click',()=>{if(window.confirm('保存したゲームの進行を削除しますか？ お題設定は残ります。'))clearSavedGame();});
window.addEventListener('pagehide',saveGame);
document.addEventListener('visibilitychange',()=>{if(document.hidden)saveGame();});
refreshResume();
