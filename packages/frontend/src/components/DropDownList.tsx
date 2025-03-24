'use client';
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Button } from '@heroui/react';
import { User } from 'lucide-react';

export default function DropDownList() {
  return (
    <Dropdown>
      <DropdownTrigger>
        <Button className="font-serif text-xl ">
          <User className="w-6 h-6"></User>
        </Button>
      </DropdownTrigger>
      <DropdownMenu aria-label="Static Actions" className="bg-white shadow-md rounded-lg">
        <DropdownItem key="login" href="/login" className="font-serif ">
          Login
        </DropdownItem>
        <DropdownItem key="signup" href="/signup" className="font-serif ">
          SignUp
        </DropdownItem>
        <DropdownItem key="settings" className="font-serif">
          Settings
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
}
