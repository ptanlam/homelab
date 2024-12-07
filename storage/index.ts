import * as path from 'path'
import { cwd } from 'process'

import * as kubernetes from '@pulumi/kubernetes'
import * as pulumi from '@pulumi/pulumi'

export class Storage extends pulumi.ComponentResource {
  constructor(opts?: pulumi.ComponentResourceOptions) {
    super('homelab:storage:Storage', 'storage', opts);

    const namespace = new kubernetes.core.v1.Namespace(
      'storage',
      {
        metadata: {
          name: 'storage',
        },
      },
      { parent: this },
    );

    new kubernetes.helm.v3.Release(
      'longhorn',
      {
        chart: `${path.join(cwd(), '_charts/longhorn')}`,
        namespace: namespace.metadata.name,
        values: {
          persistence: {
            defaultClass: true,
            defaultClassReplicaCount: 2, // Number of replicas for volumes
          },
          resources: {
            // Manager is the Longhorn manager component
            manager: {
              requests: {
                cpu: '100m',
                memory: '128Mi',
              },
              limits: {
                cpu: '250m',
                memory: '256Mi',
              },
            },
            // Engine is the controller/replica instance that runs with each volume
            engine: {
              requests: {
                cpu: '250m',
                memory: '256Mi',
              },
              limits: {
                cpu: '500m',
                memory: '512Mi',
              },
            },
            // UI component
            ui: {
              requests: {
                cpu: '100m',
                memory: '64Mi',
              },
              limits: {
                cpu: '200m',
                memory: '128Mi',
              },
            },
          },
          guaranteedEngineManagerCPU: 0.25, // Minimum CPU for engine manager
          guaranteedReplicaManagerCPU: 0.25, // Minimum CPU for replica manager
        },
      },
      { parent: this },
    );
  }
}
