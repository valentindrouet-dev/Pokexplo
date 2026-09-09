import { useState } from 'react';
import type { AdminSection } from '../../app/routes';
import { LOCAL_ADMIN_CODE } from '../../services';
import {
  IconBadge,
  IconChart,
  IconImage,
  IconMap,
  IconMic,
  IconPokedex,
  IconProfessor,
  IconQuest,
  IconRelease,
  IconSettings,
  IconSparkle,
  IconTeam,
  LoadingBall,
  PrimaryButton,
  SecondaryButton,
  SoftPanel,
} from '../../ui';
import { useAuth } from '../../app/providers/AuthProvider';
import { useNavigation } from '../../app/router';
import { AdminDraftProvider, useAdminDraft } from './AdminDraftContext';
import { DashboardSection } from './sections/DashboardSection';
import { CreaturesSection } from './sections/CreaturesSection';
import { ExercisesSection } from './sections/ExercisesSection';
import { WorldSection } from './sections/WorldSection';
import { GymsSection } from './sections/GymsSection';
import { QuestsSection } from './sections/QuestsSection';
import { PacksSection } from './sections/PacksSection';
import { AudioSection } from './sections/AudioSection';
import { ImagesSection } from './sections/ImagesSection';
import { ReleasesSection } from './sections/ReleasesSection';
import { ProfilesSection } from './sections/ProfilesSection';
import { ProgressSection } from './sections/ProgressSection';
import { PreviewSection } from './sections/PreviewSection';
import './admin.css';

const NAV: Array<{ id: AdminSection; label: string; icon: React.ReactNode }> = [
  { id: 'dashboard', label: 'Tableau de bord', icon: <IconChart size={24} /> },
  { id: 'creatures', label: 'Créatures', icon: <IconPokedex size={24} /> },
  { id: 'exercises', label: 'Exercices', icon: <IconSparkle size={24} /> },
  { id: 'biomes', label: 'Biomes et nœuds', icon: <IconMap size={24} /> },
  { id: 'gyms', label: 'Arènes', icon: <IconBadge size={24} /> },
  { id: 'quests', label: 'Quêtes', icon: <IconQuest size={24} /> },
  { id: 'packs', label: 'Packs', icon: <IconTeam size={24} /> },
  { id: 'audio', label: 'Voix', icon: <IconMic size={24} /> },
  { id: 'images', label: 'Images', icon: <IconImage size={24} /> },
  { id: 'releases', label: 'Releases', icon: <IconRelease size={24} /> },
  { id: 'profiles', label: 'Profils', icon: <IconProfessor size={24} /> },
  { id: 'progress', label: 'Progression', icon: <IconChart size={24} /> },
  { id: 'preview', label: 'Prévisualiser', icon: <IconSettings size={24} /> },
];

/** INTERFACE D'ADMINISTRATION (CONCEPTION §115). */
export function AdminApp({ section }: { section: AdminSection }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <AdminGate />;
  return (
    <AdminDraftProvider>
      <AdminShell section={section} />
    </AdminDraftProvider>
  );
}

/** Barriere d'acces : un enfant ne doit pas ouvrir l'Admin par hasard (§93). */
function AdminGate() {
  const { elevate, error } = useAuth();
  const { navigate } = useNavigation();
  const [code, setCode] = useState('');

  return (
    <div className="admin__gate">
      <SoftPanel title="Espace administrateur" padding="roomy">
        <p>Cet espace est réservé aux adultes.</p>
        <label className="field">
          <span className="field__label">Code d’accès</span>
          <input
            className="field__input"
            type="password"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void elevate(code);
            }}
          />
        </label>
        {error ? <p className="vte__warning">{error}</p> : null}
        <div className="ds-row">
          <PrimaryButton onClick={() => void elevate(code)}>Entrer</PrimaryButton>
          <SecondaryButton onClick={() => navigate({ name: 'center' })}>Retour au jeu</SecondaryButton>
        </div>
        <p className="admin__status">
          Code par défaut en mode local : « {LOCAL_ADMIN_CODE} ». Avec Firebase, le rôle ADMIN vient
          de Firestore et n’est jamais accordé depuis le client.
        </p>
      </SoftPanel>
    </div>
  );
}

function AdminShell({ section }: { section: AdminSection }) {
  const { navigate } = useNavigation();
  const { draft, saving, savedAt, validation } = useAdminDraft();
  const { signOutAdmin } = useAuth();

  return (
    <div className="admin">
      <nav className="admin__nav" aria-label="Sections de l’administration">
        <p className="admin__brand">Pokexplo — Admin</p>
        {NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            className="ds-tap admin__nav-item"
            aria-current={item.id === section}
            onClick={() => navigate({ name: 'admin', section: item.id })}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
        <div className="ds-stack" style={{ marginTop: 'var(--space-5)' }}>
          <SecondaryButton onClick={() => navigate({ name: 'center' })}>Voir le jeu</SecondaryButton>
          <SecondaryButton onClick={() => void signOutAdmin()}>Quitter l’admin</SecondaryButton>
        </div>
      </nav>

      <main className="admin__main">
        <div className="admin__toolbar">
          <span className="admin__status">
            Brouillon {saving ? '— enregistrement…' : savedAt ? '— enregistré' : ''}
          </span>
          <span className="admin__status">
            {validation
              ? `${validation.issues.filter((issue) => issue.level === 'ERROR').length} erreur(s) · ${validation.missingVoices} voix manquante(s) · ${validation.outdatedVoices} obsolète(s)`
              : ''}
          </span>
        </div>

        {!draft ? <LoadingBall message="Chargement du contenu…" /> : <AdminSectionView section={section} />}
      </main>
    </div>
  );
}

function AdminSectionView({ section }: { section: AdminSection }) {
  switch (section) {
    case 'creatures':
      return <CreaturesSection />;
    case 'exercises':
      return <ExercisesSection />;
    case 'biomes':
    case 'nodes':
      return <WorldSection />;
    case 'gyms':
      return <GymsSection />;
    case 'quests':
      return <QuestsSection />;
    case 'packs':
      return <PacksSection />;
    case 'audio':
      return <AudioSection />;
    case 'images':
      return <ImagesSection />;
    case 'releases':
      return <ReleasesSection />;
    case 'profiles':
      return <ProfilesSection />;
    case 'progress':
      return <ProgressSection />;
    case 'preview':
      return <PreviewSection />;
    case 'dashboard':
    default:
      return <DashboardSection />;
  }
}
