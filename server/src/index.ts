import Dockerode from 'dockerode';
import { scanContainers } from './scanner';

async function main() {
  const docker = new Dockerode();
  await scanContainers({ docker });
}

main();
