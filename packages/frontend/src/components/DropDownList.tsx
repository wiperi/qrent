'use client';
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Button } from '@heroui/react';
import { User } from 'lucide-react';
import { useTranslations } from 'use-intl';

export default function DropDownList() {
  const t = useTranslations('DropDownList');
  return (
    <Dropdown>
      <DropdownTrigger>
        <Button className="font-serif text-xl ">
          <User className="w-6 h-6"></User>
        </Button>
      </DropdownTrigger>
      <DropdownMenu aria-label="Static Actions" className="bg-white shadow-md rounded-lg">
        <DropdownItem key="login" href="/login" className="font-sans ">
          {t('login')}
        </DropdownItem>
        <DropdownItem key="signup" href="/signup" className="font-sans ">
          {t('signup')}
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
}
