import { useState } from 'react';
import type { Creature, CreatureType, Rarity } from '../../../types';
import { RARITY_LABELS, TYPE_LABELS } from '../../../types/content';
import { CreatureSprite } from '../../../components/CreatureSprite';
import { PillButton, SecondaryButton } from '../../../ui';
import { createVoiceMessage } from '../../../utils/voice';
import { uid } from '../../../utils/id';
import { useAdminDraft } from '../AdminDraftContext';
import { EntityPane } from '../EntityPane';
import { AdvancedPanel } from '../AdvancedPanel';
import { ImagePicker, useCatalogImages, useDeviceImages } from '../ImagePicker';
import { SyllableFields } from '../SyllableFields';
import { creatureNumber, formatCreatureNumber, nextCreatureNumber } from '../creatureNumber';
import { creatureBlocker, duplicateCreature, removeCreature } from '../entityActions';
import { NumberField, SelectField, TextAreaField, TextField } from '../fields';
import { VoiceTextEditor } from '../VoiceTextEditor';

const TYPES = Object.keys(TYPE_LABELS) as CreatureType[];
const RARITIES = Object.keys(RARITY_LABELS) as Rarity[];

/** CONCEPTION §115 — creation et edition des creatures, sans toucher au code (§91). */
export function CreaturesSection() {
  const deviceImages = useDeviceImages();
  const catalog = useCatalogImages();
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
          number: nextCreatureNumber(current),
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
      hintOf={(item) =>
        `${formatCreatureNumber(creatureNumber(draft, item))} · ${TYPE_LABELS[item.type1]} · ${RARITY_LABELS[item.rarity]}`
      }
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
          {/*
            Tout ce qui concerne cette créature est ICI (§196) : on ne quitte
            plus sa fiche pour aller saisir un chemin `media/…` ailleurs.
          */}
          <ImagePicker
            preview={<CreatureSprite creature={creature} size={140} />}
            path={creature.imagePath}
            onChange={(imagePath) => patch({ imagePath })}
            folder="creatures"
            deviceImages={deviceImages}
            catalog={catalog}
            /*
             * « 0025_pikachu.png » porte plus qu'un chemin : un numéro et un
             * nom. On les reprend — c'est la raison d'être de la convention —
             * mais jamais par-dessus un nom que l'adulte a déjà écrit.
             */
            onPickCatalog={(image) => {
              patch({
                ...(image.number === undefined ? {} : { number: image.number }),
                ...(creature.name === 'Nouvelle créature' ? { name: image.name } : {}),
              });
            }}
          />

          <div className="field__row">
            <NumberField
              label="Numéro"
              value={creatureNumber(draft, creature)}
              min={1}
              onChange={(number) => patch({ number })}
              hint="Celui qu’affiche le Pokédex, et celui du nom de fichier de l’image."
            />
            <TextField label="Nom" value={creature.name} onChange={(name) => patch({ name })} />
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

          <SyllableFields
            value={creature.syllables}
            onChange={(syllables) => patch({ syllables })}
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

          {/*
            LE DESSIN NE SE FAIT PLUS À LA MAIN (§198).

            Silhouette, yeux, oreilles, détail et trois couleurs : c'était
            demander à un parent de dessiner ses créatures. On dépose une
            image dans le dépôt et on la choisit ci-dessus. Le descripteur
            reste dans la donnée — il fait le dessin de secours d'une créature
            sans image, et on ne supprime jamais ce qui existe déjà.
          */}

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

          {/*
            Ce qui reste TECHNIQUE se replie (§196) : un identifiant, un chemin
            de fichier, une clé d'énumération. Nécessaire de temps en temps,
            jamais dans le parcours normal.
          */}
          <AdvancedPanel hint="identifiant, chemin d’image, mot anglais">
            <p className="admin__status">Identifiant : {creature.id}</p>
            <TextField
              label="Nom anglais"
              value={creature.nameEn ?? ''}
              onChange={(nameEn) => patch({ nameEn: nameEn || undefined })}
              hint="Utilisé par les exercices d’anglais."
            />
            <SelectField
              label="Couleur dominante (exercices d’anglais)"
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
            <TextField
              label="Chemin de l’image"
              value={creature.imagePath ?? ''}
              onChange={(imagePath) => patch({ imagePath: imagePath || undefined })}
              hint="media/creatures/… ou https://…. Le bouton « Remplacer l’image » suffit d’ordinaire."
            />
          </AdvancedPanel>
        </>
      ) : null}
    </EntityPane>
  );
}
