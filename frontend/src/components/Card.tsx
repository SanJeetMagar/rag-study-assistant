import React from "react";
import { motion } from "motion/react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean;
  glassmorphism?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = "",
  hoverEffect = false,
  glassmorphism = false,
  ...props
}) => {
  const bgClass = glassmorphism
    ? "bg-amber-50/80  backdrop-blur-md"
    : "bg-white ";

  const cardClass = `rounded-xl border border-amber-200/80  ${bgClass} shadow-sm overflow-hidden ${className}`;

  if (hoverEffect) {
    return (
      <motion.div
        whileHover={{ y: -3, transition: { duration: 0.2 } }}
        className={`${cardClass} hover:shadow-md hover:border-amber-300 transition-all`}
        {...(props as any)}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={cardClass} {...props}>
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = "",
  ...props
}) => {
  return (
    <div
      className={`px-6 py-4.5 border-b border-zinc-150  ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardBody: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = "",
  ...props
}) => {
  return (
    <div className={`p-6 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = "",
  ...props
}) => {
  return (
    <div
      className={`px-6 py-4 border-t border-zinc-150  bg-zinc-50/50  ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
