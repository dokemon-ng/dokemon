package handler

import (
	"github.com/dokemon-ng/dokemon/pkg/dockerapi"
	"github.com/labstack/echo/v4"
)

func (h *Handler) GetDiskUsage(c echo.Context) error {
	res, err := dockerapi.GetDiskUsage()
	if err != nil {
		return unprocessableEntity(c, err)
	}
	return ok(c, res)
}
