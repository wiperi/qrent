import clsx from "clsx";
import Link from "next/link";
import { DM_Serif_Text } from "next/font/google";
import Image from "next/image";
import logo from "../../public/QrentLogo.jpg";

const dmSerifTextFont = DM_Serif_Text({
  subsets: ["latin"],
  weight: "400",
});

const Logo = () => {
  return (
    <Link href={"/"}>
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
