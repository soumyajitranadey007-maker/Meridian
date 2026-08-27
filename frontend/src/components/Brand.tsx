import { Compass } from "lucide-react";
import { Link } from "react-router-dom";

export function Brand({ compact = false }: { compact?: boolean }) {
  return <Link to="/" aria-label="Meridian home" className="flex items-center gap-2.5 text-cream"><span className="grid h-9 w-9 place-items-center rounded-xl bg-mint text-ink shadow-mint"><Compass size={20} strokeWidth={2.5} /></span>{!compact && <span className="text-[15px] font-extrabold tracking-[.16em]">MERIDIAN</span>}</Link>;
}
