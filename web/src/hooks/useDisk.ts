import { IDiskUsageSummary } from "@/lib/api-models"
import apiBaseUrl from "@/lib/api-base-url"
import useRequest from "@/lib/useRequest"

export default function useDisk() {
  const url = `${apiBaseUrl()}/disk`

  const { data, error, isLoading, mutate } = useRequest<IDiskUsageSummary>({
    url,
  })

  const mutateDisk = async () => {
    mutate()
  }

  return {
    isLoading,
    isError: error,
    diskUsage: data,
    mutateDisk,
  }
}
