"use client";

import { Check } from "lucide-react";
import type * as React from "react";
import { cn } from "@/lib/utils";

function Checkbox({
  className,
  checked = false,
  onCheckedChange,
  disabled = false,
  ...props
}: {
  checked?: boolean;
  onCheckedChange?: (checked: boolean, event?: React.MouseEvent) => void;
  disabled?: boolean;
  className?: string;
} & Omit<React.ComponentProps<"button">, "onClick" | "type">) {
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (!disabled && onCheckedChange) {
      onCheckedChange(!checked, event);
    }
  };

  return (
    <button
      type="button"
      // role="checkbox"
      // aria-checked={checked}
      disabled={disabled}
      onClick={handleClick}
      data-slot="checkbox"
      className={cn(
        "h-4 w-4 shrink-0 rounded-sm border border-input bg-background shadow-xs transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-primary-foreground",
        checked && "bg-primary border-primary text-primary-foreground",
        className
      )}
      data-state={checked ? "checked" : "unchecked"}
      {...props}
    >
      {checked && <Check className="h-4 w-4" />}
    </button>
  );
}

export { Checkbox };
