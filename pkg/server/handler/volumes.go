package handler

import (
	"errors"
	"strconv"

	"github.com/dokemon-ng/dokemon/pkg/dockerapi"
	"github.com/dokemon-ng/dokemon/pkg/messages"

	"github.com/labstack/echo/v4"
)

func (h *Handler) CreateVolume(c echo.Context) error {
	nodeId, err := strconv.Atoi(c.Param("nodeId"))
	if err != nil {
		return unprocessableEntity(c, errors.New("nodeId should be an integer"))
	}

	m := dockerapi.DockerVolumeCreate{}
	if err := c.Bind(&m); err != nil {
		return unprocessableEntity(c, err)
	}

	var res *dockerapi.DockerVolumeCreateResponse
	if nodeId == 1 {
		res, err = dockerapi.VolumeCreate(&m)
	} else {
		res, err = messages.ProcessTaskWithResponse[dockerapi.DockerVolumeCreate, dockerapi.DockerVolumeCreateResponse](
			uint(nodeId), m, defaultTimeout)
	}

	if err != nil {
		return unprocessableEntity(c, err)
	}

	return created(c, res)
}

func (h *Handler) GetVolumeList(c echo.Context) error {
	var err error

	nodeId, err := strconv.Atoi(c.Param("nodeId"))
	if err != nil {
		return unprocessableEntity(c, errors.New("nodeId should be an integer"))
	}

	req := dockerapi.DockerVolumeList{}

	var res *dockerapi.DockerVolumeListResponse
	if nodeId == 1 {
		res, err = dockerapi.VolumeList(&req)
	} else {
		res, err = messages.ProcessTaskWithResponse[dockerapi.DockerVolumeList, dockerapi.DockerVolumeListResponse](uint(nodeId), req, defaultTimeout)
	}

	if err != nil {
		return unprocessableEntity(c, err)
	}

	return ok(c, res)
}

func (h *Handler) RemoveVolume(c echo.Context) error {
	var err error

	nodeId, err := strconv.Atoi(c.Param("nodeId"))
	if err != nil {
		return unprocessableEntity(c, errors.New("nodeId should be an integer"))
	}

	m := dockerapi.DockerVolumeRemove{}
	r := &dockerVolumeRemoveRequest{}
	if err := r.bind(c, &m); err != nil {
		return unprocessableEntity(c, err)
	}

	if nodeId == 1 {
		err = dockerapi.VolumeRemove(&m)
	} else {
		err = messages.ProcessTask[dockerapi.DockerVolumeRemove](uint(nodeId), m, defaultTimeout)
	}

	if err != nil {
		return unprocessableEntity(c, err)
	}

	return noContent(c)
}

func (h *Handler) PruneVolumes(c echo.Context) error {
	var err error

	nodeId, err := strconv.Atoi(c.Param("nodeId"))
	if err != nil {
		return unprocessableEntity(c, errors.New("nodeId should be an integer"))
	}

	m := dockerapi.DockerVolumesPrune{}
	r := &dockerVolumePruneRequest{}
	if err := r.bind(c, &m); err != nil {
		return unprocessableEntity(c, err)
	}

	var res *dockerapi.DockerVolumesPruneResponse
	if nodeId == 1 {
		res, err = dockerapi.VolumesPrune(&m)
	} else {
		res, err = messages.ProcessTaskWithResponse[dockerapi.DockerVolumesPrune, dockerapi.DockerVolumesPruneResponse](uint(nodeId), m, defaultTimeout)
	}

	if err != nil {
		return unprocessableEntity(c, err)
	}

	return ok(c, res)
}
