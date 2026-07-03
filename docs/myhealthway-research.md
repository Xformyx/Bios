# 건강정보 고속도로 API 조사 결과

## 12개 FHIR 리소스 항목
1. Patient - 환자정보
2. Organization - 의료기관정보
3. Practitioner/PractitionerRole - 진료의정보
4. Condition - 진단내역
5. MedicationRequest - 약물 처방 내역
6. Observation (Lab) - 진단검사
7. ImagingStudy - 영상검사
8. DiagnosticReport - 병리검사
9. Observation (General) - 기타검사 (생체신호, 기능검사)
10. Procedure - 수술 및 처치내역
11. AllergyIntolerance - 알레르기 및 불내성
12. DocumentReference - 진료기록 및 기타문서

## API 구분
### 데이터 조회 API
- 의료데이터 조회: 의료기관 진료내역 등 환자정보 기준 조회
- 공공데이터 조회: 건강보험공단, 심사평가원, 질병청 데이터

### 동적동의 API
- 제공동의: 데이터 제공기관에 대한 제공동의
- 활용동의: 활용서비스별 사용자의 데이터셋 활용동의

### 지원 API
- 인증: 네이버/카카오 등 본인인증 기관을 통한 본인인증 요청, 플랫폼 API 사용인증
- 연계지원: 데이터 암호화 관련 API
- 플랫폼 이용: 이용가입/이용해지, 약관동의
- 의료기관 방문기록: 데이터 조회를 위한 방문기록 구성/조회
- 기초데이터 조회: 플랫폼 약관, 제공기관 목록 등

### 활용서비스 지원 API
- 플랫폼 지원: 데이터 암호화 등 연계 지원
- 통계제공: 공유이력 등 통계 데이터 제공

## 기술 표준
- FHIR R4 기반
- KR Core Implementation Guide (한국형 FHIR IG)
- SMART on FHIR 인증 (OAuth 2.0 Authorization Code Flow)
- 본인인증: 네이버/카카오 등 간편인증
- 데이터 암호화 전송
