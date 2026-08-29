const cities=[
  ['New York','USA','🗽'],['Los Angeles','USA','🌴'],['Chicago','USA','🌆'],['Miami','USA','🌊'],
  ['Las Vegas','USA','🎰'],['San Francisco','USA','🌉'],['Austin','USA','🎸'],['Seattle','USA','☕'],
  ['Toronto','Canada','🍁'],['Vancouver','Canada','🏔️'],['Montreal','Canada','🎨'],['Calgary','Canada','🤠']
];
const g=document.querySelector('#cityGrid');
const modal=document.querySelector('#modal');
const mt=document.querySelector('#mt');
const mp=document.querySelector('#mp');
const search=document.querySelector('#search');
const idea=document.querySelector('#idea');
let showingAll=false;

function renderCities(){
  g.innerHTML='';
  const visible=showingAll?cities:cities.slice(0,6);
  visible.forEach(c=>{
    const b=document.createElement('button');
    b.className='city';
    b.innerHTML=`<i>${c[2]}</i><b>${c[0]}</b><small>${c[1]} · Explore events →</small>`;
    b.onclick=()=>openM(`Explore ${c[0]}`,`Start your search for free events, concerts, festivals and things to do in ${c[0]}. Live listings can be connected when the approved event data source is ready.`);
    g.appendChild(b);
  });
}
renderCities();

function showAllCities(){
  showingAll=!showingAll;
  renderCities();
  document.querySelector('.text-button').textContent=showingAll?'Show fewer cities ↑':'View all cities →';
}
function openM(t,p){mt.textContent=t;mp.textContent=p;modal.classList.add('show')}
function closeM(){modal.classList.remove('show')}
function focusSearch(){search.focus();window.scrollTo({top:0,behavior:'smooth'})}
function go(){
  const q=search.value.trim()||'events near you';
  openM(`Searching: ${q}`,`Your search is ready. The next platform upgrade can connect approved live event data and eligible affiliate links to relevant results.`);
}
function quick(q){search.value=q;go()}
search.addEventListener('keydown',e=>{if(e.key==='Enter')go()});
modal.addEventListener('click',e=>{if(e.target===modal)closeM()});
const ideas=[
  'Find a local outdoor movie, market, museum day or community festival.',
  'Build a last-minute plan around live music, food and a new neighborhood.',
  'Pick one new city activity you have never tried before.',
  'Search for daytime festivals and free public events with friends.'
];
let n=0;
function shuffle(){n=(n+1)%ideas.length;idea.textContent=ideas[n]}
