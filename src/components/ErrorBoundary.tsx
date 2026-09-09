import { Component, type ErrorInfo, type ReactNode } from 'react';
import { PrimaryButton, SoftPanel } from '../ui';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Filet de securite : une erreur inattendue ne doit jamais laisser un ecran
 * blanc a un enfant de cinq ans. On propose une action simple et rassurante.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[pokexplo]', error, info.componentStack);
  }

  override render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <div className="error-boundary">
        <SoftPanel title="Oups, un petit souci" padding="roomy">
          <p>L’aventure a été mise en pause. Ta progression est enregistrée.</p>
          <PrimaryButton large onClick={() => window.location.reload()}>
            Reprendre l’aventure
          </PrimaryButton>
        </SoftPanel>
      </div>
    );
  }
}
