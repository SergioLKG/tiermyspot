"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import { useOnClickOutside } from "@/hooks/use-click-outside";

// Definir los colores de los tiers
const TIER_COLORS: any = {
  S: "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100",
  A: "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-100",
  B: "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100",
  C: "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100",
  D: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100",
  F: "bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-100",
};

interface UserVote {
  userId: number;
  tier: string;
  userName?: string;
  userImage?: string;
}

interface UserVotesPopupProps {
  artistName: string;
  votes: UserVote[];
  users?: Record<string, { name: string; image: string }>;
}

export function UserVotesPopup({
  artistName,
  votes,
  users = {},
}: UserVotesPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popupRef: any = useRef<HTMLDivElement>(null);

  // Cerrar el popup al hacer clic fuera
  useOnClickOutside(popupRef, () => setIsOpen(false));

  // Cerrar el popup al presionar Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    if (isOpen) {
      window.addEventListener("keydown", handleEscape);
    }

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-xs"
        onClick={() => setIsOpen(!isOpen)}
        title="Ver votos de usuarios"
        aria-label="Ver votos de usuarios"
      >
        <Users className="h-3 w-3 mr-1" />
        <span>{votes.length}</span>
      </Button>

      {isOpen && (
        <div
          ref={popupRef}
          className="absolute z-30 bottom-full left-0 mb-2 w-64 max-h-80 overflow-y-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
        >
          <div className="sticky top-0 bg-white dark:bg-gray-800 p-3 border-b border-gray-200 dark:border-gray-700 z-10">
            <h3 className="font-medium text-sm">Votos para {artistName}</h3>
          </div>

          <div className="p-2">
            {votes.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">
                Nadie ha votado por este artista aún
              </p>
            ) : (
              <ul className="space-y-2">
                {votes.map((vote, index) => {
                  // Intentar obtener datos del usuario desde el objeto users
                  // Si no existe, usar datos directos del voto
                  const userData = users[vote.userId] || null;
                  const userName =
                    userData?.name || vote.userName || "Usuario desconocido";
                  const userImage =
                    userData?.image || vote.userImage || "/placeholder.svg";

                  return (
                    <li
                      key={`${vote.userId}-${index}`}
                      className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 select-none"
                    >
                      <div className="relative h-8 w-8 overflow-hidden rounded-full border">
                        <Image
                          src={userImage}
                          alt={userName}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <span className="flex-1 text-sm truncate">
                        {userName}
                      </span>
                      <span
                        className={`flex items-center justify-center h-6 w-6 rounded-md font-bold text-sm ${
                          TIER_COLORS[vote.tier] ||
                          "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {vote.tier}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
