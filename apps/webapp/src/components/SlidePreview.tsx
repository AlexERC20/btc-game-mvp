import React from "react";

type Props = {
  slide: { body?: string; image?: string };
  index: number;
  textPosition: "top" | "bottom";
  username: string;
};

export function SlidePreview({ slide, index, textPosition, username }: Props) {
  return (
    <div className="relative">
      {slide.image && <img src={slide.image} className="w-full h-full object-cover" />}
      {/* Текст карточки — ТОЛЬКО slide.body */}
      {slide.body && (
        <div
          className={`absolute left-4 right-4 ${
            textPosition === "bottom" ? "bottom-16" : "top-6"
          } text-white/95 text-[15px] leading-[1.3]`}
        >
          {slide.body}
        </div>
      )}
      {/* Ник — один, снизу слева */}
      <div className="absolute left-3 bottom-3 text-white/90 text-xs">
        @{username.replace(/^@/, "")}
      </div>
      {/* Пейджер/стрелка */}
      <div className="absolute right-3 bottom-3 text-white/70 text-xs select-none">
        {index + 1}→
      </div>
    </div>
  );
}
