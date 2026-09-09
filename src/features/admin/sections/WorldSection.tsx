import { useState } from 'react';
import type { Biome, MapNode, NodeKind } from '../../../types';
import { PillButton, PrimaryButton, SecondaryButton, SoftPanel } from '../../../ui';
import { useNavigation } from '../../../app/router';
import { useAdminDraft } from '../AdminDraftContext';
import { EntityPane } from '../EntityPane';
import { NumberField, SelectField, TextField } from '../fields';
import { VoiceTextEditor } from '../VoiceTextEditor';
import { uid } from '../../../utils/id';
import { createNodeAfter, duplicateNode, removalBlocker, removeNode } from '../nodeFactory';
import { PlaceIconPicker } from '../PlaceIconPicker';

const NODE_KINDS: NodeKind[] = ['CENTER', 'PATH', 'ENCOUNTER', 'GYM', 'EVENT', 'REST'];

/** BIOMES ET NŒUDS (CONCEPTION §12, §115) — l'editeur de carte. */
export function WorldSection() {
  const { draft, update } = useAdminDraft();
  const { navigate } = useNavigation();
  const [tab, setTab] = useState<'nodes' | 'biomes'>('nodes');
  const [nodeId, setNodeId] = useState<string | null>(draft?.nodes[0]?.id ?? null);
  const [biomeId, setBiomeId] = useState<string | null>(draft?.biomes[0]?.id ?? null);
  if (!draft) return null;

  const node = draft.nodes.find((item) => item.id === nodeId) ?? draft.nodes[0] ?? null;
  const biome = draft.biomes.find((item) => item.id === biomeId) ?? draft.biomes[0] ?? null;

  const patchNode = (changes: Partial<MapNode>): void => {
    if (!node) return;
    update((current) => ({
      ...current,
      nodes: current.nodes.map((item) => (item.id === node.id ? { ...item, ...changes } : item)),
    }));
  };

  const patchBiome = (changes: Partial<Biome>): void => {
    if (!biome) return;
    update((current) => ({
      ...current,
      biomes: current.biomes.map((item) => (item.id === biome.id ? { ...item, ...changes } : item)),
    }));
  };

  /** Même fabrique que le « + » de la carte : à côté du lieu sélectionné, relié à lui. */
  const createNode = (): void => {
    const id = uid('node');
    update((current) => createNodeAfter(current, node?.id ?? null, null, id).bundle);
    setNodeId(id);
  };

  const arrivalVoice = draft.voiceMessages.find((voice) => voice.id === node?.arrivalVoiceId) ?? null;
  const introVoice = draft.voiceMessages.find((voice) => voice.id === biome?.introVoiceId) ?? null;

  return (
    <>
      <div className="ds-row">
        <PillButton active={tab === 'nodes'} onClick={() => setTab('nodes')}>
          Nœuds de carte
        </PillButton>
        <PillButton active={tab === 'biomes'} onClick={() => setTab('biomes')}>
          Biomes
        </PillButton>
      </div>

      {tab === 'nodes' ? (
        <EntityPane
          title="Nœuds"
          items={draft.nodes}
          selectedId={node?.id ?? null}
          onSelect={setNodeId}
          idOf={(item) => item.id}
          labelOf={(item) => item.label}
          hintOf={(item) => `${item.kind} · ${item.biomeId}`}
          onCreate={createNode}
          createLabel="Nouveau nœud"
          onDuplicate={(id) => {
            const copyId = uid('node');
            update((current) => duplicateNode(current, id, copyId));
            setNodeId(copyId);
          }}
          onDelete={(id) => {
            update((current) => removeNode(current, id));
            setNodeId(null);
          }}
          deleteBlocker={(id) => removalBlocker(draft, id)}
        >
          {node ? (
            <>
              <div className="field__row">
                <TextField label="Nom" value={node.label} onChange={(label) => patchNode({ label })} />
                <SelectField
                  label="Type"
                  value={node.kind}
                  options={NODE_KINDS.map((kind) => ({ value: kind, label: kind }))}
                  onChange={(kind) => patchNode({ kind })}
                />
                <SelectField
                  label="Biome"
                  value={node.biomeId}
                  options={draft.biomes.map((item) => ({ value: item.id, label: item.name }))}
                  onChange={(id) => patchNode({ biomeId: id })}
                />
              </div>

              <div className="field__row">
                <NumberField label="Position X (%)" value={node.x} min={0} max={100} onChange={(x) => patchNode({ x })} />
                <NumberField label="Position Y (%)" value={node.y} min={0} max={100} onChange={(y) => patchNode({ y })} />
              </div>

              <PlaceIconPicker
                node={node}
                biome={draft.biomes.find((item) => item.id === node.biomeId) ?? null}
                onChange={(icon) => patchNode({ icon })}
              />

              <div className="field">
                <span className="field__label">Chemins vers…</span>
                <div className="ds-row">
                  {draft.nodes
                    .filter((item) => item.id !== node.id)
                    .map((item) => (
                      <PillButton
                        key={item.id}
                        active={node.connections.includes(item.id)}
                        onClick={() =>
                          patchNode({
                            connections: node.connections.includes(item.id)
                              ? node.connections.filter((id) => id !== item.id)
                              : [...node.connections, item.id],
                          })
                        }
                      >
                        {item.label}
                      </PillButton>
                    ))}
                </div>
              </div>

              <div className="field">
                <span className="field__label">Créatures que l’on peut y rencontrer</span>
                <div className="ds-row">
                  {draft.creatures.map((creature) => {
                    const entry = node.encounters?.find((item) => item.creatureId === creature.id);
                    return (
                      <PillButton
                        key={creature.id}
                        active={Boolean(entry)}
                        onClick={() =>
                          patchNode({
                            encounters: entry
                              ? (node.encounters ?? []).filter((item) => item.creatureId !== creature.id)
                              : [...(node.encounters ?? []), { creatureId: creature.id, weight: 2 }],
                          })
                        }
                      >
                        {creature.name}
                      </PillButton>
                    );
                  })}
                </div>
              </div>

              <div className="field">
                <span className="field__label">Matrices d’exercices utilisables ici</span>
                <div className="ds-row">
                  {draft.exerciseTemplates.map((template) => (
                    <PillButton
                      key={template.id}
                      active={node.exerciseTemplateIds?.includes(template.id) ?? false}
                      onClick={() =>
                        patchNode({
                          exerciseTemplateIds: node.exerciseTemplateIds?.includes(template.id)
                            ? node.exerciseTemplateIds.filter((id) => id !== template.id)
                            : [...(node.exerciseTemplateIds ?? []), template.id],
                        })
                      }
                    >
                      {template.label}
                    </PillButton>
                  ))}
                </div>
              </div>

              {arrivalVoice ? (
                <VoiceTextEditor
                  title="Phrase d’arrivée"
                  voice={arrivalVoice}
                  onChange={(next) =>
                    update((current) => ({
                      ...current,
                      voiceMessages: current.voiceMessages.map((voice) =>
                        voice.id === next.id ? next : voice,
                      ),
                    }))
                  }
                />
              ) : null}
            </>
          ) : null}
        </EntityPane>
      ) : (
        <EntityPane
          title="Biomes"
          items={draft.biomes}
          selectedId={biome?.id ?? null}
          onSelect={setBiomeId}
          idOf={(item) => item.id}
          labelOf={(item) => item.name}
          hintOf={(item) => item.kind}
        >
          {biome ? (
            <>
              <TextField label="Nom" value={biome.name} onChange={(name) => patchBiome({ name })} />
              <div className="field__row">
                <TextField
                  label="Ciel (haut)"
                  value={biome.sky[0]}
                  onChange={(value) => patchBiome({ sky: [value, biome.sky[1]] })}
                />
                <TextField
                  label="Ciel (bas)"
                  value={biome.sky[1]}
                  onChange={(value) => patchBiome({ sky: [biome.sky[0], value] })}
                />
                <TextField label="Sol" value={biome.ground} onChange={(ground) => patchBiome({ ground })} />
                <TextField label="Accent" value={biome.accent} onChange={(accent) => patchBiome({ accent })} />
              </div>
              <div className="field__row">
                <TextField
                  label="Musique (chemin média)"
                  value={biome.musicPath ?? ''}
                  onChange={(musicPath) => patchBiome({ musicPath: musicPath || undefined })}
                />
                <TextField
                  label="Ambiance (chemin média)"
                  value={biome.ambiencePath ?? ''}
                  onChange={(ambiencePath) => patchBiome({ ambiencePath: ambiencePath || undefined })}
                />
              </div>
              {introVoice ? (
                <VoiceTextEditor
                  title="Présentation du biome"
                  voice={introVoice}
                  onChange={(next) =>
                    update((current) => ({
                      ...current,
                      voiceMessages: current.voiceMessages.map((voice) =>
                        voice.id === next.id ? next : voice,
                      ),
                    }))
                  }
                />
              ) : null}
            </>
          ) : null}
        </EntityPane>
      )}

      <SoftPanel tone="soft" padding="tight">
        <div className="ds-row">
          <span className="admin__status">
            Les positions sont en pourcentage : la carte reste correcte sur tous les iPad (§159).
          </span>
          <SecondaryButton onClick={() => navigate({ name: 'admin', section: 'preview' })}>
            Prévisualiser la carte
          </SecondaryButton>
          <PrimaryButton onClick={() => navigate({ name: 'map' })}>Ouvrir le jeu</PrimaryButton>
        </div>
      </SoftPanel>
    </>
  );
}
