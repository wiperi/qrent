"use client";
import React from "react";
import Container from "./Container";
import Logo from "./Logo";
import Button from "./Button";
import { Roboto_Flex } from "next/font/google";
import User from "@/public/icons/User";
import DropDownList from "./DropDownList";
import Hero from "./Hero";

const robotoFlexFont = Roboto_Flex({
  subsets: ["latin"],
  weight: "400",
});

const Landing = () => {
  return (
    <>
      <header>
        <nav>
          <div className="relative z-50 flex justify-between py-8 p-10">
            <div>
              <Logo />
            </div>
            <div>
              <DropDownList />
            </div>
          </div>
        </nav>
      </header>
    </>
  );
};

export default Landing;
