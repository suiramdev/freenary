export interface SankeyNode {
  color: string;
  id: string;
  label: string;
  value: number;
}

export interface SankeyLink {
  source: SankeyNode["id"];
  target: SankeyNode["id"];
  value: number;
}

export interface SankeyFlow {
  columns: SankeyNode[][];
  links: SankeyLink[];
}
