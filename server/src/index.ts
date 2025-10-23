import Dockerode from 'dockerode';
import { startJobs } from './jobs';

function main() {
  const docker = new Dockerode();
  startJobs({ docker });
}

main();
