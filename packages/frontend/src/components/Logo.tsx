import Link from 'next/link';
import Image from 'next/image';
import logo from '../../public/QrentLogo.jpg';

const Logo = () => {
  return (
    <Link href={'/'}>
      <Image
        src={logo.src}
        alt="Qrent Logo"
        width={100}
        height={100}
        className="hover:opacity-80 duration-300"
      />
    </Link>
  );
};

export default Logo;
