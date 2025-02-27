import { LocalStack, MeshCentral, Plex, Yellowdig } from './app'
import { Monitoring } from './monitoring'
import { CertManager, Ingress, Pihole } from './networking'
import { Storage } from './storage'
import { ClusterSecret } from './system'

const clusterSecret = new ClusterSecret();

const certManager = new CertManager({}, { dependsOn: [clusterSecret] });
const ingress = new Ingress();
const pihole = new Pihole();

const storage = new Storage();
const monitoring = new Monitoring({ rootCaCert: certManager.rootCaCert }, { dependsOn: [certManager, storage] });

const plex = new Plex({ rootCaCert: certManager.rootCaCert }, { dependsOn: [certManager, storage] });

const localstack = new LocalStack({ rootCaCert: certManager.rootCaCert }, { dependsOn: [certManager, storage] });
const yellowdig = new Yellowdig({ rootCaCert: certManager.rootCaCert }, { dependsOn: [certManager, storage] });

const meshcentral = new MeshCentral({ rootCaCert: certManager.rootCaCert }, { dependsOn: [certManager, storage] });
