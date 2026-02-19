// Assistant 浮窗主组件：管理弹窗状态、消息同步与 UI 渲染。
"use client";

import { useAssistantApi, type AssistantApi } from "@assistant-ui/react";
import { useEffect, useMemo, useState } from "react";

import { useFloatingAssistantStore } from "@/lib/floating-assistant-store";

import { AssistantLauncher } from "./assistant-launcher";
import { AssistantPopup } from "./assistant-popup";
import { FloatingThread } from "./floating-thread";

type ThreadMessages = ReturnType<
  ReturnType<AssistantApi["thread"]>["getState"]
>["messages"];

const useThreadMessages = () => {
  const api = useAssistantApi();
  const getMessages = useMemo(
    () => () => api.thread().getState().messages as ThreadMessages,
    [api],
  );

  const [messages, setMessages] = useState<ThreadMessages>(() => getMessages());

  useEffect(() => {
    const sync = () => {
      const next = getMessages();
      setMessages((prev) => (prev === next ? prev : next));
    };

    sync();
    const unsubscribe = api.subscribe(sync);
    return unsubscribe;
  }, [api, getMessages]);

  return messages;
};

export const FloatingAssistant = () => {
  const messages = useThreadMessages();

  const isOpen = useFloatingAssistantStore((state) => state.isOpen);
  const unreadCount = useFloatingAssistantStore((state) => state.unreadCount);
  const toggle = useFloatingAssistantStore((state) => state.toggle);
  const close = useFloatingAssistantStore((state) => state.close);
  const registerMessage = useFloatingAssistantStore((state) => state.registerMessage);
  const markRead = useFloatingAssistantStore((state) => state.markRead);

  useEffect(() => {
    if (!messages?.length) return;
    const last = messages[messages.length - 1];
    registerMessage(last.id, last.role === "assistant");
  }, [messages, registerMessage]);

  useEffect(() => {
    if (!isOpen || !messages?.length) return;
    const lastId = messages[messages.length - 1]?.id;
    if (lastId) {
      markRead(lastId);
    }
  }, [isOpen, messages, markRead]);

  const handleToggle = () => {
    const lastId = messages?.[messages.length - 1]?.id ?? null;
    toggle(lastId);
  };

  const handleClose = () => {
    close();
  };

  return (
    <>
      <AssistantPopup isOpen={isOpen} onClose={handleClose}>
        <FloatingThread />
      </AssistantPopup>
      <AssistantLauncher
        isOpen={isOpen}
        unreadCount={unreadCount}
        onToggle={handleToggle}
      />
    </>
  );
};
