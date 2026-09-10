import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AudioService, localBackend, setBackend } from '../../src/services';
import { resetDb } from '../../src/services/db';
import { createVoiceMessage } from '../../src/utils/voice';
import { VoiceList } from '../../src/features/admin/VoiceList';

/**
 * LES VOIX EN SOUS-MENUS DÉPLIABLES (§196, §191).
 *
 * Ce que ces tests tiennent : on ne voit pas cent quatre-vingts lignes d'un
 * coup, on ouvre ce qu'on cherche, et un seul enregistreur est ouvert à la fois.
 */
beforeEach(() => {
  resetDb();
  setBackend(localBackend);
  AudioService.reset();
});

const voices = [
  createVoiceMessage('voice.professor.a', 'Bonjour, je suis le Professeur.', 'professor'),
  createVoiceMessage('voice.professor.b', 'Touche la carte pour partir.', 'professor'),
  createVoiceMessage('voice.ui.a', 'Voici tes badges !', 'ui'),
];

describe('VoiceList', () => {
  it('montre les sections repliées, pas les textes', () => {
    render(<VoiceList voices={voices} onChange={() => undefined} />);

    expect(screen.getByRole('button', { name: 'Le Professeur' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.getByRole('button', { name: 'Les écrans et les boutons' })).toBeInTheDocument();
    // Replié : le texte du Professeur n'est pas encore là.
    expect(screen.queryByRole('button', { name: /Bonjour, je suis le Professeur/u })).toBeNull();
  });

  it('annonce ce qu’il reste à enregistrer dans chaque section', () => {
    render(<VoiceList voices={voices} onChange={() => undefined} />);
    expect(screen.getByText('2 à enregistrer · 2 voix')).toBeInTheDocument();
  });

  it('ouvre une section, puis l’enregistreur sous le texte concerné', async () => {
    const user = userEvent.setup();
    render(<VoiceList voices={voices} onChange={() => undefined} />);

    await user.click(screen.getByRole('button', { name: 'Le Professeur' }));
    const row = screen.getByRole('button', { name: /Bonjour, je suis le Professeur/u });
    expect(screen.queryByRole('button', { name: 'Enregistrer la voix' })).toBeNull();

    await user.click(row);
    expect(screen.getAllByRole('button', { name: 'Enregistrer la voix' })).toHaveLength(1);
  });

  it('n’ouvre jamais deux enregistreurs à la fois (§191)', async () => {
    const user = userEvent.setup();
    render(<VoiceList voices={voices} onChange={() => undefined} />);

    await user.click(screen.getByRole('button', { name: 'Le Professeur' }));
    await user.click(screen.getByRole('button', { name: /Bonjour, je suis le Professeur/u }));
    await user.click(screen.getByRole('button', { name: /Touche la carte pour partir/u }));

    expect(screen.getAllByRole('button', { name: 'Enregistrer la voix' })).toHaveLength(1);
    // C'est bien le second texte qui est ouvert.
    expect(screen.getByRole('button', { name: /Touche la carte pour partir/u })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('modifie le texte à l’endroit où il est lu', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<VoiceList voices={[voices[2]]} onChange={onChange} grouped={false} openFirst />);

    const area = screen.getByRole('textbox');
    await user.type(area, ' !');
    expect(onChange).toHaveBeenCalled();
  });

  it('le dit quand il n’y a rien, au lieu d’afficher un vide', () => {
    render(<VoiceList voices={[]} onChange={() => undefined} emptyLabel="Rien ici." />);
    expect(screen.getByText('Rien ici.')).toBeInTheDocument();
  });
});
