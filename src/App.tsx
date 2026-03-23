import { useState } from 'react';
import { useSetting } from './api/settings';
import { OnboardingWizard } from './components/onboarding/OnboardingWizard';
import { BottomPanel } from './components/shell/BottomPanel';
import { LeftSidebar } from './components/shell/LeftSidebar';
import { LeftToolbar } from './components/shell/LeftToolbar';
import { MainView } from './components/shell/MainView';
import { RightSidebar } from './components/shell/RightSidebar';
import { StatusBar } from './components/shell/StatusBar';
import { useWebSocket } from './hooks/useWebSocket';

export default function InsomniacApp() {
  useWebSocket();
  const { data: onboardingSetting, isLoading } = useSetting(
    'onboarding_completed',
  );
  const [dismissed, setDismissed] = useState(false);

  const showOnboarding =
    !isLoading && !dismissed && onboardingSetting?.value !== true;

  if (showOnboarding) {
    return <OnboardingWizard onComplete={() => setDismissed(true)} />;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg-default text-text-default font-sans">
      {/* LEFT TOOLBAR */}
      <LeftToolbar />

      {/* LEFT SIDEBAR */}
      <LeftSidebar />

      {/* MAIN VIEW */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 flex overflow-hidden">
          {/* Main content area */}
          <MainView />

          {/* RIGHT SIDEBAR */}
          <RightSidebar />
        </div>

        {/* BOTTOM PANEL */}
        <BottomPanel />

        {/* STATUS BAR */}
        <StatusBar />
      </main>
    </div>
  );
}
