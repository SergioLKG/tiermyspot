// This file would contain functions to interact with the Spotify API
// For this demo, we're using mock data, but in a real app, you would:
// 1. Set up Spotify API credentials
// 2. Implement functions to fetch playlists and track previews

// Spotify API integration

// Client ID and Client Secret would normally be stored in environment variables
// For this demo, we'll hardcode them (in a real app, NEVER do this)
const CLIENT_ID = "YOUR_SPOTIFY_CLIENT_ID"
const CLIENT_SECRET = "YOUR_SPOTIFY_CLIENT_SECRET"

// Function to extract playlist ID from Spotify URL
export function extractPlaylistId(url) {
  // Handle different Spotify URL formats
  const patterns = [
    /spotify:playlist:([a-zA-Z0-9]+)/, // spotify:playlist:37i9dQZF1DXcBWIGoYBM5M
    /open\.spotify\.com\/playlist\/([a-zA-Z0-9]+)/, // https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M
    /spotify\.com\/playlist\/([a-zA-Z0-9]+)/, // https://spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }

  return null
}

// Function to get Spotify access token
async function getAccessToken() {
  // In a real app, this would be a server-side function
  // For this demo, we'll simulate it

  // Normally, you'd make a fetch request like this:
  /*
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + btoa(CLIENT_ID + ':' + CLIENT_SECRET)
    },
    body: 'grant_type=client_credentials'
  })
  
  const data = await response.json()
  return data.access_token
  */

  // For this demo, we'll return a mock token
  return "mock_access_token"
}

// Function to get playlist data
export async function getPlaylistData(playlistId) {
  // In a real app, this would make actual API calls to Spotify
  // For this demo, we'll return mock data

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1500))

  // Mock playlist data
  const mockPlaylistData = {
    name: "Festival Playlist 2024",
    description: "Top artists performing at the festival",
    tracks: [
      {
        id: "track1",
        name: "Do I Wanna Know?",
        artist: {
          id: "artist1",
          name: "Arctic Monkeys",
          image: "/placeholder.svg?height=100&width=100&text=AM",
        },
        previewUrl: "https://p.scdn.co/mp3-preview/4a0f767e4b8f5a1c7d7a1a7d5a8f1a7d5a8f1a7d",
      },
      {
        id: "track2",
        name: "R U Mine?",
        artist: {
          id: "artist1",
          name: "Arctic Monkeys",
          image: "/placeholder.svg?height=100&width=100&text=AM",
        },
        previewUrl: "https://p.scdn.co/mp3-preview/4a0f767e4b8f5a1c7d7a1a7d5a8f1a7d5a8f1a7d",
      },
      {
        id: "track3",
        name: "Why'd You Only Call Me When You're High?",
        artist: {
          id: "artist1",
          name: "Arctic Monkeys",
          image: "/placeholder.svg?height=100&width=100&text=AM",
        },
        previewUrl: "https://p.scdn.co/mp3-preview/4a0f767e4b8f5a1c7d7a1a7d5a8f1a7d5a8f1a7d",
      },
      {
        id: "track4",
        name: "Last Nite",
        artist: {
          id: "artist2",
          name: "The Strokes",
          image: "/placeholder.svg?height=100&width=100&text=TS",
        },
        previewUrl: "https://p.scdn.co/mp3-preview/4a0f767e4b8f5a1c7d7a1a7d5a8f1a7d5a8f1a7d",
      },
      {
        id: "track5",
        name: "Reptilia",
        artist: {
          id: "artist2",
          name: "The Strokes",
          image: "/placeholder.svg?height=100&width=100&text=TS",
        },
        previewUrl: "https://p.scdn.co/mp3-preview/4a0f767e4b8f5a1c7d7a1a7d5a8f1a7d5a8f1a7d",
      },
      {
        id: "track6",
        name: "The Less I Know The Better",
        artist: {
          id: "artist3",
          name: "Tame Impala",
          image: "/placeholder.svg?height=100&width=100&text=TI",
        },
        previewUrl: "https://p.scdn.co/mp3-preview/4a0f767e4b8f5a1c7d7a1a7d5a8f1a7d5a8f1a7d",
      },
      {
        id: "track7",
        name: "Let It Happen",
        artist: {
          id: "artist3",
          name: "Tame Impala",
          image: "/placeholder.svg?height=100&width=100&text=TI",
        },
        previewUrl: "https://p.scdn.co/mp3-preview/4a0f767e4b8f5a1c7d7a1a7d5a8f1a7d5a8f1a7d",
      },
      {
        id: "track8",
        name: "Feels Like We Only Go Backwards",
        artist: {
          id: "artist3",
          name: "Tame Impala",
          image: "/placeholder.svg?height=100&width=100&text=TI",
        },
        previewUrl: "https://p.scdn.co/mp3-preview/4a0f767e4b8f5a1c7d7a1a7d5a8f1a7d5a8f1a7d",
      },
      {
        id: "track9",
        name: "Paranoid Android",
        artist: {
          id: "artist4",
          name: "Radiohead",
          image: "/placeholder.svg?height=100&width=100&text=RH",
        },
        previewUrl: "https://p.scdn.co/mp3-preview/4a0f767e4b8f5a1c7d7a1a7d5a8f1a7d5a8f1a7d",
      },
      {
        id: "track10",
        name: "Creep",
        artist: {
          id: "artist4",
          name: "Radiohead",
          image: "/placeholder.svg?height=100&width=100&text=RH",
        },
        previewUrl: "https://p.scdn.co/mp3-preview/4a0f767e4b8f5a1c7d7a1a7d5a8f1a7d5a8f1a7d",
      },
      {
        id: "track11",
        name: "Feel Good Inc.",
        artist: {
          id: "artist5",
          name: "Gorillaz",
          image: "/placeholder.svg?height=100&width=100&text=GZ",
        },
        previewUrl: "https://p.scdn.co/mp3-preview/4a0f767e4b8f5a1c7d7a1a7d5a8f1a7d5a8f1a7d",
      },
      {
        id: "track12",
        name: "Clint Eastwood",
        artist: {
          id: "artist5",
          name: "Gorillaz",
          image: "/placeholder.svg?height=100&width=100&text=GZ",
        },
        previewUrl: "https://p.scdn.co/mp3-preview/4a0f767e4b8f5a1c7d7a1a7d5a8f1a7d5a8f1a7d",
      },
    ],
  }

  // Process the playlist data to group tracks by artist
  const artistsMap = {}

  mockPlaylistData.tracks.forEach((track) => {
    const artistId = track.artist.id

    if (!artistsMap[artistId]) {
      artistsMap[artistId] = {
        id: artistId,
        name: track.artist.name,
        image: track.artist.image,
        tracks: [],
      }
    }

    // Add track to artist's tracks (up to 3 tracks per artist)
    if (artistsMap[artistId].tracks.length < 3) {
      artistsMap[artistId].tracks.push({
        id: track.id,
        name: track.name,
        previewUrl: track.previewUrl,
      })
    }
  })

  // Convert the map to an array
  const artists = Object.values(artistsMap)

  return {
    name: mockPlaylistData.name,
    description: mockPlaylistData.description,
    artists: artists,
  }
}

// In a real app, you would implement these additional functions:
// - getArtistTopTracks: to get an artist's top tracks if there are fewer than 3 in the playlist
// - searchPlaylists: to search for playlists by name
// - etc.

export async function getPlaylistTracks(playlistId) {
  // In a real app, this would fetch tracks from Spotify API
  // For now, we'll return mock data
  return [
    {
      id: "1",
      name: "Arctic Monkeys",
      image: "/placeholder.svg?height=100&width=100",
      previewUrl: "https://p.scdn.co/mp3-preview/4a0f767e4b8f5a1c7d7a1a7d5a8f1a7d5a8f1a7d",
    },
    {
      id: "2",
      name: "The Strokes",
      image: "/placeholder.svg?height=100&width=100",
      previewUrl: "https://p.scdn.co/mp3-preview/4a0f767e4b8f5a1c7d7a1a7d5a8f1a7d5a8f1a7d",
    },
    // More artists...
  ]
}

