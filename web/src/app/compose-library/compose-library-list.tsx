import Loading from "@/components/widgets/loading"
import { Breadcrumb, BreadcrumbCurrent } from "@/components/widgets/breadcrumb"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import MainArea from "@/components/widgets/main-area"
import TopBar from "@/components/widgets/top-bar"
import TopBarActions from "@/components/widgets/top-bar-actions"
import MainContent from "@/components/widgets/main-content"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import useComposeLibraryItemList from "@/hooks/useComposeLibraryItemList"
import { CLASSES_CLICKABLE_TABLE_ROW } from "@/lib/utils"
import { useFilterAndSort } from "@/lib/useFilterAndSort"
import { TableNoData } from "@/components/widgets/table-no-data"
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/solid"
import { Input } from "@/components/ui/input"

export default function ComposeLibraryList() {
  const navigate = useNavigate()
  const { isLoading, composeLibraryItems } = useComposeLibraryItemList()

  const {
    searchTerm,
    setSearchTerm,
    sortedItems: sortedLibraryItems = [],
    requestSort,
    sortConfig
  } = useFilterAndSort<any>(composeLibraryItems?.items || [], {
    initialSortKey: "projectName",
    initialSortDirection: "asc",
    filterKeys: ["projectName"]
  });

  if (isLoading) return <Loading />

  return (
    <MainArea>
      <TopBar>
        <Breadcrumb>
          <BreadcrumbCurrent>Compose Library</BreadcrumbCurrent>
        </Breadcrumb>
        <TopBarActions>
          <Button
            className="w-24"
            onClick={() => navigate("/composelibrary/filesystem/create")}
          >
            Create
          </Button>
          <Button
            className="w-36"
            onClick={() => navigate("/composelibrary/github/create")}
          >
            Add from GitHub
          </Button>
        </TopBarActions>
      </TopBar>
      <MainContent>
        <div className="mb-4 flex items-center justify-end">
          <div className="relative w-full max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              type="text"
              className="pl-10"
              placeholder="Search compose library..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-3"
                onClick={() => setSearchTerm('')}
              >
                <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                scope="col"
                className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => requestSort("projectName")}
              >
                <div className="flex items-center">
                  Library Project Name
                  {sortConfig.key === "projectName" && (
                    <span className="ml-1">
                      {sortConfig.direction === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </div>
              </TableHead>
              <TableHead scope="col">Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedLibraryItems.length === 0 ? (
              <TableNoData colSpan={3} />
            ) : (
              sortedLibraryItems.map((item) => (
                <TableRow
                  key={item.projectName}
                  className={CLASSES_CLICKABLE_TABLE_ROW}
                  onClick={() => {
                    if (item.type === "filesystem") {
                      navigate(
                        `/composelibrary/${item.type}/${item.projectName}/edit`
                      )
                    }
                    if (item.type === "github") {
                      navigate(`/composelibrary/${item.type}/${item.id}/edit`)
                    }
                  }}
                >
                  <TableCell>{item.projectName}</TableCell>
                  <TableCell>
                    {item.type === "filesystem" ? "File System" : ""}
                    {item.type === "github" ? "GitHub" : ""}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </MainContent>
    </MainArea>
  )
}
