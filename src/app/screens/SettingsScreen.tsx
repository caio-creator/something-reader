import { useEffect, useState } from "react";
import { Button, FocusWord, Segmented, Swatches } from "@ui/components";
import { copy } from "@ui/copy";
import { clearAll, estimateUsage } from "@core/storage/idb";
import type {
  FontChoice,
  GuideStrength,
  TextEmphasis,
  TextSize,
  ThemeName,
} from "@core/model/types";
import { useSettings } from "../providers/settings-context";
import { formatBytes } from "../format";
import { VERSION } from "../version";

const THEMES = [
  { value: "ink" as ThemeName, label: copy.themeInk },
  { value: "dim" as ThemeName, label: copy.themeDim },
  { value: "paper" as ThemeName, label: copy.themePaper },
];
const EMPHASES = [
  { value: "prominent" as TextEmphasis, label: copy.emphasisProminent },
  { value: "normal" as TextEmphasis, label: copy.emphasisNormal },
  { value: "subtle" as TextEmphasis, label: copy.emphasisSubtle },
];
const GUIDES = [
  { value: "normal" as GuideStrength, label: copy.guidesNormal },
  { value: "subtle" as GuideStrength, label: copy.guidesSubtle },
  { value: "hidden" as GuideStrength, label: copy.guidesHidden },
];
const SIZES = [
  { value: "s" as TextSize, label: copy.sizeS },
  { value: "m" as TextSize, label: copy.sizeM },
  { value: "l" as TextSize, label: copy.sizeL },
];
const FONTS = [
  { value: "sans" as FontChoice, label: copy.fontSans },
  { value: "serif" as FontChoice, label: copy.fontSerif },
  { value: "mono" as FontChoice, label: copy.fontMono },
  { value: "dyslexic" as FontChoice, label: copy.fontDyslexic },
];
const CHUNKS = [
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
];

export const SettingsScreen = () => {
  const { settings, update } = useSettings();
  const [usage, setUsage] = useState(0);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    void estimateUsage().then(({ usage: used }) => setUsage(used));
  }, []);

  return (
    <main className="settings" id="main">
      <h1>{copy.settings}</h1>

      <section className="preview-card">
        <p className="eyebrow">{copy.preview}</p>
        <div className="preview-stage">
          <FocusWord text="something" trailing="." size="preview" guides={settings.guides} />
        </div>
      </section>

      <h2 className="group-title">{copy.appearance}</h2>
      <section className="group">
        <Row label={copy.background}>
          <Segmented
            label={copy.background}
            value={settings.theme}
            options={THEMES}
            onChange={(theme) => update({ theme })}
          />
        </Row>
        <Row label={copy.emphasis}>
          <Segmented
            label={copy.emphasis}
            value={settings.emphasis}
            options={EMPHASES}
            onChange={(emphasis) => update({ emphasis })}
          />
        </Row>
        <Row label={copy.anchor}>
          <Swatches
            label={copy.anchor}
            value={settings.anchorColor}
            onChange={(anchorColor) => update({ anchorColor })}
          />
        </Row>
        <Row label={copy.guides}>
          <Segmented
            label={copy.guides}
            value={settings.guides}
            options={GUIDES}
            onChange={(guides) => update({ guides })}
          />
        </Row>
      </section>

      <h2 className="group-title">{copy.reading}</h2>
      <section className="group">
        <Row label={copy.textSize}>
          <Segmented
            label={copy.textSize}
            value={settings.fontSize}
            options={SIZES}
            onChange={(fontSize) => update({ fontSize })}
          />
        </Row>
        <Row label={copy.font}>
          <Segmented
            label={copy.font}
            value={settings.font}
            options={FONTS}
            onChange={(font) => update({ font })}
          />
        </Row>
        <Row label={copy.pace} hint={`${settings.wpm} WPM`}>
          <input
            className="slider"
            type="range"
            min={100}
            max={800}
            step={10}
            value={settings.wpm}
            aria-label={copy.pace}
            onChange={(event) => update({ wpm: Number(event.target.value) })}
          />
        </Row>
        <Row label={copy.words}>
          <Segmented
            label={copy.words}
            value={String(settings.chunkSize)}
            options={CHUNKS}
            onChange={(value) => update({ chunkSize: Number(value) as 1 | 2 | 3 })}
          />
        </Row>
      </section>

      <h2 className="group-title">{copy.data}</h2>
      <section className="group">
        <Row label={copy.storageUsed} hint={usage ? formatBytes(usage) : "—"} />
        <Row label={copy.clearAll} hint={confirming ? copy.clearAllBody : undefined}>
          {confirming ? (
            <div className="sheet-actions">
              <Button onClick={() => setConfirming(false)}>{copy.cancel}</Button>
              <Button
                variant="primary"
                className="is-danger"
                onClick={() => {
                  void clearAll().then(() => window.location.reload());
                }}
              >
                {copy.clearAll}
              </Button>
            </div>
          ) : (
            <Button icon="trash" onClick={() => setConfirming(true)}>
              {copy.clearAll}
            </Button>
          )}
        </Row>
      </section>

      <h2 className="group-title">{copy.about}</h2>
      <section className="group">
        <Row label={copy.mark} hint={VERSION} />
        <Row label={copy.license} hint="Open source" />
        <Row label={copy.source}>
          <a href="https://github.com/caio-creator/something-reader" target="_blank" rel="noreferrer">
            github.com/caio-creator/something-reader
          </a>
        </Row>
      </section>
    </main>
  );
};

const Row = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children?: React.ReactNode;
}) => (
  <div className="row">
    <div className="row-head">
      <span className="row-label">{label}</span>
      {hint && <span className="row-hint mono">{hint}</span>}
    </div>
    {children && <div className="row-control">{children}</div>}
  </div>
);
