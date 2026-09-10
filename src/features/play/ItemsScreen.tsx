import { IconBadge, SelectionTile, SoftPanel } from '../../ui';
import { useNavigation } from '../../app/router';
import { useScreenVoice } from '../../app/providers/useScreenVoice';
import { SCREEN_VOICES } from '../../content/voices';
import { PlayScreen } from './PlayScreen';

/** Le sac regroupe les récompenses existantes ; aucun inventaire fictif. */
export function ItemsScreen() {
  const { navigate } = useNavigation();
  useScreenVoice(SCREEN_VOICES.items);
  return (
    <PlayScreen scrim="soft">
      <SoftPanel title="Tes objets" padding="roomy">
        <SelectionTile label="Mes badges" icon={<IconBadge size={72} />} onClick={() => navigate({ name: 'badges' })} />
      </SoftPanel>
    </PlayScreen>
  );
}
