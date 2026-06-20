

export type MigrationFunction = (data: any) => any;

export const projectMigrations: Record<number, MigrationFunction> = {
  // Przykładowa migracja:
  // 1: (data) => { return data; }
};

export function migrateProjectData(data: any, currentVersion: number, targetVersion: number): any {
  if (currentVersion >= targetVersion) {
    return data;
  }

  let migratedData = { ...data };

  for (let version = currentVersion + 1; version <= targetVersion; version++) {
    const migration = projectMigrations[version - 1];
    if (migration) {
      migratedData = migration(migratedData);
    }
    migratedData.schemaVersion = version;
  }

  return migratedData;
}
