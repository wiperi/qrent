import clsx from 'clsx'
import Link from 'next/link'
import { DM_Serif_Text } from 'next/font/google'

const dmSerifTextFont = DM_Serif_Text({
  subsets:['latin'],
  weight: '400'
})

const Logo = ({ className, props }) => {
  return (
    <Link href={"/"}>
        <h2 className={clsx('text-9xl font-bold text-blue-700 hover:text-blue-900 duration-300', dmSerifTextFont.className)}{...props}>
            Qrent
        </h2>
    </Link>
  )
}

export default Logo