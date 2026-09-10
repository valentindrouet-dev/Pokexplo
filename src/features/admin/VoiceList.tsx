import { useState } from 'react';
import type { VoiceCategory, VoiceMessage } from '../../types';
import { voiceStatus, VOICE_STATUS_LABEL } from '../../utils/voice';
import { cn } from '../../utils/cn';
import { Disclosure } from './Disclosure';
import { VoiceTextEditor } from './VoiceTextEditor';
import './forms.css';

/** Les sections telles que l'adulte les nomme, pas telles qu'elles sont stockées (§196). */
export const VOICE_CATEGORY_LABELS: Record<VoiceCategory, string> = {
  professor: 'Le Professeur',
  adventure: 'L’aventure',
  gyms: 'Les Arènes',
  exercises: 'Les exercices',
  tutorials: 'Les premiers pas',
  quests: 'Les missions',
  ui: 'Les écrans et les boutons',
};

const CATEGORY_ORDER: VoiceCategory[] = [
  'professor',
  'adventure',
  'quests',
  'gyms',
  'exercises',
  'tutorials',
  'ui',
];

export interface VoiceListProps {
  voices: VoiceMessage[];
  onChange: (voice: VoiceMessage) => void;
  /** Regroupe par section. À plat pour une liste courte (les voix d'une page). */
  grouped?: boolean;
  /** Ouvre la première voix : utile quand il n'y en a qu'une poignée. */
  openFirst?: boolean;
  emptyLabel?: string;
}

/** Résumé d'un groupe : ce qu'il reste à faire d'abord, le total ensuite. */
function summary(voices: VoiceMessage[]): string {
  const toRecord = voices.filter((voice) => {
    const status = voiceStatus(voice);
    return status === 'VOICE_MISSING' || status === 'VOICE_OUTDATED';
  }).length;
  const total = `${voices.length} voix`;
  return toRecord > 0 ? `${toRecord} à enregistrer · ${total}` : `tout est enregistré · ${total}`;
}

/** Le texte lui-même sert de titre : c'est ce que l'adulte va prononcer. */
function excerpt(voice: VoiceMessage): string {
  const text = voice.text.trim();
  if (text.length === 0) return voice.id;
  return text.length > 60 ? `${text.slice(0, 60)}…` : text;
}

/**
 * LES VOIX, EN SOUS-MENUS DÉPLIABLES (UI_DESIGN §196, §191).
 *
 * Il y avait une liste de près de deux cents lignes, à plat, dans un panneau à
 * deux colonnes : on ne s'y retrouvait pas. On voit désormais d'abord les
 * SECTIONS — le Professeur, l'aventure, les missions… — avec ce qu'il y reste à
 * faire ; on ouvre celle qu'on cherche ; et l'enregistreur s'ouvre SOUS le texte
 * qu'il concerne, un seul à la fois.
 *
 * L'enregistreur reste l'unique `VoiceTextEditor` (CLAUDE.md §3) : ce composant
 * ne fait que le ranger.
 */
export function VoiceList({
  voices,
  onChange,
  grouped = true,
  openFirst = false,
  emptyLabel = 'Aucune voix ici.',
}: VoiceListProps) {
  /* Un seul enregistreur ouvert : deux prompteurs côte à côte n'ont aucun sens. */
  const [openId, setOpenId] = useState<string | null>(
    openFirst ? (voices[0]?.id ?? null) : null,
  );

  if (voices.length === 0) return <p className="admin__status">{emptyLabel}</p>;

  const rows = (items: VoiceMessage[]) =>
    items.map((voice) => {
      const status = voiceStatus(voice);
      return (
        <Disclosure
          key={voice.id}
          level="item"
          title={excerpt(voice)}
          open={openId === voice.id}
          onToggle={(next) => setOpenId(next ? voice.id : null)}
          hint={
            <span className={cn('voice-row__status', `voice-row__status--${status}`)}>
              {VOICE_STATUS_LABEL[status]}
            </span>
          }
        >
          {/* La ligne dit déjà le texte et le statut : l'en-tête ferait double. */}
          <VoiceTextEditor title={excerpt(voice)} voice={voice} onChange={onChange} hideHead />
        </Disclosure>
      );
    });

  if (!grouped) return <div className="voice-list">{rows(voices)}</div>;

  const groups = CATEGORY_ORDER.map((category) => ({
    category,
    items: voices.filter((voice) => voice.category === category),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="voice-list">
      {groups.map((group) => (
        <Disclosure
          key={group.category}
          title={VOICE_CATEGORY_LABELS[group.category]}
          hint={summary(group.items)}
          // Une seule section : rien à choisir, on l'ouvre.
          defaultOpen={groups.length === 1}
        >
          {rows(group.items)}
        </Disclosure>
      ))}
    </div>
  );
}
