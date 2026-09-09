import { useMemo, useState } from 'react';
import type { CreatureType } from '../../types';
import { TYPE_LABELS } from '../../types/content';
import { BadgeChip, CreatureCard, IconPokedex, IconStar, LoadingBall, PillButton, SoftPanel } from '../../ui';
import { CreatureSprite } from '../../components/CreatureSprite';
import { useContent } from '../../app/providers/ContentProvider';
import { useGame } from '../../app/providers/GameProvider';
import { useScreenVoice } from '../../app/providers/useScreenVoice';
import { SCREEN_VOICES } from '../../content/voices';
import { PlayScreen } from '../play/PlayScreen';
import { CreatureSheet } from './CreatureSheet';
import { TypeIcon } from './typeIcons';

/**
 * POKÉDEX (CONCEPTION §18, §154-156 ; UI_DESIGN §191).
 *
 * C'était deux panneaux permanents : grille à gauche, fiche à droite, filtres
 * écrits, compteur. Beaucoup trop d'informations à relier pour un enfant qui
 * ne lit pas.
 *
 * C'est maintenant **une grande grille**, et rien d'autre. On touche une
 * créature, sa fiche s'ouvre par-dessus. Les filtres sont des pictogrammes
 * (§147) et suivent les types réellement présents dans le contenu.
 */
export function PokedexScreen() {
  // §192 — l'écran dit ce qu'on peut y faire, à l'arrivée.
  useScreenVoice(SCREEN_VOICES.pokedex);
  const { bundle } = useContent();
  const { save } = useGame();
  const [filter, setFilter] = useState<'ALL' | CreatureType>('ALL');
  const [openId, setOpenId] = useState<string | null>(null);

  /*
   * Les filtres viennent des DONNÉES : ajouter une créature de Feu fait
   * apparaître le filtre Feu, sans toucher au code (CLAUDE.md — la donnée
   * détermine le monde). On garde les types les plus représentés pour que la
   * rangée reste courte.
   */
  const types = useMemo(() => {
    const counts = new Map<CreatureType, number>();
    for (const creature of bundle?.creatures ?? []) {
      for (const type of [creature.type1, creature.type2]) {
        if (type) counts.set(type, (counts.get(type) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || TYPE_LABELS[a[0]].localeCompare(TYPE_LABELS[b[0]]))
      .slice(0, 4)
      .map(([type]) => type);
  }, [bundle]);

  const creatures = useMemo(() => {
    const list = bundle?.creatures ?? [];
    if (filter === 'ALL') return list;
    return list.filter((item) => item.type1 === filter || item.type2 === filter);
  }, [bundle, filter]);

  if (!bundle || !save) {
    return (
      <PlayScreen>
        <LoadingBall />
      </PlayScreen>
    );
  }

  const open = creatures.find((item) => item.id === openId) ?? null;
  const captured = Object.values(save.pokedex).filter((entry) => entry.state === 'CAPTURED').length;

  return (
    <PlayScreen scrim="soft">
      <SoftPanel padding="tight" fill className="pokedex">
        {/*
          Une rangée de filtres est UN choix — « lequel ? » — exactement comme
          la grille qu'elle trie : c'est ce que dit `data-choice-group` (§190).
        */}
        <div className="ds-row pokedex__filters" data-choice-group="filtres" role="group" aria-label="Filtrer">
          <PillButton
            active={filter === 'ALL'}
            icon={<IconStar size={26} />}
            onClick={() => setFilter('ALL')}
          >
            Tous
          </PillButton>
          {types.map((type) => (
            <PillButton
              key={type}
              active={filter === type}
              icon={<TypeIcon type={type} />}
              onClick={() => setFilter(type)}
            >
              {TYPE_LABELS[type]}
            </PillButton>
          ))}
          {/*
            Combien j'en ai : deux nombres, pas une phrase. Ce n'est pas un
            choix — rien ne se touche — et c'est ce que l'enfant vient voir.
          */}
          <BadgeChip icon={<IconPokedex size={22} />}>
            {captured} / {bundle.creatures.length}
          </BadgeChip>
        </div>

        <div className="pokedex__grid" data-choice-group="créatures">
          {creatures.map((item) => {
            const state = save.pokedex[item.id]?.state ?? 'UNKNOWN';
            return (
              <CreatureCard
                key={item.id}
                name={item.name}
                state={state === 'CAPTURED' ? 'captured' : state === 'SEEN' ? 'seen' : 'unknown'}
                selected={openId === item.id}
                onSelect={() => setOpenId(item.id)}
                media={<CreatureSprite creature={item} size={92} silhouette={state === 'UNKNOWN'} />}
              />
            );
          })}
        </div>
      </SoftPanel>

      {open ? (
        <CreatureSheet
          creature={open}
          state={save.pokedex[open.id]?.state ?? 'UNKNOWN'}
          onClose={() => setOpenId(null)}
        />
      ) : null}
    </PlayScreen>
  );
}
