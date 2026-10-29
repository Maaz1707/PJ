(() => {
  const $ = s => document.querySelector(s);
  const format = (v, currency = 'INR') => Number.isFinite(v) ? new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: currency === 'USD' ? 0 : 2 }).format(v) : '—';
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const date = d => d ? new Date(d.length === 10 ? d + 'T12:00:00Z' : d).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Kolkata'}) : 'Not available';
  const time = d => d ? new Date(d).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Kolkata'}) + ' IST' : 'Awaiting source';
  const labels = { gold24: 'Gold · 24K / 999', gold22: 'Gold · 22K / 916', silver: 'Silver · 999', diamond: 'Diamond · 1ct natural' };
  let payload = null, selected = 'gold24', period = 30, busy = false, error = '', region = 'Kalyan, Mumbai region', generation = 0;
  const currency = () => selected === 'diamond' ? 'USD' : 'INR';
  function series(key = selected) { return payload?.series?.[key]?.rows || []; }
  function last(key) { return series(key).at(-1); }
  function percent(rows) { return rows.length > 1 ? (rows.at(-1).value / rows[0].value - 1) * 100 : null; }
  function subset() {
    const rows = series();
    if (!rows.length || period === 'all') return rows;
    const cutoff = new Date(rows.at(-1).date + 'T00:00:00Z').getTime() - Number(period) * 86400000;
    return rows.filter(r => new Date(r.date + 'T00:00:00Z').getTime() >= cutoff);
  }
  function delta(rows) {
    const v = percent(rows);
    return v == null ? '<span class="market-muted">Awaiting history</span>' : `<span class="market-change ${v < 0 ? 'negative' : ''}">${v < 0 ? '↘' : '↗'} ${Math.abs(v).toFixed(2)}% <small>over period</small></span>`;
  }
  function chart(rows, mini = false, id = '') {
    if (rows.length < 2) return `<div class="market-chart-empty">${busy ? 'Connecting to published market data…' : 'History unavailable from source. Try refresh.'}</div>`;
    const w = 1000, h = mini ? 100 : 300, pad = mini ? 4 : 35;
    const values = rows.map(r => r.value), lo = Math.min(...values), hi = Math.max(...values), span = hi - lo || Math.max(hi * .02, 1);
    const points = rows.map((r,i) => [pad + i/(rows.length-1)*(w-2*pad), h-pad-(r.value-lo)/span*(h-2*pad)]);
    const line = points.map((p,i)=>(i?'L':'M')+p.map(v=>v.toFixed(2)).join(',')).join(' ');
    const area = line + ` L${w-pad},${h-pad} L${pad},${h-pad} Z`;
    const grid = mini ? '' : [0,.25,.5,.75,1].map(t=>`<line x1="${pad}" y1="${pad+t*(h-2*pad)}" x2="${w-pad}" y2="${pad+t*(h-2*pad)}" stroke="#e6eee6" stroke-dasharray="3 6"/>`).join('');
    return `<svg class="${mini?'market-spark':'market-graph'}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" ${mini?'aria-hidden="true"':`role="img" aria-label="${labels[selected]} published price history from ${date(rows[0].date)} to ${date(rows.at(-1).date)}"`}><defs><linearGradient id="fill-${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#216447" stop-opacity=".17"/><stop offset="1" stop-color="#216447" stop-opacity="0"/></linearGradient></defs>${grid}<path d="${area}" fill="url(#fill-${id})"/><path d="${line}" fill="none" stroke="${mini?'#75a386':'#216447'}" stroke-width="${mini?2:2.4}" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/>${mini?'':`<circle cx="${points.at(-1)[0]}" cy="${points.at(-1)[1]}" r="4" fill="#bb9855"/>`}</svg>`;
  }
  function cards() {
    return ['gold24','silver','diamond'].map((k,i)=>{
      const row=last(k),rows=series(k).slice(-22),unit=k==='diamond'?'USD / 1ct · global index':'INR / gram · India benchmark';
      return `<button class="market-card ${selected===k?'selected':''}" data-market="${k}" aria-pressed="${selected===k}"><span class="market-card-top"><span class="market-symbol">${['Au','Ag','◇'][i]}</span><span>${labels[k]}</span><span class="market-card-arrow">↗</span></span><strong>${format(row?.value,k==='diamond'?'USD':'INR')}</strong><span class="market-unit">${unit}</span>${chart(rows,true,'spark-'+k)}<span class="market-asof">Published ${date(row?.date)}</span></button>`;
    }).join('');
  }
  function chartPanel(full) {
    const rows=subset(), latest=rows.at(-1), vals=rows.map(r=>r.value);
    return `<div class="market-chart-panel"><div class="market-chart-heading"><div><span class="market-kicker">PUBLISHED PRICE HISTORY</span><h3>${labels[selected]}</h3><div class="market-chart-price">${format(latest?.value,currency())} <small>${selected==='diamond'?'per 1ct index':'per gram'}</small></div>${delta(rows)}</div><div class="market-periods" aria-label="Chart period">${[7,30,90,'all'].map(p=>`<button data-period="${p}" class="${period===p?'active':''}" aria-pressed="${period===p}">${p==='all'?'ALL':p+'D'}</button>`).join('')}</div></div><div class="market-tabs" aria-label="Select market">${Object.keys(labels).map(k=>`<button data-market="${k}" class="${selected===k?'active':''}" aria-pressed="${selected===k}">${k==='gold24'?'Gold 24K':k==='gold22'?'Gold 22K':k==='silver'?'Silver':'Diamonds'}</button>`).join('')}</div><div class="market-chart-wrap" tabindex="0" role="group" aria-label="Interactive historical chart. Use left and right arrow keys to inspect prices.">${chart(rows,false,'main')}<div class="market-tooltip" hidden></div></div><div class="market-axis"><span>${date(rows[0]?.date)}</span><span>${selected==='diamond'?'USD / 1ct natural index':'INR / gram'}</span><span>${date(rows.at(-1)?.date)}</span></div>${full&&rows.length?`<div class="market-stats"><div><small>PERIOD LOW</small><strong>${format(Math.min(...vals),currency())}</strong></div><div><small>PERIOD HIGH</small><strong>${format(Math.max(...vals),currency())}</strong></div><div><small>OBSERVATIONS</small><strong>${rows.length} published days</strong></div></div>`:''}</div>`;
  }
  function quoteStrip() {
    const q=payload?.quote;
    const delayed=q&&(Date.now()-Date.parse(q.timestamp)>600000||payload.errors?.includes('quote'));
    return `<div class="market-live-quote"><div><span class="market-dot ${q&&!delayed?'':'offline'}"></span><b>Provider quote</b><small>${q?(delayed?'Last available quote · delayed':'OroPocket · checked every 60 seconds'):busy?'Connecting to provider…':'Provider quote unavailable'}</small></div><span>Gold buy <b>${format(q?.gold?.buy)}</b> /g</span><span>Silver buy <b>${format(q?.silver?.buy)}</b> /g</span><small>${q?time(q.timestamp):'Unavailable until source responds'}</small></div>`;
  }
  function notes(full) {
    return `<div class="market-source-note"><p>For ${esc(region)}: national IBJA reference rates, not a local shop quote. GST, making charges and dealer premiums are excluded. Bullion history updates by published session; provider quotes are a separate buy/sell feed.</p><p>Diamonds: StoneAlgo’s global 1ct natural diamond index in USD, updated by its publisher. Shape, colour, clarity and cut affect an individual stone’s price.</p><div><a href="https://trackliveprice.com/methodology/" target="_blank" rel="noopener">IBJA via TrackLivePrice ↗</a><a href="https://www.stonealgo.com/diamond-prices/1-carat-diamond-prices/" target="_blank" rel="noopener">StoneAlgo index ↗</a><a href="https://blog.oropocket.com/free-gold-silver-price-api-india/" target="_blank" rel="noopener">OroPocket quote ↗</a></div>${full?'<p>Gaps represent days without a published observation; no prices are invented or interpolated. The date shown belongs to the source, not the page refresh.</p>':''}</div>`;
  }
  function content(full) {
    return `<div class="market-heading"><div><span class="market-kicker">THE PARAG MARKET DESK</span><h2>${full?'The precious price journal':'Precious metals. A clearer picture.'}</h2><p>Gold, silver and diamond references for thoughtful buying.</p></div><div class="market-location"><span>⌖</span><label class="sr-only" for="market-region">Reference location</label><select id="market-region"><option ${region.startsWith('Kalyan')?'selected':''}>Kalyan, Mumbai region</option><option ${region==='Mumbai'?'selected':''}>Mumbai</option></select></div></div><div class="market-status"><span class="market-dot ${error?'offline':''}"></span><span>${busy?'Refreshing sources…':error?'Some sources are unavailable — dated values retained':'Auto-refreshing public references'}</span><span>${payload?'Checked '+time(payload.fetchedAt):'Connecting securely…'}</span><button id="market-refresh" ${busy?'disabled':''}>${busy?'Refreshing…':'Refresh ↻'}</button></div><div class="market-cards">${cards()}</div>${quoteStrip()}${chartPanel(full)}${full?historyTable():`<div class="market-preview-bottom"><span>Understand the trend behind the number.</span><a class="primary" href="#rates">EXPLORE ALL RATES & CHARTS →</a></div>`}${notes(full)}`;
  }
  function historyTable() {
    const rows=subset().slice(-12).reverse();
    return `<section class="market-history"><div><h3>Recent published observations</h3><button id="market-csv" class="outline">DOWNLOAD CSV ↓</button></div><div class="market-table-wrap"><table><thead><tr><th>Date</th><th>${selected==='diamond'?'1ct index · USD':'Reference · INR/g'}</th><th>Source</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${date(r.date)}</td><td>${format(r.value,currency())}</td><td>${selected==='diamond'?'StoneAlgo':'IBJA / TrackLivePrice'}</td></tr>`).join('')}</tbody></table></div></section>`;
  }
  window.marketPreview=()=>'<section id="market-desk" class="market-desk market-preview" aria-label="Mumbai and Kalyan market rates">'+content(false)+'</section>';
  window.marketPage=()=>{document.title='Mumbai & Kalyan Rates | Parag Jewellers';$('#main').innerHTML='<div class="crumbs"><a href="#home">Home</a><span>›</span>Market rates</div><section id="market-desk" class="market-desk market-full">'+content(true)+'</section>';bind();};
  function render() {
    const node=$('#market-desk');if(!node)return;
    const active=document.activeElement;
    const focus=node.contains(active)?(active.dataset.market?'[data-market="'+active.dataset.market+'"]':active.dataset.period?'[data-period="'+active.dataset.period+'"]':active.id?'#'+active.id:null):null;
    node.innerHTML=content(node.classList.contains('market-full'));bind();
    if(focus)node.querySelector(focus)?.focus({preventScroll:true});
  }
  function bind() {
    const root=$('#market-desk');if(!root)return;
    root.querySelectorAll('[data-market]').forEach(b=>b.onclick=()=>{selected=b.dataset.market;render();});
    root.querySelectorAll('[data-period]').forEach(b=>b.onclick=()=>{period=b.dataset.period==='all'?'all':+b.dataset.period;render();});
    $('#market-refresh').onclick=()=>load(true);
    $('#market-region').onchange=e=>{region=e.target.value;render();};
    const wrap=root.querySelector('.market-chart-wrap'),tip=root.querySelector('.market-tooltip');let cursor=0;
    const inspect=i=>{const rows=subset();if(!rows.length)return;cursor=Math.max(0,Math.min(rows.length-1,i));tip.innerHTML=`<b>${date(rows[cursor].date)}</b><span>${format(rows[cursor].value,currency())}</span>`;tip.hidden=false;tip.style.left=Math.min(82,Math.max(5,cursor/Math.max(1,rows.length-1)*100))+'%';};
    wrap.onpointermove=e=>{const r=wrap.getBoundingClientRect();inspect(Math.round((e.clientX-r.left)/r.width*(subset().length-1)));};wrap.onpointerleave=()=>tip.hidden=true;wrap.onblur=()=>tip.hidden=true;wrap.onkeydown=e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();inspect(cursor+(e.key==='ArrowRight'?1:-1));}};
    if($('#market-csv'))$('#market-csv').onclick=()=>{const rows=subset(),text='Date,Value,Currency,Unit,Source\n'+rows.map(r=>`${r.date},${r.value},${currency()},${selected==='diamond'?'1ct natural index':'gram'},${selected==='diamond'?'StoneAlgo':'IBJA via TrackLivePrice'}`).join('\n');const u=URL.createObjectURL(new Blob([text],{type:'text/csv'}));const a=document.createElement('a');a.href=u;a.download='parag-'+selected+'-history.csv';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);};
  }
  async function load(force=false) {
    if(busy)return;busy=true;error='';render();const id=++generation;
    try{const response=await fetch('/api/market',{cache:'no-store',signal:AbortSignal.timeout(25000)});if(!response.ok)throw new Error('Market feed unavailable');const next=await response.json();if(!next.series||!next.fetchedAt)throw new Error('Invalid market response');if(id!==generation)return;payload=next;error=next.errors?.length?'partial':'';}
    catch(e){error='unavailable';}
    finally{busy=false;render();}
  }
  let queued=false;
  new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;const el=$('#market-desk');if(el&&!el.dataset.bound){el.dataset.bound='true';bind();}});}).observe(document.querySelector('main'),{childList:true});
  addEventListener('visibilitychange',()=>{if(!document.hidden)load();});
  setInterval(()=>{if(!document.hidden&&$('#market-desk'))load();},60000);
  load();
})();
