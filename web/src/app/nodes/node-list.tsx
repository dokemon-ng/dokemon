import Loading from "@/components/widgets/loading";
import { Breadcrumb, BreadcrumbCurrent } from "@/components/widgets/breadcrumb";
import {
  MagnifyingGlassIcon,
  PencilIcon,
  XMarkIcon,
  ExclamationTriangleIcon
} from "@heroicons/react/24/solid";
import { RefreshCw } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import TableButtonDelete from "@/components/widgets/table-button-delete";
import MainArea from "@/components/widgets/main-area";
import TopBar from "@/components/widgets/top-bar";
import TopBarActions from "@/components/widgets/top-bar-actions";
import MainContent from "@/components/widgets/main-content";
import NodeAddDialog from "./node-add-dialog";
import { Button } from "@/components/ui/button";
import NodeRegisterDialog from "./node-register-dialog";
import ServerUrlEditDialog from "./serverurl-edit-dialog";
import { INodeHead } from "@/lib/api-models";
import { apiNodesDelete, apiNodesGenerateToken } from "@/lib/api";
import { VERSION } from "@/lib/version";
import {
  cn,
  toastFailed,
  toastSomethingWentWrong,
  toastSuccess,
} from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import useNodes from "@/hooks/useNodes";
import { useState, useEffect, useCallback } from "react";
import useSetting from "@/hooks/useSetting";
import { TableNoData } from "@/components/widgets/table-no-data";
import DeleteDialog from "@/components/delete-dialog";
import { useFilterAndSort } from "@/lib/useFilterAndSort";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import axios from "axios";
import apiBaseUrl from "@/lib/api-base-url";
import { usePagination } from "@/lib/pagination";
import PaginationFooter from "@/components/ui/pagination-footer";

export default function NodeList() {
  const navigate = useNavigate();
  const { isLoading, nodes, mutateNodes } = useNodes();
  const { setting } = useSetting("SERVER_URL");
  const [token, setToken] = useState("");
  const [updateAgent, setUpdateAgent] = useState(false);
  const [registerNodeOpen, setRegisterNodeOpen] = useState(false);
  const [nodeHead, setNodeHead] = useState<INodeHead | null>(null);
  const [deleteNodeOpenConfirmation, setDeleteNodeOpenConfirmation] = useState(false);
  const [deleteInProgress, setDeleteInProgress] = useState(false);
  const [containerCounts, setContainerCounts] = useState<Record<number, {
    running?: number;
    stopped?: number;
    loading: boolean;
    error?: string;
    lastUpdated?: number;
    hasData: boolean;
  }>>({});
  const [refreshInterval, setRefreshInterval] = useState<number>(60);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(Date.now());
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  const {
    searchTerm,
    setSearchTerm,
    sortedItems: sortedNodes = [],
    requestSort,
    sortConfig
  } = useFilterAndSort<INodeHead>(nodes?.items || [], {
    initialSortKey: "name",
    initialSortDirection: "asc",
    filterKeys: ['name', 'environment', 'agentVersion'] as (keyof INodeHead)[]
  });

  const [paginationConfig, paginationFunctions, paginatedNodes] = usePagination(
    sortedNodes,
    10
  );


  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (refreshInterval > 0) {
      intervalId = setInterval(() => {
        setCurrentTime(Date.now());
      }, 1000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [refreshInterval]);

  const secondsSinceLastRefresh = Math.floor((currentTime - lastRefreshTime) / 1000);

  const fetchContainerCounts = useCallback(async (nodeId: number, nodeOnline: boolean): Promise<boolean> => {
    if (!nodeOnline) {
      setContainerCounts(prev => ({
        ...prev,
        [nodeId]: {
          loading: false,
          error: 'Host offline',
          lastUpdated: Date.now(),
          hasData: false
        }
      }));
      return false;
    }

    const now = Date.now();

    try {
      setContainerCounts(prev => ({
        ...prev,
        [nodeId]: {
          ...prev[nodeId],
          running: undefined,
          stopped: undefined,
          loading: true,
          error: undefined,
          hasData: false
        }
      }));

      const response = await axios.get(`${apiBaseUrl()}/nodes/${nodeId}/containers`, {
        timeout: 15000,
        validateStatus: () => true
      });

      if (response.status >= 500) {
        throw new Error(`Backend error: ${response.status}`);
      }

      if (response.status >= 400) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const containers = response.data?.items || [];
      const running = containers.filter((c: any) => c.state === 'running').length;
      const stopped = containers.filter((c: any) => c.state === 'exited').length;

      setContainerCounts(prev => ({
        ...prev,
        [nodeId]: {
          running,
          stopped,
          loading: false,
          lastUpdated: now,
          error: undefined,
          hasData: true
        }
      }));
      return true;
    } catch (error) {
      console.error(`Node ${nodeId} fetch error:`, error);

      setContainerCounts(prev => ({
        ...prev,
        [nodeId]: {
          ...prev[nodeId],
          running: undefined,
          stopped: undefined,
          loading: false,
          error: 'Service unavailable',
          lastUpdated: now,
          hasData: false
        }
      }));
      return false;
    }
  }, []);

  const fetchAllCounts = useCallback(async () => {
    const refreshTime = Date.now();
    setLastRefreshTime(refreshTime);
    setCurrentTime(refreshTime);

    if (!nodes?.items) return;

    // Implement rate-limited parallel loading
    const BATCH_SIZE = 3;
    const DELAY_BETWEEN_BATCHES = 500;

    for (let i = 0; i < nodes.items.length; i += BATCH_SIZE) {
      const batch = nodes.items.slice(i, i + BATCH_SIZE);

      const batchPromises = batch.map(node =>
        retryableFetch(node.id, node.online)
      );

      await Promise.all(batchPromises);

      if (i + BATCH_SIZE < nodes.items.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }

    async function retryableFetch(nodeId: number, nodeOnline: boolean, attempt = 1): Promise<void> {
      const MAX_RETRIES = 2;
      const RETRY_DELAY = 1000;

      try {
        const success = await fetchContainerCounts(nodeId, nodeOnline);
        if (!success && attempt < MAX_RETRIES) {
          throw new Error('Service unavailable');
        }
      } catch (error) {
        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          return retryableFetch(nodeId, nodeOnline, attempt + 1);
        }
      }
    }
  }, [nodes, fetchContainerCounts]);

  useEffect(() => {
    if (!nodes?.items) return;

    const abortController = new AbortController();

    fetchAllCounts();
    let refreshIntervalId: NodeJS.Timeout;

    if (refreshInterval > 0) {
      refreshIntervalId = setInterval(fetchAllCounts, refreshInterval * 1000);
    }

    return () => {
      if (refreshIntervalId) clearInterval(refreshIntervalId);
      abortController.abort();
    };
  }, [nodes, fetchAllCounts, refreshInterval]);

  const handleRefreshCounts = (nodeId: number, nodeOnline: boolean) => {
    fetchContainerCounts(nodeId, nodeOnline);
  };

  const handleRegister = async (nodeId: number, update: boolean) => {
    const response = await apiNodesGenerateToken(nodeId);

    if (!response.ok) {
      toastSomethingWentWrong(
        "There was a problem when generating the registration token. Try again!"
      );
    } else {
      const data: { token: string } = await response.json();
      setToken(data.token);
      setUpdateAgent(update);
      setRegisterNodeOpen(true);
    }
  };

  const handleDeleteNodeConfirmation = (nodeHead: INodeHead) => {
    setNodeHead({ ...nodeHead });
    setDeleteNodeOpenConfirmation(true);
  };

  const handleDelete = async () => {
    setDeleteInProgress(true);
    const response = await apiNodesDelete(Number(nodeHead?.id));
    if (!response.ok) {
      const r = await response.json();
      setDeleteNodeOpenConfirmation(false);
      toastFailed(r.errors?.body);
    } else {
      mutateNodes();
      setTimeout(() => {
        setDeleteNodeOpenConfirmation(false);
        toastSuccess("Node deleted.");
      }, 500);
    }
    setDeleteInProgress(false);
  };

  if (isLoading) return <Loading />;

  return (
    <MainArea>
      {deleteNodeOpenConfirmation && (
        <DeleteDialog
          openState={deleteNodeOpenConfirmation}
          setOpenState={setDeleteNodeOpenConfirmation}
          deleteCaption=""
          deleteHandler={handleDelete}
          isProcessing={deleteInProgress}
          title="Delete Node"
          message={`Are you sure you want to delete node '${nodeHead?.name}?'`}
        />
      )}
      <TopBar>
        <Breadcrumb>
          <BreadcrumbCurrent>Nodes</BreadcrumbCurrent>
        </Breadcrumb>
        <TopBarActions>
          <NodeRegisterDialog
            open={registerNodeOpen}
            setOpen={setRegisterNodeOpen}
            token={token}
            updateAgent={updateAgent}
          />
          <NodeAddDialog disabled={!setting?.value} />
          <ServerUrlEditDialog />
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
              placeholder="Search nodes..."
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
                onClick={() => requestSort("name")}
              >
                <div className="flex items-center ml-3">
                  Name
                  {sortConfig.key === "name" && (
                    <span className="ml-1">
                      {sortConfig.direction === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </div>
              </TableHead>
              <TableHead scope="col">Containers</TableHead>
              <TableHead
                scope="col"
                className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => requestSort("environment")}
              >
                <div className="flex items-center ml-3">
                  Environment
                  {sortConfig.key === "environment" && (
                    <span className="ml-1">
                      {sortConfig.direction === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </div>
              </TableHead>
              <TableHead scope="col">Agent Version</TableHead>
              <TableHead scope="col">Network</TableHead>
              <TableHead scope="col">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedNodes.length === 0 ? (
              <TableNoData colSpan={6} />
            ) : (
              paginatedNodes.map((item) => (
                <TableRow key={item.name}>
                  <TableCell>
                    <div className="flex items-center">
                      <NodeStatusIcon nodeHead={item} />
                      <span
                        className="cursor-pointer hover:text-blue-600 hover:underline"
                        onClick={() => navigate(`/nodes/${item.id}/containers`)}
                      >
                        {item.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <NodeContainersDisplay
                      counts={containerCounts[item.id] || { loading: false, hasData: false }}
                      onRefresh={() => handleRefreshCounts(item.id, item.online)}
                      nodeOnline={item.online}
                    />
                  </TableCell>
                  <TableCell>
                    {item.environment ? item.environment : "-"}
                  </TableCell>
                  <TableCell>
                    {getAgentVersion(item)}
                  </TableCell>
                  <TableCell>
                    <NodeIPsDisplay nodeHead={item} />
                  </TableCell>
                  <TableCell className="text-left">
                    <div className="flex items-center gap-1">
                      {!item.registered ? (
                        <>
                          <Button
                            size={"sm"}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRegister(item.id, false);
                            }}
                          >
                            Register
                          </Button>
                          {!isDokemonNode(item) && (
                            <Button
                              variant="destructive"
                              size={"sm"}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteNodeConfirmation(item);
                              }}
                            >
                              Delete
                            </Button>
                          )}
                        </>
                      ) : (
                        <>
                          <button
                            className="p-1 rounded text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                            title="Edit"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/nodes/${item.id}/details`);
                            }}
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          {!isDokemonNode(item) && (
                            <TableButtonDelete
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteNodeConfirmation(item);
                              }}
                            />
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <div className="mt-4 flex items-center justify-between">
          <PaginationFooter
            paginationConfig={paginationConfig}
            paginationFunctions={paginationFunctions}
            className="flex-1"
          />

          <div className="flex items-center gap-5 ml-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Refresh:</span>
              <Select
                value={refreshInterval.toString()}
                onValueChange={(value) => setRefreshInterval(Number(value))}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="60s" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30s</SelectItem>
                  <SelectItem value="60">60s</SelectItem>
                  <SelectItem value="120">120s</SelectItem>
                  <SelectItem value="180">180s</SelectItem>
                  <SelectItem value="300">300s</SelectItem>
                  <SelectItem value="0">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {refreshInterval > 0 && (
              <div className="text-sm text-gray-500">
                Last refresh: {secondsSinceLastRefresh}s ago
                {secondsSinceLastRefresh < refreshInterval && (
                  <span> (next in {refreshInterval - secondsSinceLastRefresh}s)</span>
                )}
              </div>
            )}
          </div>
        </div>
      </MainContent>
    </MainArea>
  );
}

function isDokemonNode(nodeHead: INodeHead) {
  return nodeHead.id === 1;
}

function NodeStatusIcon({ nodeHead }: { nodeHead: INodeHead }) {
  const statusClassName = nodeHead.online ? "text-green-600" : "text-red-600";
  const title = nodeHead.online ? "Online" : "Offline";

  return (
    <span className={cn("-ml-2 mr-3 text-lg", statusClassName)} title={title}>
      ●
    </span>
  );
}

function getAgentVersion(nodeHead: INodeHead): string {
  if (isDokemonNode(nodeHead)) {
    const arch = (nodeHead as any).architecture;
    return `Server v${VERSION}` + (arch ? ` (${arch})` : "");
  }

  if (nodeHead.agentVersion) {
    const mainParts = nodeHead.agentVersion.split('-');
    const version = mainParts[0] || '';
    const rest = mainParts.length > 1 ? mainParts[1] : '';
    const arch = rest.split('@')[0] || null;

    let formatted = `v${version}`;
    if (arch) formatted += ` (${arch})`;
    return formatted;
  }

  return "-";
}

function extractIPs(agentVersion: string): {
  ip?: string[],
  zt?: string[],
  ts?: string[]
} | null {
  if (!agentVersion) return null;

  const mainParts = agentVersion.split('-');
  const rest = mainParts.length > 1 ? mainParts[1] : '';
  const ips = rest.split('@').length > 1 ? rest.split('@')[1] : null;

  if (!ips) return null;

  const result: { ip?: string[], zt?: string[], ts?: string[] } = {};
  const ipComponents = ips.split('+');

  for (const component of ipComponents) {
    if (component.includes('.')) {
      if (component.startsWith('zt:')) {
        const ip = component.substring(3);
        result.zt = [...(result.zt || []), ip];
      } else if (component.startsWith('ts:')) {
        const ip = component.substring(3);
        result.ts = [...(result.ts || []), ip];
      } else {
        const ip = component;
        result.ip = [...(result.ip || []), ip];
      }
    }
  }

  return result;
}

function NodeIPsDisplay({ nodeHead }: { nodeHead: INodeHead }) {
  if (!nodeHead.agentVersion) return <span>-</span>;

  const ips = extractIPs(nodeHead.agentVersion);

  if (!ips || (!ips.ip?.length && !ips.zt?.length && !ips.ts?.length)) {
    return <span>-</span>;
  }

  return (
    <div className="flex items-center gap-1">
      {(ips.ip?.length ?? 0) > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <button className="inline-flex items-center rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-300 cursor-pointer">
              Local{(ips.ip?.length ?? 0) > 1 ? ` (${ips.ip?.length})` : ''}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto">
            <div className="grid gap-2">
              <h4 className="font-medium leading-none">Local IP(s)</h4>
              <div className="text-sm space-y-1">
                {ips.ip?.map((ip, index) => (
                  <div key={`zt-ip-${index}`}>{ip}</div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {(ips.zt?.length ?? 0) > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <button className="inline-flex items-center rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-300 cursor-pointer">
              ZeroTier{(ips.zt?.length ?? 0) > 1 ? ` (${ips.zt?.length})` : ''}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto">
            <div className="grid gap-2">
              <h4 className="font-medium leading-none">ZeroTier IP(s)</h4>
              <div className="text-sm space-y-1">
                {ips.zt?.map((ip, index) => (
                  <div key={`zt-ip-${index}`}>{ip}</div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {(ips.ts?.length ?? 0) > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <button className="inline-flex items-center rounded bg-purple-100 px-1.5 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900 dark:text-purple-300 cursor-pointer ml-1">
              Tailscale{(ips.ts?.length ?? 0) > 1 ? ` (${ips.ts?.length})` : ''}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto">
            <div className="grid gap-2">
              <h4 className="font-medium leading-none">Tailscale IP(s)</h4>
              <div className="text-sm space-y-1">
                {ips.ts?.map((ip, index) => (
                  <div key={`ts-ip-${index}`}>{ip}</div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

interface NodeContainersDisplayProps {
  counts: {
    running?: number;
    stopped?: number;
    loading: boolean;
    error?: string;
    lastUpdated?: number;
    hasData: boolean;
  };
  onRefresh: () => void;
  nodeOnline: boolean;
}

function NodeContainersDisplay({ counts, onRefresh, nodeOnline }: NodeContainersDisplayProps) {
  if (!nodeOnline) {
    return (
      <div className="flex items-center gap-1">
        <ExclamationTriangleIcon className="h-4 w-4 text-gray-400" />
        <span className="text-xs text-gray-500">Offline</span>
      </div>
    );
  }

  if (counts.error) {
    return (
      <div className="flex items-center gap-1">
        <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />
        <span className="text-xs text-yellow-600">
          {counts.error}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRefresh();
          }}
          className="text-gray-400 hover:text-gray-600 ml-1"
          title="Retry"
        >
          <RefreshCw className="h-3 w-3" />
        </button>
      </div>
    );
  }

  if (counts.loading) {
    return (
      <div className="flex items-center gap-1">
        <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
        <span className="text-xs text-gray-500">Loading...</span>
      </div>
    );
  }

  if (!counts.hasData) {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRefresh();
        }}
        className="text-gray-400 hover:text-gray-600"
        title="Load counts"
      >
        <RefreshCw className="h-4 w-4" />
      </button>
    );
  }

  // Format counts with fixed width (no extra space)
  const formatCount = (count: number | undefined) => {
    if (count === undefined) return '-';
    return count.toString();
  };

  return (
    <div className="flex items-center gap-1">
      {counts.running !== undefined && (
        <Popover>
          <PopoverTrigger asChild>
            <button className="inline-flex items-center rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-300 cursor-pointer w-[85px] justify-between">
              <span className="text-left">Running</span>
              <span className="font-mono text-right">{formatCount(counts.running)}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto">
            <div className="grid gap-2">
              <h4 className="font-medium leading-none">Running Containers</h4>
              <div className="text-sm">
                {counts.running} container{counts.running !== 1 ? 's' : ''} running
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {counts.stopped !== undefined && (
        <Popover>
          <PopoverTrigger asChild>
            <button className="inline-flex items-center rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900 dark:text-red-300 cursor-pointer w-[85px] justify-between ml-1">
              <span className="text-left">Stopped</span>
              <span className="font-mono text-right">{formatCount(counts.stopped)}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto">
            <div className="grid gap-2">
              <h4 className="font-medium leading-none">Stopped Containers</h4>
              <div className="text-sm">
                {counts.stopped} container{counts.stopped !== 1 ? 's' : ''} stopped
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}

      <button
        onClick={(e) => {
          e.stopPropagation();
          onRefresh();
        }}
        className="text-gray-400 hover:text-gray-600 ml-1"
        title="Refresh counts"
      >
        <RefreshCw className="h-3 w-3" />
      </button>
    </div>
  );
}
