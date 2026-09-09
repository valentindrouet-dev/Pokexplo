import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VoiceTextEditor } from '../../src/features/admin/VoiceTextEditor';
import { AssetService, localBackend, setBackend } from '../../src/services';
import { resetDb } from '../../src/services/db';
import { createVoiceMessage } from '../../src/utils/voice';
import { textHash } from '../../src/utils/hash';
import type { VoiceMessage } from '../../src/types';
import { installMediaRecorder, installMicrophone } from '../audio/mediaMocks';

/** Le composant est controle : le test tient l'etat, comme le fait l'Admin. */
function Harness({ initial }: { initial: VoiceMessage }) {
  const [voice, setVoice] = useState(initial);
  return <VoiceTextEditor title="Dialogue du Professeur" voice={voice} onChange={setVoice} />;
}

beforeEach(() => {
  resetDb();
  setBackend(localBackend);
  AssetService.invalidate();
  installMediaRecorder();
  installMicrophone(true);
});

describe('VoiceTextEditor (CONCEPTION §38-42, §62-63)', () => {
  it('affiche le texte et le statut « voix manquante »', () => {
    render(<Harness initial={createVoiceMessage('voice.p', 'Bravo !', 'professor')} />);
    expect(screen.getByDisplayValue('Bravo !')).toBeInTheDocument();
    expect(screen.getByText('Voix manquante')).toBeInTheDocument();
  });

  it('ne demande JAMAIS le micro tant que l’administrateur n’a pas cliqué (§62)', () => {
    render(<Harness initial={createVoiceMessage('voice.p', 'Bravo !', 'professor')} />);
    expect(vi.mocked(navigator.mediaDevices.getUserMedia)).not.toHaveBeenCalled();
  });

  it('enregistre, affiche le prompteur, puis propose la préécoute (§39-41)', async () => {
    const user = userEvent.setup();
    render(
      <Harness
        initial={createVoiceMessage('voice.p', 'Nous voilà dans la forêt !', 'adventure')}
      />,
    );

    await user.click(screen.getByRole('button', { name: /enregistrer la voix/iu }));

    // Prompteur : le texte est affiche en tres grand pendant la prise.
    const prompter = await screen.findByRole('dialog', { name: /enregistrement en cours/iu });
    expect(prompter).toHaveTextContent('Nous voilà dans la forêt !');
    expect(prompter).toHaveTextContent(/00:0\d/u);
    expect(vi.mocked(navigator.mediaDevices.getUserMedia)).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /terminer/iu }));

    expect(await screen.findByRole('button', { name: /préécouter/iu })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /utiliser cette prise/iu })).toBeInTheDocument();
  });

  it('associe la prise validée et marque la voix comme valide (§42)', async () => {
    const user = userEvent.setup();
    render(<Harness initial={createVoiceMessage('voice.p', 'Bravo !', 'professor')} />);

    await user.click(screen.getByRole('button', { name: /enregistrer la voix/iu }));
    await user.click(await screen.findByRole('button', { name: /terminer/iu }));
    await user.click(await screen.findByRole('button', { name: /utiliser cette prise/iu }));

    expect(await screen.findByText('Voix valide')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^écouter$/iu })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /recommencer/iu })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /supprimer/iu })).toBeInTheDocument();
  });

  it('conserve l’ancienne prise tant que la nouvelle n’est pas validée (§42)', async () => {
    const user = userEvent.setup();
    render(
      <Harness
        initial={createVoiceMessage('voice.p', 'Bravo !', 'professor', {
          audioPath: 'media/voice/professor/ancienne.m4a',
          mimeType: 'audio/mp4',
          duration: 2,
          textHash: textHash('Bravo !'),
        })}
      />,
    );

    await user.click(screen.getByRole('button', { name: /recommencer/iu }));
    await user.click(await screen.findByRole('button', { name: /terminer/iu }));

    // Les deux options sont proposees : on ne detruit rien automatiquement.
    expect(await screen.findByRole('button', { name: /utiliser la nouvelle/iu })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /garder l’ancienne/iu })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /garder l’ancienne/iu }));
    expect(screen.getByText(/Voix enregistrée/u)).toBeInTheDocument();
    expect(screen.getByText('Voix valide')).toBeInTheDocument();
  });

  it('avertit quand le texte a été modifié après l’enregistrement (§50)', async () => {
    const user = userEvent.setup();
    render(
      <Harness
        initial={createVoiceMessage('voice.p', 'Bravo !', 'professor', {
          audioPath: 'media/voice/professor/prise.m4a',
          mimeType: 'audio/mp4',
          duration: 1.5,
          textHash: textHash('Bravo !'),
        })}
      />,
    );

    expect(screen.getByText('Voix valide')).toBeInTheDocument();

    const textarea = screen.getByDisplayValue('Bravo !');
    await user.type(textarea, ' Tu as trouvé !');

    expect(await screen.findByText(/le texte a été modifié/iu)).toBeInTheDocument();
    expect(screen.getByText('Voix obsolète')).toBeInTheDocument();
  });

  it('ne plante pas si le micro est refusé et propose une solution (§63)', async () => {
    const user = userEvent.setup();
    installMicrophone(false);
    render(<Harness initial={createVoiceMessage('voice.p', 'Bravo !', 'professor')} />);

    await user.click(screen.getByRole('button', { name: /enregistrer la voix/iu }));

    expect(await screen.findByText(/accès au microphone refusé/iu)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /réessayer/iu })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /importer un fichier/iu })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('permet d’annuler une prise en cours sans rien écrire (§119)', async () => {
    const user = userEvent.setup();
    render(<Harness initial={createVoiceMessage('voice.p', 'Bravo !', 'professor')} />);

    await user.click(screen.getByRole('button', { name: /enregistrer la voix/iu }));
    await user.click(await screen.findByRole('button', { name: /annuler/iu }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Voix manquante')).toBeInTheDocument();
  });

  it('propose les réglages de lecture du bloc (§49)', async () => {
    const user = userEvent.setup();
    render(<Harness initial={createVoiceMessage('voice.p', 'Bravo !', 'professor')} />);

    const autoPlay = screen.getByRole('button', { name: /lecture auto/iu });
    expect(autoPlay).toHaveAttribute('aria-pressed', 'true');
    await user.click(autoPlay);
    expect(screen.getByRole('button', { name: /lecture auto/iu })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('importe un fichier audio préparé ailleurs (§43)', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Harness initial={createVoiceMessage('voice.p', 'Bravo !', 'professor')} />,
    );

    const input = container.querySelector('input[type="file"]');
    expect(input).not.toBeNull();
    await user.upload(input as HTMLInputElement, new File(['son'], 'prise.m4a', { type: 'audio/mp4' }));

    expect(await screen.findByText(/nouvelle prise/iu)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /utiliser cette prise/iu }));
    expect(await screen.findByText('Voix valide')).toBeInTheDocument();
  });
});
