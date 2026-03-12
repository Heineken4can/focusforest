import { PageSection } from '@/components/layout/PageSection';
import { ErrorState } from '@/components/states/ErrorState';
import { settingsSections, themeOptions } from '@/features/settings/settings.placeholder';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useThemeMode } from '@/hooks/useThemeMode';

export function SettingsPage() {
  const { themeMode, resolvedTheme, setThemeMode } = useThemeMode();

  useDocumentTitle('Settings');

  return (
    <div className="space-y-6">
      <PageSection
        eyebrow="SCR-10"
        title="프로필 및 환경설정 placeholder"
        description="테마, 타임존, 동기화 영역만 먼저 고정했습니다. 서버 저장은 아직 연결하지 않았습니다."
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <article className="surface-panel space-y-4">
            <div>
              <p className="text-sm text-toss-textSub">현재 테마 해석</p>
              <h3 className="mt-2 text-xl font-semibold text-toss-textMain">
                {resolvedTheme === 'dark' ? 'Dark' : 'Light'}
              </h3>
              <p className="mt-2 text-sm text-toss-textSub">
                선택값은 <code>focus-forest.theme-mode</code> 로컬 키에 저장됩니다.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {themeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={themeMode === option.value}
                  className={themeMode === option.value ? 'button-primary' : 'button-secondary'}
                  onClick={() => setThemeMode(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </article>

          <article className="surface-panel">
            <p className="text-sm text-toss-textSub">프로필 요약</p>
            <dl className="mt-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-sm text-toss-textSub">연결 상태</dt>
                <dd className="text-sm font-semibold text-toss-textMain">LOCAL-FIRST</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-sm text-toss-textSub">누적 SP</dt>
                <dd className="text-sm font-semibold text-toss-textMain">0</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-sm text-toss-textSub">현재 레벨</dt>
                <dd className="text-sm font-semibold text-toss-textMain">LV.1</dd>
              </div>
            </dl>
          </article>
        </div>
      </PageSection>

      <PageSection
        eyebrow="Settings Sections"
        title="설정 그룹 골격"
        description="타임존, 자동 동기화, 수동 동기화, 로그아웃 영역을 리스트형으로 분리합니다."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {settingsSections.map((section) => (
            <article key={section.title} className="surface-panel-hover">
              <h3 className="text-lg font-semibold">{section.title}</h3>
              <p className="mt-2 text-sm text-toss-textSub">{section.description}</p>
            </article>
          ))}
        </div>
      </PageSection>

      <ErrorState
        title="동기화 충돌 / 네트워크 오류 placeholder"
        description="실제 sync state 연결 전까지 inline alert 배치와 CTA 우선순위만 유지합니다."
        actionLabel="수동 동기화"
      />
    </div>
  );
}
