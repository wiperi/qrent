"use client";
import React from "react";
import AnimatedTimelinePage from "./animata/progress/animatedtimeline";

const MainFunction = () => {
  return (
    <div>
      <AnimatedTimelinePage
        containerClassName=""
        // customEventRender={() => {}}
        events={[
          {
            date: "2021-01-01",
            description: "This is the first event",
            id: "1",
            title: "Rental Guide",
          },
          {
            date: "2021-02-01",
            description: "This is the second event",
            id: "2",
            title: "Find a Home",
          },
          {
            date: "2021-03-01",
            description: "This is the third event",
            id: "3",
            title: "Prepare Documents",
          },
        ]}
        initialActiveIndex={-1}
        onEventClick={() => {}}
        onEventHover={() => {}}
        timelineStyles={{
          activeDotColor: "#1E4F9C",
          activeLineColor: "#1E4F9C",
          dateColor: "inherit",
          descriptionColor: "inherit",
          dotColor: "#d1d5db",
          dotSize: "1.5rem",
          lineColor: "#d1d5db",
          titleColor: "inherit",
        }}
        title="Rental Timeline"
      />
    </div>
  );
};

export default MainFunction;
