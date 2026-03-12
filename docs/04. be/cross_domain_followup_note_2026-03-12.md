# Cross-Domain Follow-up Note (2026-03-12)

## 목적

이번 턴은 BE 쓰기 범위만 허용되므로, read-only 문서에 필요한 정합성 후속만 메모로 남긴다.

## 제안 대상

- `docs/06. fe/fe_design.md`
- `docs/02. ui/ui_data_contract.md`

## 제안 내용

1. Auth CSRF 획득 경로를 아래 기준으로 명시한다.
   - `signup`, `login`, `refresh` 성공 시 서버가 `refreshToken` HttpOnly Cookie와 non-HttpOnly `csrfToken` Cookie를 함께 설정/회전한다.
   - FE는 `csrfToken` cookie 값을 읽어 `X-CSRF-Token` 헤더에 그대로 반영해 `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout` 호출에 사용한다.
2. Auth rate limit 오류 코드 대응을 아래 기준으로 명시한다.
   - `signup`, `login`, `refresh`의 rate limit 초과 응답 코드는 `AUTH_429_RATE_LIMIT`이다.
   - Sync/Metrics 계열의 rate limit 초과 응답 코드는 기존대로 `SYNC_429_RATE_LIMIT`이다.

## 근거 정본

- `docs/04. be/be_api.md`
- `docs/04. be/be_design.md`
- `docs/04. be/be_plan.md`