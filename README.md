# COMEBACK CLUB

K-pop 컴백 달력과 해시태그 교집합 음악 추천 웹앱입니다. **HTML + CSS + 브라우저 JavaScript + Node.js 기본 모듈**로 구성되어 있습니다. 프레임워크, npm 패키지 설치, API 키, 데이터베이스가 필요 없습니다.

## 1. 실행 준비

Node.js **22 이상**을 설치한 뒤 터미널에서 확인합니다.

```powershell
node --version
```

## 2. 프로젝트 폴더로 이동

```powershell
cd "C:\Users\Jeehee\OneDrive\Desktop\project_mission2\comeback-club"
```

다른 위치로 복사했다면 복사한 `comeback-club` 폴더로 이동합니다. `npm install`은 필요 없습니다.

## 3. 백엔드 실행

```powershell
node backend/server.js
```

`npm start`도 동일합니다. 현재 Windows PowerShell은 `npm.ps1` 실행이 차단될 수 있으므로 위의 node 명령이나 `npm.cmd start`를 쓰면 됩니다. 시스템 실행 정책을 바꿀 필요가 없습니다.

## 4. 브라우저에서 접속

**http://localhost:3000** 을 엽니다. 같은 백엔드가 프론트엔드도 제공하므로 별도 서버나 CORS 설정은 필요 없습니다. `index.html`을 직접 더블클릭하면 API가 작동하지 않습니다.

서버 종료는 터미널에서 `Ctrl+C`입니다. 3000번 포트가 사용 중이면 PowerShell에서 다음과 같이 실행합니다.

```powershell
$env:PORT = "3001"
node backend/server.js
```

이때 주소는 http://localhost:3001 입니다. 외부 API와 미리듣기 갱신에는 인터넷 연결이 필요합니다.

## 화면 사용법

1. 한국 시간 기준 이번 달 달력이 열립니다. 이전/다음 달 이동, 이번 달 복귀, 날짜 선택을 지원합니다.
2. 날짜를 누르면 오른쪽(모바일에서는 아래)에 아티스트·발매 제목·원문 링크가 표시됩니다.
3. 달력 아래에서 몽환·청량·달달·컨셉·댄스·발라드를 여러 개 선택합니다. 선택한 버튼을 다시 누르면 해제됩니다.
4. 선택한 **모든 태그를 가진 곡만** 표시합니다. 기본 조합 ‘몽환 + 댄스’는 35곡이며 처음 10곡과 ‘더 많은 음악 만나기’ 버튼을 제공합니다. 각 단일 태그에도 10곡 이상이 있습니다.
5. 모든 조합에서 10곡이 존재할 수는 없습니다. 댄스와 발라드처럼 교집합이 비어 있거나 부족하면 정확한 결과 수를 표시합니다. 관계없는 곡이나 중복곡으로 채우지 않습니다.
6. 미리듣기 버튼은 iTunes가 제공하는 샘플을 재생합니다. Apple Music 링크로 해당 곡을 확인할 수 있습니다. 미제공/연결 실패 상태도 안내합니다.

## 파일 구조

```text
comeback-club/
├─ frontend/                 # 프론트엔드
│  ├─ index.html             # 화면 구조
│  ├─ styles.css             # 반응형 디자인
│  └─ app.js                 # 달력, 태그, 정렬, 미리듣기
├─ backend/                  # 백엔드
│  ├─ server.js              # Node HTTP 서버 및 정적 파일 제공
│  ├─ api.js                 # 외부 API, 검증, 캐시, 추천 엔드포인트
│  ├─ catalog.js             # 128곡의 수동 분위기 태그, 추적 아티스트
│  ├─ artist-ids.js          # 42팀의 확인된 MusicBrainz 고유 ID
│  └─ metadata.js            # 실제 iTunes 응답에서 만든 초기 메타데이터 캐시
├─ tests/api.test.js         # 교집합, 검증, 발매 필터, 오류 처리 테스트
├─ scripts/
│  ├─ refresh-metadata.mjs   # 초기 iTunes 메타데이터 갱신(선택)
│  ├─ build.mjs              # Sites 배포용 Worker 생성
│  └─ validate-artifact.mjs  # 배포 번들 검사
├─ .openai/hosting.json      # Sites 설정(로컬 실행에는 불필요)
├─ package.json
└─ README.md
```

## 무료 외부 API와 한계

### MusicBrainz: 컴백/발매 정보

문서: https://musicbrainz.org/doc/MusicBrainz_API

- 인증 없이 `https://musicbrainz.org/ws/2/release-group/` 검색을 사용합니다.
- 고유 ID가 확인된 K-pop 아티스트 42팀의 앨범·EP·싱글을 월별 최초 발매일로 검색합니다. 동명이인을 고유 ID로 구분하며, 일 단위 날짜가 있는 항목만 표시하고 라이브·리믹스·컴필레이션은 제외합니다.
- 커뮤니티 데이터이므로 **모든 공식 컴백을 보장하지 않습니다.** 예정 컴백은 미리 등록되어 있어야 표시됩니다. 최초 발매일은 한국 현지 공개일과 다를 수 있습니다.
- 결과가 없으면 빈 달력, 연결 오류는 별도 오류로 표시합니다. 예시 컴백을 실제 일정처럼 넣지 않습니다.
- 인스턴스별 1.1초 요청 간격, 30분 메모리 캐시, 동시 동일 요청 합치기를 적용합니다. 대규모 운영에서는 인스턴스 간 공유 캐시와 속도 제한이 필요합니다.

### iTunes Search API: 노래 정보

문서: https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/

- 인증 없이 `https://itunes.apple.com/search`에서 제목·앨범·표지·발매일·미리듣기·Apple Music 링크를 가져옵니다.
- 실제 응답으로 만든 초기 캐시를 먼저 사용하고, 화면에 보이는 곡은 **백엔드를 통해 아티스트 정보를 다시 조회**합니다. 24시간 메모리 캐시와 인스턴스별 3.1초 요청 간격을 적용합니다.
- 미국 스토어 기준이라 한국 스토어와 제공 여부·날짜가 다를 수 있습니다. 검색 한도와 표기 차이로 매칭되지 않는 곡에는 직접 만든 대체 커버와 검색 링크를 표시합니다.
- 분위기 태그는 API가 제공하지 않습니다. `catalog.js`의 주관적 수동 분류와 API 메타데이터를 결합합니다.
- 미리듣기와 커버는 해당 음악을 소개하는 용도로 사용하며 Apple Music 링크를 함께 제공합니다.

외부 API 장애 시 이전 메모리 캐시가 있으면 오래된 결과임을 표시합니다. 캐시가 없으면 HTTP 502와 재시도 안내를 제공합니다. API 키용 `.env` 파일은 사용하지 않습니다.

## 백엔드 엔드포인트

| 경로 | 역할 |
| --- | --- |
| `GET /api/health` | 서버 상태 |
| `GET /api/tags` | 지원 태그와 큐레이션 곡 수 |
| `GET /api/calendar?month=2026-10` | 월별 발매 정보(2000~2099년) |
| `GET /api/recommendations?tags=몽환,댄스` | 다중 태그 AND 교집합 추천 |
| `GET /api/artist?name=Red%20Velvet` | 외부 iTunes 노래 정보 |

태그를 생략하면 전체 큐레이션입니다. 잘못된 월, 알 수 없는 태그/아티스트는 HTTP 400, 지원하지 않는 메서드는 405를 반환합니다.

## 검증과 선택 작업

```powershell
node --test tests/api.test.js
```

64가지 태그 조합, 중복 방지, 기본/단일 태그 10곡 이상, 빈 결과, 입력 검증, 윤년 월말, 발매 필터, 캐시, 외부 오류를 검사합니다. 테스트는 실제 외부 서버에 의존하지 않습니다.

초기 앨범 캐시 갱신(선택, 인터넷 필요, 약 1분):

```powershell
node scripts/refresh-metadata.mjs
```

로컬 실행에는 빌드가 필요 없습니다. Sites 배포용 번들 검사는 다음과 같습니다.

```powershell
node scripts/build.mjs
node scripts/validate-artifact.mjs
```

배포 시에도 원본 프론트엔드/백엔드는 분리되어 있고, 빌드할 때만 Worker로 묶입니다.
