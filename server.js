const express=require('express');
const path=require('path');
const app=express();
const PORT=process.env.PORT||3000;
app.use(express.static(__dirname));
app.get('/api/events',async(req,res)=>{
  try{
    const key=process.env.TICKETMASTER_API_KEY;
    if(!key) return res.status(503).json({error:'Event service is not configured yet.'});
    const q=new URLSearchParams({apikey:key,size:'24',sort:'date,asc',countryCode:req.query.country||'US,CA'});
    if(req.query.keyword) q.set('keyword',req.query.keyword);
    if(req.query.city) q.set('city',req.query.city);
    if(req.query.classificationName) q.set('classificationName',req.query.classificationName);
    const r=await fetch('https://app.ticketmaster.com/discovery/v2/events.json?'+q.toString());
    const data=await r.json();
    if(!r.ok) return res.status(r.status).json({error:data.fault?.faultstring||data.errors?.[0]?.detail||'Unable to load events'});
    const events=(data._embedded?.events||[]).map(e=>({
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
    res.json({events});
  }catch(err){res.status(500).json({error:'Unable to load events right now.'});}
});
app.listen(PORT,()=>console.log('Eventstarget running on '+PORT));