import { Download, Monitor, Moon, Sun, Upload } from 'lucide-react'
import Sheet from '../components/Sheet'
import { setSetting, type Settings, type ThemePref } from '../lib/settings'
import { isIOS, useInstall } from '../lib/install'
import { QUOTES } from '../data/quotes'
import { exportData, importData } from '../lib/backup'
import { toast } from '../lib/celebrate'

export default function SettingsSheet({ open, onClose, settings }: { open: boolean; onClose: () => void; settings: Settings }) {
  const install = useInstall()
  const themes: [ThemePref, string, typeof Sun][] = [['light', 'Light', Sun], ['dark', 'Dark', Moon], ['system', 'Auto', Monitor]]
  return (
    <Sheet open={open} onClose={onClose} title="Settings">
      <div className="space-y-7">
        <div>
          <label className="label" htmlFor="set-name">Your name</label>
          <input id="set-name" className="input" defaultValue={settings.name} onBlur={(e) => setSetting('name', e.target.value.trim())} />
        </div>
        <div>
          <span className="label">Appearance</span>
          <div className="seg grid-cols-3">
            {themes.map(([t, l, I]) => (
              <button key={t} onClick={() => setSetting('theme', t)} className={`seg-item inline-flex items-center justify-center gap-1.5 ${settings.theme === t ? 'seg-item-on' : ''}`}><I size={15} />{l}</button>
            ))}
          </div>
        </div>
        {!install.installed && (
          <div className="rounded-xl bg-sunken p-4 text-sm">
            <p className="font-semibold">Install on your home screen</p>
            {install.canPrompt ? <button onClick={install.prompt} className="btn-primary mt-3 w-full">Install Arise</button>
              : isIOS() ? <p className="mt-1 text-muted">In Safari, tap Share, then Add to Home Screen.</p>
              : <p className="mt-1 text-muted">In Chrome, open the menu (three dots), then Install app.</p>}
          </div>
        )}
        <div>
          <span className="label">Backup</span>
          <p className="mb-2 text-xs text-muted">Your data lives only on this phone. Save a backup file now and then, or before changing phones.</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={exportData} className="btn-secondary"><Download size={16} />Save backup</button>
            <label className="btn-secondary cursor-pointer"><Upload size={16} />Restore
              <input type="file" accept="application/json" className="hidden" onChange={async (e) => {
                const f = e.target.files?.[0]; if (!f) return
                try { await importData(await f.text()); toast('Backup restored') } catch { toast('That file is not an Arise backup') }
                e.target.value = ''
              }} />
            </label>
          </div>
        </div>
        <p className="text-center text-xs text-faint">Arise 0.2 · {QUOTES.length} quotes of Swami Vivekananda · Data stored on this device</p>
      </div>
    </Sheet>
  )
}
