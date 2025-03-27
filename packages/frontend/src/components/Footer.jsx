import { useTranslations } from 'next-intl';
import Link from 'next/link';
import React from 'react';

const Footer = () => {
  const t = useTranslations('Footer');
  return (
    <footer className="footer footer-center bg-base-200 text-base-content rounded p-10">
      <nav className="grid grid-flow-col gap-4">
        <Link href="/about" className="link link-hover font-serif">
          {t('about')}
        </Link>
        <Link href="/team" className="link link-hover font-serif">
          {t('meet-our-team')}
        </Link>
        <Link href="/contact" className="link link-hover font-serif">
          {t('get-in-touch')}
        </Link>
      </nav>
      <nav>
        <div className="grid grid-flow-col gap-4">
          <a href="https://github.com/wiperi/qrent">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              className="fill-current"
            >
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.207 11.385.6.113.793-.258.793-.577 0-.285-.01-1.04-.015-2.04-3.338.726-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.729.083-.729 1.205.085 1.84 1.24 1.84 1.24 1.07 1.834 2.809 1.304 3.495.998.107-.776.418-1.304.76-1.604-2.665-.304-5.466-1.332-5.466-5.93 0-1.31.468-2.38 1.235-3.22-.123-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.292-1.552 3.3-1.23 3.3-1.23.653 1.653.241 2.873.118 3.176.768.84 1.235 1.91 1.235 3.22 0 4.61-2.805 5.625-5.475 5.92.43.37.81 1.103.81 2.222 0 1.604-.015 2.896-.015 3.286 0 .322.192.693.798.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12z"></path>
            </svg>
          </a>
          <a href="https://www.xiaohongshu.com/user/profile/609ca560000000000101fd15">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              className="fill-current"
            >
              <path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v2h20v-2c0-3.3-6.7-5-10-5z"></path>
            </svg>
          </a>
          <a href="yyzyfish5@gmail.com">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              className="fill-current"
            >
              <path d="M2 4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h20c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2H2zm0 2h20v.01L12 13 2 6.01V6zm0 12V8.99l10 6.99 10-6.99V18H2z"></path>
            </svg>
          </a>
        </div>
      </nav>
      <aside>
        <p className="font-serif">
          Copyright © {new Date().getFullYear()} - All right reserved by Qrent Industries Ltd
        </p>
      </aside>
      <Link href="https://beian.miit.gov.cn/#/Integrated/index" className="link link-hover">
        网页备案号:粤ICP备2025363367号-1
      </Link>
    </footer>
  );
};

export default Footer;
