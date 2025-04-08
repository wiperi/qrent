// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

'use client';
import Image from 'next/image';
import React, { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import tingBaiImage from '@/public/team/TingBai.jpg';
import yibinZhangImage from '@/public/team/YibinZhang.jpg';
import zhiyangYuImage from '@/public/team/ZhiyangYu.jpg';
import { useOutsideClick } from '../hooks/use-outside-click';
import { useTranslations } from 'next-intl';

export function ExpandableCardDemo() {
  const t = useTranslations('Team');
  const cards = [
    {
      description: 'Founder',
      title: 'Zhiyang Yu',
      src: zhiyangYuImage.src,
      ctaText: 'Visit',
      ctaLink: 'https://www.linkedin.com/in/%E5%BF%97%E6%B4%8B-%E4%BF%9E-558742234/',
      content: () => {
        return <p>{t('zyy-des')}</p>;
      },
    },
    {
      description: 'Frontend Developer',
      title: 'Ting Bai',
      src: tingBaiImage.src,
      ctaText: 'Visit',
      ctaLink: 'https://tingbai1028.github.io/tingbaiwebsite/',
      content: () => {
        return <p>{t('tb-des')}</p>;
      },
    },

    {
      description: 'Backend Developer  ',
      title: 'Tianyang Chen',
      src: tingBaiImage.src,
      ctaText: 'Visit',
      ctaLink: 'https://ui.aceternity.com/templates',
      content: () => {
        return <p>{t('tc-des')} </p>;
      },
    },
    {
      description: 'Backend Developer',
      title: 'Yibin Zhang',
      src: yibinZhangImage.src,
      ctaText: 'Visit',
      ctaLink: 'https://github.com/zach-moon',
      content: () => {
        return <p>{t('ybz-des')}</p>;
      },
    },
  ];

  const [active, setActive] = useState<(typeof cards)[number] | boolean | null>(null);
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setActive(false);
      }
    }

    if (active && typeof active === 'object') {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active]);

  useOutsideClick(ref, () => setActive(null));

  return (
    <>
      <AnimatePresence>
        {active && typeof active === 'object' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 h-full w-full z-10"
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {active && typeof active === 'object' ? (
          <div className="fixed inset-0 grid place-items-center z-[100]">
            <motion.button
              key={`button-${active.title}-${id}`}
              layout
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              exit={{
                opacity: 0,
                transition: {
                  duration: 0.05,
                },
              }}
              className="flex absolute top-4 right-4 items-center justify-center bg-white rounded-full h-8 w-8 shadow-md"
              onClick={() => setActive(null)}
            >
              <CloseIcon />
            </motion.button>
            <motion.div
              layoutId={`card-${active.title}-${id}`}
              ref={ref}
              className="w-full max-w-[500px] h-full md:h-fit md:max-h-[90%] flex flex-col bg-white dark:bg-neutral-900 sm:rounded-3xl overflow-hidden shadow-xl"
            >
              <motion.div layoutId={`image-${active.title}-${id}`} className="overflow-hidden">
                <Image
                  priority
                  width={500}
                  height={500}
                  src={active.src}
                  alt={active.title}
                  className="w-full h-80 object-contain"
                />
              </motion.div>

              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <motion.h3
                      layoutId={`title-${active.title}-${id}`}
                      className="font-semibold text-neutral-800 dark:text-neutral-200 text-xl"
                    >
                      {active.title}
                    </motion.h3>
                    <motion.p
                      layoutId={`description-${active.description}-${id}`}
                      className="text-neutral-600 dark:text-neutral-400 text-lg"
                    >
                      {active.description}
                    </motion.p>
                  </div>

                  <motion.a
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    href={active.ctaLink}
                    target="_blank"
                    className="px-5 py-2 text-sm rounded-full font-bold bg-blue-primary text-white hover:bg-blue-600 transition-colors"
                  >
                    {active.ctaText}
                  </motion.a>
                </div>
                <div className="relative">
                  <motion.div
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-neutral-600 text-sm lg:text-base max-h-[200px] flex flex-col items-start gap-4 overflow-auto dark:text-neutral-400 [scrollbar-width:thin]"
                  >
                    {typeof active.content === 'function' ? active.content() : active.content}
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
      <ul className="max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 items-start gap-8 px-4">
        {cards.map(card => (
          <motion.div
            layoutId={`card-${card.title}-${id}`}
            key={card.title}
            onClick={() => setActive(card)}
            className="flex flex-col hover:shadow-lg transition-shadow duration-300 rounded-xl cursor-pointer overflow-hidden bg-white"
          >
            <div className="flex flex-col w-full">
              <motion.div layoutId={`image-${card.title}-${id}`} className="overflow-hidden">
                <Image
                  width={300}
                  height={300}
                  src={card.src}
                  alt={card.title}
                  className="w-full h-60 object-contain transition-transform duration-300 hover:scale-105"
                />
              </motion.div>
              <div className="flex flex-col items-center p-4">
                <motion.h3
                  layoutId={`title-${card.title}-${id}`}
                  className="font-semibold text-neutral-800 dark:text-neutral-200 text-center text-lg"
                >
                  {card.title}
                </motion.h3>
                <motion.p
                  layoutId={`description-${card.description}-${id}`}
                  className="text-neutral-600 dark:text-neutral-400 text-center text-base"
                >
                  {card.description}
                </motion.p>
              </div>
            </div>
          </motion.div>
        ))}
      </ul>
    </>
  );
}

export const CloseIcon = () => {
  return (
    <motion.svg
      initial={{
        opacity: 0,
      }}
      animate={{
        opacity: 1,
      }}
      exit={{
        opacity: 0,
        transition: {
          duration: 0.05,
        },
      }}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5 text-black"
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M18 6l-12 12" />
      <path d="M6 6l12 12" />
    </motion.svg>
  );
};
