"use client";

import { useEffect, useState, type PropsWithChildren } from "react";

import { AssistantSidebar } from "@/components/assistant-ui/assistant-sidebar";
import { MyRuntimeProvider } from "@/components/assistant-ui/my-runtime-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

export const MyAssistant = ({ children }: PropsWithChildren) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <MyRuntimeProvider>
      <TooltipProvider delayDuration={200}>
        {isClient ? (
          <div className="flex h-screen w-full bg-background">
            <AssistantSidebar>
              <div className="flex min-h-screen w-full flex-col">{children}</div>
            </AssistantSidebar>
          </div>
        ) : (
          <div className="flex h-screen w-full bg-background">
            <div className="flex h-screen w-full flex-col">{children}</div>
          </div>
        )}
      </TooltipProvider>
    </MyRuntimeProvider>
  );
};
