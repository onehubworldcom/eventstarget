const express=require('express');
const path=require('path');
const app=express();
const PORT=process.env.PORT||3000;
app.use(express.static(__dirname));

function weekendRange(){
  const now=new Date();
  const start=new Date(now); start.setHours(0,0,0,0);
  const day=start.getDay();
  const daysToSaturday=(6-day+7)%7;
  start.setDate(start.getDate()+daysToSaturday);
  const end=new Date(start); end.setDate(end.getDate()+2);
  const fmt=d=>d.toISOString().slice(0,10)+'T00:00:00Z';
  return {startDateTime:fmt(start),endDateTime:fmt(end)};
}

app.get('/api/events',async(req,res)=>{
  try{
    const key=process.env.TICKETMASTER_API_KEY;
    if(!key) return res.status(503).json({error:'Event service is not configured yet.'});
    const q=new URLSearchParams({apikey:key,size:'30',sort:'date,asc',countryCode:req.query.country||'US,CA'});
    const rawKeyword=(req.query.keyword||'').trim();
    const lower=rawKeyword.toLowerCase();
    if(req.query.city) q.set('city',req.query.city);
    if(req.query.classificationName) q.set('classificationName',req.query.classificationName);

    if(/this weekend|weekend/.test(lower)){
      const range=weekendRange();
      q.set('startDateTime',range.startDateTime);
      q.set('endDateTime',range.endDateTime);
    }else if(rawKeyword && !/^free events?$/.test(lower)){
      const cleaned=rawKeyword.replace(/\b(free|events?|this weekend|weekend)\b/gi,'').trim();
      if(cleaned) q.set('keyword',cleaned);
    }

    const r=await fetch('https://app.ticketmaster.com/discovery/v2/events.json?'+q.toString());
    const data=await r.json();
    if(!r.ok) return res.status(r.status).json({error:data.fault?.faultstring||data.errors?.[0]?.detail||'Unable to load events'});
    let events=(data._embedded?.events||[]).map(e=>({
      name:e.name,
      date:e.dates?.start?.localDate||'',
      time:e.dates?.start?.localTime||'',
      url:e.url||'',
      image:(e.images||[]).sort((a,b)=>(b.width||0)-(a.width||0))[0]?.url||'',
      venue:e._embedded?.venues?.[0]?.name||'',
      city:e._embedded?.venues?.[0]?.city?.name||'',
      price:e.priceRanges?.[0]?`${e.priceRanges[0].currency||'$'} ${e.priceRanges[0].min}–${e.priceRanges[0].max}`:'See official listing',
      type:e.classifications?.[0]?.segment?.name||'Event'
    }));
    if(/\bfree\b/.test(lower)) events=events.filter(e=>/free|0\.00|\$\s*0/i.test(e.price));
    res.json({events});
  }catch(err){res.status(500).json({error:'Unable to load events right now.'});}
});
app.listen(PORT,()=>console.log('Eventstarget running on '+PORT));