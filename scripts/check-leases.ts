import { fetchPortfolio } from "../src/lib/data/portfolio.server";

async function main() {
  const p = await fetchPortfolio();
  console.log("Total leases:", p.leases.length);
  for (const l of p.leases) {
    console.log(`- Unit: ${l.unitCode} | Tenant: ${l.tenantEntity} | Trade: ${l.tradeName}`);
  }
}

main().catch(console.error);
