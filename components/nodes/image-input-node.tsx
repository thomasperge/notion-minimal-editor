"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Handle, Position, useReactFlow } from "@xyflow/react";

interface ImageInputNodeData {
  imageUrl?: string;
  borderColor?: string;
}

export const ImageInputNode = ({ id, data, selected }: any) => {
  const { setNodes } = useReactFlow();
  const nodeData = data as ImageInputNodeData;

  // Store persistant qui survit aux unmounts/remounts
  const persistentUrlRef = useRef<string>(nodeData.imageUrl || "");
  
  // Flag pour savoir si on est en train de charger un fichier
  const isLoadingFileRef = useRef<boolean>(false);
  
  // Flag pour éviter l'ouverture multiple de l'explorateur
  const isOpeningFileDialogRef = useRef<boolean>(false);

  // État local pour l'affichage - initialisé depuis la ref persistante
  const [localImageUrl, setLocalImageUrl] = useState<string>(() => {
    // Si on a une valeur persistante, l'utiliser
    if (persistentUrlRef.current) {
      return persistentUrlRef.current;
    }
    // Sinon, utiliser nodeData s'il existe
    return nodeData.imageUrl || "";
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialiser persistentUrlRef au mount si nodeData a une valeur
  useEffect(() => {
    if (nodeData.imageUrl && !persistentUrlRef.current) {
      persistentUrlRef.current = nodeData.imageUrl;
      setLocalImageUrl(nodeData.imageUrl);
    }
  }, []);

  // Synchroniser seulement si nodeData change depuis l'externe ET qu'on n'est pas en train de charger
  useEffect(() => {
    if (!isLoadingFileRef.current && nodeData.imageUrl && nodeData.imageUrl !== persistentUrlRef.current) {
      persistentUrlRef.current = nodeData.imageUrl;
      setLocalImageUrl(nodeData.imageUrl);
    }
  }, [nodeData.imageUrl]);

  // Mettre à jour React Flow - utiliser plusieurs frames pour laisser les autres nodes finir leurs calculs
  const updateNodeDataInFlow = useCallback(
    (imageUrl: string) => {
      persistentUrlRef.current = imageUrl;
      
      // Utiliser plusieurs frames pour laisser les autres nodes finir leurs calculs
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setNodes((nodes) =>
            nodes.map((n) =>
              n.id === id ? { ...n, data: { ...n.data, imageUrl } } : n
            )
          );
          // Marquer qu'on a fini le chargement
          isLoadingFileRef.current = false;
        });
      });
    },
    [id, setNodes]
  );

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      
      // Réinitialiser le flag d'ouverture
      isOpeningFileDialogRef.current = false;
      
      if (!file) {
        // Réinitialiser l'input seulement si pas de fichier
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }

      if (!file.type.startsWith("image/")) {
        alert("Veuillez sélectionner un fichier image");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }

      // Marquer qu'on est en train de charger
      isLoadingFileRef.current = true;

      const reader = new FileReader();

      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === "string") {
          // Mettre à jour immédiatement l'affichage
          persistentUrlRef.current = result;
          setLocalImageUrl(result);
          
          // Mettre à jour React Flow
          updateNodeDataInFlow(result);
          
          // Réinitialiser l'input après la mise à jour
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        } else {
          isLoadingFileRef.current = false;
        }
      };

      reader.onerror = () => {
        console.error(`Erreur lors de la lecture du fichier`);
        isLoadingFileRef.current = false;
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      };

      reader.readAsDataURL(file);
    },
    [updateNodeDataInFlow]
  );


  const borderColor =
    nodeData.borderColor ||
    (selected ? "rgb(120 113 108)" : "rgb(214 211 209)");

  // Utiliser la ref persistante comme source de vérité pour l'affichage
  const displayUrl = localImageUrl || persistentUrlRef.current;

  return (
    <div
      className="bg-white dark:bg-[#191919] rounded-lg border-2 shadow-lg min-w-[200px] max-w-[400px]"
      style={{ overflow: "visible", borderColor }}
    >
      <div className="p-3 space-y-2">
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
          Image
        </label>

        {displayUrl ? (
          <div className="relative">
            <img
              src={displayUrl}
              alt="Selected"
              className="w-full rounded border border-stone-300 dark:border-stone-600 max-h-64 object-contain"
              onError={() => {
                console.error(`Erreur lors de l'affichage de l'image`);
                setLocalImageUrl("");
                persistentUrlRef.current = "";
              }}
            />
          </div>
        ) : (
          <label className="block cursor-pointer">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              onClick={(e) => e.stopPropagation()}
            />
            <div 
              className="w-full px-2 py-8 text-sm border-2 border-dashed border-stone-300 dark:border-stone-600 rounded bg-white dark:bg-[#171717] text-gray-600 dark:text-gray-400 hover:border-stone-400 dark:hover:border-stone-500 text-center transition-colors cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Éviter l'ouverture multiple
                if (isOpeningFileDialogRef.current) {
                  return;
                }
                
                isOpeningFileDialogRef.current = true;
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                  // Utiliser requestAnimationFrame pour s'assurer que la réinitialisation est traitée
                  requestAnimationFrame(() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.click();
                    }
                    // Réinitialiser le flag après un court délai (via RAF)
                    requestAnimationFrame(() => {
                      requestAnimationFrame(() => {
                        isOpeningFileDialogRef.current = false;
                      });
                    });
                  });
                }
              }}
            >
              Cliquez pour sélectionner une image
            </div>
          </label>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Left}
        id="image-input"
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white dark:!border-[#191919]"
        style={{ left: -6, top: "50%", transform: "translateY(-50%)" }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="image-output"
        className="!w-3 !h-3 !bg-orange-500 !border-2 !border-white dark:!border-[#191919]"
        style={{ right: -6, top: "50%", transform: "translateY(-50%)" }}
      />

      <style>{`
        .react-flow__node.react-flow__node-imageInput {
          background: none !important;
          border: none !important;
        }
      `}</style>
    </div>
  );
};
