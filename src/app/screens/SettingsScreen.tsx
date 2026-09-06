import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, FocusWord, Icon, Menu, Segmented, Slider, Swatches, useToast, type IconName } from "@ui/components";
import { copy } from "@ui/copy";
import { useStorage } from "../providers/storage-context";
import { ANCHOR_COLORS, NEUTRAL_ANCHOR, type ReaderSettings } from "@core/model/types";
import { SystemTTSProvider } from "@core/voice/system";
import { SupertonicProvider } from "@core/voice/supertonic/provider";
import { PACK } from "@core/voice/supertonic/pack";
import type { TTSProvider, VoiceOption } from "@core/voice/types";
import { useSettings } from "../providers/settings-context";
import { formatBytes } from "../format";
import { VERSION } from "../version";
import { EMPHASES, FONTS, GUIDES, SIZES, THEMES } from "./AppearanceControls";

const ENGINES = [
  { value: "natural", label: copy.voiceNatural },
  { value: "system", label: copy.voiceSystem },
];

const CHUNKS = [
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
];

/** One tap to a coherent look, for people who do not want to tune ten knobs. */
const PRESETS: { name: string; patch: Partial<ReaderSettings> }[] = [
  {
    name: copy.presetQuiet,
    patch: { theme: "ink", emphasis: "normal", guides: "subtle", anchorColor: ANCHOR_COLORS[0], font: "serif" },
  },
  {
    name: copy.presetPaper,
    patch: { theme: "paper", emphasis: "normal", guides: "normal", anchorColor: ANCHOR_COLORS[0], font: "serif" },
  },
  {
    name: copy.presetHighContrast,
    patch: { theme: "ink", emphasis: "prominent", guides: "normal", anchorColor: NEUTRAL_ANCHOR, font: "sans" },
  },
];

export const SettingsScreen = () => {
  const { settings, update } = useSettings();
  const toast = useToast();
  const { clearAll, estimateUsage } = useStorage();
  const [usage, setUsage] = useState(0);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    void estimateUsage().then(({ usage: used }) => setUsage(used)).catch(() => {});
  }, []);

  /*
   * The voices of whichever engine is selected. Listing them here rather than
   * in the reader keeps the choice where every other reading preference lives,
   * and means the reader's own button stays a switch and nothing more.
   */
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [packInstalled, setPackInstalled] = useState(false);
  const [packProgress, setPackProgress] = useState<string | null>(null);
  const natural = settings.voiceEngine === "natural";
  const naturalProvider = useMemo(() => new SupertonicProvider(), []);
  const downloadSession = useRef(0);
  const [packError, setPackError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  useEffect(() => () => { downloadSession.current++; naturalProvider.dispose(); }, [naturalProvider]);
  const cancelDownload = () => {
    downloadSession.current++;
    naturalProvider.dispose();
    setDownloading(false);
    setPackProgress(null);
  };
  const download = async () => {
    const session = ++downloadSession.current;
    setDownloading(true);
    setPackError(null);
    setPackProgress("Preparing…");
    try {
      await naturalProvider.prepare((p) => {
        if (session === downloadSession.current) setPackProgress(p.phase === "initializing" ? "Preparing…" : `${Math.min(100, Math.round(p.received / p.total * 100))}%`);
      }, settings.voice ?? undefined);
      if (session !== downloadSession.current) return;
      setPackInstalled(await naturalProvider.ready(settings.voice ?? undefined));
      setPackProgress(null);
    } catch (reason) {
      if (session === downloadSession.current) setPackError(reason instanceof Error ? reason.message : "Could not prepare the voice.");
    } finally { if (session === downloadSession.current) setDownloading(false); }
  };

  useEffect(() => {
    const provider: TTSProvider = natural ? naturalProvider : new SystemTTSProvider();
    if (!provider.available()) {
      setVoices([]);
      return;
    }
    let live = true;
    void provider.voices().then((found) => {
      if (live) setVoices(found);
    });
    void provider.ready?.(settings.voice ?? undefined).then((here: boolean) => {
      if (live) setPackInstalled(here);
    });
    return () => {
      live = false;
    };
  }, [natural, naturalProvider, settings.voice]);

  const onRemovePack = useCallback(async () => {
    await naturalProvider.uninstall();
    setPackInstalled(false);
    setPackProgress(null);
    toast(copy.voiceRemove, "database");
  }, [toast, naturalProvider]);

  const voiceItems = useMemo(
    () => [
      { value: "", label: copy.voiceDefault },
      // A language-agnostic voice is a person, not a locale, so it is named as
      // one; a system voice's language is the thing you are actually choosing.
      ...voices.map((voice) => ({
        value: voice.id,
        label: voice.lang === "*" ? voice.name : `${voice.lang} · ${voice.name}`,
      })),
    ],
    [voices],
  );

  return (
    <main className="settings" id="main">
      <h1>{copy.settings}</h1>

      <section className="preview-card">
        <p className="eyebrow">{copy.preview}</p>
        <div className="preview-screen">
          <FocusWord text="something" trailing="." size="preview" guides={settings.guides} />
        </div>
      </section>

      <section className="group presets">
        <div className="presets-head">
          <Icon name="presets" size={18} />
          <div>
            <h2>{copy.presets}</h2>
            <p>{copy.presetsBody}</p>
          </div>
        </div>
        <div className="presets-row">
          {PRESETS.map((preset) => (
            <Button
              key={preset.name}
              onClick={() => {
                update(preset.patch);
                toast(preset.name, "presets");
              }}
            >
              {preset.name}
            </Button>
          ))}
        </div>
      </section>

      <h2 className="group-title">{copy.appearance}</h2>
      <section className="group">
        <Row icon="contrast" label={copy.background}>
          <Segmented label={copy.background} value={settings.theme} options={THEMES} onChange={(theme) => update({ theme })} />
        </Row>
        <Row icon="weight" label={copy.emphasis}>
          <Segmented label={copy.emphasis} value={settings.emphasis} options={EMPHASES} onChange={(emphasis) => update({ emphasis })} />
        </Row>
        <Row icon="anchor" label={copy.anchor}>
          <Swatches label={copy.anchor} theme={settings.theme} value={settings.anchorColor} onChange={(anchorColor) => update({ anchorColor })} />
        </Row>
        <Row icon="guides" label={copy.guides}>
          <Segmented label={copy.guides} value={settings.guides} options={GUIDES} onChange={(guides) => update({ guides })} />
        </Row>
      </section>

      <h2 className="group-title">{copy.reading}</h2>
      <section className="group">
        <Row icon="textsize" label={copy.textSize}>
          <Segmented label={copy.textSize} value={settings.fontSize} options={SIZES} onChange={(fontSize) => update({ fontSize })} />
        </Row>
        <Row icon="font" label={copy.font} inline>
          <Menu label={copy.font} value={settings.font} items={FONTS} onChange={(font) => update({ font })} />
        </Row>
        <Row icon="gauge" label={copy.pace} hint={`${settings.wpm} WPM`}>
          <Slider
            label={copy.pace}
            min={100}
            max={800}
            step={10}
            value={settings.wpm}
            valueText={`${settings.wpm} words per minute`}
            onChange={(wpm) => update({ wpm })}
          />
        </Row>
        <Row icon="chunk" label={copy.words}>
          <Segmented
            label={copy.words}
            value={String(settings.chunkSize)}
            options={CHUNKS}
            onChange={(value) => update({ chunkSize: Number(value) as 1 | 2 | 3 })}
          />
        </Row>
      </section>

      <h2 className="group-title">{copy.voice}</h2>
      <section className="group">
        <Row icon="listen" label={copy.voiceEngine}>
          <Segmented
            label={copy.voiceEngine}
            value={settings.voiceEngine}
            options={ENGINES}
            onChange={(voiceEngine) => { cancelDownload(); update({ voiceEngine: voiceEngine as "natural" | "system", voice: null }); }}
          />
        </Row>
        <p className="group-note">
          {settings.voiceEngine === "natural" ? copy.voiceNaturalBody : copy.voiceSystemBody}
        </p>
        {settings.voiceEngine === "natural" && (
          <Row icon="database" label={copy.voiceNatural} hint={formatBytes(PACK.bytes)} inline>
            {packInstalled ? (
              <Button variant="quiet" onClick={onRemovePack}>{copy.voiceRemove}</Button>
            ) : (
              downloading ? <div><span role="status">{packProgress}</span><Button onClick={cancelDownload}>Cancel download</Button></div> : <Button onClick={() => void download()}>{copy.voiceDownload}</Button>
            )}
          </Row>
        )}
        {packError && <p role="alert" className="group-note is-danger">{packError}</p>}
        {voices.length === 0 ? (
          <p className="group-note is-quiet">{copy.voiceNone}</p>
        ) : (
          <>
            <Row icon="listen" label={copy.voice} inline>
              <Menu
                label={copy.voice}
                value={settings.voice ?? ""}
                items={voiceItems}
                onChange={(voice) => update({ voice: voice || null })}
              />
            </Row>
            <Row icon="gauge" label={copy.voiceRate} hint={`${settings.voiceRate.toFixed(2)}x`}>
              <Slider
                label={copy.voiceRate}
                min={0.5}
                max={2}
                step={0.05}
                value={settings.voiceRate}
                valueText={`${settings.voiceRate.toFixed(2)} times`}
                onChange={(voiceRate) => update({ voiceRate })}
              />
            </Row>
          </>
        )}
      </section>

      <h2 className="group-title">{copy.shortcuts}</h2>
      <section className="group">
        <div className="shortcuts">
          {[
            ["Space", copy.play],
            ["← →", "Step a word"],
            ["T", copy.read],
            ["C", copy.contents],
            ["A", copy.look],
            ["Esc", copy.close],
            ["/", copy.search],
            ["1 2 3", "Switch section"],
          ].map(([key, what]) => (
            <div key={key} className="shortcut">
              <kbd>{key}</kbd>
              <span>{what}</span>
            </div>
          ))}
        </div>
      </section>

      <h2 className="group-title">{copy.data}</h2>
      <section className="group">
        <Row icon="database" label={copy.storageUsed} hint={usage ? formatBytes(usage) : "—"} />
        <Row icon="trash" label={copy.clearAll} hint={confirming ? copy.clearAllBody : undefined}>
          {confirming ? (
            <div className="row-actions">
              <Button onClick={() => setConfirming(false)}>{copy.cancel}</Button>
              <Button variant="primary" className="is-danger" onClick={() => void clearAll().then(() => window.location.reload()).catch(() => toast("Could not delete your data. Try again.", "info"))}>
                {copy.clearAll}
              </Button>
            </div>
          ) : (
            <Button onClick={() => setConfirming(true)}>{copy.clearAll}</Button>
          )}
        </Row>
      </section>

      <h2 className="group-title">{copy.about}</h2>
      <section className="group">
        <Row icon="info" label={copy.mark} hint={VERSION} />
        <Row icon="shield" label={copy.license} hint="Open source" />
        <Row icon="external" label={copy.source} inline>
          <a className="btn btn-row is-link" href="https://github.com/caio-creator/something-reader" target="_blank" rel="noreferrer">
            github.com/caio-creator
          </a>
        </Row>
      </section>
    </main>
  );
};

const Row = ({
  icon,
  label,
  hint,
  inline,
  children,
}: {
  icon: IconName;
  label: string;
  hint?: string;
  inline?: boolean;
  children?: React.ReactNode;
}) => (
  <div className={`row${inline ? " is-inline" : ""}`}>
    <div className="row-head">
      <span className="row-icon">
        <Icon name={icon} size={18} />
      </span>
      <span className="row-label">{label}</span>
      {hint && <span className="row-hint mono">{hint}</span>}
    </div>
    {children && <div className="row-control">{children}</div>}
  </div>
);
