import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

const GradientButton = React.forwardRef(({ 
  className, 
  variant = "primary", 
  size = "md", 
  children, 
  disabled,
  ...props 
}, ref) => {
  const variants = {
    primary: "bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-600 hover:via-orange-600 hover:to-rose-600 text-white shadow-lg hover:shadow-xl",
    secondary: "bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white shadow-lg hover:shadow-xl",
    success: "bg-gradient-to-r from-emerald-500 to-lime-600 hover:from-emerald-600 hover:to-lime-700 text-white shadow-lg hover:shadow-xl",
    outline: "border-2 border-amber-600 text-amber-700 bg-transparent hover:bg-amber-50 hover:shadow-lg",
    ghost: "text-amber-700 bg-transparent hover:bg-amber-50"
  };

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-sm",
    lg: "px-8 py-4 text-base"
  };

  return (
    <motion.button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-full font-medium transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )}
      whileHover={!disabled ? { scale: 1.05 } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      disabled={disabled}
      {...props}
    >
      {children}
    </motion.button>
  );
});

GradientButton.displayName = "GradientButton";

export { GradientButton };
