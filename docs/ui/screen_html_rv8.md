# screen_html_rv8 — Focus Forest UI 화면정의서 HTML 8차 검수

검수일시: 2026-03-09 15:42:00
검수자: ui-rv2
검수 대상: base.css, index.html, screen_dashboard.html, screen_focus.html, screen_auth.html (8차 수정본)

## 종합 판정
**PASS 조건부** — 7차 잔존 이슈 중 N-9(aria-busy)가 완전 해소됨. N-2-R은 `:root` 토큰 신규 등록(`--space-2-5`, `--space-4-5`, `--space-14`, `--text-caption-sm`, `--text-title-md`, `--text-display-sm`)과 CSS 클래스 내 `var()` 참조 전환으로 대부분 해소되었으나 `base.css` 내 4개 선택자(`.input-field`, `.empty-box`, `.nav-item`, `.preview-label`)에 비공식 수치가 잔존하여 부분 해소 판정. N-8-R은 `margin-top:Npx` 단독 인라인 패턴이 유틸리티 클래스(`mt-space-4` 등)로 교체되어 상당 부분 개선되었으나 `margin:16px 0 8px` 복합 인라인 속성 4건 및 `margin-top:18px` 2건이 잔존. CRITICAL·WARN 0건 유지.

| 구분 | 건수 |
|------|------|
| CRITICAL | 0 |
| WARN | 0 |
| INFO | 7 |

---

## 7차 잔존 이슈 해소 확인

| ID | 내용 | 상태 | 근거 |
|----|------|------|------|
| N-2-R | CSS 내 비공식 간격·폰트 수치 잔존 | ⚠️ 부분 해소 | `:root`에 `--space-2-5: 10px`, `--space-4-5: 18px`, `--space-14: 56px`, `--text-caption-sm: 13px`, `--text-title-md: 22px`, `--text-display-sm: 32px` 신규 등록 확인. `.chip padding`, `.btn padding`, `.eyebrow margin`, `.row-button padding`, `.widget padding`, `.box padding`, `.page 미디어쿼리 padding`이 모두 `var()` 참조로 교체됨. 그러나 `.input-field { padding: 0 16px }`, `.empty-box { padding: 40px 32px }`, `.nav-item { padding: 0 14px }`, `.preview-label { font-size: 12px }` 4건에 여전히 하드코딩 잔존 (상세 내용: N-2-R2 신규 이슈 참조). |
| N-8-R | HTML 인라인 비공식 폰트·간격 수치 잔존 | ⚠️ 부분 해소 | `margin-top:16px` 단독 패턴이 `mt-space-4` 유틸리티 클래스로 교체 완료됨. `font-size:22px`, `font-size:32px`, `font-size:13px` 인라인이 `.title-22`, `.display-32`, `.text-13` 유틸리티 클래스로 교체 완료됨. 그러나 `screen_focus.html` 40·70·102·184행에 `style="margin:16px 0 8px;"` 복합 인라인 속성 4건, `screen_dashboard.html` 120·177행에 `style="margin-top:18px;"` 2건이 잔존 (상세 내용: N-8-R2 신규 이슈 참조). |
| N-9 | SCR-08 Loading 버튼 `aria-busy` 미적용 | ✅ 해소 | `screen_focus.html` 235행: `<button class="btn-primary pulse" type="button" disabled aria-busy="true">` — `aria-busy="true"` 추가 확인. 7차 권장 사항 완전 반영됨. |

---

## 신규 이슈

### N-2-R2 — base.css 내 잔존 하드코딩 수치 4건 (INFO)

**등급**: INFO
**위치**: base.css

7차에서 지적된 수치들은 대부분 해소되었으나, 아래 4개 선택자에서 하드코딩이 잔존합니다.

| 위치 (행) | 선택자 | 수치 | 대체 방안 |
|-----------|--------|------|-----------|
| 679행 | `.input-field { padding: 0 16px; }` | `16px` | `var(--space-4)` 참조로 교체 |
| 626행 | `.empty-box { padding: 40px 32px; }` | `40px`, `32px` | `32px`은 `var(--space-8)` 참조로 교체. `40px`은 `:root`에 `--space-10: 40px` 등록 후 참조 또는 인접값(`--space-8` 32px / `--space-12` 48px)으로 정렬 필요 |
| 266행 | `.nav-item { padding: 0 14px; }` | `14px` | `--space-3-5: 14px` 토큰이 `:root`에 존재하므로 `var(--space-3-5)` 참조로 교체 |
| 156행 | `.preview-label { font-size: 12px; }` | `12px` | Caption 크기(`12px`)이며 현재 별도 토큰 미존재. `--text-caption: 12px` 신규 등록 후 참조하거나, `.chip`과 동일한 `font-size` 적용 규칙을 명시 |

---

### N-8-R2 — HTML 인라인 복합 margin·간격 수치 잔존 (INFO)

**등급**: INFO
**위치**: screen_focus.html, screen_dashboard.html

단독 `margin-top` 패턴은 유틸리티 클래스로 해소되었으나, 아래 항목들이 잔존합니다.

**복합 인라인 margin (screen_focus.html):**

| 행 | 내용 | 비고 |
|----|------|------|
| 40행 | `style="margin:16px 0 8px;"` | SCR-04 Desktop h2 타이틀. `16px=--space-4`, `8px=--space-2`이나 복합 속성으로 인라인 처리됨 |
| 70행 | `style="margin:16px 0 8px;"` | SCR-04 Mobile h2 타이틀. 동일 패턴 |
| 102행 | `style="margin:16px 0 8px;"` | SCR-05 h2 타이틀. 동일 패턴 |
| 184행 | `style="margin:16px 0 8px;"` | SCR-07 h2 타이틀. 동일 패턴 |

**margin-top:18px 잔존 (screen_dashboard.html):**

| 행 | 내용 | 비고 |
|----|------|------|
| 120행 | `style="margin-top:18px;"` | SCR-02 Desktop 집중 시작 버튼 래퍼. `18px=--space-4-5` 토큰 등록됨. `mt-space-4-5` 유틸리티 클래스 미정의 |
| 177행 | `style="margin-top:18px;"` | SCR-03 Desktop 집중 시작 버튼 래퍼. 동일 패턴 |

`margin:16px 0 8px` 복합 속성을 처리하려면 `h2.title-lg` 하위 특정 패턴에 CSS 클래스(예: `.timer-title`)를 추가하거나 base.css의 `.timer-stack h2` 선택자에 공통 규칙을 적용하는 방식을 권장합니다. `margin-top:18px` 2건은 `mt-space-4-5` 유틸리티 클래스를 base.css에 추가하면 인라인 제거가 가능합니다.

---

### N-10 — screen_dashboard.html 인라인 flex/gap 속성 잔존 (INFO)

**등급**: INFO
**위치**: screen_dashboard.html 110행

```
<div style="display:flex;gap:8px;">
```

SCR-02 Desktop topbar 우측 버튼 그룹에 인라인 `display:flex; gap:8px`이 사용되고 있습니다. `gap:8px`은 `--space-2` 토큰 값이나 별도 유틸리티 클래스 없이 인라인으로 처리됩니다. `topbar-actions` 또는 `icon-group` 등 시맨틱 클래스를 base.css에 추가하면 인라인 속성을 제거할 수 있습니다.

---

### N-11 — screen_focus.html SCR-04 slim 사이드바 아이콘 aria-label 누락 (INFO)

**등급**: INFO
**위치**: screen_focus.html 34~35행

```
<aside class="sidebar slim">
  <div class="mark"><span class="material-symbols-rounded">forest</span></div>
  <span class="material-symbols-rounded">home</span>
  <span class="material-symbols-rounded" style="color:var(--toss-text-main);">timer</span>
</aside>
```

집중 모드 데스크톱 좌측 Slim 사이드바에서 `home`, `timer` 아이콘이 단순 `<span>` 요소로 렌더링되고 있습니다. 현재 `opacity: 0.4` dimmed 처리(`sidebar.slim` 클래스)로 시각적 비활성을 표현하고 있으나, 스크린 리더에 아이콘의 의미 전달이 없습니다. `<span>` 요소에 `role="img" aria-label="홈"`, `role="img" aria-label="타이머"` 또는 `aria-hidden="true"` + 전체 aside의 `aria-label` 보완을 권장합니다. 단, 해당 사이드바가 시각 전용 장식 요소임이 명확하다면 `aria-hidden="true"`를 aside에 적용하여 스크린 리더에서 완전히 제외하는 방식도 허용됩니다.
**참조**: design_system.md 6.1절, UI_GUIDE.md 4절

---

### N-12 — screen_dashboard.html empty-box .mark 인라인 style 비공식 수치 (INFO)

**등급**: INFO
**위치**: screen_dashboard.html 46행

```
<div class="mark" style="width:72px;height:72px;margin:0 auto 20px;">
```

SCR-01 Empty State 아이콘 mark 요소에 `72px`(`:root` 미등록), `20px`(`--space-5` 토큰 존재) 수치가 인라인으로 사용됩니다. `72px`은 공식 spacing 스케일에 없는 수치로, `:root`에 별도 크기 토큰을 등록하거나 이 상황에서만 사용하는 `.mark-lg` 변형 클래스를 base.css에 추가하는 방식을 권장합니다. `margin-bottom: 20px`은 `var(--space-5)`로 대체 가능합니다.

---

### N-13 — screen_focus.html SCR-04 Mobile padding-bottom 비공식 수치 (INFO)

**등급**: INFO
**위치**: screen_focus.html 68행

```
<div class="timer-stack" style="padding-bottom:96px;">
```

SCR-04 Mobile 타이머 스택에 `padding-bottom:96px`이 인라인으로 사용됩니다. `96px`은 `:root` 미등록 수치입니다. 모바일 bottom-bar 높이 보정용 값으로 추정되며, base.css의 `.frame.mobile .main { padding-bottom: 92px; }`와 수치가 불일치(92px vs 96px)합니다. 의도된 차이라면 `:root`에 `--mobile-bar-clearance` 등 전용 토큰으로 통합 관리하고, 인라인 제거를 권장합니다.

---

## 최종 의견

8차 수정본에서 7차 핵심 권장 사항이 적극 반영되었습니다. 특히 N-9(SCR-08 aria-busy)가 완전 해소되었고, N-2-R의 주요 수치(`18px`, `10px`, `56px`, `22px`, `32px`, `13px`)가 `:root` 토큰 신규 등록과 `var()` 참조 전환으로 대부분 처리된 점이 긍정적입니다. N-8-R도 단독 `margin-top` 패턴 전반이 유틸리티 클래스로 교체되었습니다.

잔존 과제는 규모가 작고 모두 INFO 수준으로, 복합 인라인 margin(4건), `margin-top:18px`(2건), CSS 내 하드코딩 4건이 주요 항목입니다. WARN 이상 이슈는 0건을 유지하고 있습니다.

| 영역 | 상태 | 비고 |
|------|------|------|
| 디자인 토큰 일관성 | 대부분 완료 | CSS 주요 비공식 수치 토큰화 완료. input-field, empty-box, nav-item 4건 잔존 |
| 접근성(ARIA) | 대부분 완료 | N-9 완전 해소. slim 사이드바 아이콘 aria 처리 보완 권장(N-11) |
| 상태 명세 완성도 | 완료 | Disabled/Loading/Error/Selected 전체 상태 명세 유지 |
| PRD 정책 반영 | 완료 | Pause 5분 자동 취소(SCR-05), Skip 휴식 전용(SCR-07), 완료 100 SP(SCR-08) 유지 확인 |
| 반응형 패턴 | 완료 | Desktop 센터 모달, Mobile Bottom Sheet, Bottom Nav 구조 모두 유지 확인 |

**CRITICAL: 0건 / WARN: 0건 / INFO: 7건**

> 다음 수정 사이클 우선순위: N-8-R2(복합 인라인 margin 및 margin-top:18px 처리) > N-2-R2(CSS 내 잔존 4건 토큰 참조 전환) > N-11(slim 사이드바 아이콘 aria 처리) > N-13(mobile padding-bottom 수치 통합) > N-12(empty-box mark 인라인) > N-10(flex/gap 인라인 클래스화)
>
> WARN 0건, CRITICAL 0건 상태가 유지되고 있어 현 시점에서 FE 핸드오프는 조건부 가능합니다. 위 INFO 항목들은 FE 구현 단계에서 유틸리티 클래스 추가와 병행하여 일괄 정리하는 방식도 허용됩니다.
