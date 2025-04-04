"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";

// Definir los colores de los tiers para la exportación
const TIER_COLORS: any = {
  S: "bg-red-600 text-white",
  A: "bg-orange-500 text-white",
  B: "bg-yellow-500 text-white",
  C: "bg-green-600 text-white",
  D: "bg-blue-700 text-white",
  F: "bg-purple-700 text-white",
};

interface TierlistExportProps {
  playlistName: string;
  playlistImage?: string;
  artists: any[];
  rankings: Record<string, string>;
  isGroup?: boolean;
}

export function TierlistExport({
  playlistName,
  playlistImage,
  artists,
  rankings,
  isGroup = false,
}: TierlistExportProps) {
  const exportRef = useRef<HTMLDivElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // Agrupar artistas por tier
  const artistsByTier = {
    S: artists.filter((artist) => rankings[artist.id] === "S"),
    A: artists.filter((artist) => rankings[artist.id] === "A"),
    B: artists.filter((artist) => rankings[artist.id] === "B"),
    C: artists.filter((artist) => rankings[artist.id] === "C"),
    D: artists.filter((artist) => rankings[artist.id] === "D"),
    F: artists.filter((artist) => rankings[artist.id] === "F"),
    unranked: artists.filter((artist) => !rankings[artist.id]),
  };

  const handleCapture = async () => {
    if (!exportRef.current) return;

    try {
      setIsCapturing(true);

      // Capturar el elemento
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: "#ffffff",
        scale: 2, // Mayor calidad
        useCORS: true, // Permitir imágenes de otros dominios
        logging: false,
        allowTaint: true,
      });

      // Convertir a imagen
      const image = canvas.toDataURL("image/png");

      // Crear enlace de descarga
      const link = document.createElement("a");
      link.href = image;
      link.download = `tierlist-${playlistName
        .replace(/[^a-z0-9]/gi, "-")
        .toLowerCase()}-${new Date().toISOString().split("T")[0]}.png`;

      // Simular clic para descargar
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error al capturar la tierlist:", error);
      alert(
        "Hubo un error al capturar la tierlist. Por favor, intenta de nuevo."
      );
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="pt-3">
      <Button
        onClick={handleCapture}
        disabled={isCapturing}
        variant="outline"
        className="flex items-center gap-2"
      >
        {isCapturing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Capturando...</span>
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            <span>Guardar como imagen</span>
          </>
        )}
      </Button>

      {/* Este div no se muestra en la UI pero se usa para la captura */}
      <div className="fixed left-[-9999px]">
        <div
          ref={exportRef}
          className="bg-[#27272a] p-8 rounded-lg shadow-lg"
          style={{ width: "1000px" }}
        >
          {/* Encabezado */}
          <div className="flex items-center gap-4 mb-8 border-b pb-4">
            {playlistImage && (
              <div className="relative h-24 w-24 overflow-hidden rounded-md shadow-md">
                <Image
                  src={playlistImage || "/placeholder.svg"}
                  alt={playlistName}
                  width={96}
                  height={96}
                  className="object-cover"
                />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {isGroup ? "Tierlist Grupal" : "Mi Tierlist"}
              </h1>
              <p className="text-gray-400 text-xl ">{playlistName}</p>
            </div>
          </div>

          {/* Tiers */}
          <div className="space-y-6">
            {Object.entries(artistsByTier).map(([tier, tierArtists]) => {
              if (tier === "unranked" && tierArtists.length === 0) return null;

              return (
                <div
                  key={tier}
                  className="rounded-lg overflow-hidden border shadow-sm"
                >
                  <div
                    className={`flex items-center ${
                      tier !== "unranked" ? TIER_COLORS[tier] : "bg-white/20"
                    } p-4`}
                  >
                    {tier !== "unranked" ? (
                      <div className="w-16 h-16 flex items-center align-middle justify-center font-bold text-4xl rounded-md bg-white/20 backdrop-blur-sm shadow-sm text-white">
                        {tier}
                      </div>
                    ) : (
                      <div className="w-16 h-16 flex items-center align-middle justify-center font-bold text-4xl rounded-md bg-white/20 backdrop-blur-sm shadow-sm text-white">
                        U
                      </div>
                    )}

                    <div className="ml-4 text-xl font-medium">
                      {tier !== "unranked"
                        ? `Tier ${tier}`
                        : "Artistas sin clasificar"}
                    </div>
                  </div>

                  {tierArtists.length > 0 ? (
                    <div className="p-4 bg-transparent border-[#27272ad3] flex flex-wrap gap-4">
                      {tierArtists.map((artist) => (
                        <div
                          key={artist.id}
                          className="w-[120px] bg-gray-500/30 rounded-lg p-3 shadow-sm"
                        >
                          <div className="relative mb-2 mx-auto">
                            <Image
                              src={artist.image || "/placeholder.svg"}
                              alt={artist.name}
                              width={80}
                              height={80}
                              className="rounded-md mx-auto shadow-sm object-cover"
                            />
                          </div>
                          <p className="text-center font-medium text-sm truncate align-middle p-1">
                            {artist.name}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 bg-gray-500/30 text-center text-white">
                      No hay artistas en este tier
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pie de página */}
          <div className="mt-8 pt-4 border-t text-center text-gray-500 text-sm">
            Generado con TierMySpot • {new Date().toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
}
