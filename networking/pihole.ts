import * as path from 'path'
import { cwd } from 'process'

import * as kubernetes from '@pulumi/kubernetes'
import * as pulumi from '@pulumi/pulumi'

export class Pihole extends pulumi.ComponentResource {
  constructor(args?: pulumi.Inputs, opts?: pulumi.ComponentResourceOptions) {
    super('homelab:networking:Pihole', 'pihole', args, opts);

    const namespace = new kubernetes.core.v1.Namespace(
      'pihole',
      {
        metadata: {
          name: 'pihole',
        },
      },
      { parent: this },
    );

    const ca = new kubernetes.apiextensions.CustomResource(
      'pihole-ca',
      {
        apiVersion: 'cert-manager.io/v1',
        kind: 'Issuer',
        metadata: {
          name: 'pihole-ca',
          namespace: namespace.metadata.name,
        },
        spec: {
          ca: {
            secretName: 'root-ca-cert',
          },
        },
      },
      { parent: this },
    );

    new kubernetes.helm.v3.Release(
      'pihole',
      {
        chart: path.join(cwd(), '_charts/pihole'),
        namespace: namespace.metadata.name,
        values: {
          persistenceVolume: {
            enabled: true,
            size: '10Gi',
            storageClass: 'longhorn',
          },

          ingress: {
            enabled: true,
            ingressClassName: 'nginx',
            annotations: {
              'cert-manager.io/issuer': 'pihole-ca',
            },
            hosts: ['pihole.home'],
            path: '/',
            tls: [
              {
                hosts: ['pihole.home'],
                secretName: 'pihole-tls',
              },
            ],
          },

          serviceDns: {
            loadBalancerIP: '192.168.1.215',
            type: 'LoadBalancer',
          },
        },
      },
      { dependsOn: ca, parent: this },
    );
  }
}
