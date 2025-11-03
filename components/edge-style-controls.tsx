"use client";

import { useState, useEffect } from "react";
import { Settings2 } from "lucide-react";

export interface EdgeStyle {
  type: "smoothstep" | "straight" | "step" | "bezier";
  strokeWidth: number;
  strokeDasharray: string;
  stroke: string;
  animated: boolean;
  markerType: "none" | "arrow" | "arrowclosed";
}

interface EdgeStyleControlsProps {
  edgeStyle: EdgeStyle;
  onStyleChange: (style: EdgeStyle) => void;
  propertiesPanelOpen?: boolean;
}

export const EdgeStyleControls = ({
  edgeStyle,
  onStyleChange,
  propertiesPanelOpen = false,
}: EdgeStyleControlsProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleStyleChange = (key: keyof EdgeStyle, value: any) => {
    const newStyle = { ...edgeStyle, [key]: value };
    onStyleChange(newStyle);
  };

  const strokeDasharrayOptions = [
    { label: "Solide", value: "0" },
    { label: "Pointillé", value: "5,5" },
    { label: "Tirets", value: "10,5" },
    { label: "Pointillé long", value: "20,10" },
  ];

  const typeOptions = [
    { label: "Courbe", value: "smoothstep" },
    { label: "Droit", value: "straight" },
    { label: "Étape", value: "step" },
    { label: "Bézier", value: "bezier" },
  ];

  const markerOptions = [
    { label: "Aucune", value: "none" },
    { label: "Flèche", value: "arrowclosed" },
    { label: "Flèche ouverte", value: "arrow" },
  ];

  const colors = [
    { name: "Gris", value: "#888" },
    { name: "Bleu", value: "#3b82f6" },
    { name: "Rouge", value: "#ef4444" },
    { name: "Vert", value: "#22c55e" },
    { name: "Orange", value: "#f97316" },
    { name: "Violet", value: "#8b5cf6" },
    { name: "Rose", value: "#ec4899" },
    { name: "Jaune", value: "#eab308" },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 rounded-lg bg-white/95 dark:bg-[#191919] dark:border-stone-700 backdrop-blur-sm border border-stone-300 shadow-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        title="Style des connexions"
      >
        <Settings2 className="h-4 w-4 text-gray-700 dark:text-gray-300" />
      </button>

      {isOpen && (
        <div 
          className="absolute bottom-14 right-0 w-72 bg-white dark:bg-[#191919] border border-stone-300 dark:border-stone-700 rounded-lg shadow-xl p-4 space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Style des connexions
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ×
            </button>
          </div>

          {/* Type de ligne */}
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">
              Type
            </label>
            <select
              value={edgeStyle.type}
              onChange={(e) =>
                handleStyleChange("type", e.target.value as EdgeStyle["type"])
              }
              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {typeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Style de ligne (solide/pointillé) */}
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">
              Style
            </label>
            <select
              value={edgeStyle.strokeDasharray}
              onChange={(e) => handleStyleChange("strokeDasharray", e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {strokeDasharrayOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Épaisseur */}
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">
              Épaisseur: {edgeStyle.strokeWidth}px
            </label>
            <input
              type="range"
              min="1"
              max="8"
              value={edgeStyle.strokeWidth}
              onChange={(e) =>
                handleStyleChange("strokeWidth", parseInt(e.target.value))
              }
              className="w-full"
            />
          </div>

          {/* Couleur */}
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">
              Couleur
            </label>
            <div className="flex flex-wrap gap-2">
              {colors.map((color) => (
                <button
                  key={color.value}
                  onClick={() => handleStyleChange("stroke", color.value)}
                  className={`w-8 h-8 rounded border-2 transition-all ${
                    edgeStyle.stroke === color.value
                      ? "border-gray-700 dark:border-gray-300 ring-1 ring-offset-1 ring-gray-400 dark:ring-gray-500"
                      : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          {/* Type de flèche */}
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">
              Flèche
            </label>
            <select
              value={edgeStyle.markerType}
              onChange={(e) =>
                handleStyleChange("markerType", e.target.value as EdgeStyle["markerType"])
              }
              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {markerOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Animation */}
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Animation
            </label>
            <button
              onClick={() => handleStyleChange("animated", !edgeStyle.animated)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                edgeStyle.animated
                  ? "bg-blue-600"
                  : "bg-gray-300 dark:bg-gray-600"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  edgeStyle.animated ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

