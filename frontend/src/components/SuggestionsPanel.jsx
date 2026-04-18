import { useEffect } from "react";

export default function SuggestionsPanel({
  suggestionBatches,
  onRefresh,
  onSuggestionClick,
  isRefreshing,
}) {
  useEffect(() => {
    const intervalId = setInterval(() => {
      onRefresh();
    }, 30000);

    return () => clearInterval(intervalId);
  }, [onRefresh]);

  return (
    <section className="flex h-full min-h-0 flex-col rounded-[10px] border border-[#24344f] bg-[#0b1324]">
      <div className="flex items-center justify-between border-b border-[#1e2c44] px-3 py-2.5">
        <h2 className="text-sm uppercase tracking-wide text-[#8ca6cf]">2. Live Suggestions</h2>
        <span className="text-xs uppercase tracking-wide text-[#8ca6cf]">{suggestionBatches.length} Batches</span>
      </div>

      <div className="flex items-center justify-between px-3 py-2">
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="rounded-md border border-[#2f4368] bg-[#182235] px-3 py-1.5 text-xs font-semibold text-[#d3e4ff] hover:bg-[#1d2b43] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRefreshing ? "Reloading..." : "Reload suggestions"}
        </button>
        <span className="text-xs text-[#8ca6cf]">auto-refresh in 30s</span>
      </div>

      <div className="px-3 pb-2">
        <div className="rounded-md border border-[#2f4f80] bg-[#15243c] p-3 text-sm leading-relaxed text-[#d5e3fd]">
          On reload (or auto every ~30s), generate 3 fresh suggestions from recent transcript context. New batch
          appears at the top; older batches push down (faded). Each is a tappable card: a question to ask, a talking
          point, an answer, or a fact-check. The preview alone should already be useful.
        </div>
      </div>

      <div className="panel-scroll flex-1 overflow-y-auto px-3 pb-3">
        {!suggestionBatches.length ? (
          <p className="pt-6 text-center text-[22px] text-[#273957]">Suggestions appear here once recording starts.</p>
        ) : (
          <div className="space-y-3">
            {suggestionBatches.map((batch, index) => (
              <div
                key={batch.id}
                className={`space-y-2 rounded-md border border-[#2f4f80] bg-[#101c32] p-2.5 ${index > 0 ? "opacity-80" : "opacity-100"}`}
              >
                {batch.note ? (
                  <div className="rounded-md border border-amber-400/40 bg-amber-100/10 px-2 py-1 text-xs text-amber-100">
                    {batch.note}
                  </div>
                ) : null}
                <p className="text-[11px] uppercase tracking-wide text-[#8ca6cf]">
                  Batch {new Date(batch.createdAt).toLocaleTimeString()}
                </p>
                {batch.suggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    onClick={() => onSuggestionClick(suggestion)}
                    className="w-full rounded-md border border-[#2f4f80] bg-[#15243c] p-2.5 text-left hover:bg-[#1a2d49]"
                  >
                    <p className="text-xs font-semibold uppercase text-[#8ca6cf]">{suggestion.kind}</p>
                    <p className="text-sm font-medium text-[#e5efff]">{suggestion.title}</p>
                    <p className="mt-1 text-sm text-[#bfd3f5]">{suggestion.preview}</p>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
