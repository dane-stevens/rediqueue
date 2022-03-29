import RediQueue from "../index";

const queue = new RediQueue("myQueue", {}, { env: "test" });

queue.process("default", (job) => {
  console.log("JOB DATA----", job);
  // return new Error("WHOAH!!");
  return "DONE";
});
