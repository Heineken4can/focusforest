# Code Review Report: Backend (Delta Re-review)

검수일시: 2026-03-14 19:30:00
리뷰 타겟: BE
리뷰 유형: Delta 재검토 (이전 리뷰 2026-03-14 대비 변경된 3개 파일 기준)
검수자: BE 아키텍트 검수자 (Agent)

---

## 재검토 대상 파일

1. `backend/src/modules/rewards/reward.service.ts` (CR-BE-06-1 대응)
2. `backend/src/modules/focus-sessions/focus-session.repository.ts` (지원 변경)
3. `backend/src/modules/sync/sync.controller.ts` (CR-BE-02-1, CR-BE-04-1, CR-BE-05-2 대응)

---

## Delta 재검토 결과

### 1. reward.service.ts

- `settleCompletion` 메서드(L47): `this.rewardRepository.findTimezone(tx, input.userId)` 형태로 트랜잭션 클라이언트를 직접 전달하는 정상 경로 유지.
- `getStats` 메서드(L107): 기존 `this.rewardRepository['prismaService']` bracket 접근이 `this.rewardRepository.findTimezoneDirect(userId)` 호출로 교체됨.
- bracket notation 접근 완전히 제거됨. CR-BE-06-1 FIXED 판정 확인.

### 2. focus-session.repository.ts

- L36-38에 `get prisma() { return this.prismaService; }` public getter 추가됨.
- 이 getter는 `RewardRepository`와 동일한 패턴으로 추가되었으며, 현재 서비스 코드 내에서 직접 사용되는 호출 경로는 확인되지 않음.
- `FocusSessionService`는 `this.prismaService`를 직접 DI 받아 사용하므로, 이 getter 추가가 실질적 버그를 도입하지는 않음. 다만 외부 접근을 위해 노출된 getter가 실제 사용처 없이 존재하는 상태로, 향후 모듈 경계 혼선 유발 가능성이 있음.

### 3. sync.controller.ts

#### 해결된 항목
- `@Controller('sync')` 적용 확인 (L25). CR-BE-04-1 FIXED.
- `@UseGuards(SyncRateLimitGuard)` 단독 적용, 컨트롤러 레벨 `JwtAuthGuard` 중복 제거 확인 (L26). CR-BE-02-1 FIXED.
- `@ApiTags('Sync')`, `@ApiBearerAuth()` 클래스 레벨 추가 확인 (L23-24). CR-BE-05-2 부분 해결.

#### 신규 발견: dead import 2건

**[신규-01] JwtAuthGuard import 잔존**
- 파일: `backend/src/modules/sync/sync.controller.ts:20`
- 내용: `import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';` 가 남아 있으나 컨트롤러 본문 어디에도 사용되지 않음.
- 근거: JwtAuthGuard가 컨트롤러 레벨 `@UseGuards`에서 제거되면서 import만 잔존. 빌드는 통과하나 코드 노이즈이며, 인증 guard가 실제로 적용 중인지 혼동을 유발함.
- 수정 방향: import 라인 제거.

**[신규-02] ApiOkResponse, ApiOperation import 잔존 (미사용)**
- 파일: `backend/src/modules/sync/sync.controller.ts:11-14`
- 내용: `import { ApiOkResponse, ApiOperation } from '@nestjs/swagger'` 가 존재하나 메서드 레벨 데코레이터에 실제 적용 없음.
- 근거: `@Post('bootstrap')`, `@Post('push')`, `@Get('pull')` 중 어느 메서드에도 `@ApiOperation`, `@ApiOkResponse` 미적용 상태. import만 선언된 dead import.
- 수정 방향: 메서드 레벨 Swagger 데코레이터를 적용하거나, 적용 전까지 import를 제거하여 혼동 방지.

#### 여전히 미해결: CR-BE-05-2 PARTIAL 유지

- `@Post('bootstrap')`, `@Post('push')`, `@Get('pull')` 세 엔드포인트 모두 `@ApiOperation`, `@ApiOkResponse` 또는 `@ApiCreatedResponse` 미적용.
- Swagger UI에서 엔드포인트 목적, 요청/응답 스키마, 상태 코드가 문서화되지 않음.

---

## 전체 이슈 현재 상태 테이블

| 이슈 ID | 심각도 | 제목 | 상태 |
|---------|--------|------|------|
| CR-BE-01-1 | CRITICAL | resumeSession / giveUpSession: handlePauseTimeout + updateWithVersion 두 write가 단일 트랜잭션 밖 실행 | OPEN |
| CR-BE-01-2 | CRITICAL | completeSession PAUSED 분기: timeout 처리 후 SESSION_409_TIMEOUT 대신 SESSION_409_INVALID_STATE 반환 | OPEN |
| CR-BE-01-3 | WARN | createTask 단순 INSERT에 Serializable 격리 수준 적용 | OPEN |
| CR-BE-01-4 | WARN | bootstrap Serializable retry 시 acceptedTasks/acceptedSessions 중복 누적 | OPEN |
| CR-BE-01-5 | WARN | push deviceSequence 정렬 미적용 | OPEN |
| CR-BE-01-6 | WARN | push eventId 기반 idempotency 없음 | OPEN |
| CR-BE-02-1 | WARN | SyncController: JwtAuthGuard 중복 등록 | FIXED |
| CR-BE-03-1 | WARN | bootstrap 루프 안 tx.task.findUnique N+1 | OPEN |
| CR-BE-03-2 | WARN | pull select 없이 전체 컬럼 조회 | OPEN |
| CR-BE-03-3 | WARN | pull hasMore 판정 오류 | OPEN |
| CR-BE-04-1 | WARN | SyncController: 라우트 prefix 불일치 | FIXED |
| CR-BE-05-1 | WARN | @Post 엔드포인트에 @HttpCode(200) 없이 @ApiOkResponse(200) 선언 | OPEN |
| CR-BE-05-2 | WARN | SyncController Swagger 누락 (메서드 레벨 미적용) | PARTIAL |
| CR-BE-06-1 | WARN | private 필드에 bracket notation으로 접근 | FIXED |
| CR-BE-06-2 | WARN | payload: any 사용 - mass assignment 위험 | OPEN |
| CR-BE-07-1 | WARN | sync 테스트 커버리지 부족 (pull 테스트 전무) | OPEN |
| CR-BE-08-1 | INFO | DEFAULT_TIMEZONE = 'Asia/Seoul' 하드코딩 | OPEN |
| CR-BE-08-2 | INFO | TaskPayload, FocusSessionPayload 서비스 내 인라인 타입 | OPEN |
| CR-BE-01-7 | INFO | updateTask 변경 필드 없는 경우 사전 반환 (API 계약 불명확) | OPEN |
| NEW-01 | WARN | sync.controller.ts: JwtAuthGuard dead import 잔존 | 신규 발견 |
| NEW-02 | WARN | sync.controller.ts: ApiOkResponse, ApiOperation dead import 잔존 (미사용) | 신규 발견 |

---

## 항목별 판정 상세

### FIXED (3건)

**CR-BE-02-1**: `sync.controller.ts` L26에서 `@UseGuards(SyncRateLimitGuard)` 단독 적용 확인. 컨트롤러 레벨 JwtAuthGuard 중복 제거 완료.

**CR-BE-04-1**: `sync.controller.ts` L25에서 `@Controller('sync')` 확인. 전역 prefix(`api/v1`)와 조합되어 최종 경로 `api/v1/sync`로 통일됨.

**CR-BE-06-1**: `reward.service.ts` L107에서 `this.rewardRepository.findTimezoneDirect(userId)` 호출 확인. bracket notation(`this.rewardRepository['prismaService']`) 완전히 제거됨. `RewardRepository.findTimezoneDirect`는 내부적으로 `this.findTimezone(this.prismaService, userId)`를 위임하는 구조로 캡슐화 완료.

### PARTIAL (1건)

**CR-BE-05-2**: 클래스 레벨 `@ApiTags('Sync')`, `@ApiBearerAuth()` 추가로 Swagger 태그 및 인증 표기는 개선됨. 그러나 메서드 레벨 `@ApiOperation`, `@ApiOkResponse`/`@ApiCreatedResponse`가 세 엔드포인트 모두 미적용 상태이며, import만 선언된 dead import까지 신규 발생함. 실질적 Swagger 문서화는 미완.

### 신규 발견 (2건)

**NEW-01** [WARN]: `sync.controller.ts` L20의 `JwtAuthGuard` import가 컨트롤러 Guard 제거 후에도 잔존. 인증 guard 존재 여부에 대한 오해를 유발할 수 있는 코드 노이즈.

**NEW-02** [WARN]: `sync.controller.ts` L11-14의 `ApiOkResponse`, `ApiOperation` import가 메서드 데코레이터에 실제 적용 없이 잔존. CR-BE-05-2 해결을 의도한 것으로 보이나 실제 적용이 누락된 상태.

---

## CRITICAL 이슈 상세 재확인

### CR-BE-01-1: resumeSession / giveUpSession 트랜잭션 경계 부재

소스 재확인 결과(`focus-session.service.ts` L242-261, L313-339):

```
resumeSession:
  await this.handlePauseTimeout(userId, session, resumedAt, this.prismaService);  // write-1
  await this.focusSessionRepository.updateWithVersion(this.prismaService, ...);   // write-2
  // 두 write가 this.prismaService 직접 호출. 트랜잭션 경계 없음.
```

```
giveUpSession (PAUSED 분기):
  await this.handlePauseTimeout(userId, session, occurredAt, this.prismaService);  // write-1
  await this.focusSessionRepository.updateWithVersion(this.prismaService, ...);    // write-2
  // 동일 문제. handlePauseTimeout이 GIVEN_UP_TIMEOUT으로 전이 후 throw하므로
  // updateWithVersion에 도달하지 않는 정상 경로는 있으나,
  // markTimedOut 실패 후 재시도 경로에서 두 write가 독립 실행될 수 있음.
```

트랜잭션 경계 없이 두 write가 실행되는 구조는 이번 수정에서 변경되지 않음. OPEN 유지.

### CR-BE-01-2: completeSession PAUSED 분기 에러 코드 오류

소스 재확인 결과(`focus-session.service.ts` L414-417):

```typescript
if (session.status === SessionStatus.PAUSED) {
  await this.handlePauseTimeout(userId, session, occurredAt, tx);
  throw this.invalidState(session.status);  // SESSION_409_INVALID_STATE 반환
}
```

`handlePauseTimeout`이 timeout 조건 미충족 시 정상 반환하면 곧바로 `SESSION_409_INVALID_STATE`를 throw. 클라이언트가 PAUSED 상태에서 complete를 호출했을 때 timeout 여부와 무관하게 동일 에러 코드를 받아 원인 파악 불가. 이번 수정에서 변경 없음. OPEN 유지.

---

## 결과 요약

| 판정 | 건수 | 이슈 목록 |
|------|------|-----------|
| CRITICAL | 2 | CR-BE-01-1, CR-BE-01-2 |
| WARN (OPEN) | 11 | CR-BE-01-3~7, CR-BE-03-1~3, CR-BE-05-1, CR-BE-06-2, CR-BE-07-1 |
| WARN (PARTIAL) | 1 | CR-BE-05-2 |
| WARN (신규) | 2 | NEW-01, NEW-02 |
| INFO (OPEN) | 3 | CR-BE-08-1, CR-BE-08-2, CR-BE-01-7 |
| FIXED | 3 | CR-BE-02-1, CR-BE-04-1, CR-BE-06-1 |

**종합 판정: FAIL**

CRITICAL 2건(CR-BE-01-1, CR-BE-01-2)이 여전히 미해결 상태이며 데이터 정합성 위험이 존재함.
이번 수정으로 구조적 결함 3건이 해소되었으나, 수정 과정에서 dead import 2건이 신규 발생하여 WARN 건수가 순증함.

---

## 권고 우선순위

### 즉시 (CRITICAL)
1. **CR-BE-01-1**: `resumeSession`, `giveUpSession`에서 `handlePauseTimeout`과 `updateWithVersion`을 단일 트랜잭션으로 묶기.
2. **CR-BE-01-2**: `completeSession` PAUSED 분기에서 timeout 판정 후 `SESSION_409_TIMEOUT` 에러 코드를 선행 반환하고 `SESSION_409_INVALID_STATE`와 명시적으로 분리하기.

### 다음 PR 전 (WARN)
3. **NEW-01**: `sync.controller.ts`의 `JwtAuthGuard` dead import 제거.
4. **NEW-02**: `sync.controller.ts`의 `ApiOkResponse`, `ApiOperation` - 메서드 레벨 적용하거나 import 제거 (CR-BE-05-2 완전 해결 연계).
5. **CR-BE-06-2**: `payload: any` 타입을 명시적 DTO 타입으로 교체하여 mass assignment 위험 제거.
6. **CR-BE-03-1**: bootstrap 루프 내 N+1 쿼리 개선.

### 기술 부채 관리 (WARN/INFO)
7. CR-BE-01-3~6, CR-BE-03-2~3, CR-BE-05-1, CR-BE-07-1, CR-BE-08-1~2는 다음 스프린트 내 처리 권고.
