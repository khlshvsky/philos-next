'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { BOOKS, ERA_ORDER, ERA_META } from '@/lib/books'

const DONE_KEY = 'philos-done-v2'

function useProgress() {
  const [done, setDone] = useState<Set<number>>(new Set())
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DONE_KEY)
      if (raw) setDone(new Set(JSON.parse(raw)))
    } catch {}
  }, [])
  const toggle = (n: number) => {
    setDone(prev => {
      const next = new Set(prev)
      if (next.has(n)) next.delete(n); else next.add(n)
      try { localStorage.setItem(DONE_KEY, JSON.stringify([...next])) } catch {}
      return next
    })
  }
  return { done, toggle }
}

export default function HomePage() {
  const { done, toggle } = useProgress()
  const [era, setEra] = useState('all')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return BOOKS.filter(b => {
      const eraMatch = era === 'all' || b.era === era
      const textMatch = !q || b.t.toLowerCase().includes(q) || b.a.toLowerCase().includes(q)
      return eraMatch && textMatch
    })
  }, [era, query])

  const eras = ERA_ORDER.filter(e => filtered.some(b => b.era === e))
  const doneCount = done.size
  const totalHours = BOOKS.filter(b => done.has(b.n)).reduce((s, b) => s + b.h, 0)
  const leftHours = BOOKS.filter(b => !done.has(b.n)).reduce((s, b) => s + b.h, 0)
  const pct = Math.round(doneCount / BOOKS.length * 100)

  return (
    <div>
      {/* Hero */}
      <div style={{ position: 'relative', width: '100%', height: 'clamp(280px, 40vw, 480px)', overflow: 'hidden' }}>
        <img
          src="/philos-next/hero.jpg"
          alt="Своды православного храма"
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%', display: 'block' }}
        />
        {/* dark overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,8,4,0.35) 0%, rgba(10,8,4,0.65) 100%)' }} />

        {/* centered text */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '1.5rem' }}>
          <span style={{ display: 'block', fontSize: 11, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#b8860b', marginBottom: 12 }}>Философский канон</span>
          <h1 style={{ fontFamily: "'EB Garamond', Georgia, serif", fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 700, color: '#fff', lineHeight: 1.1, margin: '0 0 0.75rem', textShadow: '0 2px 20px rgba(0,0,0,0.4)' }}>
            121 главная книга<br />по философии
          </h1>
          <p style={{ fontSize: 'clamp(13px, 2vw, 16px)', color: 'rgba(255,255,255,0.65)', margin: 0, letterSpacing: '0.03em' }}>
            Хронологический порядок · один час в день
          </p>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ background: '#1a1814', color: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
          {[{v:doneCount,l:'прочитано'},{v:BOOKS.length,l:'книг'},{v:totalHours,l:'часов'},{v:leftHours,l:'осталось ч.'}].map((s,i) => (
            <div key={i} style={{ display:'flex',alignItems:'center' }}>
              {i>0 && <div style={{ width:1,height:40,background:'rgba(255,255,255,0.1)' }}/>}
              <div style={{ padding:'0.6rem 1.5rem',textAlign:'center' }}>
                <div style={{ fontFamily:"'EB Garamond', Georgia, serif",fontSize:'1.5rem',color:'#fff',lineHeight:1 }}>{s.v}</div>
                <div style={{ fontSize:9,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.06em',marginTop:3 }}>{s.l}</div>
              </div>
            </div>
          ))}
        </div>
        {/* progress bar */}
        <div style={{ height:3,background:'rgba(255,255,255,0.08)' }}>
          <div style={{ height:'100%',background:'#b8860b',width:`${pct}%`,transition:'width 0.4s' }}/>
        </div>
      </div>

      {/* Sticky controls bar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: '#faf9f6', borderBottom: '1px solid #e4e0d8', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0.75rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <input type="text" placeholder="Поиск по названию или автору…" value={query} onChange={e=>setQuery(e.target.value)}
            style={{ width:'100%',maxWidth:400,padding:'8px 14px',border:'1px solid #e4e0d8',borderRadius:8,background:'#fff',fontFamily:'var(--font-sans)',fontSize:14,color:'#1a1814',outline:'none' }}
          />
          <div style={{ display:'flex',flexWrap:'wrap',gap:6 }}>
            {['all',...ERA_ORDER].map(e => (
              <button key={e} onClick={()=>setEra(e)} style={{ fontSize:12,padding:'4px 13px',borderRadius:20,border:`1px solid ${era===e?'#1a1814':'#e4e0d8'}`,background:era===e?'#1a1814':'#fff',color:era===e?'#f5ecd0':'#4a4640',cursor:'pointer',fontWeight:era===e?500:400 }}>
                {e==='all'?'Все эпохи':e}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main style={{ maxWidth:1100,margin:'0 auto',padding:'1.75rem 1.5rem 4rem' }}>

        {eras.map(eraName => {
          const group = filtered.filter(b => b.era === eraName)
          const meta = ERA_META[eraName as keyof typeof ERA_META]
          const clusters: Array<{groupName?:string;books:typeof group}> = []
          let i = 0
          while (i < group.length) {
            if ((group[i] as any).group) {
              const gName = (group[i] as any).group
              const run: typeof group = []
              while (i < group.length && (group[i] as any).group === gName) run.push(group[i++])
              clusters.push({ groupName: gName, books: run })
            } else {
              const run: typeof group = []
              while (i < group.length && !(group[i] as any).group) run.push(group[i++])
              clusters.push({ books: run })
            }
          }
          return (
            <section key={eraName} style={{ marginBottom:'2.5rem' }}>
              <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:'1rem',paddingBottom:'0.75rem',borderBottom:'1px solid var(--paper-3)' }}>
                <div style={{ width:10,height:10,borderRadius:'50%',background:meta.color,flexShrink:0 }}/>
                <div>
                  <h2 style={{ fontFamily:'var(--font-serif)',fontSize:'1.2rem',fontWeight:400,margin:0 }}>{eraName}</h2>
                  <span style={{ fontSize:11,color:'var(--ink-3)' }}>{meta.dates} · {group.length} книг</span>
                </div>
              </div>
              {clusters.map((cluster,ci) => (
                <div key={ci}>
                  {cluster.groupName && (
                    <div style={{ display:'flex',alignItems:'baseline',gap:10,marginBottom:0,padding:'10px 12px 6px',background:'var(--paper-2)',border:'1px dashed var(--paper-3)',borderBottom:'none',borderRadius:'8px 8px 0 0' }}>
                      <span style={{ fontFamily:'var(--font-serif)',fontStyle:'italic',fontSize:13,color:'var(--ink-2)' }}>{cluster.groupName}</span>
                      <span style={{ fontSize:10,color:'var(--ink-3)',textTransform:'uppercase',letterSpacing:'0.05em' }}>{cluster.books.length} текстов · в рекомендованном порядке</span>
                    </div>
                  )}
                  <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))',gap:8,...(cluster.groupName?{padding:'8px 10px 10px',background:'var(--paper-2)',border:'1px dashed var(--paper-3)',borderTop:'none',borderRadius:'0 0 8px 8px',marginBottom:12}:{marginBottom:8}) }}>
                    {cluster.books.map(book => {
                      const isDone = done.has(book.n)
                      return (
                        <div key={book.n} style={{ background:isDone?'var(--paper-2)':'#fff',border:'1px solid var(--paper-3)',borderRadius:8,padding:'11px 12px',display:'flex',flexDirection:'column',gap:6,opacity:isDone?0.72:1,transition:'all 0.15s' }}>
                          <div style={{ display:'flex',alignItems:'center',gap:6 }}>
                            <span style={{ fontSize:10,color:'var(--ink-3)',minWidth:20 }}>{book.n}</span>
                            <button onClick={()=>toggle(book.n)} style={{ marginLeft:'auto',width:20,height:20,borderRadius:'50%',border:`1.5px solid ${isDone?'#1D9E75':'var(--paper-3)'}`,background:isDone?'#1D9E75':'transparent',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0,padding:0 }} aria-label={isDone?'Отметить непрочитанным':'Отметить прочитанным'}>
                              {isDone && <svg width="10" height="10" viewBox="0 0 14 14" fill="none"><polyline points="2,7 6,11 12,3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                            </button>
                          </div>
                          <div style={{ flex:1 }}>
                            <Link href={`/book/${book.n}`} style={{ fontFamily:'var(--font-serif)',fontSize:14,fontWeight:400,color:'var(--ink)',lineHeight:1.3,textDecoration:isDone?'line-through':'none',display:'block' }}>
                              {book.t}
                            </Link>
                            <p style={{ fontSize:12,color:'var(--ink-2)',marginTop:3 }}>{book.a}</p>
                          </div>
                          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:6,borderTop:'1px solid var(--paper-3)' }}>
                            <span style={{ fontSize:11,color:'var(--ink-3)' }}>{book.y}</span>
                            <span style={{ fontSize:11,fontWeight:500,color:'var(--gold)',background:'var(--gold-lt)',padding:'1px 7px',borderRadius:10 }}>{book.h} ч</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </section>
          )
        })}
        {filtered.length===0 && <p style={{ fontFamily:'var(--font-serif)',fontStyle:'italic',color:'var(--ink-3)',fontSize:'1.1rem' }}>Ничего не найдено</p>}
      </main>

      <footer style={{ textAlign:'center',padding:'1.5rem',fontSize:12,color:'var(--ink-3)',borderTop:'1px solid var(--paper-3)' }}>
        Философский канон · прогресс сохраняется в браузере
      </footer>
    </div>
  )
}
