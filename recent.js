/* Device-local least-recently-shown ordering. */
'use strict';
const RecentTopics=(()=>{
 const KEY='nomi-recent-topics-v1';let history={};
 try{const d=JSON.parse(localStorage.getItem(KEY)||'{}');if(d&&typeof d==='object'&&!Array.isArray(d))history=d;}catch{}
 const key=v=>JSON.stringify(v);
 function remember(group,values){
  let old=Array.isArray(history[group])?history[group].filter(v=>typeof v==='string'):[];
  for(const value of values){const id=key(value);old=old.filter(v=>v!==id);old.push(id);}
  history[group]=old.slice(-500);
  try{localStorage.setItem(KEY,JSON.stringify(history));}catch{}
 }
 function order(group,values){
  const old=Array.isArray(history[group])?history[group]:[];
  const unique=[...new Map(values.map(v=>[key(v),v])).values()];
  for(let i=unique.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[unique[i],unique[j]]=[unique[j],unique[i]];}
  return unique.sort((a,b)=>old.indexOf(key(a))-old.indexOf(key(b)));
 }
 return {order,remember,draw(group,values,count){const chosen=order(group,values).slice(0,count);remember(group,chosen);return chosen;}};
})();
