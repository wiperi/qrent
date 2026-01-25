// Assistant 浮窗弹窗 UI：消息列表、输入框、建议卡片与消息操作栏等。
"use client";

import { X } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { FC, ReactNode } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { useFloatingAssistantStore } from "@/lib/floating-assistant-store";
import { cn } from "@/lib/utils";

type AssistantPopupProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
};

const MIN_MARGIN = 12;

export const AssistantPopup: FC<AssistantPopupProps> = ({
  isOpen,
  onClose,
  children,
}) => {
  const position = useFloatingAssistantStore((state) => state.position);
  const setPosition = useFloatingAssistantStore((state) => state.setPosition);

  const contentRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const update = () => setIsMobile(typeof window !== "undefined" && window.innerWidth < 768);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useLayoutEffect(() => {
    if (!isOpen || isMobile || position || typeof window === "undefined") return;
    const width = contentRef.current?.offsetWidth ?? 420;
    const height = contentRef.current?.offsetHeight ?? 640;
    const nextX = Math.max(MIN_MARGIN, window.innerWidth - width - 24);
    const nextY = Math.max(MIN_MARGIN, window.innerHeight - height - 24);
    setPosition({ x: nextX, y: nextY });
  }, [isOpen, isMobile, position, setPosition]);

  const clampPosition = (nextX: number, nextY: number) => {
    if (typeof window === "undefined") return { x: nextX, y: nextY };
    const rect = contentRef.current?.getBoundingClientRect();
    const width = rect?.width ?? 420;
    const height = rect?.height ?? 640;
    const maxX = Math.max(MIN_MARGIN, window.innerWidth - width - MIN_MARGIN);
    const maxY = Math.max(MIN_MARGIN, window.innerHeight - height - MIN_MARGIN);

    return {
      x: Math.min(Math.max(MIN_MARGIN, nextX), maxX),
      y: Math.min(Math.max(MIN_MARGIN, nextY), maxY),
    };
  };

  const handleDragStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isMobile) return;
    event.preventDefault();

    const rect = contentRef.current?.getBoundingClientRect();
    const startLeft =
      position?.x ??
      rect?.left ??
      (typeof window !== "undefined" ? window.innerWidth - 440 : 0);
    const startTop =
      position?.y ??
      rect?.top ??
      (typeof window !== "undefined" ? window.innerHeight - 700 : 0);
    const originX = event.clientX;
    const originY = event.clientY;
    setIsDragging(true);

    const handleMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - originX;
      const deltaY = moveEvent.clientY - originY;
      const next = clampPosition(startLeft + deltaX, startTop + deltaY);
      setPosition(next);
    };

    const handleUp = () => {
      setIsDragging(false);
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp, { once: true });
  };

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          forceMount
          className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm pointer-events-none data-[state=open]:pointer-events-auto data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0"
        />
        <DialogPrimitive.Content forceMount asChild>
          <div
            ref={contentRef}
            className={cn(
              "fixed z-[90] flex h-[80vh] max-h-[720px] w-full max-w-[1100px] flex-col overflow-hidden border border-border bg-background/95 shadow-2xl backdrop-blur pointer-events-none data-[state=open]:pointer-events-auto",
              "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:slide-in-from-bottom-5 data-[state=closed]:slide-out-to-bottom-5",
              "md:h-[640px] md:w-[420px] md:max-w-none md:rounded-2xl",
              "max-md:inset-3 max-md:rounded-2xl",
              !isMobile && !position && "md:bottom-8 md:right-8",
              isDragging && "cursor-grabbing",
              !isDragging && !isMobile && "cursor-default",
            )}
            style={
              !isMobile && position
                ? { left: position.x, top: position.y }
                : undefined
            }
          >
            <DialogPrimitive.Title className="sr-only">
              Qrent Assistant Chat Window
            </DialogPrimitive.Title>
            <div
              className={cn(
                "flex items-center justify-between border-b border-border/80 bg-muted/40 px-4 py-3 text-left",
                !isMobile && "select-none",
                !isMobile && (isDragging ? "cursor-grabbing" : "cursor-grab"),
              )}
              onPointerDown={handleDragStart}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-lg">
                  💬
                </span>
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-semibold text-foreground">
                    Qrent Assistant
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Ask anything about renting
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted"
                aria-label="Close assistant"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col bg-background">
              {children}
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
