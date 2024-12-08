import * as path from 'path'
import { cwd } from 'process'

import * as kubernetes from '@pulumi/kubernetes'
import * as pulumi from '@pulumi/pulumi'

export interface PlexArgs extends pulumi.Inputs {
  rootCaCert: kubernetes.apiextensions.CustomResource;
}

export class Plex extends pulumi.ComponentResource {
  constructor(args: PlexArgs, opts?: pulumi.ComponentResourceOptions) {
    super('homelab:app:Plex', 'plex', args, opts);

    const { rootCaCert } = args;

    const namespace = new kubernetes.core.v1.Namespace(
      'plex',
      {
        metadata: {
          name: 'plex',
        },
      },
      { parent: this },
    );

    new kubernetes.apiextensions.CustomResource(
      'plex-ca',
      {
        apiVersion: 'cert-manager.io/v1',
        kind: 'Issuer',
        metadata: {
          name: 'plex-ca',
          namespace: namespace.metadata.name,
        },
        spec: {
          ca: {
            secretName: rootCaCert.metadata.name,
          },
        },
      },
      { dependsOn: [rootCaCert, namespace], parent: this },
    );

    new kubernetes.helm.v3.Release(
      'plex',
      {
        chart: path.join(cwd(), '_charts/plex'),
        namespace: namespace.metadata.name,
        values: {
          ingress: {
            main: {
              enabled: true,
              ingressClassName: 'nginx',
              annotations: {
                'cert-manager.io/issuer': 'plex-ca',
              },
              hosts: [
                {
                  host: 'plex.home',
                  paths: [{ path: '/' }],
                },
              ],
              tls: [
                {
                  hosts: ['plex.home'],
                  secretName: 'plex-tls',
                },
              ],
            },
          },

          resources: {
            requests: {
              cpu: '500m',
              memory: '1Gi',
            },
            limits: {
              cpu: '1',
              memory: '2Gi',
            },
          },
        },
      },
      { dependsOn: [namespace], parent: this },
    );
  }
}
