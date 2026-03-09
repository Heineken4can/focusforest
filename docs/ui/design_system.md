# 🎨 디자인 시스템 및 테마 스펙 (Design System) - 집중의 숲 (Focus Forest)

---



**작성자**: UI/UX 디자인 설계자 (UI-Plan)
**버전**: v1.6 (2026-03-09, design_system_rv2 반영)

---

## 1. 디자인 컨셉 개요

- **에셋 레퍼런스**: 토스/토스증권 (Toss Invest) 스타일
- **핵심 키워드**: `#모던`, `#신뢰감`, `#가독성`, `#플랫디자인`, `#대비`
- **시각적 방향**:
  - **직관적이고 정돈된 토스증권 스타일**: 불필요한 장식을 제거하고 텍스트와 숫자의 가독성을 극대화한 미니멀하고 세련된 UI.
  - **다크 모드 중심**: 깊이 있는 다크 네이비/블랙 배경을 기반으로, 텍스트의 대비를 높여 눈의 피로도를 낮추고 집중력을 높임.
  - **명료한 악센트 컬러**: 브랜드 메인 컬러인 '청량한 블루'를 포인트 액션(버튼, 활성 탭)에 사용하고, 상태(성공, 경고 등)에 따른 컬러 대비를 명확하게 줌.
  - **굵고 명확한 타이포그래피**: 중요한 정보(시간, 레벨, 핵심 과제)는 매우 크고 두꺼운 폰트 웨이트를 적용하여 시선 계층을 확실히 구분.

---

## 2. 컬러 팔레트 (Color Tokens)

> **⚠️ SSOT 기준**: 토큰은 **Tailwind CSS config(`tailwind.config`)의 `toss.*` 네임스페이스**를 단일 진실 원천으로 사용합니다. 아래 표의 토큰명은 Tailwind 클래스 기준입니다. (`toss-bg`, `toss-surface` 등)

| 구분                     | Tailwind 토큰명       | Hex Code                                     | 용도                                             |
| ------------------------ | --------------------- | -------------------------------------------- | ------------------------------------------------ |
| **Background**     | `toss-bg`           | `#0B0E14`                                  | 앱 전체 최하단 기본 배경 (깊은 다크 네이비/블랙) |
| **Surface**        | `toss-surface`      | `#181B23`                                  | 카드, 네비게이션, 리스트 아이템 배경             |
| **Surface Hover**  | `toss-surfaceHover` | `#222631`                                  | 클릭/호버 시 반응하는 서피스 배경색              |
| **Selected**       | `toss-selected`     | `#1E2D4A`                                  | 선택된 과제, 활성 항목의 배경 (블루 틴트 다크)   |
| **Primary**        | `toss-blue`         | `#3182F6`                                  | 메인 액션 버튼, 집중 모드 타이머, 쨍한 블루      |
| **Success**        | `toss-green`        | `#1AC97E`                                  | 세션 완료, 보상 지급, 긍정 완료 상태             |
| **Warning**        | `toss-yellow`       | `#F5A623`                                  | 타이머 임박, 주의 상태                           |
| **Danger**         | `toss-red`          | `#F04452`                                  | 포기, 삭제, 에러 상태                            |
| **Overlay**        | `toss-overlay`      | `rgb(var(--toss-overlay) / <alpha-value>)` | 모달/바텀시트 배경 dim (`bg-toss-overlay/60`)  |
| **Text Primary**   | `toss-textMain`     | `#F2F4F6`                                  | 메인 텍스트, 제목                                |
| **Text Secondary** | `toss-textSub`      | `#8B95A1`                                  | 부가 설명, 비활성 탭 텍스트                      |
| **Divider**        | `toss-divider`      | `#2A2D36`                                  | 은은한 리스트 구분선 및 박스 보더                |

### 2.1 접근성 대비(Contrast) 기준

- 본 프로젝트 텍스트 대비 기준은 **WCAG 2.1 AA 이상(일반 텍스트 4.5:1 이상)** 입니다.
- `toss-textSub (#8B95A1)` on `toss-bg (#0B0E14)` 대비비는 **6.36:1**로 AA를 충족합니다.
- `toss-yellow (#F5A623)` on `toss-bg (#0B0E14)` 대비비는 **9.53:1**입니다.
- `toss-green (#1AC97E)` on `toss-bg (#0B0E14)` 대비비는 **8.92:1**입니다.
- `toss-red (#F04452)` on `toss-bg (#0B0E14)` 대비비는 **5.20:1**입니다.
- `toss-blue (#3182F6)` on `toss-textMain (#F2F4F6)` 조합은 **3.37:1**이므로 접근성 기준을 충족하지 않습니다.
- `toss-blue`는 **일반 텍스트 색상으로 사용하지 않습니다.** 링크, 배지 라벨, 본문 강조, 버튼 라벨 모두 기본 텍스트 토큰(`toss-textMain`, `toss-textSub`)을 우선 사용합니다.
- 예외적으로 `toss-blue`는 `toss-bg (#0B0E14)` 단색 배경 위의 비본문 수치/아이콘 포인트, 활성 인디케이터, 보더, 포커스 링에만 사용합니다. `toss-surface` 위 텍스트 색상으로는 금지합니다.
- 메인 CTA 버튼은 `bg-toss-blue text-toss-bg` 조합을 기본으로 사용합니다. 이 조합은 약 **4.70:1** 대비를 확보하므로 버튼 라벨 접근성 기준을 충족합니다.
- 신규 토큰 추가 시 동일 기준으로 대비비를 검증 후 반영합니다.
- Overlay 색상은 `:root { --toss-overlay: 0 0 0; }` 기준으로 관리하며, alpha는 유틸리티 클래스(`bg-toss-overlay/60`)에서 조절합니다.
- Disabled 상태는 두 가지로 구분합니다. `opacity-40`은 클릭 불가 컨테이너, 아이콘, 보조 시각 요소에만 적용합니다. 텍스트를 포함한 Disabled 컴포넌트는 `text-toss-textSub`, `border-toss-divider`, `bg-toss-surface`를 유지해 정보 자체의 가독성을 해치지 않도록 합니다.

### 2.2 대비비 검증 프로세스

1. 토큰 추가/변경 시 디자이너가 후보 색상 쌍(텍스트/배경)을 문서에 기록합니다.
2. 개발 반영 전 WCAG 대비비 계산 도구로 최소 4.5:1(일반 텍스트) 충족 여부를 확인합니다.
3. 검증 결과(대비비 수치, 조합, 검증일)는 `docs/ui/design_system_review.md`를 기준 기록 문서로 사용해 남깁니다. 임시 검수본을 사용할 경우에도 최종 결과는 해당 경로 기준으로 집계합니다.
4. CI 도입 전까지는 PR 체크리스트에 "대비비 검증 완료" 항목을 수동으로 포함합니다.

### 2.3 토큰 구현 기준 (CSS / Tailwind)

```css
:root {
  --toss-overlay: 0 0 0;
}
```

```js
// tailwind.config.js
export default {
  theme: {
    extend: {
      colors: {
        toss: {
          bg: "#0B0E14",
          surface: "#181B23",
          surfaceHover: "#222631",
          selected: "#1E2D4A",
          blue: "#3182F6",
          green: "#1AC97E",
          yellow: "#F5A623",
          red: "#F04452",
          textMain: "#F2F4F6",
          textSub: "#8B95A1",
          divider: "#2A2D36",
          overlay: "rgb(var(--toss-overlay) / <alpha-value>)",
        },
      },
    },
  },
};
```

---

## 3. 타이포그래피 (Typography)

- **기본 폰트**: `Pretendard` (장식이 없고 깔끔하며 숫자 표기에 유리)
- **숫자 강조**: 타이머 등 주요 숫자는 굵은 웨이트(`ExtraBold` 이상)와 큰 사이즈 적용. `font-variant-numeric: tabular-nums` 필수 적용.
- **폰트 로딩 전략**: 기본은 `Pretendard Variable` 자가 호스팅을 권장하며, 초기 렌더 안정성을 위해 `font-display: swap`을 적용합니다. CDN 사용 시에도 한글 서브셋 범위와 캐시 정책을 명시합니다.

| 계층 (Hierarchy)        | Font Size           | Font Weight         | Line Height | Letter Spacing | 용도                                              |
| ----------------------- | ------------------- | ------------------- | ----------- | -------------- | ------------------------------------------------- |
| **Timer Display** | `6rem (96px)`     | `ExtraBold (800)` | `1.0`     | `-0.02em`    | 집중 시간 카운트다운 (`tabular-nums` 적용 필수) |
| **Heading 1**     | `1.5rem (24px)`   | `Bold (700)`      | `1.3`     | `-0.01em`    | 페이지 핵심 제목, 대시보드 타이틀                 |
| **Heading 2**     | `1.125rem (18px)` | `SemiBold (600)`  | `1.3`     | `-0.005em`   | 리스트 타이틀, 섹션 제목                          |
| **Heading 3**     | `1rem (16px)`     | `SemiBold (600)`  | `1.4`     | `0`          | 카드/패널 내 소제목                               |
| **Body Large**    | `1rem (16px)`     | `Medium (500)`    | `1.5`     | `0`          | 리스트 기본 항목, 메인 설명                       |
| **Body Small**    | `0.875rem (14px)` | `Regular (400)`   | `1.5`     | `0`          | 부가 설명, 날짜, 서브 텍스트                      |
| **Caption**       | `0.75rem (12px)`  | `SemiBold (600)`  | `1.4`     | `0.01em`     | 하단 네비게이션 레이블, 칩/배지 텍스트            |

> Caption은 작은 크기에서도 하단 탭과 상태성 배지의 식별력을 유지하기 위해 의도적으로 `SemiBold (600)`를 사용합니다. 일반 설명 텍스트에는 적용하지 않고, 짧고 기능적인 레이블에만 제한합니다.

---

## 4. 간격 시스템 (Spacing Scale)

4px 기반 스케일을 사용하며, 기본은 8px 배수를 우선합니다. `20px`는 카드 내부 밀도 균형을 위한 **예외 토큰**으로 명시합니다.

| 토큰          | 크기 | Tailwind Class        | 주요 용도                        |
| ------------- | ---- | --------------------- | -------------------------------- |
| **xs**  | 4px  | `p-1`, `gap-1`    | 아이콘 - 텍스트 내부 미세 간격   |
| **sm**  | 8px  | `p-2`, `gap-2`    | 인라인 요소 간격, 배지 패딩      |
| **md**  | 16px | `p-4`, `gap-4`    | 리스트 아이템 내부 패딩          |
| **lg**  | 20px | `p-5`, `gap-5`    | 카드 내부 기본 패딩              |
| **xl**  | 24px | `p-6`, `gap-6`    | 섹션 간 구분 여백                |
| **2xl** | 32px | `p-8`, `gap-8`    | 페이지 기본 패딩, 섹션 상하 간격 |
| **3xl** | 48px | `py-12`, `gap-12` | 히어로 섹션 상하 여백            |

---

## 5. 컴포넌트 & 마이크로 인터랙션

### 5.1 컴포넌트 형태 (플랫 & 라운디드)

- **Radius**: 카드/박스 `rounded-2xl (16px)`, 버튼 `rounded-2xl`, 태그/배지 `rounded-full`
- **Radius 정책**: 입력 계열(Input/Textarea/Select)은 가독성과 정보 밀도를 위해 `rounded-xl (12px)`을 기본값으로 사용합니다. 카드/주요 CTA와 의도적으로 차등 적용합니다.
- **Selection Control Radius**: Checkbox/Radio 계열은 명확한 선택 affordance를 위해 `rounded-md (8px)`을 기본값으로 사용합니다.
- **Shadows**: 다크 모드 특성상 그림자 제거. `#0B0E14`와 `#181B23`의 명도 차이로 레이어 뎁스 구분.
- **List & Divider**: `toss-divider` 얇은 선 1px(`border-toss-divider`)로 구분. 카드 감싸기보다 목록 나열을 선호.

### 5.2 상태 정의 (State Feedback)

반드시 아래 상태를 모든 인터랙티브 컴포넌트에 정의해야 합니다.

| 상태                        | Tailwind 표현                                                                                                                                  | 설명                                      |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| **Default**           | `bg-toss-surface`                                                                                                                            | 기본 배경                                 |
| **Hover**             | `hover:bg-toss-surfaceHover transition-colors duration-150`                                                                                  | 마우스 올릴 때 미세하게 밝아짐            |
| **Active / Selected** | `bg-toss-selected border-l-2 border-toss-blue`                                                                                               | 선택된 항목 강조                          |
| **Focus Visible**     | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-toss-blue focus-visible:ring-offset-2 focus-visible:ring-offset-toss-bg` | 키보드 내비게이션 포커스 표시 (a11y 필수) |
| **Disabled**          | `pointer-events-none cursor-not-allowed text-toss-textSub border-toss-divider bg-toss-surface`                                                                 | 비활성 버튼/항목. 텍스트 포함 요소는 opacity 단독 처리 금지 |
| **Loading**           | `animate-pulse` 또는 스피너 SVG 삽입                                                                                                         | 비동기 처리 대기 중                       |
| **Error**             | `border-toss-red text-toss-red focus-visible:ring-toss-red`                                                                                 | 폼 검증 실패 상태. 에러 메시지는 `text-toss-red text-sm` 사용 |

- 참고: `focus-visible:ring-offset-toss-bg`는 토큰이 CSS 변수 기반으로 정의되어야 안정적으로 동작합니다.
- 참고: 장식성 아이콘 전용 버튼, 비활성 카드 등 텍스트 가독성 요구가 없는 경우에만 `opacity-40` 축소 표현을 예외적으로 허용합니다.
- 참고: Solid Primary CTA는 `bg-toss-blue text-toss-bg`를 기본 조합으로 사용하며, `text-tossMain` 버튼 라벨은 금지합니다. 보조 CTA는 `bg-toss-surface text-toss-textMain border border-toss-divider` 조합을 사용합니다.

### 5.3 폼 컴포넌트 기본 스펙

| 컴포넌트                | 높이/크기                   | 배경/보더                                                 | Placeholder                                           | Focus                                   | 비고                                           |
| ----------------------- | --------------------------- | --------------------------------------------------------- | ----------------------------------------------------- | --------------------------------------- | ---------------------------------------------- |
| **Input**         | `h-12`, `px-4`          | `bg-toss-surface border border-toss-divider rounded-xl` | `placeholder:text-[#8B95A1] placeholder:opacity-70` | `focus-visible:ring-2 ring-toss-blue` | 기본 텍스트 입력. 에러 시 `border-toss-red` + 하단 메시지 `text-toss-red text-sm` |
| **Textarea**      | `min-h-28`, `px-4 py-3` | Input과 동일                                              | `placeholder:text-[#8B95A1] placeholder:opacity-70` | Input과 동일                            | 사용자 리사이즈 비활성화(`resize-none`) 기본. 에러 규칙은 Input과 동일 |
| **Select**        | `h-12`, `px-4`          | Input과 동일                                              | 선택 전 라벨 `text-toss-textSub`                    | Input과 동일                            | 아이콘 우측 정렬. 에러 시 trigger 보더와 헬퍼 텍스트 모두 `toss-red` 적용 |
| **Checkbox**      | 컨트롤 `h-5 w-5`, 터치 래퍼 `min-h-[44px] min-w-[44px] px-3 py-2 inline-flex items-center` | `border-toss-divider rounded-md`                        | N/A                                                   | `focus-visible:ring-2 ring-toss-blue` | 체크 시 `bg-toss-blue`. 모바일 접근성 확보를 위해 44x44px 터치 타겟 유지 |
| **Radio**         | 컨트롤 `h-5 w-5`, 터치 래퍼 `min-h-[44px] min-w-[44px] px-3 py-2 inline-flex items-center` | `border-toss-divider rounded-full`                      | N/A                                                   | `focus-visible:ring-2 ring-toss-blue` | 선택점은 `bg-toss-blue`. Checkbox와 동일한 터치 타겟 정책 적용 |
| **Toggle/Switch** | `h-7 w-12`, 래퍼 `min-h-[44px]`                | off:`bg-toss-divider` on:`bg-toss-blue`               | N/A                                                   | `focus-visible:ring-2 ring-toss-blue` | thumb 이동 트랜지션 150ms, `role=\"switch\"` 필수                      |

- 참고: placeholder 기본 기준은 `placeholder:text-[#8B95A1] placeholder:opacity-70`입니다.
- 브라우저 또는 빌드 환경상 opacity 유틸리티 적용이 불안정할 때만 대안으로 `placeholder:text-[#8B95A1B3]`(70% alpha) 표기를 사용합니다. `#8B95A180`은 기준 색상과 불일치하므로 사용하지 않습니다.
- 참고: Input/Textarea/Select의 에러 메시지는 필드 하단 8px 간격으로 배치하고, 아이콘을 사용할 경우 `inline-flex items-center gap-1`로 정렬합니다.

### 5.4 트랜지션 스펙 (Transition Timing)

| 전환 종류                       | Duration  | Easing          | 적용 예시                                       |
| ------------------------------- | --------- | --------------- | ----------------------------------------------- |
| 대시보드 → 집중 모드 (Dimming) | `400ms` | `ease-in-out` | 사이드바 opacity, 메인 컨텐츠 fade              |
| 집중 모드 → 대시보드 (복귀)    | `300ms` | `ease-out`    | Dimming 해제, 요소 재등장                       |
| Hover 상태 변화                 | `150ms` | `ease-in-out` | 버튼, 리스트 아이템 배경                        |
| **모달 등장**             | `200ms` | `ease-out`    | 스케일 + 페이드인 (`scale-95 → scale-100`)   |
| **모달 닫기 (Dismiss)**   | `150ms` | `ease-in`     | 스케일 + 페이드아웃 (`scale-100 → scale-95`) |

---

## 6. 반응형 레이아웃 (Responsive Breakpoints)

PRD 대상 환경: **모바일/데스크탑 웹 (반응형)**

| 브레이크포인트     | Tailwind Prefix    | 기기     | 레이아웃 전략                                                                                  |
| ------------------ | ------------------ | -------- | ---------------------------------------------------------------------------------------------- |
| `< 640px`        | (기본,`sm` 미만) | 모바일   | **단일 컬럼**. 사이드바 숨김→하단 탭 바(Bottom Nav)로 전환. 메인 컨텐츠 전체 폭.        |
| `640px ~ 1023px` | `sm:`, `md:`   | 태블릿   | 사이드바를 좁게(`w-16` 아이콘 전용) 고정. 메인 컨텐츠 단일 컬럼. 상세 편집/확인 모달은 기본적으로 센터 모달을 사용하고, 화면 하단 맥락 작업에 한해 Bottom Sheet를 허용합니다. |
| `>= 1024px`      | `lg:`            | 데스크탑 | **2~3 컬럼**. 좌측 사이드바 전체(`w-64`), 중앙 메인 영역, 집중 모드 시 우측 패널 추가. |

### 모바일 특화 가이드

- **하단 탭 바 (Bottom Navigation)**: 모바일 환경에서 글로벌 네비게이션은 Bottom Bar(`fixed bottom-0`)로 이동
- **타이머 화면**: 모바일에서는 사이드바 없이 전체 화면 집중 타이머만 노출
- **Bottom Sheet 모달**: 모달 다이얼로그는 모바일 환경에서 Bottom Sheet 패턴 사용

### 6.1 접근성 시맨틱 가이드

- 아이콘 전용 버튼은 반드시 `aria-label`을 제공합니다.
- 폼 오류 텍스트가 있을 경우 입력 필드와 `aria-describedby`로 연결합니다.
- Toggle/Switch는 `role="switch"`와 `aria-checked`를 함께 사용합니다.
- 실시간 집중 타이머, 세션 완료 알림 등 상태 변화 텍스트는 `aria-live="polite"` 영역에 제공합니다.
- 체크박스/라디오/토글은 시각 컨트롤과 별도로 라벨 클릭 영역까지 포함한 터치 타겟 44x44px 이상을 유지합니다.

---

## 7. UI 가이드라인 (토스 스타일 핵심 포인트)

1. **여백(Margin/Padding)**: 구역 간의 상하 간격을 넉넉히(24~32px 이상) 주어 시원하고 쾌적한 느낌 부여.
2. **이모지/플랫 아이콘 활용**: 텍스트 설명 옆에 직관적이고 친근한 Material Symbols Rounded 아이콘 적극 활용.
3. **불필요한 선 제거**: 박스를 테두리로 감싸기보다, 배경 컬러 명도 차이로 영역 구분.

### 7.1 z-index 레이어 시스템

| 레이어       | z-index | 용도                  |
| ------------ | ------- | --------------------- |
| `base`     | `0`   | 기본 콘텐츠           |
| `dropdown` | `100` | 드롭다운, 팝오버      |
| `sticky`   | `200` | 상단 고정 바, 하단 탭 |
| `overlay`  | `300` | 모달 뒤 dim 배경      |
| `modal`    | `400` | 모달, 바텀시트        |
| `toast`    | `500` | 토스트, 최상단 알림   |

### 7.2 아이콘 시스템 세부 규칙

- 기본 아이콘 사이즈: `20px`(본문), `24px`(탭/주요 액션)
- `outlined`: 기본/비활성 상태, `filled`: 강조/선택 상태
- 아이콘+텍스트 정렬: `inline-flex items-center gap-1`

### 7.3 스크롤바 스타일 가이드

- WebKit 계열:
  - `::-webkit-scrollbar { width: 10px; }`
  - `::-webkit-scrollbar-track { background: #0B0E14; }`
  - `::-webkit-scrollbar-thumb { background: #2A2D36; border-radius: 9999px; }`
  - `::-webkit-scrollbar-thumb:hover { background: #3A3F4B; }`
- Firefox:
  - `scrollbar-width: thin;`
  - `scrollbar-color: #2A2D36 #0B0E14;`
- 모바일 구간(`<640px`)에서는 OS 기본 스크롤바를 그대로 사용하며, 위 커스텀 스크롤바 스타일을 강제 적용하지 않습니다.
- iOS Safari, Android Chrome에서는 WebKit 스크롤바 커스터마이징이 무시되거나 일관되지 않을 수 있으므로, 모바일 품질 기준은 스크롤바 스타일이 아니라 콘텐츠 여백과 스크롤 힌트 유지 여부로 판단합니다.

---

## 8. FE 핸드오프 체크리스트

- Tailwind 토큰 네임스페이스는 `toss.*` 단일 기준으로 유지한다.
- `:root { --toss-overlay: 0 0 0; }` 선언을 글로벌 스타일에 포함한다.
- `Pretendard Variable` 로딩 방식과 `font-display: swap` 적용 여부를 구현 전에 확정한다.
- 본문 텍스트는 4.5:1 이상 대비를 만족하는 조합만 사용한다.
- `toss-blue`는 일반 텍스트 색상으로 사용하지 않고, CTA 배경/보더/포커스 링/아이콘 포인트에 한정한다.
- Solid Primary CTA는 `bg-toss-blue text-toss-bg` 조합을 사용한다.
- 폼 컴포넌트는 Error, Focus Visible, Disabled 상태를 모두 구현한다.
- placeholder는 `opacity-70` 기준을 우선하고, 대안 표기는 `#8B95A1B3`만 허용한다.
- Checkbox/Radio/Toggle은 44x44px 이상 터치 타겟을 보장한다.
- 아이콘 버튼, 타이머, 스위치에는 ARIA 속성(`aria-label`, `aria-live`, `role="switch"`)을 반영한다.
- 모바일은 Bottom Sheet, 태블릿은 센터 모달 우선 규칙을 따른다.
- 모바일에서는 커스텀 스크롤바를 적용하지 않는다.
- 구현 후 대비비 검증 결과를 리뷰 문서에 기록한다.
