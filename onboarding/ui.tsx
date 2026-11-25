'use client'
/*
 * The wizard's building blocks: a question block, option cards, segmented
 * buttons, chips, radios, and text inputs. Class names are the prototype's;
 * onboarding.css styles them in the site's colours.
 */
import { type ButtonHTMLAttributes, type ReactNode, useEffect, useId, useRef, useState } from 'react'

/**
 * A pill, built like the site's Button: the label, a second copy that the
 * solid pill cross-fades to as it blooms, and the ring an outline pill draws.
 */
export function Btn({ variant = 'primary', small, children, className, ...rest }: {
  variant?: 'primary' | 'outline'; small?: boolean; children: ReactNode
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" {...rest} className={['btn', variant === 'primary' ? 'btn-p' : 'btn-g', small && 'btn-s', className].filter(Boolean).join(' ')}>
      <span className="btn__label">{children}</span>
      <span className="btn__ghost" aria-hidden="true">{children}</span>
      <span className="btn__ring" aria-hidden="true" />
    </button>
  )
}

/**
 * Content that opens and closes rather than appearing: it grows to its height
 * and fades in, and on close plays that backwards before it leaves the page.
 */
export function Reveal({ open, children, className }: { open: boolean; children: ReactNode; className?: string }) {
  const [shown, setShown] = useState(open)
  useEffect(() => { if (open) setShown(true) }, [open])
  if (!shown) return null
  return (
    <div className={['reveal', className].filter(Boolean).join(' ')} data-state={open ? 'open' : 'closing'}
      onAnimationEnd={(e) => { if (!open && e.target === e.currentTarget) setShown(false) }}>
      {children}
    </div>
  )
}

export function Head({ eyebrow, title, why, help, open, onHelp }: {
  eyebrow: string; title: string; why?: string
  help?: ReactNode; open?: boolean | undefined; onHelp?: () => void
}) {
  return (
    <>
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {why && <p className="why">{why}</p>}
      {help && (
        <>
          <button className="help" type="button" onClick={onHelp} aria-expanded={!!open}>
            {open ? 'Hide guidance' : 'Help me decide'}
          </button>
          <Reveal open={!!open}><div className="callout helpbox">{help}</div></Reveal>
        </>
      )}
    </>
  )
}

/**
 * `need` tags a required answer, so Continue can scroll to it and flash it.
 * `oneLine` lets a short hint use the column's full width instead of wrapping.
 */
export function Q({ title, hint, need, oneLine, children }: { title?: string; hint?: string; need?: string; oneLine?: boolean; children: ReactNode }) {
  return (
    <section className="q" data-need={need}>
      {title && <h2>{title}</h2>}
      {hint && <p className={`hint${oneLine ? ' hint--line' : ''}`}>{hint}</p>}
      {children}
    </section>
  )
}

export type Card<V> = { v: V; t: string; d?: string | undefined; eg?: string | undefined }

export function Cards<V extends string | number>({ opts, value, onPick, className = 'choices' }: {
  /** null: nothing chosen yet. */
  opts: Card<V>[]; value: V | null; onPick: (v: V) => void; className?: string
}) {
  return (
    <div className={className}>
      {opts.map((o) => (
        <button key={String(o.v)} type="button" className={`choice${value === o.v ? ' on' : ''}`}
          aria-pressed={value === o.v} onClick={() => onPick(o.v)}>
          <b>{o.t}</b>
          {o.d && <span>{o.d}</span>}
          {o.eg && <span className="eg">{o.eg}</span>}
        </button>
      ))}
    </div>
  )
}

export function Seg<V extends string>({ opts, value, onPick }: {
  /** null: nothing chosen yet. */
  opts: [V, string][]; value: string | null; onPick: (v: V) => void
}) {
  return (
    <div className="seg" role="group">
      {opts.map(([v, l]) => (
        <button key={v} type="button" className={value === v ? 'on' : ''} aria-pressed={value === v} onClick={() => onPick(v)}>
          {l}
        </button>
      ))}
    </div>
  )
}

/** Toggle chips. `ranked` numbers the picked ones in the order they were picked. */
export function ChipToggle({ list, value, onToggle, ranked }: {
  list: string[] | [string, string][]; value: string[]; onToggle: (v: string) => void; ranked?: boolean
}) {
  return (
    <div className="chips">
      {list.map((item) => {
        const [v, l] = typeof item === 'string' ? [item, item] : item
        const k = value.indexOf(v)
        return (
          <button key={v} type="button" className={`chip${k > -1 ? ' on' : ''}`} aria-pressed={k > -1} onClick={() => onToggle(v)}>
            {ranked && k > -1 && <span className="n" aria-label={`choice ${k + 1}:`}>{k + 1}</span>}
            {l}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Pick from a list by typing: picked items show as removable chips (numbered
 * when the order matters), and a search box suggests the rest.
 */
export function Picker({ options, value, onChange, max, ranked, placeholder = 'Search to add' }: {
  options: string[]; value: string[]; onChange: (next: string[]) => void; max?: number; ranked?: boolean; placeholder?: string
}) {
  const id = useId()
  const [draft, setDraft] = useState('')
  const left = options.filter((o) => o && !value.includes(o))
  const full = max !== undefined && value.length >= max
  const take = (v: string) => {
    const hit = left.find((o) => o.toLowerCase() === v.trim().toLowerCase())
    if (hit && !full) { onChange([...value, hit]); setDraft('') }
    return !!hit && !full
  }
  /* A full name typed but not yet added counts when the spa moves on. */
  usePendingAdd(() => take(draft))
  return (
    <div className="picker">
      {value.length > 0 && (
        <div className="chips">
          {value.map((v, i) => (
            <span key={v} className="chip x on">
              {ranked && <span className="n">{i + 1}</span>}
              {v}
              <button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(value.filter((x) => x !== v))}>×</button>
            </span>
          ))}
        </div>
      )}
      {full ? <p className="note">That’s the most you can add ({max}). Remove one to add another.</p> : (
        <>
          <input className="in" list={id} value={draft} placeholder={placeholder} aria-label={placeholder} autoComplete="off"
            style={{ maxWidth: 420, marginTop: value.length ? 10 : 0 }}
            onChange={(e) => {
              setDraft(e.target.value)
              /* Add straight away only when the option was picked from the list, not
                 typed: typing "Lip filler" mustn't add it before "Lip filler dissolve". */
              const how = (e.nativeEvent as InputEvent).inputType
              if ((!how || how === 'insertReplacementText') && left.includes(e.target.value)) take(e.target.value)
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); take(draft) } }} />
          <datalist id={id}>{left.map((o) => <option key={o} value={o} />)}</datalist>
        </>
      )}
    </div>
  )
}

export function Select<V extends string | number>({ opts, value, onPick, label }: {
  opts: [V, string][]; value: V; onPick: (v: V) => void; label: string
}) {
  return (
    <select className="in" aria-label={label} value={String(value)}
      onChange={(e) => { const hit = opts.find(([v]) => String(v) === e.target.value); if (hit) onPick(hit[0]) }}>
      {opts.map(([v, l]) => <option key={String(v)} value={String(v)}>{l}</option>)}
    </select>
  )
}

export function Radios({ name, opts, value, onPick }: {
  /** null: nothing chosen yet. */
  name: string; opts: [string, string][]; value: string | null; onPick: (v: string) => void
}) {
  return (
    <div className="radios" role="radiogroup">
      {opts.map(([v, l]) => (
        <label key={v} className="check">
          <input type="radio" name={name} value={v} checked={value === v} onChange={() => onPick(v)} />
          {l}
        </label>
      ))}
    </div>
  )
}

/**
 * A text box. `onCommit` runs once when the spa leaves the box having changed
 * it, with the value from when they entered: for renames other answers follow,
 * so a half-typed name never touches them.
 */
export function Text({ value, onChange, onCommit, placeholder, area, id, label, type }: {
  value: string; onChange: (v: string) => void; onCommit?: (from: string, to: string) => void
  placeholder?: string; area?: boolean; id?: string; label?: string; type?: 'text' | 'email' | 'date' | 'url'
}) {
  const start = useRef(value)
  const commit = {
    onFocus: () => { start.current = value },
    onBlur: () => { if (onCommit && start.current !== value) onCommit(start.current, value) },
  }
  return area
    ? <textarea className="in" id={id} aria-label={label} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} {...commit} />
    : <input className="in" id={id} type={type} aria-label={label} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} {...commit} />
}

export function Field({ label, children, note, need }: { label: string; children: ReactNode; note?: string; need?: string }) {
  return (
    <div className="field" data-need={need}>
      <label>{label}</label>
      {note && <span className="note" style={{ margin: 0 }}>{note}</span>}
      {children}
    </div>
  )
}

/*
 * Text typed into an "add" box but not added yet. Moving on (Continue, Back,
 * the menus) adds it first, so nothing typed is lost. Adding on blur instead
 * would shift the page under the pointer and swallow the click.
 */
const pendingAdds = new Set<() => boolean>()
/** Adds whatever is waiting in every "add" box; true if anything was added. */
export function commitPendingAdds(): boolean {
  let any = false
  pendingAdds.forEach((f) => { if (f()) any = true })
  return any
}
/** Registers this box's add, which returns true if it added something. */
export function usePendingAdd(add: () => boolean) {
  const latest = useRef(add)
  latest.current = add
  useEffect(() => {
    const f = () => latest.current()
    pendingAdds.add(f)
    return () => { pendingAdds.delete(f) }
  }, [])
}

/** A list the spa edits: each item removable, and a field to add another. */
export function ChipEdit({ list, onChange, placeholder }: { list: string[]; onChange: (next: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState('')
  const add = () => {
    const t = draft.trim()
    const fresh = !!t && !list.some((x) => x.toLowerCase() === t.toLowerCase())
    if (fresh) onChange([...list, t])
    setDraft('')
    return fresh
  }
  usePendingAdd(add)
  return (
    <>
      {list.length > 0 && (
        <div className="chips">
          {list.map((v, i) => (
            <span key={`${i}${v}`} className="chip x">
              {v}
              <button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(list.filter((_, k) => k !== i))}>×</button>
            </span>
          ))}
        </div>
      )}
      <div className="row" style={{ marginTop: 10 }}>
        <input className="in" style={{ maxWidth: 420 }} value={draft} placeholder={placeholder} aria-label={placeholder}
          onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          />
        <Btn variant="outline" small onClick={add}>Add</Btn>
      </div>
    </>
  )
}

export function Check({ checked, onChange, children, className = 'check' }: {
  checked: boolean; onChange: (v: boolean) => void; children: ReactNode; className?: string
}) {
  return (
    <label className={className}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {children}
    </label>
  )
}

/** A screen's answers as a list, each with a way back to change it. */
export function Summary({ rows, go }: { rows: [string, string, string][]; go: (id: string) => void }) {
  return (
    <dl className="sum">
      {rows.map(([k, v, id]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
          <button type="button" className="link" onClick={() => go(id)}>Edit</button>
        </div>
      ))}
    </dl>
  )
}
