import { useEffect, useState } from "react";
import { slides } from "../data/slides";
import { getNextIndex, getPrevIndex } from "../lib/rooms";
import { ChevronLeftIcon, ChevronRightIcon } from "./Icon";

const AUTOPLAY_MS = 5000;

export default function Slider() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = slides.length;
  const slide = slides[index];

  useEffect(() => {
    if (paused || total < 2) return;
    const t = setTimeout(() => setIndex((i) => getNextIndex(i, total)), AUTOPLAY_MS);
    return () => clearTimeout(t);
  }, [index, paused, total]);

  return (
    <div
      className="slider"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="slide-img-wrap">
        <img src={slide.image} alt={slide.alt} />
        <button
          type="button"
          className="slide-arrow left"
          aria-label="Slide trước"
          onClick={() => setIndex((i) => getPrevIndex(i, total))}
        >
          <ChevronLeftIcon />
        </button>
        <button
          type="button"
          className="slide-arrow right"
          aria-label="Slide tiếp"
          onClick={() => setIndex((i) => getNextIndex(i, total))}
        >
          <ChevronRightIcon />
        </button>
      </div>
      <div className="slide-caption">
        <div className="slide-caption-top">
          <strong>{slide.title}</strong>
          <span className="slide-badge">{slide.badge}</span>
        </div>
        <p>{slide.desc}</p>
      </div>
      <div className="slide-dots">
        {slides.map((s, i) => (
          <button
            key={s.title}
            type="button"
            aria-label={`Slide ${i + 1}`}
            className={i === index ? "dot active" : "dot"}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </div>
  );
}
