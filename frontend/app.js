const $ = selector => document.querySelector(selector);
const icons = {'몽환':'☾','청량':'❋','달달':'♡','컨셉':'✦','댄스':'♫','발라드':'♧'};
const colors = ['#e4d6c9','#cddfdb','#e6c5cd','#e8dfb4','#cdd6d0','#d8cfc6','#edcdb8'];
const today = new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(new Date());
let month = today.slice(0,7), selectedDate = today, events = [], calendarData = null, calendarError = false;
let availableTags = [], selectedTags = new Set(['몽환','댄스']), songs = [], visibleCount = 10;
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
  const matches=events.filter(e=>e.date===selectedDate), container=$('#day-events');container.replaceChildren();
  $('#day-subtitle').textContent=calendarError?'발매 정보를 확인할 수 없어요':matches.length ? `${matches.length}개의 새로운 음악이 기다려요`:'나의 다음 최애를 기다리는 날';
  if(!matches.length){const box=document.createElement('div');box.className='day-empty';box.append(text('span',calendarError?'↻':'♧'),text('h4',calendarError?'잠시 연결이 쉬고 있어요':'아직 등록된 발매가 없어요'),text('p',calendarError?'아래의 다시 불러오기를 눌러주세요.':'예정 정보는 등록 후 표시돼요.\n그동안 새로운 취향을 만나볼까요?'));container.append(box);return;}
  for(const event of matches){const card=document.createElement('article');card.className='day-release';card.append(text('span',`${event.date>today?'UPCOMING · ':''}${event.type.toUpperCase()}`),text('h4',event.artist),text('p',event.title));addLink(card,'발매 정보 확인 ↗',event.url);container.append(card);}
}
async function loadCalendar() {
  const id=++calendarRequest;events=[];calendarData=null;calendarError=false;renderCalendar();renderDay();
  $('#calendar-status').textContent='MusicBrainz에서 발매 정보를 불러오는 중이에요…';$('#retry-calendar').hidden=true;
  try {const data=await api(`/api/calendar?month=${month}`);if(id!==calendarRequest)return;calendarData=data;events=data.events;renderCalendar();renderDay();
    $('#calendar-status').textContent=`${data.trackedArtists}팀 조회 · ${events.length}건 등록 · ${data.stale?'이전 조회 결과':new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit'}).format(new Date(data.updatedAt))+' 확인'}${data.partial?' · 일부 결과만 표시':''}${data.warning?' · '+data.warning:''}`;
    $('#retry-calendar').hidden=!data.stale;
  } catch(error){if(id!==calendarRequest)return;calendarError=true;renderCalendar();renderDay();$('#calendar-status').textContent=error.message;$('#retry-calendar').hidden=false;}
}
function changeMonth(delta) {const [year,number]=month.split('-').map(Number);month=new Date(Date.UTC(year,number-1+delta,1)).toISOString().slice(0,7);selectedDate=month===today.slice(0,7)?today:`${month}-01`;loadCalendar();}
$('#prev-month').addEventListener('click',()=>changeMonth(-1));$('#next-month').addEventListener('click',()=>changeMonth(1));
$('#today-button').addEventListener('click',()=>{month=today.slice(0,7);selectedDate=today;loadCalendar();});$('#retry-calendar').addEventListener('click',loadCalendar);

function renderTags() {$('#tag-options').replaceChildren(...availableTags.map(tag=>{const button=document.createElement('button');button.type='button';button.className='tag-button';button.setAttribute('aria-pressed',String(selectedTags.has(tag)));button.append(text('span',icons[tag]||'✦'),text('b',`#${tag}`));if(selectedTags.has(tag))button.append(text('span','✓','check'));button.addEventListener('click',()=>{selectedTags.has(tag)?selectedTags.delete(tag):selectedTags.add(tag);renderTags();loadSongs();});return button;}));}
$('#clear-tags').addEventListener('click',()=>{selectedTags.clear();renderTags();loadSongs();});
function matchTrack(song,tracks) {const title=normalize(song.title);return tracks.find(t=>normalize(t.title)===title)||tracks.find(t=>normalize(t.title).endsWith(title)&&!/(remix|live|instrumental|japanese|english|spedup|slowed)/i.test(t.title));}
function songCard(song,index) {
  const card=document.createElement('article');card.className='song-card';card.dataset.songId=song.id;
  const cover=document.createElement('div');cover.className='cover-wrap';cover.style.setProperty('--cover-bg',colors[Number(song.id.split('-')[0])%colors.length]);
  const fallback=document.createElement('div');fallback.className='cover-fallback';fallback.setAttribute('aria-hidden','true');fallback.append(text('span',icons[song.tags[0]]||'✦','cover-symbol'),text('b',song.title),text('small',song.artist));cover.append(fallback);
  if(safeURL(song.artwork)){const img=document.createElement('img');img.className='cover-image';img.src=song.artwork;img.alt=`${song.album||song.title} 앨범 커버`;img.loading='lazy';img.addEventListener('error',()=>img.remove(),{once:true});cover.append(img);}
  cover.append(text('span',String(index+1).padStart(2,'0'),'cover-number'));
  const play=text('button','▶','play-button');play.type='button';play.setAttribute('aria-label',`${song.artist} ${song.title} 미리듣기`);play.addEventListener('click',()=>playSong(song,play));cover.append(play);card.append(cover,text('h4',song.title),text('p',song.artist,'song-artist'));
  const labels=document.createElement('div');labels.className='song-tags';song.tags.forEach(tag=>labels.append(text('span',`#${tag}`,selectedTags.has(tag)?'match':'')));card.append(labels);
  addLink(card,song.url?'Apple Music에서 듣기 ↗':'Apple Music에서 찾기 ↗',song.url||`https://music.apple.com/us/search?term=${encodeURIComponent(`${song.artist} ${song.title}`)}`,'song-link');
  card.append(text('p',song.date?`${song.date} · iTunes`:'앨범 정보 조회 중','song-meta'));return card;
}
function renderSongs() {const sort=$('#sort-songs').value,ordered=[...songs];if(sort!=='discovery')ordered.sort((a,b)=>a[sort].localeCompare(b[sort],'ko'));$('#song-grid').replaceChildren(...ordered.slice(0,visibleCount).map(songCard));$('#load-more').hidden=visibleCount>=songs.length;hydrateArtists(ordered.slice(0,visibleCount));}
async function loadSongs() {
  const id=++recommendationRequest;visibleCount=10;$('#song-grid').replaceChildren(text('p','당신의 취향을 모으고 있어요…','loading-songs'));$('#load-more').hidden=true;$('#recommendation-message').hidden=true;
  try {const data=await api(`/api/recommendations?tags=${encodeURIComponent([...selectedTags].join(','))}`);if(id!==recommendationRequest)return;songs=data.songs;$('#result-count').textContent=String(data.total);$('#recommendation-summary').textContent=selectedTags.size?`${[...selectedTags].map(t=>'#'+t).join(' + ')} · 모든 태그가 겹치는 ${data.total}곡`:`전체 큐레이션 ${data.total}곡에서 새로운 취향을 발견해 보세요.`;
    if(!data.enough){$('#recommendation-message').textContent=data.total?`선택한 태그를 모두 포함하는 곡은 ${data.total}곡이에요. 태그를 줄이면 10곡 이상 만날 수 있어요.`:'아직 이 조합의 곡은 없어요. 태그 하나를 해제해 새로운 음악을 찾아보세요.';$('#recommendation-message').hidden=false;}renderSongs();
  }catch(error){if(id!==recommendationRequest)return;$('#song-grid').replaceChildren();$('#result-count').textContent='—';$('#recommendation-summary').textContent='추천을 불러오지 못했어요.';$('#recommendation-message').replaceChildren(text('span',error.message+' '));const retry=text('button','다시 시도','text-button');retry.addEventListener('click',loadSongs);$('#recommendation-message').append(retry);$('#recommendation-message').hidden=false;}
}
function refreshArtist(artist) {if(!refreshedArtists.has(artist)){const job=queuedArtist(artist).catch(error=>{refreshedArtists.delete(artist);throw error;});refreshedArtists.set(artist,job);}return refreshedArtists.get(artist);}
function hydrateArtists(visibleSongs) {
  for(const artist of new Set(visibleSongs.filter(s=>!s.liveChecked).map(s=>s.artist))){const version=recommendationRequest;refreshArtist(artist).then(data=>{if(version!==recommendationRequest)return;let changed=false;for(const song of songs.filter(s=>s.artist===artist&&!s.liveChecked)){const found=matchTrack(song,data.tracks);if(found)Object.assign(song,found,{title:song.title,artist:song.artist});song.liveChecked=true;changed=true;}if(changed)renderSongs();}).catch(()=>{for(const card of $('#song-grid').children){const song=songs.find(s=>s.id===card.dataset.songId);if(song?.artist===artist&&!song.date)card.querySelector('.song-meta').textContent='앨범 정보 연결 지연 · 큐레이션';}});}
}
async function playSong(song,button) {
  button.disabled=true;
  try{if(!safeURL(song.preview)){const data=await refreshArtist(song.artist),found=matchTrack(song,data.tracks);if(found)Object.assign(song,found,{title:song.title});}
    if(!safeURL(song.preview)){showToast('미리듣기가 제공되지 않는 곡이에요. Apple Music 링크에서 확인해 주세요.');return;}
    $('#player-title').textContent=song.title;$('#player-artist').textContent=`${song.artist} · iTunes 미리듣기`;$('#audio').src=safeURL(song.preview);$('#player').hidden=false;await $('#audio').play();
  }catch{showToast('미리듣기를 불러오지 못했어요. 아래 Apple Music 링크를 이용해 주세요.');}finally{button.disabled=false;}
}
$('#sort-songs').addEventListener('change',renderSongs);$('#load-more').addEventListener('click',()=>{visibleCount+=10;renderSongs();});$('#close-player').addEventListener('click',()=>{$('#audio').pause();$('#audio').removeAttribute('src');$('#audio').load();$('#player').hidden=true;});
$('#audio').addEventListener('error',()=>showToast('미리듣기 파일을 재생하지 못했어요. Apple Music에서 확인해 주세요.'));
async function init(){loadCalendar();try{const data=await api('/api/tags');availableTags=data.tags;renderTags();loadSongs();}catch(error){$('#recommendation-summary').textContent=error.message;const retry=text('button','다시 불러오기','text-button');retry.addEventListener('click',()=>{retry.remove();init();});$('#tag-options').append(retry);}}
init();
