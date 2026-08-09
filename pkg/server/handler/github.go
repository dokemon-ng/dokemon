package handler

import (
	"errors"
	"io"
	"net/http"
	"net/url"
	"strings"

	"github.com/dokemon-ng/dokemon/pkg/crypto/ske"
	"github.com/labstack/echo/v4"
	"github.com/rs/zerolog/log"
)

type gitProvider int

const (
	providerUnknown gitProvider = iota
	providerGitHub
	providerGitLab
	providerBitbucket
	providerCodeBerg
)

type gitUrlParts struct {
	Owner    string
	Repo     string
	Ref      string
	Path     string
	Provider gitProvider
}

func getGitUrlParts(rawurl string) (*gitUrlParts, error) {
	u, err := url.Parse(rawurl)
	if err != nil {
		return nil, errors.New("invalid URL")
	}
	parts := strings.Split(u.Path, "/")
	if len(parts) < 5 {
		return nil, errors.New("url should be of format: <provider>/<OWNER>/<REPO>/blob/<REF>/path/to/file")
	}
	var provider gitProvider
	switch u.Host {
	case "github.com":
		provider = providerGitHub
	case "gitlab.com":
		provider = providerGitLab
	case "bitbucket.org":
		provider = providerBitbucket
	case "codeberg.org":
		provider = providerCodeBerg
	default:
		provider = providerUnknown
	}
	return &gitUrlParts{
		Provider: provider,
		Owner:    parts[1],
		Repo:     parts[2],
		Ref:      parts[4],
		Path:     strings.Join(parts[5:], "/"),
	}, nil
}

func getRawFileUrl(p *gitUrlParts) (string, error) {
	switch p.Provider {
	case providerGitHub:
		return "https://raw.githubusercontent.com/" + p.Owner + "/" + p.Repo + "/" + p.Ref + "/" + p.Path, nil
	case providerGitLab:
		return "https://gitlab.com/" + p.Owner + "/" + p.Repo + "/-/raw/" + p.Ref + "/" + p.Path, nil
	case providerBitbucket:
		return "https://bitbucket.org/" + p.Owner + "/" + p.Repo + "/raw/" + p.Ref + "/" + p.Path, nil
	case providerCodeBerg:
		log.Warn().Msg("https://codeberg.org/" + p.Owner + "/" + p.Repo + "/raw/" + p.Ref + "/" + p.Path)
		return "https://codeberg.org/" + p.Owner + "/" + p.Repo + "/raw/" + p.Ref + "/" + p.Path, nil
	default:
		return "", errors.New("unsupported git provider")
	}
}

// getGitFileContent fetches a file from GitHub, GitLab, or Bitbucket using a raw URL
func getGitFileContent(url string, token string) (string, error) {
	p, err := getGitUrlParts(url)
	if err != nil {
		return "", err
	}
	rawUrl, err := getRawFileUrl(p)
	if err != nil {
		return "", err
	}
	client := &http.Client{}
	request, err := http.NewRequest("GET", rawUrl, http.NoBody)
	if err != nil {
		return "", err
	}
	if token != "" {
		request.Header.Add("Authorization", "token "+token)
	}
	resp, err := client.Do(request)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return "", errors.New("failed to fetch file: " + resp.Status)
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	return string(body), nil
}

func (h *Handler) RetrieveGitHubFileContent(c echo.Context) error {
	r := &gitHubfileContentRetrieveRequest{}
	if err := r.bind(c); err != nil {
		return unprocessableEntity(c, err)
	}

	decryptedSecret := ""
	if r.CredentialId != nil {
		credential, err := h.credentialStore.GetById(*r.CredentialId)
		if err != nil || credential == nil {
			return unprocessableEntity(c, errors.New("credentials not found"))
		}

		decryptedSecret, err = ske.Decrypt(credential.Secret)
		if err != nil {
			return unprocessableEntity(c, errors.New("failed to decrypt credentials"))
		}
	}

	content, err := getGitFileContent(r.Url, decryptedSecret)
	if err != nil {
		if r.CredentialId != nil {
			log.Error().Err(err).Str("url", r.Url).Uint("credentialId", *r.CredentialId).Msg("Error while retriveing file content from Git provider")
		} else {
			log.Error().Err(err).Str("url", r.Url).Msg("Error while retriveing file content from Git provider")
		}
		return unprocessableEntity(c, errors.New("error while retrieving file content from provided Git URL"))
	}

	return ok(c, newGitHubfileContentResponse(&content))
}
