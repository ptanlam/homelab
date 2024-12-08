import * as path from 'path'
import { cwd } from 'process'

import * as kubernetes from '@pulumi/kubernetes'
import * as certmanager from '@pulumi/kubernetes-cert-manager'
import * as pulumi from '@pulumi/pulumi'

export class CertManager extends pulumi.ComponentResource {
  rootCaCert: kubernetes.apiextensions.CustomResource;

  constructor(args?: pulumi.Inputs, opts?: pulumi.ComponentResourceOptions) {
    super('homelab:networking:CertManager', 'cert-manager', args, opts);

    const namespace = new kubernetes.core.v1.Namespace(
      'cert-manager',
      {
        metadata: {
          name: 'cert-manager',
        },
      },
      { parent: this },
    );

    const manager = new certmanager.CertManager(
      'cert-manager',
      {
        installCRDs: false,
        prometheus: {
          enabled: true,
        },
        helmOptions: {
          namespace: namespace.metadata.name,
          values: {
            resources: {
              requests: {
                cpu: '50m',
                memory: '64Mi',
              },
              limits: {
                cpu: '100m',
                memory: '128Mi',
              },
            },
          },
        },
      },
      { parent: this },
    );

    const crds = new kubernetes.yaml.ConfigFile(
      'yd-cert-manager-crds',
      {
        file: `${path.join(cwd(), '_charts/cert-manager-crds/v1-16-1.yml')}`,
      },
      { parent: this },
    );

    const rootCa = new kubernetes.apiextensions.CustomResource(
      'root-ca',
      {
        apiVersion: 'cert-manager.io/v1',
        kind: 'ClusterIssuer',
        metadata: { name: 'root-ca' },
        spec: { selfSigned: {} },
      },
      { dependsOn: [crds, manager], parent: this },
    );

    this.rootCaCert = new kubernetes.apiextensions.CustomResource(
      'root-ca-cert',
      {
        apiVersion: 'cert-manager.io/v1',
        kind: 'Certificate',
        metadata: {
          name: 'root-ca-cert',
          namespace: namespace.metadata.name,
        },
        spec: {
          isCA: true,
          commonName: '*.home',
          secretName: 'root-ca-cert',
          privateKey: {
            algorithm: 'RSA',
            size: 2048,
          },
          issuerRef: {
            name: rootCa.metadata.name,
            kind: 'ClusterIssuer',
            group: 'cert-manager.io',
          },
        },
      },
      { dependsOn: [rootCa], parent: this },
    );

    new kubernetes.apiextensions.CustomResource(
      'root-ca-cert-secret',
      {
        apiVersion: 'clustersecret.io/v1',
        kind: 'ClusterSecret',
        metadata: {
          name: 'root-ca-cert',
          namespace: namespace.metadata.name,
        },
        data: {
          valueFrom: {
            secretKeyRef: {
              name: 'root-ca-cert',
              namespace: namespace.metadata.name,
            },
          },
        },
      },
      { dependsOn: [this.rootCaCert], parent: this },
    );
  }
}
