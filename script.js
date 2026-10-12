const SHEET_ID='1eqgJZBkKUEwbIIHHLS2rO4GJQPhu4xIYB1zRySGgkX0';
const listEl=document.getElementById('list');
const searchInput=document.getElementById('searchInput');
let data=[], details=[], detailState='loading';
const dialog=document.createElement('dialog');
dialog.className='detail-dialog';
dialog.innerHTML='<img class="dialog-cat" src="cat-girls-header.png" alt=""><p class="dialog-label">✧ 집사의 작은 기록 ✧</p><button class="detail-close" aria-label="닫기">×</button><h2 id="detailTitle"></h2><div id="detailBody"></div>';
document.getElementById('detailSlot').append(dialog);
dialog.querySelector('button').onclick=()=>dialog.close();
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
let selectedName='', opener;
dialog.addEventListener('close',()=>opener?.focus());
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&dialog.open)dialog.close();});
let activeFilter='all',page=1;const pageSize=12;
const sortSelect=document.getElementById('sortSelect');
document.querySelector('.search-button').onclick=()=>{page=1;render();};
sortSelect.onchange=()=>{page=1;render();};
document.querySelectorAll('[data-filter]').forEach(button=>button.onclick=()=>{activeFilter=button.dataset.filter;page=1;document.querySelectorAll('[data-filter]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});render();});
function parseCSV(csv){
 const rows=[];let row=[],cell='',quoted=false;
 for(let i=0;i<csv.length;i++){const c=csv[i];if(c==='"'){if(quoted&&csv[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(cell.trim());cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&csv[i+1]==='\n')i++;row.push(cell.trim());if(row.some(Boolean))rows.push(row);row=[];cell='';}else cell+=c;}
 row.push(cell.trim());if(row.some(Boolean))rows.push(row);return rows;
}
async function loadSheet(name){
 const url=`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(name)}`;
 const response=await fetch(url);if(!response.ok)throw Error('시트 응답 오류');
 const csv=await response.text();if(/^\s*</.test(csv))throw Error('시트 공개 설정을 확인해주세요.');return parseCSV(csv);
}
function normalize(v){return String(v??'').replace(/\s/g,'').toLowerCase();}
function column(headers,names,fallback){const index=headers.findIndex(h=>names.includes(normalize(h)));return index<0?fallback:index;}
loadSheet('시트1').then(rows=>{const headers=rows.shift()||[];data=rows.map(row=>({name:row[0]||'',values:headers.slice(1).map((h,i)=>[h,row[i+1]||''])}));render();}).catch(()=>{listEl.textContent='데이터를 불러오지 못했습니다. 시트 공유 설정을 확인해주세요.';});
loadSheet('시트2').then(rows=>{
 const hi=rows.findIndex(row=>row.some(h=>normalize(h)==='업보')&&row.some(h=>['남음','남은갯수','남은개수','잔여'].includes(normalize(h))));
 if(hi<0)throw Error('시트2에서 업보와 남음 열 제목을 찾을 수 없습니다.');
 const headers=rows[hi];const ni=column(headers,['닉네임','닉네임/상품','이름'],1),bi=column(headers,['업보'],2),ri=column(headers,['남음','남은갯수','남은개수','잔여'],5),di=column(headers,['만기일','만기','만료일'],7);
 let name='';details=rows.slice(hi+1).map(row=>{if(row[ni])name=row[ni].trim();return {name,debt:row[bi]||'',remaining:row[ri]||'',due:row[di]||''};}).filter(row=>row.name&&row.debt);
 detailState='ready';render();if(dialog.open)showDetails();
}).catch(error=>{detailState='error';console.error(error);if(dialog.open)showDetails();});
function itemDetails(item){return details.filter(row=>normalize(row.name)===normalize(item.name));}
function itemTotal(item){return item.values.reduce((n,[,v])=>n+(Number.isFinite(Number(v))?Number(v):0),0);}
function nearestDue(item){const days=itemDetails(item).map(row=>remainingDays(row.due)).filter(d=>d!==null);return days.length?Math.min(...days):Infinity;}
function render(){
 listEl.replaceChildren();const q=searchInput.value.toLowerCase().trim();
 let items=data.filter(item=>item.name&&item.values.some(([,v])=>v!==''&&v!=='0')).filter(item=>[item.name,...item.values.flat(),...itemDetails(item).map(r=>r.debt)].some(v=>String(v).toLowerCase().includes(q)));
 if(activeFilter==='remaining')items=items.filter(item=>itemDetails(item).some(row=>Number(row.remaining)>0));
 if(activeFilter==='due')items=items.filter(item=>nearestDue(item)!==Infinity);
 items.sort((a,b)=>sortSelect.value==='count'?itemTotal(b)-itemTotal(a):sortSelect.value==='due'?nearestDue(a)-nearestDue(b)||a.name.localeCompare(b.name,'ko'):a.name.localeCompare(b.name,'ko'));
 const pages=Math.max(1,Math.ceil(items.length/pageSize));page=Math.min(page,pages);
 document.getElementById('resultCount').textContent=`총 ${items.length}명의 집사 · ${page} / ${pages} 페이지`;
 items.slice((page-1)*pageSize,page*pageSize).forEach(item=>{
 const visible=item.values.filter(([,v])=>v!==''&&v!=='0');
 const card=document.createElement('button');card.type='button';card.className='item';card.setAttribute('aria-haspopup','dialog');card.setAttribute('aria-label',item.name+' 상세 기록 보기');
 const title=document.createElement('div');title.className='item-title';setNicknameTitle(title,item.name);card.append(title);
 const count=document.createElement('span');count.className='count-badge';count.textContent=String(itemTotal(item));card.append(count);
 const summary=document.createElement('div');summary.className='card-summary';summary.textContent=visible.map(([k,v])=>`${k} ${v}`).join(' · ');card.append(summary);
 const paws=document.createElement('span');paws.className='card-paws';paws.textContent='✿ ✿ ✿ ✿';paws.setAttribute('aria-hidden','true');card.append(paws);
 card.onclick=()=>{selectedName=item.name;opener=card;showDetails();if(!dialog.open){if(matchMedia('(max-width: 800px)').matches)dialog.showModal();else dialog.show();}};
 listEl.append(card);
 });if(!listEl.children.length){const empty=document.createElement('p');empty.className='empty';empty.textContent=detailState==='loading'&&activeFilter!=='all'&&activeFilter!=='debt'?'세부 기록을 불러오는 중이에요…':'표시할 기록이 없습니다.';listEl.append(empty);}
 const nav=document.getElementById('pagination');nav.replaceChildren();
 const add=(label,target,disabled=false)=>{const btn=document.createElement('button');btn.textContent=label;btn.disabled=disabled;btn.classList.toggle('active',target===page&&/^\d+$/.test(label));if(target===page&&/^\d+$/.test(label))btn.setAttribute('aria-current','page');btn.onclick=()=>{page=target;render();};nav.append(btn);};
 add('«',Math.max(1,page-1),page===1);const start=Math.max(1,Math.min(page-2,pages-4));for(let i=start;i<=Math.min(pages,start+4);i++)add(String(i),i);add('»',Math.min(pages,page+1),page===pages);
}
function remainingDays(value,now=new Date()){
 const match=String(value).match(/^(\d{4})\s*[.\-/년]\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})\s*일?/);if(!match)return null;
 const [,y,m,d]=match.map(Number);const date=new Date(Date.UTC(y,m-1,d));if(date.getUTCFullYear()!==y||date.getUTCMonth()!==m-1||date.getUTCDate()!==d)return null;
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);const get=k=>Number(parts.find(p=>p.type===k).value);
 return Math.round((date.getTime()-Date.UTC(get('year'),get('month')-1,get('day')))/86400000);
}
function dueClass(days){return days===null?'':days>=15?'due-green':days>=8?'due-yellow':'due-red';}
function showDetails(){
 setNicknameTitle(document.getElementById('detailTitle'),selectedName);
 const body=document.getElementById('detailBody');body.replaceChildren();
 if(detailState!=='ready'){body.textContent=detailState==='loading'?'세부내용을 불러오는 중입니다…':'시트2를 불러오지 못했습니다. 공유 설정과 열 제목(닉네임·업보·남음·만기일)을 확인해주세요.';return;}
 const matches=details.filter(row=>normalize(row.name)===normalize(selectedName));if(!matches.length){body.textContent='시트2에 해당 닉네임의 세부내용이 없습니다.';return;}
 matches.forEach(row=>{
 const entry=document.createElement('section');entry.className='detail-entry';const days=remainingDays(row.due);
 const fields=[['🐾 업보',row.debt],['♡ 남음',row.remaining||'—'],['▦ 만기일',row.due||'—'],['♡ 남은 일수',days===null?'—':days<0?`만기 ${-days}일 지남`:days===0?'오늘 만기':`${days}일`],['✿ 상태',days===null?'날짜 미등록':days>=15?'🟢 여유 있어요!':days>=8?'🟡 곧 만기예요':'🔴 만기를 확인해요']];
 fields.forEach(([label,value],index)=>{const line=document.createElement('div');line.className='detail-field'+(index===2?' '+dueClass(days):'');const key=document.createElement('b');key.textContent=label;const text=document.createElement('span');text.textContent=value;line.append(key,text);entry.append(line);});body.append(entry);
 });
 const legend=document.createElement('p');legend.className='detail-legend';legend.textContent='🟢 15일 이상 · 🟡 8~14일 · 🔴 7일 이하 (만기 지난 항목 포함)';body.append(legend);
}
searchInput.addEventListener('input',()=>{page=1;render();});
setInterval(()=>{if(dialog.open&&detailState==='ready')showDetails();},60000);

function setNicknameTitle(element,name){
 const icon=document.createElement('img');icon.src='pink-cat.png';icon.alt='';icon.className='nickname-cat';icon.setAttribute('aria-hidden','true');
 const label=document.createElement('span');label.textContent=name;
 element.replaceChildren(icon,label);
}
