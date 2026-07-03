# MyHealth Market Lite

**마이데이터 기반 개인 건강관리 플랫폼**

개인의 건강검진, 진료, 투약, 웨어러블, 생활습관 데이터를 FHIR 기반으로 통합하고, AI가 검진 해석과 90일 건강 행동 계획을 제공하는 개인 건강 마이데이터 플랫폼입니다.

## 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (React + Vite)                     │
│  Dashboard │ Upload │ Wearable │ Goals │ Coach │ Report │ Consent│
└──────────────────────────────┬──────────────────────────────────┘
                               │ REST API
┌──────────────────────────────┴──────────────────────────────────┐
│                     Server (Express + TypeScript)                 │
│                                                                   │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌──────────┐            │
│  │  Auth   │ │ Consent │ │HealthData│ │ Wearable │            │
│  └─────────┘ └─────────┘ └──────────┘ └──────────┘            │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌──────────┐            │
│  │AI Coach │ │ Report  │ │  Upload  │ │  Audit   │            │
│  │  (LLM)  │ │Generator│ │  (OCR)   │ │  Logger  │            │
│  └─────────┘ └─────────┘ └──────────┘ └──────────┘            │
│                                                                   │
│  ┌───────────────────────────────────────────────────┐          │
│  │         FHIR R4 Data Model (In-Memory Store)       │          │
│  │  Patient │ Observation │ Consent │ CarePlan │ Audit │          │
│  └───────────────────────────────────────────────────┘          │
└──────────────────────────────────────────────────────────────────┘
```

## 기술 스택

| 계층 | 기술 |
|------|------|
| 프론트엔드 | React 18, TypeScript, Vite, TailwindCSS, Recharts, Lucide Icons |
| 백엔드 | Express.js, TypeScript, tsx (런타임) |
| AI 코치 | OpenAI GPT-4o-mini (RAG 기반 건강 코칭) |
| 인증 | JWT, bcrypt |
| 데이터 모델 | FHIR R4 호환 (Patient, Observation, Consent, CarePlan, AuditEvent) |
| 파일 업로드 | Multer (PDF/이미지 OCR 시뮬레이션) |

## 주요 기능 (MVP)

### 1. 건강 대시보드
- 최근 검진 결과 요약 카드
- 카테고리별 건강 상태 (비만, 혈압, 당뇨, 이상지질혈증, 간기능, 신장기능)
- 위험 신호 알림 (정상/주의/경고/위험)
- 주간 활동량 차트
- 90일 목표 진행률

### 2. 건강검진 업로드
- PDF/이미지 드래그앤드롭 업로드
- OCR 기반 검사 수치 자동 추출
- 수치별 정상/주의/상담권고 범주 자동 판정
- 참조 범위 대비 결과 표시

### 3. 웨어러블 데이터
- Apple HealthKit / Google Health Connect / Samsung Health 연동 상태
- 걸음 수, 수면, 심박수, 활동 시간 차트
- 트렌드 분석 (개선/안정/하락)

### 4. 90일 건강 목표
- 대사건강 개선 프로그램
- 주간 미션 (걷기, 식이, 수면, 운동)
- 미션 완료 체크 및 진행률 추적

### 5. AI 건강 코치
- 검진 결과 해석 (일반적 의미 설명)
- 생활습관 개선 조언
- 병원 상담 질문 자동 생성
- 의료 안전장치 (진단/처방 금지, 참고용 안내 필수)

### 6. 병원 제출용 리포트
- 환자 기본 정보
- 주요 검사 결과 요약 (이상 소견 중심)
- 웨어러블 활동 데이터
- 건강 목표 진행 상황
- PDF 다운로드 지원

### 7. 동의 관리
- 데이터 카테고리별 동의/철회
- 활용 목적 명시
- 동의 이력 관리

### 8. 접근 로그 (감사로그)
- 모든 데이터 조회/생성/수정 기록
- 불변 감사로그 저장
- 활동 요약 통계

## 실행 방법

### Docker Compose (권장)

```bash
# 1. 환경변수 설정
cp .env.example .env
# .env 파일을 열어 OPENAI_API_KEY 등 설정

# 2. 전체 서비스 시작 (백그라운드)
make up
# 또는
docker-compose up -d

# 3. 로그 확인
make logs

# 4. 서비스 중지
make down
```

접속: http://localhost (Nginx 프록시 경유)

### 로컬 개발 (도커 없이)

```bash
# 의존성 설치
cd server && npm install
cd ../client && npm install
cd ..

# 서버 실행 (포트 3001)
cd server && npx tsx src/index.ts

# 클라이언트 실행 (포트 5173)
cd client && npx vite --host 0.0.0.0

# 또는 동시 실행
npm install && npm run dev
```

### Docker 관리 명령어 (Makefile)

| 명령어 | 설명 |
|---------|------|
| `make up` | 전체 서비스 시작 (백그라운드) |
| `make down` | 전체 서비스 중지 |
| `make build` | 이미지 빌드 |
| `make logs` | 전체 로그 확인 |
| `make status` | 서비스 상태 확인 |
| `make clean` | 전체 정리 (볼륨 포함) |
| `make db-shell` | PostgreSQL 셸 접속 |
| `make backup-db` | 데이터베이스 백업 |

## API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | /api/health | 서버 상태 확인 |
| POST | /api/auth/register | 회원가입 |
| POST | /api/auth/login | 로그인 |
| GET | /api/auth/me | 현재 사용자 정보 |
| GET | /api/health-data/summary | 건강 요약 대시보드 |
| GET | /api/health-data/checkups | 검진 결과 목록 |
| GET | /api/health-data/goals | 건강 목표 조회 |
| PATCH | /api/health-data/goals/:id/missions/:id/complete | 미션 완료 |
| POST | /api/health-data/observations | 수동 수치 입력 |
| GET | /api/wearable | 웨어러블 데이터 조회 |
| GET | /api/wearable/connections | 연동 상태 |
| GET | /api/wearable/trends | 트렌드 분석 |
| POST | /api/wearable | 수동 입력 |
| GET | /api/ai-coach/messages | 대화 기록 |
| POST | /api/ai-coach/chat | AI 코치 대화 |
| GET | /api/ai-coach/hospital-questions | 병원 질문 생성 |
| GET | /api/report | 리포트 목록 |
| POST | /api/report/generate | 리포트 생성 |
| GET | /api/consent | 동의 목록 |
| POST | /api/consent | 동의 부여 |
| PATCH | /api/consent/:id/revoke | 동의 철회 |
| GET | /api/audit | 감사로그 조회 |
| GET | /api/audit/summary | 감사로그 요약 |
| POST | /api/upload/checkup | 검진 PDF/이미지 업로드 |

## FHIR 데이터 모델

| 데이터 | FHIR 리소스 | 설명 |
|--------|-------------|------|
| 사용자 | Patient | 개인 식별 및 기본 정보 |
| 동의 | Consent | 데이터 제공 범위, 기간, 목적, 철회 상태 |
| 검사 수치 | Observation | 혈압, 혈당, HbA1c, LDL, AST/ALT, BMI 등 |
| 검진 리포트 | DiagnosticReport | 건강검진 종합 결과 |
| 행동계획 | CarePlan | 90일 건강관리 계획 |
| 접근로그 | AuditEvent | 조회, 전송, 다운로드 이력 |

## 보안 설계

- JWT 기반 인증 (7일 만료)
- 비밀번호 bcrypt 해싱
- 모든 API 접근 감사로그 기록
- 동의 기반 데이터 접근 제어
- CORS 설정
- 파일 업로드 크기/타입 제한 (20MB, PDF/이미지만)

## 확장 로드맵

1. **PostgreSQL + Redis** 전환 (현재 In-Memory)
2. **실제 OCR 엔진** 연동 (Tesseract / Google Vision API)
3. **건강정보 고속도로** FHIR API 테스트베드 연동
4. **SMART on FHIR** 인증 프로토콜
5. **웨어러블 실제 연동** (Apple HealthKit, Google Health Connect SDK)
6. **PDF 리포트 생성** (WeasyPrint / Puppeteer)
7. **Kubernetes 배포** + Terraform IaC
8. **OpenTelemetry** 관측성 스택

## 라이선스

Private - All Rights Reserved
