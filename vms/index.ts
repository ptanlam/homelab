import * as dotenv from 'dotenv'

import * as proxmox from '@muhlba91/pulumi-proxmoxve'

dotenv.config();

const provider = new proxmox.Provider('proxmoxve', {
  endpoint: process.env.PROXMOX_VE_ENDPOINT,
  insecure: process.env.PROXMOX_VE_INSECURE === 'true',
  username: process.env.PROXMOX_VE_USERNAME,
  password: process.env.PROXMOX_VE_PASSWORD,
});

// const virtualMachine = new proxmox.vm.VirtualMachine(
//   'vm',
//   {
//     nodeName: 'pve1',
//     agent: {
//       enabled: false, // toggles checking for ip addresses through qemu-guest-agent
//       trim: true,
//       type: 'virtio',
//     },
//     bios: 'seabios',
//     cpu: {
//       cores: 1,
//       sockets: 1,
//     },
//     disks: [
//       {
//         interface: 'scsi0',
//         datastoreId: 'local-lvm',
//         size: 32,
//         fileFormat: 'qcow2',
//         fileId: 'local:iso/debian-12.11.0-amd64-netinst.iso',
//       },
//     ],
//     memory: {
//       dedicated: 1024,
//     },
//     name: 'proxmox-vm',
//     networkDevices: [
//       {
//         bridge: 'vmbr0',
//         model: 'virtio',
//       },
//     ],
//     onBoot: true,
//     operatingSystem: {
//       type: 'l26',
//     },
//     initialization: {
//       type: 'nocloud',
//       datastoreId: 'local-lvm',
//       dns: {
//         domain: 'example.com',
//         servers: ['1.1.1.1', '1.0.0.1'],
//       },
//       ipConfigs: [
//         {
//           ipv4: {
//             address: '10.0.0.10/24',
//             gateway: '10.0.0.1',
//           },
//           ipv6: {
//             address: 'fd91:0812:a17f:6194::10/64',
//             gateway: 'fd91:0812:a17f:6194::1',
//           },
//         },
//       ],
//       userAccount: {
//         username: 'proxmox',
//         password: 'password',
//       },
//     },
//   },
//   {
//     provider,
//   },
// );
