export const tagGroups = [
  {id:'mood',label:'분위기',icon:'☾',tags:['청량','달달','신나는','몽환','잔잔','애절','강렬','그루비']},
  {id:'genre',label:'장르',icon:'♫',tags:['팝','일렉트로닉','힙합','R&B','발라드','밴드','어쿠스틱','OST']},
  {id:'situation',label:'상황',icon:'✦',tags:['드라이브','운동','새벽','저녁','집중','봄','여름','가을','겨울']}
];
export const tags = tagGroups.flatMap(group=>group.tags);
// These rules suggest listening contexts; they do not analyze audio.
export const classify = (song, editorial) => {
  const artist=song.artist, words=`${song.title} ${song.album||''}`.toLowerCase(), labels=new Set();
  const add=(...values)=>values.forEach(value=>labels.add(value));
  const genre=(song.apiGenre||'').toLowerCase();
  if(/hip.hop|rap/.test(genre))add('힙합','강렬','그루비');
  else if(/r&b|soul/.test(genre))add('R&B','그루비','저녁');
  else if(/rock|alternative/.test(genre))add('밴드','신나는');
  else if(/electronic|dance/.test(genre))add('일렉트로닉','신나는');
  else add('팝');
  if(['DAY6','Xdinary Heroes','N.Flying','CNBLUE','FTISLAND'].includes(artist))add('밴드','신나는','드라이브');
  else if(['Heize','BIBI'].includes(artist))add('R&B','그루비','저녁');
  else if(['IU','TAEYEON','WENDY'].includes(artist))add('잔잔','저녁');
  else if(['AKMU','BOL4'].includes(artist))add('어쿠스틱','잔잔','봄','집중');
  else if(['Stray Kids','ATEEZ','P1Harmony','MONSTA X','NCT 127'].includes(artist))add('강렬','힙합','운동');
  else if(['aespa','ITZY','BLACKPINK','BABYMONSTER','LE SSERAFIM'].includes(artist))add('강렬','일렉트로닉','운동');
  else if(['NewJeans','KISS OF LIFE','JENNIE','LISA'].includes(artist))add('그루비','R&B','드라이브');
  else if(['Red Velvet','OH MY GIRL','GFRIEND','tripleS','ILLIT'].includes(artist))add('몽환','팝','저녁');
  else add('신나는','팝','드라이브');
  const rules=[
    [/summer|sunshine|sunny|ocean|beach|wave|surf|여름|바다|파도/,'청량','여름','드라이브'],
    [/spring|bloom|blossom|flower|cherry|봄|꽃/,'청량','달달','봄'],
    [/winter|snow|christmas|december|겨울|눈꽃|크리스마스/,'잔잔','겨울','저녁'],
    [/autumn|falling leaves|october|가을|낙엽/,'잔잔','가을','저녁'],
    [/dream|moon|midnight|starlight|galaxy|cosmic|꿈|달빛|우주|별빛/,'몽환','새벽'],
    [/love|sweet|kiss|honey|crush|cupid|sugar|사랑|설렘|입맞춤/,'달달','봄'],
    [/cry|tears|goodbye|farewell|miss you|lonely|hurt|sad|이별|눈물|그리워|안녕/,'애절','발라드','새벽','가을'],
    [/piano|acoustic|lullaby|good night|sleep|자장가|잘자|편지/,'잔잔','어쿠스틱','집중','저녁'],
    [/fire|bang|boom|thunder|savage|monster|kill|warrior|불꽃|전쟁/,'강렬','운동'],
    [/dance|party|disco|rhythm|funk|groove|춤|리듬/,'신나는','그루비','드라이브'],
    [/soundtrack|original television|\bost\b|original motion|드라마|영화/,'OST','잔잔','집중']
  ];
  for(const [pattern,...values] of rules)if(pattern.test(words))add(...values);
  if(editorial){
    for(const value of editorial.tags)if(tags.includes(value))add(value);
    if(editorial.tags.includes('댄스'))add('팝','신나는','드라이브');
    if(editorial.tags.includes('발라드')){labels.delete('강렬');labels.delete('운동');add('잔잔','발라드','저녁');}
  }
  // Track-specific overrides take precedence over broad artist/style rules.
  const overrides={
    'RIIZE|Insomnia':['잔잔','애절','그루비','팝','어쿠스틱','새벽','저녁','가을'],
    'IVE|Looks Can Kill':['강렬','그루비','팝','일렉트로닉','운동','드라이브'],
    'IVE|REBEL HEART':['청량','신나는','팝','드라이브','봄'],
    'IVE|ATTITUDE':['강렬','그루비','팝','일렉트로닉','운동'],
    'NMIXX|긴 소원 (Birthday Wish)':['청량','신나는','팝','일렉트로닉','드라이브'],
    'NMIXX|Birthday Wish':['청량','신나는','팝','일렉트로닉','드라이브'],
    'NMIXX|Kerosene':['강렬','신나는','팝','일렉트로닉','운동'],
    'NMIXX|Blue Valentine':['몽환','애절','팝','일렉트로닉','새벽','가을'],
    'NMIXX|KNOW ABOUT ME':['몽환','그루비','R&B','새벽','저녁'],
    'BABYMONSTER|DESERVE':['잔잔','애절','팝','발라드','저녁','가을'],
    'LE SSERAFIM|HOT':['그루비','신나는','팝','운동','드라이브'],
    'aespa|Dirty Work':['강렬','그루비','팝','일렉트로닉','운동'],
    'JENNIE|like JENNIE':['강렬','그루비','힙합','팝','운동'],
    'BLACKPINK|JUMP':['신나는','강렬','일렉트로닉','팝','운동','여름']
  };
  const override=overrides[`${artist}|${song.title}`];
  return {tags:override||[...labels],tagMethod:override?'curated':editorial?'mixed':'suggested'};
};
