import type { SVGProps } from "react";

export type AppIconName =
  | "balance"
  | "busbar"
  | "check"
  | "cog"
  | "delete"
  | "dockRight"
  | "exit"
  | "file"
  | "fileEdit"
  | "fileTree"
  | "folderOpen"
  | "grid"
  | "group"
  | "help"
  | "import"
  | "latex"
  | "list"
  | "module"
  | "palette"
  | "pdf"
  | "pencil"
  | "power"
  | "print"
  | "redo"
  | "save"
  | "saveEdit"
  | "theme"
  | "undo"
  | "validation"
  | "zoomFit"
  | "zoomIn"
  | "zoomOut";

type AppIconProps = SVGProps<SVGSVGElement> & {
  name: AppIconName;
  size?: number;
};

const paths: Record<AppIconName, string[]> = {
  balance: ["M4 19V9", "M10 19V5", "M16 19v-7", "M22 19H2"],
  busbar: ["M5 7h14", "M5 12h14", "M5 17h14", "M8 5v14", "M16 5v14"],
  check: ["M20 6 9 17l-5-5"],
  cog: [
    "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z",
    "M19.4 15a1.7 1.7 0 0 0 .34 1.87l.04.04a2 2 0 0 1-2.83 2.83l-.04-.04a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 0 1-4 0v-.08a1.7 1.7 0 0 0-1.04-1.56 1.7 1.7 0 0 0-1.87.34l-.04.04a2 2 0 1 1-2.83-2.83l.04-.04A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 0 1 0-4h.04A1.7 1.7 0 0 0 4.6 8a1.7 1.7 0 0 0-.34-1.87l-.04-.04a2 2 0 1 1 2.83-2.83l.04.04A1.7 1.7 0 0 0 8.96 3a1.7 1.7 0 0 0 1.04-1.56V1a2 2 0 0 1 4 0v.44A1.7 1.7 0 0 0 15.04 3a1.7 1.7 0 0 0 1.87-.34l.04-.04a2 2 0 1 1 2.83 2.83l-.04.04A1.7 1.7 0 0 0 19.4 8c.13.43.47.78.9.94.22.08.45.12.7.12h.04a2 2 0 0 1 0 4H21a1.7 1.7 0 0 0-1.6 1.94Z",
  ],
  delete: ["M3 6h18", "M8 6V4h8v2", "M6 6l1 15h10l1-15", "M10 10v7", "M14 10v7"],
  dockRight: ["M4 5h16v14H4z", "M14 5v14"],
  exit: ["M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4", "M16 17l5-5-5-5", "M21 12H9"],
  file: ["M6 3h8l4 4v14H6z", "M14 3v5h5"],
  fileEdit: ["M6 3h8l4 4v14H6z", "M14 3v5h5", "M9 16l5.5-5.5 2 2L11 18H9z"],
  fileTree: ["M5 4h5v5H5z", "M14 4h5v5h-5z", "M14 15h5v5h-5z", "M10 6h2v11h2", "M10 17h4"],
  folderOpen: ["M3 7h7l2 2h9", "M3 19l3-9h15l-3 9H3z"],
  grid: ["M4 4h7v7H4z", "M13 4h7v7h-7z", "M4 13h7v7H4z", "M13 13h7v7h-7z"],
  group: [
    "M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0Z",
    "M4 21a8 8 0 0 1 16 0",
    "M20 8a3 3 0 0 1 1 5.8",
    "M3 13.8A3 3 0 0 1 4 8",
  ],
  help: ["M9.5 9a2.5 2.5 0 1 1 4.4 1.6c-.9.7-1.4 1.2-1.4 2.4", "M12 17h.01", "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"],
  import: ["M12 3v12", "M8 11l4 4 4-4", "M4 19h16"],
  latex: ["M5 18 11 6", "M13 18l3-6 3 6", "M14 14h4"],
  list: ["M8 6h13", "M8 12h13", "M8 18h13", "M3 6h.01", "M3 12h.01", "M3 18h.01"],
  module: ["M12 3 20 7.5v9L12 21l-8-4.5v-9L12 3Z", "M12 12l8-4.5", "M12 12 4 7.5", "M12 12v9"],
  palette: ["M4 5h16v14H4z", "M8 5v14", "M16 5v14", "M4 11h16"],
  pdf: ["M6 3h8l4 4v14H6z", "M14 3v5h5", "M8 16h2.5a1.5 1.5 0 0 0 0-3H8v5", "M13 13v5h1.5a2.5 2.5 0 0 0 0-5H13", "M18 13h3", "M18 15.5h2"],
  pencil: ["M4 20h4l11-11-4-4L4 16v4Z", "M13.5 6.5l4 4"],
  power: ["M13 2 4 14h7l-1 8 10-13h-7l1-7Z"],
  print: ["M7 8V3h10v5", "M6 17H4v-7h16v7h-2", "M7 14h10v7H7z"],
  redo: ["M21 7v6h-6", "M20 13a8 8 0 1 1-2.4-5.7L21 10.7"],
  save: ["M5 3h12l2 2v16H5z", "M8 3v6h8V3", "M8 21v-7h8v7"],
  saveEdit: ["M5 3h12l2 2v7", "M8 3v6h8V3", "M8 21v-6h5", "M14 19l5-5 2 2-5 5h-2z"],
  theme: ["M12 3a9 9 0 0 0 0 18c-2.5-2.2-2.5-15.8 0-18Z", "M12 3a9 9 0 0 1 0 18"],
  undo: ["M3 7v6h6", "M4 13a8 8 0 1 0 2.4-5.7L3 10.7"],
  validation: ["M12 3 22 20H2L12 3Z", "M12 9v5", "M12 17h.01"],
  zoomFit: ["M4 9V4h5", "M20 9V4h-5", "M4 15v5h5", "M20 15v5h-5"],
  zoomIn: ["M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z", "M21 21l-5-5", "M11 8v6", "M8 11h6"],
  zoomOut: ["M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z", "M21 21l-5-5", "M8 11h6"],
};

export function AppIcon({ name, size = 16, className, ...props }: AppIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      width={size}
      {...props}
    >
      {paths[name].map((path, index) => (
        <path d={path} key={`${name}-${index}`} />
      ))}
    </svg>
  );
}
