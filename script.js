const SHEET_ID='12sl4qtRuxadkUYeF7KIFEiBPxfnyotkAbh0zoiShvcQ';
const listEl=document.getElementById('list');
const searchInput=document.getElementById('searchInput');
let data=[], details=[], detailState='loading';
const dialog=document.createElement('dialog');
dialog.className='detail-dialog';
dialog.innerHTML='<button class="detail-close" aria-label="닫기">×</button><h2 id="detailTitle"></h2><div id="detailBody"></div>';
document.body.append(dialog);
dialog.querySelector('button').onclick=()=>dialog.close();
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
let selectedName='', opener;
dialog.addEventListener('close',()=>opener?.focus());
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
 detailState='ready';if(dialog.open)showDetails();
}).catch(error=>{detailState='error';console.error(error);if(dialog.open)showDetails();});
function render(){
 listEl.replaceChildren();const q=searchInput.value.toLowerCase().trim();
 data.filter(item=>[item.name,...item.values.flat()].some(v=>String(v).toLowerCase().includes(q))).forEach(item=>{
 const visible=item.values.filter(([,v])=>v!==''&&v!=='0');if(!item.name||!visible.length)return;
 const card=document.createElement('div');card.className='item';card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-haspopup','dialog');
 const title=document.createElement('div');title.className='item-title';setNicknameTitle(title,item.name);card.append(title);
 visible.forEach(([k,v])=>{const row=document.createElement('div');row.className='item-row';const b=document.createElement('b');b.textContent=k;row.append(b,document.createTextNode(' : '+v));card.append(row);});
 const open=()=>{selectedName=item.name;opener=card;showDetails();dialog.showModal();};card.onclick=open;card.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}};listEl.append(card);
 });if(!listEl.children.length)listEl.textContent='표시할 데이터가 없습니다.';
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
 const table=document.createElement('table');table.className='detail-table';const head=document.createElement('tr');['업보','남음','만기일'].forEach(t=>{const th=document.createElement('th');th.textContent=t;head.append(th);});const thead=document.createElement('thead');thead.append(head);table.append(thead);const tbody=document.createElement('tbody');
 matches.forEach(row=>{const tr=document.createElement('tr');[row.debt,row.remaining].forEach(v=>{const td=document.createElement('td');td.textContent=v||'—';tr.append(td);});const td=document.createElement('td'),badge=document.createElement('span'),days=remainingDays(row.due);badge.className='due-badge '+dueClass(days);badge.textContent=row.due||'—';td.append(badge);if(days!==null){const note=document.createElement('small');note.textContent=days<0?`만기 ${-days}일 지남`:days===0?'오늘 만기':`${days}일 남음`;td.append(note);}tr.append(td);tbody.append(tr);});table.append(tbody);body.append(table);
 const legend=document.createElement('p');legend.className='detail-legend';legend.textContent='🟢 15일 이상 · 🟡 8~14일 · 🔴 7일 이하 (만기 지난 항목 포함)';body.append(legend);
}
searchInput.addEventListener('input',render);
setInterval(()=>{if(dialog.open&&detailState==='ready')showDetails();},60000);

function setNicknameTitle(element,name){
 const icon=document.createElement('img');icon.src='cat_paw.svg';icon.alt='';icon.className='nickname-jelly';icon.setAttribute('aria-hidden','true');
 const label=document.createElement('span');label.textContent=name;
 element.replaceChildren(icon,label);
}
