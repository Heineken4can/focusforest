---
name: sk-code-review
description: |
  소스 코드의 내부 품질을 체계적으로 리뷰하는 스킬.
  설계 문서와의 정합성이 아닌, 코드 자체의 정확성·보안·성능·타입 안전성·테스트 가능성을
  도메인별 체크포인트로 검증하고 표준화된 코드 리뷰 리포트를 생성합니다.
  Antigravity, Claude Code, Codex 등 어떤 AI 툴에서도 동일하게 사용됩니다.
---

# Code Review Skill

## 개요

설계가 올바르게 구현되었는지는 `$sk-cross-doc-consistency-review`가 확인합니다.
이 스킬은 그 다음 질문에 답합니다 - **"구현 자체가 잘 되었는가?"**

## `$sk-cross-doc-consistency-review`와의 차이

| 구분 | sk-cross-doc-consistency-review | sk-code-review (이 스킬) |
|------|---------------------------------|--------------------------|
| 핵심 질문 | 설계대로 만들었나? | 잘 만들었나? |
| 비교 기준 | 문서 <-> 코드 계층 간 계약 | 코드 내부 품질 기준 |
| 겹치는 영역 | 없음 - 두 스킬은 보완 관계 | 없음 |

---

## 1. 트리거

사용자가 다음 중 하나를 요청하면 이 스킬을 적용합니다:

- `$sk-code-review`
- `/sk-code-review [파일 or 기능명]`
- `"코드 리뷰해줘"`, `"이 코드 품질 검토해줘"` 처럼 의미가 같은 자연어 요청

---

## 2. 타겟 감지 및 참조 파일 선택

리뷰 대상 파일의 경로 또는 사용자 명시에 따라 참조 파일을 결정합니다.
감지 우선순위는 `DB -> BE -> FE -> ARCH` 입니다.
일반 `.ts` 파일은 경로가 명확하지 않으면 FE로 분류하지 않습니다.

| 타겟 | 감지 신호 | 참조 파일 |
|------|----------|----------|
| **DB** | `prisma/`, `schema.prisma`, `migrations/`, `seed.ts`, `--target=db` | `db.md` |
| **BE** | `backend/`, NestJS 파일 (`.controller.ts`, `.service.ts`, `.module.ts` 등), `--target=be` | `be.md` |
| **FE** | `frontend/`, `.tsx`, FE 전용 `.ts` 파일(컴포넌트/훅/스토어/API 클라이언트), `--target=fe` | `fe.md` |
| **ARCH** | 여러 모듈에 걸친 구조 검토, `app.module.ts`, `bootstrap.ts`, `--target=arch` | `arch.md` |

> 대상이 복수 도메인에 걸치면 해당 참조 파일을 모두 적용합니다.
> 예: `backend/src/bootstrap.ts` -> `be.md` + `arch.md`

---

## 3. 공통 체크포인트 (모든 타겟에 적용)

도메인별 체크포인트 실행 전 공통 항목을 먼저 확인합니다.

```text
□ 죽은 코드 - 사용되지 않는 변수, import, 함수
□ 마법 숫자/문자열 - 설명 없는 리터럴 숫자·문자열
□ TODO/FIXME/HACK - 미처리 주석 잔존
□ console.log 잔존 - 디버그 로그 미제거
□ 하드코딩 설정값 - URL, 포트, 시크릿이 코드에 직접 기입
□ 함수 길이 - 단일 책임 위반 (기준: 50줄 초과)
```

---

## 4. 실행 절차

```
STEP 1. 파일 목록 확정
  -> 사용자 명시 파일 또는 최근 변경 파일 기준 선정

STEP 2. 타겟 감지
  -> 파일 경로/확장자/사용자 명시로 도메인 판단

STEP 3. 공통 체크포인트 실행
  -> SKILL.md §3 적용

STEP 4. 도메인별 체크포인트 실행
  -> 해당 도메인 참조 파일 (fe.md / be.md / db.md / arch.md) 적용

STEP 5. 리포트 출력
  -> §5 포맷에 따라 결과 작성
```

---

## 5. 판정 기준

| 심각도 | 기준 | 예시 |
|--------|------|------|
| CRITICAL | 즉시 수정 필요. 보안 취약점, 데이터 손실, 런타임 크래시 유발 | JWT 가드 누락, SQL Injection 가능, 메모리 누수 |
| WARN | 기능은 동작하지만 위험 요소 존재. PR 전 수정 권장 | 타입 단언 남용, 테스트 공백, N+1 쿼리 |
| INFO | 개선 권고. 현재 문제는 아님 | 네이밍 개선, 중복 제거 기회, 주석 정리 |
| PASS | 해당 항목에서 이슈 없음 | - |

---

## 6. 리포트 출력 포맷

```markdown
## Code Review Report

리뷰 시각: YYYY-MM-DD HH:mm
리뷰 타겟: FE / BE / DB / ARCH (복수 가능)
리뷰 범위: [확인한 파일 목록]

### 상세 이슈

#### [CR-XX-NN] [심각도] 제목

- **파일**: `경로/파일명.ts:라인번호`
- **내용**: 무엇이 문제인가
- **근거**: 왜 문제인가
- **수정 방향**: 어떻게 고쳐야 하는가

### 결과 요약

| 판정 | 건수 |
|------|------|
| CRITICAL | N |
| WARN | N |
| INFO | N |
| PASS | N |

**종합 판정**: PASS / CONDITIONAL PASS / FAIL
```

---

## 7. 다른 스킬과의 조합 패턴

### 피처 완료 후 표준 리뷰 순서

```
1. $sk-code-review          <- 코드 품질 검증
2. $sk-cross-doc-consistency-review  <- 설계 계약 준수 검증
3. 두 리뷰 이슈 해소 -> PR
```

### 병렬 실행 (권장)

```
parallel:
  agent-A: $sk-cross-doc-consistency-review  (설계 정합성)
  agent-B: $sk-code-review                   (코드 품질)
-> 결과 합산 후 이슈 처리
```

---

## 8. 공용 사용 규칙

- 이 스킬의 단일 원본은 `.agents/skills/sk-code-review/` 폴더입니다.
- 도메인별 체크포인트는 같은 폴더의 `fe.md`, `be.md`, `db.md`, `arch.md`에 정의됩니다.
- 소스 코드는 수정하지 않습니다. 리뷰 결과는 채팅 출력으로만 제공합니다.
- 스킬 지침이 `.agents/standards/*.md` 또는 `.agents/workflows/*.md`와 충돌하면 standards/workflows를 우선합니다.

---

## 9. 빠른 트리거

- `$sk-code-review`
- `/sk-code-review [파일명 or 기능명]`
- `/sk-code-review --target=fe|be|db|arch [파일명]`
- `"코드 리뷰해줘"`
- `"[파일명] 코드 품질 검토해줘"`
