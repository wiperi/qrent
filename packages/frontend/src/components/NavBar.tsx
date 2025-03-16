"use client";
import React from "react";
import Logo from "./Logo";
import DropDownList from "./DropDownList";
import LanguageSwitcher from "./LanguageSwitcher";

const NavBar = () => {
  return (
    <>
      <header>
        <nav>
          <div className="relative z-50 flex h-20 px-10 border border-gray-200 rounded-lg p-4">
            <div className="h-full flex items-center">
              <Logo />
            </div>
            <div className="h-full flex items-center">
              <ul className="hidden md:flex space-x-4 text-lg font-serif font-semibold items-center justify-center">
                <li>
                  <a
                    href="/rentalGuide"
                    className="text-blue-primary hover:text-blue-600"
                  >
                    Rental Guide
                  </a>
                </li>
                <li>
                  <a
                    href="/prepareDocuments"
                    className="text-blue-primary hover:text-blue-600"
                  >
                    Prepare Documents
                  </a>
                </li>
                <li>
                  <a
                    href="/findAHome"
                    className="text-blue-primary hover:text-blue-600"
                  >
                    Efficiency Filter
                  </a>
                </li>
              </ul>
            </div>
            <div className="h-full flex items-center ml-auto">
              <LanguageSwitcher />
              <DropDownList />
            </div>
          </div>
        </nav>
      </header>
    </>
  );
};

export default NavBar;
