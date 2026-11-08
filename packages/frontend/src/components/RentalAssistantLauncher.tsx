'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, MessageCircle } from 'lucide-react';
import { useRentalSession } from '@/lib/rental-assistant/session';
import styles from '@/styles/rental-tools.module.css';

const Chat = dynamic(() => import('./RentalAssistant'), {
  ssr: false,
  loading: () => (
    <span className={styles.dialogLoading} role="status">
      小 Q · AI 找房
    </span>
  ),
});
const dialogId = 'qrent-little-q';

function useAssistantReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return ready;
}

function openAssistant() {
  const panel = document.getElementById(dialogId);
  if (!(panel instanceof HTMLDialogElement) || panel.open) return;
  useRentalSession.getState().visitPanel();
  panel.showModal();
}

export function RentalAssistantTrigger({ locale }: { locale: string }) {
  const ready = useAssistantReady();
  return (
    <button
      type="button"
      className={styles.assistantLink}
      aria-haspopup="dialog"
      aria-controls={dialogId}
      disabled={!ready}
      onClick={openAssistant}
    >
      <MessageCircle size={17} aria-hidden="true" />
      {locale === 'zh' ? '问小 Q' : 'Ask Little Q'}
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
  const opened = useRentalSession(state => state.panelVisited);
  const ready = useAssistantReady();
  const dialog = useRef<HTMLDialogElement>(null);

  if (!available) return null;
  return (
    <>
      <button
        type="button"
        className={styles.floatingLauncher}
        aria-label={zh ? '打开小 Q · AI 找房' : 'Open Little Q'}
        aria-haspopup="dialog"
        aria-controls={dialogId}
        disabled={!ready}
        onClick={openAssistant}
      >
        <MessageCircle size={21} aria-hidden="true" />
        {zh ? '小 Q · AI 找房' : 'Little Q · AI Rentals'}
      </button>
      <dialog
        id={dialogId}
        ref={dialog}
        aria-label={zh ? '小 Q · AI 找房' : 'Little Q · AI Rentals'}
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
