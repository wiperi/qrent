"use client";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import type { FC, PropsWithChildren } from "react";

import { Thread } from "@/components/assistant-ui/thread";

export const AssistantSidebar: FC<PropsWithChildren> = ({ children }) => {
  return (
    <ResizablePanelGroup orientation="horizontal" className="h-screen">
      <ResizablePanel defaultSize={68} minSize={50} className="h-screen overflow-hidden">
        <div className="flex h-full flex-col overflow-auto">{children}</div>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={32} minSize={24} className="h-screen overflow-hidden">
        <div className="flex h-full flex-col overflow-hidden">
          <Thread />
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};
