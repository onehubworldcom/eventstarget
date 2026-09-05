const express=require('express');
const app=express();
const PORT=process.env.PORT||3000;

// Allow the EventsTarget website to read the live API from the browser.
app.use((req,res,next)=>{
  const origin=req.headers.origin||'';
  if(origin==='https://eventstarget.com'||origin==='https://www.eventstarget.com'||origin.endsWith('.onrender.com')){
    res.setHeader('Access-Control-Allow-Origin',origin);
  }else{
    res.setHeader('Access-Control-Allow-Origin','*');
  }
  res.setHeader('Access-Control-Allow-Methods','GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS')return res.sendStatus(204);
  next();
});

app.use(express.static(__dirname));

function isoDate(d){return d.toISOString().slice(0,10);}
function weekendRange(){
  const now=new Date(); const start=new Date(now); start.setHours(0,0,0,0);
  const day=start.getDay(); const daysToSaturday=day===0?-1:day===6?0:6-day;
  start.setDate(start.getDate()+daysToSaturday);
  const end=new Date(start); end.setDate(end.getDate()+2);
  return {startDateTime:isoDate(start)+'T00:00:00Z',endDateTime:isoDate(end)+'T00:00:00Z',startDate:isoDate(start),endDate:isoDate(end)};
}
const months={january:0,february:1,march:2,april:3,may:4,june:5,july:6,august:7,september:8,october:9,november:10,december:11};
function requestedMonthYear(text){
  const value=String(text||'').toLowerCase();
  const monthName=Object.keys(months).find(m=>new RegExp('\\\\b'+m+'\\\\b').test(value));
  const yearMatch=value.match(/\\\\b(20\\\\d{2})\\\\b/);
  if(!monthName&&!yearMatch)return null;
  const now=new Date();
  const year=yearMatch?Number(yearMatch[1]):now.getFullYear();
  const month=monthName?months[monthName]:now.getMonth();
  const start=new Date(Date.UTC(year,month,1));
  const end=new Date(Date.UTC(year,month+1,1));
  return {startDateTime:start.toISOString(),endDateTime:end.toISOString(),startDate:isoDate(start),endDate:isoDate(end),year,month:month+1};
}
function cleanKeyword(text){
  return text.replace(/\\\\b(free|events?|event|this|the|on|near|in|today|tonight|weekend|upcoming|january|february|march|april|may|june|july|august|september|october|november|december|\\\\d{4}|usa|canada)\\\\b/gi,' ').replace(/\\\\s+/g,' ').trim();
}

app.get('/api/events',async(req,res)=>{
  try{
    const key=process.env.TICKETMASTER_API_KEY;
    if(!key)return res.status(503).json({error:'Event service is not configured yet.'});
    const rawKeyword=(req.query.keyword||'').trim();
    const lower=rawKeyword.toLowerCase();
    const isWeekend=/\\\\bweekend\\\\b/.test(lower);
    const isFree=/\\\\bfree\\\\b/.test(lower);
    const requestedRange=requestedMonthYear(rawKeyword);
    const range=isWeekend?weekendRange():requestedRange;
    const q=new URLSearchParams({apikey:key,size:'100',sort:'date,asc',countryCode:req.query.country||'US,CA'});
    if(req.query.city)q.set('city',req.query.city.trim());
    if(req.query.classificationName)q.set('classificationName',req.query.classificationName.trim());
    if(range){q.set('startDateTime',range.startDateTime);q.set('endDateTime',range.endDateTime);}
    const keyword=cleanKeyword(rawKeyword);
    if(keyword)q.set('keyword',keyword);
    const r=await fetch('https://app.ticketmaster.com/discovery/v2/events.json?'+q.toString());
    const data=await r.json();
    if(!r.ok)return res.status(r.status).json({error:data.fault?.faultstring||data.errors?.[0]?.detail||'Unable to load events'});
    const seen=new Set();
    const events=(data._embedded?.events||[]).map(e=>{
      const pr=e.priceRanges?.[0];
      return {id:e.id||e.url||e.name,name:e.name,date:e.dates?.start?.localDate||'',time:e.dates?.start?.localTime||'',url:e.url||'',image:(e.images||[]).slice().sort((a,b)=>(b.width||0)*(b.height||0)-(a.width||0)*(a.height||0))[0]?.url||'',venue:e._embedded?.venues?.[0]?.name||'',city:e._embedded?.venues?.[0]?.city?.name||'',priceMin:typeof pr?.min==='number'?pr.min:null,priceMax:typeof pr?.max==='number'?pr.max:null,currency:pr?.currency||'',price:pr?`${pr.currency||'USD'} ${pr.min}${pr.max!==pr.min?'–'+pr.max:''}`:'See official listing',type:e.classifications?.[0]?.segment?.name||'Event'};
    }).filter(e=>{if(seen.has(e.id))return false;seen.add(e.id);if(range&&(!e.date||e.date<range.startDate||e.date>=range.endDate))return false;if(isFree&&e.priceMin!==0&&e.priceMax!==0)return false;return true;}).slice(0,30).map(({id,priceMin,priceMax,currency,...event})=>event);
    res.json({events,meta:{count:events.length,weekend:isWeekend,free:isFree,month:range?.month||null,year:range?.year||null}});
  }catch(err){console.error(err);res.status(500).json({error:'Unable to load events right now.'});}
});
app.listen(PORT,()=>console.log('Eventstarget running on '+PORT));