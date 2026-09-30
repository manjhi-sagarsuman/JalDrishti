import { lazy, Suspense } from "react"
import { LoadingState } from "../components/ui"

const EvidenceModule = lazy(() => import("../features/evidence/EvidenceModule"))

export default function ImagesPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading field evidence..." rows={5} />}>
      <EvidenceModule />
    </Suspense>
  )
}
