import Sheet from '../components/Sheet'
import { setSetting, type Settings, type ThemePref } from '../lib/settings'
import { isIOS, useInstall } from '../lib/install'
import { QUOTES } from '../data/quotes'

export default function SettingsSheet({ open, onClose, settings }: { open: boolean; onClose: () => void; settings: Settings }) {
  const install = useInstall()
  return (
    <Sheet open={open} onClose={onClose} title="Settings">
      <div className="space-y-6">
        <div>
          <label className="label">Your name</label>
          <input className="input" defaultValue={settings.name} onBlur={(e) => setSetting('name', e.target.value.trim())} />
        </div>
        <div>
          <label className="label">Appearance</label>
          <div className="grid grid-cols-3 gap-2">
            {(['light', 'dark', 'system'] as ThemePref[]).map((t) => (
              <button key={t} onClick={() => setSetting('theme', t)}
                className={`rounded-2xl py-3 font-extrabold capitalize ${settings.theme === t ? 'bg-saffron-500 text-white' : 'bg-gray-100 dark:bg-ink-700'}`}>
                {t === 'light' ? '☀️ ' : t === 'dark' ? '🌙 ' : '📱 '}{t === 'system' ? 'Auto' : t}
              </button>
            ))}
          </div>
        </div>
        {!install.installed && (
          <div className="rounded-3xl bg-orange-50 p-4 dark:bg-ink-900">
            <p className="font-extrabold">📲 Put Arise on your home screen</p>
            {install.canPrompt ? (
              <button onClick={install.prompt} className="btn-primary mt-3 w-full">Install app</button>
            ) : isIOS() ? (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">In Safari, tap the <b>Share</b> button (square with an arrow), then <b>Add to Home Screen</b>.</p>
            ) : (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">In Chrome, tap the <b>⋮</b> menu, then <b>Install app</b> or <b>Add to Home screen</b>.</p>
            )}
          </div>
        )}
        <p className="text-center text-xs font-semibold text-gray-400">
          Arise v0.1 · Phase 1 · {QUOTES.length} quotes of Swami Vivekananda<br />Your data is stored only on this device.
        </p>
      </div>
    </Sheet>
  )
}
