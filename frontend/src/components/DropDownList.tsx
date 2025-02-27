import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Button,
} from "@heroui/react";
import { Roboto_Flex } from "next/font/google";

const robotoFlexFont = Roboto_Flex({
  subsets: ["latin"],
  weight: "600",
});

export default function DropDownList() {
  return (
    <Dropdown>
      <DropdownTrigger>
        <Button className={robotoFlexFont.className}>USER</Button>
      </DropdownTrigger>
      <DropdownMenu aria-label="Static Actions">
        <DropdownItem key="login">Login</DropdownItem>
        <DropdownItem key="signup">SignUp</DropdownItem>
        <DropdownItem key="language">Language</DropdownItem>
        <DropdownItem key="help">Help</DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
}
