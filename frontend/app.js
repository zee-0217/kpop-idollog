const $ = selector => document.querySelector(selector);
const icons = {'몽환':'☾','청량':'❋','달달':'♡','컨셉':'✦','댄스':'♫','발라드':'♧'};
const colors = ['#e4d6c9','#cddfdb','#e6c5cd','#e8dfb4','#cdd6d0','#d8cfc6','#edcdb8'];
const today = new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(new Date());
let month = today.slice(0,7), selectedDate = today, events = [], calendarData = null, calendarError = false;
let tagGroups = [], tagCounts = {}, selectedTags = new Set(), songs = [], hasMore = false, totalSongs = 0;
let searchTimer, loadingMore = false, calendarLoading = true;
let discoverySeed=crypto.randomUUID();
let automaticYear=true, heroRequest=0;
let calendarRequest = 0, recommendationRequest = 0, toastTimer;
const refreshedArtists = new Map();
let artistSlots = 0;
const artistQueue = [];
function queuedArtist(artist) {
  return new Promise((resolve,reject) => {
    const run = () => {artistSlots++;api(`/api/artist?name=${encodeURIComponent(artist)}`).then(resolve,reject).finally(()=>{artistSlots--;artistQueue.shift()?.();});};
    if(artistSlots<2)run();else artistQueue.push(run);
  });
}
const text = (tag, content, className) => {const el=document.createElement(tag);el.textContent=content;if(className)el.className=className;return el;};
const normalize = value => value.normalize('NFKD').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
const safeURL = value => {try{const u=new URL(value);return u.protocol==='https:' ? u.href : '';}catch{return '';}};
async function api(path) {const response=await fetch(path);const data=await response.json();if(!response.ok)throw new Error(data.error || '정보를 불러오지 못했습니다.');return data;}
function showToast(message) {clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').hidden=false;toastTimer=setTimeout(()=>{$('#toast').hidden=true;},4500);}
function dateLabel(date) {return new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',weekday:'long',timeZone:'UTC'}).format(new Date(`${date}T00:00:00Z`));}
function addLink(parent,label,url,className) {const href=safeURL(url);if(!href)return;const a=text('a',label,className);a.href=href;a.target='_blank';a.rel='noopener noreferrer';parent.append(a);}

function renderCalendar() {
  const [year,number]=month.split('-').map(Number);
  $('#month-label').textContent=`${year}년 ${number}월`;
  $('#month-english').textContent=new Intl.DateTimeFormat('en-US',{month:'long',timeZone:'UTC'}).format(new Date(Date.UTC(year,number-1,1))).toUpperCase();
  $('#prev-month').disabled=month==='2000-01';$('#next-month').disabled=month==='2099-12';
  const first=new Date(Date.UTC(year,number-1,1)), offset=first.getUTCDay(), days=new Date(Date.UTC(year,number,0)).getUTCDate();
  const cells=Math.ceil((offset+days)/7)*7, fragment=document.createDocumentFragment();
  for(let i=0;i<cells;i++) {
    const date=new Date(Date.UTC(year,number-1,i-offset+1)).toISOString().slice(0,10), same=date.startsWith(month), matches=events.filter(e=>e.date===date);
    const button=document.createElement('button');button.type='button';button.className=`calendar-day${same?'':' outside'}${date===today?' is-today':''}${date===selectedDate?' is-selected':''}`;
    button.setAttribute('aria-label',`${dateLabel(date)}${date===today?', 오늘':''}, ${calendarError?'발매 정보 확인 불가':`발매 ${matches.length}건`}`);
    button.setAttribute('aria-pressed',String(date===selectedDate));
    if(date===today)button.setAttribute('aria-current','date');
    button.append(text('span',String(Number(date.slice(8))),'date-number'));
    matches.slice(0,2).forEach((event,index)=>button.append(text('span',event.artist,`event-chip${index?' second':''}`)));
    if(matches.length>2)button.append(text('span',`+${matches.length-2} 더보기`,'event-count'));
    button.addEventListener('click',()=>{if(!same){month=date.slice(0,7);selectedDate=date;loadCalendar();}else{selectedDate=date;renderCalendar();renderDay();}});
    fragment.append(button);
  }
  $('#calendar-grid').replaceChildren(fragment);
}
function renderDay() {
  $('#day-title').textContent=dateLabel(selectedDate);
  const matches=events.filter(event=>event.date===selectedDate),container=$('#day-events');container.replaceChildren();
  $('#day-subtitle').textContent=calendarLoading?'확인된 소식을 모으는 중이에요':calendarError?'발매 정보를 확인할 수 없어요':matches.length?matches.length+'개의 새로운 소식':'나의 다음 최애를 기다리는 날';
  if(!matches.length){const box=document.createElement('div');box.className='day-empty';box.append(text('span',calendarLoading?'♫':calendarError?'↻':'♧'),text('h4',calendarLoading?'컴백 소식을 불러오는 중':calendarError?'잠시 연결이 쉬고 있어요':'아직 등록된 소식이 없어요'),text('p',calendarError?'아래 다시 불러오기를 눌러주세요.':'달력에 표시된 날짜를 눌러 확인해 보세요.'));container.append(box);return;}
  for(const event of matches){
    const card=document.createElement('article');card.className='day-release';
    card.append(text('span',(event.date>today?'예정 · ':'')+(event.origin==='news'?'뉴스 확인':'음악 DB')),text('h4',event.artist),text('p',event.title));
    if(event.sources){for(const source of event.sources)addLink(card,source.name+' 원문 ↗',source.url,'event-source');card.append(text('small','확인일 '+event.verifiedAt,'event-verified'));}
    else addLink(card,'MusicBrainz 발매 정보 ↗',event.url,'event-source');
    container.append(card);
  }
}
function renderMonthNews(){
  const news=events.filter(event=>event.origin==='news');
  $('#month-news-summary').textContent='이번 달 뉴스·공식 공지로 확인한 일정 '+news.length+'건';
  $('#month-news-list').replaceChildren(...news.map(event=>{const item=document.createElement('article');item.append(text('time',event.date.slice(5).replace('-','.'),'news-date'),text('strong',event.artist),text('span',event.title));addLink(item,event.sources[0].name+' ↗',event.url);return item;}));
}
function applyCalendarEvents(next){events=next;calendarLoading=false;renderCalendar();renderDay();renderMonthNews();}
async function loadCalendar(){
  const id=++calendarRequest;events=[];calendarLoading=true;calendarError=false;renderCalendar();renderDay();renderMonthNews();
  $('#calendar-status').textContent='기사와 공식 공지에서 확인한 일정을 불러오는 중이에요…';$('#retry-calendar').hidden=true;
  try{
    const news=await api('/api/news?month='+month);if(id!==calendarRequest)return;
    applyCalendarEvents(news.events);
    $('#calendar-status').textContent='뉴스·공식 공지 '+news.events.length+'건 · '+news.verifiedAt+' 확인 · 음악 DB 추가 조회 중';
  }catch{}
  try{
    const data=await api('/api/calendar?month='+month);if(id!==calendarRequest)return;calendarData=data;applyCalendarEvents(data.events);
    $('#calendar-status').textContent='총 '+events.length+'건 · 뉴스 확인 '+(data.newsCount||0)+'건 · '+data.source+(data.warning?' · '+data.warning:'');
    $('#retry-calendar').hidden=!data.stale;
  }catch(error){
    if(id!==calendarRequest)return;calendarLoading=false;calendarError=!events.length;renderCalendar();renderDay();
    $('#calendar-status').textContent=events.length?'음악 DB 연결 지연 · 확인된 뉴스 '+events.length+'건 표시 중':error.message;$('#retry-calendar').hidden=false;
  }
}
function changeMonth(delta) {const [year,number]=month.split('-').map(Number);month=new Date(Date.UTC(year,number-1+delta,1)).toISOString().slice(0,7);selectedDate=month===today.slice(0,7)?today:`${month}-01`;loadCalendar();}
$('#prev-month').addEventListener('click',()=>changeMonth(-1));$('#next-month').addEventListener('click',()=>changeMonth(1));
$('#today-button').addEventListener('click',()=>{month=today.slice(0,7);selectedDate=today;loadCalendar();});$('#retry-calendar').addEventListener('click',loadCalendar);

function renderTags(){
  $('#tag-options').replaceChildren(...tagGroups.map(group=>{
    const field=document.createElement('fieldset');field.className='tag-group';
    const legend=text('legend',group.icon+' '+group.label);field.append(legend);
    const row=document.createElement('div');row.className='tag-row';
    for(const tag of group.tags){const button=document.createElement('button');button.type='button';button.className='tag-button';button.setAttribute('aria-pressed',String(selectedTags.has(tag)));button.append(text('b','#'+tag),text('small',Number(tagCounts[tag]||0).toLocaleString('ko-KR')));if(selectedTags.has(tag))button.append(text('span','✓','check'));button.addEventListener('click',()=>{selectedTags.has(tag)?selectedTags.delete(tag):selectedTags.add(tag);renderTags();loadSongs();});row.append(button);}
    field.append(row);return field;
  }));
}
$('#clear-tags').addEventListener('click',()=>{selectedTags.clear();renderTags();loadSongs();});
function matchTrack(song,tracks) {const title=normalize(song.title);return tracks.find(t=>normalize(t.title)===title)||tracks.find(t=>normalize(t.title).endsWith(title)&&!/(remix|live|instrumental|japanese|english|spedup|slowed)/i.test(t.title));}
function songCard(song,index) {
  const card=document.createElement('article');card.className='song-card';card.dataset.songId=song.id;
  const cover=document.createElement('div');cover.className='cover-wrap';cover.style.setProperty('--cover-bg',colors[Number(song.id.split('-').at(-1))%colors.length]);
  const fallback=document.createElement('div');fallback.className='cover-fallback';fallback.setAttribute('aria-hidden','true');fallback.append(text('span',icons[song.tags[0]]||'✦','cover-symbol'),text('b',song.title),text('small',song.artist));cover.append(fallback);
  if(safeURL(song.artwork)){const img=document.createElement('img');img.className='cover-image';img.src=safeURL(song.artwork).replace('/100x100bb.jpg','/400x400bb.jpg');img.alt=`${song.album||song.title} 앨범 커버`;img.loading='lazy';img.addEventListener('error',()=>img.remove(),{once:true});cover.append(img);}
  cover.append(text('span',String(index+1).padStart(2,'0'),'cover-number'));if(song.date>='2025-01-01')cover.append(text('span',song.date.slice(0,4)+' NEW','new-release'));
  const play=text('button','▶','play-button');play.type='button';play.setAttribute('aria-label',`${song.artist} ${song.title} 미리듣기`);play.addEventListener('click',()=>playSong(song,play));cover.append(play);card.append(cover,text('h4',song.title),text('p',song.artist,'song-artist'));
  const labels=document.createElement('div');labels.className='song-tags';const shown=[...new Set([...song.tags.filter(tag=>selectedTags.has(tag)),...song.tags])];shown.slice(0,5).forEach(tag=>labels.append(text('span','#'+tag,selectedTags.has(tag)?'match':'')));if(shown.length>5){const more=text('span','+'+(shown.length-5));more.title=shown.slice(5).map(tag=>'#'+tag).join(' ');labels.append(more);}card.append(labels);
  addLink(card,song.url?'Apple Music에서 듣기 ↗':'Apple Music에서 찾기 ↗',song.url||`https://music.apple.com/us/search?term=${encodeURIComponent(`${song.artist} ${song.title}`)}`,'song-link');
  const media=document.createElement('div');media.className='song-media';
  if(song.video){const button=text('button','▶ 공식 MV 보기','mv-button');button.type='button';button.addEventListener('click',()=>openMV(song));media.append(button);}
  const channels=document.createElement('details');channels.className='listen-channels';channels.append(text('summary','다른 채널에서 듣기 ↗'));const links=document.createElement('div');
  if(song.links){addLink(links,'YouTube MV 검색 ↗',song.links.youtube);addLink(links,'YouTube Music ↗',song.links.youtubeMusic);addLink(links,'Spotify 검색 ↗',song.links.spotify);}channels.append(links);media.append(channels);card.append(media);
  card.append(text('p',song.date?song.date+' · iTunes':'발매일 확인 중','song-meta'));const method=text('span',song.tagMethod==='curated'?'직접 분류':song.tagMethod==='mixed'?'직접 + 추천 분류':'추천 태그 · 추정','tag-method');method.title=song.tagMethod==='curated'?'편집자가 곡별로 분류한 태그입니다.':'제목·API 장르·아티스트 스타일을 바탕으로 추정했습니다. 음원 분석 결과가 아니며 실제 느낌과 다를 수 있습니다.';card.append(method);return card;
}
function renderSongs(){
  $('#song-grid').replaceChildren(...songs.map(songCard));$('#load-more').hidden=!hasMore;
  $('#load-more').disabled=loadingMore;
}
async function loadSongs(append=false){
  const id=append?recommendationRequest:++recommendationRequest,offset=append?songs.length:0;
  if(!append){songs=[];$('#song-grid').replaceChildren(text('p','당신의 취향을 모으고 있어요…','loading-songs'));$('#load-more').hidden=true;$('#recommendation-message').hidden=true;}
  loadingMore=append;$('#load-more').disabled=true;
  const params=new URLSearchParams({tags:[...selectedTags].join(','),year:$('#year-filter').value,q:$('#song-search').value,sort:$('#sort-songs').value,seed:discoverySeed,offset:String(offset),limit:'20'});
  try{
    const data=await api('/api/recommendations?'+params);if(id!==recommendationRequest)return;
    songs=append?[...songs,...data.songs]:data.songs;hasMore=data.hasMore;totalSongs=data.total;
    $('#result-count').textContent=data.total.toLocaleString('ko-KR');
    $('#recommendation-summary').textContent=(selectedTags.size?[...selectedTags].map(tag=>'#'+tag).join(' + ')+' · 모든 태그 교집합':(data.sort==='random'?($('#year-filter').value==='all'?'취향을 넓히는 랜덤 추천':$('#year-filter').selectedOptions[0].textContent+' 랜덤 추천'):'새로운 음악부터 만나는 나의 라이브러리'))+' · '+songs.length+' / '+data.total.toLocaleString('ko-KR')+'곡';
    if(!data.enough){$('#recommendation-message').textContent=data.total?'이 조건에 맞는 곡은 '+data.total+'곡이에요. 태그나 연도 조건을 줄이면 더 많은 음악을 만날 수 있어요.':'이 조건에 맞는 곡이 없어요. 선택한 태그, 검색어 또는 연도 조건을 조정해 보세요.';$('#recommendation-message').hidden=false;}
    loadingMore=false;renderSongs();
  }catch(error){if(id!==recommendationRequest)return;loadingMore=false;$('#load-more').disabled=false;if(!append)$('#song-grid').replaceChildren();$('#recommendation-summary').textContent='추천을 불러오지 못했어요.';$('#recommendation-message').replaceChildren(text('span',error.message+' '));const retry=text('button','다시 시도','text-button');retry.addEventListener('click',()=>loadSongs(append));$('#recommendation-message').append(retry);$('#recommendation-message').hidden=false;}
}
function refreshArtist(artist) {if(!refreshedArtists.has(artist)){const job=queuedArtist(artist).catch(error=>{refreshedArtists.delete(artist);throw error;});refreshedArtists.set(artist,job);}return refreshedArtists.get(artist);}

async function playSong(song,button) {
  button.disabled=true;
  try{if(!safeURL(song.preview)){const data=await refreshArtist(song.artist),found=matchTrack(song,data.tracks);if(found)Object.assign(song,found,{title:song.title});}
    if(!safeURL(song.preview)){showToast('미리듣기가 제공되지 않는 곡이에요. Apple Music 링크에서 확인해 주세요.');return;}
    $('#player-title').textContent=song.title;$('#player-artist').textContent=`${song.artist} · iTunes 미리듣기`;$('#audio').src=safeURL(song.preview);$('#player').hidden=false;await $('#audio').play();
  }catch{showToast('미리듣기를 불러오지 못했어요. 아래 Apple Music 링크를 이용해 주세요.');}finally{button.disabled=false;}
}
$('#sort-songs').addEventListener('change',()=>{if($('#sort-songs').value==='random')discoverySeed=crypto.randomUUID();loadSongs();});$('#year-filter').addEventListener('change',()=>{automaticYear=false;loadSongs();});$('#song-search').addEventListener('input',()=>{clearTimeout(searchTimer);if(automaticYear&&$('#song-search').value.trim()){automaticYear=false;$('#year-filter').value='all';}searchTimer=setTimeout(()=>loadSongs(),250);});$('#load-more').addEventListener('click',()=>{if(!loadingMore)loadSongs(true);});$('#close-player').addEventListener('click',()=>{$('#audio').pause();$('#audio').removeAttribute('src');$('#audio').load();$('#player').hidden=true;});
$('#audio').addEventListener('error',()=>showToast('미리듣기 파일을 재생하지 못했어요. Apple Music에서 확인해 주세요.'));
async function init(){
  const currentYear=today.slice(0,4);$('#year-filter').querySelector('[value=current]').textContent=currentYear+'년 (올해)';$('#year-filter').querySelector('[value="'+currentYear+'"]')?.remove();
  loadCalendar();refreshHero();
  try{const data=await api('/api/tags');tagGroups=data.groups;tagCounts=data.counts;renderTags();loadSongs();}
  catch(error){$('#recommendation-summary').textContent=error.message;const retry=text('button','다시 불러오기','text-button');retry.addEventListener('click',()=>{retry.remove();init();});$('#tag-options').append(retry);}
}
function closeMV(){ $('#mv-embed').replaceChildren();$('#mv-dialog').close(); }
function openMV(song){
  if(!song.video||!/^[a-zA-Z0-9_-]{11}$/.test(song.video.id))return;
  $('#audio').pause();$('#mv-title').textContent=song.artist+' · '+song.title;
  $('#mv-channel').textContent=song.video.channel+' · 공식 업로드';
  $('#mv-external').href='https://www.youtube.com/watch?v='+song.video.id;
  const frame=document.createElement('iframe');frame.src='https://www.youtube-nocookie.com/embed/'+song.video.id+'?autoplay=1&rel=0';frame.title=song.artist+' '+song.title+' 공식 뮤직비디오';frame.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';
  $('#mv-embed').replaceChildren(frame);$('#mv-dialog').showModal();
}
$('#close-mv').addEventListener('click',closeMV);
$('#mv-dialog').addEventListener('cancel',()=>$('#mv-embed').replaceChildren());
$('#mv-dialog').addEventListener('click',event=>{if(event.target===$('#mv-dialog')){const rect=event.target.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)closeMV();}});
async function refreshHero(){
  const version=++heroRequest,button=$('#shuffle-hero');button.disabled=true;button.setAttribute('aria-busy','true');
  try{
    const exclude=[...document.querySelectorAll('.photocard')].map(card=>card.dataset.artist).filter(Boolean).join(',');
    const data=await api('/api/hero?'+new URLSearchParams({seed:crypto.randomUUID(),exclude}));
    await Promise.all(data.photos.map(photo=>new Promise((resolve,reject)=>{const img=new Image(),timer=setTimeout(()=>reject(new Error('Image timeout')),12000);img.onload=()=>{clearTimeout(timer);resolve();};img.onerror=()=>{clearTimeout(timer);reject(new Error('Image failed'));};img.src=safeURL(photo.artwork);})));if(version!==heroRequest)return;
    for(const [index,photo] of data.photos.entries()){
      const card=document.querySelectorAll('.photocard')[index];if(!card)continue;
      card.href=safeURL(photo.url);card.dataset.artist=photo.artist;card.setAttribute('aria-label',photo.artist+' '+photo.title+' Apple Music에서 듣기');card.querySelector('img').src=safeURL(photo.artwork);card.querySelector('img').alt=photo.artist+' '+photo.album+' 앨범 커버';card.querySelector('.photo-caption small').textContent=photo.artist+' · '+photo.title+' ↗';
    }
  }catch{if(version===heroRequest)showToast('포토카드를 불러오지 못했어요. 잠시 후 다시 뽑아주세요.');}
  finally{if(version===heroRequest){button.disabled=false;button.removeAttribute('aria-busy');}}
}
$('#shuffle-hero').addEventListener('click',refreshHero);
$('#surprise-playlist').addEventListener('click',async()=>{
  const button=$('#surprise-playlist');button.disabled=true;button.setAttribute('aria-busy','true');
  try{
    const seed=crypto.randomUUID(),year=$('#year-filter').value,version=recommendationRequest;
    const data=await api('/api/surprise?'+new URLSearchParams({year,seed}));
    if($('#year-filter').value!==year||version!==recommendationRequest)return;
    clearTimeout(searchTimer);$('#song-search').value='';selectedTags=new Set(data.selected);discoverySeed=seed;$('#sort-songs').value='random';renderTags();await loadSongs();
    showToast('오늘의 취향 뽑기! '+data.selected.map(tag=>'#'+tag).join(' '));
    $('#recommendation-summary').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});
  }catch(error){showToast(error.message);}
  finally{button.disabled=false;button.removeAttribute('aria-busy');}
});
init();
