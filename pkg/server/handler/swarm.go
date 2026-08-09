package handler

import (
	"errors"
	"strconv"

	"github.com/dokemon-ng/dokemon/pkg/dockerapi"
	"github.com/dokemon-ng/dokemon/pkg/messages"
	"github.com/dokemon-ng/dokemon/pkg/util"
	"github.com/labstack/echo/v4"
)

func (h *Handler) GetSwarmClusterInfo(c echo.Context) error {
	res, err := dockerapi.GetSwarmClusterInfo()
	if err != nil {
		return unprocessableEntity(c, err)
	}
	return ok(c, res)
}

func (h *Handler) GetSwarmClusterNodesList(c echo.Context) error {
	role := c.QueryParam("role")
	status := c.QueryParam("status")
	availability := c.QueryParam("availability")

	nodeId, err := strconv.Atoi(c.Param("nodeId"))
	if err != nil {
		return unprocessableEntity(c, errors.New("nodeId should be an integer"))
	}

	filterArgs := util.CreateNodeFilters(role, status, availability)

	req := dockerapi.ClusterSwarmNodeList{
		Filters: filterArgs,
	}

	var response *dockerapi.ClusterSwarmNodeListResponse
	if nodeId == 1 {
		response, err = dockerapi.GetSwarmClusterNodesList(&req)
	} else {
		response, err = messages.ProcessTaskWithResponse[dockerapi.ClusterSwarmNodeList, dockerapi.ClusterSwarmNodeListResponse](uint(nodeId), req, defaultTimeout)
	}

	if err != nil {
		return unprocessableEntity(c, err)
	}
	return ok(c, response)
}

func (h *Handler) GetSwarmNodeByID(c echo.Context) error {
	var err error

	nodeId, err := strconv.Atoi(c.Param("nodeId"))
	if err != nil {
		return unprocessableEntity(c, errors.New("nodeId should be an integer"))
	}

	swarmNodeId := c.Param("id")
	if swarmNodeId == "" {
		return unprocessableEntity(c, errors.New("swarm node ID is required"))
	}

	m := dockerapi.SwarmNodeInfoId{
		Id: swarmNodeId,
	}
	var response *dockerapi.SwarmNodeInfoDetailsResponse

	if nodeId == 1 {
		response, err = dockerapi.GetSwarmNodeByID(&m)
	} else {
		response, err = messages.ProcessTaskWithResponse[dockerapi.SwarmNodeInfoId, dockerapi.SwarmNodeInfoDetailsResponse](uint(nodeId), m, defaultTimeout)
	}
	if err != nil {
		return unprocessableEntity(c, err)
	}
	return ok(c, response)
}

func (h *Handler) RemoveSwarmClusterNode(c echo.Context) error {
	var err error

	nodeId, err := strconv.Atoi(c.Param("nodeId"))
	if err != nil {
		return unprocessableEntity(c, errors.New("nodeId should be an integer"))
	}

	swarmNodeId := c.Param("id")
	if swarmNodeId == "" {
		return unprocessableEntity(c, errors.New("swarm node ID is required"))
	}

	m := dockerapi.ClusterSwarmNodeRemoveRequest{
		Id:    swarmNodeId,
		Force: true,
	}

	if nodeId == 1 {
		err = dockerapi.SwarmClusterNodeRemove(&m)
	} else {
		err = messages.ProcessTask(uint(nodeId), m, defaultTimeout)
	}
	return err
}

func (h *Handler) UpdateSwarmClusterNode(c echo.Context) error {
	var err error
	nodeId, err := strconv.Atoi(c.Param("nodeId"))
	if err != nil {
		return unprocessableEntity(c, errors.New("nodeId should be an integer"))
	}

	swarmNodeId := c.Param("id")
	if swarmNodeId == "" {
		return unprocessableEntity(c, errors.New("swarm node ID is required"))
	}
	var updateRequest dockerapi.SwarmNodeUpdateRequest
	if err := c.Bind(&updateRequest); err != nil {
		return unprocessableEntity(c, errors.New("invalid request body"))
	}
	updateRequest.Id = swarmNodeId

	swarmUpdateRequest := dockerapi.SwarmNodeUpdateRequest{
		Id:           updateRequest.Id,
		Role:         updateRequest.Role,
		Availability: updateRequest.Availability,
		Name:         updateRequest.Name,
		Labels:       updateRequest.Labels,
	}

	if nodeId == 1 {
		err = dockerapi.SwarmClusterUpdateNode(&swarmUpdateRequest)
	} else {
		err = messages.ProcessTask(uint(nodeId), swarmUpdateRequest, defaultTimeout)
	}
	if err != nil {
		return err
	}
	return ok(c, dockerapi.SwarmNodeUpdateRequest{
		Id:           updateRequest.Id,
		Role:         updateRequest.Role,
		Availability: updateRequest.Availability,
		Name:         updateRequest.Name,
		Labels:       updateRequest.Labels,
	})
}

func (h *Handler) PromoteOrDemoteSwarmClusterNode(c echo.Context) error {
	var err error
	nodeId, err := strconv.Atoi(c.Param("nodeId"))
	if err != nil {
		return unprocessableEntity(c, errors.New("nodeId should be an integer"))
	}

	swarmNodeId := c.Param("id")
	if swarmNodeId == "" {
		return unprocessableEntity(c, errors.New("swarm node ID is required"))
	}
	var request dockerapi.SwarmNodePromoteOrDemoteRequest
	if err := c.Bind(&request); err != nil {
		return unprocessableEntity(c, errors.New("invalid request body"))
	}
	request.Id = swarmNodeId
	updateRequest := dockerapi.SwarmNodePromoteOrDemoteRequest{
		Id:     request.Id,
		Action: request.Action,
	}
	if nodeId == 1 {
		err = dockerapi.SwarmClusterPromoteOrDemoteNode(&updateRequest)
	} else {
		err = messages.ProcessTask(uint(nodeId), updateRequest, defaultTimeout)
	}
	if err != nil {
		return err
	}
	return ok(c, dockerapi.SwarmNodePromoteOrDemoteRequest{
		Id:     request.Id,
		Action: request.Action,
	})
}
