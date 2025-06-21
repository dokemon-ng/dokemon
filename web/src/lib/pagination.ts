import { useState } from "react"

export interface PaginationConfig {
  pageSize: number
  currentPage: number
  totalItems: number
  totalPages: number
}

export interface PaginationFunctions {
  goToPage: (page: number) => void
  setPageSize: (size: number) => void
  nextPage: () => void
  prevPage: () => void
  goToFirstPage: () => void
  goToLastPage: () => void
}

export const usePagination = <T>(
  items: T[],
  initialPageSize = 10
): [PaginationConfig, PaginationFunctions, T[]] => {
  const [pageSize, setPageSize] = useState(initialPageSize)
  const [currentPage, setCurrentPage] = useState(1)

  const totalItems = items.length
  const totalPages = Math.ceil(totalItems / pageSize)

  const paginatedItems = items.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  const nextPage = () => {
    goToPage(currentPage + 1)
  }

  const prevPage = () => {
    goToPage(currentPage - 1)
  }

  const goToFirstPage = () => {
    goToPage(1)
  }

  const goToLastPage = () => {
    goToPage(totalPages)
  }

  const paginationConfig: PaginationConfig = {
    pageSize,
    currentPage,
    totalItems,
    totalPages,
  }

  const paginationFunctions: PaginationFunctions = {
    goToPage,
    setPageSize: (size: number) => {
      setPageSize(size)
      goToFirstPage()
    },
    nextPage,
    prevPage,
    goToFirstPage,
    goToLastPage,
  }

  return [paginationConfig, paginationFunctions, paginatedItems]
}
