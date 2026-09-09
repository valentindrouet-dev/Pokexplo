import { useState } from 'react';
import type { AdminSection } from '../../app/routes';
import { LOCAL_ADMIN_CODE } from '../../services';
import {
  IconBadge,
  IconChart,
  IconHome,
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
import { useAdminDraft } from './AdminDraftContext';
import { DraftOutdatedNotice } from './DraftOutdatedNotice';
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
import './forms.css';
import './admin.css';

/** Version installee : elle doit etre lisible sans ouvrir les reglages. */
const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';

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
  // Le brouillon est fourni par `EditModeHost` : menus et mode édition
  // travaillent ainsi sur le MÊME brouillon, sans rien à synchroniser.
  return <AdminShell section={section} />;
}

/** Barriere d'acces : un enfant ne doit pas ouvrir l'Admin par hasard (§93). */
function AdminGate() {
  const { elevate, error, mode } = useAuth();
  const { navigate } = useNavigation();
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');

  // Avec Firebase, le role ADMIN vit dans Firestore : il faut une identite
  // stable, donc un vrai compte. En local, un code suffit a tenir un enfant
  // a l'ecart (§93).
  const submit = (): void => void elevate(mode === 'firebase' ? { email, secret: code } : { secret: code });

  return (
    <div className="admin__gate surface-dense">
      <SoftPanel title="Espace administrateur" padding="roomy">
        <p>Cet espace est réservé aux adultes.</p>
        {mode === 'firebase' ? (
          <label className="field">
            <span className="field__label">E-mail du compte administrateur</span>
            <input
              className="field__input"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') submit();
              }}
            />
          </label>
        ) : null}
        <label className="field">
          <span className="field__label">
            {mode === 'firebase' ? 'Mot de passe' : 'Code d’accès'}
          </span>
          <input
            className="field__input"
            type="password"
            autoComplete="current-password"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submit();
            }}
          />
        </label>
        {error ? <p className="vte__warning">{error}</p> : null}
        <div className="ds-row">
          <PrimaryButton onClick={submit}>Entrer</PrimaryButton>
          <SecondaryButton onClick={() => navigate({ name: 'center' })}>Retour au jeu</SecondaryButton>
          <SecondaryButton icon={<IconHome size={24} />} onClick={() => navigate({ name: 'start' })}>
            Accueil
          </SecondaryButton>
        </div>
        <p className="admin__status">
          {mode === 'firebase'
            ? 'Le rôle ADMIN vient de Firestore (playerAccounts/{uid}.role) et n’est jamais accordé depuis le client.'
            : `Code par défaut sur cet appareil : « ${LOCAL_ADMIN_CODE} ».`}
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
    <div className="admin surface-dense">
      <nav className="admin__nav" aria-label="Sections de l’administration">
        <div className="admin__head">
          <span className="admin__brand">Pokexplo — Admin</span>
          {/* Version installee : c'est elle qu'on compare apres un deploiement. */}
          <span className="admin__version">Version {APP_VERSION}</span>
        </div>
        {/* Seule la liste défile : les sorties restent toujours visibles. */}
        <div className="admin__nav-list">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className="ds-tap admin__nav-item"
              aria-current={item.id === section}
              onClick={() => navigate({ name: 'admin', section: item.id })}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
        {/* Trois sorties toujours visibles : la liste seule defile. */}
        <div className="admin__nav-actions">
          <SecondaryButton icon={<IconHome size={22} />} onClick={() => navigate({ name: 'start' })}>
            Accueil
          </SecondaryButton>
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

        <DraftOutdatedNotice />

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
