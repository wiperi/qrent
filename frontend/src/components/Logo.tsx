import clsx from 'clsx'
import Link from 'next/link'

const Logo = ({ className, props }) => {
  return (
    <Link href={"/"}>
        <h2 className={clsx('text-3xl font-bold text-blue-700 hover:text-blue-900 duration-300', className)}{...props}>
            Qrent
        </h2>
    </Link>
  )
}

export default Logo