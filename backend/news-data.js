// Release facts checked against the linked reporting/official notices on 2026-10-27.
// No article bodies are stored. News dates are KST and take precedence over DB dates.
export const newsSources = {
  sbs:{name:'SBS 뉴스',url:'https://news.sbs.co.kr/english/article.do?news_id=N1008790503',publishedAt:'2026-10-09'},
  ive:{name:'스타투데이',url:'https://www.mk.co.kr/news/musics/12185870',publishedAt:'2026-10-26'},
  ivePre:{name:'뉴스엔',url:'https://www.newsen.com/news_view.php?uid=202610031059312410',publishedAt:'2026-10-03'},
  nmixx:{name:'JYP 공식 디스코그래피',url:'https://nmixx.jype.com/discography/vmgvjirm',publishedAt:'2026-10-19'},
  wish:{name:'Weverse 공식 판매 공지',url:'https://shop.weverse.io/ko/shop/KRW/artists/155/notices/14323',publishedAt:'2026-09-14'},
  yg:{name:'YG LIFE 공식 소식',url:'https://yg-life.com/archives/198054?lang=ko',publishedAt:'2026-10-23'},
  osen:{name:'OSEN',url:'https://www.osen.co.kr/article/G1112897052',publishedAt:'2026-10-23'},
  dream:{name:'뉴스핌',url:'https://mobile2.newspim.com/news/view/20261022000251',publishedAt:'2026-10-22'},
  dreamOfficial:{name:'Weverse 공식 판매 공지',url:'https://shop.weverse.io/ko/shop/USD/artists/131/notices/14634',publishedAt:'2026-10-16'},
  txt:{name:'TXT 일본 공식 사이트',url:'https://txt-official.jp/news/8b651dea9149',publishedAt:'2026-10-20'},
  ateez:{name:'티브이데일리',url:'https://m.tvdaily.co.kr/article.php?aid=17915055451805136010',publishedAt:'2026-10-09'},
  onew:{name:'Kstyle',url:'https://kstyle.com/article.ksn?articleNo=2283531'},
  riize:{name:'연합뉴스',url:'https://www.yna.co.kr/view/AKR20261025016400005',publishedAt:'2026-10-25'},
  kickflip:{name:'KBS WORLD',url:'https://world.kbs.co.kr/service/contents_view.htm?board_seq=471133&id=&lang=k&menu_cate=enternews'},
  lisa:{name:'노놀 매거진',url:'https://mag.nonol.co.kr/article/20261018-7a3ce0',publishedAt:'2026-10-18'}
};
const newsRows = [
  ['2026-10-06','KickFlip','KICK OFF THE WALL Pt.1','EP',['kickflip']],
  ['2026-10-07','ONEW','Tic Tac Toe (선공개)','Single',['onew']],
  ['2026-10-12','NCT WISH','I SPY','EP',['wish','sbs']],
  ['2026-10-12','PLAVE','컴백 · 신보 발표','Comeback',['sbs']],
  ['2026-10-12','Sung Hanbin','솔로 활동 시작','Comeback',['sbs']],
  ['2026-10-12','Xdinary Heroes','컴백 · 신보 발표','Comeback',['sbs']],
  ['2026-10-13','A2O SOUL','데뷔 디지털 싱글','Single',['sbs']],
  ['2026-10-13','A2O LITE','데뷔 디지털 싱글','Single',['sbs']],
  ['2026-10-19','JEONGHAN X JOSHUA','유닛 컴백 · 신보 발표','Comeback',['sbs']],
  ['2026-10-19','NMIXX','Strange Muse','EP',['nmixx','sbs']],
  ['2026-10-19','IVE','Looks Can Kill (선공개)','Single',['ivePre']],
  ['2026-10-20','ONEW','착각 (Illusion)','Single',['onew']],
  ['2026-10-23','BABYMONSTER','DESERVE','Single',['yg','osen','sbs']],
  ['2026-10-23','LISA','PRESS PLAY','EP',['lisa']],
  ['2026-10-26','IVE','Looks Can Kill','EP',['ive','sbs']],
  ['2026-10-26','ILLIT','컴백 · 새 미니앨범','EP',['sbs']],
  ['2026-10-26','RIIZE','Insomnia','Single',['riize','sbs']],
  ['2026-10-27','AND2BLE','두 번째 미니앨범','EP',['sbs']],
  ['2026-11-02','TWS','컴백 · 신보 발표','Comeback',['sbs']],
  ['2026-11-03','RESCENE','컴백 · 신보 발표','Comeback',['sbs']],
  ['2026-11-09','NCT DREAM','DREAM AFTER DREAM','Album',['dream','dreamOfficial']],
  ['2026-11-13','ATEEZ','GOLDEN HOUR : Part.6','EP',['ateez','sbs']],
  ['2026-11-16','TOMORROW X TOGETHER','PERFECT STORM','EP',['txt','sbs']]
];
export const newsVerifiedAt='2026-10-27';
export const newsEvents=newsRows.map(([date,artist,title,type,keys],index)=>({id:`news-${index}`,date,artist,title,type,origin:'news',verifiedAt:newsVerifiedAt,sources:keys.map(key=>newsSources[key]),url:newsSources[keys[0]].url}));
export function newsCalendar(month){return newsEvents.filter(event=>event.date.startsWith(month));}
