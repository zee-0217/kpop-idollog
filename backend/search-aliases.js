// Names refer only to artists already present in the catalog.
export const artistAliases={
  'Jung Kook':['정국','Jungkook'],'NAYEON':['나연'],
  'Jimin':['지민'],'j-hope':['제이홉'],'Jin':['진'],'RM':['알엠'],
  'Agust D':['어거스트 디','슈가','SUGA'],'V':['뷔'],
  'JIHYO':['지효'],'TZUYU':['쯔위'],'CHAEYOUNG':['채영'],
  'KEY':['키'],'ONEW':['온유'],'MINHO':['민호'],'SEULGI':['슬기'],
  'IRENE':['아이린'],'JOY':['조이'],'BAEKHYUN':['백현'],'D.O.':['디오','도경수'],
  'KAI':['카이'],'SUHO':['수호'],'CHEN':['첸'],'XIUMIN':['시우민'],
  'YUQI':['우기'],'MINNIE':['민니'],'MIYEON':['미연'],
  'JEON SOMI':['전소미','소미'],'CHUNG HA':['청하'],'SUNMI':['선미'],
  'KANGDANIEL':['강다니엘'],'Sung Hanbin':['성한빈'],
  'A2O SOUL':['에이투오 소울','A2O소울'],'A2O LITE':['에이투오 라이트','A2O라이트'],
  'AND2BLE':['앤더블','앤더블유'],'JEONGHAN X JOSHUA':['정한 조슈아','정한X조슈아'],
  'RESCENE':['리센느'],
  'ILLIT':['아일릿'],'RIIZE':['라이즈'],'ATEEZ':['에이티즈'],
  'BABYMONSTER':['베이비몬스터','베몬'],'BOL4':['볼빨간사춘기'],
  'LISA':['리사'],'IVE':['아이브'],'Heize':['헤이즈'],
  'Hearts2Hearts':['하츠투하츠','하투하'],'tripleS':['트리플에스'],
  'NCT WISH':['엔시티 위시'],'PLAVE':['플레이브'],
  'Xdinary Heroes':['엑스디너리 히어로즈','엑디즈'],'N.Flying':['엔플라잉'],
  'KickFlip':['킥플립'],'FTISLAND':['에프티아일랜드','FT아일랜드'],
  'BOYNEXTDOOR':['보이넥스트도어','보넥도'],'CNBLUE':['씨엔블루','씨앤블루'],
  'aespa':['에스파'],'LE SSERAFIM':['르세라핌'],'IU':['아이유'],
  'Stray Kids':['스트레이 키즈','스키즈','SKZ'],'JISOO':['지수'],
  'MONSTA X':['몬스타엑스','몬엑'],'TAEMIN':['태민'],'JENNIE':['제니'],
  'NCT 127':['엔시티 127','엔시티 일이칠'],'ENHYPEN':['엔하이픈'],
  'ZEROBASEONE':['제로베이스원','제베원','ZB1'],
  'TOMORROW X TOGETHER':['투모로우바이투게더','투바투','TXT'],
  'KATSEYE':['캣츠아이','카츠아이'],'KISS OF LIFE':['키스오브라이프','키오프'],
  'TWS':['투어스'],'Red Velvet':['레드벨벳'],'fromis_9':['프로미스나인'],
  'i-dle':['아이들','여자아이들','(G)I-DLE','GIDLE'],
  'TAEYEON':['태연'],'STAYC':['스테이씨'],'BTS':['방탄소년단','방탄','비티에스'],
  'SHINee':['샤이니'],'BIBI':['비비'],'ITZY':['있지'],'NMIXX':['엔믹스'],
  'AKMU':['악뮤','악동뮤지션'],'Kep1er':['케플러'],'P1Harmony':['피원하모니'],
  'SEVENTEEN':['세븐틴','SVT'],'BLACKPINK':['블랙핑크','블핑'],
  'EXO':['엑소'],'WENDY':['웬디'],'DAY6':['데이식스'],
  'NCT DREAM':['엔시티 드림','엔드림'],'THE BOYZ':['더보이즈','덥즈'],
  'TWICE':['트와이스'],'OH MY GIRL':['오마이걸','옴걸'],
  'ROSÉ':['로제'],'GFRIEND':['여자친구'],'NewJeans':['뉴진스'],'TREASURE':['트레저']
};
export const titleAliases={
  'Jung Kook|Seven':['세븐'],'Jung Kook|Standing Next to You':['스탠딩 넥스트 투 유'],
  'NAYEON|POP!':['팝'],'NAYEON|ABCD':['에이비씨디'],
  'aespa|Next Level':['넥스트 레벨'],'aespa|Supernova':['슈퍼노바'],
  'aespa|Whiplash':['위플래시'],'aespa|Dirty Work':['더티 워크'],
  'aespa|Drama':['드라마'],'aespa|Black Mamba':['블랙맘바'],
  'aespa|Spicy':['스파이시'],'aespa|Armageddon':['아마겟돈'],
  'aespa|Dreams Come True':['드림스 컴 트루'],
  'IVE|LOVE DIVE':['러브 다이브'],'IVE|After LIKE':['애프터 라이크'],
  'IVE|Looks Can Kill':['룩스 캔 킬'],'BTS|Dynamite':['다이너마이트'],
  'BTS|Butter':['버터'],'BTS|Spring Day':['봄날'],
  'NewJeans|Hype Boy':['하입보이'],'NewJeans|Ditto':['디토'],
  'NewJeans|Super Shy':['슈퍼 샤이'],'RIIZE|Insomnia':['인섬니아']
};
export const normalizeSearch=value=>value.normalize('NFKD').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
const aliasArtists=new Map(Object.entries(artistAliases).flatMap(([artist,aliases])=>[artist,...aliases].map(alias=>[normalizeSearch(alias),artist])));
export const resolveArtistQuery=query=>aliasArtists.get(normalizeSearch(query))||null;
const songAliasRows=Object.entries(titleAliases).map(([key,aliases])=>{const [artist,title]=key.split('|');return {artist:normalizeSearch(artist),title:normalizeSearch(title),aliases};});
export function searchTextFor(song){
  const normalizedArtist=normalizeSearch(song.artist),normalizedTitle=normalizeSearch(song.title);
  const extra=songAliasRows.filter(row=>row.artist===normalizedArtist&&(normalizedTitle===row.title||normalizedTitle.endsWith(row.title))).flatMap(row=>row.aliases);
  return normalizeSearch([song.artist,...(artistAliases[song.artist]||[]),song.title,song.album||'',...extra].join(' '));
}
