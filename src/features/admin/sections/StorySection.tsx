import { useState } from 'react';
import { PillButton } from '../../../ui';
import { GymsSection } from './GymsSection';
import { QuestsSection } from './QuestsSection';

/**
 * HISTOIRE & ARÈNES (UI_DESIGN §196).
 *
 * Les quêtes et les Arènes étaient deux entrées de menu distinctes, alors
 * qu'elles racontent la même chose : ce que l'enfant doit accomplir. Elles
 * partagent maintenant une entrée, et deux onglets.
 */
export function StorySection() {
  const [tab, setTab] = useState<'quests' | 'gyms'>('quests');

  return (
    <>
      <div className="ds-row">
        <PillButton active={tab === 'quests'} onClick={() => setTab('quests')}>
          Quêtes et chapitres
        </PillButton>
        <PillButton active={tab === 'gyms'} onClick={() => setTab('gyms')}>
          Arènes et badges
        </PillButton>
      </div>
      {tab === 'quests' ? <QuestsSection /> : <GymsSection />}
    </>
  );
}
