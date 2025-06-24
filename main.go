package main

import (
	"os"

	"github.com/joho/godotenv"
	"github.com/muhlba91/pulumi-proxmoxve/sdk/v7/go/proxmoxve"
	"github.com/muhlba91/pulumi-proxmoxve/sdk/v7/go/proxmoxve/vm"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		err := godotenv.Load()
		if err != nil {
			return err
		}

		// Create the Proxmox provider
		proxmoxProvider, err := proxmoxve.NewProvider(ctx, "proxmoxve", &proxmoxve.ProviderArgs{
			Endpoint: pulumi.String(os.Getenv("PROXMOX_VE_ENDPOINT")),
			Username: pulumi.String(os.Getenv("PROXMOX_VE_USERNAME")),
			Password: pulumi.String(os.Getenv("PROXMOX_VE_PASSWORD")),
			Insecure: pulumi.Bool(os.Getenv("PROXMOX_VE_INSECURE") == "true"),
		})

		if err != nil {
			return err
		}

		// Create VM with explicit provider reference
		_, err = vm.NewVirtualMachine(ctx, "vm", &vm.VirtualMachineArgs{
			NodeName: pulumi.String("pve1"),
			VmId:     pulumi.Int(100),
			Name:     pulumi.String("vm"),
			Cpu: &vm.VirtualMachineCpuArgs{
				Cores: pulumi.Int(1),
			},
			Memory: &vm.VirtualMachineMemoryArgs{
				Dedicated: pulumi.Int(1024),
			},
			Agent: &vm.VirtualMachineAgentArgs{
				Enabled: pulumi.Bool(true),
			},
			Cdrom: &vm.VirtualMachineCdromArgs{
				FileId: pulumi.String("local:iso/debian-12.11.0-amd64-netinst.iso"),
			},
			Disks: &vm.VirtualMachineDiskArray{
				&vm.VirtualMachineDiskArgs{
					Size:        pulumi.Int(10),
					DatastoreId: pulumi.String("local-lvm"),
					Interface:   pulumi.String("scsi0"),
				},
			},
			NetworkDevices: &vm.VirtualMachineNetworkDeviceArray{
				&vm.VirtualMachineNetworkDeviceArgs{
					Bridge: pulumi.String("vmbr0"),
					Model:  pulumi.String("virtio"),
				},
			},
			Initialization: &vm.VirtualMachineInitializationArgs{
				IpConfigs: &vm.VirtualMachineInitializationIpConfigArray{
					&vm.VirtualMachineInitializationIpConfigArgs{
						Ipv4: &vm.VirtualMachineInitializationIpConfigIpv4Args{
							Address: pulumi.String("dhcp"),
						},
					},
				},
				UserAccount: &vm.VirtualMachineInitializationUserAccountArgs{
					Username: pulumi.String("proxmox"),
					Password: pulumi.String("proxmox"),
				},
			},
			StopOnDestroy: pulumi.Bool(true),
		}, pulumi.Provider(proxmoxProvider))

		if err != nil {
			return err
		}

		return nil
	})
}
