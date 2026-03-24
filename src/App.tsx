import { useEffect, useRef } from 'react';
import {
  Group,
  Panel,
  type PanelImperativeHandle,
} from 'react-resizable-panels';
import { BottomPanel } from './components/shell/BottomPanel';
import { LeftSidebar } from './components/shell/LeftSidebar';
import { LeftToolbar } from './components/shell/LeftToolbar';
import { MainView } from './components/shell/MainView';
import { ResizeHandle } from './components/shell/ResizeHandle';
import { RightSidebar } from './components/shell/RightSidebar';
import { StatusBar } from './components/shell/StatusBar';
import { useWebSocket } from './hooks/useWebSocket';
import { useLayoutStore } from './stores/layout';

export default function InsomniacApp() {
  useWebSocket();

  const leftCollapsed = useLayoutStore((s) => s.collapsedPanels.leftSidebar);
  const rightCollapsed = useLayoutStore((s) => s.collapsedPanels.rightSidebar);
  const bottomCollapsed = useLayoutStore((s) => s.collapsedPanels.bottomPanel);

  const leftRef = useRef<PanelImperativeHandle>(null);
  const rightRef = useRef<PanelImperativeHandle>(null);
  const bottomRef = useRef<PanelImperativeHandle>(null);

  // Sync store collapse state → imperative panel API
  useEffect(() => {
    if (leftCollapsed) leftRef.current?.collapse();
    else leftRef.current?.expand();
  }, [leftCollapsed]);

  useEffect(() => {
    if (rightCollapsed) rightRef.current?.collapse();
    else rightRef.current?.expand();
  }, [rightCollapsed]);

  useEffect(() => {
    if (bottomCollapsed) bottomRef.current?.collapse();
    else bottomRef.current?.expand();
  }, [bottomCollapsed]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg-default text-text-default font-sans">
      {/* LEFT TOOLBAR — fixed, never resizable */}
      <LeftToolbar />

      {/* Main area: horizontal panels + status bar at bottom */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Group id="main-h" orientation="horizontal" className="flex-1 min-h-0">
          {/* LEFT SIDEBAR */}
          <Panel
            id="left-sidebar"
            panelRef={leftRef}
            defaultSize="15%"
            minSize="120px"
            maxSize="30%"
            collapsible
            collapsedSize="0px"
          >
            <LeftSidebar />
          </Panel>

          <ResizeHandle />

          {/* CENTER: main + right (horizontal) over bottom (vertical) */}
          <Panel id="center" minSize="30%">
            <Group id="main-v" orientation="vertical" className="h-full">
              {/* TOP: main view + right sidebar */}
              <Panel id="main-area" minSize="20%">
                <Group
                  id="main-mr"
                  orientation="horizontal"
                  className="h-full"
                >
                  <Panel id="main-view" minSize="30%">
                    <MainView />
                  </Panel>

                  <ResizeHandle />

                  <Panel
                    id="right-sidebar"
                    panelRef={rightRef}
                    defaultSize="20%"
                    minSize="120px"
                    maxSize="35%"
                    collapsible
                    collapsedSize="0px"
                  >
                    <RightSidebar />
                  </Panel>
                </Group>
              </Panel>

              <ResizeHandle direction="vertical" />

              {/* BOTTOM PANEL */}
              <Panel
                id="bottom-panel"
                panelRef={bottomRef}
                defaultSize="25%"
                minSize="36px"
                maxSize="60%"
                collapsible
                collapsedSize="36px"
              >
                <BottomPanel />
              </Panel>
            </Group>
          </Panel>
        </Group>

        {/* STATUS BAR — fixed at the very bottom */}
        <StatusBar />
      </div>
    </div>
  );
}
