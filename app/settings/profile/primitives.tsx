import { cn } from "@/app/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ─── Toggle / switch ──────────────────────────────────────────────────────────

export function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 rounded-lg px-4 py-3 transition-colors",
        "border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]",
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-zinc-100">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
            {description}
          </p>
        )}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent",
          "transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20",
          checked ? "bg-white" : "bg-zinc-700",
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-4 w-4 rounded-full shadow-sm",
            "transform transition-transform duration-200",
            checked ? "translate-x-4 bg-black" : "translate-x-0 bg-zinc-400",
          )}
        />
      </button>
    </div>
  );
}

// ─── Field group ──────────────────────────────────────────────────────────────

export function FieldGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium uppercase tracking-widest text-zinc-500">
        {label}
      </Label>
      {children}
    </div>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────

export function StyledInput(props: React.ComponentProps<typeof Input>) {
  return (
    <Input
      {...props}
      className={cn(
        "h-9 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 text-sm text-zinc-100",
        "placeholder:text-zinc-600 focus:border-white/20 focus:bg-white/[0.05] focus:ring-0",
        "transition-colors",
        props.className,
      )}
    />
  );
}

// ─── Select ───────────────────────────────────────────────────────────────────

export function StyledSelect({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "w-full h-9 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 text-sm text-zinc-100",
        "focus:border-white/20 focus:outline-none focus:ring-0 transition-colors appearance-none cursor-pointer",
      )}
    >
      {children}
    </select>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────

export function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
      <div className="border-b border-white/[0.06] px-6 py-4">
        <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
        {description && (
          <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
        )}
      </div>
      <div className="p-6 space-y-4">{children}</div>
    </div>
  );
}

// ─── Danger button ────────────────────────────────────────────────────────────

export function DangerButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-lg border border-red-900/40 bg-red-950/20 px-3 py-1.5 text-xs font-medium text-red-400",
        "hover:border-red-800/60 hover:bg-red-950/40 hover:text-red-300 transition-colors",
        "disabled:opacity-40 disabled:cursor-not-allowed",
      )}
    >
      {children}
    </button>
  );
}

// ─── Ghost action button ──────────────────────────────────────────────────────

export function GhostButton({
  children,
  onClick,
  disabled,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-lg border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-sm font-medium text-zinc-300",
        "hover:border-white/[0.18] hover:bg-white/[0.08] hover:text-white transition-colors",
        "disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2",
        className,
      )}
    >
      {children}
    </button>
  );
}
