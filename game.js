'use strict';
// 設定とすごろくの進行。お題とミニゲームは events.js に分離。
const GOAL = 30;
const COLORS = ['#ff70c5', '#57e5fa', '#bef36b', '#ffb76b'];
const FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const $ = id => document.getElementById(id);
let players = [];
let current = 0;
let phase = 'setup'; // setup → ready → rolling → landed → ready / finished
let revision = 0; // リセット前のアニメーションが新しいゲームを操作するのを防ぐ
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function renderNameInputs() {
  const previous = Array.from($('names').querySelectorAll('input'), input => input.value);
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
    $('names').append(field);
  }
}

function start(names) {
  revision++;
  EventEngine.reset();
  players = names.map((name, i) => ({name, color: COLORS[i], position: 0, rank: null}));
  current = 0;
  phase = 'ready';
  $('setup').hidden = true;
  $('game').hidden = false;
  $('results').hidden = true;
  $('dice').textContent = FACES[0];
  $('dice').classList.remove('rolling');
  render();
  $('message').textContent = 'サイコロを振ってスタート！';
}

function render() {
  $('board').replaceChildren();
  // 横5マスの折り返しコース。番号順に右→左→右と進む。
  for (let position = 0; position <= GOAL; position++) {
    const row = Math.floor(position / 5);
    const offset = position % 5;
    const cell = document.createElement('div');
    cell.className = 'cell' + (position === 0 || position === GOAL ? ' special' : '') + (players[current].position === position ? ' current' : '');
    cell.style.gridRow = row + 1;
    cell.style.gridColumn = row % 2 === 0 ? offset + 1 : 5 - offset;
    cell.dataset.position = position;
    const label = document.createElement('span');
    label.className = 'cell-label';
    label.textContent = position === 0 ? 'START' : position === GOAL ? 'GOAL' : String(position).padStart(2, '0');
    const direction = document.createElement('span');
    direction.className = 'direction';
    direction.textContent = position === GOAL ? '★' : offset === 4 ? '↓' : row % 2 === 0 ? '→' : '←';
    const tokens = document.createElement('div');
    tokens.className = 'tokens';
    players.forEach((player, i) => {
      if (player.position !== position) return;
      const token = document.createElement('span');
      token.className = 'token';
      token.style.setProperty('--player-color', player.color);
      token.textContent = i + 1;
      token.title = player.name;
      token.setAttribute('aria-label', player.name);
      tokens.append(token);
    });
    const type = EventEngine.tileType(position);
    cell.dataset.type = type;
    cell.append(label, direction, tokens);
    $('board').append(cell);
  }
  $('players').replaceChildren();
  players.forEach((player, i) => {
    const li = document.createElement('li');
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.style.setProperty('--player-color', player.color);
    dot.textContent = i + 1;
    const name = document.createElement('span');
    name.className = 'player-name';
    name.textContent = player.name + (i === current && phase !== 'finished' ? ' ◀' : '');
    const place = document.createElement('span');
    place.className = 'place';
    place.textContent = player.rank ? `${player.rank}位 GOAL` : `${player.position} / ${GOAL}`;
    li.append(dot, name, place);
    $('players').append(li);
  });
  $('turn').textContent = phase === 'finished' ? 'ゲーム終了' : `${players[current].name}の番`;
  $('roll').hidden = phase === 'landed' || phase === 'event' || phase === 'finished';
  $('roll').disabled = phase !== 'ready';
  $('next').hidden = phase !== 'landed';
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
  phase = 'rolling';
  const thisRevision = revision;
  render();
  $('message').textContent = 'サイコロを振っています…';
  $('dice').classList.add('rolling');
  for (let i = 0; i < 8; i++) {
    $('dice').textContent = FACES[Math.floor(Math.random() * 6)];
    await delay(65);
    if (thisRevision !== revision) return;
  }
  const value = Math.floor(Math.random() * 6) + 1;
  $('dice').classList.remove('rolling');
  $('dice').textContent = FACES[value - 1];
  $('dice').setAttribute('aria-label', `サイコロの目：${value}`);
  $('message').textContent = `${value}が出た！`;
  const player = players[current];
  // 出目の数だけ移動。GOALを通過する場合は余った歩数を戻る。
  let direction = 1;
  for (let step = 0; step < value; step++) {
    await delay(150);
    if (thisRevision !== revision) return;
    if (player.position === GOAL) {
      direction = -1;
      $('message').textContent = 'ぴったりではないので、残りの目で折り返し！';
    }
    player.position += direction;
    render();
  }
  onLand(player);
  if (players.every(p => p.rank !== null)) {
    phase = 'finished'; render(); showResults(); return;
  }
  const type = EventEngine.tileType(player.position);
  if (type === 'card') {
    phase = 'event'; render();
    EventEngine.open(type, players, current, () => {
      if (thisRevision !== revision || phase !== 'event') return;
      phase = 'landed'; render();
      $('message').textContent = 'イベント終了！ 次の人に交代しよう。';
      $('next').focus();
    });
  } else {
    phase = 'landed'; render();
  }
}

function showResults() {
  $('ranking').replaceChildren();
  [...players].sort((a, b) => a.rank - b.rank).forEach(player => {
    const li = document.createElement('li');
    li.textContent = `${player.rank === 1 ? '🏆 ' : ''}${player.rank}位　${player.name}`;
    $('ranking').append(li);
  });
  $('results').hidden = false;
  $('results').scrollIntoView({block: 'nearest'});
}

$('setup-form').addEventListener('submit', event => {
  event.preventDefault();
  start(Array.from($('names').querySelectorAll('input'), (input, i) => input.value.trim() || `プレイヤー${i + 1}`));
});
$('count').addEventListener('change', renderNameInputs);
$('roll').addEventListener('click', roll);
$('next').addEventListener('click', () => {
  if (phase !== 'landed') return;
  do { current = (current + 1) % players.length; } while (players[current].rank !== null);
  phase = 'ready';
  render();
  $('message').textContent = 'サイコロを振ってください。';
});
$('reset').addEventListener('click', () => {
  if (!window.confirm('ゲームを終了して、名前登録に戻りますか？')) return;
  revision++;
  EventEngine.reset();
  phase = 'setup';
  $('game').hidden = true;
  $('setup').hidden = false;
});
$('again').addEventListener('click', () => start(players.map(player => player.name)));
renderNameInputs();
