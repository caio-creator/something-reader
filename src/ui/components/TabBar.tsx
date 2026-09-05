import { Icon, type IconName } from "./Icon";

export type TabKey = "things" | "now" | "settings";

const TABS: { key: TabKey; icon: IconName; active: IconName; label: string }[] = [
  { key: "things", icon: "things", active: "things-solid", label: "Things" },
  { key: "now", icon: "bolt", active: "bolt-solid", label: "Read now" },
  { key: "settings", icon: "settings", active: "settings-solid", label: "Settings" },
];

/**
 * A floating pill, bottom-centre on phones and top-centre from tablet up.
 * Never a sidebar: a reader should not look like a dashboard.
 */
export const TabBar = ({
  active,
  onChange,
}: {
  active: TabKey;
  onChange: (key: TabKey) => void;
}) => (
  <nav className="tabbar" aria-label="Sections">
    {TABS.map((tab) => (
      <button
        key={tab.key}
        type="button"
        aria-current={active === tab.key ? "page" : undefined}
        className={active === tab.key ? "on" : ""}
        onClick={() => onChange(tab.key)}
      >
        <Icon name={active === tab.key ? tab.active : tab.icon} size={23} strokeWidth={2} />
        <span>{tab.label}</span>
      </button>
    ))}
  </nav>
);
