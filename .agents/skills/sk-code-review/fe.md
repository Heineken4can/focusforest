# Code Review - Frontend Checkpoints

> 이 파일은 `sk-code-review` 스킬에서 `--target=fe` 또는 FE 파일이 대상일 때 참조합니다.

---

## CR-FE-01: React 정확성

```text
□ 훅 규칙 - 조건문·루프 안에서 훅 호출
□ 의존성 배열 - useEffect/useCallback/useMemo deps 누락 또는 과잉
□ 클린업 누락 - 이벤트 리스너·타이머·구독의 return cleanup 없음
□ 비동기 useEffect - async 함수 직접 전달 (메모리 누수 가능)
□ 상태 업데이트 경쟁 - 언마운트 후 setState 호출
□ key prop - 리스트 렌더에서 index를 key로 사용 (재정렬 버그)
```

## CR-FE-02: 렌더 성능

```text
□ 참조 불안정 객체 - 인라인 객체·함수를 prop으로 전달 (매 렌더 새 참조)
□ useSyncExternalStore - 스냅샷 함수가 매번 새 객체 반환
□ Context 과잉 - 자주 바뀌는 값을 단일 Context로 묶어 전체 하위 트리 리렌더
□ 비용 큰 연산/파생값 - 측정 가능한 재계산 또는 참조 churn이 반복되는지 확인
□ 불필요한 전역 구독 - 컴포넌트 레벨에서 필요 없는 store 필드까지 구독
```

## CR-FE-03: 상태 관리

```text
□ 파생 상태 - 이미 있는 상태로 계산 가능한 값을 별도 state로 저장
□ 동기화 state - 두 state가 항상 같이 바뀌어야 한다면 하나로 통합
□ 전역 vs 로컬 - 한 컴포넌트에서만 쓰는 값이 전역 스토어에 있음
□ 낙관적 업데이트 - 실패 시 롤백 로직 없음
```

## CR-FE-04: 타입 안전성

```text
□ any 사용 - unknown 또는 구체 타입으로 교체 가능한지 확인
□ 타입 단언(as) - 런타임 불일치 가능성이 있는 강제 캐스팅
□ 이벤트 핸들러 타입 - React.ChangeEvent<HTMLInputElement> 등 구체 타입 사용 여부
□ 열거형 완전성 - 유니온 타입의 모든 케이스를 처리하는지
□ Props 타입 - children, className 등 공통 prop의 타입 정의 누락
```

## CR-FE-05: 보안

```text
□ dangerouslySetInnerHTML - 사용자 입력 데이터 직접 삽입 (XSS)
□ href/src에 사용자 입력 - javascript: 프로토콜 주입 가능성
□ 민감 정보 노출 - 토큰·시크릿이 localStorage/sessionStorage 또는 로그에 노출
□ 환경변수 - VITE_* 변수에 서버 시크릿 포함 (빌드 번들에 포함됨)
```

## CR-FE-06: 접근성 (Accessibility)

```text
□ ARIA 레이블 - 아이콘 버튼·이미지에 aria-label 또는 alt 누락
□ 비시맨틱 상호작용 요소 - div/span에 onClick을 붙였다면 role, tabIndex, Enter/Space 대응 필요
□ 포커스 관리 - 모달 열기/닫기 시 포커스 이동 처리 없음
□ 색상 대비 - 텍스트와 배경의 대비율 WCAG AA 기준 미달 (정보 제공)
□ 시맨틱 HTML - div/span으로 버튼·링크 역할을 수행
```

## CR-FE-07: 관례 준수

```text
□ 파일 위치 - 컴포넌트/훅/스토어/유틸 각 디렉터리 규칙 준수
□ 네이밍 - 컴포넌트 PascalCase, 훅 use* 접두사, 유틸 camelCase
□ import 정렬 - react -> 외부 패키지 -> 내부 절대경로(@/) -> 상대경로
□ console.log 잔존 - 디버그 로그 미제거
□ CSS-in-JS vs Tailwind - 프로젝트 방식(Tailwind)과 혼용 여부
```
