package agent

import (
	"fmt"
	"net"
	"os"
	"os/exec"
	"os/signal"
	"runtime"
	"strings"
	"sync"
	"time"

	"github.com/dokemon-ng/dokemon/pkg/common"
	"github.com/dokemon-ng/dokemon/pkg/dockerapi"
	"github.com/dokemon-ng/dokemon/pkg/messages"

	"github.com/gorilla/websocket"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

var (
	logLevel       string
	wsUrl          string
	token          string
	stalenessCheck string = "ON"
)

func getArchitecture() string {
	switch runtime.GOARCH {
	case "amd64":
		return "amd64"
	case "arm64":
		return "arm64"
	case "arm":
		return "armv7"
	default:
		return runtime.GOARCH
	}
}

func logAllNetworkInterfaces() {
	interfaces, err := net.Interfaces()
	if err != nil {
		log.Error().Err(err).Msg("Failed to get network interfaces")
		return
	}

	for _, iface := range interfaces {
		logData := log.Info().
			Str("interface", iface.Name).
			Str("flags", iface.Flags.String()).
			Str("hardware", iface.HardwareAddr.String())

		addrs, err := iface.Addrs()
		if err != nil {
			logData.Msg("Interface (failed to get addresses)")
			continue
		}

		var ips []string
		for _, addr := range addrs {
			ipnet, ok := addr.(*net.IPNet)
			if ok {
				ips = append(ips, ipnet.IP.String())
			}
		}
		logData.Strs("ips", ips).Msg("Network interface details")
	}
}

func getMainIP() string {
	// Get all relevant IPs
	localIP := getLocalNetworkIP()

	// Get all network interfaces
	interfaces, err := net.Interfaces()
	if err != nil {
		return ""
	}

	// Collect all ZeroTier IPs (interfaces starting with "zt")
	var ztIPs []string
	// Collect all Tailscale IPs (interfaces starting with "tailscale")
	var tsIPs []string

	for _, iface := range interfaces {
		ifaceName := iface.Name

		// Check for ZeroTier interfaces
		if strings.HasPrefix(ifaceName, "zt") {
			if ip := getInterfaceIP(ifaceName); ip != "" {
				ztIPs = append(ztIPs, "zt:"+ip)
			}
		}

		// Check for Tailscale interfaces
		if strings.HasPrefix(ifaceName, "tailscale") {
			if ip := getInterfaceIP(ifaceName); ip != "" {
				tsIPs = append(tsIPs, "ts:"+ip)
			}
		}
	}

	// Build the version string components
	var components []string
	if localIP != "" {
		components = append(components, localIP)
	}
	// Add all ZeroTier IPs
	components = append(components, ztIPs...)
	// Add all Tailscale IPs
	components = append(components, tsIPs...)

	if len(components) > 0 {
		return strings.Join(components, "+")
	}
	return ""
}
func getLocalNetworkIP() string {
	// Try Docker bridge method first
	if ip := getHostIPViaDockerBridge(); ip != "" {
		return ip
	}

	// Try default route method
	if ip := getIPFromDefaultRoute(); ip != "" {
		return ip
	}

	// Try Docker bridge IP method
	if ip := getIPFromDockerBridge(); ip != "" {
		return ip
	}

	return ""
}

func getInterfaceIP(ifaceName string) string {
	iface, err := net.InterfaceByName(ifaceName)
	if err != nil {
		return ""
	}

	addrs, err := iface.Addrs()
	if err != nil {
		return ""
	}

	for _, addr := range addrs {
		ipNet, ok := addr.(*net.IPNet)
		if !ok || ipNet.IP.To4() == nil || ipNet.IP.IsLoopback() {
			continue
		}
		return ipNet.IP.String()
	}
	return ""
}

func getHostIPViaDockerBridge() string {
	cmd := exec.Command("sh", "-c", "ip route | awk '/default/ {print $3}'")
	output, err := cmd.Output()
	if err == nil {
		gatewayIP := strings.TrimSpace(string(output))
		if net.ParseIP(gatewayIP) != nil && !isDockerIP(gatewayIP) {
			log.Debug().Str("source", "docker bridge gateway").Str("ip", gatewayIP).Msg("Found host IP")
			return gatewayIP
		}
	}
	return ""
}

func getIPFromDefaultRoute() string {
	ifaces, err := net.Interfaces()
	if err != nil {
		return ""
	}

	for _, iface := range ifaces {
		if iface.Flags&net.FlagUp == 0 || iface.Flags&net.FlagLoopback != 0 {
			continue
		}

		addrs, err := iface.Addrs()
		if err != nil {
			continue
		}

		for _, addr := range addrs {
			ipNet, ok := addr.(*net.IPNet)
			if !ok || ipNet.IP.To4() == nil {
				continue
			}
			ip := ipNet.IP.String()
			if !isDockerIP(ip) {
				log.Debug().Str("source", "host interface "+iface.Name).Str("ip", ip).Msg("Found host IP")
				return ip
			}
		}
	}
	return ""
}

func getIPFromDockerBridge() string {
	cmd := exec.Command("sh", "-c", "ip -4 addr show docker0 | grep -oP '(?<=inet\\s)\\d+(\\.\\d+){3}'")
	output, err := cmd.Output()
	if err == nil {
		ip := strings.TrimSpace(string(output))
		if net.ParseIP(ip) != nil {
			parts := strings.Split(ip, ".")
			if len(parts) == 4 {
				parts[3] = fmt.Sprintf("%d", atoi(parts[3])+1)
				hostIP := strings.Join(parts, ".")
				log.Debug().Str("source", "docker0 bridge").Str("ip", hostIP).Msg("Derived host IP")
				return hostIP
			}
		}
	}
	return ""
}

func atoi(s string) int {
	i := 0
	for _, c := range s {
		i = i*10 + int(c-'0')
	}
	return i
}

func isDockerIP(ip string) bool {
	excludedPrefixes := []string{
		"172.17.", "172.18.", "172.19.", "172.20.",
		"192.168.99.", "100.", "169.254.", "127.",
	}
	for _, prefix := range excludedPrefixes {
		if strings.HasPrefix(ip, prefix) {
			return true
		}
	}
	return false
}

func getFullVersion() string {
	ip := getMainIP()
	if ip != "" {
		return fmt.Sprintf("%s-%s@%s", common.Version, getArchitecture(), ip)
	}
	return fmt.Sprintf("%s-%s", common.Version, getArchitecture())
}

func Main() {
	parseArgs()
	setLogLevel(logLevel)
	if stalenessCheck != "OFF" {
		go dockerapi.ContainerScheduleRefreshStaleStatus()
	}
	listen()
}

func parseArgs() {
	logLevel = os.Getenv("LOG_LEVEL")
	serverUrl := os.Getenv("SERVER_URL")
	token = os.Getenv("TOKEN")
	stalenessCheck = os.Getenv("STALENESS_CHECK")

	serverScheme := "ws"
	if strings.HasPrefix(serverUrl, "https") {
		serverScheme = "wss"
	}

	urlParts := strings.Split(serverUrl, "//")
	if len(urlParts) != 2 {
		panic("Invalid SERVER_URL " + serverUrl)
	}

	host := urlParts[1]
	wsUrl = fmt.Sprintf("%s://%s/ws", serverScheme, host)

	log.Info().Str("url", wsUrl).Msgf("Starting Dokemon Agent %s", getFullVersion())
	log.Info().Str("url", wsUrl).Msg("Server set to URL")
}

func setLogLevel(logLevel string) {
	log.Info().Str("level", logLevel).Msg("Setting log level")
	switch logLevel {
	case "DEBUG":
		zerolog.SetGlobalLevel(zerolog.DebugLevel)
	case "ERROR":
		zerolog.SetGlobalLevel(zerolog.ErrorLevel)
	case "FATAL":
		zerolog.SetGlobalLevel(zerolog.FatalLevel)
	case "INFO":
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	case "WARN":
		zerolog.SetGlobalLevel(zerolog.WarnLevel)
	case "PANIC":
		zerolog.SetGlobalLevel(zerolog.PanicLevel)
	case "TRACE":
		zerolog.SetGlobalLevel(zerolog.TraceLevel)
	default:
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	}
}

func open() *websocket.Conn {
	log.Debug().Str("url", wsUrl).Msg("Opening connection to server")

	c, _, err := websocket.DefaultDialer.Dial(wsUrl, nil)
	if err != nil {
		log.Fatal().Err(err).Str("url", wsUrl).Msg("Error opening connection")
	}

	return c
}

func openWithPing() (*websocket.Conn, *sync.Mutex) {
	c := open()
	mu := setupPinging(c)

	return c, mu
}

func setupPinging(ws *websocket.Conn) *sync.Mutex {
	pongWait := 10 * time.Second
	pingPeriod := (pongWait * 9) / 10

	var mu sync.Mutex

	ws.SetPongHandler(func(string) error {
		log.Trace().Msg("Pong received")
		ws.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	pingTicker := time.NewTicker(pingPeriod)

	go func() {
		for range pingTicker.C {
			log.Trace().Msg("Ping sent")
			mu.Lock()
			err := ws.WriteMessage(websocket.PingMessage, nil)
			mu.Unlock()
			if err != nil {
				if err.Error() != "websocket: close sent" {
					log.Debug().Err(err).Msg("Error when sending Ping control message")
				}
				return
			}

			mu.Lock()
			err = messages.Send[messages.Ping](ws, messages.Ping{})
			mu.Unlock()
			if err != nil {
				if err.Error() != "websocket: close sent" {
					log.Debug().Err(err).Msg("Error when sending Ping application message")
				}
				return
			}
		}
	}()

	return &mu
}

func listen() {
	interrupt := make(chan os.Signal, 1)
	signal.Notify(interrupt, os.Interrupt)

	log.Info().Msg("Connecting to server")
	c, mu := openWithPing()
	defer c.Close()

	// Log all network interfaces for debugging
	logAllNetworkInterfaces()

	mu.Lock()
	initialConnectMessage := messages.ConnectMessage{
		ConnectionToken: token,
		AgentVersion:    getFullVersion(),
		AgentArch:       getArchitecture(),
	}
	messages.Send[messages.ConnectMessage](c, initialConnectMessage)
	mu.Unlock()

	connectResponse, err := messages.Receive[messages.ConnectResponseMessage](c)
	if err != nil {
		log.Fatal().Err(err)
	}
	if connectResponse == nil {
		log.Fatal().Msg("Connection with server failed")
	} else if !connectResponse.Success {
		log.Fatal().Msg(connectResponse.Message)
	}

	log.Info().Msg("Listening for tasks")
	done := make(chan struct{})
	go func() {
		defer close(done)
		listenForTasks(c)
	}()

	for {
		select {
		case <-done:
			return
		case <-interrupt:
			c.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseNormalClosure, ""))
			return
		}
	}
}

func listenForTasks(c *websocket.Conn) {
	taskChan := make(chan string, 100)
	go worker(taskChan)

	for {
		_, message, err := c.ReadMessage()
		if err != nil {
			log.Error().Err(err).Msg("Connection lost to server")
			return
		}
		log.Debug().Str("message", string(message)).Msg("Task received")
		taskChan <- string(message)
	}
}

func worker(taskChan <-chan string) {
	for task := range taskChan {
		taskQueuedMessage, err := messages.Parse[messages.TaskQueuedMessage](task)
		if err != nil {
			continue
		}

		go startTaskSession(*taskQueuedMessage)
	}
}
