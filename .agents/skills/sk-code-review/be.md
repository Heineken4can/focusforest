# Code Review - Backend Checkpoints

> 이 파일은 `sk-code-review` 스킬에서 `--target=be` 또는 BE 파일이 대상일 때 참조합니다.

---

## CR-BE-01: 정확성

```text
□ 비동기 처리 - await 누락, Promise 미처리, 이중 실행 가능성
□ 상태 전이 - 허용되지 않는 상태 조합으로 진입 가능한 경로
□ 트랜잭션 경계 - 여러 DB 쓰기가 단일 트랜잭션으로 묶이지 않음
□ 에러 전파 - try/catch 범위가 너무 넓어 실제 에러를 삼킴
□ 멱등성 - POST 엔드포인트가 중복 호출 시 데이터 중복 생성
□ 페이지네이션 누락 - 전체 컬렉션을 제한 없이 반환
```

## CR-BE-02: 보안

```text
□ 인증 가드 누락 - @UseGuards() 없는 보호 엔드포인트
□ 인가 누락 - 본인 리소스 여부 검증 없이 ID로 직접 조회
□ 입력 검증 누락 - DTO에 @IsString(), @IsUUID() 등 검증 데코레이터 없음
□ SQL Injection - Prisma $queryRaw/$executeRaw 사용 시 파라미터 바인딩 미적용
□ 민감 정보 노출 - password 해시·토큰이 응답 DTO에 포함
□ 로그 민감 정보 - 토큰·패스워드·PII가 로그에 출력
□ Rate Limiting 누락 - 인증 엔드포인트에 Throttle 가드 없음
```

## CR-BE-03: 성능

```text
□ N+1 쿼리 - 루프 안에서 Prisma findUnique/findFirst 호출
□ select 과잉 - 필요 없는 컬럼까지 전체 조회 (Prisma select 미사용)
□ 병렬 처리 가능한 직렬 await - Promise.all 적용 가능한 순차 await
□ 캐시 미적용 - 자주 읽히고 변경이 적은 데이터에 Redis 캐시 없음
□ 커넥션 누수 - Prisma/Redis 클라이언트를 매 요청마다 새로 생성
```

## CR-BE-04: NestJS 관례

```text
□ DI 미사용 - 서비스 내부에서 new로 의존성 직접 생성
□ 모듈 경계 위반 - 다른 모듈의 Repository/Service를 직접 import
□ Provider 중복 등록 - 모듈 providers와 APP_FILTER/APP_GUARD 동시 등록
□ Controller 비즈니스 로직 - Controller에 DB 쿼리·도메인 판단 로직 포함
□ HttpException 직접 throw - 공통 예외 필터 우회
□ ConfigService 미사용 - 하드코딩된 설정값 (포트, URL, 시크릿)
```

## CR-BE-05: API 응답 계약

```text
□ 응답 포맷 불일치 - 표준 ApiResponse 래퍼 미사용
□ HTTP 상태코드 오용 - 성공인데 200 외 다른 코드, 에러인데 200 반환
□ 에러 코드 누락 - be_api.md에 정의된 에러 코드와 실제 throw 불일치
□ DTO 미반환 - any·object·void로 응답 타입 정의 누락
□ Swagger 데코레이터 누락 - @ApiOperation, @ApiResponse 미작성
```

## CR-BE-06: 타입 안전성

```text
□ any 사용 - unknown 또는 구체 타입으로 교체 가능한지 확인
□ 타입 단언(as) - 런타임 불일치 가능성이 있는 강제 캐스팅
□ Prisma 반환 타입 - findUnique 결과의 null 처리 누락
□ 열거형 완전성 - switch가 모든 유니온 케이스를 처리하는지
```

## CR-BE-07: 테스트 가능성

```text
□ 의존성 직접 생성 - 테스트에서 교체 불가능한 내부 인스턴스
□ 사이드 이펙트 혼재 - 순수 비즈니스 로직과 DB/외부 I/O가 같은 함수에 위치
□ 핵심 분기 테스트 공백 - 성공·실패·경계값 케이스 중 누락
□ e2e 테스트 DB - 실제 DB 대신 모킹으로 마이그레이션 불일치 은닉 위험
□ 어설션 약함 - expect(result).toBeDefined() 수준의 의미없는 단언
```

## CR-BE-08: 관례 준수

```text
□ 파일 위치 - controller/service/repository/dto 디렉터리 규칙 준수
□ 네이밍 - 클래스 PascalCase, 메서드 camelCase, 상수 UPPER_SNAKE_CASE
□ import 정렬 - Node 내장 -> 외부 패키지 -> 내부 절대경로 -> 상대경로
□ console.log 잔존 - 프로젝트 logger(pino) 대신 console 사용
□ 환경변수 직접 참조 - process.env.* 직접 사용 (ConfigService 우회)
```
