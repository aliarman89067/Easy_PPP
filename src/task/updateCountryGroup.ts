import { db } from "@/drizzle/db";
import countriesByDiscount from "../data/countriesByDiscount.json";
import { countryGroupTable, countryTable } from "@/drizzle/schema";
import { sql } from "drizzle-orm";

const countryGroup = await updateCountryGroup();
const country = await updateCountries();

console.log(`Update ${countryGroup} country group and ${country} country`);

async function updateCountryGroup() {
  const countryGroupInsertData = countriesByDiscount.map(
    ({ name, recommendedDiscountPercentage }) => {
      return { name, recommendedDiscountPercentage };
    }
  );
  const { rowCount } = await db
    .insert(countryGroupTable)
    .values(countryGroupInsertData)
    .onConflictDoUpdate({
      target: countryGroupTable.name,
      set: {
        recommendedDiscountPercentage: sql.raw(
          `excluded.${countryGroupTable.recommendedDiscountPercentage.name}`
        ),
      },
    });
  return rowCount;
}
async function updateCountries() {
  const countryGroups = await db.query.countryGroupTable.findMany({
    columns: { id: true, name: true },
  });
  const countryInsertData = countriesByDiscount.flatMap(
    ({ countries, name }) => {
      const countryGroup = countryGroups.find((group) => group.name === name);
      if (countryGroup == null) {
        throw new Error(`Country group ${name} not found`);
      }
      return countries.map((country) => {
        return {
          name: country.countryName,
          code: country.country,
          countryGroupId: countryGroup.id,
        };
      });
    }
  );

  const { rowCount } = await db
    .insert(countryTable)
    .values(countryInsertData)
    .onConflictDoUpdate({
      target: countryTable.code,
      set: {
        name: sql.raw(`excluded.${countryTable.name.name}`),
        countryGroupId: sql.raw(`excluded.${countryTable.countryGroupId.name}`),
      },
    });

  return rowCount;
}
