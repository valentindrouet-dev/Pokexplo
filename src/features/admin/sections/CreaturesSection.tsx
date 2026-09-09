import { useState } from 'react';
import type { Creature, CreatureType, Rarity } from '../../../types';
import { RARITY_LABELS, TYPE_LABELS } from '../../../types/content';
import { CreatureSprite } from '../../../components/CreatureSprite';
import { PillButton, SecondaryButton } from '../../../ui';
import { createVoiceMessage } from '../../../utils/voice';
import { uid } from '../../../utils/id';
import { useAdminDraft } from '../AdminDraftContext';
import { EntityPane } from '../EntityPane';
import { creatureBlocker, duplicateCreature, removeCreature } from '../entityActions';
import { NumberField, SelectField, TextAreaField, TextField } from '../fields';
import { VoiceTextEditor } from '../VoiceTextEditor';

const TYPES = Object.keys(TYPE_LABELS) as CreatureType[];
const RARITIES = Object.keys(RARITY_LABELS) as Rarity[];

/** CONCEPTION §115 — creation et edition des creatures, sans toucher au code (§91). */
export function CreaturesSection() {
  const { draft, update } = useAdminDraft();
  const [selectedId, setSelectedId] = useState<string | null>(draft?.creatures[0]?.id ?? null);
  if (!draft) return null;

  const creature = draft.creatures.find((item) => item.id === selectedId) ?? draft.creatures[0] ?? null;

  const patch = (changes: Partial<Creature>): void => {
    if (!creature) return;
    update((current) => ({
      ...current,
      creatures: current.creatures.map((item) =>
        item.id === creature.id ? { ...item, ...changes } : item,
      ),
    }));
  };

  const create = (): void => {
    const id = uid('creature');
    const nameVoiceId = `voice.creature.${id}.name`;
    update((current) => ({
      ...current,
      creatures: [
        ...current.creatures,
        {
          id,
          name: 'Nouvelle créature',
          type1: 'NORMAL',
          rarity: 'COMMON',
          biomes: [],
          habitat: '',
          syllables: [],
          colorKey: 'jaune',
          nameVoiceId,
          visual: {
            shape: 'round',
            palette: ['#FFD45C', '#FFE9A2'],
            accent: '#FF777F',
            ears: 'round',
            eyes: 'happy',
            feature: 'none',
          },
        },
      ],
      voiceMessages: [
        ...current.voiceMessages,
        createVoiceMessage(nameVoiceId, 'Nouvelle créature', 'adventure', { autoPlay: false }),
      ],
    }));
    setSelectedId(id);
  };

  const nameVoice = draft.voiceMessages.find((voice) => voice.id === creature?.nameVoiceId) ?? null;

  return (
    <EntityPane
      title="Créatures"
      items={draft.creatures}
      selectedId={creature?.id ?? null}
      onSelect={setSelectedId}
      idOf={(item) => item.id}
      labelOf={(item) => item.name}
      hintOf={(item) => `${TYPE_LABELS[item.type1]} · ${RARITY_LABELS[item.rarity]}`}
      onCreate={create}
      createLabel="Nouvelle créature"
      onDuplicate={(id) => {
        const copy = duplicateCreature(draft, id);
        if (!copy) return;
        update(() => copy.bundle);
        setSelectedId(copy.created.id);
      }}
      onDelete={(id) => {
        update((current) => removeCreature(current, id));
        setSelectedId(null);
      }}
      deleteBlocker={(id) => creatureBlocker(draft, id)}
    >
      {creature ? (
        <>
          <div className="ds-row">
            <CreatureSprite creature={creature} size={140} />
            <div className="ds-stack">
              <span className="admin__status">Identifiant : {creature.id}</span>
              <span className="admin__status">
                Illustration générée en SVG. Ajoutez une image depuis « Images » pour la remplacer.
              </span>
            </div>
          </div>

          <div className="field__row">
            <TextField label="Nom" value={creature.name} onChange={(name) => patch({ name })} />
            <TextField
              label="Nom anglais"
              value={creature.nameEn ?? ''}
              onChange={(nameEn) => patch({ nameEn })}
              hint="Utilisé par les exercices ENGLISH_WORD"
            />
          </div>

          <div className="field__row">
            <SelectField
              label="Type 1"
              value={creature.type1}
              options={TYPES.map((type) => ({ value: type, label: TYPE_LABELS[type] }))}
              onChange={(type1) => patch({ type1 })}
            />
            <SelectField
              label="Type 2"
              value={(creature.type2 ?? '') as CreatureType}
              options={[
                { value: '' as CreatureType, label: 'Aucun' },
                ...TYPES.map((type) => ({ value: type, label: TYPE_LABELS[type] })),
              ]}
              onChange={(type2) => patch(type2 ? { type2 } : { type2: undefined })}
            />
            <SelectField
              label="Rareté"
              value={creature.rarity}
              options={RARITIES.map((rarity) => ({ value: rarity, label: RARITY_LABELS[rarity] }))}
              onChange={(rarity) => patch({ rarity })}
            />
          </div>

          <TextField
            label="Habitat"
            value={creature.habitat}
            onChange={(habitat) => patch({ habitat })}
            hint="Affiché dans le Pokédex : « Trouvée dans… »"
          />

          <TextField
            label="Syllabes"
            value={creature.syllables.join('-')}
            onChange={(value) =>
              patch({ syllables: value.split('-').map((part) => part.trim()).filter(Boolean) })
            }
            hint="Séparées par un tiret (Pi-lou-pi). Utilisées par les exercices et les quêtes."
          />

          <TextAreaField
            label="Description"
            value={creature.description ?? ''}
            onChange={(description) => patch({ description })}
          />

          <div className="field">
            <span className="field__label">Biomes</span>
            <div className="ds-row">
              {draft.biomes.map((biome) => (
                <PillButton
                  key={biome.id}
                  active={creature.biomes.includes(biome.id)}
                  onClick={() =>
                    patch({
                      biomes: creature.biomes.includes(biome.id)
                        ? creature.biomes.filter((id) => id !== biome.id)
                        : [...creature.biomes, biome.id],
                    })
                  }
                >
                  {biome.name}
                </PillButton>
              ))}
            </div>
          </div>

          <div className="field__row">
            <SelectField
              label="Silhouette"
              value={creature.visual.shape}
              options={[
                { value: 'round', label: 'Ronde' },
                { value: 'blob', label: 'Goutte' },
                { value: 'quad', label: 'À quatre pattes' },
                { value: 'serpent', label: 'Allongée' },
                { value: 'bird', label: 'Ailée' },
                { value: 'rock', label: 'Rocheuse' },
              ]}
              onChange={(shape) => patch({ visual: { ...creature.visual, shape } })}
            />
            <SelectField
              label="Yeux"
              value={creature.visual.eyes}
              options={[
                { value: 'dot', label: 'Ronds' },
                { value: 'happy', label: 'Souriants' },
                { value: 'big', label: 'Grands' },
                { value: 'sleepy', label: 'Endormis' },
              ]}
              onChange={(eyes) => patch({ visual: { ...creature.visual, eyes } })}
            />
            <SelectField
              label="Oreilles"
              value={creature.visual.ears}
              options={[
                { value: 'none', label: 'Aucune' },
                { value: 'pointy', label: 'Pointues' },
                { value: 'round', label: 'Rondes' },
                { value: 'long', label: 'Longues' },
                { value: 'fin', label: 'Nageoire' },
              ]}
              onChange={(ears) => patch({ visual: { ...creature.visual, ears } })}
            />
            <SelectField
              label="Détail"
              value={creature.visual.feature}
              options={[
                { value: 'none', label: 'Aucun' },
                { value: 'spark', label: 'Éclair' },
                { value: 'leaf', label: 'Feuille' },
                { value: 'flame', label: 'Flamme' },
                { value: 'fin', label: 'Nageoire' },
                { value: 'rock', label: 'Pierres' },
                { value: 'snow', label: 'Flocon' },
                { value: 'wing', label: 'Aile' },
              ]}
              onChange={(feature) => patch({ visual: { ...creature.visual, feature } })}
            />
          </div>

          <div className="field__row">
            <TextField
              label="Couleur principale"
              value={creature.visual.palette[0]}
              onChange={(value) =>
                patch({ visual: { ...creature.visual, palette: [value, creature.visual.palette[1]] } })
              }
            />
            <TextField
              label="Couleur secondaire"
              value={creature.visual.palette[1]}
              onChange={(value) =>
                patch({ visual: { ...creature.visual, palette: [creature.visual.palette[0], value] } })
              }
            />
            <TextField
              label="Couleur d’accent"
              value={creature.visual.accent}
              onChange={(accent) => patch({ visual: { ...creature.visual, accent } })}
            />
            <SelectField
              label="Couleur dominante (anglais)"
              value={creature.colorKey}
              options={[
                'rouge',
                'bleu',
                'vert',
                'jaune',
                'orange',
                'rose',
                'gris',
                'marron',
                'blanc',
              ].map((value) => ({ value: value as Creature['colorKey'], label: value }))}
              onChange={(colorKey) => patch({ colorKey })}
            />
          </div>

          <TextField
            label="Chemin de l’image (facultatif)"
            value={creature.imagePath ?? ''}
            onChange={(imagePath) => patch({ imagePath: imagePath || undefined })}
            hint="media/creatures/… — laissez vide pour garder l’illustration générée"
          />

          <NumberField
            label="Poids de rencontre par défaut"
            value={0}
            onChange={() => undefined}
            hint="Le poids se règle sur chaque nœud, dans « Biomes et nœuds »."
          />

          {nameVoice ? (
            <VoiceTextEditor
              title="Voix du nom (bouton 🔊 du Pokédex)"
              voice={nameVoice}
              onChange={(next) =>
                update((current) => ({
                  ...current,
                  voiceMessages: current.voiceMessages.map((voice) =>
                    voice.id === next.id ? next : voice,
                  ),
                }))
              }
            />
          ) : (
            <SecondaryButton
              onClick={() => {
                const nameVoiceId = `voice.creature.${creature.id}.name`;
                update((current) => ({
                  ...current,
                  creatures: current.creatures.map((item) =>
                    item.id === creature.id ? { ...item, nameVoiceId } : item,
                  ),
                  voiceMessages: [
                    ...current.voiceMessages,
                    createVoiceMessage(nameVoiceId, creature.name, 'adventure', { autoPlay: false }),
                  ],
                }));
              }}
            >
              Ajouter une voix pour le nom
            </SecondaryButton>
          )}
        </>
      ) : null}
    </EntityPane>
  );
}
