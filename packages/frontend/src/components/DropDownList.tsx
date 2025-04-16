'use client';
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Button } from '@heroui/react';
import { User } from 'lucide-react';

import { useTranslations } from '../i18n/use-intl-adapter';

import { useTranslations } from 'use-intl';
import { useUserStore } from '../store/userInfoStore';


export default function DropDownList() {
  const t = useTranslations('DropDownList');
  const { userInfo } = useUserStore();

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button className="font-serif text-xl ">
          {userInfo?.name ? (
            <span>{userInfo.name}</span> // Show the name if logged in
          ) : (
            <User className="w-6 h-6" /> // Default icon if not logged in
          )}
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
