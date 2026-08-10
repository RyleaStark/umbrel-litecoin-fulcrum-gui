import { createConnectionDetails } from "../../../packages/contracts/src/connections.js";
import { buildApp } from "./app.js";
import { readConfig } from "./config.js";
import { createFulcrumClient } from "./fulcrum-client.js";
import { createFulcrumGuiService } from "./fulcrum-gui-service.js";
import { createLitecoinCoreClient } from "./litecoin-core-client.js";

const config = readConfig(process.env);
const service = createFulcrumGuiService({
  core: createLitecoinCoreClient(config.core),
  fulcrum: createFulcrumClient(config.fulcrum),
  connections: createConnectionDetails(config.connections),
});
const app = buildApp({ service });

async function shutdown() {
  await app.close();
  process.exit(0);
}

process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());

try {
  await app.listen({ host: "0.0.0.0", port: config.port });
  console.info("Fulcrum GUI is listening");
} catch {
  console.error("Fulcrum GUI failed to start");
  process.exit(1);
}
