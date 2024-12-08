import * as path from 'path'
import { cwd } from 'process'

import * as kubernetes from '@pulumi/kubernetes'
import * as pulumi from '@pulumi/pulumi'

export class MeshCentral extends pulumi.ComponentResource {
  constructor(args: pulumi.Inputs, opts?: pulumi.ComponentResourceOptions) {
    super('homelab:app:meshcentral', 'meshcentral', args, opts);

    // Namespace
    const namespace = new kubernetes.core.v1.Namespace(
      'meshcentral',
      {
        metadata: {
          name: 'meshcentral',
        },
      },
      { parent: this },
    );

    // MongoDB Replica Set
    const mongoDb = new kubernetes.helm.v3.Release(
      'mongodb',
      {
        chart: `${path.join(cwd(), '_charts/mongodb')}`,
        namespace: namespace.metadata.name,
        values: {
          architecture: 'replicaset',
          replicaCount: 2,
          externalAccess: {
            enabled: true,
            service: {
              type: 'LoadBalancer',
            },
            autoDiscovery: {
              enabled: true,
            },
            serviceAccount: {
              create: true,
            },
            autoMountServiceAccountToken: true,
            rbac: {
              create: true,
            },
          },

          resources: {
            requests: {
              cpu: '100m',
              memory: '128Mi',
            },
            limits: {
              cpu: '200m',
              memory: '256Mi',
            },
          },

          persistence: {
            storageClass: 'longhorn',
            size: '10Gi',
          },
        },
      },
      { parent: this },
    );

    // MeshCentral Servers

    // Ingress
  }
}
