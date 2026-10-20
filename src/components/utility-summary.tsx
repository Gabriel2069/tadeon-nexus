import { FabricFilaments } from "@/components/fabric-filaments";

/** Shared hierarchy for administrative utilities; each route supplies real state. */
export function UtilitySummary({
  items,
}: {
  items: Array<{ label: string; value: string | number; detail: string }>;
}) {
  return (
    <div className="tadeon-utility-summary">
      <FabricFilaments className="tadeon-utility-summary__threads" />
      <dl>
        {items.map(({ label, value, detail }) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd
              data-value-kind={
                typeof value === "number" || /^[\d.%+−-]+$/.test(value) ? "number" : "text"
              }
            >
              <span>{value}</span>
              <p>{detail}</p>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
