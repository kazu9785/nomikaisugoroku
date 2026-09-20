'use strict';
// スマホではタップ完了時にも再試行し、resume()完了後に音を鳴らす。
const GameAudio=(()=>{
 let ctx,master,timer=null,beat=0,generation=0;
 let enabled=true,bgm=false,volume=.35;
 const $=id=>document.getElementById(id);
 try{const p=JSON.parse(localStorage.getItem('nomi-audio-v1')||'null');if(p){enabled=p.enabled!==false;bgm=p.bgm===true;const v=Number(p.volume);if(Number.isFinite(v))volume=Math.max(0,Math.min(1,v));}}catch{}
 const status=text=>{if($('audio-status'))$('audio-status').textContent=text;};
 function save(){try{localStorage.setItem('nomi-audio-v1',JSON.stringify({enabled,bgm,volume}));}catch{}}
 function stopMusic(){if(timer!==null)clearInterval(timer);timer=null;}
 function music(){
  if(!enabled||!bgm||!ctx||ctx.state!=='running'||document.hidden){stopMusic();return;}
  if(timer!==null)return;
  const notes=[262,330,392,494,440,392,330,294,220,262,330,392,349,330,294,247];
  timer=setInterval(()=>{tone(notes[beat%notes.length],.38,0,'sine',.075);if(beat%4===0)tone(notes[beat%notes.length]/2,.65,0,'triangle',.055);beat++;},360);
 }
 function updateStatus(){
  if(!enabled)status('音はOFFです');
  else if(volume===0)status('音量が0です');
  else if(ctx?.state==='running')status('音声の準備OK');
  else status('「音を再開・テスト」をタップして音を有効にできます');
 }
 function unlock(){
  if(!enabled||document.hidden){music();return Promise.resolve(false);}
  try{
   if(!ctx||ctx.state==='closed'){
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC){status('このブラウザでは音を利用できません');return Promise.resolve(false);}
    ctx=new AC();master=ctx.createGain();master.connect(ctx.destination);
    ctx.addEventListener('statechange',()=>{music();updateStatus();});
   }
   master.gain.value=enabled?volume:0;
   const active=ctx;
   // suspended以外に、iOSで割り込みを受けたinterrupted状態からも復帰。
   const resumed=active.state==='running'?Promise.resolve():active.resume();
   return Promise.resolve(resumed).then(()=>{
    if(active!==ctx||document.hidden||!enabled)return false;
    music();updateStatus();return active.state==='running';
   }).catch(()=>{updateStatus();return false;});
  }catch{status('音を開始できませんでした。もう一度テストをタップしてください');return Promise.resolve(false);}
 }
 function tone(frequency,duration=.12,offset=0,type='sine',level=.16){
  if(!enabled||!ctx||ctx.state!=='running'||document.hidden||volume===0)return;
  try{
   const start=ctx.currentTime+offset,osc=ctx.createOscillator(),g=ctx.createGain();osc.type=type;osc.frequency.value=frequency;
   g.gain.setValueAtTime(.0001,start);g.gain.exponentialRampToValueAtTime(level,start+.012);g.gain.exponentialRampToValueAtTime(.0001,start+duration);
   osc.connect(g);g.connect(master);osc.start(start);osc.stop(start+duration+.03);osc.onended=()=>{osc.disconnect();g.disconnect();};
  }catch{updateStatus();}
 }
 async function play(kind,n=0){
  if(!enabled||document.hidden)return;
  const started=Date.now(),version=generation;
  if(!await unlock()||version!==generation||Date.now()-started>900)return;
  if(kind==='tick')tone(220+n*25,.065,0,'triangle',.18);
  if(kind==='step')tone(330+n*35,.10,0,'sine',.22);
  const tunes={tap:[660],start:[262,330,392,523],reveal:[392,523,784],card:[523,659,880],goal:[523,659,784,1047,784,1047],bounce:[440,294]};
  if(tunes[kind])tunes[kind].forEach((f,i)=>tone(f,kind==='goal'?.28:.16,i*.095,'triangle',.22));
 }
 function update(){
  $('sound-toggle').textContent=enabled?'♪ 音 ON':'♪ 音 OFF';$('sound-toggle').setAttribute('aria-pressed',String(enabled));
  $('bgm-toggle').textContent=bgm?'BGM ON':'BGM OFF';$('bgm-toggle').setAttribute('aria-pressed',String(bgm));updateStatus();
 }
 $('sound-toggle').addEventListener('click',()=>{enabled=!enabled;generation++;if(master)master.gain.value=enabled?volume:0;unlock();update();save();if(enabled)play('tap');});
 $('bgm-toggle').addEventListener('click',()=>{bgm=!bgm;if(bgm)enabled=true;unlock();music();update();save();});
 const slider=$('sound-volume');slider.value=Math.round(volume*100);slider.addEventListener('input',()=>{volume=Number(slider.value)/100;if(master)master.gain.value=enabled?volume:0;unlock();update();save();});
 $('sound-test').addEventListener('click',()=>{enabled=true;if(volume===0){volume=.35;slider.value=35;}generation++;update();save();play('reveal');});
 // pointerdown一度きりだと、タップ完了時に再生許可される端末で再試行できない。
 for(const event of ['pointerup','touchend','click','keydown'])document.addEventListener(event,()=>{unlock();},{capture:true,passive:true});
 function pause(){generation++;stopMusic();if(ctx&&ctx.state!=='closed')ctx.suspend().catch(()=>{});}
 document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();else if(ctx)unlock();});
 window.addEventListener('pagehide',pause);window.addEventListener('pageshow',()=>{if(ctx)unlock();});
 update();return {unlock,play};
})();
