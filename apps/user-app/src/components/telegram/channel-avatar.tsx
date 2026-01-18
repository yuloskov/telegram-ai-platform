import * as React from "react";
import { cn } from "~/lib/utils";

interface ChannelAvatarProps {
  title: string;
  size?: "sm" | "default" | "lg";
  className?: string;
}

export function ChannelAvatar({
  title,
  size = "default",
  className,
}: ChannelAvatarProps) {
  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    default: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
  };

  // Generate a consistent color based on the title
  const colors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-amber-500",
    "bg-yellow-500",
    "bg-lime-500",
    "bg-green-500",
    "bg-emerald-500",
    "bg-teal-500",
    "bg-cyan-500",
    "bg-sky-500",
    "bg-blue-500",
    "bg-indigo-500",
    "bg-violet-500",
    "bg-purple-500",
    "bg-fuchsia-500",
    "bg-pink-500",
  ];

  const colorIndex = title
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;

  const initials = title
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full font-medium text-white shrink-0",
        colors[colorIndex],
        sizeClasses[size],
        className
      )}
    >
      {initials}
    </div>
  );
}
