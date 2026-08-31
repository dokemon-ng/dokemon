package dockerapi

import (
	"context"
	"fmt"
	"maps"
	"strings"

	"github.com/docker/docker/api/types/swarm"
	"github.com/docker/docker/client"
	"github.com/dokemon-ng/dokemon/pkg/util"
	"github.com/rs/zerolog/log"
)

var NodeAvailability = map[string]string{
	"active": "active",
	"drain":  "drain",
	"pause":  "pause",
}

var NodeRole = map[string]string{
	"worker":  "worker",
	"manager": "manager",
}

func GetSwarmClusterInfo() (*ClusterInfo, error) {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return nil, err
	}

	clusterInfo, err := cli.SwarmInspect(context.Background())
	if err != nil {
		return nil, err
	}

	nodes, err := cli.NodeList(context.Background(), swarm.NodeListOptions{})
	if err != nil {
		return nil, err
	}

	var managerCount, workerCount int
	for _, node := range nodes {
		switch node.Spec.Role {
		case swarm.NodeRoleManager:
			managerCount++
		case swarm.NodeRoleWorker:
			workerCount++
		}
	}

	tlsInfo := "Disabled"
	if clusterInfo.TLSInfo.TrustRoot != "" {
		tlsInfo = fmt.Sprintf("TrustRoot: %s", util.ShortenString(clusterInfo.TLSInfo.TrustRoot, 50))
	}

	var specInfo strings.Builder
	if clusterInfo.Spec.Name != "" {
		specInfo.WriteString(fmt.Sprintf("Name: %s", clusterInfo.Spec.Name))
	}

	response := &ClusterInfo{
		ID:                     clusterInfo.ID,
		Name:                   clusterInfo.Spec.Name,
		CreatedAt:              clusterInfo.CreatedAt.String(),
		UpdatedAt:              clusterInfo.UpdatedAt.String(),
		Version:                fmt.Sprintf("Index: %d", clusterInfo.Version.Index),
		TLSInfo:                tlsInfo,
		RootRotationInProgress: clusterInfo.RootRotationInProgress,
		DefaultAddrPool:        clusterInfo.DefaultAddrPool,
		SubnetSize:             clusterInfo.SubnetSize,
		DataPathPort:           clusterInfo.DataPathPort,
		Spec:                   specInfo.String(),
		NodeCount:              len(nodes),
		ManagerCount:           managerCount,
		WorkerCount:            workerCount,
	}

	return response, nil
}

func GetSwarmClusterNodesList(req *ClusterSwarmNodeList) (*ClusterSwarmNodeListResponse, error) {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return nil, err
	}

	nodes, err := cli.NodeList(context.Background(), swarm.NodeListOptions{
		Filters: req.Filters,
	})
	if err != nil {
		return nil, err
	}

	var nodeList []*SwarmNodeInfo
	for _, node := range nodes {
		nodeInfo := &SwarmNodeInfo{
			ID:           node.ID,
			Name:         node.Description.Hostname,
			Role:         string(node.Spec.Role),
			Engine:       node.Description.Engine.EngineVersion,
			IPAddress:    util.GetNodeIPAddress(node),
			Status:       string(node.Status.State),
			Availability: string(node.Spec.Availability),
		}
		if node.Description.Resources.NanoCPUs != 0 || node.Description.Resources.MemoryBytes != 0 {
			nodeInfo.CPU = node.Description.Resources.NanoCPUs
			nodeInfo.Memory = node.Description.Resources.MemoryBytes
		}
		nodeList = append(nodeList, nodeInfo)
	}
	response := &ClusterSwarmNodeListResponse{
		Nodes: nodeList,
		Count: len(nodeList),
	}
	return response, nil
}

func GetSwarmNodeByID(req *SwarmNodeInfoId) (*SwarmNodeInfoDetailsResponse, error) {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return nil, err
	}

	node, _, err := cli.NodeInspectWithRaw(context.Background(), req.Id)
	if err != nil {
		return nil, err
	}
	osInfo := fmt.Sprintf("%s %s", node.Description.Platform.OS, node.Description.Platform.Architecture)
	if node.Description.Platform.OS == "linux" && node.Description.Platform.OS != "" {
		osInfo = fmt.Sprintf("%s %s (%s)", node.Description.Platform.OS, node.Description.Platform.Architecture, node.Description.Platform.OS)
	}
	var labels []string
	for key, value := range node.Spec.Labels {
		labels = append(labels, fmt.Sprintf("%s=%s", key, value))
	}
	plugins := node.Description.Engine.Plugins
	volumeType := "default"
	networkPlugin := "default"

	for _, plugin := range plugins {
		switch plugin.Type {
		case "Volume":
			if plugin.Name != "" {
				volumeType = plugin.Name
			}
		case "Network":
			if len(plugin.Name) > 0 {
				networkPlugin = plugin.Name
			}
		}
	}

	nodeDetails := &SwarmNodeInfoDetailsResponse{
		Name:          node.Description.Hostname,
		OSInfo:        osInfo,
		CPU:           node.Description.Resources.NanoCPUs,
		Memory:        node.Description.Resources.MemoryBytes,
		Version:       node.Description.Engine.EngineVersion,
		VolumeType:    volumeType,
		NetworkPlugin: networkPlugin,
		Role:          string(node.Spec.Role),
		Availability:  string(node.Spec.Availability),
		Status:        string(node.Status.State),
		Labels:        labels,
	}
	return nodeDetails, nil
}

func SwarmClusterNodeRemove(req *ClusterSwarmNodeRemoveRequest) error {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return err
	}
	err = cli.NodeRemove(context.Background(), req.Id, swarm.NodeRemoveOptions{
		Force: req.Force,
	})
	if err != nil {
		return err
	}
	return nil
}

func SwarmClusterUpdateNode(req *SwarmNodeUpdateRequest) error {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return err
	}
	node, _, err := cli.NodeInspectWithRaw(context.Background(), req.Id)
	if err != nil {
		return err
	}
	if string(node.Spec.Availability) == req.Availability {
		log.Error().Err(err).Msg("Cannot change node status to same status")
	}

	if req.Role == "" {
		req.Role = string(node.Spec.Role)
	}

	if req.Availability == "" {
		req.Availability = string(node.Spec.Availability)
	}

	if req.Name == "" {
		req.Name = string(node.Spec.Name)
	}

	nodeSpec := node.Spec
	nodeSpec.Name = req.Name
	nodeSpec.Availability = swarm.NodeAvailability(req.Availability)
	nodeSpec.Role = swarm.NodeRole(req.Role)
	if req.Labels != nil {
		if nodeSpec.Labels == nil {
			nodeSpec.Labels = make(map[string]string)
		}
		maps.Copy(nodeSpec.Labels, req.Labels)
	}

	err = cli.NodeUpdate(context.Background(), req.Id, node.Version, nodeSpec)
	if err != nil {
		return err
	}
	return nil
}

func SwarmClusterPromoteOrDemoteNode(req *SwarmNodePromoteOrDemoteRequest) error {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return err
	}
	node, _, err := cli.NodeInspectWithRaw(context.Background(), req.Id)
	if err != nil {
		return err
	}
	currentRole := string(node.Spec.Role)
	var targetRole swarm.NodeRole
	switch req.Action {
	case "promote":
		targetRole = swarm.NodeRoleManager
	case "demote":
		if currentRole == "worker" {
			return fmt.Errorf("node %s is already a worker", req.Id)
		}
		if util.IsLastManager(cli, req.Id) {
			return fmt.Errorf("cannot demote the last manager in the swarm")
		}
		targetRole = swarm.NodeRoleWorker
	}

	nodeSpec := node.Spec
	nodeSpec.Role = targetRole
	err = cli.NodeUpdate(context.Background(), req.Id, node.Version, nodeSpec)
	if err != nil {
		return err
	}
	return nil
}
