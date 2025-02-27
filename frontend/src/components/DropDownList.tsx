"use client";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Button,
} from "@heroui/react";

export default function DropDownList() {
  return (
    <Dropdown>
      <DropdownTrigger>
        <Button className="font-serif text-xl ">USER</Button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label="Static Actions"
        className="bg-white shadow-md rounded-lg"
      >
        <DropdownItem key="login" href="/login" className="font-serif ">
          Login
        </DropdownItem>
        <DropdownItem key="signup" href="/signup" className="font-serif ">
          SignUp
        </DropdownItem>
        <DropdownItem key="language" className="font-serif">
          Language
        </DropdownItem>
        <DropdownItem key="help" href="/help" className="font-serif ">
          Help
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
}
