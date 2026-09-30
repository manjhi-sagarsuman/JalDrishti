import { lazy, Suspense } from "react"
import { LoadingState } from "../components/ui"

const AnalyticsCenter = lazy(() => import("../features/analytics/AnalyticsCenter"))

export default function AnalysisPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading analytics..." rows={5} />}>
      <AnalyticsCenter />
    </Suspense>
  )
}
