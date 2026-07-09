export interface SmartHomeCatalogEntry {
  id: string;
  sourceSvgPath: string;
  label: string;
  defaultWidth: number;
  defaultHeight: number;
  scale?: number;
}

export const CAD_SYMBOL_CATALOG: SmartHomeCatalogEntry[] = [
  {
    id: "cad-ampio-mserv-4s",
    sourceSvgPath: "/assets/symbols/Smart Home/Symbol AMPIO MSERV-4S_v4.svg",
    label: "AMPIO MSERV-4S",
    defaultWidth: 430,
    defaultHeight: 294,
    scale: 1.25, // 32px pitch -> 40px pitch (wielokrotność siatki 20px)
  },
  {
    id: "cad-meanwell-hdr-100-12",
    sourceSvgPath: "/assets/symbols/Smart Home/Symbol HDR-100-12.svg",
    label: "MEAN WELL HDR-100-12",
    defaultWidth: 280,
    defaultHeight: 250,
    scale: 1,
  },
];
