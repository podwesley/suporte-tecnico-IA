export interface CommandResult {
  command: string;
  output: string;
  success: boolean;
}

export class CommandExecutor {
  // Simulates a server delay and execution
  public async execute(command: string): Promise<CommandResult> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const output = this.getMockOutput(command);
        resolve({
          command,
          output,
          success: true
        });
      }, 2000); // 2 seconds delay to simulate processing
    });
  }

  private getMockOutput(command: string): string {
    const lowerCmd = command.toLowerCase();

    if (lowerCmd.includes('docker run')) {
      return `Unable to find image '${lowerCmd.split(' ')[2] || 'image'}:latest' locally
latest: Pulling from library/image
d19f32bd9e41: Pull complete 
c91012356782: Pull complete 
Digest: sha256:2b8967...
Status: Downloaded newer image for image:latest
e4512356c9124564234234`;
    }

    if (lowerCmd.includes('docker ps')) {
      return `CONTAINER ID   IMAGE          COMMAND                  CREATED          STATUS          PORTS                    NAMES
a1b2c3d4e5f6   mysql:8.0      "docker-entrypoint.s…"   2 minutes ago    Up 2 minutes    0.0.0.0:3306->3306/tcp   mysql-db
f6e5d4c3b2a1   nginx:latest   "/docker-entrypoint.…"   10 minutes ago   Up 10 minutes   0.0.0.0:80->80/tcp       web-server`;
    }

    if (lowerCmd.includes('npm install') || lowerCmd.includes('yarn add')) {
      return `added 145 packages, and audited 146 packages in 3s

23 packages are looking for funding
  run \`npm fund\` for details

found 0 vulnerabilities`;
    }

    if (lowerCmd.includes('apt-get') || lowerCmd.includes('apt install')) {
      return `Reading package lists... Done
Building dependency tree... Done
Reading state information... Done
The following additional packages will be installed:
  lib-dependency-1.2
The following NEW packages will be installed:
  requested-package
0 upgraded, 2 newly installed, 0 to remove and 12 not upgraded.
Need to get 1,450 kB of archives.
After this operation, 4,096 kB of additional disk space will be used.
Get:1 http://archive.ubuntu.com/ubuntu jammy/main amd64 requested-package [1,450 kB]
Fetched 1,450 kB in 1s (1,230 kB/s)
Selecting previously unselected package requested-package.
(Reading database ... 24500 files and directories currently installed.)
Preparing to unpack .../requested-package.deb ...
Unpacking requested-package ...
Setting up requested-package ...
Processing triggers for man-db (2.10.2-1) ...`;
    }

    if (lowerCmd.includes('ls')) {
      return `Dockerfile
README.md
node_modules/
package.json
public/
src/
tsconfig.json`;
    }

    return `Command '${command}' executed successfully.
Output generated at ${new Date().toLocaleTimeString()}.
Status: OK (0)`;
  }
}

export const commandExecutor = new CommandExecutor();
