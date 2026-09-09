import { useState } from 'react';
import {
  BadgeChip,
  BottomActionBar,
  ChoiceButton,
  CreatureCard,
  DialogCard,
  Hearts,
  IconBadge,
  IconBall,
  IconMap,
  IconPokedex,
  IconProfessor,
  IconTeam,
  IconButton,
  LoadingBall,
  MissingMedia,
  ModalPanel,
  PillButton,
  PrimaryButton,
  ProgressBar,
  SecondaryButton,
  SelectionPointer,
  SelectionTile,
  SoftPanel,
  TopTabs,
  TwoPaneLayout,
  VoiceButton,
} from '../../ui';
import { CreatureSprite } from '../../components/CreatureSprite';
import { defaultCreatures } from '../../content/creatures';
import './uikit.css';

const COLORS = [
  ['--color-surface', 'Surface'],
  ['--color-surface-soft', 'Surface douce'],
  ['--color-yellow', 'Jaune — action'],
  ['--color-coral', 'Corail — défi'],
  ['--color-aqua', 'Turquoise — navigation'],
  ['--color-lavender', 'Lavande — collection'],
  ['--color-green', 'Vert — nature'],
  ['--color-text', 'Texte'],
];

/**
 * PAGE DE DEVELOPPEMENT DU DESIGN SYSTEM (CONCEPTION §185).
 * Route : #/dev/ui-kit — elle permet de verifier d'un coup d'œil que
 * l'interface reste coherente.
 */
export function UiKitPage() {
  const [tab, setTab] = useState('map');
  const [selected, setSelected] = useState('b');
  const [modal, setModal] = useState(false);
  const creature = defaultCreatures[0];
  const other = defaultCreatures[5];

  return (
    <div className="uikit">
      <h1 className="ds-panel__title">Design system — Pokexplo</h1>
      <p className="start__subtitle">
        docs/UI_DESIGN.md · toutes les valeurs proviennent de src/ui/theme/tokens.css
      </p>

      <SoftPanel title="Couleurs">
        <div className="uikit__swatches">
          {COLORS.map(([token, label]) => (
            <div key={token} className="uikit__swatch">
              <span className="uikit__chip" style={{ background: `var(${token})` }} />
              <span>{label}</span>
              <code>{token}</code>
            </div>
          ))}
        </div>
      </SoftPanel>

      <SoftPanel title="Typographie">
        <p style={{ fontSize: 'var(--hero-title)', fontWeight: 800 }}>Hero — 42 px</p>
        <p style={{ fontSize: 'var(--title)', fontWeight: 800 }}>Titre — 34 px</p>
        <p style={{ fontSize: 'var(--text-large)' }}>Texte large — 28 px</p>
        <p style={{ fontSize: 'var(--text-normal)' }}>Texte normal — 22 px</p>
        <p style={{ fontSize: 'var(--text-small)' }}>Texte petit — 18 px</p>
      </SoftPanel>

      <SoftPanel title="Boutons">
        <div className="ds-row">
          <PrimaryButton>Partir !</PrimaryButton>
          <PrimaryButton large icon={<IconMap size={30} />}>
            Action principale
          </PrimaryButton>
          <SecondaryButton>Secondaire</SecondaryButton>
          <SecondaryButton tone="challenge">Défi</SecondaryButton>
          <SecondaryButton disabled>Désactivé</SecondaryButton>
          <IconButton label="Pokédex" icon={<IconPokedex size={28} />} />
          <IconButton label="Badges" accent icon={<IconBadge size={28} />} />
        </div>
        <div className="ds-row">
          <PillButton active>Tous</PillButton>
          <PillButton>Eau</PillButton>
          <PillButton>Plante</PillButton>
        </div>
      </SoftPanel>

      <SoftPanel title="Réponses d’exercice">
        <div className="ds-row">
          <ChoiceButton label="4" />
          <ChoiceButton label="5" state="selected" />
          <ChoiceButton label="6" state="correct" />
          <ChoiceButton label="7" state="retry" />
          <ChoiceButton label="8" state="removed" />
        </div>
      </SoftPanel>

      <SoftPanel title="Sélection">
        <div className="ds-row">
          <SelectionTile label="Option A" selected={selected === 'a'} onClick={() => setSelected('a')} />
          <SelectionTile label="Option B" selected={selected === 'b'} onClick={() => setSelected('b')} />
          <SelectionTile label="Fermé" locked />
        </div>
        <div className="ds-row">
          <SelectionPointer inline />
          <span>Pointeur de sélection (§141)</span>
        </div>
      </SoftPanel>

      <SoftPanel title="Onglets">
        <TopTabs
          label="Exemple"
          activeId={tab}
          onSelect={setTab}
          items={[
            { id: 'map', label: 'Carte', icon: <IconMap size={30} /> },
            { id: 'dex', label: 'Pokédex', icon: <IconPokedex size={30} /> },
            { id: 'team', label: 'Équipe', icon: <IconTeam size={30} /> },
            { id: 'badge', label: 'Badges', icon: <IconBadge size={30} /> },
          ]}
        />
      </SoftPanel>

      <SoftPanel title="Cartes de créature">
        <div className="ds-row">
          <div className="uikit__card">
            <CreatureCard
              name={creature?.name ?? ''}
              media={<CreatureSprite creature={creature} size={90} />}
            />
          </div>
          <div className="uikit__card">
            <CreatureCard
              name={other?.name ?? ''}
              selected
              media={<CreatureSprite creature={other} size={90} />}
            />
          </div>
          <div className="uikit__card">
            <CreatureCard
              name=""
              state="unknown"
              media={<CreatureSprite creature={other} size={90} silhouette />}
            />
          </div>
        </div>
      </SoftPanel>

      <SoftPanel title="Voix et états">
        <div className="ds-row">
          <VoiceButton state="available" onPlay={() => undefined} />
          <VoiceButton state="playing" onPlay={() => undefined} />
          <VoiceButton state="muted" onPlay={() => undefined} />
          <VoiceButton state="unavailable" onPlay={() => undefined} />
          <Hearts total={3} left={2} />
          <BadgeChip icon={<IconBall size={20} />}>Chip</BadgeChip>
        </div>
        <ProgressBar value={0.62} label="Exemple" />
        <div className="ds-row">
          <LoadingBall />
          <div className="uikit__card">
            <MissingMedia admin />
          </div>
        </div>
      </SoftPanel>

      <SoftPanel title="Dialogue">
        <DialogCard
          speaker="Professeur"
          portrait={<IconProfessor size={64} />}
          text="Un Pokémon rare a été aperçu près de la rivière !"
          voiceButton={<VoiceButton state="available" onPlay={() => undefined} />}
          action={<PrimaryButton>J’y vais !</PrimaryButton>}
        />
      </SoftPanel>

      <SoftPanel title="Deux colonnes (45 % / 55 %)">
        <TwoPaneLayout
          left={<SoftPanel tone="soft">Collection</SoftPanel>}
          right={<SoftPanel tone="soft">Information</SoftPanel>}
        />
      </SoftPanel>

      <SoftPanel title="Modale et barre d’actions">
        <PrimaryButton onClick={() => setModal(true)}>Ouvrir la modale</PrimaryButton>
        <BottomActionBar
          left={<IconButton label="Retour" icon={<IconMap size={28} />} />}
          right={<PrimaryButton>Continuer</PrimaryButton>}
        />
        <ModalPanel
          open={modal}
          title="Une seule question"
          onDismiss={() => setModal(false)}
          actions={<PrimaryButton onClick={() => setModal(false)}>D’accord</PrimaryButton>}
        >
          <p>Les modales restent rares : une ou deux actions maximum (§172).</p>
        </ModalPanel>
      </SoftPanel>
    </div>
  );
}
