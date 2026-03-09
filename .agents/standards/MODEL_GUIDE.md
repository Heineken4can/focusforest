# 모델별 성능 및 워크플로우 매핑 가이드 (MODEL_GUIDE)

이 문서는 프로젝트의 각 라이프사이클에서 최적의 결과를 얻기 위해 Antigravity 시스템 내 가용한 AI 모델을 선택하고 최신화하는 표준 가이드라인입니다.

---

## 1. 모델 티어 체계 (Model Hierarchy)

업무의 복잡도와 필요한 추론 능력의 깊이에 따라 모델을 3가지 티어로 구분하여 전략적으로 활용합니다.

| 티어 | 모델명 | 주요 성격 | 핵심 활용 |
| :--- | :--- | :--- | :--- |
| **Architect** | **Gemini 3.1 Pro (High)** | 멀티 모달, 대규모 컨텍스트 | 시스템 설계, PRD 분석, 복잡한 정책 수립 |
| **Specialist** | **Claude Opus 4.6 (Thinking)** | 최상위 추론력, 창의성 | 아키텍처 결정, 난제 해결 (Technical Consultant) |
| **Practitioner** | **Gemini 3.1 Pro (Low)** | 고성능 & 고효율 밸런스 | 일반적인 구현, API 개발, 단위 테스트 작성 |
| **Practitioner** | **Claude Sonnet 4.6 (Thinking)** | 논리 정합성, 코드 검수 | 심층 디버깅, 코드 리뷰, 복잡 로직 구현 |
| **Assistant** | **Gemini 3 Flash** | 초고속, 경량화 | 단순 텍스트 수정, 로그 분석, 실시간 피드백 |
| **Base** | **GPT-OSS 120B (Medium)** | 보편적 언어 지능 | 일반 문서 작성, 용어 정리 |

---

## 2. 특정 상황별 딥다이브 (Deep Dive)

### 2.1 Claude Opus 4.6 (Thinking): 최상위 기술 고문
Opus는 가장 깊은 추론력을 가진 모델로, **"한 번의 실수가 치명적인 상황"**에서 사용합니다.
- **Critical Decisions**: 기술적 트레이드오프가 복잡한 대규모 구조 변경 및 인프라 전환.
- **Logic Conflict**: 결제/계약/보안 등 아주 작은 엣지 케이스까지 고려해야 하는 도메인 로직.
- **Master Refactoring**: 원인 불명의 성능 저하 분석 및 거대 레거시 코드 현대화.
- **Creative Concept**: 세계관 기획, 게이미피케이션 메커닉 등 '무(無)에서 유(有)'를 창조하는 단계.

### 2.2 Claude Sonnet 4.6 (Thinking): 정밀 검수자
Sonnet은 'Thinking' 과정을 통해 논리의 허점을 찾아내는 데 최적화되어 있습니다.
- **Code Review**: PRD 요구사항과 실제 물리 코드 간의 정합성 체크.
- **Deep Debugging**: 단순 에러 로그 이상의 논리적 런타임 오류 추적.

---

## 3. 워크플로우 매핑 매트릭스 (Workflow Matrix)

에이전트 명령어(Slash Command) 수행 시 아래 매핑에 따라 모델을 설정하십시오.

| 워크플로우 | 권장 모델 | 이유 및 활용 포인트 |
| :--- | :--- | :--- |
| **기획 (`/po-plan`, `/po-rv`)** | `Gemini 3.1 Pro (High)` | PRD, 정책 문서 등 대규모 컨텍스트를 한 번에 주입하여 전체 정합성 유지 |
| **백엔드 설계 (`/be-plan`)** | `Gemini 3.1 Pro (High)` | DB 스키마, API 명세, 아키텍처 등 전체 시스템 맥락을 파악하고 의존성 분석 |
| **프론트엔드 설계 (`/fe-plan`)** | `Gemini 3.1 Pro (High)` | PRD·디자인 시스템·BE API 명세를 동시에 참조해야 하는 넓은 컨텍스트 설계 |
| **UI/UX 설계 (`/ui-plan`)** | `Gemini 3.1 Pro (High)` 또는 `Claude Opus 4.6 (Thinking)` | 경험 테마·비주얼 레퍼런스 이미지 등 멀티모달 입력 또는 창의적 컨셉이 필요한 경우 Opus 활용 |
| **구현 (`/be-act`, `/fe-act`, `/db-act`)** | `Gemini 3.1 Pro (Low)` | 설계서를 기반으로 반복적인 코드 생성 — 속도·비용 효율 최우선 |
| **UI 구현 (`/ui-act`)** | `Gemini 3.1 Pro (Low)` | 컴포넌트 마크업·CSS 토큰 적용 등 정형화된 에셋 생산 작업에 최적 |
| **검수 (`/be-rv`, `/fe-rv`, `/ui-rv`)** | `Claude Sonnet 4.6 (Thinking)` | 코드 논리 결함, 웹 접근성(a11y), 정책 충돌, 엣지 케이스를 논리적으로 탐색 |
| **QA/테스트 (`/qa`)** | `Claude Sonnet 4.6 (Thinking)` | 시나리오 기반 정밀 테스트 케이스 설계 및 자동화 코드 생성 |
| **빠른 유지보수** | `Gemini 3 Flash` | 오타 수정, API 문서 갱신, 로그 분석 등 지연 없는 경량 반복 작업 |

---

## 4. Antigravity 토큰 및 컨텍스트 최적화 (ATG Advice)

시스템 전문가(`/atg`) 관점에서 제안하는 모델 운영 및 토큰 최적화 방침입니다. 추상적인 원칙을 넘어 실제 Antigravity 명령어를 활용하십시오.

1.  **폭포수(Waterfall) 모델링 및 타겟 컨텍스트 주입**
    - 설계(`High`, `Opus`) 시에는 컨텍스트를 풍부하게 주고, 구현(`Low`, `Flash`) 시에는 필요한 파일만 특정하여 워크스페이스 로드를 줄입니다.
    - **활용 예시 (@ 멘션)**: 
      ```bash
      # 모델: Gemini 3.1 Pro (High) 
      /po-plan, @[.agents/standards/PO_GUIDE.md] 와 @[docs/po/PRD.md] 를 바탕으로 전략을 세워줘.
      ```

2.  **초기화를 통한 컨텍스트 스나이핑 (Context Sniping)**
    - 모델(특히 `Gemini 3 Flash` 등)의 효율을 극대화하려면 이전 대화 내용이 누적되어 토큰을 낭비하는 것을 막아야 합니다.
    - **활용 예시 (명령어)**: 주기적으로 컨텍스트를 비우고 특정 파일만 타겟팅합니다.
      ```text
      /clear
      새로운 모듈 구현을 시작합니다. @[src/api/user.ts] 개발에 집중해줘.
      ```

3.  **검수 필수화 및 핸드오프 (Handoff) 패턴**
    - `Low` 모델이 짠 코드를 `Thinking` 모델(Sonnet)로 검수하는 것이 토큰/성능 대비 가성비가 가장 높습니다.
    - **활용 예시 (Handoff 문서화)**: 에이전트 간 컨텍스트 유실 방지.
      ```bash
      # 모델: Claude Sonnet 4.6 (Thinking)
      /fe-rv, 현재 구현 체스의 엣지 케이스를 검토하고 결과를 @[docs/HANDOFF.md] 파일에 기록 후 인계해줘.
      ```

---

## 5. 문서 유지 관리 (Maintenance)

- **출시 업데이트**: 신규 모델(Sota) 등장 시 성능 벤치마크 및 워크플로우 재배치.
- **프로젝트 피드백**: 특정 도메인(예: 게임, 블록체인 등)에서 두각을 나타내는 모델 정보를 경험치로 누적.
- **환경 변화**: 인프라나 보안 요구사항에 따른 폐쇄형(OSS) vs 개방형 모델 활용 비중 조정.

> [!IMPORTANT]
> **핵심 선택 원칙 (The Golden Rule)**:
> **"설계는 넓고 깊게(Pro High), 구현은 빠르고 신속하게(Pro Low), 검수는 까다롭고 논리적으로(Sonnet Thinking)"**
