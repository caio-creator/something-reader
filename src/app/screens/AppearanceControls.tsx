import { Menu, Segmented, Swatches } from "@ui/components";
import { copy } from "@ui/copy";
import type {
  FontChoice,
  GuideStrength,
  TextEmphasis,
  TextSize,
  ThemeName,
} from "@core/model/types";
import { useSettings } from "../providers/settings-context";

export const THEMES = [
  { value: "ink" as ThemeName, label: copy.themeInk },
  { value: "dim" as ThemeName, label: copy.themeDim },
  { value: "paper" as ThemeName, label: copy.themePaper },
];
export const EMPHASES = [
  { value: "prominent" as TextEmphasis, label: copy.emphasisProminent },
  { value: "normal" as TextEmphasis, label: copy.emphasisNormal },
  { value: "subtle" as TextEmphasis, label: copy.emphasisSubtle },
];
export const GUIDES = [
  { value: "normal" as GuideStrength, label: copy.guidesNormal },
  { value: "subtle" as GuideStrength, label: copy.guidesSubtle },
  { value: "hidden" as GuideStrength, label: copy.guidesHidden },
];
export const SIZES = [
  { value: "s" as TextSize, label: copy.sizeS },
  { value: "m" as TextSize, label: copy.sizeM },
  { value: "l" as TextSize, label: copy.sizeL },
];
export const FONTS = [
  { value: "sans" as FontChoice, label: copy.fontSans, hint: "Inter" },
  { value: "serif" as FontChoice, label: copy.fontSerif, hint: "Literata" },
  { value: "mono" as FontChoice, label: copy.fontMono, hint: "JetBrains Mono" },
  { value: "dyslexic" as FontChoice, label: copy.fontDyslexic, hint: "Wider, weighted letterforms" },
];

/**
 * The reading controls, shared by Settings and the reader's own sheet — the
 * same knobs should not exist twice with two different behaviours.
 */
export const AppearanceControls = () => {
  const { settings, update } = useSettings();
  return (
    <div className="controls">
      <Field label={copy.background}>
        <Segmented label={copy.background} value={settings.theme} options={THEMES} onChange={(theme) => update({ theme })} />
      </Field>
      <Field label={copy.textSize}>
        <Segmented label={copy.textSize} value={settings.fontSize} options={SIZES} onChange={(fontSize) => update({ fontSize })} />
      </Field>
      <Field label={copy.font} inline>
        <Menu label={copy.font} value={settings.font} items={FONTS} onChange={(font) => update({ font })} />
      </Field>
      <Field label={copy.anchor}>
        <Swatches label={copy.anchor} value={settings.anchorColor} onChange={(anchorColor) => update({ anchorColor })} />
      </Field>
      <Field label={copy.guides}>
        <Segmented label={copy.guides} value={settings.guides} options={GUIDES} onChange={(guides) => update({ guides })} />
      </Field>
    </div>
  );
};

export const Field = ({
  label,
  hint,
  inline,
  children,
}: {
  label: string;
  hint?: string;
  inline?: boolean;
  children?: React.ReactNode;
}) => (
  <div className={`field-row${inline ? " is-inline" : ""}`}>
    <div className="field-head">
      <span className="field-label">{label}</span>
      {hint && <span className="field-hint mono">{hint}</span>}
    </div>
    {children && <div className="field-control">{children}</div>}
  </div>
);
