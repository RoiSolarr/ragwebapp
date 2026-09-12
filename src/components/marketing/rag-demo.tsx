const sources = [
  { file: "hr-policy.pdf", excerpt: "...employees may carry over up to 5 unused days...", match: "carry over up to 5 unused" },
  { file: "handbook.md", excerpt: "...unused days must be used by March 31 or forfeited...", match: "used by March 31" },
];

export function RagDemo() {
  return (
    <div className="relative overflow-hidden rounded-[1.5rem] border border-indigo/40 bg-[#130f38] p-4 text-white shadow-[0_24px_60px_rgba(116,96,255,0.28)] sm:p-5">
      <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-indigo/40 blur-3xl" aria-hidden="true" />
      <div className="relative flex items-center justify-between border-b border-indigo/25 pb-4"><div className="flex items-center gap-1.5" aria-hidden="true"><span className="h-2 w-2 rounded-full bg-indigo" /><span className="h-2 w-2 rounded-full bg-[#9a6cff]" /><span className="h-2 w-2 rounded-full bg-[#c47dff]" /></div><span className="rounded-full border border-indigo/40 bg-indigo/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.16em] text-[#b59dff]">Live retrieval</span></div>
      <div className="relative pt-5"><div className="reveal inline-flex items-center gap-2 rounded-xl border border-indigo/40 bg-indigo/20 px-4 py-3 text-sm text-white"><span className="text-[#c7a5ff]" aria-hidden="true">⌕</span> What&apos;s our PTO carryover policy?</div>
      <p className="reveal mt-5 max-w-lg text-[15px] leading-7 text-white" style={{ animationDelay: "450ms" }}>Employees can carry over up to 5 unused PTO days into the next year <sup className="pop mx-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-highlight text-[10px] font-bold text-ink" style={{ animationDelay: "1100ms" }}>1</sup>. Carried-over days must be used by March 31 or they expire <sup className="pop mx-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-highlight text-[10px] font-bold text-ink" style={{ animationDelay: "1300ms" }}>2</sup>.<span className="caret ml-1 inline-block h-4 w-[2px] translate-y-0.5 bg-highlight" aria-hidden="true" /></p>
      <div className="mt-6 grid gap-2 sm:grid-cols-2">{sources.map((source, index) => { const [before, after] = source.excerpt.split(source.match); return <div key={source.file} className="reveal rounded-xl border border-indigo/25 bg-indigo/10 px-3.5 py-3 text-xs text-white/60" style={{ animationDelay: `${1500 + index * 150}ms` }}><p className="flex items-center gap-2 font-semibold text-white"><span className="h-1.5 w-1.5 rounded-full bg-[#c7a5ff]" />{source.file}<span className="ml-auto text-[10px] text-white/40">SOURCE {index + 1}</span></p><p className="mt-1.5 leading-5">{before}<mark className="rounded bg-[#a86dff]/25 px-0.5 text-[#c7a5ff]">{source.match}</mark>{after}</p></div>; })}</div></div>
    </div>
  );
}
