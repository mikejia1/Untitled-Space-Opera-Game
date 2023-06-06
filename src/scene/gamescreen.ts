
// An enum listed the different screens / views one encounters in the game.
// Actual game play is just one such screen / view.
export enum GameScreen {
    INTRO,          // Oribiting Earth, waiting to depart, game title.
    PLAY,           // Player is playing the game.
    CONTINUE,       // Player has died but has option to continue.
    GAME_OVER,      // Player has died and isn't coming back.
    OUTRO,          // Orbiting Earth II, congratulations, game credits.
}

