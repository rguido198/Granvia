import { fetchCapexCases, computeCapexKpis } from "../src/lib/data/capex-cases.server";

async function main() {
  const cases = await fetchCapexCases();
  console.log("Total CapEx cases:", cases.length);
  for (const c of cases) {
    console.log(`- ${c.ticketNumber} | ${c.tenant} | ${c.verdict} | $${c.amount} | ${c.expenseType}`);
  }
  console.log("KPIs:", computeCapexKpis(cases));
}

main().catch(console.error);
