import { ImageResponse } from 'next/og';

export const alt = 'Play, Pass & Go — free local pass-and-play property trading game';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
          background: 'linear-gradient(135deg, #020617 0%, #0f172a 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ fontSize: 96 }}>🎲</div>
        <div
          style={{
            fontSize: 88,
            fontWeight: 900,
            letterSpacing: 2,
            color: '#fbbf24',
          }}
        >
          Play, Pass &amp; Go
        </div>
        <div
          style={{
            fontSize: 34,
            color: '#cbd5e1',
            marginTop: 8,
          }}
        >
          Local pass-and-play property trading for desktop &amp; tablet
        </div>
        <div
          style={{
            fontSize: 26,
            color: '#64748b',
            marginTop: 12,
          }}
        >
          Buy · Rent · Trade · Build — 2 to 4 players, one device
        </div>
      </div>
    ),
    { ...size }
  );
}
