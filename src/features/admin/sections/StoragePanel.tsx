import { useCallback, useEffect, useState } from 'react';
import { StorageService, type StorageReport } from '../../../services';
import { IconWarning, ProgressBar, SecondaryButton, SoftPanel } from '../../../ui';
import { formatBytes } from '../../../utils/text';

/**
 * STOCKAGE DE L'APPAREIL.
 *
 * Il n'existe pas de limite unique : chaque navigateur calcule un quota a
 * partir de l'espace libre du disque. On MESURE donc le quota reel de
 * l'appareil ouvert plutot que d'annoncer un chiffre qui serait faux ailleurs.
 */
export function StoragePanel() {
  const [report, setReport] = useState<StorageReport | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setReport(await StorageService.report());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const askPersistence = async (): Promise<void> => {
    setBusy(true);
    await StorageService.requestPersistence();
    await refresh();
    setBusy(false);
  };

  return (
    <SoftPanel title="Stockage sur cet appareil" className="ds-stack">
      {!report || !report.supported ? (
        <p className="admin__status">
          Ce navigateur n’indique pas la place disponible. Les sauvegardes restent enregistrées
          normalement.
        </p>
      ) : (
        <>
          <p>
            {formatBytes(report.usage ?? 0)} utilisés
            {report.quota !== null ? ` sur ${formatBytes(report.quota)} accordés à Pokexplo` : ''}.
          </p>
          {report.ratio !== null ? (
            <ProgressBar value={report.ratio} label="Occupation du stockage" />
          ) : null}
          <p className="admin__status">
            Il n’y a pas de limite fixe : le navigateur accorde une part de l’espace libre du
            disque (environ 20 % sur iPad, davantage sur ordinateur). Le contenu texte pèse
            quelques centaines de kilo-octets ; ce sont les voix enregistrées et les images
            importées qui occupent la place.
          </p>

          {report.persisted ? (
            <p className="admin__status">
              Stockage persistant accordé : le navigateur s’engage à ne pas effacer les
              sauvegardes.
            </p>
          ) : (
            <>
              <p className="admin__issue">
                <IconWarning size={22} />
                <span>
                  Stockage non persistant. Sur iPad, Safari peut effacer les données d’un site
                  non ajouté à l’écran d’accueil après sept jours sans visite. Ajoutez Pokexplo à
                  l’écran d’accueil, puis demandez la persistance ici.
                </span>
              </p>
              <div className="ds-row">
                <SecondaryButton disabled={busy} onClick={() => void askPersistence()}>
                  Demander le stockage persistant
                </SecondaryButton>
              </div>
            </>
          )}
        </>
      )}
    </SoftPanel>
  );
}
