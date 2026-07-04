import logoUrl from "@/assets/business-logo.png";
import { cn } from "@/lib/utils";

type BusinessLogoProps = {
  className?: string;
  imageClassName?: string;
};

export function BusinessLogo({ className, imageClassName }: BusinessLogoProps) {
  return (
    <div className={cn("flex items-center justify-center overflow-hidden rounded-2xl bg-white/20 p-1.5 shadow-glow ring-1 ring-black/5 backdrop-blur-md", className)}>
      <img
        src={logoUrl}
        alt="Seven Up Gym logo"
        className={cn("h-full w-full object-contain", imageClassName)}
      />
    </div>
  );
}
