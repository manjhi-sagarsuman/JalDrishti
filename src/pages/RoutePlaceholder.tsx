import { PageHeader } from "../components/ui"
import { Breadcrumbs } from "../components/Breadcrumbs"
import type { AppPage } from "../routes/routeConfig"

interface RoutePlaceholderProps {
  page: AppPage
}

function RoutePlaceholder({ page }: RoutePlaceholderProps) {
  const breadcrumbItems = page.section === "Overview"
    ? [{ label: page.label }]
    : [{ label: page.section }, { label: page.label }]

  return (
    <div className="page-section">
      <PageHeader
        breadcrumbs={<Breadcrumbs items={breadcrumbItems} />}
        description={page.description}
        eyebrow={page.section}
        title={page.label}
      />
      <section aria-label={`${page.label} module placeholder`} className="rounded-card border border-dashed border-line bg-white p-6 sm:p-10">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-base font-semibold text-ink">Module setup</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            This route is ready for its feature phase. No demonstration records or official data are shown here.
          </p>
        </div>
      </section>
    </div>
  )
}

export default RoutePlaceholder
