import { useState } from "react";
import { useParams } from "react-router-dom";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/solid";
import {
  Breadcrumb,
  BreadcrumbCurrent,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/widgets/breadcrumb";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Loading from "@/components/widgets/loading";
import MainArea from "@/components/widgets/main-area";
import TopBar from "@/components/widgets/top-bar";
import TopBarActions from "@/components/widgets/top-bar-actions";
import MainContent from "@/components/widgets/main-content";
import TableButtonDelete from "@/components/widgets/table-button-delete";
import { TableNoData } from "@/components/widgets/table-no-data";
import DeleteDialog from "@/components/delete-dialog";
import useVolumes from "@/hooks/useVolumes";
import useNodeHead from "@/hooks/useNodeHead";
import { IVolume } from "@/lib/api-models";
import { convertByteToMb, toastFailed, toastSuccess } from "@/lib/utils";
import apiBaseUrl from "@/lib/api-base-url";
import { useFilterAndSort } from "@/lib/useFilterAndSort";
import { usePagination } from "@/lib/pagination";
import PaginationFooter from "@/components/ui/pagination-footer";


export default function VolumeList() {
  const { nodeId } = useParams();
  const { nodeHead } = useNodeHead(nodeId!);
  const { isLoading, volumes, mutateVolumes } = useVolumes(nodeId!);

  const [volume, setVolume] = useState<IVolume | null>(null);
  const [deleteVolumeOpenConfirmation, setDeleteVolumeOpenConfirmation] = useState(false);
  const [deleteInProgress, setDeleteInProgress] = useState(false);
  const [pruneInProgress, setPruneInProgress] = useState(false);
  const [createVolumeOpen, setCreateVolumeOpen] = useState(false);
  const [createInProgress, setCreateInProgress] = useState(false);
  const [volumeName, setVolumeName] = useState("");
  const [driver, setDriver] = useState("local");

  const {
    searchTerm,
    setSearchTerm,
    sortedItems: sortedVolumes = [],
    requestSort,
    sortConfig
  } = useFilterAndSort<IVolume>(volumes?.items || [], {
    initialSortKey: "driver",
    initialSortDirection: "asc",
    filterKeys: ['driver', 'name', 'inUse'] as (keyof IVolume)[]
  });

  const [paginationConfig, paginationFunctions, paginatedVolumes] = usePagination(
    sortedVolumes,
    10
  )

  if (isLoading) return <Loading />;

  const handleDeleteVolumeConfirmation = (volume: IVolume) => {
    setVolume({ ...volume });
    setDeleteVolumeOpenConfirmation(true);
  };

  const handleDelete = async () => {
    setDeleteInProgress(true);
    const response = await fetch(
      `${apiBaseUrl()}/nodes/${nodeId}/volumes/remove`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: volume?.name }),
      }
    );
    if (!response.ok) {
      const r = await response.json();
      setDeleteVolumeOpenConfirmation(false);
      toastFailed(r.errors?.body);
    } else {
      mutateVolumes();
      setTimeout(() => {
        setDeleteVolumeOpenConfirmation(false);
        toastSuccess("Volume deleted.");
      }, 500);
    }
    setDeleteInProgress(false);
  };

  const handlePrune = async () => {
    setPruneInProgress(true);
    const response = await fetch(
      `${apiBaseUrl()}/nodes/${nodeId}/volumes/prune`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      }
    );
    if (!response.ok) {
      const r = await response.json();
      toastFailed(r.errors?.body);
    } else {
      mutateVolumes();
      const r = await response.json();
      let description = "Nothing found to delete";
      if (r.volumesDeleted?.length > 0) {
        description = `${r.volumesDeleted.length
          } unused volumes deleted. Space reclaimed: ${convertByteToMb(
            r.spaceReclaimed
          )}`;
      }
      setTimeout(async () => {
        toastSuccess(description);
      }, 500);
    }
    setPruneInProgress(false);
  };

  const handleCreateVolume = async () => {
    setCreateInProgress(true);
    const response = await fetch(
      `${apiBaseUrl()}/nodes/${nodeId}/volumes/create`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: volumeName,
          driver: driver
        }),
      }
    );
    if (!response.ok) {
      const r = await response.json();
      toastFailed(r.errors?.body);
    } else {
      mutateVolumes();
      setTimeout(() => {
        setCreateVolumeOpen(false);
        setVolumeName("");
        setDriver("local");
        toastSuccess("Volume created successfully.");
      }, 500);
    }
    setCreateInProgress(false);
  };

  return (
    <MainArea>
      {deleteVolumeOpenConfirmation && (
        <DeleteDialog
          openState={deleteVolumeOpenConfirmation}
          setOpenState={setDeleteVolumeOpenConfirmation}
          deleteCaption=""
          deleteHandler={handleDelete}
          isProcessing={deleteInProgress}
          title="Delete Volume"
          message={`Are you sure you want to delete volume '${volume?.name}'?`}
        />
      )}

      <Dialog open={createVolumeOpen} onOpenChange={setCreateVolumeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Volume</DialogTitle>
            <DialogDescription>
              Create a new Docker volume
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={volumeName}
                onChange={(e) => setVolumeName(e.target.value)}
                className="col-span-3"
                placeholder="volume-name"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="driver" className="text-right">
                Driver
              </Label>
              <Input
                id="driver"
                value={driver}
                onChange={(e) => setDriver(e.target.value)}
                className="col-span-3"
                placeholder="local"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              onClick={handleCreateVolume}
              disabled={createInProgress || !volumeName}
            >
              {createInProgress ? "Creating..." : "Create Volume"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TopBar>
        <Breadcrumb>
          <BreadcrumbLink to="/nodes">Nodes</BreadcrumbLink>
          <BreadcrumbSeparator />
          <BreadcrumbCurrent>{nodeHead?.name}</BreadcrumbCurrent>
          <BreadcrumbSeparator />
          <BreadcrumbCurrent>Volumes</BreadcrumbCurrent>
        </Breadcrumb>
        <TopBarActions>
          <Button
            variant="default"
            className="mr-2"
            onClick={() => setCreateVolumeOpen(true)}
          >
            Create Volume
          </Button>
          <DeleteDialog
            widthClass="w-42"
            deleteCaption="Delete Unused (Prune All)"
            deleteHandler={handlePrune}
            isProcessing={pruneInProgress}
            title="Delete Unused"
            message={`Are you sure you want to delete all unused volumes?`}
          />
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
              placeholder="Search volumes..."
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
                onClick={() => requestSort("driver")}
              >
                <div className="flex items-center">
                  Driver
                  {sortConfig.key === "driver" && (
                    <span className="ml-1">
                      {sortConfig.direction === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </div>
              </TableHead>
              <TableHead
                scope="col"
                className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => requestSort("name")}
              >
                <div className="flex items-center">
                  Name
                  {sortConfig.key === "name" && (
                    <span className="ml-1">
                      {sortConfig.direction === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </div>
              </TableHead>
              <TableHead
                scope="col"
                className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => requestSort("inUse")}
              >
                <div className="flex items-center">
                  Status
                  {sortConfig.key === "inUse" && (
                    <span className="ml-1">
                      {sortConfig.direction === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </div>
              </TableHead>
              <TableHead scope="col">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedVolumes.length === 0 ? (
              <TableNoData colSpan={4} />
            ) : (
              paginatedVolumes.map((item) => (
                <TableRow key={item.name}>
                  <TableCell>{item.driver}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.inUse ? "In use" : "Unused"}</TableCell>
                  <TableCell className="text-right">
                    {!item.inUse && (
                      <TableButtonDelete
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteVolumeConfirmation(item);
                        }}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <PaginationFooter
          paginationConfig={paginationConfig}
          paginationFunctions={paginationFunctions}
          pageSizeOptions={[5, 10, 25, 50, 100]}
        />
      </MainContent>
    </MainArea>
  );
}
