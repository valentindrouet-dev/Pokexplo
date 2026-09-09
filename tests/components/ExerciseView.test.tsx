import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { defaultContentBundle } from '../../src/content/defaultContent';
import { generateExercise } from '../../src/exercise-engine';
import { ExerciseView } from '../../src/features/learning/ExerciseView';
import { AudioService, localBackend, setBackend } from '../../src/services';
import { resetDb } from '../../src/services/db';
import { renderWithProviders } from '../helpers/renderWithProviders';

const bundle = defaultContentBundle();
const template = bundle.exerciseTemplates.find((item) => item.id === 'count-easy')!;
const instance = generateExercise(template, 1234, {
  creatures: bundle.creatures,
  capturedIds: [],
});

const correctLabel =
  instance.choices.find((choice) => choice.id === instance.correctChoiceId)?.label ?? '';
const wrongLabel = instance.choices.find((choice) => choice.id !== instance.correctChoiceId)!.label;

beforeEach(() => {
  resetDb();
  setBackend(localBackend);
  AudioService.reset();
});

describe('Écran d’exercice (CONCEPTION §14, §165-167)', () => {
  it('affiche la consigne, un bouton d’écoute et de très grandes réponses', async () => {
    renderWithProviders(<ExerciseView instance={instance} onSolved={() => undefined} />);

    expect(await screen.findByText(instance.promptText)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /écouter la consigne/iu })).toBeInTheDocument();
    for (const choice of instance.choices) {
      expect(screen.getByRole('button', { name: choice.label })).toBeInTheDocument();
    }
  });

  it('encourage au lieu d’annoncer une mauvaise réponse (§14)', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ExerciseView instance={instance} onSolved={() => undefined} />);

    await user.click(await screen.findByRole('button', { name: wrongLabel }));

    expect(await screen.findByText(instance.hints[0]!.text)).toBeInTheDocument();
    expect(screen.queryByText(/mauvaise réponse/iu)).not.toBeInTheDocument();
    expect(screen.queryByText(/faux/iu)).not.toBeInTheDocument();
  });

  it('donne l’aide renforcée à la deuxième erreur et laisse au moins deux réponses', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ExerciseView instance={instance} onSolved={() => undefined} />);

    await user.click(await screen.findByRole('button', { name: wrongLabel }));
    await user.click(screen.getByRole('button', { name: wrongLabel }));

    expect(await screen.findByText(instance.hints[1]!.text)).toBeInTheDocument();

    const disabled = instance.choices.filter(
      (choice) =>
        screen.getByRole('button', { name: choice.label }).getAttribute('data-state') === 'removed',
    );
    expect(instance.choices.length - disabled.length).toBeGreaterThanOrEqual(2);
    expect(
      screen.getByRole('button', { name: correctLabel }).getAttribute('data-state'),
    ).not.toBe('removed');
  });

  it('signale la réussite du premier coup', async () => {
    const user = userEvent.setup();
    const onSolved = vi.fn();
    renderWithProviders(<ExerciseView instance={instance} onSolved={onSolved} />);

    await user.click(await screen.findByRole('button', { name: correctLabel }));

    await waitFor(() => expect(onSolved).toHaveBeenCalledTimes(1), { timeout: 3000 });
    expect(onSolved.mock.calls[0]?.[0]).toMatchObject({ attempts: 1, outcome: 'FIRST_TRY' });
  });

  it('compte une réussite après aide comme « assistée »', async () => {
    const user = userEvent.setup();
    const onSolved = vi.fn();
    renderWithProviders(<ExerciseView instance={instance} onSolved={onSolved} />);

    await user.click(await screen.findByRole('button', { name: wrongLabel }));
    await user.click(screen.getByRole('button', { name: correctLabel }));

    await waitFor(() => expect(onSolved).toHaveBeenCalledTimes(1), { timeout: 3000 });
    expect(onSolved.mock.calls[0]?.[0]).toMatchObject({ outcome: 'ASSISTED' });
  });

  it('reste utilisable quand le son est coupé (§127)', async () => {
    const user = userEvent.setup();
    AudioService.mute();
    const onSolved = vi.fn();
    renderWithProviders(<ExerciseView instance={instance} onSolved={onSolved} />);

    await user.click(await screen.findByRole('button', { name: correctLabel }));
    await waitFor(() => expect(onSolved).toHaveBeenCalled(), { timeout: 3000 });
  });
});
