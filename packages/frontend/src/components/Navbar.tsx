import { ReactNode } from "react";
import Image from "next/image";
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import ApartmentIcon from '@mui/icons-material/Apartment';
import Link from "next/link";

const Navbar = (): ReactNode => {
  return (
    <>
      <nav className="flex bg-blue-500 p-4 items-center justify-between">
        <Link href="/" className="nav-item">
          <span>Logo</span>
          <Image src="/vercel.svg" alt="Qrent Logo" width={50} height={50} />
        </Link>
        <Link href="/houses" className="nav-item">
          <span>Home</span>
          <ApartmentIcon sx={{ fontSize: 40 }} />
        </Link>
        <a href="#" className="nav-item">
          <span>User</span>
          <AccountCircleIcon sx={{ fontSize: 40 }} />
        </a>
      </nav>
    </>
  );
};

export default Navbar;
