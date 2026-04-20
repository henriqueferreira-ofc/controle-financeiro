import logo from "@/assets/axispay-icon.png";
import { cn } from "@/lib/utils";

type Props = {
  size?: number;
  showWordmark?: boolean;
  className?: string;
  tagline?: string;
};

export function AxispayLogo({ size = 40, showWordmark = true, className, tagline }: Props) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <img
        src={logo}
        alt="AxisPay"
        width={size}
        height={size}
        loading="eager"
        className="rounded-xl shadow-[var(--shadow-glow)]"
        style={{ width: size, height: size }}
      />
      {showWordmark && (
        <div className="flex flex-col leading-tight">
          <span className="text-base font-bold tracking-tight">
            <span className="bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
              Axis
            </span>
            <span className="text-foreground">Pay</span>
          </span>
          {tagline && <span className="text-[11px] text-muted-foreground">{tagline}</span>}
        </div>
      )}
    </div>
  );
}
