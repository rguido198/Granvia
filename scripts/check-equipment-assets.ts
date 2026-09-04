import { fetchEquipmentAssets } from "../src/lib/data/equipment-assets.server";

async function main() {
  const assets = await fetchEquipmentAssets();
  console.log("Total assets:", assets.length);
  for (const a of assets) console.log(`- ${a.unitNumber} | ${a.name} | ${a.category} | ${a.warrantyExpiry}`);
}

main().catch(console.error);
