package proxmox

import (
	"os"

	"github.com/muhlba91/pulumi-proxmoxve/sdk/v7/go/proxmoxve"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

// ProviderConfig holds provider configuration
type ProviderConfig struct {
	Endpoint string
	Username string
	Password string
	Insecure bool
}

// CreateProvider creates a new Proxmox provider
func CreateProvider(ctx *pulumi.Context, name string, config *ProviderConfig) (*proxmoxve.Provider, error) {
	return proxmoxve.NewProvider(ctx, name, &proxmoxve.ProviderArgs{
		Endpoint: pulumi.String(config.Endpoint),
		Username: pulumi.String(config.Username),
		Password: pulumi.String(config.Password),
		Insecure: pulumi.Bool(config.Insecure),
	})
}

// CreateProviderFromEnv creates a provider using environment variables
func CreateProviderFromEnv(ctx *pulumi.Context, name string) (*proxmoxve.Provider, error) {
	return CreateProvider(ctx, name, &ProviderConfig{
		Endpoint: os.Getenv("PROXMOX_VE_ENDPOINT"),
		Username: os.Getenv("PROXMOX_VE_USERNAME"),
		Password: os.Getenv("PROXMOX_VE_PASSWORD"),
		Insecure: os.Getenv("PROXMOX_VE_INSECURE") == "true",
	})
}

// CreateMultiNodeProviders creates providers for multiple Proxmox nodes
func CreateMultiNodeProviders(ctx *pulumi.Context, nodes map[string]*ProviderConfig) (map[string]*proxmoxve.Provider, error) {
	providers := make(map[string]*proxmoxve.Provider)

	for nodeName, config := range nodes {
		provider, err := CreateProvider(ctx, "proxmox-"+nodeName, config)
		if err != nil {
			return nil, err
		}
		providers[nodeName] = provider
	}

	return providers, nil
}
