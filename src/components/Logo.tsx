import logoAsset from "@/assets/transitops-logo.png.asset.json";

export function Logo({
  className = "",
  size = 32,
  showWordmark = false,
}: {
  className?: string;
  size?: number;
  showWordmark?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <img
        src={logoAsset.url}
        alt="TransitOps logo"
        width={size}
        height={size}
        style={{ width: size, height: size, objectFit: "contain" }}
        className="block"
      />
      {showWordmark && (
        <span className="font-display text-[22px] font-black tracking-tighter">TransitOps</span>
      )}
    </span>
  );
}
