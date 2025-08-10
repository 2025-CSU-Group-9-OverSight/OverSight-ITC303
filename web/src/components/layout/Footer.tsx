export default function SiteFooter() {
  return (
    <footer className="border-t bg-white">
      <div className="mx-auto max-w-7xl p-4 text-xs text-slate-500">
        © {new Date().getFullYear()} OverSight. All rights reserved.
      </div>
    </footer>
  );
}