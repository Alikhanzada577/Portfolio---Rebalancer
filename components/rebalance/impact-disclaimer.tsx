/** SnapTrade's recommended wording (docs: "Order impact and confirmation"). Which text applies depends on whether any estimate exists. */
export function ImpactDisclaimer({ hasEstimates }: { readonly hasEstimates: boolean }) {
  return (
    <p className="text-xs leading-5 text-muted">
      {hasEstimates ? (
        <>
          <strong>Estimated results.</strong> The amounts shown are estimates only and are not guaranteed. The brokerage determines the final execution price, commissions, fees and cash impact. Market orders can fill at a different price than the latest quote, and orders may partially fill or fill over multiple days.
        </>
      ) : (
        <>
          <strong>Order impact unavailable.</strong> A reliable pre-trade impact or fee estimate is not available for these orders. The final execution price, commissions, fees and cash impact may not be known until the orders are submitted. Fees may apply. By confirming, you agree to proceed without these estimates.
        </>
      )}{" "}
      Orders are market orders valid for the day.
    </p>
  );
}
