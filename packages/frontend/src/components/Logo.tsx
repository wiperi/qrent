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
      {/* <h2
        className={clsx(
          "text-5xl font-bold text-blue-primary hover:text-blue-950 duration-300",
          dmSerifTextFont.className
        )}
      >
        Qrent
      </h2> */}
      <Image
        src={logo.src}
        alt="Qrent Logo"
        width={150}
        height={50}
        className="hover:opacity-80 duration-300"
      />
    </Link>
  );
};

export default Logo;
