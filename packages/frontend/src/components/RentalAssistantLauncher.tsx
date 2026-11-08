'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, MessageCircle } from 'lucide-react';
import styles from '@/styles/rental-tools.module.css';

const Chat = dynamic(() => import('./RentalAssistant'), {
  ssr: false,
  loading: () => (
    <span className={styles.dialogLoading} role="status">
      小 Q · Little Q
    </span>
  ),
});
const openEvent = 'qrent:little-q:open';
const dialogId = 'qrent-little-q';

function openAssistant() {
  window.dispatchEvent(new Event(openEvent));
}

export function RentalAssistantTrigger({ locale }: { locale: string }) {
  return (
    <button
      type="button"
      className={styles.assistantLink}
      aria-haspopup="dialog"
      aria-controls={dialogId}
      onClick={openAssistant}
    >
      <MessageCircle size={17} aria-hidden="true" />
      {locale === 'zh' ? '问小 Q 助手' : 'Ask Little Q'}
      <ArrowRight size={15} aria-hidden="true" />
    </button>
  );
}

export default function RentalAssistantLauncher({
  locale,
  defaultModelAvailable,
}: {
  locale: 'zh' | 'en';
  defaultModelAvailable: boolean;
}) {
  const pathname = usePathname();
  const home = '/' + locale;
  const available =
    pathname === home || pathname === home + '/search' || pathname === home + '/search/mobile';
  const zh = locale === 'zh';
  const [opened, setOpened] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!available) return;
    function show() {
      const panel = dialog.current;
      if (panel && !panel.open) panel.showModal();
      setOpened(true);
    }
    window.addEventListener(openEvent, show);
    return () => window.removeEventListener(openEvent, show);
  }, [available]);

  if (!available) return null;
  return (
    <>
      <button
        type="button"
        className={styles.floatingLauncher}
        aria-label={zh ? '打开小 Q 助手' : 'Open Little Q'}
        aria-haspopup="dialog"
        aria-controls={dialogId}
        onClick={openAssistant}
      >
        <MessageCircle size={21} aria-hidden="true" />
        {zh ? '小 Q 助手' : 'Little Q'}
      </button>
      <dialog
        id={dialogId}
        ref={dialog}
        aria-label={zh ? '小 Q 助手' : 'Little Q'}
        className={styles.floatingDialog}
      >
        {opened && (
          <Chat
            locale={locale}
            defaultModelAvailable={defaultModelAvailable}
            onClose={() => dialog.current?.close()}
          />
        )}
      </dialog>
    </>
  );
}
