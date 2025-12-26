import logo from "@/assets/logos/dejapoo.png";
import Image from "next/image";

export function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-12 w-32 sm:h-14 sm:w-40 md:h-16 md:w-48 lg:h-20 lg:w-56">
        <div className="motion-safe:animate-rotate-280-smooth absolute inset-0">
          <Image
            src={logo}
            fill
            className="object-contain transition dark:contrast-200 dark:invert"
            alt="DEJAPOO"
            priority
            quality={100}
          />
        </div>
      </div>
    </div>
  );
}
