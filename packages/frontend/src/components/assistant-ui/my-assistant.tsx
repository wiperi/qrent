// Client-only wrapper that wires assistant runtime/providers and mounts the floating assistant UI.
"use client";

import dynamic from "next/dynamic";
import type { PropsWithChildren } from "react";

import { MyRuntimeProvider } from "@/components/assistant-ui/my-runtime-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

const FloatingAssistant = dynamic(
  () =>
    import("@/components/floating-assistant").then(
      (mod) => mod.FloatingAssistant,
    ),
  { ssr: false },
);

export const MyAssistant = ({ children }: PropsWithChildren) => {
  return (
    <MyRuntimeProvider>
      <TooltipProvider delayDuration={200}>
        <div className="flex min-h-screen w-full flex-col bg-background">
          {children}
        </div>
        <FloatingAssistant />
      </TooltipProvider>
    </MyRuntimeProvider>
  );
};
