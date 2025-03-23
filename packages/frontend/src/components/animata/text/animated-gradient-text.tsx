import { cn } from "@/src/lib/utils";

export default function AnimatedGradientText({
  className,
  children,
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-size animate-bg-position bg-gradient-to-r from-blue-400 from-30% via-blue-700 via-50% to-blue-primary to-80% bg-[length:200%_auto] bg-clip-text text-transparent",
        className
      )}
    >
      {children}
    </div>
  );
}
