// Sticky bottom action bar shared by all three wizard steps.
// Provides slots for a back link/button (left), secondary utility buttons,
// and a primary CTA (right). The `alert` slot renders a row above the
// buttons — used by PlanActions for upload error messages.
//
// Negative horizontal margins (-mx-6 md:-mx-8) mirror App.jsx's px-6 md:px-8
// so the bar bleeds to the viewport edges; App.jsx has pb-20 to reserve
// space for the bar over scrolled content.

export default function StepFooter({ back, secondary, primary, alert }) {
  return (
    <div className="sticky bottom-0 -mx-6 md:-mx-8 px-6 md:px-8 py-4 bg-bg/90 backdrop-blur border-t border-border-soft">
      {alert && <div className="mb-2">{alert}</div>}
      <div className="flex items-center gap-3 flex-wrap">
        {back}
        {secondary}
        <div className="flex-1" />
        {primary}
      </div>
    </div>
  )
}
