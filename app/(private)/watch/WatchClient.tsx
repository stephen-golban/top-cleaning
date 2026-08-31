'use client';

import { useEffect, useState } from 'react';
import { LockKeyhole } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

type State = 'unlocking' | 'ready' | 'denied';

export function WatchClient() {
  const [state, setState] = useState<State>('unlocking');
  const [playbackError, setPlaybackError] = useState(false);

  useEffect(() => {
    const secret = window.location.hash.slice(1);
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    if (!secret) {
      queueMicrotask(() => setState('ready'));
      return;
    }
    void fetch('/api/video-session', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret }),
    }).then((response) => setState(response.ok ? 'ready' : 'denied'), () => setState('denied'));
  }, []);

  return (
    <main className="private-page">
      <Link href="/" className="private-brand"><Image src="/logo.svg" alt="Top Cleaning" width="360" height="64" /></Link>
      <section className="private-panel" aria-labelledby="private-video-title">
        <div className="private-heading"><LockKeyhole aria-hidden="true" /><div><p>Acces privat</p><h1 id="private-video-title">Cum lucrăm</h1></div></div>
        {state === 'unlocking' ? <p>Deschidem videoclipul privat…</p> : null}
        {state === 'denied' ? <p>Acest link privat nu este valid sau a fost înlocuit.</p> : null}
        {state === 'ready' ? (
          <>
            <video controls controlsList="nodownload" playsInline preload="metadata" src="/api/private-video" onError={() => setPlaybackError(true)}>
              <track kind="captions" src="/private-empty-captions.vtt" srcLang="ro" label="Română" default />
              Browserul tău nu acceptă redarea video.
            </video>
            {playbackError ? <p>Este posibil ca sesiunea să fi expirat sau videoclipul să nu fi fost încărcat încă.</p> : null}
          </>
        ) : null}
      </section>
    </main>
  );
}
