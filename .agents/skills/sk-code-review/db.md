# Code Review - Database Checkpoints

> 이 파일은 `sk-code-review` 스킬에서 `--target=db` 또는 DB 파일(schema.prisma, migration, seed)이 대상일 때 참조합니다.

---

## CR-DB-01: 스키마 정확성

```text
□ 필드 타입 - 도메인에 맞는 타입 선택 (예: 금액은 Decimal, 타임스탬프는 DateTime)
□ Null 허용 - 비즈니스상 선택 필드가 아닌데 nullable 처리
□ 기본값 - createdAt @default(now()), updatedAt @updatedAt 누락
□ 유니크 제약 - 비즈니스 유일성 규칙이 DB 레벨 제약으로 없음
□ 외래키 - 참조 무결성이 필요한 관계에 @relation 미설정
□ Cascade 정책 - onDelete/onUpdate 동작이 비즈니스 요구와 불일치
```

## CR-DB-02: 인덱스 전략

```text
□ 조회 패턴 미반영 - WHERE/ORDER BY에 자주 쓰이는 컬럼에 인덱스 없음
□ 복합 인덱스 순서 - 선택도(cardinality) 높은 컬럼이 뒤에 위치
□ 과잉 인덱스 - 거의 사용되지 않거나 쓰기 비용만 올리는 인덱스
□ 부분 인덱스 누락 - soft delete 컬럼(deletedAt IS NULL) 조건 인덱스 없음
□ 유니크 인덱스 vs 제약 - @@unique와 @@index 혼용 의도 불명확
```

## CR-DB-03: 마이그레이션 안전성

```text
□ 파괴적 변경 - 컬럼/테이블 삭제, NOT NULL 컬럼 추가를 기존 데이터 없이 실행
□ 롤백 불가 - 적용 후 되돌릴 수 없는 데이터 변환 포함
□ 락 위험 - 대용량 테이블에 컬럼 추가/타입 변경으로 테이블 풀 락 발생 가능
□ 순서 의존 - 다른 마이그레이션과의 선행 관계가 명시되지 않음
□ 시드 데이터 - 마이그레이션과 시드가 충돌하거나 환경별 분리 없음
```

## CR-DB-04: 데이터 무결성

```text
□ Soft Delete 일관성 - deletedAt nullable 처리 후 조회 쿼리에서 필터 누락 가능성
□ 상태 전이 - enum 상태값이 DB 레벨 체크 없이 애플리케이션 레이어에만 의존
□ 고아 레코드 - 부모 삭제 시 자식 레코드 처리 정책(cascade/restrict/set null) 불명확
□ 중복 데이터 - 유니크 제약 없이 동일 비즈니스 키가 여러 행에 존재 가능
□ 금액/수량 - 음수 허용 여부가 DB 제약으로 표현되지 않음
```

## CR-DB-05: Prisma 관례

```text
□ 모델명 - PascalCase 단수형 (User, FocusSession) 사용 여부
□ 필드명 - camelCase 사용 여부
□ @@map/@map - 테이블명/컬럼명이 snake_case로 매핑되어 있는지
□ 관계 필드명 - 단수/복수 컨벤션 일관성 (user vs users)
□ include/select 사용 - 쿼리 레이어에서 과도한 관계 로딩이나 전체 필드 조회를 남발하지 않는지
```

## CR-DB-06: 성능 고려

```text
□ 페이지네이션 - 전체 테이블 스캔을 유발하는 offset 페이지네이션 (cursor 방식 권장)
□ JSON 컬럼 - 자주 필터링되는 값을 Json 타입에 저장 (인덱스 불가)
□ 집계 쿼리 - 실시간 집계보다 사전 계산 테이블(DailyFocusStat 등) 활용 여부
□ 연결 수 - 동시 연결이 많은 환경에서 connection pool 설정 적절성
```
