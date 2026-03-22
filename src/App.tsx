import { useState } from 'react';
import { LeftToolbar } from './components/shell/LeftToolbar';
import { LeftSidebar } from './components/shell/LeftSidebar';
import { MainView } from './components/shell/MainView';
import { RightSidebar } from './components/shell/RightSidebar';
import { BottomPanel } from './components/shell/BottomPanel';
import { StatusBar } from './components/shell/StatusBar';
import { OnboardingWizard } from './components/onboarding/OnboardingWizard';
import { useWebSocket } from './hooks/useWebSocket';
import { useSetting } from './api/settings';

export default function InsomniacApp() {
  useWebSocket();
  const { data: onboardingSetting, isLoading } = useSetting('onboarding_completed');
  const [dismissed, setDismissed] = useState(false);

  const showOnboarding = !isLoading && !dismissed && onboardingSetting?.value !== true;

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
