"use client";

import { AnimatePresence, m } from "framer-motion";
import { Search } from "lucide-react";
import {
  forwardRef,
  type KeyboardEvent,
  useEffect,
  useImperativeHandle,
  useRef,
  useState
} from "react";
import { useCanHover } from "@/hooks/useCanHover";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  focusTrigger: number;
};

export type SearchBarRef = {
  focus: () => void;
};

export const SearchBar = forwardRef<SearchBarRef, SearchBarProps>(function SearchBar(
  { value, onChange, onSubmit, focusTrigger },
  ref
) {
  const [expanded, setExpanded] = useState(false);
  const [expandedWidth, setExpandedWidth] = useState(320);
  const inputRef = useRef<HTMLInputElement>(null);
  const canHover = useCanHover();

  useEffect(() => {
    const updateWidth = () => {
      if (typeof window === "undefined") {
        return;
      }

      const mobileWidth = Math.max(220, window.innerWidth - 32);
      setExpandedWidth(window.innerWidth < 640 ? mobileWidth : 320);
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  useImperativeHandle(ref, () => ({
    focus: () => {
      setExpanded(true);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }));

  useEffect(() => {
    if (focusTrigger === 0) {
      return;
    }
    setExpanded(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [focusTrigger]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      onSubmit(value.trim());
    }
    if (event.key === "Escape" && value.trim() === "") {
      setExpanded(false);
    }
  };

  return (
    <m.div
      animate={{ width: expanded ? expandedWidth : 52 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="flex h-12 items-center overflow-hidden rounded-full border border-white/15 bg-white/10 px-1.5 backdrop-blur-xl"
    >
      <m.button
        type="button"
        whileHover={canHover ? { scale: 1.03 } : undefined}
        whileTap={{ scale: 0.97 }}
        onClick={() => {
          setExpanded(true);
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
        className="hover-lift inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white"
        aria-label="Open search"
      >
        <Search className="h-4 w-4" />
      </m.button>
      <AnimatePresence>
        {expanded && (
          <m.div
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            className="ml-2 w-full"
          >
            <input
              ref={inputRef}
              value={value}
              onChange={(event) => onChange(event.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                if (value.trim() === "") {
                  setExpanded(false);
                }
              }}
              placeholder="Search city..."
              className="w-full bg-transparent text-sm text-white placeholder:text-white/55 focus:outline-none"
            />
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  );
});
