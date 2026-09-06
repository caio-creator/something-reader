import type { ReactNode } from "react";
export type MenuItem<T extends string> = { value: T; label: string; hint?: string };
/** Native selection provides the same keyboard and screen-reader contract on every screen. */
export const Menu = <T extends string>({ label, value, items, onChange, trigger }: {
  label: string; value: T; items: readonly MenuItem<T>[]; onChange: (value: T) => void; trigger?: ReactNode;
}) => <div className="menu">{trigger && <span aria-hidden="true">{trigger}</span>}
  <select className="menu-trigger" aria-label={label} value={value} onChange={(event) => onChange(event.target.value as T)}>
    {items.map((item) => <option key={item.value} value={item.value}>{item.label}{item.hint ? ` · ${item.hint}` : ""}</option>)}
  </select>
</div>;
