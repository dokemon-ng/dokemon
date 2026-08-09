package dockerapi

import (
	"github.com/docker/docker/api/types/filters"
	"github.com/dokemon-ng/dokemon/pkg/server/store"
)

// Containers

type Port struct {
	IP          string `json:"ip"`
	Type        string `json:"type"`
	PrivatePort uint16 `json:"privatePort"`
	PublicPort  uint16 `json:"publicPort"`
}

type Container struct {
	Id     string `json:"id"`
	Name   string `json:"name"`
	Image  string `json:"image"`
	Status string `json:"status"`
	State  string `json:"state"`
	Stale  string `json:"stale"`
	Ports  []Port `json:"ports"`
}

type DockerContainerList struct {
	All bool `json:"all"`
}

type DockerContainerListResponse struct {
	Items []Container `json:"items"`
}

type DockerContainerStart struct {
	Id string `json:"id"`
}

type DockerContainerStop struct {
	Id string `json:"id"`
}

type DockerContainerRestart struct {
	Id string `json:"id"`
}

type DockerContainerRemove struct {
	Id    string `json:"id"`
	Force bool   `json:"force"`
}

type DockerContainerLogs struct {
	Id string `json:"id"`
}

type DockerContainerTerminal struct {
	Id string `json:"id"`
}

// Images

type Image struct {
	Id       string `json:"id"`
	Name     string `json:"name"`
	Tag      string `json:"tag"`
	Size     int64  `json:"size"`
	Created  int64  `json:"created"`
	Dangling bool   `json:"dangling"`
	InUse    bool   `json:"inUse"`
}

type DockerImageList struct {
	All bool `json:"all"`
}

type DockerImageListResponse struct {
	Items []Image `json:"items"`
}

type DockerImagePull struct {
	Image string `json:"image"`
	Tag   string `json:"tag"`
}

type DockerImageRemove struct {
	Id    string `json:"id"`
	Force bool   `json:"force"`
}

type DockerImagesPrune struct {
	All bool `json:"all"` // Remove all unused images, not just dangling
}

type DockerImagesPruneDeletedItem struct {
	Deleted  string `json:"deleted"`
	Untagged string `json:"untagged"`
}

type DockerImagesPruneResponse struct {
	ImagesDeleted  []DockerImagesPruneDeletedItem `json:"imagesDeleted"`
	SpaceReclaimed uint64                         `json:"spaceReclaimed"`
}

type DockerVolumeList struct{}

type Volume struct {
	Driver string `json:"driver"`
	Name   string `json:"name"`
	InUse  bool   `json:"inUse"`
}

type DockerVolumeListResponse struct {
	Items []Volume `json:"items"`
}

type DockerVolumeRemove struct {
	Name string `json:"name"`
}

type DockerVolumesPrune struct {
	All bool `json:"all"` // Remove all unused volumes, not just anonymous ones
}

type DockerVolumesPruneResponse struct {
	VolumesDeleted []string `json:"volumesDeleted"`
	SpaceReclaimed uint64   `json:"spaceReclaimed"`
}

// DockerVolumeCreate contains volume creation parameters
type DockerVolumeCreate struct {
	DriverOpts map[string]string
	Labels     map[string]string
	Name       string
	Driver     string
}

// DockerVolumeCreateResponse contains created volume info
type DockerVolumeCreateResponse struct {
	Name       string
	Driver     string
	Mountpoint string
}

type DockerNetworkList struct{}

type Network struct {
	Id     string `json:"id"`
	Name   string `json:"name"`
	Driver string `json:"driver"`
	Scope  string `json:"scope"`
	InUse  bool   `json:"inUse"`
}

type DockerNetworkListResponse struct {
	Items []Network `json:"items"`
}

type DockerNetworkRemove struct {
	Id string `json:"id"`
}

type DockerNetworksPrune struct{}

type DockerNetworksPruneResponse struct {
	NetworksDeleted []string `json:"networksDeleted"`
}

type DockerComposeList struct{}

type DockerComposeGet struct {
	ProjectName string `json:"projectName"`
}

type DockerNetworkCreate struct {
	Options    map[string]string
	Labels     map[string]string
	IPAM       *IPAMConfig
	Name       string
	Driver     string
	Internal   bool
	Attachable bool
	Ingress    bool
	EnableIPv6 bool
}

type DockerNetworkCreateResponse struct {
	ID      string `json:"Id"`
	Warning string
}

type IPAMConfig struct {
	Options map[string]string `json:"Options"`
	Driver  string            `json:"Driver"`
	Config  []IPAMPool        `json:"Config"`
}

type IPAMPool struct {
	Subnet  string `json:"Subnet"`
	Gateway string `json:"Gateway"`
}

type ComposeItemInternal struct {
	Name        string `json:"Name"`
	Status      string `json:"Status"`
	ConfigFiles string `json:"ConfigFiles"`
}

type ComposeItem struct {
	Name        string `json:"name"`
	Status      string `json:"status"`
	ConfigFiles string `json:"configFiles"`
	Stale       string `json:"stale"`
}

type DockerComposeListResponse struct {
	Items []ComposeItem `json:"items"`
}

type DockerComposeContainerList struct {
	ProjectName string `json:"projectName"`
}

type ComposeContainerInternal struct {
	Id      string `json:"ID"`
	Name    string `json:"Name"`
	Image   string `json:"Image"`
	Service string `json:"Service"`
	Status  string `json:"Status"`
	State   string `json:"State"`
	Ports   string `json:"Ports"`
}

type ComposeContainer struct {
	Id      string `json:"id"`
	Name    string `json:"name"`
	Image   string `json:"image"`
	Service string `json:"service"`
	Status  string `json:"status"`
	State   string `json:"state"`
	Ports   string `json:"ports"`
	Stale   string `json:"stale"`
}

type DockerComposeContainerListResponse struct {
	Items []ComposeContainer `json:"items"`
}

type DockerComposeLogs struct {
	ProjectName string `json:"projectName"`
}

type DockerComposeDeploy struct {
	Variables   map[string]store.VariableValue `json:"variables"`
	ProjectName string                         `json:"projectName"`
	Definition  string                         `json:"definition"`
}

type DockerComposePull struct {
	Variables   map[string]store.VariableValue `json:"variables"`
	ProjectName string                         `json:"projectName"`
	Definition  string                         `json:"definition"`
}

type DockerComposeUp struct {
	Variables   map[string]store.VariableValue `json:"variables"`
	ProjectName string                         `json:"projectName"`
	Definition  string                         `json:"definition"`
}

type DockerComposeDown struct {
	ProjectName string `json:"projectName"`
}

type DockerComposeDownNoStreaming struct {
	ProjectName string `json:"projectName"`
}

type DockerComposeProjectUnique struct {
	ProjectName string `json:"projectName"`
}

type DockerComposeProjectCreate struct {
	ProjectName string `json:"projectName"`
	Definition  string `json:"definition"`
}

type DockerComposeProjectUpdate struct {
	ProjectName string `json:"projectName"`
	Definition  string `json:"definition"`
}

type DockerComposeProjectDelete struct {
	ProjectName string `json:"projectName"`
}

type DockerComposeProjectDefinition struct {
	ProjectName string `json:"projectName"`
}

type DockerComposeProjectDefinitionResponse struct {
	ProjectName string `json:"projectName"`
	Definition  string `json:"definition"`
}

type DiskUsageSummary struct {
	Categories []DiskUsageCategory `json:"categories"`
}

type DiskUsageCategory struct {
	Type               string `json:"type"`
	Size               string `json:"size"`
	Reclaimable        string `json:"reclaimable"`
	ReclaimablePercent string `json:"reclaimablePercent"`
	Total              int    `json:"total"`
	Active             int    `json:"active"`
}

type ResourceStats struct {
	Total       int
	Active      int
	Size        int64
	Reclaimable int64
}

type DockerBuildCachePrune struct {
	All bool `json:"all"`
}

type BuildCachePruneReport struct {
	CachesDeleted  []string `json:"cachesDeleted"`
	SpaceReclaimed uint64   `json:"spaceReclaimed"`
}

type BuildCachePruneRequest struct {
	Filters map[string]string `query:"filters"`
	All     bool              `query:"all"`
}

type ClusterInfo struct {
	Name                   string   `json:"name"`
	CreatedAt              string   `json:"created_at"`
	UpdatedAt              string   `json:"updated_at"`
	Version                string   `json:"version"`
	TLSInfo                string   `json:"tls_info"`
	ID                     string   `json:"id"`
	Spec                   string   `json:"spec"`
	DefaultAddrPool        []string `json:"default_addr_pool"`
	NodeCount              int      `json:"node_count"`
	WorkerCount            int      `json:"worker_count"`
	ManagerCount           int      `json:"manager_count"`
	DataPathPort           uint32   `json:"data_path_port"`
	SubnetSize             uint32   `json:"subnet_size"`
	RootRotationInProgress bool     `json:"root_rotation_in_progress"`
}

type ClusterSwarmNodeList struct {
	Filters filters.Args
}

type ClusterSwarmNodeListResponse struct {
	Nodes []*SwarmNodeInfo `json:"nodes"`
	Count int              `json:"count"`
}

type SwarmNodeInfo struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Role         string `json:"role"`
	Engine       string `json:"engine"`
	IPAddress    string `json:"ip_address"`
	Status       string `json:"status"`
	Availability string `json:"availability"`
	CPU          int64  `json:"cpu"`
	Memory       int64  `json:"memory"`
}

type SwarmNodeInfoDetailsResponse struct {
	Name          string   `json:"name"`
	OSInfo        string   `json:"os"`
	Version       string   `json:"version"`
	VolumeType    string   `json:"volume"`
	NetworkPlugin string   `json:"network"`
	Role          string   `json:"role"`
	Availability  string   `json:"availability"`
	Status        string   `json:"status"`
	Labels        []string `json:"labels"`
	CPU           int64    `json:"cpu"`
	Memory        int64    `json:"memory"`
}

type SwarmNodeInfoId struct {
	Id string `json:"id" validate:"required,max=100"`
}

type ClusterSwarmNodeRemoveRequest struct {
	Id    string `json:"id" validate:"required,max=100"`
	Force bool   `json:"force"`
}

type SwarmNodeUpdateRequest struct {
	Labels       map[string]string `json:"labels"`
	Id           string            `json:"id" validate:"required,max=100"`
	Role         string            `json:"role"`
	Availability string            `json:"availability"`
	Name         string            `json:"name"`
}

type SwarmNodePromoteOrDemoteRequest struct {
	Id     string `json:"id" validate:"required,max=100"`
	Action string `json:"action" validate:"required"` //  promote or demote
}
