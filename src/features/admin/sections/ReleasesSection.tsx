import { useCallback, useEffect, useRef, useState } from 'react';
import type { ContentBundle, ContentRelease } from '../../../types';
import {
  AssetService,
  ReleaseService,
  SITE_BUNDLE_PATH,
  SitePublishService,
  type GitHubTarget,
} from '../../../services';
import { voiceDashboard } from '../../../utils/voice';
import {
  IconDownload,
  IconRelease,
  IconUpload,
  IconWarning,
  ModalPanel,
  PrimaryButton,
  SecondaryButton,
  SoftPanel,
} from '../../../ui';
import { useContent } from '../../../app/providers/ContentProvider';
import { useAdminDraft } from '../AdminDraftContext';
import { SecretField, TextField } from '../fields';

/**
 * RELEASES (CONCEPTION §99-100).
 *
 *   validate -> create release -> copy content -> validate release -> set pointer
 *
 * Le pointeur change EN DERNIER, et un rollback ne touche jamais aux
 * sauvegardes des enfants.
 */
export function ReleasesSection() {
  const { draft, validation, resetFromPublished, replaceDraft } = useAdminDraft();
  const { meta, reload } = useContent();
  const [releases, setReleases] = useState<ContentRelease[]>([]);
  const [label, setLabel] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [confirmForce, setConfirmForce] = useState(false);
  const [busy, setBusy] = useState(false);
  const [transfer, setTransfer] = useState<string | null>(null);
  const [deviceOnly, setDeviceOnly] = useState<string[]>([]);
  const importInput = useRef<HTMLInputElement | null>(null);
  const [target, setTarget] = useState<GitHubTarget>(() => SitePublishService.guessTarget());
  const [token, setToken] = useState(() => SitePublishService.readToken());
  const [sitePublish, setSitePublish] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setReleases(await ReleaseService.list());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!draft) return null;

  const voices = voiceDashboard(draft);
  const errors = validation?.issues.filter((issue) => issue.level === 'ERROR') ?? [];

  const publish = async (force: boolean): Promise<void> => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await ReleaseService.publish(draft, label || `Publication du ${new Date().toLocaleDateString('fr-FR')}`, { force });
      setMessage(`Publié : ${result.release.id}`);
      setConfirmForce(false);
      await refresh();
      await reload();
    } catch (cause) {
      const text = cause instanceof Error ? cause.message : 'Publication impossible.';
      setMessage(text);
      // §53 : voix manquantes -> on propose de publier quand meme.
      if (text.includes('voix')) setConfirmForce(true);
    } finally {
      setBusy(false);
    }
  };

  /**
   * CONCEPTION §91 — « contenu » et « code » suivent deux chemins distincts.
   *
   * Sans Firebase, le contenu vit sur l'appareil qui l'a saisi. L'exporter puis
   * le deposer dans `public/content/bundle.json` du depot le fait apparaitre
   * sur TOUS les appareils au prochain deploiement (docs/MEDIA.md).
   */
  const exportBundle = async (): Promise<void> => {
    if (!draft) return;
    setBusy(true);
    try {
      // Une image importee sur cet appareil ne voyage PAS avec le fichier JSON :
      // on previent explicitement plutot que de laisser des images manquantes.
      const stored = await AssetService.list('media/');
      const local = new Set(stored.map((item) => item.path));
      const used = draft.creatures
        .map((creature) => creature.imagePath)
        .filter((path): path is string => path !== undefined && local.has(path));
      setDeviceOnly([...new Set(used)]);

      // Un `contentVersion` neuf : sans lui, l'iPad ne verrait pas la difference.
      const stamped = SitePublishService.stamp(draft);
      const blob = new Blob([SitePublishService.serialize(stamped)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'bundle.json';
      link.click();
      URL.revokeObjectURL(url);
      setTransfer('Contenu exporté. Déposez « bundle.json » dans public/content/ du dépôt.');
    } finally {
      setBusy(false);
    }
  };

  /**
   * CONCEPTION §91 — un bouton, et le contenu part sur TOUS les appareils.
   *
   * On ecrit `public/content/bundle.json` dans le depot ; la CI reconstruit le
   * site, et l'iPad de l'enfant le recupere seul (docs/SYNC.md).
   */
  const publishToSite = async (): Promise<void> => {
    if (!draft) return;
    setBusy(true);
    setSitePublish(null);
    try {
      SitePublishService.saveTarget(target);
      SitePublishService.saveToken(token);
      const result = await SitePublishService.publishToGitHub(draft, target, token);
      setSitePublish(
        `Contenu envoyé (${result.contentVersion}). Le site se reconstruit : l’iPad se mettra à jour tout seul d’ici quelques minutes.`,
      );
    } catch (cause) {
      setSitePublish(cause instanceof Error ? cause.message : 'Publication impossible.');
    } finally {
      setBusy(false);
    }
  };

  const importBundle = async (file: File): Promise<void> => {
    setBusy(true);
    setTransfer(null);
    try {
      const parsed = JSON.parse(await file.text()) as Partial<ContentBundle>;
      if (!Array.isArray(parsed.creatures) || !Array.isArray(parsed.nodes)) {
        setTransfer('Ce fichier ne ressemble pas à un contenu Pokexplo.');
        return;
      }
      await replaceDraft(parsed as ContentBundle);
      setTransfer('Contenu importé dans le brouillon. Vérifiez, puis publiez.');
    } catch {
      setTransfer('Ce fichier n’a pas pu être lu.');
    } finally {
      setBusy(false);
    }
  };

  const rollback = async (id: string): Promise<void> => {
    setBusy(true);
    await ReleaseService.rollback(id);
    await reload();
    setMessage(`Retour à ${id}. Les sauvegardes sont intactes.`);
    setBusy(false);
  };

  return (
    <>
      <SoftPanel title="Publier le contenu" className="ds-stack">
        <p className="admin__status">
          Release actuellement servie aux joueurs : <strong>{meta?.currentReleaseId ?? '—'}</strong>
        </p>

        {errors.length > 0 ? (
          <p className="admin__issue admin__issue--error">
            <IconWarning size={22} />
            {errors.length} erreur(s) de contenu bloquent la publication. Voir le tableau de bord.
          </p>
        ) : null}

        {voices.missing > 0 ? (
          <p className="admin__issue">
            <IconWarning size={22} />
            {voices.missing} texte(s) destiné(s) à l’enfant n’ont pas de voix. Vous pouvez les
            enregistrer, publier quand même, ou laisser la voix de synthèse prendre le relais.
          </p>
        ) : null}

        <TextField label="Nom de la publication" value={label} onChange={setLabel} />

        <div className="ds-row">
          <PrimaryButton
            icon={<IconRelease size={26} />}
            disabled={busy || errors.length > 0}
            onClick={() => void publish(false)}
          >
            Publier
          </PrimaryButton>
          <SecondaryButton onClick={() => void resetFromPublished()}>
            Repartir de la version publiée
          </SecondaryButton>
        </div>

        {message ? <p className="admin__status">{message}</p> : null}
      </SoftPanel>

      <SoftPanel title="Envoyer le contenu sur l’iPad et tous les appareils" className="ds-stack">
        <p>
          Le contenu que vous saisissez reste sur cet appareil tant qu’il n’est pas déposé dans le
          dépôt, sous <code>{SITE_BUNDLE_PATH}</code>. Une fois déposé, le site se reconstruit et
          <strong> l’iPad de l’enfant se met à jour tout seul</strong> : il vérifie à chaque retour
          au premier plan, puis toutes les dix minutes. La bascule attend toujours la fin d’un
          exercice ou d’un combat.
        </p>
        <p className="admin__status">
          Un jeton GitHub à portée restreinte permet de faire ce dépôt d’un seul bouton, depuis cet
          ordinateur. Il est enregistré uniquement dans ce navigateur, jamais dans le dépôt ni dans
          une publication. Procédure détaillée : <code>docs/SYNC.md</code>.
        </p>

        <div className="admin__grid-2">
          <TextField
            label="Propriétaire du dépôt"
            value={target.owner}
            onChange={(owner) => setTarget({ ...target, owner })}
            placeholder="mon-compte-github"
          />
          <TextField
            label="Nom du dépôt"
            value={target.repo}
            onChange={(repo) => setTarget({ ...target, repo })}
            placeholder="Pokexplo"
          />
          <TextField
            label="Branche"
            value={target.branch}
            onChange={(branch) => setTarget({ ...target, branch })}
            hint="Vide = branche par défaut du dépôt."
          />
          <SecretField
            label="Jeton GitHub"
            value={token}
            onChange={setToken}
            hint="Jeton « fine-grained », limité à ce dépôt, permission « Contents : Read and write »."
          />
        </div>

        <div className="ds-row">
          <PrimaryButton
            icon={<IconUpload size={24} />}
            disabled={busy || errors.length > 0}
            onClick={() => void publishToSite()}
          >
            Envoyer sur le site
          </PrimaryButton>
          <SecondaryButton
            disabled={busy || token === ''}
            onClick={() => {
              SitePublishService.forgetToken();
              setToken('');
              setSitePublish('Jeton oublié sur cet ordinateur.');
            }}
          >
            Oublier le jeton
          </SecondaryButton>
        </div>
        {sitePublish ? <p className="admin__status">{sitePublish}</p> : null}
      </SoftPanel>

      <SoftPanel title="Déposer le fichier soi-même" className="ds-stack">
        <p>
          Sans jeton, exportez le contenu et déposez <code>bundle.json</code> dans{' '}
          <code>public/content/</code> du dépôt (glisser-déposer depuis github.com convient). Le
          résultat est exactement le même.
        </p>
        <div className="ds-row">
          <PrimaryButton
            icon={<IconDownload size={24} />}
            disabled={busy}
            onClick={() => void exportBundle()}
          >
            Exporter le contenu
          </PrimaryButton>
          <SecondaryButton
            icon={<IconUpload size={24} />}
            disabled={busy}
            onClick={() => importInput.current?.click()}
          >
            Importer un contenu
          </SecondaryButton>
          <input
            ref={importInput}
            type="file"
            className="vte__hidden-input"
            accept="application/json,.json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importBundle(file);
              event.target.value = '';
            }}
          />
        </div>
        {transfer ? <p className="admin__status">{transfer}</p> : null}
        {deviceOnly.length > 0 ? (
          <p className="admin__issue">
            <IconWarning size={22} />
            <span>
              {deviceOnly.length} image(s) n’existent que sur cet appareil et ne voyageront pas avec
              le fichier : {deviceOnly.join(', ')}. Déposez ces fichiers dans{' '}
              <code>public/media/creatures/</code> et indiquez leur chemin dans « Images ».
            </span>
          </p>
        ) : null}
      </SoftPanel>

      <SoftPanel title="Historique" className="ds-stack">
        {releases.length === 0 ? (
          <p className="admin__status">Aucune release enregistrée.</p>
        ) : (
          releases.map((release) => (
            <div key={release.id} className="ds-list-row">
              <span className="ds-stack">
                <span>
                  {release.id} — {release.label}
                </span>
                <span className="admin__status">
                  {new Date(release.createdAt).toLocaleString('fr-FR')} ·{' '}
                  {release.bundle.creatures.length} créatures · {release.bundle.nodes.length} nœuds
                </span>
              </span>
              {meta?.currentReleaseId === release.id ? (
                <span className="ds-badge-chip">En service</span>
              ) : (
                <SecondaryButton disabled={busy} onClick={() => void rollback(release.id)}>
                  Revenir à cette version
                </SecondaryButton>
              )}
            </div>
          ))
        )}
      </SoftPanel>

      <ModalPanel
        open={confirmForce}
        title="Publier malgré les voix manquantes ?"
        onDismiss={() => setConfirmForce(false)}
        actions={
          <>
            <SecondaryButton onClick={() => setConfirmForce(false)}>Annuler</SecondaryButton>
            <PrimaryButton disabled={busy} onClick={() => void publish(true)}>
              Publier quand même
            </PrimaryButton>
          </>
        }
      >
        <p>
          {voices.missing} texte(s) seront lus par la voix de synthèse en attendant votre
          enregistrement. Le jeu reste parfaitement utilisable.
        </p>
      </ModalPanel>
    </>
  );
}
