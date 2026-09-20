'use strict';
// 外部音源不要のオリジナル電子音。ユーザー操作後だけ再生。
const GameAudio=(()=>{
 let ctx,master,timer=null,beat=0;
 let enabled=true,bgm=false,volume=.35;
 try{const p=JSON.parse(localStorage.getItem('nomi-audio-v1')||'null');if(p){enabled=p.enabled!==false;bgm=p.bgm===true;volume=Math.max(0,Math.min(1,Number(p.volume)||0));}}catch{}
 function save(){try{localStorage.setItem('nomi-audio-v1',JSON.stringify({enabled,bgm,volume}));}catch{}}
 function unlock(){try{if(!ctx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;ctx=new AC();master=ctx.createGain();master.connect(ctx.destination);}master.gain.value=enabled?volume:0;if(ctx.state==='suspended')ctx.resume().catch(()=>{});music();}catch{}}
 function tone(frequency,duration=.12,offset=0,type='sine',level=.16){
  if(!enabled||!ctx||ctx.state!=='running'||document.hidden)return;
  const start=ctx.currentTime+offset,osc=ctx.createOscillator(),g=ctx.createGain();osc.type=type;osc.frequency.value=frequency;
  g.gain.setValueAtTime(.0001,start);g.gain.exponentialRampToValueAtTime(level,start+.012);g.gain.exponentialRampToValueAtTime(.0001,start+duration);
  osc.connect(g);g.connect(master);osc.start(start);osc.stop(start+duration+.03);osc.onended=()=>{osc.disconnect();g.disconnect();};
 }
 function play(kind,n=0){
  if(kind==='tick')tone(220+n*25,.065,0,'triangle',.18);
  if(kind==='step')tone(330+n*35,.10,0,'sine',.22);
  const tunes={tap:[660],start:[262,330,392,523],reveal:[392,523,784],card:[523,659,880],goal:[523,659,784,1047,784,1047],bounce:[440,294]};
  if(tunes[kind])tunes[kind].forEach((f,i)=>tone(f,kind==='goal'?.28:.16,i*.095,'triangle',.22));
 }
 function music(){
  if(timer!==null){clearInterval(timer);timer=null;}
  if(!enabled||!bgm||!ctx||document.hidden)return;
  const notes=[262,330,392,494,440,392,330,294,220,262,330,392,349,330,294,247];
  timer=setInterval(()=>{tone(notes[beat%notes.length],.38,0,'sine',.075);if(beat%4===0)tone(notes[beat%notes.length]/2,.65,0,'triangle',.055);beat++;},360);
 }
 function update(){document.getElementById('sound-toggle').textContent=enabled?'♪ 音 ON':'♪ 音 OFF';document.getElementById('sound-toggle').setAttribute('aria-pressed',String(enabled));document.getElementById('bgm-toggle').textContent=bgm?'BGM ON':'BGM OFF';document.getElementById('bgm-toggle').setAttribute('aria-pressed',String(bgm));}
 document.getElementById('sound-toggle').addEventListener('click',()=>{enabled=!enabled;unlock();update();save();play('tap');});
 document.getElementById('bgm-toggle').addEventListener('click',()=>{bgm=!bgm;if(bgm)enabled=true;unlock();update();save();});
 const slider=document.getElementById('sound-volume');slider.value=Math.round(volume*100);slider.addEventListener('input',()=>{volume=Number(slider.value)/100;unlock();save();});
 document.addEventListener('pointerdown',unlock,{once:true});document.addEventListener('keydown',unlock,{once:true});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){if(timer!==null)clearInterval(timer);timer=null;if(ctx)ctx.suspend().catch(()=>{});}else if(ctx)unlock();});
 update();return {unlock,play};
})();
