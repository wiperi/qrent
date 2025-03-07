"use client";
import React from "react";
import Logo from "./Logo";
import { Roboto_Flex } from "next/font/google";
import DropDownList from "./DropDownList";

const robotoFlexFont = Roboto_Flex({
  subsets: ["latin"],
  weight: "400",
});

const Landing = () => {
  return (
    <>
      <header>
        <nav>
          <div className="relative z-50 flex justify-between h-20 px-10">
            <div className="h-full flex items-center">
              <Logo />
            </div>
            <div className="h-full flex items-center">
              <ul className="hidden md:flex space-x-4 text-lg font-serif font-semibold items-center justify-center">
                {/* <li>
                  <a
                    href="filter.html"
                    className="text-blue-primary hover:text-blue-600"
                  >
                    Efficient Filtering
                  </a>
                </li> */}
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
                    Daily Listings
                  </a>
                </li>
              </ul>
            </div>
            <div className="h-full flex items-center">
              <DropDownList />
            </div>
          </div>
        </nav>
      </header>
    </>
  );
};

export default Landing;
