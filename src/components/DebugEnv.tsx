/**
 * Debug Component - Shows environment variables status
 * Import this in your app to verify Vite is loading .env.local correctly
 * 
 * Usage: Add <DebugEnv /> anywhere in your app (temporary, remove after debugging)
 */

export function DebugEnv() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const hasAnonKey = !!import.meta.env.VITE_SUPABASE_ANON_KEY;
  const realtimeEnabled = import.meta.env.VITE_ENABLE_REALTIME;
  const mode = import.meta.env.MODE;
  const isDev = import.meta.env.DEV;

  const allEnvVars = import.meta.env;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        background: 'rgba(0, 0, 0, 0.9)',
        color: '#fff',
        padding: '20px',
        borderRadius: '8px',
        maxWidth: '400px',
        fontSize: '12px',
        zIndex: 9999,
        fontFamily: 'monospace',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      }}
    >
      <div style={{ marginBottom: '15px', borderBottom: '2px solid #fff', paddingBottom: '10px' }}>
        <strong style={{ fontSize: '14px' }}>🔍 Environment Variables Debug</strong>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <div style={{ color: '#888', fontSize: '10px' }}>MODE</div>
        <div style={{ color: isDev ? '#4CAF50' : '#FFC107' }}>
          {mode} {isDev ? '(Development)' : '(Production)'}
        </div>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <div style={{ color: '#888', fontSize: '10px' }}>VITE_SUPABASE_URL</div>
        <div style={{ color: supabaseUrl ? '#4CAF50' : '#f44336' }}>
          {supabaseUrl ? (
            <>
              ✅ {supabaseUrl}
              {supabaseUrl.includes('your-project-id') && (
                <div style={{ color: '#f44336', marginTop: '5px' }}>
                  ⚠️ Still using placeholder!
                </div>
              )}
            </>
          ) : (
            '❌ NOT SET'
          )}
        </div>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <div style={{ color: '#888', fontSize: '10px' }}>VITE_SUPABASE_ANON_KEY</div>
        <div style={{ color: hasAnonKey ? '#4CAF50' : '#f44336' }}>
          {hasAnonKey ? '✅ SET (Hidden)' : '❌ NOT SET'}
        </div>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <div style={{ color: '#888', fontSize: '10px' }}>VITE_ENABLE_REALTIME</div>
        <div style={{ color: realtimeEnabled === 'true' ? '#4CAF50' : '#888' }}>
          {realtimeEnabled === 'true' ? '✅ Enabled' : '⚠️ Disabled or not set'}
        </div>
      </div>

      <details style={{ marginTop: '15px', cursor: 'pointer' }}>
        <summary style={{ color: '#888', fontSize: '10px', cursor: 'pointer' }}>
          Show All Env Vars
        </summary>
        <pre
          style={{
            marginTop: '10px',
            background: '#000',
            padding: '10px',
            borderRadius: '4px',
            fontSize: '10px',
            overflow: 'auto',
            maxHeight: '200px',
          }}
        >
          {JSON.stringify(allEnvVars, null, 2)}
        </pre>
      </details>

      <div style={{ marginTop: '15px', paddingTop: '10px', borderTop: '1px solid #444', fontSize: '10px', color: '#888' }}>
        💡 If values are missing:
        <br />
        1. Check .env.local exists
        <br />
        2. Restart dev server (Ctrl+C, npm run dev)
        <br />
        3. Hard refresh browser (Ctrl+Shift+R)
      </div>
    </div>
  );
}
