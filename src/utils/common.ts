import { exec } from "child_process";

export const Command = (command: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout: any, stderr) => {
      // console.log(`'${command}' is running =======>>>`);
      if (error) {
        console.error(`Error executing command '${command}': ${error}`);
        Command(command);
      } else {
        // console.log('stdout ==> ', stdout);
        //   receiveAddress = JSON.parse(stdout).addresses[0];
        resolve(stdout);
      }
    });
  });
};

export const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export const mapToProp = (data: any, prop: string) => {
  return data.reduce(
    (res: any, item: any) =>
      Object.assign(res, {
        [item[prop]]: 1 + (res[item[prop]] || 0),
      }),
    Object.create(null)
  );
};
