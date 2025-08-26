import { useState } from "react"
import {
  Breadcrumb,
  BreadcrumbCurrent,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/widgets/breadcrumb"
import MainArea from "@/components/widgets/main-area"
import TopBar from "@/components/widgets/top-bar"
import TopBarActions from "@/components/widgets/top-bar-actions"
import MainContent from "@/components/widgets/main-content"
import { useParams, useNavigate } from "react-router-dom"
import useNodeComposeContainers from "@/hooks/useNodeComposeContainers"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  INodeComposeContainer,
  INodeHead,
  IPageResponse,
} from "@/lib/api-models"
import Loading from "@/components/widgets/loading"
import { getContainerUrlFromPortMapping } from "@/lib/utils"
import useNodeHead from "@/hooks/useNodeHead"
import useNodeComposeItem from "@/hooks/useNodeComposeItem"
import { ArrowUpRight } from "lucide-react"
import EditContainerBaseUrlDialog from "@/app/nodes/containerbaseurl-edit-dialog"
import { TableNoData } from "@/components/widgets/table-no-data"
import { StaleStatusIcon } from "../containers/container-list"
import { Badge } from "@/components/ui/badge"
import { PlayIcon, StopIcon, ArrowPathIcon } from "@heroicons/react/24/solid"
import { Terminal, ScrollText } from "lucide-react"
import axios from "axios"
import apiBaseUrl from "@/lib/api-base-url"
import { toastFailed, toastSuccess } from "@/lib/utils"
import TableButtonDelete from "@/components/widgets/table-button-delete"
import DeleteDialog from "@/components/delete-dialog"

export default function ComposeContainerList() {
  const { nodeId, composeProjectId } = useParams()
  const { nodeHead } = useNodeHead(nodeId!)
  const { nodeComposeItem } = useNodeComposeItem(nodeId!, composeProjectId!)
  const { isLoading, composeContainers } = useNodeComposeContainers(
    nodeId!,
    composeProjectId!
  )

  if (isLoading) return <Loading />

  return (
    <MainArea>
      <TopBar>
        <Breadcrumb>
          <BreadcrumbLink to="/nodes">Nodes</BreadcrumbLink>
          <BreadcrumbSeparator />
          <BreadcrumbCurrent>{nodeHead?.name}</BreadcrumbCurrent>
          <BreadcrumbSeparator />
          <BreadcrumbLink to={`/nodes/${nodeId}/compose`}>
            Compose
          </BreadcrumbLink>
          <BreadcrumbSeparator />
          <BreadcrumbCurrent>
            {nodeComposeItem?.projectName}{" "}
            {nodeComposeItem?.status?.startsWith("running")
              ? "(Running)"
              : "(Not running)"}
          </BreadcrumbCurrent>
          <BreadcrumbSeparator />
          <BreadcrumbCurrent>Containers</BreadcrumbCurrent>
        </Breadcrumb>
        <TopBarActions>
          <EditContainerBaseUrlDialog />
        </TopBarActions>
      </TopBar>
      <MainContent>
        <ContainersTable
          composeContainers={composeContainers!}
          nodeHead={nodeHead!}
        />
      </MainContent>
    </MainArea>
  )
}

function ContainersTable({
  composeContainers,
  nodeHead,
}: {
  composeContainers: IPageResponse<INodeComposeContainer>
  nodeHead: INodeHead
}) {
  const { nodeId, composeProjectId } = useParams()
  const navigate = useNavigate()
  const [container, setContainer] = useState<INodeComposeContainer | null>(null)
  const [deleteContainerConfirmationOpen, setDeleteContainerConfirmationOpen] = useState(false)
  const [deleteInProgress, setDeleteInProgress] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Sorting and filtering logic for parity with container-list.tsx
  // For now, just static sort by name asc for visual parity
  const sortedItems = (composeContainers?.items || []).slice().sort((a, b) => a.name.localeCompare(b.name))

  function getPortsHtml(ports: string) {
    const arr = ports.split(", ").map((p, i) => {
      let url: string | null = ""
      try {
        url = getContainerUrlFromPortMapping(p, nodeHead?.containerBaseUrl)
      } catch (e) {
        console.log(e)
      }
      return (
        <div key={i}>
          {url ? (
            <a
              className="inline-block p-1 text-amber-600 hover:underline hover:underline-offset-2"
              target="_blank"
              href={url}
              onClick={(e) => e.stopPropagation()}
            >
              {p}
              <ArrowUpRight className="ml-1 inline w-4" />
            </a>
          ) : (
            <span>{p}</span>
          )}
          <br />
        </div>
      )
    })
    return arr
  }


  // Action handlers
  const handleStartContainer = async (name: string) => {
    setIsProcessing(true)
    try {
      await axios.post(`${apiBaseUrl()}/nodes/${nodeId}/compose/${composeProjectId}/containers/start`, { name })
      toastSuccess("Container started.")
      window.location.reload()
    } catch (e) {
      toastFailed("Failed to start container.")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleStopContainer = async (name: string) => {
    setIsProcessing(true)
    try {
      await axios.post(`${apiBaseUrl()}/nodes/${nodeId}/compose/${composeProjectId}/containers/stop`, { name })
      toastSuccess("Container stopped.")
      window.location.reload()
    } catch (e) {
      toastFailed("Failed to stop container.")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRestartContainer = async (name: string) => {
    setIsProcessing(true)
    try {
      await axios.post(`${apiBaseUrl()}/nodes/${nodeId}/compose/${composeProjectId}/containers/restart`, { name })
      toastSuccess("Container restarted.")
      window.location.reload()
    } catch (e) {
      toastFailed("Failed to restart container.")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDeleteContainer = async () => {
    setDeleteInProgress(true)
    try {
      await axios.post(`${apiBaseUrl()}/nodes/${nodeId}/compose/${composeProjectId}/containers/remove`, { name: container?.name, force: true })
      toastSuccess("Container deleted.")
      setTimeout(() => {
        setDeleteContainerConfirmationOpen(false)
        window.location.reload()
      }, 500)
    } catch (e) {
      toastFailed("Failed to delete container.")
      setDeleteContainerConfirmationOpen(false)
    }
    setDeleteInProgress(false)
  }

// ...existing code...

  const handleDeleteContainerConfirmation = (container: INodeComposeContainer) => {
    setContainer({ ...container })
    setDeleteContainerConfirmationOpen(true)
  }


  return (
    <>
      {deleteContainerConfirmationOpen && (
        <DeleteDialog
          openState={deleteContainerConfirmationOpen}
          setOpenState={setDeleteContainerConfirmationOpen}
          deleteCaption=""
          deleteHandler={handleDeleteContainer}
          isProcessing={deleteInProgress}
          title="Delete Container"
          message={`Are you sure you want to delete container '${container?.name}?'`}
        />
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead
              scope="col"
              className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <div className="flex items-center">
                State
              </div>
            </TableHead>
            <TableHead
              scope="col"
              className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <div className="flex items-center">
                Name
              </div>
            </TableHead>
            <TableHead scope="col">Image</TableHead>
            <TableHead scope="col">Ports</TableHead>
            <TableHead scope="col">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedItems.length === 0 ? (
            <TableNoData colSpan={5} />
          ) : (
            sortedItems.map((item) => (
              <TableRow key={item.name}>
                  <TableCell>
                    {item.status && item.status.startsWith("Up") && (
                      <Badge variant="default">{item.status}</Badge>
                    )}
                    {item.status && !item.status.startsWith("Up") && (
                      <Badge variant="destructive">{item.status}</Badge>
                    )}
                  </TableCell>
                <TableCell>
                  <button
                    className="font-bold hover:underline hover:text-blue-600 dark:hover:text-blue-400"
                    title={`Image: ${item.image}`}
                    style={{ cursor: 'default' }}
                  >
                    {item.name}
                  </button>
                </TableCell>
                <TableCell>
                  <StaleStatusIcon status={item.stale} />
                  {item.image}
                </TableCell>
                <TableCell>{getPortsHtml(item.ports)}</TableCell>
                <TableCell className="text-left">
                  <div className="flex items-center gap-1">
                    {item.state === "running" ? (
                      <>
                        <button
                          className="p-1 rounded text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                          title="Terminal"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/nodes/${nodeId}/containers/${item.name}/terminal`)
                          }}
                        >
                          <Terminal className="w-4 h-4" />
                        </button>
                        <button
                          className="p-1 rounded text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                          title="Logs"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/nodes/${nodeId}/containers/${item.name}/logs`)
                          }}
                        >
                          <ScrollText className="w-4 h-4" />
                        </button>
                        <button
                          className="p-1 rounded text-amber-500 dark:text-amber-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                          title="Restart"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRestartContainer(item.name)
                          }}
                          disabled={isProcessing}
                        >
                          <ArrowPathIcon className="w-4 h-4" />
                        </button>
                        <button
                          className="p-1 rounded text-red-600 dark:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                          title="Stop"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleStopContainer(item.name)
                          }}
                          disabled={isProcessing}
                        >
                          <StopIcon className="w-4 h-4" />
                        </button>
                        <div className="inline-flex text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                          <TableButtonDelete
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteContainerConfirmation(item)
                            }}
                          />
                        </div>
                      </>
                    ) : item.state === "exited" ? (
                      <>
                        <button
                          className="p-1 rounded text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                          title="Logs"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/nodes/${nodeId}/compose/${composeProjectId}/containers/${item.name}/logs`)
                          }}
                        >
                          <ScrollText className="w-4 h-4" />
                        </button>
                        <button
                          className="p-1 rounded text-green-600 dark:text-green-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                          title="Start"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleStartContainer(item.name)
                          }}
                          disabled={isProcessing}
                        >
                          <PlayIcon className="w-4 h-4" />
                        </button>
                        <div className="inline-flex text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                          <TableButtonDelete
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteContainerConfirmation(item)
                            }}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <button
                          className="p-1 rounded text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                          title="Logs"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/nodes/${nodeId}/compose/${composeProjectId}/containers/${item.name}/logs`)
                          }}
                        >
                          <ScrollText className="w-4 h-4" />
                        </button>
                        <button
                          className="p-1 rounded text-red-600 dark:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                          title="Stop"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleStopContainer(item.name)
                          }}
                          disabled={isProcessing}
                        >
                          <StopIcon className="w-4 h-4" />
                        </button>
                        <div className="inline-flex text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                          <TableButtonDelete
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteContainerConfirmation(item)
                            }}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </>
  )
}
