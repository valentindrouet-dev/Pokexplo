import type { ContentBundle } from '../types';
import { deepClone } from '../utils/clone';
import { ContentService } from './ContentService';

/**
 * PUBLICATION DU CONTENU SUR LE SITE (CONCEPTION §91, §97).
 *
 * « Contenu » et « code » suivent deux chemins distincts. Le contenu voyage
 * dans un seul fichier, `public/content/bundle.json` : des qu'il change dans le
 * depot, la CI reconstruit le site et TOUS les appareils — l'iPad de l'enfant
 * compris — recuperent la nouveaute sans qu'un adulte y touche.
 *
 * Ce service sait faire ce depot de deux facons :
 *  - fabriquer le fichier a telecharger, a deposer soi-meme dans le depot ;
 *  - l'ecrire directement via l'API GitHub, depuis l'ordinateur du parent.
 *
 * Le jeton GitHub n'entre JAMAIS dans le depot ni dans une release : il reste
 * dans le navigateur de l'ordinateur qui publie (CLAUDE.md §2 — aucun secret
 * dans Git).
 */
export const SITE_BUNDLE_PATH = 'public/content/bundle.json';

const TOKEN_KEY = 'pokexplo.github.token';
const TARGET_KEY = 'pokexplo.github.target';

export interface GitHubTarget {
  /** Proprietaire du depot, par exemple « valentindrouet-dev ». */
  owner: string;
  /** Nom du depot, par exemple « Pokexplo ». */
  repo: string;
  /** Branche a modifier. Vide = branche par defaut du depot. */
  branch: string;
}

export interface SitePublishResult {
  contentVersion: string;
  commitUrl: string | null;
}

/** Encodage base64 d'un texte UTF-8, sans depasser la pile sur un gros contenu. */
function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocal(key: string, value: string | null): void {
  try {
    if (value === null || value === '') localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Navigation privee : la publication reste possible, sans memoriser.
  }
}

class SitePublishServiceImpl {
  /**
   * Estampille le contenu avant de l'envoyer sur le site.
   *
   * Sans un `contentVersion` NEUF, l'iPad ne verrait aucune difference et
   * garderait l'ancienne aventure : c'est ce numero, et lui seul, qui declenche
   * la mise a jour automatique (`ContentService.siteUpdateAvailable`).
   */
  stamp(bundle: ContentBundle, now = Date.now()): ContentBundle {
    const stamp = new Date(now).toISOString().replace(/[:.]/gu, '-');
    return { ...deepClone(bundle), contentVersion: `site-${stamp}`, createdAt: now };
  }

  /** Le fichier exact a deposer dans le depot. */
  serialize(bundle: ContentBundle): string {
    return `${JSON.stringify(bundle, null, 2)}\n`;
  }

  /** Refuse un contenu casse : il rendrait le jeu injouable sur tous les appareils. */
  assertPublishable(bundle: ContentBundle): void {
    const blocking = ContentService.validate(bundle).issues.filter(
      (issue) => issue.level === 'ERROR',
    );
    if (blocking.length === 0) return;
    throw new Error(
      `Publication impossible : ${blocking.length} erreur(s) de contenu.\n` +
        blocking
          .slice(0, 5)
          .map((issue) => `• ${issue.message}`)
          .join('\n'),
    );
  }

  /**
   * Depot GitHub devine depuis l'adresse du site.
   * `https://<owner>.github.io/<repo>/` couvre le cas de GitHub Pages.
   */
  guessTarget(): GitHubTarget {
    const stored = readLocal(TARGET_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Partial<GitHubTarget>;
        return {
          owner: parsed.owner ?? '',
          repo: parsed.repo ?? '',
          branch: parsed.branch ?? '',
        };
      } catch {
        // Valeur illisible : on repart de la deduction.
      }
    }

    const empty: GitHubTarget = { owner: '', repo: '', branch: '' };
    if (typeof window === 'undefined') return empty;

    const host = window.location.hostname.match(/^([^.]+)\.github\.io$/iu);
    const base = (import.meta.env.BASE_URL || '/').replace(/^\/+|\/+$/gu, '');
    if (!host) return empty;
    return { owner: host[1] ?? '', repo: base, branch: '' };
  }

  saveTarget(target: GitHubTarget): void {
    writeLocal(TARGET_KEY, JSON.stringify(target));
  }

  /** Le jeton reste sur CET ordinateur : il n'est jamais envoye ailleurs qu'a GitHub. */
  readToken(): string {
    return readLocal(TOKEN_KEY) ?? '';
  }

  saveToken(token: string): void {
    writeLocal(TOKEN_KEY, token.trim());
  }

  forgetToken(): void {
    writeLocal(TOKEN_KEY, null);
  }

  /**
   * Ecrit `public/content/bundle.json` dans le depot.
   *
   * La CI prend le relais : build, deploiement, puis mise a jour automatique
   * sur l'iPad. On ne touche a aucun autre fichier.
   */
  async publishToGitHub(
    bundle: ContentBundle,
    target: GitHubTarget,
    token: string,
  ): Promise<SitePublishResult> {
    if (!target.owner || !target.repo) {
      throw new Error('Indiquez le propriétaire et le nom du dépôt GitHub.');
    }
    if (!token) throw new Error('Aucun jeton GitHub enregistré sur cet ordinateur.');

    this.assertPublishable(bundle);
    const stamped = this.stamp(bundle);
    const url = `https://api.github.com/repos/${encodeURIComponent(target.owner)}/${encodeURIComponent(target.repo)}/contents/${SITE_BUNDLE_PATH}`;
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    };
    const query = target.branch ? `?ref=${encodeURIComponent(target.branch)}` : '';

    // Le fichier existe deja : GitHub exige son `sha` pour eviter d'ecraser
    // une modification faite entre-temps.
    let sha: string | undefined;
    const existing = await fetch(`${url}${query}`, { headers });
    if (existing.ok) {
      sha = ((await existing.json()) as { sha?: string }).sha;
    } else if (existing.status === 401 || existing.status === 403) {
      throw new Error(
        'GitHub refuse le jeton. Vérifiez qu’il autorise « Contents : Read and write » sur ce dépôt.',
      );
    } else if (existing.status !== 404) {
      throw new Error(`GitHub a répondu ${existing.status} en lisant le fichier.`);
    }

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message: `Contenu Pokexplo — ${stamped.contentVersion}`,
        content: toBase64(this.serialize(stamped)),
        ...(sha ? { sha } : {}),
        ...(target.branch ? { branch: target.branch } : {}),
      }),
    });

    if (!response.ok) {
      const detail = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(detail?.message ?? `GitHub a répondu ${response.status}.`);
    }

    const created = (await response.json()) as { commit?: { html_url?: string } };
    return {
      contentVersion: stamped.contentVersion,
      commitUrl: created.commit?.html_url ?? null,
    };
  }
}

export const SitePublishService = new SitePublishServiceImpl();
