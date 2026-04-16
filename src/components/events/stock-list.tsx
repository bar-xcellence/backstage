import type { StockResult } from "@/lib/stock-calculator";

export function StockList({ stock }: { stock: StockResult }) {
  if (stock.warnings.includes("No cocktails selected")) {
    return (
      <p className="font-[family-name:var(--font-raleway)] text-sm text-grey">
        Select cocktails to see stock requirements
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {stock.warnings.length > 0 && (
        <div className="bg-warning/10 border border-warning/20 p-3">
          {stock.warnings.map((w, i) => (
            <p
              key={i}
              className="font-[family-name:var(--font-raleway)] text-sm text-warning"
            >
              {w}
            </p>
          ))}
        </div>
      )}

      {/* Ingredients by category */}
      {stock.ingredients.length > 0 && (
        <section>
          <h3 className="font-[family-name:var(--font-cormorant)] text-xl font-light text-charcoal tracking-tight mb-3">
            Stock List
          </h3>
          <div className="space-y-1">
            {stock.ingredients.map((ing, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2 border-b border-outline/10"
              >
                <div>
                  <span className="font-[family-name:var(--font-raleway)] text-sm text-charcoal">
                    {ing.ingredientName}
                  </span>
                  {ing.brand && (
                    <span className="ml-2 font-[family-name:var(--font-raleway)] text-[11px] text-grey">
                      ({ing.brand})
                    </span>
                  )}
                  <span className="ml-2 font-[family-name:var(--font-raleway)] text-[10px] tracking-[0.16em] uppercase text-grey">
                    {ing.ingredientCategory}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-[family-name:var(--font-raleway)] text-sm font-semibold text-gold-ink">
                    {ing.purchaseUnits} x {ing.bottleSize}ml
                  </span>
                  <span className="ml-2 font-[family-name:var(--font-raleway)] text-[11px] text-grey">
                    ({(ing.totalMl / 1000).toFixed(1)}L total)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Garnishes */}
      {stock.garnishes.length > 0 && (
        <section>
          <h3 className="font-[family-name:var(--font-cormorant)] text-xl font-light text-charcoal tracking-tight mb-3">
            Garnishes
          </h3>
          <div className="space-y-1">
            {stock.garnishes.map((g, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2 border-b border-outline/10"
              >
                <span className="font-[family-name:var(--font-raleway)] text-sm text-charcoal">
                  {g.garnishName}
                </span>
                <span className="font-[family-name:var(--font-raleway)] text-sm font-semibold text-gold-ink">
                  {g.totalWithBuffer} {g.quantityUnit}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Manual items */}
      {stock.manualItems.length > 0 && (
        <section>
          <h3 className="font-[family-name:var(--font-cormorant)] text-xl font-light text-charcoal tracking-tight mb-3">
            Manual Items
          </h3>
          <p className="font-[family-name:var(--font-raleway)] text-[11px] text-grey mb-2">
            These items use non-standard units and need manual ordering
          </p>
          <div className="space-y-1">
            {stock.manualItems.map((m, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2 border-b border-outline/10"
              >
                <span className="font-[family-name:var(--font-raleway)] text-sm text-charcoal">
                  {m.ingredientName}
                </span>
                <span className="font-[family-name:var(--font-raleway)] text-sm font-semibold text-gold-ink">
                  {m.totalQuantity} {m.unit}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
