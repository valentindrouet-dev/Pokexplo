import { useMemo, useState } from 'react';
import type { AudioSettings } from '../../types';
import { masteryByCategory, skillsToPractice } from '../../exercise-engine';
import { AssetService } from '../../services';
import {
  BadgeChip,
  IconDownload,
  IconHome,
  IconSettings,
  IconSparkle,
  LoadingBall,
  PillButton,
  PrimaryButton,
  ProgressBar,
  SecondaryButton,
  SoftPanel,
} from '../../ui';
import { percent } from '../../utils/text';
import { useAudio } from '../../app/providers/AudioProvider';
import { useContent } from '../../app/providers/ContentProvider';
import { useGame } from '../../app/providers/GameProvider';
import { useNavigation } from '../../app/router';
import { useEditMode } from '../../app/providers/EditModeProvider';
import './parent.css';

const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';

/**
 * TABLEAU PARENT (CONCEPTION §77).
 *
 * Il montre la maitrise par domaine et ce qui est a retravailler.
 * L'enfant ne voit jamais ces chiffres (§75).
 */
export function ParentDashboard() {
  const { navigate } = useNavigation();
  const { available: canEdit, setEditing } = useEditMode();
  const { bundle } = useContent();
  const { save, dispatch } = useGame();
  const { settings, setSettings } = useAudio();
  const [download, setDownload] = useState<string | null>(null);

  const skillLabels = useMemo(
    () => new Map(bundle?.skills.map((skill) => [skill.id, skill]) ?? []),
    [bundle],
  );

  const categories = useMemo(() => {
    if (!save || !bundle) return {};
    const mapping: Record<string, string> = {};
    for (const skill of bundle.skills) mapping[skill.id] = skill.parentLabel;
    return masteryByCategory(save.learning, mapping);
  }, [save, bundle]);

  // Aucun contenu encore charge : on montre un chargement, mais dans un cadre
  // lisible et avec une sortie possible — jamais une page nue (§175).
  if (!bundle) {
    return (
      <div className="parent surface-dense">
        <SoftPanel title="Espace parents">
          <LoadingBall message="Chargement du contenu…" />
          <SecondaryButton onClick={() => navigate({ name: 'start' })}>
            Retour à l’accueil
          </SecondaryButton>
        </SoftPanel>
      </div>
    );
  }

  /*
   * Aucun profil n'a encore ete cree : l'espace parents n'a rien a afficher.
   * C'est un etat NORMAL, pas un chargement — il doit donc etre explique et
   * offrir une action, au lieu de tourner indefiniment.
   */
  if (!save) {
    return (
      <div className="parent surface-dense">
        <SoftPanel title="Espace parents">
          {/* La version d'abord : c'est quand rien ne marche qu'on la cherche. */}
          <p className="parent__version">Version {APP_VERSION}</p>
          <p>Aucun profil n’a encore été créé.</p>
          <p className="admin__status">
            Lancez l’aventure une première fois : la progression, les statistiques et les réglages
            de son apparaîtront ici.
          </p>
          <div className="ds-row">
            <PrimaryButton onClick={() => navigate({ name: 'start' })}>
              Créer un profil
            </PrimaryButton>
            <SecondaryButton
              icon={<IconSettings size={26} />}
              onClick={() => navigate({ name: 'admin', section: 'dashboard' })}
            >
              Administration
            </SecondaryButton>
          </div>
        </SoftPanel>
      </div>
    );
  }

  const toPractice = skillsToPractice(save.learning);
  const captured = Object.values(save.pokedex).filter((entry) => entry.state === 'CAPTURED').length;

  const update = (patch: Partial<AudioSettings>): void => setSettings({ ...settings, ...patch });

  const runDownload = async (): Promise<void> => {
    setDownload('Téléchargement…');
    const result = await AssetService.downloadCurrentAdventure(bundle);
    setDownload(
      `${result.loaded} fichier(s) en cache${result.missing > 0 ? `, ${result.missing} sans média (voix non enregistrée)` : ''}.`,
    );
  };

  return (
    <div className="parent surface-dense">
      <header className="parent__header">
        <h1 className="parent__title">Espace parents — {save.profile.nickname}</h1>
        {/*
          Repère de version. Il était sur l'accueil de l'enfant ; c'est une
          information d'adulte (§190), et elle sert vraiment : sur l'iPad, elle
          dit si le Service Worker sert encore une version précédente.
        */}
        <p className="parent__version">Version {APP_VERSION}</p>
        <div className="ds-row">
          <SecondaryButton onClick={() => navigate({ name: 'center' })}>
            Retour au jeu
          </SecondaryButton>
          <SecondaryButton icon={<IconHome size={26} />} onClick={() => navigate({ name: 'start' })}>
            Accueil
          </SecondaryButton>
          {/*
            Éditer l'aventure LÀ OÙ ON LA VOIT : on rejoint l'écran de l'enfant,
            et chaque texte, lieu ou créature devient modifiable sur place.
          */}
          {canEdit ? (
            <PrimaryButton
              icon={<IconSparkle size={26} />}
              onClick={() => {
                setEditing(true);
                navigate({ name: 'center' });
              }}
            >
              Modifier l’aventure
            </PrimaryButton>
          ) : null}
          <SecondaryButton
            icon={<IconSettings size={26} />}
            onClick={() => navigate({ name: 'admin', section: 'dashboard' })}
          >
            Administration
          </SecondaryButton>
        </div>
      </header>

      <div className="parent__grid">
        <SoftPanel title="Progression pédagogique">
          {Object.keys(categories).length === 0 ? (
            <p>Les statistiques apparaîtront après les premiers exercices.</p>
          ) : (
            Object.entries(categories).map(([label, value]) => (
              <div key={label} className="parent__stat">
                <div className="parent__stat-head">
                  <span>{label}</span>
                  <span>{percent(value)}</span>
                </div>
                <ProgressBar value={value} label={label} />
              </div>
            ))
          )}
        </SoftPanel>

        <SoftPanel title="À retravailler">
          {toPractice.length === 0 ? (
            <p>Rien de particulier pour l’instant. Tout se passe bien !</p>
          ) : (
            <ul className="parent__list">
              {toPractice.map((stats) => (
                <li key={stats.skillId} className="ds-list-row">
                  <span>{skillLabels.get(stats.skillId)?.label ?? stats.skillId}</span>
                  <span>{percent(stats.mastery)}</span>
                </li>
              ))}
            </ul>
          )}
        </SoftPanel>

        <SoftPanel title="Aventure">
          <div className="ds-row">
            <BadgeChip>{captured} créatures attrapées</BadgeChip>
            <BadgeChip>{save.state.badges.length} badge(s)</BadgeChip>
            <BadgeChip>{save.state.completedNodes.length} lieux explorés</BadgeChip>
          </div>
          <p className="start__subtitle">
            Sauvegarde n° {save.state.saveRevision} — contenu {save.contentReleaseId}
          </p>
        </SoftPanel>

        <SoftPanel title="Programme">
          <div className="ds-row">
            {bundle.curriculumPacks.map((pack) => (
              <PillButton
                key={pack.id}
                active={save.profile.packId === pack.id}
                onClick={() => void dispatch({ kind: 'PROFILE_UPDATE', packId: pack.id })}
              >
                {pack.label}
              </PillButton>
            ))}
          </div>
          <p className="admin__status">Limite la difficulté des exercices proposés.</p>
        </SoftPanel>

        <SoftPanel title="Son">
          <label className="parent__slider">
            Voix
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(settings.voicesVolume * 100)}
              onChange={(event) => update({ voicesVolume: Number(event.target.value) / 100 })}
            />
          </label>
          <label className="parent__slider">
            Musique
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(settings.musicVolume * 100)}
              onChange={(event) => update({ musicVolume: Number(event.target.value) / 100 })}
            />
          </label>
          <label className="parent__slider">
            Bruitages
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(settings.sfxVolume * 100)}
              onChange={(event) => update({ sfxVolume: Number(event.target.value) / 100 })}
            />
          </label>
          <div className="parent__toggles">
            <PillButton active={settings.muted} onClick={() => update({ muted: !settings.muted })}>
              {settings.muted ? 'Son coupé' : 'Son activé'}
            </PillButton>
            <PillButton
              active={settings.autoPlayVoices}
              onClick={() => update({ autoPlayVoices: !settings.autoPlayVoices })}
            >
              Lecture automatique
            </PillButton>
          </div>
        </SoftPanel>

        <SoftPanel title="Hors ligne">
          <p>Télécharge images et voix pour jouer sans connexion.</p>
          <PrimaryButton icon={<IconDownload size={26} />} onClick={() => void runDownload()}>
            Télécharger l’aventure
          </PrimaryButton>
          {download ? <p className="start__subtitle">{download}</p> : null}
        </SoftPanel>
      </div>
    </div>
  );
}
