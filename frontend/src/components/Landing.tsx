"use client";
import React from "react";
import Container from "./Container";
import Logo from "./Logo";
import Button from "./Button";
import { Roboto_Flex } from "next/font/google";
import User from "@/public/icons/User";
import DropDownList from "./DropDownList";

const robotoFlexFont = Roboto_Flex({
  subsets: ["latin"],
  weight: "400",
});

const Landing = () => {
  return (
    <header>
      <nav>
        <Container className="relative z-50 flex justify-between py-8">
          {/* QRENT LOGO */}
          <div className="relative z-10">
            <Logo />
          </div>
          {/* Buttons */}
          <div className="relative flex items-center gap-6">
            <DropDownList />
          </div>
        </Container>
      </nav>
    </header>
  );
};

export default Landing;
