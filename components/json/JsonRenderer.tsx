import { ReactNode, CSSProperties } from "react";
import { Button } from "@/components/ui/button";

export interface JsonNode {
  type?: string;
  nodeType?: string;
  name?: string;
  text?: string;
  characters?: string;
  value?: string;
  placeholder?: string;
  src?: string;
  url?: string;
  image?: { url?: string };
  action?: { type?: string; url?: string; route?: string };
  link?: string;
  props?: Record<string, unknown>;
  style?: Record<string, any>;
  styles?: Record<string, any>;
  children?: JsonNode[];
  childs?: JsonNode[];
  layers?: JsonNode[];
  nodes?: JsonNode[];
}

function toCssStyles(style?: Record<string, any>): CSSProperties {
  if (!style) return {};
  const s: CSSProperties = {};
  const num = (v: any) => (typeof v === "number" ? v : undefined);
  const color = (v: any) => (typeof v === "string" ? v : undefined);

  if (num(style.width) !== undefined) s.width = num(style.width);
  if (num(style.height) !== undefined) s.height = num(style.height);
  if (color(style.backgroundColor)) s.backgroundColor = color(style.backgroundColor);
  if (num(style.padding) !== undefined) s.padding = num(style.padding);
  if (num(style.paddingTop) !== undefined) s.paddingTop = num(style.paddingTop);
  if (num(style.paddingBottom) !== undefined) s.paddingBottom = num(style.paddingBottom);
  if (num(style.paddingLeft) !== undefined) s.paddingLeft = num(style.paddingLeft);
  if (num(style.paddingRight) !== undefined) s.paddingRight = num(style.paddingRight);
  if (num(style.margin) !== undefined) s.margin = num(style.margin);
  if (num(style.borderRadius) !== undefined) s.borderRadius = num(style.borderRadius);
  if (color(style.borderColor)) s.borderColor = color(style.borderColor);
  if (num(style.borderWidth) !== undefined) s.borderWidth = num(style.borderWidth);
  if (style.flexDirection) s.flexDirection = style.flexDirection as any;
  if (style.alignItems) s.alignItems = style.alignItems as any;
  if (style.justifyContent) s.justifyContent = style.justifyContent as any;
  if (num(style.gap) !== undefined) s.gap = num(style.gap);
  if (style.position) s.position = style.position as any;
  if (num(style.top) !== undefined) s.top = num(style.top);
  if (num(style.left) !== undefined) s.left = num(style.left);
  if (num(style.right) !== undefined) s.right = num(style.right);
  if (num(style.bottom) !== undefined) s.bottom = num(style.bottom);
  if (style.overflow) s.overflow = style.overflow as any;
  if (num(style.opacity) !== undefined) s.opacity = num(style.opacity);

  if (color(style.color)) s.color = color(style.color);
  if (num(style.fontSize) !== undefined) s.fontSize = num(style.fontSize);
  if (style.fontWeight) s.fontWeight = style.fontWeight as any;
  if (style.textAlign) s.textAlign = style.textAlign as any;
  if (num(style.lineHeight) !== undefined) s.lineHeight = num(style.lineHeight) as any;
  if (num(style.letterSpacing) !== undefined) s.letterSpacing = num(style.letterSpacing);

  return s;
}

function getChildren(node: JsonNode): JsonNode[] {
  return node.children || node.childs || node.layers || node.nodes || [];
}

function getType(node: JsonNode): string {
  const t = node.type || node.nodeType || node.name || "";
  return String(t).toLowerCase();
}

function getLabel(node: JsonNode): string | undefined {
  return node.text || node.characters || node.value || node.name;
}

function renderChildren(nodes: JsonNode[] | undefined): ReactNode {
  if (!nodes || nodes.length === 0) return null;
  return nodes.map((child, i) => <NodeRenderer key={i} node={child} />);
}

function mergeStyles(node: JsonNode): CSSProperties {
  return { ...toCssStyles(node.styles), ...toCssStyles(node.style) };
}

export function NodeRenderer({ node }: { node: JsonNode }) {
  const t = getType(node);
  const children = getChildren(node);
  const style = mergeStyles(node);

  if (t.includes("text")) {
    return <p style={style}>{getLabel(node)}</p>;
  }

  if (t.includes("image") || node.src || node.url || node.image?.url) {
    const src = node.src || node.url || node.image?.url || "";
    const alt = getLabel(node) || "Image";
    return <img src={src} alt={alt} style={{ display: "block", width: "100%", ...style }} />;
  }

  if (t.includes("button")) {
    const label = getLabel(node) || "Button";
    return <Button style={style}>{label}</Button>;
  }

  if (t.includes("input") || t.includes("textfield") || t.includes("textarea")) {
    const placeholder = node.placeholder || getLabel(node) || "";
    return (
      <input
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: 12,
          borderRadius: 12,
          border: "1px solid hsl(var(--border))",
          background: "hsl(var(--muted))",
          ...style,
        }}
      />
    );
  }

  const isRow = t.includes("row") || (node.styles && node.styles.flexDirection === "row");
  const isColumn = t.includes("column") || (node.styles && node.styles.flexDirection === "column");
  const isContainer = t.includes("frame") || t.includes("group") || t.includes("container") || t.includes("view") || t.includes("page") || isRow || isColumn || !t;

  if (isContainer) {
    const flexDirection = isRow ? "row" : isColumn ? "column" : undefined;
    const base: CSSProperties = {
      display: "flex",
      flexDirection: flexDirection || (style.flexDirection as any) || "column",
      alignItems: style.alignItems as any,
      justifyContent: style.justifyContent as any,
      gap: style.gap as any,
      ...style,
    };
    return <div style={base}>{renderChildren(children)}</div>;
  }

  return <div style={style}>{renderChildren(children)}</div>;
}

export default function JsonRenderer({ data }: { data: any }) {
  const root = Array.isArray(data) ? { type: "root", children: data } : (data as JsonNode);
  const children = getChildren(root);
  if (children.length > 0) {
    return <div className="p-4"><>{renderChildren(children)}</></div>;
  }
  return (
    <div className="p-4">
      <NodeRenderer node={root} />
    </div>
  );
}
