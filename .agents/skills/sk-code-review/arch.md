# Code Review - Architecture Checkpoints

> 이 파일은 `sk-code-review` 스킬에서 `--target=arch` 또는 모듈 구조·공통 레이어 전반이 대상일 때 참조합니다.

---

## CR-ARCH-01: 모듈 경계

```text
□ 순환 의존 - A -> B -> A 형태의 모듈 간 순환 참조
□ 계층 역전 - 하위 레이어(infra)가 상위 레이어(domain)에 의존
□ 공통 모듈 비대화 - CommonModule이 단일 책임을 넘어 잡다한 기능을 포함
□ 도메인 간 직접 참조 - 한 도메인 모듈이 다른 도메인의 Repository/Service를 직접 import
□ 인터페이스 부재 - 구체 클래스에 직접 의존하여 교체 불가능한 구조
```

## CR-ARCH-02: 의존성 방향

```text
□ Controller -> Service -> Repository 단방향 흐름 준수 여부
□ 도메인 로직이 Controller 또는 Repository에 위치
□ 인프라 관심사(DB, Redis, HTTP)가 비즈니스 로직 레이어에 침투
□ 공통 유틸이 특정 도메인 코드에 의존
```

## CR-ARCH-03: 횡단 관심사 (Cross-Cutting Concerns)

```text
□ 로깅 - 각 레이어에서 직접 로거를 생성하지 않고 DI로 주입받는지
□ 에러 처리 - 전역 예외 필터가 모든 레이어의 에러를 일관되게 처리하는지
□ 요청 컨텍스트 - requestId 등 요청 메타데이터가 AsyncLocalStorage로 전파되는지
□ 설정 - ConfigService를 통해 중앙에서 관리되는지, 모듈별 하드코딩 없는지
□ 인증 - 인증 로직이 가드 레이어에 격리되고 비즈니스 로직에 침투하지 않는지
```

## CR-ARCH-04: 확장성 · 운영 가능성

```text
□ 무상태 설계 - 인스턴스 간 공유 상태(in-memory 세션, 로컬 캐시) 없음
□ 환경별 분리 - dev/staging/prod 설정이 코드 변경 없이 환경변수로 전환 가능한지
□ Health Check - /health/live, /health/ready 엔드포인트가 실제 의존성(DB, Redis) 상태를 반영하는지
□ 그레이스풀 셧다운 - 프로세스 종료 시 진행 중인 요청 처리 완료 후 종료
□ 시크릿 관리 - 시크릿이 코드·이미지에 포함되지 않고 런타임 주입되는지
```

## CR-ARCH-05: FE <-> BE 경계

```text
□ API 계약 일치 - FE가 호출하는 엔드포인트 경로·메서드·파라미터가 BE 라우터와 일치
□ 에러 코드 처리 - BE에서 정의된 에러 코드를 FE가 핸들링하는지
□ 인증 흐름 - 토큰 발급·갱신·만료 처리가 양쪽에서 일관되게 구현되는지
□ CORS 설정 - FE 오리진이 BE CORS 허용 목록에 포함되어 있는지
□ 데이터 타입 동기화 - 날짜·열거형·숫자 타입이 양쪽에서 동일하게 처리되는지
```

## CR-ARCH-06: 관례 준수

```text
□ 디렉터리 구조 - architecture.md에 정의된 레이어 구조와 실제 폴더 구조 일치
□ 모듈 등록 - 새 모듈이 AppModule imports에 추가되었는지
□ 글로벌 프리픽스 - /api 프리픽스 예외 목록(health, swagger)이 올바르게 설정되었는지
□ 버전 관리 - API 버전 전략이 일관되게 적용되는지
```
