package dockerapi

import (
	"context"
	"fmt"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/build"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/image"
	"github.com/docker/docker/api/types/volume"
	"github.com/docker/docker/client"
)

type ResourceStats struct {
	Total       int
	Active      int
	Size        int64
	Reclaimable int64
}

func calculateImageStats(images []*image.Summary) ResourceStats {
	var stats ResourceStats
	stats.Total = len(images)
	for _, img := range images {
		stats.Size += img.Size
		if img.Containers == 0 {
			stats.Reclaimable += img.Size
		} else {
			stats.Active++
		}
	}
	return stats
}

func calculateContainerStats(containers []*container.Summary) ResourceStats {
	var stats ResourceStats
	stats.Total = len(containers)
	for _, cnt := range containers {
		stats.Size += cnt.SizeRw
		if cnt.State != "running" {
			stats.Reclaimable += cnt.SizeRw
		} else {
			stats.Active++
		}
	}
	return stats
}

func calculateVolumeStats(volumes []*volume.Volume) ResourceStats {
	var stats ResourceStats
	stats.Total = len(volumes)
	stats.Active = stats.Total
	for _, vol := range volumes {
		if vol.UsageData != nil {
			stats.Size += vol.UsageData.Size
		}
	}
	return stats
}

func calculateBuildCacheStats(cacheItems []*build.CacheRecord) ResourceStats {
	var stats ResourceStats
	if cacheItems == nil {
		return stats
	}

	stats.Total = len(cacheItems)
	for _, cache := range cacheItems {
		stats.Size += cache.Size
		if !cache.InUse {
			stats.Reclaimable += cache.Size
		} else {
			stats.Active++
		}
	}
	return stats
}

func createDiskUsageCategory(resourceType string, stats ResourceStats) DiskUsageCategory {
	percent := calculatePercentage(stats.Reclaimable, stats.Size)
	return DiskUsageCategory{
		Type:               resourceType,
		Total:              stats.Total,
		Active:             stats.Active,
		Size:               formatBytes(stats.Size),
		Reclaimable:        fmt.Sprintf("%s (%.2f%%)", formatBytes(stats.Reclaimable), percent),
		ReclaimablePercent: fmt.Sprintf("%.2f%%", percent),
	}
}

func calculatePercentage(reclaimable, total int64) float64 {
	if total == 0 {
		return 0
	}
	return float64(reclaimable) / float64(total) * 100
}

func formatBytes(bytes int64) string {
	const unit = 1024
	if bytes < unit {
		return fmt.Sprintf("%dB", bytes)
	}
	div, exp := int64(unit), 0
	for n := bytes / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f%cB", float64(bytes)/float64(div), "KMGTPE"[exp])
}

func GetDiskUsage() (*DiskUsageSummary, error) {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return nil, err
	}

	diskUsage, err := cli.DiskUsage(context.Background(), types.DiskUsageOptions{})
	if err != nil {
		return nil, err
	}

	imageStats := calculateImageStats(diskUsage.Images)
	containerStats := calculateContainerStats(diskUsage.Containers)
	volumeStats := calculateVolumeStats(diskUsage.Volumes)
	buildCacheStats := calculateBuildCacheStats(diskUsage.BuildCache)

	return &DiskUsageSummary{
		Categories: []DiskUsageCategory{
			createDiskUsageCategory("Images", imageStats),
			createDiskUsageCategory("Containers", containerStats),
			createDiskUsageCategory("Local Volumes", volumeStats),
			createDiskUsageCategory("Build Cache", buildCacheStats),
		},
	}, nil
}
