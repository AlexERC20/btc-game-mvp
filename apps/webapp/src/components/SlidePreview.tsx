import React from "react";
import type { Slide } from "../types";

type Props = {
  slide: Slide;
  index: number;
  textPosition: "top"|"bottom";
  username: string;
};

export function SlidePreview({ slide, index, textPosition, username }: Props) {
  return (
    <div className="relative overflow-hidden rounded-2xl">
      {slide.image && (
        <img src={slide.image} className="w-full h-full object-cover" />
      )}
      {slide.body && (
        <div
          className={[
            "absolute left-4 right-4 text-white/95 text-[15px] leading-[1.3] drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]",
            textPosition === "bottom" ? "bottom-16" : "top-6",
          ].join(" ")}
        >
          {slide.body}
        </div>
      )}
      {/* ник — один, снизу слева */}
      <div className="absolute left-3 bottom-3 text-white/90 text-xs">
        @{username.replace(/^@/, "")}
      </div>
      {/* пейджер/стрелка */}
      <div className="absolute right-3 bottom-3 text-white/70 text-xs select-none">
        {index + 1}↗
      </div>
    </div>
  );
}
