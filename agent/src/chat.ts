// Entry point for `npm run chat`: run the agent on the terminal provider.
process.env.CANOPY_TERMINAL = "1";
await import("./index.js");
