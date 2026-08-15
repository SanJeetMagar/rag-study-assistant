import React from "react";
import { motion } from "motion/react";

interface TabOption {
  key: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabsProps {
  options: TabOption[];
  activeKey: string;
  onChange: (key: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  options,
  activeKey,
  onChange,
  className = ""
}) => {
  return (
    <div className={`p-1 bg-amber-100  rounded-lg flex ${className}`}>
      {options.map((option) => {
        const isActive = option.key === activeKey;
        return (
          <button
            key={option.key}
            onClick={() => onChange(option.key)}
            className="relative flex-1 py-2 text-base font-medium flex items-center justify-center gap-2 rounded-md transition-colors outline-none cursor-pointer"
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            {isActive && (
              <motion.div
                layoutId="activeTabBackground"
                className="absolute inset-0 bg-amber-50  rounded-md shadow-sm border border-amber-200/50 "
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <span
              className={`relative z-10 flex items-center gap-1.5 transition-colors ${
                isActive
                  ? "text-amber-950 "
                  : "text-zinc-500  hover:text-zinc-700"
              }`}
            >
              {option.icon && <span className="text-current">{option.icon}</span>}
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};
