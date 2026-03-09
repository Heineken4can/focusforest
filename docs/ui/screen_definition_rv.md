# UI 디자인 검수 리포트

| 항목 | 내용 |
|------|------|
| 검수 대상 | `docs/ui/screen_definition_published.html`, `docs/ui/screen_design.md` |
| 검수 기준 | `.agents/standards/UI_GUIDE.md`, `docs/ui/design_system.md v1.6` |
| 검수자 | ui-rv |
| 검수일시 | 2026-03-09 14:35:22 |
| 종합 판정 | FAIL |

---

## 파트 1. HTML 품질 검수

### 1-A. 컬러 토큰 준수 여부 — 판정: WARN

| ID | 등급 | 지적 사항 | 근거 |
|----|------|----------|------|
| A-1 | WARN | CSS 변수 네임이 design_system.md의 Tailwind 토큰명과 불일치한다. HTML 내부 `:root`는 `--bg`, `--surface`, `--blue` 등 축약형을 사용하나, design_system.md의 공식 토큰명은 `toss-bg`, `toss-surface`, `toss-blue`(Tailwind 클래스 기준)로 정의되어 있다. 단일 진실 원천(SSOT)과의 네이밍 불일치로 인해 FE 핸드오프 시 혼선을 초래할 수 있다. | design_system.md 2절, 2.3절 |
| A-2 | WARN | 하드코딩 색상값이 인라인 스타일 내에 다수 사용되고 있다. 대표 사례: `rgba(49,130,246,.14)`, `rgba(26,201,126,.12)`, `rgba(26,201,126,.18)`, `rgba(240,68,82,.12)` 등. 토큰 변수(`var(--blue)` 등)를 사용하지 않고 RGB 값을 직접 기입하여 색상값이 변경될 때 일관성 유지가 불가능하다. | design_system.md 2절, 2.3절 |
| A-3 | INFO | Overlay 색상이 `:root`에서 `rgba(0,0,0,.76)`으로 선언되어 있다. design_system.md 2.1절에서는 `--toss-overlay: 0 0 0`을 CSS 변수로 관리하고 alpha는 `bg-toss-overlay/60` 유틸리티로 조절하는 것을 명시하고 있으나, 퍼블리싱 파일은 별도 alpha 관리 없이 고정값(0.76)으로 처리하였다. | design_system.md 2.1절, 2.3절 |

---

### 1-B. `toss-blue` 사용 범위 준수 여부 — 판정: PASS

| ID | 등급 | 지적 사항 | 근거 |
|----|------|----------|------|
| B-1 | INFO | 전반적으로 `var(--blue)`는 CTA 배경(`btn-primary`), 링 테두리, 선택 항목 인디케이터(`border-left`), 스위치 on 상태, 포커스 링 등에만 사용되고 있다. 텍스트 색상으로 직접 지정한 사례는 발견되지 않는다. design_system.md 2.1절의 `toss-blue` 사용 제한 규칙을 전반적으로 준수하고 있다. | design_system.md 2.1절 |
| B-2 | INFO | `btn-primary` 클래스의 `color: var(--bg)` 조합은 design_system.md 5.2절의 `bg-toss-blue text-toss-bg` 공식 CTA 조합과 일치한다. | design_system.md 5.2절 |

---

### 1-C. 상태 표현 완성도 — 판정: FAIL

| ID | 등급 | 지적 사항 | 근거 |
|----|------|----------|------|
| C-1 | CRITICAL | Disabled 상태가 어떤 인터랙티브 컴포넌트에도 구현되어 있지 않다. design_system.md 5.2절은 모든 인터랙티브 컴포넌트에 Disabled 상태를 반드시 정의할 것을 요구한다. 특히 SCR-01의 '집중 시작' 버튼은 과제 미선택 시 Disabled여야 하는 핵심 상태이나, 해당 표현이 없다. | design_system.md 5.2절, UI_GUIDE.md 3절 |
| C-2 | CRITICAL | Loading 상태가 전혀 구현되어 있지 않다. SCR-09 로그인 폼 제출 시, SCR-10 수동 동기화 실행 시 등 비동기 처리 대기 상태에 `animate-pulse` 또는 스피너 표현이 필요하나 누락되어 있다. | design_system.md 5.2절, UI_GUIDE.md 3절 |
| C-3 | WARN | SCR-09 폼에서 Error 상태는 `.input.error { border-color:var(--red); }` 클래스와 `.err { color:var(--red); }` 로 부분 표현되어 있으나, 에러 메시지가 입력 필드와 `aria-describedby`로 연결되어 있지 않다. 시각적 표현만 있고 접근성 연결이 누락된 불완전한 상태 구현이다. | design_system.md 5.2절, 6.1절 |
| C-4 | WARN | Hover 상태가 CSS 클래스로 정의되어 있지 않다. `.row`, `.btn`, `.btn-primary`, `.btn-surface` 등 인터랙티브 요소에 `hover:` 변형 규칙이 없다. design_system.md 5.4절에서 Hover 트랜지션은 `150ms ease-in-out`으로 명세되어 있다. | design_system.md 5.2절, 5.4절 |
| C-5 | INFO | SCR-05에서 Pause 상태 시각 표현(`.chip.warning` 배지, toast 경고)은 적절히 구현되어 있다. SCR-06의 Danger 버튼(`var(--red)` 아이콘)도 디자인 명세 의도를 반영하고 있다. 다만 Danger 버튼은 `btn-surface` 클래스를 사용하여 배경이 `--surface`이고 아이콘만 빨간색인데, design_system.md에서 Danger 전용 버튼 스펙이 별도로 정의되지 않아 현재 구현이 명세를 위반하는지 단정하기 어렵다. 명세에 Danger 버튼 조합 추가를 권장한다. | design_system.md 5.2절 |

---

### 1-D. 접근성 — 판정: FAIL

| ID | 등급 | 지적 사항 | 근거 |
|----|------|----------|------|
| D-1 | CRITICAL | 아이콘 전용 버튼에 `aria-label`이 전혀 제공되지 않는다. 대표 사례: SCR-04 타이머 화면의 Skip(`skip_next`) 버튼, SCR-01의 '추가' `.btn` 버튼 등. design_system.md 6.1절은 "아이콘 전용 버튼은 반드시 `aria-label`을 제공한다"고 명시한다. | design_system.md 6.1절, UI_GUIDE.md 4절 |
| D-2 | CRITICAL | Toggle/Switch 컴포넌트에 `role="switch"` 및 `aria-checked` 속성이 없다. SCR-10의 자동 동기화, 집중 시작 알림 스위치가 `.switch` 클래스의 `div`로만 구현되어 있어 스크린 리더에서 상태를 인식할 수 없다. design_system.md 5.3절, 6.1절에서 `role="switch"` 필수 적용을 명시하고 있다. | design_system.md 5.3절, 6.1절, UI_GUIDE.md 4절 |
| D-3 | CRITICAL | 집중 타이머 숫자 영역에 `aria-live="polite"` 속성이 없다. 타이머는 실시간으로 변하는 상태 텍스트이므로 design_system.md 6.1절에서 명시한 대로 `aria-live` 영역으로 선언되어야 한다. | design_system.md 6.1절, UI_GUIDE.md 4절 |
| D-4 | CRITICAL | SCR-09 폼 필드의 `<label>`과 `.input` 요소 간에 `for`/`id` 연결이 없다. `<label>이메일</label>` 다음에 오는 `.input` div는 실제 `<input>` 요소가 아니라 div이므로, 스크린 리더가 레이블과 입력 필드를 연결할 수 없다. 실제 구현 시 `<input>` 요소와 `<label for="...">` 연결이 필수이다. | design_system.md 6.1절, UI_GUIDE.md 4절 |
| D-5 | WARN | `.btn`, `.btn-primary`, `.btn-surface` 모두 `<button>` 태그를 일부 사용하고 있으나 일부는 `<div>` 또는 `<span>` 기반으로 렌더링되는 경우가 보인다(예: SCR-01 데스크톱의 `<div class="btn">추가</div>`). 버튼 역할 요소는 반드시 `<button>` 태그를 사용해야 키보드 접근성이 보장된다. | UI_GUIDE.md 4절 |
| D-6 | WARN | 체크박스/라디오 컴포넌트가 이 파일에는 없으나, 터치 타겟 44x44px 정책이 `.btn` 계열에도 적용되어야 한다. `.btn` 클래스의 `min-height:48px`은 높이 기준을 충족하나, 일부 `.btn` 인스턴스가 `min-height:40px`(`style="min-height:40px;"`)로 축소 사용되고 있어 터치 타겟 기준 미달 가능성이 있다. | design_system.md 5.3절, 6.1절 |

---

### 1-E. 반응형 및 모달 패턴 — 판정: PASS

| ID | 등급 | 지적 사항 | 근거 |
|----|------|----------|------|
| E-1 | INFO | 모달 패턴은 전반적으로 설계 의도를 준수하고 있다. SCR-05/06/07/08의 모바일 프레임에서는 `.overlay.bottom` + `.modal.sheet`(Bottom Sheet)를, 데스크톱 프레임에서는 `.overlay` + `.modal`(센터 모달)을 사용하여 design_system.md 6절 및 6절 모바일 특화 가이드의 패턴을 따르고 있다. | design_system.md 6절 |
| E-2 | INFO | `@media (max-width:1180px)` 와 `@media (max-width:780px)` 두 개의 브레이크포인트를 사용하고 있다. design_system.md 6절은 `640px`, `1024px`을 기준으로 정의하나, 퍼블리싱 파일은 `780px`, `1180px`을 사용하여 명세와 불일치한다. 화면정의서 목적의 HTML이므로 엄격한 위반은 아니지만, FE 핸드오프 시 혼선을 줄이려면 정렬이 필요하다. | design_system.md 6절 |
| E-3 | INFO | 모바일 `@media (max-width:780px)` 구간에서 `.stats` 그리드와 `.side`를 `display:none`으로 숨기는 처리는 단일 컬럼 모바일 레이아웃 방향과 일치한다. | design_system.md 6절 |

---

### 1-F. 타이포그래피 및 간격 — 판정: WARN

| ID | 등급 | 지적 사항 | 근거 |
|----|------|----------|------|
| F-1 | WARN | 타이머 숫자(`.big`)의 `font-size:clamp(54px,8vw,96px)`는 design_system.md 3절의 Timer Display 스펙인 `6rem (96px)` 고정값과 다르다. `clamp` 함수 사용으로 소형 화면에서 96px 미만으로 줄어들 수 있다. 반응형 적용 자체는 실용적이나, 명세와의 차이를 FE 핸드오프 문서에 명시해야 한다. | design_system.md 3절 |
| F-2 | INFO | 인라인 `style`에 `px` 단위가 혼용되어 있다. design_system.md 3절은 폰트 스케일을 `rem` 단위 기준으로 정의하고 있으나, 퍼블리싱 파일의 인라인 스타일에서는 `px` 단위가 주로 사용된다. 화면정의서 목적 파일이므로 즉각적 수정 요건은 아니나, 실구현 시 `rem` 변환이 필요하다. | design_system.md 3절 |
| F-3 | INFO | `font-variant-numeric:tabular-nums`는 `.big` 클래스에 정확히 적용되어 있다. design_system.md 3절 필수 항목을 준수하고 있다. | design_system.md 3절 |

---

### 1-G. 기타 디자인 시스템 위반 — 판정: WARN

| ID | 등급 | 지적 사항 | 근거 |
|----|------|----------|------|
| G-1 | WARN | `.btn-primary`의 `border-radius:16px`은 design_system.md 5.1절의 버튼 `rounded-2xl(16px)` 규칙을 준수하나, `.card`, `.modal`, `.form`의 `border-radius:24px`은 `rounded-2xl(16px)` 기준을 초과한다. 카드 컴포넌트의 라운드 값이 명세(`rounded-2xl = 16px`)보다 크게 구현되어 토큰 불일치가 발생한다. | design_system.md 5.1절 |
| G-2 | WARN | `.switch` 컴포넌트는 `width:48px; height:28px`으로 design_system.md 5.3절 스펙(`h-7 w-12` = 28px, 48px)과 일치하나, 래퍼(`min-h-[44px]`) 처리가 없어 모바일 터치 타겟 44px 기준을 충족하지 못할 가능성이 있다. | design_system.md 5.3절 |
| G-3 | INFO | `.hero`, `.screen`, `.summary`에 `border-radius:28px`이 사용되어 있다. 이는 카드 컴포넌트(24px)보다도 큰 값으로, 화면 외곽 프레임 처리 목적으로 사용된 것으로 보인다. 퍼블리싱 전용 레이아웃 요소이므로 실구현에서 이 값이 그대로 전달되지 않도록 FE 핸드오프 시 명확히 구분해야 한다. | design_system.md 5.1절 |
| G-4 | INFO | 모달 등장/닫기 트랜지션(`200ms ease-out`, `150ms ease-in`)이 CSS에 정의되어 있지 않다. 화면정의서 목적의 정적 HTML이므로 즉각 수정 요건은 아니나, FE 구현 시 design_system.md 5.4절의 트랜지션 스펙이 반드시 반영되어야 한다. | design_system.md 5.4절 |

---

## 파트 2. HTML 파일 분할 설계안

### 2-1. 분할 기준 검토

screen_design.md의 10개 화면(SCR-01 ~ SCR-10)은 기능적 연관성과 사용자 흐름(User Flow) 기준으로 자연스럽게 3개 그룹으로 묶인다.

| 그룹 | 포함 화면 | 연관 User Story | 공통 특성 |
|------|----------|----------------|-----------|
| 대시보드 그룹 | SCR-01, SCR-02, SCR-03 | US-1, US-2, US-8 | 할 일 목록 관리, 과제 선택, 앱 메인 진입점 |
| 집중 모드 그룹 | SCR-04, SCR-05, SCR-06, SCR-07, SCR-08 | US-3, US-4, US-5, US-6 | 타이머, 일시정지/포기/휴식/보상 등 세션 전체 라이프사이클 |
| 계정 그룹 | SCR-09, SCR-10 | US-9, US-10 | 인증, 프로필, 환경설정, 데이터 동기화 |

화면 ID별 단위 분할(파일 10개)은 파일 수가 과도하게 증가하고 그룹 내 상태 전이 관계(예: SCR-04 → SCR-05 → SCR-07 → SCR-08)를 한 파일에서 함께 검토하기 어렵다. 따라서 **기능 그룹별 분할(파일 3개 + 인덱스 1개)**을 권장한다.

---

### 2-2. 제안 파일 목록

| 파일명 | 담는 화면 ID | 근거 |
|--------|------------|------|
| `screen_dashboard.html` | SCR-01, SCR-02, SCR-03 | 동일 레이아웃(사이드바+메인 컬럼) 공유. Empty State → 기본 목록 → 과제 선택 순서로 상태 전이가 연속적이어서 한 파일에서 비교 검토가 용이하다. |
| `screen_focus.html` | SCR-04, SCR-05, SCR-06, SCR-07, SCR-08 | 타이머 전용 레이아웃(Dimming 배경, 링 컴포넌트) 공유. 집중 세션의 전체 상태 머신(진행 → 일시정지 → 포기 경고 → 휴식 → 보상)을 연속 흐름으로 확인해야 한다. |
| `screen_auth.html` | SCR-09, SCR-10 | 폼 컴포넌트와 모달/시트 기반 설정 패널을 공유. 인증과 설정은 동일한 카드/폼 디자인 어휘를 사용하므로 함께 배치한다. |
| `index.html` | 인덱스 (화면 목록 + 네비게이션) | 세 파일을 연결하는 허브. SCR-01~SCR-10 전체 화면 목록, 각 그룹 파일로의 링크, 퍼블리싱 기준 요약 섹션(`<section class="hero">`, `<section class="summary">`)을 포함한다. |

---

### 2-3. 공유 CSS/토큰 처리 방법

현재 단일 파일의 `<style>` 블록은 약 30줄의 인라인 CSS로 구성되어 있으며, `:root` 변수 선언과 레이아웃/컴포넌트 스타일이 혼합되어 있다. 분할 시 아래 두 가지 방안을 제안한다.

**권장 방안: 공통 `base.css` 외부 파일 분리**

```
docs/ui/
├── base.css                    (공통 CSS 변수, 공통 컴포넌트 클래스)
├── index.html
├── screen_dashboard.html
├── screen_focus.html
└── screen_auth.html
```

- `base.css`에는 `:root` 변수 선언, `.btn`, `.btn-primary`, `.card`, `.modal`, `.frame`, `.mobile-nav` 등 3개 파일이 공통으로 사용하는 클래스를 포함한다.
- 각 HTML 파일에서 `<link rel="stylesheet" href="base.css">`로 참조한다.
- 파일 고유 컴포넌트(예: `.ring`, `.orb`, `.big`은 `screen_focus.html` 전용; `.form`, `.fields`는 `screen_auth.html` 전용)는 해당 파일의 `<style>` 블록에 인라인으로 유지한다.

**대안 방안: `<style>` 인라인 유지 (공통 블록 복사)**

각 HTML 파일이 독립적으로 열릴 수 있도록 공통 CSS를 모든 파일에 동일하게 복사한다. 파일 수가 3~4개로 적을 때는 관리 부담이 낮으나, 공통 토큰 변경 시 모든 파일을 일일이 수정해야 하는 단점이 있다. 화면정의서 목적의 단기 산출물이라면 허용 가능하나, 장기 유지 관리 시에는 권장하지 않는다.

**CSS 변수 네이밍 보완 권장사항**

분할과 동시에 현재 `--bg`, `--blue` 등의 축약형 변수명을 design_system.md의 공식 토큰명에 맞춰 `--toss-bg`, `--toss-blue` 형식으로 정렬하는 것을 권장한다. 이를 통해 FE 핸드오프 시 Tailwind config와의 네이밍 혼선을 방지한다.

---

### 2-4. 파일 간 네비게이션 방법

**index.html 기반 허브 구조**를 권장한다.

- `index.html` 상단에 그룹 카드 3개를 배치하여 각 분할 파일로 링크한다.
- 각 분할 파일(`screen_dashboard.html` 등) 상단에는 `index.html`로 돌아가는 '화면 목록' 링크와 그룹 내 이전/다음 섹션으로 이동하는 앵커 링크(`#scr-04`, `#scr-05` 등)를 제공한다.

최소 구조 예시:

```
index.html
  └─ [링크] → screen_dashboard.html#scr-01
  └─ [링크] → screen_focus.html#scr-04
  └─ [링크] → screen_auth.html#scr-09

screen_dashboard.html
  <header> [← 목록으로] | [집중 모드 →] </header>
  <section id="scr-01"> ... </section>
  <section id="scr-02"> ... </section>
  <section id="scr-03"> ... </section>
```

---

### 2-5. 주의사항 및 권장사항

| 번호 | 구분 | 내용 |
|------|------|------|
| 1 | 주의 | 분할 후에도 각 파일은 독립적으로 열렸을 때 Pretendard 폰트와 Material Symbols Rounded 폰트가 정상 로드되어야 한다. `<link>` 태그를 각 파일의 `<head>`에 개별 포함하거나, `base.css`에서 `@import`로 처리한다. |
| 2 | 주의 | `screen_focus.html`은 데스크톱과 모바일 프레임을 나란히 비교하는 용도이므로, 분할 후에도 SCR-04~SCR-08을 모두 한 파일에 유지하여 세션 흐름을 한눈에 검토할 수 있도록 한다. 상태별 단위 분리는 지양한다. |
| 3 | 권장 | 분할과 동시에 1-D에서 지적된 CRITICAL 접근성 항목(D-1 `aria-label`, D-2 `role="switch"`, D-3 `aria-live`, D-4 `<input>` + `<label for>`)을 보완한다. 화면정의서가 FE 핸드오프의 기준 문서이므로, 결함이 있는 상태로 전달되면 실구현에서도 동일한 문제가 재현될 가능성이 높다. |
| 4 | 권장 | `base.css` 작성 시 CSS 변수 네이밍을 `--toss-*` 형식으로 통일하고, design_system.md 2.3절의 `:root { --toss-overlay: 0 0 0; }` 선언을 포함한다. |
| 5 | 권장 | 분할된 각 파일의 `<title>` 태그를 `Focus Forest 화면정의서 - 대시보드 (SCR-01~03)` 형식으로 구체화하여 파일을 직접 열었을 때 문맥을 즉시 파악할 수 있도록 한다. |
| 6 | 참고 | 현재 HTML에서 `screen_design.md`와의 불일치 사항: `screen_design.md`는 SCR-04를 `timer_master.html`(예정)로 분리 참조 예정이라고 명시하나, 퍼블리싱 파일은 이를 단일 파일에 포함하여 구현하였다. 분할 설계 실행 전 `timer_master.html` 별도 파일 생성 여부를 PO/FE와 협의하여 결정하는 것을 권장한다. |

---

## 종합 지적 사항 요약

| ID | 등급 | 항목 | 조치 요약 |
|----|------|------|----------|
| C-1 | CRITICAL | Disabled 상태 미구현 | 모든 인터랙티브 컴포넌트(버튼, 폼 필드)에 Disabled 상태 스타일 정의 필요 |
| C-2 | CRITICAL | Loading 상태 미구현 | 로그인, 동기화 등 비동기 액션에 `animate-pulse` 또는 스피너 추가 필요 |
| D-1 | CRITICAL | 아이콘 전용 버튼 `aria-label` 누락 | Skip 버튼, 추가 버튼 등에 `aria-label` 속성 추가 필요 |
| D-2 | CRITICAL | Toggle/Switch `role="switch"` 누락 | `.switch` 요소에 `role="switch"` 및 `aria-checked` 속성 추가 필요 |
| D-3 | CRITICAL | 타이머 `aria-live` 누락 | 타이머 숫자 영역에 `aria-live="polite"` 선언 필요 |
| D-4 | CRITICAL | 폼 필드 레이블 연결 누락 | `<input>`과 `<label for>` 연결, 에러 메시지 `aria-describedby` 연결 필요 |
| A-1 | WARN | CSS 변수 네이밍 불일치 | `--bg`, `--blue` 등을 `--toss-bg`, `--toss-blue` 형식으로 정렬 필요 |
| A-2 | WARN | 하드코딩 색상값 다수 존재 | 인라인 RGB 값을 CSS 변수 참조로 교체 필요 |
| C-3 | WARN | 폼 Error 상태 접근성 연결 누락 | 에러 메시지와 입력 필드 `aria-describedby` 연결 필요 |
| C-4 | WARN | Hover 상태 미정의 | 버튼 및 리스트 아이템에 hover 스타일 규칙 추가 필요 |
| E-2 | WARN | 브레이크포인트 명세 불일치 | 퍼블리싱 파일(780px, 1180px)과 명세(640px, 1024px) 정렬 권장 |
| F-1 | WARN | 타이머 폰트 크기 명세 불일치 | `clamp` 사용 여부와 96px 기준 적용 방침을 FE 핸드오프 시 명시 필요 |
| G-1 | WARN | 카드 border-radius 명세 초과 | `.card`, `.modal` `border-radius:24px`를 명세 기준 `16px`로 조정 검토 필요 |

**CRITICAL: 6건 / WARN: 7건 / INFO: 9건**
