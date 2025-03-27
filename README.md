# TierMySpot 💚

TierMySpot es una plataforma que te permite crear **tierlists** de tus artistas favoritos de **Spotify**. Puedes importar tus playlists y clasificarlas de manera individual o junto a tus amigos.

## 🚀 Características

- **Autenticación con Spotify**: Conéctate con tu cuenta de Spotify para acceder a tus playlists.
- **Importación de Playlists**: Importa cualquier playlist de Spotify para comenzar a organizar a los artistas en una tierlist.
- **Tierlist Privada**: Crea y gestiona tu tierlist personal con un enlace privado.
- **Tierlist Grupal**: Tus tierlist también tienen una forma de calcular la posición real de los artistas según la opnion de otros (para publicas y privadas).

## 🛠️ Instalación y Configuración

### 1. Clonar el repositorio

```bash
 git clone https://github.com/SergioLKG/tiermyspot.git
 cd tiermyspot
```

### 2. Instalar dependencias

```bash
bun install
```

### 3. Configurar variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto y añade lo siguiente:

```env
SPOTIFY_CLIENT_ID=tu_client_id
SPOTIFY_CLIENT_SECRET=tu_client_secret
REDIRECT_URI=http://localhost:3000/api/callback/spotify
```

### 4. Ejecutar el proyecto

```bash
npm run dev
```

## 🎨 Tecnologías Utilizadas

- **Next.js** (Backend)
- **React.js** (Frontend)
- **TailwindCSS** (Estilos)
- **Spotify API** (Autenticación y datos musicales)
- **PostgresSQL** (Almacenamiento de datos con Neon)
- **PostgresSQL** (Hosting & [Deployment](https://tiermyspot.vercel.app/import-playlist) con Vercel)

## 📌 Uso

1. Inicia sesión con Spotify.
2. Importa una playlist.
3. Organiza los artistas en niveles de S a F.
4. Guarda y comparte tu tierlist con amigos.

## 📜 Licencia

Este proyecto está bajo la licencia **GNU**.

## 💡 Contribuciones

Si quieres contribuir, ¡eres bienvenido! Haz un **fork** del repositorio y envía un **pull request** con mejoras o correcciones.

---
**TierMySpot** - Clasifica tu música, a tu manera. 🎵
