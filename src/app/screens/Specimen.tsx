import { useState } from "react";
import {
  Button,
  FocusWord,
  Icon,
  Menu,
  Ring,
  Segmented,
  Slider,
  Swatches,
  type IconName,
} from "@ui/components";
import { ANCHOR_COLORS } from "@core/model/types";

/**
 * The specimen sheet: every token and every component, in every state, on one
 * page. It is the design system's review surface — the thing a Storybook would
 * give us, at one file and no dependencies.
 *
 * Reachable at #specimen. If a component looks wrong here it is wrong, and this
 * is where it gets caught before it ships inside a screen.
 */

const ICONS: IconName[] = [
  "things", "bolt", "settings", "close", "gauge", "play", "pause", "text",
  "link", "paste", "file", "search", "trash", "back", "forward", "check",
  "weight", "palette", "guides", "shield", "contrast", "anchor", "textsize",
  "font", "chunk", "presets", "contents", "keyboard", "chevron", "database",
  "info", "external", "drop", "clock", "reset",
];

const SURFACES = [
  ["--bg", "app ground"],
  ["--bg-read", "prose ground"],
  ["--surface", "cards"],
  ["--surface-2", "controls"],
  ["--surface-3", "selected"],
  ["--surface-press", "pressed"],
];

const INK = [
  ["--text", "body"],
  ["--text-2", "secondary"],
  ["--text-3", "tertiary"],
  ["--text-4", "disabled"],
];

const BRAND = [
  ["--accent", "brand"],
  ["--accent-hover", "hover"],
  ["--accent-dim", "dim"],
  ["--danger", "destructive"],
];

const STEPS = [
  ["--step-display", "--track-display", "Display 34"],
  ["--step-title", "--track-title", "Title 28"],
  ["--step-title-2", "--track-title-2", "Title 2 · 22"],
  ["--step-heading", "--track-heading", "Heading 17"],
  ["--step-body", "--track-body", "Body 17"],
  ["--step-callout", "--track-callout", "Callout 15"],
  ["--step-label", "--track-label", "Label 13"],
];

const SPACE = ["1", "2", "3", "4", "5", "6", "7", "8"];
const RADII = ["--radius-control", "--radius-card", "--radius-sheet", "--radius-pill"];

export const Specimen = () => {
  const [seg, setSeg] = useState("b");
  const [menu, setMenu] = useState("serif");
  const [swatch, setSwatch] = useState<string>(ANCHOR_COLORS[0]);
  const [pace, setPace] = useState(300);

  return (
    <main className="specimen" id="main">
      <header className="spec-head">
        <h1>Specimen</h1>
        <p className="mono">something. design system — every token, every component, every state</p>
      </header>

      <Block title="Surfaces">
        <div className="chips">
          {SURFACES.map(([token, note]) => (
            <Chip key={token} token={token!} note={note!} />
          ))}
        </div>
      </Block>

      <Block title="Ink">
        <div className="chips">
          {INK.map(([token, note]) => (
            <Chip key={token} token={token!} note={note!} ink />
          ))}
        </div>
      </Block>

      <Block title="Brand">
        <div className="chips">
          {BRAND.map(([token, note]) => (
            <Chip key={token} token={token!} note={note!} />
          ))}
        </div>
      </Block>

      <Block title="Type scale">
        <div className="spec-type">
          {STEPS.map(([size, track, label]) => (
            <div key={size} className="spec-type-row">
              <span className="mono spec-key">{label}</span>
              <span style={{ fontSize: `var(${size})`, letterSpacing: `var(${track})` }}>
                Read something worth finishing
              </span>
            </div>
          ))}
          <div className="spec-type-row">
            <span className="mono spec-key">Eyebrow 11</span>
            <span className="eyebrow">Add something</span>
          </div>
          <div className="spec-type-row">
            <span className="mono spec-key">Reading 19</span>
            <span style={{ fontFamily: "var(--font-read)", fontSize: "var(--reading-size)", lineHeight: "var(--reading-leading)" }}>
              The page opens and nothing is asked of you.
            </span>
          </div>
        </div>
      </Block>

      <Block title="Space & radius">
        <div className="spec-space">
          {SPACE.map((n) => (
            <div key={n} className="spec-space-item">
              <span style={{ width: `var(--space-${n})`, height: `var(--space-${n})` }} />
              <small className="mono">{n}</small>
            </div>
          ))}
        </div>
        <div className="spec-radii">
          {RADII.map((token) => (
            <div key={token} className="spec-radius" style={{ borderRadius: `var(${token})` }}>
              <small className="mono">{token.replace("--radius-", "")}</small>
            </div>
          ))}
        </div>
      </Block>

      <Block title={`Icons · ${ICONS.length}`}>
        <div className="spec-icons">
          {ICONS.map((name) => (
            <div key={name} className="spec-icon">
              <Icon name={name} size={28} />
              <Icon name={name} size={20} />
              <Icon name={name} size={16} />
              <small className="mono">{name}</small>
            </div>
          ))}
        </div>
      </Block>

      <Block title="Buttons">
        <div className="spec-grid">
          <Cell label="primary"><Button variant="primary" icon="bolt">Read something</Button></Cell>
          <Cell label="primary disabled"><Button variant="primary" icon="bolt" disabled>Read something</Button></Cell>
          <Cell label="row"><Button icon="file">Open file</Button></Cell>
          <Cell label="row disabled"><Button icon="file" disabled>Open file</Button></Cell>
          <Cell label="row + trailing"><Button icon="clock" trailing="34m">Continue</Button></Cell>
          <Cell label="danger"><Button variant="primary" className="is-danger" icon="trash">Delete everything</Button></Cell>
          <Cell label="ghost"><Button variant="ghost" icon="trash" aria-label="Remove" /></Cell>
          <Cell label="quiet"><Button variant="quiet">Skip</Button></Cell>
          <Cell label="circle">
            <div className="spec-row">
              <Button variant="circle" icon="close" aria-label="Close" />
              <Button variant="circle" icon="contents" aria-label="Contents" />
              <Button variant="circle" icon="textsize" aria-label="Look" />
              <Button variant="circle" icon="gauge" aria-label="Pace" />
            </div>
          </Cell>
        </div>
      </Block>

      <Block title="Controls">
        <div className="spec-grid">
          <Cell label="segmented · 3">
            <Segmented
              label="Demo"
              value={seg}
              options={[{ value: "a", label: "Ink" }, { value: "b", label: "Dim" }, { value: "c", label: "Paper" }]}
              onChange={setSeg}
            />
          </Cell>
          <Cell label="menu">
            <Menu
              label="Font"
              value={menu}
              items={[
                { value: "sans", label: "Sans", hint: "Inter" },
                { value: "serif", label: "Serif", hint: "Literata" },
                { value: "mono", label: "Mono", hint: "JetBrains Mono" },
              ]}
              onChange={setMenu}
            />
          </Cell>
          <Cell label="swatches"><Swatches label="Anchor" value={swatch} onChange={setSwatch} /></Cell>
          <Cell label="slider"><Slider label="Pace" min={100} max={800} step={10} value={pace} onChange={setPace} readout={`${pace} WPM`} /></Cell>
          <Cell label="slider disabled"><Slider label="Disabled" min={0} max={100} value={40} onChange={() => undefined} disabled /></Cell>
          <Cell label="field"><input className="field" placeholder="https://" aria-label="Link" /></Cell>
          <Cell label="progress ring">
            <div className="spec-row">
              <Ring progress={0} done={false} />
              <Ring progress={0.25} done={false} />
              <Ring progress={0.62} done={false} />
              <Ring progress={1} done />
            </div>
          </Cell>
          <Cell label="kbd">
            <div className="spec-row">
              <kbd>Space</kbd><kbd>← →</kbd><kbd>Esc</kbd>
            </div>
          </Cell>
        </div>
      </Block>

      <Block title="Focus word">
        <div className="spec-focus">
          <FocusWord text="something" trailing="." size="mark" />
        </div>
        <div className="spec-grid">
          <Cell label="guides normal"><div className="spec-mini"><FocusWord text="reading" size="preview" guides="normal" /></div></Cell>
          <Cell label="guides subtle"><div className="spec-mini"><FocusWord text="reading" size="preview" guides="subtle" /></div></Cell>
          <Cell label="guides hidden"><div className="spec-mini"><FocusWord text="reading" size="preview" guides="hidden" /></div></Cell>
        </div>
      </Block>
    </main>
  );
};

const Block = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="spec-block">
    <h2 className="eyebrow">{title}</h2>
    {children}
  </section>
);

const Cell = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="spec-cell">
    <small className="mono">{label}</small>
    {children}
  </div>
);

const Chip = ({ token, note, ink }: { token: string; note: string; ink?: boolean }) => (
  <div className="spec-chip">
    <span
      className="spec-swatch"
      style={ink ? { background: "var(--surface)", color: `var(${token})` } : { background: `var(${token})` }}
    >
      {ink && "Aa"}
    </span>
    <span className="mono">{token.replace("--", "")}</span>
    <small className="mono">{note}</small>
  </div>
);
