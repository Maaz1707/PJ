type Row = {date:string;value:number};
const saved = new Map<string,{value:any;expires:number}>();
const inFlight = new Map<string,Promise<any>>();
async function cached(key:string,url:string,ttl:number,parse:(text:string)=>any) {
  const previous=saved.get(key);
  if(previous&&previous.expires>Date.now())return previous.value;
  if(inFlight.has(key))return inFlight.get(key);
  const work=(async()=>{
    const response=await fetch(url,{signal:AbortSignal.timeout(14000),headers:{'accept':'application/json,text/html;q=0.9'}});
    if(!response.ok)throw new Error(key+' source HTTP '+response.status);
    const text=await response.text();
    if(text.length>3000000)throw new Error('Source exceeds expected size');
    const value=parse(text);saved.set(key,{value,expires:Date.now()+ttl});return value;
  })();
  inFlight.set(key,work);
  try{return await work;}finally{inFlight.delete(key);}
}
function bullion(text:string) {
  const data=JSON.parse(text);
  if(data.unit!=='INR per gram'||data.source!=='IBJA'||!Array.isArray(data.rows))throw new Error('Unexpected bullion source schema');
  const rows:Row[]=data.rows.filter((r:any)=>/^\d{4}-\d{2}-\d{2}$/.test(r.date)&&Number.isFinite(r.close)&&r.close>0).map((r:any)=>({date:r.date,value:r.close})).sort((a:Row,b:Row)=>a.date.localeCompare(b.date));
  if(!rows.length)throw new Error('No published observations');
  return {rows,source:'IBJA via TrackLivePrice',unit:'INR per gram',publishedDate:rows.at(-1)?.date};
}
function diamonds(text:string) {
  const match=text.match(/var\s+chart_data\s*=\s*("(?:\\.|[^"\\])*")\s*;/);
  if(!match)throw new Error('Diamond publisher changed its data format');
  const values=JSON.parse(JSON.parse(match[1]));
  if(!Array.isArray(values))throw new Error('Unexpected diamond index schema');
  const rows:Row[]=values.filter((r:any)=>r.is_natural===true&&Number(r.index_carat)===1&&r.index_id==='All'&&Number.isFinite(r.price_avg)&&r.price_avg>0).map((r:any)=>({date:new Date(r.date+' UTC').toISOString().slice(0,10),value:r.price_avg})).sort((a:Row,b:Row)=>a.date.localeCompare(b.date));
  if(!rows.length)throw new Error('No published diamond observations');
  return {rows,source:'StoneAlgo 1ct natural diamond index',unit:'USD per 1ct index',publishedDate:rows.at(-1)?.date};
}
function quote(text:string) {
  const q=JSON.parse(text).data;
  if(!q||!Number.isFinite(q.gold?.buy)||!Number.isFinite(q.silver?.buy)||q.gold.currency!=='INR'||q.silver.currency!=='INR'||q.gold.unit!=='gram'||q.silver.unit!=='gram'||!Number.isFinite(Date.parse(q.timestamp)))throw new Error('Unexpected quote schema');
  return {gold:{buy:q.gold.buy,sell:q.gold.sell,gst:q.gold.gst},silver:{buy:q.silver.buy,sell:q.silver.sell,gst:q.silver.gst},timestamp:q.timestamp,source:'OroPocket',unit:'INR per gram'};
}
export async function GET() {
  const sources=[
    ['gold24','https://trackliveprice.com/api/gold/999.json',900000,bullion],
    ['gold22','https://trackliveprice.com/api/gold/916.json',900000,bullion],
    ['silver','https://trackliveprice.com/api/silver.json',900000,bullion],
    ['diamond','https://www.stonealgo.com/diamond-prices/1-carat-diamond-prices/',21600000,diamonds],
    ['quote','https://api.oropocket.com/public/prices',60000,quote]
  ] as const;
  const results=await Promise.allSettled(sources.map(([key,url,ttl,parse])=>cached(key,url,ttl,parse)));
  const series:Record<string,any>={},errors:string[]=[];let currentQuote=null;
  results.forEach((result,i)=>{
    const key=sources[i][0];
    const value=result.status==='fulfilled'?result.value:saved.get(key)?.value;
    if(result.status==='rejected')errors.push(key);
    if(key==='quote')currentQuote=value||null;else if(value)series[key]=value;
  });
  return Response.json({series,quote:currentQuote,errors,fetchedAt:new Date().toISOString(),region:'Mumbai / Kalyan',locationBasis:'National IBJA benchmarks; no city premium applied'}, {status:Object.keys(series).length?200:503,headers:{'cache-control':'public, max-age=30'}});
}

export default async function handler(req:any,res:any) {
  if(req.method!=='GET') {
    res.setHeader('Allow','GET');
    return res.status(405).json({error:'Method not allowed'});
  }
  const response=await GET();
  response.headers.forEach((value,key)=>res.setHeader(key,value));
  return res.status(response.status).send(await response.text());
}
