# Unified Agent Guide Entry

이 저장소의 역할별 가이드 문서는 이미 아래 경로에 정의되어 있으며, **이 파일들이 단일 원본(Source of Truth)** 입니다.

- standards: `.agents/standards/*.md`
- workflows: `.agents/workflows/*.md`

## Rule
- 역할별 가이드는 새로 복제하거나 재작성하지 않습니다.
- 작업 시 해당 역할 문서를 직접 참조합니다.
- 지침 충돌 시 `AGENTS.md`보다 `.agents/standards/*.md`와 `.agents/workflows/*.md`를 우선합니다.

## Role Guide Map
- FE: `.agents/standards/FE_GUIDE.md`
- BE: `.agents/standards/BE_GUIDE.md`
- DB: `.agents/standards/DB_GUIDE.md`
- DBA: `.agents/standards/DBA_GUIDE.md`
- UI: `.agents/standards/UI_GUIDE.md`
- PO: `.agents/standards/PO_GUIDE.md`
- QA: `.agents/standards/QA_GUIDE.md`
- MODEL: `.agents/standards/MODEL_GUIDE.md`

## Workflow Map
- FE: `.agents/workflows/fe-plan.md`, `.agents/workflows/fe-rv.md`, `.agents/workflows/fe-act.md`
- BE: `.agents/workflows/be-plan.md`, `.agents/workflows/be-rv.md`, `.agents/workflows/be-act.md`
- DB: `.agents/workflows/db-plan.md`, `.agents/workflows/db-rv.md`, `.agents/workflows/db-act.md`
- UI: `.agents/workflows/ui-plan.md`, `.agents/workflows/ui-rv.md`, `.agents/workflows/ui-act.md`
- PO: `.agents/workflows/po-plan.md`, `.agents/workflows/po-rv.md`
- QA: `.agents/workflows/qa.md`
- ATG: `.agents/workflows/atg.md`

## Encoding
- 한글 깨짐 방지를 위해 가이드 문서는 UTF-8로 읽습니다.

## Shared Skills Rule
- 공용 재사용 스킬의 단일 원본은 `.agents/skills/` 하위 폴더입니다.
- Codex, Claude Code, Antigravity는 아래 3가지 신호를 동일한 스킬 호출로 취급합니다.
  - `$skill-name`
  - Skills Map에 정의된 slash trigger
  - Skills Map의 자연어 트리거와 의미상 동일한 요청
- 스킬이 트리거되면 해당 `.agents/skills/<skill>/SKILL.md`를 열고 그 절차를 따릅니다.
- 여러 스킬이 동시에 맞으면 최소 집합만 사용하고 적용 순서를 짧게 밝힙니다.
- 스킬 지침이 `.agents/standards/*.md` 또는 `.agents/workflows/*.md`와 충돌하면 standards/workflows를 우선합니다.
- Codex와 Antigravity는 `AGENTS.md`, Claude Code는 `CLAUDE.md`를 기준으로 읽고, 두 파일의 Skills 섹션은 동일하게 유지합니다.

## Skills Map
- 재사용 가능한 스킬은 `.agents/skills/` 하위에 위치합니다.
- 각 스킬 폴더에는 `SKILL.md` 파일이 있으며, 실행 절차가 상세히 정의되어 있습니다.
- Antigravity, Claude Code, Codex 등 어디서든 동일하게 사용 가능합니다.

| 스킬 | 경로 | 사용 트리거 |
|------|------|------------|
| sk-cross-doc-consistency-review | `.agents/skills/sk-cross-doc-consistency-review/SKILL.md` | `$sk-cross-doc-consistency-review`, `/sk-cross-doc-review [범위]`, 또는 "문서 정합성 리뷰해줘" |
| sk-doc-normalizer-ko | `.agents/skills/sk-doc-normalizer-ko/SKILL.md` | `$sk-doc-normalizer-ko`, `/sk-doc-normalize [파일명]`, 또는 "문서 포맷 정규화해줘" |
| sk-top-doc-compressor | `.agents/skills/sk-top-doc-compressor/SKILL.md` | `$sk-top-doc-compressor`, `/sk-compress-top-doc [파일명]`, 또는 "상위 문서 압축해줘" |
| sk-contract-propagation | `.agents/skills/sk-contract-propagation/SKILL.md` | `$sk-contract-propagation`, `/sk-propagate-contract "[변경사항]"`, 또는 "이 변경사항 파급 반영 범위 정리해줘" |
| sk-agent-loop-prompt-writer | `.agents/skills/sk-agent-loop-prompt-writer/SKILL.md` | `$sk-agent-loop-prompt-writer`, "BE 루프용 프롬프트 세트 작성해줘" 등 |
| sk-code-review | `.agents/skills/sk-code-review/SKILL.md` | `$sk-code-review`, `/sk-code-review [파일명]`, 또는 "코드 리뷰해줘" |