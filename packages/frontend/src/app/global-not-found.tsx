export const metadata = { title: 'Page not found / 找不到页面 | QRent', robots: { index: false } };
import Link from 'next/link';

export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: 'system-ui, sans-serif',
          maxWidth: 760,
          padding: '48px 24px',
          margin: '0 auto',
        }}
      >
        <h1>Page not found / 找不到页面</h1>
        <p>This page is unavailable. Continue with QRent rentals or guides.</p>
        <p>这个页面不存在，或尚未发布对应语言的版本。你可以继续浏览房源或租房指南。</p>
        <nav aria-label="Recovery links">
          <ul>
            <li>
              <Link href="/en">QRent home</Link> · <Link href="/zh">中文首页</Link>
            </li>
            <li>
              <Link href="/en/rentals">University rentals</Link> ·{' '}
              <Link href="/zh/rentals">学校租房目录</Link>
            </li>
            <li>
              <Link href="/en/blog">Rental guides</Link> · <Link href="/zh/blog">租房指南</Link>
            </li>
          </ul>
        </nav>
      </body>
    </html>
  );
}
