/* ============================================================
   POWERPLAY — shared game catalogue (website + app)
   ============================================================ */
(function () {
  "use strict";

  const GAMES = [
    {
      id: "ballistic",
      title: "BALLISTIC!",
      genre: "Arcade",
      status: "Released",
      pitch: "Dodgeball mayhem in 3D. Catch their throws, empty the court, be the last one standing.",
      cover: { image: "assets/covers/ballistic.jpg", colors: ["#ffd23f", "#e63946"] },
      url: "games/ballistic/",
    },
    {
      id: "touchdown",
      title: "Touchdown",
      genre: "Sports",
      status: "Released",
      pitch: "NFL franchise mode: build your team, call the plays and own the season.",
      cover: { image: "assets/covers/touchdown.jpg", colors: ["#2dd4ef", "#b8ff3d"] },
      url: "games/touchdown/",
    },
    {
      id: "hockey-showdown",
      title: "Hockey Showdown",
      genre: "Sports",
      status: "Released",
      pitch: "Arcade ice hockey — pick a team, hit the ice and take the shot.",
      cover: { image: "assets/covers/hockey.jpg", colors: ["#8ee7ff", "#1d4ed8"] },
      url: "games/hockey/",
    },
    {
      id: "dunkin-hoops",
      title: "Dunkin' Hoops",
      genre: "Sports",
      status: "Released",
      pitch: "Fast arcade basketball with a shot clock, steals, blocks and big dunks.",
      cover: { image: "assets/covers/dunkin.jpg", colors: ["#ffb020", "#ff5f3d"] },
      url: "games/dunkin/",
    },
    {
      id: "prokick",
      title: "ProKick",
      genre: "Sports",
      status: "Released",
      pitch: "The competitive football game: build your team and own the pitch.",
      cover: { image: "assets/covers/prokick.jpg", colors: ["#b8ff3d", "#0ea5e9"] },
      url: "games/prokick/",
    },
  ];

  window.PowerplayGames = {
    GAMES,
    byId(id) {
      return GAMES.find((g) => g.id === id) || null;
    },
  };
})();
