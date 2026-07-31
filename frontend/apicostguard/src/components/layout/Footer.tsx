export default function Footer() {
  return (
    <footer className="flex items-center justify-between px-6 py-3 border-t border-[#334155]/50 bg-[#0A0F1C]/80">
      <p className="text-xs text-[#94A3B8]/50">
        APICostGuard v0.1.0
      </p>
      <div className="flex items-center gap-4">
        <span className="text-xs text-[#94A3B8]/50">Database-free MVP</span>
        <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
      </div>
    </footer>
  );
}
