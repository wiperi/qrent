"use client"
import { HTMLAttributes, useEffect, useState } from "react";

import WaveReveal from "@/src/components/animata/text/wave-reveal";
import { cn } from "@/src/libs/utils";

import MockImage1 from './mockImg/kate-darmody-bZ3cOBjfQdE-unsplash.jpg';
import MockImage2 from './mockImg/mykola-kolya-korzh-8jo4TvHtVKM-unsplash.jpg';
import MockImage3 from './mockImg/timothy-buck-psrloDbaZc8-unsplash.jpg';

interface ImageProps extends HTMLAttributes<HTMLDivElement> {
  item: { image: string; title: string };
  index: number;
  activeItem: number;
}

interface ExpandableProps {
  list?: { image: string; title: string }[];
  autoPlay?: boolean;
  className?: string;
}

const List = ({ item, className, index, activeItem, ...props }: ImageProps) => {
  return (
    <div
      className={cn(
        "relative flex h-full w-20 min-w-10 cursor-pointer overflow-hidden rounded-md transition-all delay-0 duration-300 ease-in-out",
        {
          "flex-grow": index === activeItem,
        },
        className,
      )}
      {...props}
    >
      <img
        src={item.image}
        alt={item.title}
        className={cn("h-full w-full object-cover", {
          "blur-[2px]": index !== activeItem,
        })}
      />
      {index === activeItem && (
        <div className="absolute bottom-4 left-4 w-auto text-white md:bottom-8 md:left-8">
          <WaveReveal
            duration="1000ms"
            className="items-start justify-start text-xl sm:text-2xl md:text-4xl"
            text={item.title}
            direction="up"
          />
        </div>
      )}
    </div>
  );
};

const items = [
    {
      image:
        MockImage1.src,
      title: "3455 Jarvis Street",
    },
    {
      image:
        MockImage2.src,
      title: "653 Valley Drive",
    },
    {
      image:
        MockImage3.src,
      title: "182 Poco Mas Drive",
    },
  ];

export default function Expandable({ list = items, autoPlay = true, className }: ExpandableProps) {
  const [activeItem, setActiveItem] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    if (!autoPlay) {
      return;
    }

    const interval = setInterval(() => {
      if (!isHovering) {
        setActiveItem((prev) => (prev + 1) % list.length);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [autoPlay, list.length, isHovering]);

  return (
    <div className={cn("flex flex-wrap h-96 w-auto gap-1 items-stretch", className)}>
      {list.map((item, index) => (
        <List
          key={item.title}
          item={item}
          index={index}
          activeItem={activeItem}
          onMouseEnter={() => {
            setActiveItem(index);
            setIsHovering(true);
          }}
          onMouseLeave={() => {
            setIsHovering(false);
          }}
        />
      ))}
    </div>
  );
}
