# COMEBACK CLUB

HTML, CSS, 브라우저 JavaScript와 Node.js 기본 모듈로 만든 K-pop 컴백 달력 및 음악 추천 앱입니다. 프레임워크, npm 의존성 설치, API 키, 데이터베이스가 필요 없습니다.

## 실행 순서

1. Node.js 22 이상을 설치하고 `node --version`으로 확인합니다.
2. PowerShell에서 프로젝트 폴더로 이동합니다.

```powershell
cd "C:\Users\Jeehee\OneDrive\Desktop\project_mission2\comeback-club"
```

3. 서버를 실행합니다.

```powershell
node backend/server.js
```

4. 브라우저에서 **http://localhost:3000** 에 접속합니다. HTML 파일을 직접 더블클릭하지 마세요. 같은 서버가 프론트엔드와 API를 함께 제공합니다.
5. 종료는 `Ctrl+C`입니다. 수정본을 적용하려면 실행 중인 서버를 종료하고 다시 실행합니다.

3000번 포트가 사용 중이면 다음 명령으로 포트를 변경합니다.

```powershell
$env:PORT = "3002"
node backend/server.js
```

이 경우 http://localhost:3002 로 접속합니다. `npm start` 또는 `npm.cmd start`도 지원합니다. PowerShell에서 npm 스크립트가 차단되면 위의 node 명령을 사용하면 됩니다.

## 음악 라이브러리

- 1,000곡을 넘는 실제 iTunes API 메타데이터를 포함합니다. 재발매 중복, 리믹스, 반주, 라이브, 번역 버전 등을 필터링하며 동명이인은 iTunes 아티스트 고유 ID로 구분합니다.
- 2025~2026년 발매곡과 최신 앨범 수록곡을 보강했습니다. 화면 상단에 전체 곡 수, 아티스트 수, 2025~2026년 및 2026년 곡 수가 실제 데이터에서 계산되어 표시됩니다.
- 처음에는 최신 발매순으로 20곡을 표시합니다. 더 보기, 제목순·아티스트순 정렬, 곡/아티스트/앨범 검색, 전체·2025~2026·2026·2025 연도 필터를 지원합니다.
- iTunes 미국 스토어 기준이므로 발매일은 한국 공개일과 다를 수 있습니다. 표지·미리듣기 제공 여부도 곡과 지역에 따라 다릅니다.
- 음원 원본은 저장하지 않습니다. iTunes 샘플을 음악 소개 용도로 재생하며 Apple Music 링크를 함께 제공합니다.

### 해시태그 분류

| 분류 | 하위 항목 |
| --- | --- |
| 분위기 | 청량, 달달, 신나는, 몽환, 잔잔, 애절, 강렬, 그루비 |
| 장르 | 팝, 일렉트로닉, 힙합, R&B, 발라드, 밴드, 어쿠스틱, OST |
| 상황 | 드라이브, 운동, 새벽, 저녁, 집중, 봄, 여름, 가을, 겨울 |

세 분류에서 여러 개를 선택할 수 있고 **선택한 모든 태그의 AND 교집합**으로 검색합니다. 같은 분류 안의 다중 선택도 AND입니다. 조건에 맞는 곡이 적거나 없으면 정확한 수를 보여주고 조건 조정을 안내합니다. 관계없는 곡을 섞거나 곡을 복제해 수를 채우지 않습니다.

무료 iTunes API는 분위기·상황 또는 음향 분석 값을 제공하지 않습니다. 따라서 태그는 다음과 같이 표시합니다.

- **직접 분류:** 곡별 수동 태그 또는 확인한 곡별 분류.
- **직접 + 추천 분류:** 기존 수동 분류에 자동 추천 태그를 결합.
- **추천 태그 · 추정:** 제목, API 장르, 아티스트의 일반적인 스타일에 기반한 규칙 분류. 실제 음원 분석이나 공식 장르 판정이 아니며 느낌과 다를 수 있습니다.

태그 규칙과 곡별 예외는 `backend/taxonomy.js`, 기존 수동 분류는 `backend/editorial.js`에서 수정할 수 있습니다.

## 뉴스 기반 컴백 달력

- 한국 시간 기준 이번 달이 기본입니다. 이전/다음 달 이동과 날짜별 상세를 제공합니다.
- **2026년 기사·공식 공지에서 직접 확인한 일정**을 `backend/news-data.js`에 저장했습니다. SBS, 연합뉴스, 스타투데이, 뉴스엔, KBS WORLD, OSEN, 뉴스핌, JYP·YG·Weverse·아티스트 공식 공지 등을 참고했습니다.
- 각 일정의 상세에서 원문 링크와 확인일을 제공합니다. 기사 본문이나 사진은 복제하지 않고 날짜·아티스트·발매 제목 등의 사실만 정리합니다.
- 뉴스의 한국 날짜를 MusicBrainz 최초 발매일보다 우선합니다. 예를 들어 RIIZE Insomnia는 음악 DB의 10월 25일 대신 확인된 한국 공개일인 **2026년 10월 26일**에 표시합니다.
- `/api/news`로 저장한 뉴스 일정을 먼저 표시한 뒤 MusicBrainz API로 추가 발매 정보를 가져옵니다. MusicBrainz 장애 때도 확인된 뉴스 일정은 유지하고 상태를 안내합니다.
- ‘이번 달 뉴스·공식 공지로 확인한 일정’을 펼치면 월간 뉴스 목록도 볼 수 있습니다.
- **뉴스 정리본 확인일은 2026-10-27입니다.** 뉴스가 실시간 자동 갱신되는 서비스는 아닙니다. 향후 일정 변경·새 발표는 원문 확인 후 `news-data.js`를 갱신해야 합니다. 모든 아이돌의 모든 컴백을 보장하지 않습니다.
- MusicBrainz는 42팀의 고유 ID로 검색합니다. 월별 최초 발매일이 있는 앨범·EP·싱글을 대상으로 하며 라이브·리믹스·컴필레이션은 제외합니다.

## 파일 구조

```text
frontend/
  index.html            화면 구조
  styles.css            반응형 스타일
  app.js                달력, 세 분류 태그, 검색, 연도, 페이지, 플레이어
backend/
  server.js             Node HTTP 서버 및 정적 파일 제공
  api.js                API 검증, 페이지, 외부 조회, 뉴스/DB 병합, 캐시
  library-data.js        실제 API에서 수집·정제한 곡 정보
  taxonomy.js            3개 분류/25개 태그 및 추천 규칙
  editorial.js           기존 수동 큐레이션
  catalog.js             라이브러리 결합, 태그 검색, 통계
  metadata.js            기존 iTunes 메타데이터 캐시
  news-data.js           확인된 기사 일정, 출처, 확인일
  artist-ids.js          MusicBrainz 고유 ID
scripts/
  import-library.mjs    라이브러리 재수집·정제(선택)
  refresh-metadata.mjs  기존 앨범 메타데이터 갱신(선택)
  resolve-artists.mjs   MusicBrainz ID 확인(선택)
  build.mjs             Sites Worker 번들 생성
  validate-artifact.mjs 배포 번들 검사
  build.sh              동일한 빌드를 호출하는 선택 셸 스크립트
tests/api.test.js       데이터, 576개 태그 조합, 검색·페이지, 뉴스 오류 처리
```

## API

| 경로 | 기능 |
| --- | --- |
| `GET /api/health` | 서버 상태 |
| `GET /api/tags` | 분류, 태그별 곡 수, 전체/연도별 통계 |
| `GET /api/recommendations?tags=청량,팝,여름&year=2026&sort=latest&offset=0&limit=20` | 태그 교집합, 연도, 정렬, 페이지 검색 |
| `GET /api/recommendations?q=Insomnia` | 곡/아티스트/앨범 검색 |
| `GET /api/news?month=2026-10` | 저장된 뉴스 일정. 외부 연결 없이 응답 |
| `GET /api/calendar?month=2026-10` | 기사 우선 + MusicBrainz 발매 일정 |
| `GET /api/artist?name=Red%20Velvet` | iTunes 아티스트 곡 정보 |

브라우저 JavaScript는 URLSearchParams로 R&B 등 특수문자를 인코딩합니다. 잘못된 태그/연도/페이지/날짜는 400, 미지원 메서드는 405입니다.

외부 API는 키 없이 사용합니다. MusicBrainz는 인스턴스별 1.1초 간격·30분 메모리 캐시, iTunes는 3.1초 간격·24시간 캐시를 사용합니다. 대규모 운영에는 인스턴스 간 공유 캐시와 요청 제한을 추가해야 합니다.

- MusicBrainz 문서: https://musicbrainz.org/doc/MusicBrainz_API
- iTunes 문서: https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/

## 데이터 갱신(선택)

포함된 데이터로 즉시 실행할 수 있어 아래 과정은 필수가 아닙니다. 인터넷이 연결된 상태에서 다음 명령으로 다시 수집합니다.

```powershell
node scripts/import-library.mjs
```

아티스트별 검색과 주요 최신 앨범 조회를 순서대로 실행하므로 첫 실행은 수 분이 걸립니다. `.sites-runtime/library-import.json`에 완료 지점을 기록하여 중단 후 재실행할 수 있습니다. 처음부터 새로 수집하려면 서버를 종료한 상태에서 해당 체크포인트 파일만 삭제한 뒤 실행합니다. 결과는 `backend/library-data.js`에 저장됩니다. 뉴스 일정은 자동 수집하지 않으며 원문 확인 후 별도로 갱신합니다.

## 검증과 배포 번들

```powershell
node --test tests/api.test.js
node scripts/build.mjs
node scripts/validate-artifact.mjs
```

테스트는 실제 외부 API에 의존하지 않습니다. 라이브러리 최소 크기, 연도별 데이터, 중복, 태그 유효성, 576가지 분위기×장르×상황 교집합, 정렬·검색·페이지, 잘못된 입력, 뉴스 출처, 한국 날짜 우선, 외부 API 장애 시 뉴스 유지 등을 검사합니다.

로컬 실행에는 빌드가 필요 없습니다. 배포 시에도 원본 프론트엔드와 백엔드는 분리되어 있고 빌드 과정에서만 하나의 Worker로 묶입니다.
