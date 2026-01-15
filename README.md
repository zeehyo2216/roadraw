## 로드로 (Roadraw)

사용자가 설정한 거리에 맞춰 **순환형(Loop) 러닝 코스**를 생성하고, 실제 러닝 중 **페이스/거리/시간/케이던스**를 트래킹하는 웹 서비스입니다.

### 기술 스택

- **Framework**: Next.js (App Router)
- **스타일**: Tailwind CSS v4
- **DB**: PlanetScale (MySQL)
- **ORM**: Prisma
- **지도 엔진**: Naver Maps
- **API**: Next.js Server Actions (`app/actions/routes.ts` 등)

### 환경 변수

루트 디렉터리에 `.env`를 생성하고 아래 값을 채워주세요.

```bash
DATABASE_URL="mysql://<USER>:<PASSWORD>@<HOST>/<DB_NAME>?sslaccept=strict"
NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID="YOUR_NAVER_MAPS_CLIENT_ID"
GRAPHHOPPER_API_KEY="YOUR_GRAPHHOPPER_KEY" # (미사용, 향후 고도/보행자 프로필 연동용)
```

### 의존성 설치

처음 클론했다면 의존성을 설치합니다.

```bash
npm install
```

### Prisma & PlanetScale

1. PlanetScale에서 MySQL 데이터베이스를 생성하고 `DATABASE_URL`을 복사해 `.env`에 넣습니다.
2. Prisma 클라이언트 생성 & 마이그레이션:

```bash
npx prisma generate
npx prisma db push
```

### 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:3000`으로 접속합니다.

### 주요 화면

- `/`  
-  - (실사용) 거리 슬라이더 (1–20km)  
-  - 현재 위치 기반 루프 코스 프리뷰 (지오메트릭 루프 + Naver Maps 프리뷰)  
- `/landing`
  - (랜딩) 서비스 소개 / CTA  
- `/run/[id]`  
  - 전체 화면 러닝 트래킹 UI  
  - 실시간 지도(위치 허용 시), 페이스 / 거리 / 시간 / 케이던스 표시  

### 알고리즘 개요 (MVP)

- 현재는 `lib/loopRoute.ts`에서 **원형에 가까운 지오메트릭 루프**를 생성합니다.
- 추후:
  - GraphHopper + OpenStreetMap 데이터로 **보행자/인도 우선 경로** 생성
  - 고도 정보 기반 **오르막 색상 강조 및 고도 상승량 표시**
  - 교차로/신호등 데이터를 이용해 **신호 대기 최소화 경로** 우선화

