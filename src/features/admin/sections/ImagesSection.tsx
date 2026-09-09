import { useMemo } from 'react';
import { AssetService } from '../../../services';
import { CreatureSprite } from '../../../components/CreatureSprite';
import { IconTrash, IconWarning, SecondaryButton, SoftPanel } from '../../../ui';
import { useNavigation } from '../../../app/router';
import { useAdminDraft } from '../AdminDraftContext';
import { ORIGIN_LABELS, imageOrigin, useDeviceImages } from '../ImagePicker';

/**
 * IMAGES — VÉRIFIER L'ENSEMBLE (UI_DESIGN §196).
 *
 * Cette page servait à ÉDITER : pour changer l'illustration d'une créature,
 * il fallait quitter sa fiche, venir ici, l'y retrouver et saisir un chemin
 * `media/creatures/…` à la main. C'est désormais dans la fiche elle-même.
 *
 * Ce qu'une page globale sait faire et qu'une fiche ne peut pas : montrer
 * **ce qui manque**, **ce qui ne voyagera pas** et **ce qui ne sert plus**.
 */
export function ImagesSection() {
  const { draft } = useAdminDraft();
  const { navigate } = useNavigation();
  const deviceImages = useDeviceImages();

  const report = useMemo(() => {
    if (!draft) return null;
    const used = new Set(
      [
        ...draft.creatures.map((creature) => creature.imagePath),
        ...draft.biomes.map((biome) => biome.imagePath),
      ].filter((path): path is string => path !== undefined),
    );

    return {
      /* Une image importée ici ne part pas avec le contenu (docs/MEDIA.md). */
      deviceOnly: draft.creatures.filter(
        (creature) => imageOrigin(creature.imagePath, deviceImages.paths) === 'device',
      ),
      external: draft.creatures.filter(
        (creature) => imageOrigin(creature.imagePath, deviceImages.paths) === 'external',
      ),
      generated: draft.creatures.filter((creature) => creature.imagePath === undefined),
      /* Un fichier qu'aucune entité n'utilise : il occupe de la place pour rien. */
      orphans: deviceImages.items.filter((item) => !used.has(item.path)),
    };
  }, [draft, deviceImages.items, deviceImages.paths]);

  if (!draft || !report) return null;

  const openCreature = (): void => navigate({ name: 'admin', section: 'creatures' });

  return (
    <>
      <SoftPanel title="Où en sont les images ?" tone="soft" padding="tight" className="ds-stack">
        <p className="admin__status">
          L’image d’une créature se change <strong>dans sa fiche</strong> (Contenu → Créatures) :
          aperçu, remplacement et retour au dessin généré y sont réunis. Cette page sert à vérifier
          l’ensemble.
        </p>
        <div className="ds-row">
          <span className="ds-badge-chip">{report.generated.length} dessin(s) généré(s)</span>
          <span className="ds-badge-chip">{report.deviceOnly.length} sur cet appareil seulement</span>
          <span className="ds-badge-chip">{report.external.length} adresse(s) externe(s)</span>
          <span className="ds-badge-chip">{report.orphans.length} fichier(s) inutilisé(s)</span>
        </div>
      </SoftPanel>

      {report.deviceOnly.length > 0 ? (
        <SoftPanel title="Ces images ne partiront pas sur l’iPad" padding="tight" className="ds-stack">
          <p className="admin__issue">
            <IconWarning size={22} />
            <span>
              Elles n’existent que sur cet appareil. Pour qu’elles voyagent, déposez les fichiers
              dans <code>public/media/creatures/</code> du dépôt, puis indiquez ce chemin
              (docs/MEDIA.md).
            </span>
          </p>
          {report.deviceOnly.map((creature) => (
            <div key={creature.id} className="ds-list-row">
              <CreatureSprite creature={creature} size={56} />
              <span className="ds-stack">
                <span>{creature.name}</span>
                <span className="admin__status">{creature.imagePath}</span>
              </span>
              <SecondaryButton onClick={openCreature}>Ouvrir sa fiche</SecondaryButton>
            </div>
          ))}
        </SoftPanel>
      ) : null}

      {report.external.length > 0 ? (
        <SoftPanel title="Ces images viennent d’un autre site" padding="tight" className="ds-stack">
          <p className="admin__status">
            Elles s’affichent partout, mais dépendent d’un site tiers et ne fonctionnent pas hors
            connexion — sur l’iPad de votre enfant, c’est fréquent.
          </p>
          {report.external.map((creature) => (
            <div key={creature.id} className="ds-list-row">
              <span className="ds-stack">
                <span>{creature.name}</span>
                <span className="admin__status">{creature.imagePath}</span>
              </span>
              <SecondaryButton onClick={openCreature}>Ouvrir sa fiche</SecondaryButton>
            </div>
          ))}
        </SoftPanel>
      ) : null}

      <SoftPanel
        title={`Fichiers importés sur cet appareil (${deviceImages.items.length})`}
        padding="tight"
        className="ds-stack"
      >
        {deviceImages.items.length === 0 ? (
          <p className="admin__status">
            Aucune image importée. Les créatures utilisent leur dessin généré : elles ne sont jamais
            vides.
          </p>
        ) : (
          deviceImages.items.map((item) => {
            const orphan = report.orphans.some((entry) => entry.path === item.path);
            return (
              <div key={item.path} className="ds-list-row">
                <span className="ds-stack">
                  <span>{item.path}</span>
                  <span className="admin__status">
                    {item.mimeType} · {(item.size / 1024).toFixed(0)} Ko ·{' '}
                    {orphan ? 'plus utilisé' : ORIGIN_LABELS.device}
                  </span>
                </span>
                {/* On ne propose de retirer QUE ce qui ne sert plus à personne. */}
                {orphan ? (
                  <SecondaryButton
                    icon={<IconTrash size={22} />}
                    onClick={() => void AssetService.remove(item.path).then(deviceImages.refresh)}
                  >
                    Supprimer
                  </SecondaryButton>
                ) : null}
              </div>
            );
          })
        )}
      </SoftPanel>
    </>
  );
}
