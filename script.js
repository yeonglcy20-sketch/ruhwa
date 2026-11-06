const SHEET_ID='12sl4qtRuxadkUYeF7KIFEiBPxfnyotkAbh0zoiShvcQ';
const SHEET_NAME='시트1';
const csvUrl=`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`;

const listEl=document.getElementById('list');
const searchInput=document.getElementById('searchInput');

let data=[];

fetch(csvUrl)
.then(r=>r.text())
.then(csv=>{
  data=parseCSV(csv);
  render(data);
})
.catch(err=>{
  listEl.innerHTML='<div class="empty">데이터를 불러오지 못했습니다.</div>';
  console.error(err);
});

function parseCSV(csv){
  const rows=csv.trim().split('\n').map(row =>
    row.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g)?.map(cell =>
      cell.replace(/^"|"$/g,'').replace(/""/g,'"').trim()
    ) || []
  );

  const headers=rows.shift();

  return rows.map(row=>{
    const obj={};
    headers.forEach((h,i)=>{
      obj[h]=row[i] || '';
    });
    return obj;
  });
}

function isVisibleValue(value){
  const v=String(value ?? '').trim();
  return v !== '' && v !== '0';
}

function render(items){
  listEl.innerHTML='';

  let visibleCount=0;

  items.forEach(item=>{
    const first=Object.keys(item)[0];
    const title=String(item[first] ?? '').trim();

    const visibleRows=Object.entries(item)
      .slice(1)
      .filter(([key,value])=>isVisibleValue(value));

    // 제목이 없거나, 표시할 내용이 모두 0/빈칸이면 카드 자체를 숨김
    if(!title || visibleRows.length===0) return;

    const div=document.createElement('div');
    div.className='item';

    div.innerHTML=
      `<div class="item-title"><svg class="cat-icon" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M5 16V5l9 6h4l9-6v11c2 10-3 13-11 13S3 26 5 16Z" fill="#fff0f6" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="11" cy="19" r="1.4" fill="currentColor"/><circle cx="21" cy="19" r="1.4" fill="currentColor"/><path d="m14 23 2 2 2-2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg><span>${escapeHTML(title)}</span></div>`+
      visibleRows.map(([k,v])=>
        `<div class="item-row"><b>${escapeHTML(k)}</b> : ${escapeHTML(v)}</div>`
      ).join('');

    listEl.appendChild(div);
    visibleCount++;
  });

  if(visibleCount===0){
    listEl.innerHTML='<div class="empty">표시할 데이터가 없습니다.</div>';
  }
}

searchInput.addEventListener('input',()=>{
  const q=searchInput.value.toLowerCase().trim();

  const filtered=data.filter(item =>
    Object.values(item).some(value =>
      String(value).toLowerCase().includes(q)
    )
  );

  render(filtered);
});

function escapeHTML(value){return String(value).replace(/[&<>"\']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","\'":"&#39;"}[c]));}
