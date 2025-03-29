"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

// Componente para mostrar mensajes de error o éxito
const Message = ({ type, message }) => {
  if (!message) return null;
  return <div className={`message ${type}`}>{message}</div>;
};

// Componente principal de la página
const ImportPlaylistPage = () => {
  const { data: session } = useSession();
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [privatePlaylistName, setPrivatePlaylistName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [progress, setProgress] = useState("");
  const router = useRouter();
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);

  // Función para extraer el ID de la playlist de la URL
  const extractPlaylistId = (url) => {
    try {
      const urlObject = new URL(url);
      const path = urlObject.pathname;
      const parts = path.split("/");
      const playlistIndex = parts.indexOf("playlist");

      if (playlistIndex > -1 && parts.length > playlistIndex + 1) {
        return parts[playlistIndex + 1];
      }

      return null;
    } catch (e) {
      return null;
    }
  };

  // Función para renovar el token de acceso
  const renewToken = async () => {
    try {
      const response = await fetch("/api/auth/session?update", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        return true;
      } else {
        console.error("Error al renovar el token:", response.statusText);
        return false;
      }
    } catch (error) {
      console.error("Error al renovar el token:", error);
      return false;
    }
  };

  // Modificar la función handleImportPlaylist para manejar mejor los errores
  const handleImportPlaylist = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    // Declarations for variables used in the function
    const playlistUrl = "";
    const isPrivate = false;
    const privatePlaylistName = "";

    try {
      // Verificar que tenemos una sesión con token de acceso
      if (!session?.accessToken) {
        throw new Error(
          "No hay sesión activa con Spotify. Por favor, inicia sesión de nuevo."
        );
      }

      // Extraer ID de la playlist
      const playlistId = extractPlaylistId(playlistUrl);

      if (!playlistId) {
        throw new Error(
          "URL de playlist inválida. Por favor, introduce un enlace de compartición de Spotify válido."
        );
      }

      setProgress("Verificando playlist...");

      // Enviar datos a la API con un timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos de timeout

      try {
        const response = await fetch("/api/import-playlist", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            playlistId,
            isPrivate,
            privatePlaylistName: isPrivate ? privatePlaylistName : undefined,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Si el token ha expirado, intentar renovarlo automáticamente
        if (response.status === 401) {
          try {
            const errorData = await response.json();
            if (
              errorData.error &&
              (errorData.error.includes("token de acceso ha expirado") ||
                errorData.error.includes("No se pudo renovar el token"))
            ) {
              setProgress("Renovando token de acceso...");
              const renewed = await renewToken();

              if (renewed) {
                // Intentar de nuevo con el token renovado
                setProgress("Reintentando importación...");
                const retryResponse = await fetch("/api/import-playlist", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    playlistId,
                    isPrivate,
                    privatePlaylistName: isPrivate
                      ? privatePlaylistName
                      : undefined,
                  }),
                });

                if (!retryResponse.ok) {
                  // Intentar leer el cuerpo de la respuesta como texto primero
                  const errorText = await retryResponse.text();
                  let errorMessage;

                  try {
                    // Intentar parsear como JSON
                    const errorJson = JSON.parse(errorText);
                    errorMessage =
                      errorJson.error ||
                      "Error desconocido al importar la playlist";
                  } catch (jsonError) {
                    // Si no es JSON válido, usar el texto directamente
                    errorMessage =
                      errorText.substring(0, 100) +
                      (errorText.length > 100 ? "..." : "");
                  }

                  throw new Error(errorMessage);
                }

                const data = await retryResponse.json();
                handleSuccessfulImport(data);
                return;
              } else {
                throw new Error(
                  "No se pudo renovar el token de acceso. Por favor, inicia sesión de nuevo."
                );
              }
            } else {
              throw new Error(
                errorData.error || "Error al importar la playlist"
              );
            }
          } catch (jsonError) {
            // Si hay un error al parsear la respuesta como JSON
            const errorText = await response.text();
            throw new Error(
              `Error de autenticación: ${errorText.substring(0, 100)}`
            );
          }
        } else if (!response.ok) {
          // Intentar leer el cuerpo de la respuesta como texto primero
          const errorText = await response.text();
          let errorMessage;

          try {
            // Intentar parsear como JSON
            const errorJson = JSON.parse(errorText);
            errorMessage =
              errorJson.error || "Error desconocido al importar la playlist";
          } catch (jsonError) {
            // Si no es JSON válido, usar el texto directamente
            if (errorText.includes("FUNCTION_INVOCATION_TIMEOUT")) {
              errorMessage =
                "La operación ha excedido el tiempo máximo. La playlist podría ser demasiado grande o el servidor está ocupado. Inténtalo de nuevo más tarde.";
            } else {
              errorMessage =
                errorText.substring(0, 100) +
                (errorText.length > 100 ? "..." : "");
            }
          }

          throw new Error(errorMessage);
        }

        const data = await response.json();
        handleSuccessfulImport(data);
      } catch (fetchError) {
        if (fetchError.name === "AbortError") {
          throw new Error(
            "La operación ha excedido el tiempo máximo. La playlist podría ser demasiado grande o el servidor está ocupado. Inténtalo de nuevo más tarde."
          );
        } else {
          throw fetchError;
        }
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (err) {
      setError(
        err.message ||
          "Error al importar la playlist. Por favor, inténtalo de nuevo."
      );
    } finally {
      setIsLoading(false);
      setProgress("");
    }
  };

  // Función auxiliar para manejar una importación exitosa
  const handleSuccessfulImport = (data) => {
    // Guardar la playlist seleccionada en una cookie
    setSelectedPlaylist({
      id: data.playlistId,
      name: data.privatePlaylistName || data.name,
      image: data.image,
      isPrivate: data.isPrivate,
      privatePlaylistName: data.privatePlaylistName,
    });

    setSuccess("¡Playlist importada correctamente! Redirigiendo...");

    // Redirigir a la página de tierlist
    setTimeout(() => {
      router.push("/tierlist");
    }, 1500);
  };

  return (
    <div className="container">
      <h1>Importar Playlist de Spotify</h1>
      <Message type="error" message={error} />
      <Message type="success" message={success} />
      {progress && <div className="progress">{progress}</div>}

      <form onSubmit={handleImportPlaylist}>
        <div className="form-group">
          <label htmlFor="playlistUrl">URL de la Playlist:</label>
          <input
            type="url"
            id="playlistUrl"
            value={playlistUrl}
            onChange={(e) => setPlaylistUrl(e.target.value)}
            placeholder="Introduce el enlace de compartición de Spotify"
            required
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              disabled={isLoading}
            />
            Playlist Privada
          </label>
        </div>

        {isPrivate && (
          <div className="form-group">
            <label htmlFor="privatePlaylistName">
              Nombre de la Playlist Privada:
            </label>
            <input
              type="text"
              id="privatePlaylistName"
              value={privatePlaylistName}
              onChange={(e) => setPrivatePlaylistName(e.target.value)}
              placeholder="Nombre para identificar la playlist privada"
              required={isPrivate}
              disabled={isLoading}
            />
          </div>
        )}

        <button type="submit" disabled={isLoading}>
          {isLoading ? "Importando..." : "Importar Playlist"}
        </button>
      </form>
    </div>
  );
};

export default ImportPlaylistPage;
