import logoUrl from "@/assets/business-logo.png";
import { cn } from "@/lib/utils";

type BusinessLogoProps = {
  className?: string;
  imageClassName?: string;
};

export function BusinessLogo({ className, imageClassName }: BusinessLogoProps) {
  return (
    <div className={cn("flex items-center justify-center overflow-hidden rounded-xl bg-black shadow-glow", className)}>
      <img
        src={logoUrl}
        alt="Seven Gym logo"
        className={cn("h-full w-full object-contain", imageClassName)}
      />
    </div>
  );
}
