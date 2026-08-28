import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number | string; strokeWidth?: number | string };
function icon(mark: string) {
  return function MeridianIcon({ size = 18, strokeWidth = 2, className, ...props }: IconProps) {
    return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" {...props}><circle cx="12" cy="12" r="9" opacity=".32" /><path d={mark} /></svg>;
  };
}

export const Compass = icon("m15.5 8.5-2 5-5 2 2-5 5-2Z");
export const AlertTriangle = icon("m12 5 7 13H5L12 5Zm0 5v3m0 2h.01");
export const Check = icon("m7 12 3 3 7-7");
export const CircleDot = icon("M12 12h.01");
export const Sparkles = icon("m12 4 1.2 4.8L18 10l-4.8 1.2L12 16l-1.2-4.8L6 10l4.8-1.2L12 4Zm6 10 .5 2 .5-2 2-.5-2-.5-.5-2-.5 2-2 .5 2 .5Z");
export const Archive = icon("M5 7h14v11H5zM4 4h16v3H4zM9 12h6");
export const ChevronLeft = icon("m14 7-5 5 5 5"); export const ChevronRight = icon("m10 7 5 5-5 5");
export const CircleHelp = icon("M9.5 9.5a2.7 2.7 0 1 1 4.2 2.2c-1 .7-1.7 1.2-1.7 2.3M12 17h.01");
export const FileText = icon("M7 3h7l4 4v14H7zM14 3v5h4M10 12h5m-5 3h5");
export const LayoutDashboard = icon("M4 4h7v7H4zM13 4h7v5h-7zM13 11h7v9h-7zM4 13h7v7H4z");
export const Plus = icon("M12 7v10M7 12h10"); export const Scale = icon("M12 4v16M6 7h12M8 7l-3 6h6l-3-6Zm8 0-3 6h6l-3-6Z");
export const Settings = icon("M12 9.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6Zm0-5.2v2m0 12v2m8-8h-2M6 12H4m13.7-5.7-1.4 1.4M7.7 16.3l-1.4 1.4m11.4 0-1.4-1.4M7.7 7.7 6.3 6.3");
export const ShieldCheck = icon("M12 3 19 6v5c0 4.4-2.8 7.5-7 10-4.2-2.5-7-5.6-7-10V6l7-3Zm-3 9 2 2 4-4");
export const Shield = icon("M12 3 19 6v5c0 4.4-2.8 7.5-7 10-4.2-2.5-7-5.6-7-10V6l7-3Z");
export const Bell = icon("M7 16h10l-1.2-2v-3a3.8 3.8 0 0 0-7.6 0v3L7 16Zm3 3h4"); export const Menu = icon("M5 8h14M5 12h14M5 16h14");
export const Wallet = icon("M5 7h14v12H5zM5 7V5h11M15 13h.01"); export const ArrowRight = icon("M5 12h13m-5-5 5 5-5 5");
export const ArrowLeft = icon("M19 12H6m5-5-5 5 5 5");
export const ArrowUpRight = icon("M7 17 17 7M9 7h8v8");
export const CirclePlay = icon("m10 8 6 4-6 4z"); export const LockKeyhole = icon("M7 10V8a5 5 0 0 1 10 0v2M6 10h12v9H6zM12 13v3");
export const FileCheck2 = icon("M7 3h7l4 4v14H7zM14 3v5h4m-7 7 2 2 4-4"); export const MoreHorizontal = icon("M7 12h.01M12 12h.01M17 12h.01");
export const CircleAlert = icon("M12 8v4m0 3h.01"); export const Trash2 = icon("M5 7h14M10 11v5m4-5v5M9 7l1-2h4l1 2m-9 0 1 13h10l1-13");
export const FileUp = icon("M7 3h7l4 4v14H7zM14 3v5h4m-6 9v-6m0 0-3 3m3-3 3 3"); export const MessageSquareWarning = icon("M5 5h14v11H9l-4 3V5Zm7 4v3m0 2h.01");
export const Send = icon("m4 5 16 7-16 7 3-7-3-7Zm3 7h6"); export const Gavel = icon("m14 5 5 5m-9 9 5-5m-8-7 5 5m-2-7 5 5M4 20h12");
export const Upload = icon("M12 16V5m0 0-4 4m4-4 4 4M5 16v3h14v-3"); export const Award = icon("m12 3 2.2 4.4 4.8.7-3.5 3.4.8 4.8L12 14l-4.3 2.3.8-4.8L5 8.1l4.8-.7L12 3Zm-3 12-1 6 4-2 4 2-1-6");
export const ShieldAlert = icon("M12 3 19 6v5c0 4.4-2.8 7.5-7 10-4.2-2.5-7-5.6-7-10V6l7-3Zm0 5v4m0 3h.01");
export const CheckCircle2 = icon("m8 12 2.5 2.5L16 9"); export const Star = icon("m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8L12 4Z");
export const BellRing = icon("M7 16h10l-1.2-2v-3a3.8 3.8 0 0 0-7.6 0v3L7 16Zm3 3h4M5 7 3.8 5.8m14.4 0L19.4 7"); export const Globe2 = icon("M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18");
export const Database = icon("M5 6c0-2 14-2 14 0s-14 2-14 0Zm0 0v6c0 2 14 2 14 0V6m-14 6v6c0 2 14 2 14 0v-6");
export const RefreshCw = icon("M20 11a8 8 0 0 0-14-4L4 9m0-5v5h5M4 13a8 8 0 0 0 14 4l2-2m0 5v-5h-5");
export const UsersRound = icon("M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 0a2.5 2.5 0 1 0 0-5M3.5 19a4.5 4.5 0 0 1 9 0M14 15a4 4 0 0 1 6.5 3.1");
export const Copy = icon("M9 9h10v10H9zM5 5h10v2M5 5v10h2"); export const ExternalLink = icon("M14 5h5v5M19 5l-8 8M17 13v5H5V7h5"); export const X = icon("m7 7 10 10M17 7 7 17");
